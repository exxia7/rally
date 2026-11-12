import { useSyncExternalStore } from 'react';

import { briefChat, type Helper } from '@/screens/plan/aiCoachPlan';

import {
  type CheckLevel,
  checksLabel,
  needsYourOk,
  presetRules,
} from './permissions';
import { approvalItems, fixEffects, rerunScope } from './runView';
import { newWorkflow, sceneFor, STATE_VERSION } from './scenes';
import { BEATS, installTimeline, nextBeat, playableBeat } from './timeline';
import type {
  AppState,
  ApprovalValue,
  BeatId,
  ChatLine,
  Fork,
  HandRaiseId,
  HelperId,
  Output,
  PlanStage,
  PlanStepEdit,
  Speed,
  StepOverride,
  Workflow,
  WorkflowId,
} from './types';

// The store: one AppState in a tiny useSyncExternalStore store (no dependencies), persisted to sessionStorage so a
// reload or Back keeps it. Screens read it with useAppState()/useWorkflow() and change it with dispatch(action).
// Everything an action does is in `reduce` below. See CLAUDE.md "App state".
//
// Permissions/settings agent (additive): actions workspace/tool, workspace/defaultPreset, workspace/preset,
// permissions/set, helper/delete; permissions/nextTime also sets that helper's own rule; withBeat('approval') auto-approves
// items whose helper posts without your OK and skips straight to launched when none wait (src/state/permissions.ts).

export type Action =
  | { type: 'seed'; state: AppState }
  | { type: 'reset'; state: AppState }
  | { type: 'speed'; speed: Speed }
  | { type: 'nav/push'; id: string }
  | { type: 'nav/pop' }
  | { type: 'wf/new' }
  | { type: 'wf/open'; id: WorkflowId }
  | { type: 'brief/send'; text: string; attachments?: string[] }
  | { type: 'briefChat/send'; text: string; reply: string }
  | { type: 'plan/stage'; stage: PlanStage }
  | { type: 'helper/patch'; id: HelperId; patch: Partial<Helper> }
  | { type: 'helper/remove'; id: HelperId }
  | { type: 'helper/restore'; id: HelperId }
  /** Takes a helper off the team without a trace (undoing the chat's Community; a duplicate's Undo). */
  | { type: 'helper/delete'; id: HelperId }
  | { type: 'helper/add'; id: HelperId; helper: Helper; before?: HelperId }
  | { type: 'plan/insertStep'; edit: PlanStepEdit; helper?: Helper }
  | { type: 'outputs/set'; outputs: Output[] }
  | { type: 'planChat/append'; lines: ChatLine[]; clearUndo?: boolean }
  | { type: 'run/start' }
  | { type: 'run/pause'; paused: boolean }
  | { type: 'run/advance'; wf?: WorkflowId; from: BeatId }
  | { type: 'run/step'; step: string; patch: StepOverride }
  | {
      type: 'handRaise/choose';
      id: HandRaiseId;
      choices: number[];
      other: string;
    }
  | {
      type: 'handRaise/confirm';
      id: HandRaiseId;
      choices: number[];
      other: string;
    }
  | { type: 'approval/set'; output: string; value: ApprovalValue }
  | { type: 'approval/launch' }
  | { type: 'permissions/nextTime'; rule: string; value?: 'allow' | 'keep' }
  | {
      type: 'permissions/set';
      patch: Partial<Pick<Workflow['permissions'], 'preset' | 'checkLevel' | 'adLimit'>>;
    }
  | { type: 'workspace/tool'; name: string; connected: boolean; account?: string }
  | { type: 'workspace/defaultPreset'; name: string }
  | {
      type: 'workspace/preset';
      /** Adds the preset, or updates the one with this key. */
      preset: { key: string; name: string; check: CheckLevel; adLimit: number };
    }
  | { type: 'fork/create'; fork: Fork }
  | { type: 'fork/choose'; id: string };

const KEY = 'pathfinder:state';

// Actions that don't change a workflow (so a scene's frame stays "as drawn").
const NEUTRAL = new Set([
  'workspace/tool',
  'workspace/defaultPreset',
  'workspace/preset',
  'seed',
  'reset',
  'speed',
  'nav/push',
  'nav/pop',
  'wf/open',
]);

