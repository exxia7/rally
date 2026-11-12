import Fastify from 'fastify';
import type { ServerResponse } from 'node:http';
import { z } from 'zod';
import { claudeAgent } from './agent.ts';
import { openDatabase } from './database.ts';
import { Engine } from './engine.ts';
import { planSchema } from '../shared/domain.ts';

const app = Fastify({ logger: true, bodyLimit: 1_000_000 });
const eventStreams = new Set<ServerResponse>();
const engine = new Engine(openDatabase(), claudeAgent);
const port = Number(process.env.API_PORT || 3001);
// Local-only service. Same-origin requests arrive through Vite's proxy.
app.addHook('onRequest', async (req, reply) => {
  const origin = req.headers.origin;
  if (
    origin &&
    ![
      `http://127.0.0.1:5180`,
      `http://localhost:5180`,
      `http://127.0.0.1:${port}`,
      `http://localhost:${port}`,
    ].includes(origin)
  )
    return reply.code(403).send({ error: 'Origin not allowed.' });
  if (
    !['localhost', '127.0.0.1'].includes((req.headers.host || '').split(':')[0])
  )
    return reply.code(403).send({ error: 'Local access only.' });
});
app.setErrorHandler((error, _req, reply) => {
  const e = error as Error;
  reply
    .code(e.message === 'Workflow not found.' ? 404 : 400)
    .send({ error: e.message });
});
app.get('/api/health', async () => ({
  ok: true,
  model: process.env.CLAUDE_MODEL || 'haiku',
}));
app.get('/api/workflows', async () => engine.list());
app.get('/api/events', (req, reply) => {
  reply.hijack();
  eventStreams.add(reply.raw);
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = () => {
    reply.raw.write(`data: ${JSON.stringify(engine.list())}\n\n`);
  };
  engine.listeners.add(send);
  send();
  const heartbeat = setInterval(
    () => reply.raw.write(': heartbeat\n\n'),
    15000
  );
  reply.raw.on('close', () => {
    eventStreams.delete(reply.raw);
    clearInterval(heartbeat);
    engine.listeners.delete(send);
  });
});
const text = z.string().trim().min(1).max(12000);
app.post('/api/workflows', async (req, reply) => {
  const body = z
    .object({
      id: z
        .string()
        .regex(/^[a-zA-Z0-9-]{1,80}$/)
        .optional(),
      brief: text,
      attachments: z
        .array(
          z.object({ name: z.string().max(120), text: z.string().max(100000) })
        )
        .max(5)
        .default([]),
    })
    .parse(req.body);
  if (engine.active.size >= 3)
    throw new Error(
      'Three Claude requests are active. Wait for one to finish.'
    );
  return reply
    .code(201)
    .send(engine.create(body.brief, body.attachments, body.id));
});
const command = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('attachments'),
    files: z
      .array(
        z.object({ name: z.string().max(120), text: z.string().max(100000) })
      )
      .max(5),
  }),
  z.object({ type: z.literal('chat'), text }),
  z.object({ type: z.literal('plan'), plan: planSchema }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('duplicate') }),
  z.object({ type: z.literal('pause'), branch: z.string() }),
  z.object({ type: z.literal('resume'), branch: z.string() }),
  z.object({ type: z.literal('cancel'), branch: z.string() }),
  z.object({ type: z.literal('select'), branch: z.string() }),
  z.object({
    type: z.literal('answer'),
    branch: z.string(),
    step: z.string(),
    text,
  }),
  z.object({
    type: z.literal('rerun'),
    branch: z.string(),
    step: z.string(),
    text,
    fork: z.boolean(),
  }),
  z.object({
    type: z.literal('approve'),
    branch: z.string(),
    step: z.string(),
    version: z.number().int(),
    approval: z.enum(['waiting', 'approved', 'declined']),
    content: z.string().min(1).max(50000).optional(),
  }),
]);
app.post<{ Params: { id: string } }>(
  '/api/workflows/:id/commands',
  async (req, reply) => {
    const body = z
      .object({ revision: z.number().int(), command })
      .parse(req.body);
    const w = engine.get(req.params.id);
    if (w.revision !== body.revision)
      return reply.code(409).send({
        error:
          'The workflow changed. The latest state is now visible. Retry your action.',
      });
    const c = body.command;
    if (c.type === 'attachments') {
      if (w.planning || w.branches.length)
        throw new Error('Attach files before the run starts.');
      const files = new Map(w.attachments.map((f) => [f.name, f]));
      c.files.forEach((f) => files.set(f.name, f));
      if (files.size > 5) throw new Error('Attach at most five text files.');
      w.attachments = [...files.values()];
      engine.save(w, 'Reference files updated.');
    } else if (c.type === 'chat') engine.chat(w, c.text);
    else if (c.type === 'plan') engine.editPlan(w, c.plan);
    else if (c.type === 'start') engine.start(w);
    else if (c.type === 'duplicate') return engine.duplicate(w);
    else {
      const b = engine.branch(w, c.branch);
      switch (c.type) {
        case 'pause':
          engine.pause(w, b);
          break;
        case 'resume':
          engine.resume(w, b);
          break;
        case 'cancel':
          engine.cancel(w, b);
          break;
        case 'select':
          engine.select(w, b);
          break;
        case 'answer':
          engine.answer(w, b, c.step, c.text);
          break;
        case 'rerun':
          engine.rerun(w, b, c.step, c.text, c.fork);
          break;
        case 'approve':
          engine.approve(w, b, c.step, c.version, c.approval, c.content);
          break;
      }
    }
    return w;
  }
);
app.get<{ Params: { id: string; branch: string } }>(
  '/api/workflows/:id/export/:branch',
  async (req, reply) => {
    const w = engine.get(req.params.id);
    return reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header(
        'Content-Disposition',
        'attachment; filename="pathfinder-output.md"'
      )
      .send(engine.export(w, engine.branch(w, req.params.branch)));
  }
);
process.on('SIGTERM', () => {
  engine.close();
  eventStreams.forEach((stream) => stream.end());
  void app.close();
});
process.on('SIGINT', () => {
  engine.close();
  eventStreams.forEach((stream) => stream.end());
  void app.close();
});
await app.listen({ port, host: '127.0.0.1' });
