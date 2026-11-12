import { randomUUID } from 'node:crypto';
import {
  affectedSteps,
  validatePlan,
  type Workflow,
  type Branch,
  type Attempt,
  type Attachment,
  type Plan,
} from '../shared/domain.ts';
import type { Agent } from './agent.ts';
import type { openDatabase } from './database.ts';
const id = () => randomUUID();
const attempt = (stepId: string): Attempt => ({
  id: id(),
  stepId,
  status: 'queued',
  cost: 0,
  approval: 'waiting',
  version: 1,
});
export class Engine {
  workflows = new Map<string, Workflow>();
  listeners = new Set<() => void>();
  active = new Map<string, AbortController>();
  constructor(
    private db: ReturnType<typeof openDatabase>,
    private agent: Agent
  ) {
    for (const w of db.load()) {
      if (w.planning) {
        w.planning = false;
        w.error = 'Server stopped during planning. Send your request again.';
      }
      for (const b of w.branches)
        if (b.status === 'running' || b.status === 'paused') {
          b.status = 'failed';
          for (const a of b.attempts)
            if (a.status === 'running') {
              a.status = 'failed';
              a.error = 'Server stopped. Retry to continue.';
            }
        }
      this.workflows.set(w.id, w);
      db.save(w);
    }
  }
  list() {
    return [...this.workflows.values()].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }
  get(wid: string) {
    const w = this.workflows.get(wid);
    if (!w) throw new Error('Workflow not found.');
    return w;
  }
  save(w: Workflow, text?: string) {
    w.revision++;
    w.updatedAt = Date.now();
    if (text) w.events.push({ id: id(), at: Date.now(), text });
    this.db.save(w);
    this.listeners.forEach((fn) => fn());
  }
  create(brief: string, attachments: Attachment[], clientId?: string) {
    if (clientId && this.workflows.has(clientId))
      throw new Error('This workflow already exists.');
    const w: Workflow = {
      id: clientId ?? id(),
      title: brief.slice(0, 65),
      brief,
      attachments,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revision: 0,
      messages: [{ id: id(), role: 'user', text: brief }],
      plan: null,
      planning: false,
      cost: 0,
      branches: [],
      events: [],
    };
    this.workflows.set(w.id, w);
    this.save(w, 'Workflow created.');
    this.plan(w);
    return w;
  }
  plan(w: Workflow) {
    if (w.planning || w.branches.length)
      throw new Error(
        'The plan is locked. Duplicate this workflow for a new plan.'
      );
    if (this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    const controller = new AbortController();
    this.active.set(w.id, controller);
    w.planning = true;
    delete w.error;
    this.save(w, 'Planner started.');
    void this.agent
      .plan(structuredClone(w), controller)
      .then(({ value, cost }) => {
        if (value.plan) {
          w.plan = validatePlan(value.plan);
          w.title = w.plan.title;
        }
        w.messages.push({ id: id(), role: 'assistant', text: value.message });
        w.cost += cost;
      })
      .catch((error: unknown) => {
        w.error = error instanceof Error ? error.message : 'Planner failed.';
      })
      .finally(() => {
        this.active.delete(w.id);
        w.planning = false;
        this.save(
          w,
          w.error ? 'Planner failed. Retry from chat.' : 'Planner finished.'
        );
      });
  }
  chat(w: Workflow, text: string) {
    if (w.planning) throw new Error('Wait for the current reply.');
    if (w.branches.length) {
      if (!this.agent.chat) throw new Error('Run chat is unavailable.');
      if (this.active.size >= 3)
        throw new Error('Wait for an active Claude request to finish.');
      const controller = new AbortController();
      this.active.set(w.id, controller);
      w.messages.push({ id: id(), role: 'user', text });
      w.planning = true;
      delete w.error;
      this.save(w);
      void this.agent
        .chat(structuredClone(w), controller)
        .then(({ value, cost }) => {
          w.messages.push({ id: id(), role: 'assistant', text: value.message });
          w.cost += cost;
        })
        .catch((e: Error) => {
          w.error = e.message;
        })
        .finally(() => {
          w.planning = false;
          this.active.delete(w.id);
          this.save(w);
        });
      return;
    }
    if (this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    w.messages.push({ id: id(), role: 'user', text });
    this.plan(w);
  }
  editPlan(w: Workflow, plan: Plan) {
    if (w.planning || w.branches.length)
      throw new Error('The plan is locked during and after a run.');
    w.plan = validatePlan(plan);
    w.title = w.plan.title;
    this.save(w, 'Plan updated.');
  }
  start(w: Workflow) {
    if (!w.plan || w.planning || w.branches.length)
      throw new Error('Create a plan before the first run.');
    if (this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    const b: Branch = {
      id: id(),
      name: 'Original',
      note: '',
      status: 'ready',
      attempts: w.plan.steps.map((s) => attempt(s.id)),
      history: [],
    };
    w.branches.push(b);
    w.selectedBranch = b.id;
    this.resume(w, b);
  }
  branch(w: Workflow, bid: string) {
    const b = w.branches.find((b) => b.id === bid);
    if (!b) throw new Error('Branch not found.');
    return b;
  }
  resume(w: Workflow, b: Branch) {
    if (!['ready', 'paused', 'failed', 'cancelled'].includes(b.status))
      throw new Error('This branch cannot resume yet.');
    if (!this.active.has(b.id) && this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    for (const a of b.attempts)
      if (a.status === 'failed') {
        a.status = 'queued';
        delete a.error;
      }
    b.status = 'running';
    this.save(w, `${b.name}: run started.`);
    this.pump(w, b);
  }
  pump(w: Workflow, b: Branch) {
    if (b.status !== 'running' || this.active.has(b.id)) return;
    const step = w.plan!.steps.find(
      (s) =>
        b.attempts.find((a) => a.stepId === s.id)?.status === 'queued' &&
        s.dependencies.every(
          (d) => b.attempts.find((a) => a.stepId === d)?.status === 'done'
        )
    );
    if (!step) {
      b.status = b.attempts.some((a) => a.status === 'needs_input')
        ? 'needs_input'
        : b.attempts.every((a) => a.status === 'done')
          ? 'review'
          : 'failed';
      this.save(
        w,
        `${b.name}: ${b.status === 'review' ? 'outputs ready for review.' : b.status}`
      );
      return;
    }
    const a = b.attempts.find((a) => a.stepId === step.id)!;
    const controller = new AbortController();
    this.active.set(b.id, controller);
    a.status = 'running';
    a.startedAt = Date.now();
    this.save(w, `${step.name} started.`);
    void this.agent
      .step(structuredClone(w), structuredClone(b), step, controller)
      .then(({ value, cost }) => {
        if (controller.signal.aborted) return;
        a.cost += cost;
        w.cost += cost;
        a.finishedAt = Date.now();
        if (value.question) {
          a.question = value.question;
          a.status = 'needs_input';
          if (b.status === 'running') b.status = 'needs_input';
        } else {
          if (!value.content.trim())
            throw new Error(
              'Claude returned an empty output. Retry this step.'
            );
          a.status = 'done';
          a.title = value.title || step.name;
          a.content = value.content;
          a.decision = value.decision;
          delete a.question;
        }
        this.save(
          w,
          `${step.name}: ${a.status === 'done' ? 'complete.' : 'needs your answer.'}`
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted && b.status === 'cancelled') return;
        a.status = 'failed';
        a.error = error instanceof Error ? error.message : 'Step failed.';
        b.status = 'failed';
        this.save(w, `${step.name} failed.`);
      })
      .finally(() => {
        this.active.delete(b.id);
        if (b.status === 'running') this.pump(w, b);
      });
  }
  pause(w: Workflow, b: Branch) {
    if (b.status !== 'running') throw new Error('This run is not active.');
    b.status = 'paused';
    this.save(w, 'Pause requested. The current step can finish.');
  }
  cancel(w: Workflow, b: Branch) {
    if (!['running', 'paused', 'needs_input'].includes(b.status))
      throw new Error('This branch is not active.');
    b.status = 'cancelled';
    this.active.get(b.id)?.abort();
    for (const a of b.attempts)
      if (a.status === 'running') {
        a.status = 'failed';
        a.error = 'Cancelled.';
      }
    this.save(w, 'Run cancelled. Completed outputs remain available.');
  }
  answer(w: Workflow, b: Branch, stepId: string, text: string) {
    const a = b.attempts.find((a) => a.stepId === stepId);
    if (!a || a.status !== 'needs_input' || this.active.has(b.id))
      throw new Error('This step does not accept an answer now.');
    if (this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    a.answer = text;
    a.status = 'queued';
    delete a.question;
    b.status = 'ready';
    this.save(w, `Your answer to ${stepId}: ${text}`);
    this.resume(w, b);
  }
  rerun(w: Workflow, b: Branch, from: string, note: string, fork: boolean) {
    if (this.active.has(b.id) || ['running', 'paused'].includes(b.status))
      throw new Error('Finish or cancel the current run first.');
    if (this.active.size >= 3)
      throw new Error(
        'Three Claude requests are active. Wait for one to finish.'
      );
    const scope = affectedSteps(w.plan!, from);
    let target = b;
    if (fork) {
      target = structuredClone(b);
      target.id = id();
      target.parent = b.id;
      target.from = from;
      target.name = `Fork ${w.branches.length}`;
      target.history = [];
      target.attempts.forEach((a) => {
        a.id = id();
        a.approval = 'waiting';
      });
      w.branches.push(target);
    }
    for (let i = 0; i < target.attempts.length; i++)
      if (scope.has(target.attempts[i].stepId)) {
        target.history.push(structuredClone(target.attempts[i]));
        target.attempts[i] = {
          ...attempt(target.attempts[i].stepId),
          version: target.attempts[i].version + 1,
          answer: target.attempts[i].answer,
        };
      }
    target.note = [target.note, note].filter(Boolean).join('\n');
    target.status = 'ready';
    this.save(
      w,
      `${fork ? target.name : 'Rerun'}: ${scope.size} steps. ${note}`
    );
    this.resume(w, target);
    return target;
  }
  approve(
    w: Workflow,
    b: Branch,
    stepId: string,
    version: number,
    approval: Attempt['approval'],
    content?: string
  ) {
    if (!['review', 'done'].includes(b.status))
      throw new Error('Wait until this branch finishes.');
    const a = b.attempts.find((a) => a.stepId === stepId);
    if (
      !a ||
      a.status !== 'done' ||
      a.version !== version ||
      !w.plan!.steps.find((s) => s.id === stepId)?.deliverable
    )
      throw new Error('This output version is unavailable. Refresh and retry.');
    if (content !== undefined && content !== a.content) {
      b.history.push(structuredClone(a));
      a.content = content;
      a.version++;
      a.approval = 'waiting';
    } else {
      a.approval = approval;
    }
    const outputs = b.attempts.filter(
      (a) => w.plan!.steps.find((s) => s.id === a.stepId)?.deliverable
    );
    b.status = outputs.every((a) => a.approval !== 'waiting')
      ? 'done'
      : 'review';
    this.save(
      w,
      `${a.title}: ${a.approval === 'waiting' ? 'edited; review required.' : a.approval}`
    );
  }
  select(w: Workflow, b: Branch) {
    w.selectedBranch = b.id;
    this.save(w, `${b.name} selected for export.`);
  }
  duplicate(w: Workflow) {
    const copy: Workflow = {
      ...structuredClone(w),
      id: id(),
      title: `${w.title} copy`,
      revision: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      branches: [],
      events: [],
      cost: 0,
      planning: false,
      selectedBranch: undefined,
      error: undefined,
    };
    this.workflows.set(copy.id, copy);
    this.save(copy, 'Workflow duplicated as a draft.');
    return copy;
  }
  export(w: Workflow, b: Branch) {
    if (b.id !== w.selectedBranch || b.status !== 'done')
      throw new Error(
        'Select this branch and review every output before export.'
      );
    const outputs = b.attempts.filter(
      (a) =>
        a.approval === 'approved' &&
        w.plan!.steps.find((s) => s.id === a.stepId)?.deliverable
    );
    if (!outputs.length)
      throw new Error('Approve at least one output before export.');
    return `# ${w.title}\n\nVersion: ${b.name}\n\n${outputs.map((a) => `## ${a.title}\n\n${a.content}`).join('\n\n---\n\n')}`;
  }
  close() {
    this.active.forEach((c) => c.abort());
  }
}