const now = () => Date.now();
const clock = () =>
  new Date()
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();

/** "Launch our new Teams plan to existing customers" → "Teams plan launch"-ish: the brief's first words. */
export function titleFromBrief(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (/ai coach/i.test(t)) return 'AI Coach launch';
  const words = t.split(' ');
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 32) break;
    out = (out + ' ' + w).trim();
  }
  out = out.replace(/[.,;:!?]+$/, '');
  // Don't end on a little word ("…Teams plan to").
  const SMALL = /\s+(to|for|our|the|a|an|in|of|with|and|on|at|by|from)$/i;
  while (SMALL.test(out)) out = out.replace(SMALL, '');
  return out ? out[0].toUpperCase() + out.slice(1) : 'New workflow';
}

function withBeat(wf: Workflow, beat: BeatId): Workflow {
  const phase = BEATS[beat].phase;
  const run = { ...wf.run, beat, phase, beatAt: now(), pausedAt: undefined };
  let approvals = wf.approvals;
  if (beat === 'approval') {
    approvals = { ...approvals };
    const items = approvalItems(wf);
    for (const item of items)
      approvals[item.id] =
        approvals[item.id] ??
        // A helper set to post without asking (2.4e "Just go", 5.2 "Allow") doesn't wait for your OK.
        (needsYourOk(wf, item.owner) ? 'waiting' : 'approved');
    if (items.length && items.every((i) => approvals[i.id] !== 'waiting'))
      return withBeat({ ...wf, approvals }, 'launched');
  }
  return {
    ...wf,
    run,
    approvals,
    status:
      phase === 'notStarted'
        ? 'draft'
        : phase === 'launched'
          ? 'done'
          : phase === 'needsYou' || phase === 'awaitingApproval'
            ? 'needsYou'
            : 'running',
    launchedOn: phase === 'launched' ? wf.resources.facts.date : wf.launchedOn,
  };
}

