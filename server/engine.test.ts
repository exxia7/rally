import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from './engine.ts';
import { openDatabase } from './database.ts';
import { validatePlan, type Plan, type StepResult } from '../shared/domain.ts';
import type { Agent } from './agent.ts';
const plan: Plan = {
  title: 'Test launch',
  steps: [
    {
      id: 'strategy',
      name: 'Strategy',
      role: 'Strategist',
      instruction: 'Choose a message.',
      dependencies: [],
      deliverable: false,
    },
    {
      id: 'email',
      name: 'Email',
      role: 'Writer',
      instruction: 'Write email.',
      dependencies: ['strategy'],
      deliverable: true,
    },
    {
      id: 'post',
      name: 'Post',
      role: 'Community',
      instruction: 'Write post.',
      dependencies: ['strategy'],
      deliverable: true,
    },
  ],
};
const output: StepResult = {
  title: 'Artifact',
  content: 'Actual test output',
  decision: 'Keep it brief.',
  question: null,
};
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function setup(
  step: Agent['step'] = async () => ({ value: output, cost: 0.01 })
) {
  const db = openDatabase(':memory:');
  const engine = new Engine(db, {
    plan: async () => ({ value: { message: 'Ready.', plan }, cost: 0.01 }),
    step,
  });
  return { db, engine };
}
test('rejects cycles and missing dependencies', () => {
  assert.throws(
    () =>
      validatePlan({
        ...plan,
        steps: plan.steps.map((s) =>
          s.id === 'strategy' ? { ...s, dependencies: ['email'] } : s
        ),
      }),
    /cycle/
  );
  assert.throws(
    () =>
      validatePlan({
        ...plan,
        steps: plan.steps.map((s) => ({ ...s, dependencies: ['missing'] })),
      }),
    /Unknown dependency/
  );
});
test('dependency execution, version-bound approvals, skipped output, fork isolation and persistence', async () => {
  const order: string[] = [];
  const { db, engine } = setup(async (_w, b, s) => {
    order.push(s.id);
    assert.ok(
      s.dependencies.every(
        (d) => b.attempts.find((a) => a.stepId === d)?.status === 'done'
      )
    );
    return { value: { ...output, content: s.id + b.note }, cost: 0.01 };
  });
  const w = engine.create('A real brief', []);
  await tick();
  engine.start(w);
  await tick();
  assert.deepEqual(order, ['strategy', 'email', 'post']);
  const b = w.branches[0];
  assert.equal(b.status, 'review');
  engine.approve(w, b, 'email', 1, 'approved');
  engine.approve(w, b, 'post', 1, 'declined');
  assert.equal(b.status, 'done');
  assert.match(engine.export(w, b), /email/);
  assert.doesNotMatch(engine.export(w, b), /\npost/);
  engine.approve(w, b, 'email', 1, 'approved', 'Edited email');
  assert.equal(b.attempts[1].approval, 'waiting');
  assert.equal(b.attempts[1].version, 2);
  assert.throws(() => engine.approve(w, b, 'email', 1, 'approved'), /version/);
  engine.approve(w, b, 'email', 2, 'approved');
  const fork = engine.rerun(w, b, 'email', 'Shorter', true);
  await tick();
  assert.equal(fork.status, 'review');
  assert.equal(b.attempts[1].content, 'Edited email');
  assert.equal(fork.attempts[0].content, b.attempts[0].content);
  assert.equal(fork.attempts[2].approval, 'waiting');
  assert.equal(fork.attempts[1].content, 'emailShorter');
  const child = engine.rerun(w, fork, 'email', 'Warmer', true);
  await tick();
  assert.equal(child.parent, fork.id);
  assert.throws(() => engine.export(w, fork), /Select/);
  const restored = new Engine(db, {
    plan: async () => {
      throw new Error('unexpected');
    },
    step: async () => {
      throw new Error('unexpected');
    },
  });
  assert.equal(restored.get(w.id).branches.length, 3);
  db.close();
});
test('question suspends descendants and answer becomes step input', async () => {
  const { engine, db } = setup(async (_w, b, s) => ({
    value:
      s.id === 'strategy' && !b.attempts[0].answer
        ? { ...output, content: '', question: 'What price?' }
        : output,
    cost: 0.01,
  }));
  const w = engine.create('Brief', []);
  await tick();
  engine.start(w);
  await tick();
  const b = w.branches[0];
  assert.equal(b.status, 'needs_input');
  assert.equal(b.attempts[1].status, 'queued');
  engine.answer(w, b, 'strategy', '$12');
  await tick();
  assert.equal(b.status, 'review');
  assert.equal(b.attempts[0].answer, '$12');
  db.close();
});
test('pause permits current completion but prevents next step; cancel ignores late results', async () => {
  let finish!: (r: { value: StepResult; cost: number }) => void;
  const { engine, db } = setup(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const w = engine.create('Brief', []);
  await tick();
  engine.start(w);
  const b = w.branches[0];
  engine.pause(w, b);
  finish({ value: output, cost: 0.01 });
  await tick();
  assert.equal(b.status, 'paused');
  assert.equal(b.attempts[0].status, 'done');
  assert.equal(b.attempts[1].status, 'queued');
  engine.resume(w, b);
  engine.cancel(w, b);
  finish({ value: output, cost: 0.01 });
  await tick();
  assert.equal(b.status, 'cancelled');
  assert.equal(b.attempts[1].status, 'failed');
  assert.equal(b.attempts[1].content, undefined);
  db.close();
});
test('failure can retry; server restart marks an active job interrupted', async () => {
  let fail = true;
  const { engine, db } = setup(async () => {
    if (fail) throw new Error('Provider unavailable');
    return { value: output, cost: 0.01 };
  });
  const w = engine.create('Brief', []);
  await tick();
  engine.start(w);
  await tick();
  assert.equal(w.branches[0].status, 'failed');
  fail = false;
  engine.resume(w, w.branches[0]);
  await tick();
  assert.equal(w.branches[0].status, 'review');
  w.branches[0].status = 'running';
  w.branches[0].attempts[1].status = 'running';
  engine.save(w);
  const restored = new Engine(db, {} as Agent);
  assert.equal(restored.get(w.id).branches[0].status, 'failed');
  db.close();
});

test('rerun retains the answer and invalidates exactly the downstream outputs', async () => {
  const { engine, db } = setup();
  const w = engine.create('Brief', []);
  await tick();
  engine.start(w);
  await tick();
  const b = w.branches[0];
  b.attempts[0].answer = 'Students';
  engine.approve(w, b, 'email', 1, 'approved');
  engine.approve(w, b, 'post', 1, 'approved');
  const fork = engine.rerun(w, b, 'strategy', 'Use the same audience.', true);
  assert.equal(fork.attempts[0].answer, 'Students');
  assert.ok(fork.attempts.every((a) => a.approval === 'waiting'));
  await tick();
  assert.equal(fork.status, 'review');
  assert.equal(b.status, 'done');
  db.close();
});

test('empty agent output is an explicit failure, never a completed step', async () => {
  const { engine, db } = setup(async () => ({
    value: { ...output, content: ' ' },
    cost: 0.01,
  }));
  const w = engine.create('Brief', []);
  await tick();
  engine.start(w);
  await tick();
  assert.equal(w.branches[0].status, 'failed');
  assert.match(w.branches[0].attempts[0].error!, /empty output/);
  assert.equal(w.branches[0].attempts[1].status, 'queued');
  db.close();
});
