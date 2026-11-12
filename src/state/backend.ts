import { useSyncExternalStore } from 'react';
import type {
  Workflow as RemoteWorkflow,
  Attachment,
} from '../../shared/domain';
import { store, type Action } from './store';
import { newWorkflow } from './scenes';
import { projectWorkflow, remoteBranch, baseStep } from './backendViews';
import type { Workflow } from './types';

export const sampleMode =
  typeof window !== 'undefined' &&
  (import.meta.env.VITE_HOSTED === '1' || /^\/(s\/|screens)/.test(window.location.pathname));
let status = { connected: false, loaded: false, busy: false, error: '' };
const subscribers = new Set<() => void>();
function update(patch: Partial<typeof status>) {
  status = { ...status, ...patch };
  subscribers.forEach((fn) => fn());
}
export function useBackendStatus() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
    () => status
  );
}
export function backendError(error: unknown) {
  update({ error: error instanceof Error ? error.message : String(error) });
}
export function clearBackendError() {
  update({ error: '' });
}
export const pendingFiles = new Map<string, Attachment>();
export async function attachFiles(files: FileList | File[] | null) {
  const result: string[] = [];
  for (const file of [...(files ?? [])]) {
    if (!/\.(txt|md|csv|json)$/i.test(file.name) || file.size > 100000) {
      backendError('Use TXT, MD, CSV, or JSON files under 100 KB.');
      continue;
    }
    pendingFiles.set(file.name, { name: file.name, text: await file.text() });
    result.push(file.name);
  }
  return result;
}
function apply(remote: RemoteWorkflow) {
  const s = store.get();
  const old = s.workflows[remote.id];
  if (old?.backend && old.backend.revision > remote.revision) return;
  store.replace({
    ...s,
    workflows: { ...s.workflows, [remote.id]: projectWorkflow(remote, old) },
    order: s.order.includes(remote.id) ? s.order : [remote.id, ...s.order],
  });
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'The request failed.');
  return data;
}
let queue: Promise<unknown> = Promise.resolve();
let count = 0;
export function enqueue<T>(task: () => Promise<T>): Promise<T | undefined> {
  count++;
  update({ busy: true, error: '' });
  const next = queue
    .then(task)
    .catch((e) => {
      backendError(e);
      return undefined;
    })
    .finally(() => {
      count--;
      update({ busy: count > 0 });
    });
  queue = next;
  return next;
}
export async function commandNow(
  wid: string,
  command: Record<string, unknown>
) {
  const w = store.get().workflows[wid]?.backend;
  if (!w) throw new Error('Submit the brief first.');
  const result = await request<RemoteWorkflow>(`/workflows/${wid}/commands`, {
    revision: w.revision,
    command,
  });
  apply(result);
  return result;
}
export function backendCommand(wid: string, command: Record<string, unknown>) {
  return enqueue(() => commandNow(wid, command));
}
export function sendPlanner(wid: string, text: string, files: string[] = []) {
  return enqueue(async () => {
    if (files.length)
      await commandNow(wid, {
        type: 'attachments',
        files: files.flatMap((n) =>
          pendingFiles.has(n) ? [pendingFiles.get(n)!] : []
        ),
      });
    return commandNow(wid, { type: 'chat', text });
  });
}
export function exportOutputs(wf: Workflow) {
  const r = wf.backend;
  if (r?.selectedBranch)
    window.location.assign(`/api/workflows/${r.id}/export/${r.selectedBranch}`);
}
export function approveAll(wid: string) {
  return enqueue(async () => {
    let wf = store.get().workflows[wid];
    const branch = wf.backend!.branches.find(
      (b) => b.id === wf.backend!.selectedBranch
    )!;
    for (const output of branch.attempts.filter(
      (a) =>
        a.approval === 'waiting' &&
        wf.backend!.plan?.steps.find((s) => s.id === a.stepId)?.deliverable
    )) {
      wf = store.get().workflows[wid];
      await commandNow(wid, {
        type: 'approve',
        branch: branch.id,
        step: output.stepId,
        version: output.version,
        approval: 'approved',
      });
    }
  });
}
function handle(action: Action): boolean {
  if (sampleMode) return false;
  const initial = store.get(),
    wf = initial.workflows[initial.activeId];
  const wid = wf?.id;
  if (action.type === 'brief/send') {
    if (wf.backend) return true;
    const local = {
      ...wf,
      title: action.text.slice(0, 65),
      isNew: false,
      brief: { ...wf.brief, what: action.text, summary: action.text },
      planStage: 'chat' as const,
      briefChat: [{ id: 'brief', from: 'user' as const, text: action.text }],
    };
    store.replace({
      ...initial,
      workflows: { ...initial.workflows, [wid]: local },
    });
    void enqueue(async () =>
      apply(
        await request<RemoteWorkflow>('/workflows', {
          id: wid,
          brief: action.text,
          attachments: (action.attachments ?? []).flatMap((name) =>
            pendingFiles.has(name) ? [pendingFiles.get(name)!] : []
          ),
        })
      )
    );
    return true;
  }
  if (!wf?.backend) return false;
  const neutral = [
    'wf/new',
    'wf/open',
    'nav/push',
    'nav/pop',
    'nav/last',
    'plan/stage',
    'seed',
    'reset',
  ];
  if (neutral.includes(action.type)) return false;
  if (action.type === 'briefChat/send' || action.type === 'briefChat/answer') {
    void sendPlanner(wid, action.text);
    return true;
  }
  if (action.type === 'briefChat/planner' || action.type === 'run/advance')
    return true;
  if (action.type === 'run/start') {
    void backendCommand(wid, { type: 'start' });
    return true;
  }
  if (action.type === 'run/pause') {
    const b = wf.backend.branches.find((b) =>
      ['running', 'paused', 'failed', 'cancelled'].includes(b.status)
    );
    if (b)
      void backendCommand(wid, {
        type: action.paused && b.status === 'running' ? 'pause' : 'resume',
        branch: b.id,
      });
    return true;
  }
  if (action.type === 'wf/duplicate') {
    void backendCommand(wid, { type: 'duplicate' });
    return true;
  }
  if (action.type === 'fork/choose') {
    const b = remoteBranch(wf, action.id);
    if (b) void backendCommand(wid, { type: 'select', branch: b.id });
    return true;
  }
  if (action.type === 'fork/create') {
    const b = remoteBranch(wf, action.fork.parent);
    if (b)
      void backendCommand(wid, {
        type: 'rerun',
        branch: b.id,
        step: baseStep(action.fork.from),
        text: action.fork.brief,
        fork: true,
      });
    return true;
  }
  if (action.type === 'approval/launch') {
    void approveAll(wid);
    return true;
  }
  if (
    action.type === 'approval/set' ||
    action.type === 'approval/edit' ||
    action.type === 'fork/approval'
  ) {
    void enqueue(async () => {
      const current = store.get().workflows[wid];
      const branch = remoteBranch(
        current,
        'branch' in action
          ? (action.branch ?? current.chosenVersion ?? 'original')
          : (current.chosenVersion ?? 'original')
      );
      const attempt = branch?.attempts.find((a) => a.stepId === action.output);
      if (!branch || !attempt) throw new Error('Output not found.');
      return commandNow(wid, {
        type: 'approve',
        branch: branch.id,
        step: action.output,
        version: attempt.version,
        approval:
          action.type === 'approval/edit'
            ? 'waiting'
            : action.value === 'wont-post'
              ? 'declined'
              : action.value,
        ...(action.type === 'approval/edit' ? { content: action.text } : {}),
      });
    });
    return true;
  }
  if (
    action.type === 'helper/patch' ||
    action.type === 'helper/remove' ||
    action.type === 'helper/delete' ||
    action.type === 'helper/add' ||
    action.type === 'plan/insertStep' ||
    action.type === 'outputs/set'
  ) {
    void enqueue(async () => {
      const current = store.get().workflows[wid];
      const plan = structuredClone(current.backend!.plan!);
      if (!plan) throw new Error('Wait for the planner.');
      if (action.type === 'helper/patch') {
        if (action.patch.uploads?.length)
          await commandNow(wid, {
            type: 'attachments',
            files: action.patch.uploads.flatMap((n) =>
              pendingFiles.has(n) ? [pendingFiles.get(n)!] : []
            ),
          });
        if (
          action.patch.checks &&
          action.patch.checks !== current.helpers[action.id].checks
        )
          throw new Error(
            'Local outputs always require approval before export.'
          );
        const s = plan.steps.find((s) => s.id === action.id)!;
        if (action.patch.model)
          s.model = action.patch.model.startsWith('Opus') ? 'opus' : 'haiku';
        s.name = action.patch.name ?? s.name;
        s.instruction = action.patch.description ?? s.instruction;
      } else if (
        action.type === 'helper/remove' ||
        action.type === 'helper/delete'
      ) {
        const gone = plan.steps.find((s) => s.id === action.id);
        plan.steps = plan.steps
          .filter((s) => s.id !== action.id)
          .map((s) => ({
            ...s,
            dependencies: [
              ...new Set(
                s.dependencies.flatMap((d) =>
                  d === action.id ? (gone?.dependencies ?? []) : [d]
                )
              ),
            ],
          }));
      } else if (action.type === 'helper/add') {
        const h = action.helper;
        plan.steps.push({
          id: action.id,
          name: h.name,
          role: h.agent ?? 'Writer',
          instruction: h.description || h.name,
          dependencies: h.copyOf
            ? (plan.steps.find((s) => s.id === h.copyOf)?.dependencies ?? [])
            : [],
          deliverable: h.kind === 'output',
        });
      } else if (action.type === 'plan/insertStep') {
        if (action.edit.step.type !== 'helper')
          throw new Error(
            'Local plans support helper steps. Every deliverable already has an approval gate.'
          );
        const h = action.helper;
        plan.steps.push({
          id: action.edit.id,
          name:
            h?.name ??
            ('name' in action.edit.step ? action.edit.step.name : 'New step'),
          role: h?.agent ?? 'Writer',
          instruction:
            h?.description ||
            ('name' in action.edit.step ? action.edit.step.name : 'New step'),
          dependencies: [action.edit.edge.from],
          deliverable: h?.kind === 'output',
        });
        const after = plan.steps.find((s) => s.id === action.edit.edge.to);
        if (after)
          after.dependencies = after.dependencies.map((d) =>
            d === action.edit.edge.from ? action.edit.id : d
          );
      } else {
        for (const s of plan.steps)
          s.deliverable = action.outputs.some(
            (o) => o.owner === s.id || o.id === s.id
          );
      }
      return commandNow(wid, { type: 'plan', plan });
    });
    return true;
  }
  if (action.type === 'planChat/append' || action.type === 'fork/update')
    return true;
  backendError(
    'This control is not available for local text runs. Use the brief, helper instructions, or a rerun to change the work.'
  );
  return true;
}
export function installBackend() {
  if (sampleMode) return;
  const base = store.get();
  const draft = newWorkflow('draft');
  store.replace({
    ...base,
    workflows: { draft },
    activeId: 'draft',
    order: [],
    lastScreen: {},
    returnTo: [],
  });
  store.setCommandHandler(handle);
  const source = new EventSource('/api/events');
  source.onmessage = (event) => {
    const list = JSON.parse(event.data) as RemoteWorkflow[];
    list.forEach(apply);
    update({ connected: true, loaded: true });
  };
  source.onerror = () => update({ connected: false });
}