function reduceWorkflow(wf: Workflow, a: Action): Workflow {
  switch (a.type) {
    case 'brief/send': {
      const text = a.text.trim();
      return {
        ...wf,
        isNew: false,
        title: titleFromBrief(text),
        brief: { ...wf.brief, what: text, summary: text },
        attachments: [...wf.attachments, ...(a.attachments ?? [])],
        planStage: 'chat',
        briefChat: briefChat(text),
      };
    }
    case 'briefChat/send': {
      const n = wf.briefChat.length;
      return {
        ...wf,
        brief: { ...wf.brief, goal: wf.brief.goal ?? a.text },
        briefChat: [
          ...wf.briefChat,
          { id: `u${n}`, from: 'user', text: a.text },
          { id: `a${n}`, from: 'assistant', text: a.reply },
        ],
      };
    }
    case 'plan/stage':
      return { ...wf, planStage: a.stage };
    case 'helper/patch':
      if (!wf.helpers[a.id]) return wf;
      return {
        ...wf,
        helpers: { ...wf.helpers, [a.id]: { ...wf.helpers[a.id], ...a.patch } },
      };
    case 'helper/remove': {
      const h = wf.helpers[a.id];
      if (!h || wf.removed.includes(a.id)) return wf;
      return {
        ...wf,
        removed: [...wf.removed, a.id],
        planChat: [
          ...wf.planChat.map((m) => ({ ...m, undo: undefined })),
          {
            id: `removed-${a.id}-${wf.planChat.length}`,
            from: 'assistant',
            text: removalNote(wf, a.id),
            undo: { kind: 'remove', helper: a.id },
          },
        ],
      };
    }
    case 'helper/restore': {
      if (!wf.removed.includes(a.id)) return wf;
      return {
        ...wf,
        removed: wf.removed.filter((x) => x !== a.id),
        planChat: [
          ...wf.planChat.map((m) => ({ ...m, undo: undefined })),
          {
            id: `restored-${a.id}-${wf.planChat.length}`,
            from: 'assistant',
            text: `Undone. ${wf.helpers[a.id].name} is back on the team.`,
          },
        ],
      };
    }
    case 'helper/delete': {
      if (!wf.helpers[a.id]) return wf;
      const helpers = { ...wf.helpers };
      delete helpers[a.id];
      return {
        ...wf,
        helpers,
        helperOrder: wf.helperOrder.filter((x) => x !== a.id),
        removed: wf.removed.filter((x) => x !== a.id),
        outputs: wf.outputs.filter((o) => o.owner !== a.id),
      };
    }
    case 'helper/add': {
      const order = wf.helperOrder.filter((x) => x !== a.id);
      const at = a.before ? order.indexOf(a.before) : -1;
      order.splice(at < 0 ? order.length : at, 0, a.id);
      return {
        ...wf,
        helpers: { ...wf.helpers, [a.id]: a.helper },
        helperOrder: order,
        removed: wf.removed.filter((x) => x !== a.id),
      };
    }
    case 'plan/insertStep':
      return {
        ...wf,
        planSteps: [...wf.planSteps, a.edit],
        helpers: a.helper
          ? { ...wf.helpers, [a.edit.id]: a.helper }
          : wf.helpers,
        helperOrder: a.helper ? [...wf.helperOrder, a.edit.id] : wf.helperOrder,
      };
    case 'outputs/set':
      return { ...wf, outputs: a.outputs };
    case 'planChat/append':
      return {
        ...wf,
        planChat: [
          ...(a.clearUndo
            ? wf.planChat.map((m) => ({ ...m, undo: undefined }))
            : wf.planChat),
          ...a.lines,
        ],
      };
    case 'run/start': {
      if (wf.run.phase !== 'notStarted') return wf;
      const started = withBeat(
        {
          ...wf,
          planStage: 'team',
          run: { ...wf.run, startedAt: now(), paused: false, hold: undefined },
        },
        'launch'
      );
      return withBeat(started, playableBeat(started, 'launch'));
    }
    case 'run/pause': {
      const r = wf.run;
      if (a.paused === r.paused) return wf;
      return {
        ...wf,
        run: a.paused
          ? { ...r, paused: true, pausedAt: now() }
          : {
              ...r,
              paused: false,
              pausedAt: undefined,
              beatAt:
                r.beatAt && r.pausedAt
                  ? r.beatAt + (now() - r.pausedAt)
                  : r.beatAt,
            },
      };
    }
    case 'run/advance': {
      if (wf.run.beat !== a.from || !BEATS[a.from].next) return wf;
      return withBeat(
        { ...wf, run: { ...wf.run, hold: undefined } },
        nextBeat(wf, a.from)
      );
    }
    case 'run/step':
      return {
        ...wf,
        run: {
          ...wf.run,
          steps: {
            ...wf.run.steps,
            [a.step]: { ...wf.run.steps[a.step], ...a.patch },
          },
        },
      };
    case 'handRaise/choose':
      return {
        ...wf,
        handRaises: [
          ...wf.handRaises.filter((h) => h.id !== a.id),
          {
            id: a.id,
            step: a.id === 'missing' ? 'decision' : 'writer',
            helper: a.id === 'missing' ? 'strategist' : 'writer',
            choices: a.choices,
            other: a.other,
            resolved: false,
          },
        ],
      };
    case 'handRaise/confirm': {
      const beat = a.id === 'missing' ? 'handRaise1' : 'handRaise2';
      const helper = a.id === 'missing' ? 'strategist' : 'writer';
      const raise = {
        id: a.id,
        step: a.id === 'missing' ? 'decision' : 'writer',
        helper,
        choices: a.choices,
        other: a.other,
        resolved: true,
      };
      const effects = fixEffects(a.id, a.choices);
      const facts = { ...wf.resources.facts };
      for (const e of effects) Object.assign(facts, e.facts ?? {});
      const next: Workflow = {
        ...wf,
        handRaises: [...wf.handRaises.filter((h) => h.id !== a.id), raise],
        resources: { ...wf.resources, facts },
        decisions: [
          ...effects.map((e, i) => ({
            id: `${a.id}-${i}`,
            title: e.fixed,
            basis: `Your answer to ${wf.helpers[helper]?.name ?? 'the team'}`,
            time: clock(),
          })),
          ...(a.other.trim()
            ? [
                {
                  id: `${a.id}-other`,
                  title: a.other.trim(),
                  basis: 'You told the team',
                  time: clock(),
                },
              ]
            : []),
          ...wf.decisions,
        ],
        reruns:
          a.id === 'missing'
            ? [
                ...wf.reruns,
                {
                  id: `rerun-${wf.reruns.length + 1}`,
                  from: 'decision',
                  note: effects[0]?.note,
                  scope: rerunScope(wf, a.choices),
                  at: now(),
                },
              ]
            : wf.reruns,
      };
      return wf.run.beat === beat ? withBeat(next, nextBeat(next, beat)) : next;
    }
    case 'approval/set':
      return { ...wf, approvals: { ...wf.approvals, [a.output]: a.value } };
    case 'approval/launch': {
      const approvals = { ...wf.approvals };
      for (const item of approvalItems(wf))
        if ((approvals[item.id] ?? 'waiting') === 'waiting')
          approvals[item.id] = 'approved';
      return withBeat({ ...wf, approvals }, 'launched');
    }
    case 'permissions/nextTime': {
      const nextTime = { ...wf.permissions.nextTime };
      if (a.value) nextTime[a.rule] = a.value;
      else delete nextTime[a.rule];
      // The rule is that helper's own permission: "Allow" lets it post on its own, "Keep asking" asks first.
      const helper = RULE_HELPER[a.rule];
      const h = helper && wf.helpers[helper];
      const helpers = h
        ? {
            ...wf.helpers,
            [helper]: {
              ...h,
              checks:
                a.value === 'allow'
                  ? checksLabel('just-go', wf.permissions.checkLevel)
                  : 'Always · before posting',
            },
          }
        : wf.helpers;
      return {
        ...wf,
        helpers,
        permissions: { ...wf.permissions, nextTime },
      };
    }
    case 'permissions/set':
      return { ...wf, permissions: { ...wf.permissions, ...a.patch } };
    case 'fork/create':
      return { ...wf, forks: [...wf.forks, a.fork] };
    case 'fork/choose':
      return {
        ...wf,
        chosenVersion: a.id,
        forks: wf.forks.map((f) => ({ ...f, chosen: f.id === a.id })),
      };
    default:
      return wf;
  }
}

/** 5.2 "Next time" rules → the helper they're about (runView.summaryView names them). */
const RULE_HELPER: Record<string, HelperId> = {
  'community-discord': 'community',
  'publisher-schedule': 'publisher',
};

function removalNote(wf: Workflow, id: HelperId) {
  const name = wf.helpers[id].name;
  const nameOf = (h: string) => wf.helpers[h]?.name ?? h;
  const live = (h: string) => wf.helpers[h] && !wf.removed.includes(h);
  // Who passes to it and who it passes to, by the plan's handoff text ("Strategist", "Writer and Designer").
  const from = wf.helperOrder.filter(
    (h) => live(h) && h !== id && wf.helpers[h].passesTo.includes(name)
  );
  const to = wf.helperOrder.filter(
    (h) => live(h) && h !== id && wf.helpers[h].getsFrom.includes(name)
  );
  const list = (xs: string[]) =>
    xs.length <= 1
      ? xs.map(nameOf).join('')
      : `${xs.slice(0, -1).map(nameOf).join(', ')} and ${nameOf(xs[xs.length - 1])}`;
  const joined =
    from.length && to.length
      ? ` ${list(from)} now ${from.length === 1 ? 'passes' : 'pass'} straight to ${list(to)}.`
      : '';
  return `Removed ${name}.${joined} The estimate and the run update to match.`;
}

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'seed':
    case 'reset':
      return { ...a.state, speed: s.speed };
    case 'speed':
      return { ...s, speed: a.speed };
    case 'nav/push':
      return {
        ...s,
        returnTo: [...s.returnTo.filter((x) => x !== a.id), a.id].slice(-10),
      };
    case 'nav/pop':
      return { ...s, returnTo: s.returnTo.slice(0, -1) };
    case 'wf/open':
      return s.workflows[a.id] ? { ...s, activeId: a.id } : s;
    case 'workspace/tool':
      return {
        ...s,
        workspace: {
          ...s.workspace,
          tools: s.workspace.tools.some((t) => t.name === a.name)
            ? s.workspace.tools.map((t) =>
                t.name === a.name
                  ? {
                      ...t,
                      connected: a.connected,
                      account: a.connected
                        ? (a.account ?? t.account ?? 'Lumen')
                        : undefined,
                    }
                  : t
              )
            : [...s.workspace.tools, { name: a.name, connected: a.connected }],
        },
      };
    case 'workspace/defaultPreset':
      return { ...s, workspace: { ...s.workspace, defaultPreset: a.name } };
    case 'workspace/preset': {
      const p = { ...a.preset, rules: presetRules(a.preset.check, a.preset.adLimit) };
      const old = s.workspace.presets.find((x) => x.key === p.key);
      const presets = old
        ? s.workspace.presets.map((x) => (x.key === p.key ? p : x))
        : [...s.workspace.presets, p];
      // A renamed preset stays the one workflows (and the workspace default) use.
      const rename = (n: string) => (old && n === old.name ? p.name : n);
      return {
        ...s,
        workspace: {
          ...s.workspace,
          presets,
          defaultPreset: rename(s.workspace.defaultPreset),
        },
        workflows: old
          ? Object.fromEntries(
              Object.entries(s.workflows).map(([id, w]) => [
                id,
                w.permissions.preset === old.name
                  ? { ...w, permissions: { ...w.permissions, preset: p.name } }
                  : w,
              ])
            )
          : s.workflows,
      };
    }
    case 'wf/new': {
      const id = `wf-${now().toString(36)}`;
      return {
        ...s,
        workflows: { ...s.workflows, [id]: newWorkflow(id) },
        order: [id, ...s.order],
        activeId: id,
      };
    }
  }
  const id = ('wf' in a && a.wf) || s.activeId;
  const wf = s.workflows[id];
  if (!wf) return s;
  let next = reduceWorkflow(wf, a);
  if (next === wf) return s;
  if (!NEUTRAL.has(a.type) && next.asDrawn)
    next = { ...next, asDrawn: undefined };
  return { ...s, workflows: { ...s.workflows, [id]: next } };
}

// ---- The store ---------------------------------------------------------------------------------------------

function load(): AppState | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AppState;
    return s.version === STATE_VERSION && s.workflows?.[s.activeId] ? s : null;
  } catch {
    return null;
  }
}

function save(s: AppState) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or a full quota: the prototype still works, it just won't survive a reload.
  }
}

const speedParam = (): Speed | null => {
  try {
    const v = new URLSearchParams(window.location.search).get('speed');
    return v === 'fast' || v === 'normal' || v === 'hold' ? v : null;
  } catch {
    return null;
  }
};

const loaded = typeof window === 'undefined' ? null : load();
let state: AppState = loaded ?? sceneFor('1.1');
/** True once the state is real: restored from this tab's session, or seeded by a route. */
let ready = loaded !== null;
const urlSpeed = typeof window === 'undefined' ? null : speedParam();
if (urlSpeed) state = { ...state, speed: urlSpeed };

const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  /** Whether there is carried state to render (false on a first visit: the route seeds a scene). */
  isReady: () => ready,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  dispatch(action: Action) {
    const next = reduce(state, action);
    if (action.type === 'seed' || action.type === 'reset') ready = true;
    if (next === state) return;
    state = next;
    save(state);
    for (const fn of [...listeners]) fn();
  },
};

export const dispatch = (action: Action) => store.dispatch(action);

/** Forget the demo: clears the session and starts again from Home's scene. */
export function resetDemo() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  dispatch({ type: 'reset', state: sceneFor('1.1') });
}

if (typeof window !== 'undefined') installTimeline(store);
// Dev only: scripts (scripts/story-e2e.mjs) read and drive the store through window.__pathfinder.
if (typeof window !== 'undefined' && import.meta.env.DEV)
  (window as unknown as { __pathfinder: unknown }).__pathfinder = {
    store,
    dispatch,
  };

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** The workflow on screen (Home cards, the bell and New workflow choose it). */
export function useWorkflow(): Workflow {
  const s = useAppState();
  return s.workflows[s.activeId];
}
