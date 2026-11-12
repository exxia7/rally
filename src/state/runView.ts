import { createElement } from 'react';

import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import type { Decision } from '@/components/panels/DecisionLog';
import type { HandRaiseData } from '@/components/run/HandRaisePanel';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksDropdown';
import { UserAvatar } from '@/components/ui/Avatar';
import type { RunState as PillState } from '@/components/ui/RunStatus';
import {
  APPROVAL_ITEMS,
  APPROVAL_RUN,
  FINISHING_RUN,
  LAUNCH_FIXED,
  LAUNCH_SUMMARY_LINE,
  LAUNCHED_RUN,
} from '@/screens/approve/launchMap';
import {
  AI_COACH_FACTS,
  AI_COACH_TEAM,
  type Helper,
} from '@/screens/plan/aiCoachPlan';
import { COMMUNITY } from '@/screens/plan/communityPlan';
import {
  AI_COACH_DECIDING_RUN,
  AI_COACH_EDGES,
  AI_COACH_LAUNCH_RUN,
  AI_COACH_NODES,
  AI_COACH_RUN,
  STEP_OF_HELPER,
} from '@/screens/run/aiCoachMap';
import {
  FIX_EFFECTS,
  type FixEffect,
  HAND_RAISE_MISSING,
  HAND_RAISE_PRICE,
  HAND_RAISED_RUN,
  HAND_RAISED_RUN_CONFIRM,
  PRICE_MISMATCH_RUN,
  RERUN_CONFIRM_DRAWN,
  RERUN_RUN,
} from '@/screens/stuck/data';

import { needsYourOk } from './permissions';
import { bridgeEdges, rawCost } from './planView';
import { BEATS } from './timeline';
import type {
  ApprovalValue,
  BeatId,
  Fork,
  HandRaiseId,
  Workflow,
  WorkflowStatus,
} from './types';

// Selectors for the run: everything a run screen draws, derived from the live workflow. The frame data files
// (aiCoachMap, stuck/data, launchMap) give each beat its Figma look; on top of that this applies what you did:
// removed helpers disappear (their lines reconnect), renamed ones are renamed everywhere, your hand-raise choices
// change the scope, facts and copy, and counts come from the steps. A workflow still `asDrawn` (a scene nobody
// touched) returns the frame's data as is, so a direct load is pixel-exact.

const BEAT_DATA: Record<BeatId, RunData> = {
  idle: AI_COACH_LAUNCH_RUN,
  launch: AI_COACH_LAUNCH_RUN,
  deciding: AI_COACH_DECIDING_RUN,
  running: AI_COACH_RUN,
  handRaise1: HAND_RAISED_RUN,
  rerun: RERUN_RUN,
  handRaise2: PRICE_MISMATCH_RUN,
  finishing: FINISHING_RUN,
  approval: APPROVAL_RUN,
  launched: LAUNCHED_RUN,
};

/** The helpers Figma's run frames draw (the AI Coach team plus Community). */
const RUN_TEAM: Record<string, Helper> = {
  ...AI_COACH_TEAM,
  community: COMMUNITY,
};
const HELPER_OF_STEP = Object.fromEntries(
  Object.entries(STEP_OF_HELPER).map(([h, s]) => [s, h])
);
const STEP_AGENT: Record<string, AgentName> = Object.fromEntries(
  Object.entries(STEP_OF_HELPER).map(([h, s]) => [
    s,
    RUN_TEAM[h].agent as AgentName,
  ])
);
const AGENT_ORDER: AgentName[] = [
  'Planner',
  'Scout',
  'Insights',
  'Strategist',
  'Writer',
  'Designer',
  'Community',
  'Publisher',
];
/** Map order of the steps (for scopes and lists). */
const STEP_ORDER = AI_COACH_NODES.map((n) => n.id);

// ---- Team ---------------------------------------------------------------------------------------------------

export const isLive = (wf: Workflow, h: string) =>
  !!wf.helpers[h] && !wf.removed.includes(h);

/** Run steps whose helper isn't on this workflow's team (removed, or never added: Community before 2.5). */
export function goneSteps(wf: Workflow): Set<string> {
  return new Set(
    Object.entries(STEP_OF_HELPER)
      .filter(([h]) => !isLive(wf, h))
      .map(([, s]) => s)
  );
}

/** Character → current name, for helpers you renamed ("Writer" → "Copywriter"). */
export function agentNames(wf: Workflow): Partial<Record<AgentName, string>> {
  const out: Partial<Record<AgentName, string>> = {};
  for (const h of Object.keys(STEP_OF_HELPER)) {
    const helper = wf.helpers[h];
    const agent = RUN_TEAM[h].agent as AgentName;
    if (helper && helper.name.trim() && helper.name !== agent)
      out[agent] = helper.name;
  }
  return out;
}

/** The step a helper works on, and its helper's display name. */
export const stepOf = (helper: string) => STEP_OF_HELPER[helper];
export const helperOfStep = (step: string) => HELPER_OF_STEP[step];
export const nameOfStep = (wf: Workflow, step: string) =>
  wf.helpers[HELPER_OF_STEP[step]]?.name ?? STEP_AGENT[step] ?? step;

// ---- Text passes ------------------------------------------------------------------------------------------------

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Copies `value`, mapping every string through `fn`. Skips ids, line ends, character art and the agents bar. */
function mapText<T>(value: T, fn: (s: string) => string, key = ''): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapText(v, fn, key)) as T;
  if (value && typeof value === 'object') {
    if ('$$typeof' in value) return value; // a React element (decision art)
    const out: Record<string, unknown> = {};
    const isDecision = 'who' in value && 'basis' in value;
    for (const [k, v] of Object.entries(value)) {
      const skip =
        SKIP.has(k) || (k === 'agent' && (isDecision || key === 'avatar'));
      out[k] = skip ? v : mapText(v, fn, k);
    }
    return out as T;
  }
  return value;
}
const SKIP = new Set([
  'id',
  'from',
  'to',
  'avatar',
  'completed',
  'kind',
  'state',
  'tone',
  'kindIcon',
  'by',
]);

function renamer(wf: Workflow) {
  const names = Object.entries(agentNames(wf));
  if (!names.length) return null;
  const re = new RegExp(
    `\\b(${names.map(([a]) => escape(a)).join('|')})\\b`,
    'g'
  );
  const map = Object.fromEntries(names);
  return (s: string) => s.replace(re, (m) => map[m] ?? m);
}

// ---- Choices: hand raises, facts, copy ----------------------------------------------------------------------

export function fixEffects(id: HandRaiseId, choices: number[]): FixEffect[] {
  return FIX_EFFECTS[id].map((opts, i) => opts[choices[i] ?? 0] ?? opts[0]);
}

const resolved = (wf: Workflow, id: HandRaiseId) =>
  wf.handRaises.find((h) => h.id === id && h.resolved);

/** Steps a rerun from the Strategist redoes for these choices, in map order, without steps the team lost. */
export function rerunScope(wf: Workflow, choices: number[]): string[] {
  const gone = goneSteps(wf);
  const all = new Set(fixEffects('missing', choices).flatMap((e) => e.affects));
  all.add('decision');
  return STEP_ORDER.filter((s) => all.has(s) && !gone.has(s));
}

const mentionsPenny = (wf: Workflow) => {
  const m = resolved(wf, 'missing');
  return m ? !!fixEffects('missing', m.choices)[0].mentionsPenny : true;
};

/** Facts and copy that follow your answers: "Mar 12" → the launch date, the X post without Penny… */
function factsPass(wf: Workflow) {
  const { date, price, claim } = wf.resources.facts;
  const swaps: [string, string][] = [];
  // Whole-copy swaps first, while the copy still reads "Mar 12".
  if (!mentionsPenny(wf))
    for (const item of APPROVAL_ITEMS)
      if (item.bodyWithoutPenny) swaps.push([item.body, item.bodyWithoutPenny]);
  if (date !== 'Mar 12') swaps.push(['Mar 12', date]);
  if (price !== '$12/mo') swaps.push(['$12/mo', price]);
  // The approved claim (2.8) is the X post's middle sentence ("AI Coach knows your actual budget.").
  const said = claim.trim().replace(/[.!\s]+$/, '');
  if (said && claim !== AI_COACH_FACTS.claim)
    swaps.push([AI_COACH_FACTS.claim, said]);
  const m = resolved(wf, 'missing');
  const decided = m && fixEffects('missing', m.choices)[0].decided;
  if (decided)
    swaps.unshift(['Decided: existing budgeters, vs Penny', decided]);
  if (!swaps.length) return null;
  return (s: string) => swaps.reduce((acc, [a, b]) => acc.split(a).join(b), s);
}

// ---- The run map ------------------------------------------------------------------------------------------------

function applyRerun(d: RunData, wf: Workflow): RunData {
  const rerun = wf.reruns[wf.reruns.length - 1];
  if (!rerun) return d;
  const scope = new Set(rerun.scope);
  const upstream = new Set(['plan', 'scout', 'insights']);
  const nodes = d.map.nodes.map((n): MapNode => {
    if (n.id === 'task' || n.id === 'ready') return n;
    if (n.id === 'decision')
      return {
        ...n,
        note: rerun.note ?? n.note,
        status: { text: `Redoing · 1 of ${rerun.scope.length}`, tone: 'live' },
      };
    if (scope.has(n.id)) {
      if (upstream.has(n.id))
        return {
          ...n,
          state: 'working',
          status: { text: 'Redoing', tone: 'live' },
          avatar: { agent: STEP_AGENT[n.id], state: 'working' },
        };
      if (n.status?.text === 'Reused')
        return {
          ...n,
          state: 'waiting',
          status: {
            text:
              n.id === 'writer' || n.id === 'designer'
                ? 'Waits for new card'
                : 'Waiting for new copy',
          },
        };
      return n;
    }
    return n.status?.text === 'Reused' || upstream.has(n.id)
      ? n
      : {
          ...n,
          state: 'waiting',
          status: { text: 'Reused' },
          avatar: undefined,
        };
  });
  const tasks = d.tasks.map((t): TaskItem => {
    if (!t.id || t.id === 'task' || t.id === 'ready') return t;
    if (t.id === 'decision') return { ...t, state: 'running' };
    return { ...t, state: scope.has(t.id) ? 'waiting' : 'reused' };
  });
  return { ...d, map: { ...d.map, nodes }, tasks };
}

function applyGone(d: RunData, wf: Workflow): RunData {
  const gone = goneSteps(wf);
  if (!gone.size) return d;
  const goneAgents = new Set([...gone].map((s) => STEP_AGENT[s]));
  const goneNames = [...goneAgents];
  const nodes = d.map.nodes.filter((n) => !gone.has(n.id));
  const edges = bridgeEdges<MapEdge>(d.map.edges, gone, (into, out) => ({
    from: into.from,
    to: out.to,
    status:
      into.status === 'passed' && out.status === 'passed'
        ? 'passed'
        : into.status === 'passed'
          ? out.status
          : into.status,
    dimmed: into.dimmed,
    lane: into.lane,
    marker: into.marker,
  }));
  const prune = (source?: string) => {
    if (!source) return source;
    const parts = source.split(',').map((x) => x.trim());
    if (!parts.some((p) => goneNames.includes(p as AgentName))) return source;
    const left = parts.filter((p) => !goneNames.includes(p as AgentName));
    return left.length ? left.join(', ') : 'Not used';
  };
  const mentionsGone = (text: string) =>
    goneNames.some((n) => new RegExp(`\\b${n}\\b`).test(text));
  return {
    ...d,
    map: { ...d.map, nodes, edges },
    tasks: d.tasks.filter((t) => !t.id || !gone.has(t.id)),
    completed: d.completed.filter((a) => !goneAgents.has(a)),
    decisions: d.decisions.filter((x) => !x.agent || !goneAgents.has(x.agent)),
    inspectors:
      d.inspectors &&
      Object.fromEntries(
        Object.entries(d.inspectors)
          .filter(([k]) => !gone.has(k))
          .map(([k, v]) => [
            k,
            {
              ...v,
              // Drop sentences about helpers that are gone ("Community and Publisher use this copy next.").
              fields: v.fields.map((f) => {
                if (!mentionsGone(f.value)) return f;
                const kept = f.value
                  .split(/(?<=\.)\s+/)
                  .filter((x) => !mentionsGone(x))
                  .join(' ');
                return { ...f, value: kept || 'Nothing else uses this.' };
              }),
            },
          ])
      ),
    sandbox: d.sandbox.map((sec) => ({
      ...sec,
      items: sec.items.map((i) => ({
        ...i,
        source: prune(i.source) ?? i.source,
      })),
    })),
    chat: d.chat.map((m) =>
      m.from === 'assistant' && mentionsGone(m.text)
        ? {
            ...m,
            text: 'Your launch is running. I’ll check with you before anything is posted.',
          }
        : m
    ),
  };
}

/**
 * Permissions (permissions/settings agent, audit 2i): a poster set to post on its own ("Just go" in 2.4e, the drawer
 * or 5.2's "Allow") loses its "Your OK" flag, "Ready to post" stops waiting when nobody asks, and the run Sandbox's
 * Permissions rows follow the helpers' rules and the ad limit.
 */
function applyPermissions(d: RunData, wf: Workflow): RunData {
  const asks = (step: string) => {
    const h = HELPER_OF_STEP[step];
    return h ? needsYourOk(wf, h) : true;
  };
  const posters = ['discord', 'schedule'].filter((st) =>
    isLive(wf, HELPER_OF_STEP[st])
  );
  const anyAsks = posters.some(asks);
  const rule = (step: string) => (asks(step) ? 'Asks you first' : 'Allowed');
  return {
    ...d,
    map: {
      ...d.map,
      nodes: d.map.nodes.map((n) => {
        if (n.asksYouFirst !== undefined && posters.includes(n.id))
          return { ...n, asksYouFirst: asks(n.id) };
        if (
          n.id === 'ready' &&
          !anyAsks &&
          n.status?.text === 'Waits for your OK'
        )
          return { ...n, status: { text: 'Posts on its own' } };
        return n;
      }),
    },
    sandbox: d.sandbox.map((sec) =>
      sec.id !== 'permissions'
        ? sec
        : {
            ...sec,
            items: sec.items.map((i) =>
              i.name === 'Post to Discord'
                ? { ...i, source: rule('discord') }
                : i.name === 'Schedule on X'
                  ? { ...i, source: rule('schedule') }
                  : i.name === 'Spend on ads'
                    ? { ...i, source: `Up to $${wf.permissions.adLimit}` }
                    : i
            ),
          }
    ),
  };
}

const FINISHED = new Set(['done', 'reused']);

/** Counts from the steps: agents done, the Tasks summary; plus your own decisions in the log. */
function applyCounts(d: RunData, wf: Workflow): RunData {
  const beat = wf.run.beat;
  const done = d.tasks.filter((t) => FINISHED.has(t.state)).length;
  const total = d.tasks.length;
  const doneSteps = new Set(
    d.tasks.filter((t) => t.id && FINISHED.has(t.state)).map((t) => t.id!)
  );
  const completed = AGENT_ORDER.filter((a) =>
    Object.entries(STEP_AGENT).some(([s, ag]) => ag === a && doneSteps.has(s))
  );
  const minsLeft: Partial<Record<BeatId, number>> = {
    launch: 8,
    deciding: 6,
    running: 4,
    finishing: 1,
  };
  const tasksSummary =
    beat === 'rerun'
      ? d.tasksSummary
      : BEATS[beat].phase === 'needsYou'
        ? `${done} of ${total} done · waiting on you`
        : beat === 'approval'
          ? `${done} of ${total} done · waiting for your OK`
          : beat === 'launched'
            ? `All ${total} done`
            : `${done} of ${total} done · about ${minsLeft[beat] ?? 1} min left`;
  const yours: Decision[] = wf.decisions
    .filter((x) => !x.replaces)
    .map((x) => ({
      id: x.id,
      art: createElement(UserAvatar, { className: 'size-5! text-[9px]!' }),
      who: 'You',
      time: x.time,
      by: 'you',
      title: x.title,
      basis: x.basis,
    }));
  return {
    ...d,
    completed,
    tasksSummary,
    decisions: applyDecisionChanges([...yours, ...d.decisions], wf),
  };
}

/** A decision you changed (3.4 "Change") shows your text in its place, marked "Changed by you". */
function applyDecisionChanges(log: Decision[], wf: Workflow): Decision[] {
  const changes = new Map(
    wf.decisions.filter((x) => x.replaces).map((x) => [x.replaces!, x])
  );
  if (!changes.size) return log;
  return log.map((x) => {
    const c = changes.get(x.id);
    return c
      ? {
          ...x,
          title: c.title,
          basis: c.basis,
          time: c.time,
          tag: 'Changed by you',
        }
      : x;
  });
}

/**
 * The run Sandbox from the store: resources you imported (Import, a section's "+") join their section, and a
 * row's "used by" names every helper you gave it to ("Add to <step>").
 */
function applySandbox(d: RunData, wf: Workflow): RunData {
  const name = (h: string) => wf.helpers[h]?.name ?? h;
  return {
    ...d,
    sandbox: d.sandbox.map((sec) => {
      if (sec.id !== 'assets' && sec.id !== 'skills' && sec.id !== 'tools')
        return sec;
      const res = wf.resources[sec.id];
      const added = res
        .filter((r) => !sec.items.some((i) => i.name === r.name))
        .map((r) => ({
          name: r.name,
          source: r.source ?? 'New · not used yet',
        }));
      const items = [...added, ...sec.items].map((i) => {
        const users = (res.find((r) => r.name === i.name)?.usedBy ?? [])
          .map(name)
          .filter((n) => !i.source.includes(n));
        if (!users.length) return i;
        return {
          ...i,
          source: /^(New|Not used)/.test(i.source)
            ? users.join(', ')
            : `${i.source}, ${users.join(', ')}`,
        };
      });
      return { ...sec, items, open: sec.open || added.length > 0 };
    }),
  };
}

function applyOverrides(d: RunData, wf: Workflow): RunData {
  const o = wf.run.steps;
  if (!Object.keys(o).length) return d;
  return {
    ...d,
    map: {
      ...d.map,
      nodes: d.map.nodes.map((n) =>
        o[n.id]
          ? {
              ...n,
              state: o[n.id].state ?? n.state,
              status: o[n.id].status ? { text: o[n.id].status! } : n.status,
            }
          : n
      ),
    },
  };
}

// ---- Steps you added on the plan --------------------------------------------------------------------------------

/** One run-map column (Figma's columns are 230.6px apart at map scale). */
const COLUMN = 230.6;

/**
 * Helpers the run frames don't draw, with where they go: steps you inserted on a line (2.4c), duplicates, and any
 * other helper you added (beside the helper that follows it in the team order, as the plan map draws it).
 */
type ExtraHelper = {
  id: string;
  helper: Helper;
  /** An inserted step: the plan line it was added on. */
  edge?: { from: string; to: string };
  /** A duplicate: the helper it copies (or, for any other added helper, the one it sits beside). */
  copyOf?: string;
};

function extraHelpers(wf: Workflow): ExtraHelper[] {
  const order = wf.helperOrder;
  return order.flatMap((id, i): ExtraHelper[] => {
    if (STEP_OF_HELPER[id] || !isLive(wf, id)) return [];
    const helper = wf.helpers[id];
    const edit = wf.planSteps.find((p) => p.id === id);
    if (edit) return [{ id, helper, edge: edit.edge }];
    if (helper.copyOf) {
      // A copy of a step you added and then removed goes on that step's line.
      const of = wf.planSteps.find((p) => p.id === helper.copyOf);
      return [
        of && !isLive(wf, of.id)
          ? { id, helper, edge: of.edge }
          : { id, helper, copyOf: helper.copyOf },
      ];
    }
    const live = (h: string) => isLive(wf, h);
    const sibling =
      order.slice(i + 1).find(live) ?? order.slice(0, i).reverse().find(live);
    return sibling ? [{ id, helper, copyOf: sibling }] : [];
  });
}

const FINISHED_TASK = new Set(['done', 'reused']);
const STARTED_TASK = new Set(['running', 'approval', 'done', 'reused']);

/**
 * Adds a run step for each helper you added on the plan: a new column between the steps its line joined (the
 * columns after it move right and the map is drawn smaller to fit), its lines reconnected through it, and a task row.
 * It works once the steps before it are done and is done once the steps after it have started (a duplicate follows
 * the step it copies); `extraWorkDelay` gives the timeline a beat for it.
 */
function applyExtraSteps(d: RunData, wf: Workflow): RunData {
  const extras = extraHelpers(wf);
  if (!extras.length) return d;
  let { nodes, edges } = d.map;
  let { overlays, forkLines } = d.map;
  let tasks = d.tasks;
  let width = d.map.width;
  const full = d.map.full ?? { x: d.map.x, y: d.map.y, width: d.map.width };
  const taskState = (id: string) => tasks.find((t) => t.id === id)?.state;
  const has = (id: string) => nodes.some((n) => n.id === id);
  const runOf = (planId: string) => {
    const id = STEP_OF_HELPER[planId] ?? planId;
    return has(id) ? id : null;
  };
  const preds = (id: string) =>
    edges.filter((e) => e.to === id).map((e) => e.from);
  const succs = (id: string) =>
    edges.filter((e) => e.from === id).map((e) => e.to);

  /** Where `x` goes once what it hangs off is on the map (a line into a duplicate or another added step only
   *  exists once that one is placed); `last` puts what never resolves in a column before Ready to post. */
  const place = (x: ExtraHelper, last: boolean) => {
    if (x.edge) {
      const from = runOf(x.edge.from);
      const to = runOf(x.edge.to);
      const up = from ? [from] : to ? preds(to) : [];
      const down = to ? [to] : from ? succs(from) : [];
      if (up.length && down.length) {
        const downNodes = nodes.filter((n) => down.includes(n.id));
        const at = Math.min(...downNodes.map((n) => n.x));
        const y = downNodes.reduce((sum, n) => sum + n.y, 0) / downNodes.length;
        return { up, down, at, y };
      }
    } else {
      const of = runOf(x.copyOf!);
      const src = of && nodes.find((n) => n.id === of);
      if (src)
        return {
          up: preds(src.id),
          down: succs(src.id),
          at: src.x + COLUMN,
          y: src.y,
        };
    }
    if (!last) return null;
    const end =
      nodes.find((n) => n.id === 'ready') ??
      nodes.reduce<MapNode | undefined>(
        (a, n) => (!a || n.x > a.x ? n : a),
        undefined
      );
    if (!end) return null;
    return { up: preds(end.id), down: [end.id], at: end.x, y: end.y };
  };

  let pending = extras;
  for (let last = false; pending.length;) {
    const i = pending.findIndex((p) => place(p, last));
    if (i < 0) {
      if (last) break;
      last = true;
      continue;
    }
    const x = pending[i];
    pending = pending.filter((_, j) => j !== i);
    const { up, down, at, y } = place(x, last)!;
    // Make room: a new column at `at`.
    const shift = (v: number) => (v >= at - 1 ? v + COLUMN : v);
    nodes = nodes.map((n) => ({ ...n, x: shift(n.x) }));
    edges = edges.map((e) =>
      e.lane === undefined ? e : { ...e, lane: shift(e.lane) }
    );
    overlays = overlays?.map((o) => ({ ...o, x: shift(o.x) }));
    forkLines = forkLines?.map((f) => ({ ...f, x: shift(f.x) }));
    width += COLUMN;

    const copied = x.copyOf ? STEP_OF_HELPER[x.copyOf] : undefined;
    const state = copied
      ? taskState(copied)
      : down.some((s) => STARTED_TASK.has(taskState(s) ?? ''))
        ? 'done'
        : up.every((s) => FINISHED_TASK.has(taskState(s) ?? ''))
          ? 'running'
          : 'waiting';
    const done = state === 'done' || state === 'reused';
    const working = state === 'running';
    const firstUp = up[0] && nameOfStep(wf, up[0]);
    const agent = x.helper.agent as AgentName | undefined;
    const node: MapNode = {
      id: x.id,
      x: at,
      y,
      kind: x.helper.kind ?? 'action',
      title: x.helper.name,
      agent: agent && agent !== x.helper.name ? x.helper.name : undefined,
      state: done ? 'done' : working ? 'working' : 'waiting',
      status: done
        ? { text: 'Done' }
        : working
          ? { text: 'Working', tone: 'live' }
          : { text: firstUp ? `Waits for ${firstUp}` : 'Waiting' },
      avatar: working && agent ? { agent, state: 'working' } : undefined,
    };
    const status = (passed: boolean): MapEdge['status'] =>
      passed ? 'passed' : 'pending';
    const keep = x.copyOf
      ? edges
      : edges.filter((e) => !(up.includes(e.from) && down.includes(e.to)));
    edges = [
      ...keep,
      ...up.map((u) => ({
        from: u,
        to: x.id,
        status: status(done || working),
      })),
      ...down.map((t) => ({ from: x.id, to: t, status: status(done) })),
    ];
    nodes = [...nodes, node];
    const row: TaskItem = {
      id: x.id,
      title: x.helper.name,
      state: state ?? 'waiting',
    };
    const before = tasks.findIndex((t) => t.id && down.includes(t.id));
    tasks =
      before < 0
        ? [...tasks, row]
        : [...tasks.slice(0, before), row, ...tasks.slice(before)];
  }
  return {
    ...d,
    map: { ...d.map, nodes, edges, overlays, forkLines, width, full },
    tasks,
  };
}

/** How much longer the current beat runs while steps you added work in it (the timeline's beat for them). */
export function extraWorkDelay(wf: Workflow) {
  if (wf.asDrawn || !extraHelpers(wf).length) return 0;
  const ids = new Set(extraHelpers(wf).map((x) => x.id));
  const working = runData(wf).map.nodes.filter(
    (n) => ids.has(n.id) && n.state === 'working'
  ).length;
  return working * 2500;
}

/** Everything RunScreenLayout draws for this workflow's current beat. `confirm`: 4.1b's variant of the panel. */
export function runData(
  wf: Workflow,
  opts: { confirm?: boolean } = {}
): RunData {
  const beat = wf.run.beat;
  let d =
    beat === 'handRaise1' && opts.confirm
      ? HAND_RAISED_RUN_CONFIRM
      : BEAT_DATA[beat];
  if (beat === 'handRaise1' || beat === 'handRaise2')
    d = { ...d, handRaise: handRaiseData(wf, opts) };
  if (wf.asDrawn) return d;
  if (beat === 'rerun') d = applyRerun(d, wf);
  d = applyExtraSteps(d, wf);
  const facts = factsPass(wf);
  if (facts)
    d = {
      ...d,
      map: { ...d.map, nodes: mapText(d.map.nodes, facts) },
      decisions: mapText(d.decisions, facts),
      inspectors: d.inspectors && mapText(d.inspectors, facts),
    };
  d = applyGone(d, wf);
  d = applyPermissions(d, wf);
  d = applyOverrides(d, wf);
  d = applySandbox(d, wf);
  if (beat === 'approval') {
    const n = approvalWaiting(wf);
    d = {
      ...d,
      map: {
        ...d.map,
        nodes: d.map.nodes.map((x) =>
          x.id === 'ready'
            ? {
                ...x,
                status: {
                  text: n
                    ? `${n} item${n === 1 ? '' : 's'} waiting`
                    : 'Ready to launch',
                  tone: 'strong',
                },
              }
            : x
        ),
      },
    };
  }
  d = applyCounts(d, wf);
  // The task card keeps your words.
  if (wf.brief.summary)
    d = {
      ...d,
      map: {
        ...d.map,
        nodes: d.map.nodes.map((n) =>
          n.id === 'task' ? { ...n, lead: wf.brief.summary } : n
        ),
      },
    };
  const rename = renamer(wf);
  if (rename) d = mapText(d, rename);
  return d;
}

/** The hand-raise panel for this beat, with helper counts from the live team. */
export function handRaiseData(
  wf: Workflow,
  opts: { confirm?: boolean } = {}
): HandRaiseData {
  const id: HandRaiseId = wf.run.beat === 'handRaise2' ? 'price' : 'missing';
  const base =
    id === 'price'
      ? HAND_RAISE_PRICE
      : opts.confirm
        ? HAND_RAISED_RUN_CONFIRM.handRaise!
        : HAND_RAISE_MISSING;
  const handoff = handoffOf(wf, id);
  if (wf.asDrawn) return { ...base, handoff };
  const gone = goneSteps(wf);
  const data: HandRaiseData = {
    ...base,
    handoff,
    steps: base.steps.map((s, i) => ({
      ...s,
      options: s.options.map((o, j) => {
        const n = FIX_EFFECTS[id][i][j].affects.filter(
          (x) => !gone.has(x)
        ).length;
        const rest = o.description.split(' · ').slice(1).join(' · ');
        const who =
          n === 1 ? '1 helper redoes its work' : `${n} helpers redo their work`;
        return { ...o, description: [who, rest].filter(Boolean).join(' · ') };
      }),
    })),
  };
  const rename = renamer(wf);
  return rename ? mapText(data, rename) : data;
}

/**
 * "See the full handoff" (4.1, 4.3): what the handoff into the step that raised its hand carried besides the
 * problems on its Fix steps. Names and facts come from the workflow (renamed helpers, your launch date).
 */
export function handoffOf(
  wf: Workflow,
  id: HandRaiseId
): NonNullable<HandRaiseData['handoff']> {
  const f = wf.resources.facts;
  const nm = (h: string, fallback: string) => wf.helpers[h]?.name ?? fallback;
  return id === 'missing'
    ? {
        from: nm('scout', 'Scout'),
        to: nm('strategist', 'Strategist'),
        passed: [
          {
            title: 'Competitor scan',
            detail: '6 budgeting apps compared on features and coaching',
          },
          {
            title: 'Feature comparison',
            detail: 'Budgets, alerts and coaching across the 6 apps',
          },
        ],
      }
    : {
        from: nm('strategist', 'Strategist'),
        to: nm('writer', 'Writer'),
        passed: [
          { title: 'Audience', detail: f.audience },
          { title: 'Message', detail: 'Lead with coaching, not tracking' },
          { title: 'Launch date', detail: `${f.date}, ${f.time}` },
        ],
      };
}

/** 4.1b "Rerun confirm": who reruns for these choices. Figma's list while the frame is as drawn. */
export function rerunConfirm(wf: Workflow, choices: number[]) {
  const strategist = wf.helpers.strategist?.name ?? 'Strategist';
  if (wf.asDrawn)
    return {
      title: 'Rerun Strategist?',
      affected: RERUN_CONFIRM_DRAWN.map(([agent, step]) => ({
        agent,
        name: agent,
        step,
      })),
      confirmLabel: 'Rerun 5 agents',
    };
  const scope = rerunScope(wf, choices);
  const titles = Object.fromEntries(AI_COACH_NODES.map((n) => [n.id, n.title]));
  return {
    title: `Rerun ${strategist}?`,
    affected: scope
      .filter((s) => s !== 'decision')
      .map((s) => ({
        agent: STEP_AGENT[s],
        name: nameOfStep(wf, s),
        step: titles[s],
      })),
    confirmLabel: `Rerun ${scope.length} agent${scope.length === 1 ? '' : 's'}`,
  };
}

// ---- Status, cost, frame ------------------------------------------------------------------------------------

/** Spend at the current beat: Figma's number for its team, scaled by what the live team costs. */
export function runCost(wf: Workflow) {
  const base = BEATS[wf.run.beat].cost;
  if (wf.asDrawn) return base;
  const live = wf.helperOrder
    .filter((h) => isLive(wf, h))
    .map((h) => wf.helpers[h]);
  return base * (rawCost(live) / rawCost(Object.values(RUN_TEAM)));
}
export const money = (n: number) => `$${n.toFixed(2)}`;

/** The top bar's run status pill. `hidden`: no pill (after launch the run is over; the user asked to drop it). */
export function runStatus(wf: Workflow): {
  state: PillState;
  label: string;
  hidden?: boolean;
} {
  const cost = money(runCost(wf));
  const { phase, paused } = wf.run;
  if (phase === 'needsYou')
    return { state: 'waiting', label: `Needs you · ${cost}` };
  if (phase === 'awaitingApproval')
    return {
      state: 'waiting',
      label: `${approvalWaiting(wf)} waiting for your OK · ${cost}`,
    };
  if (phase === 'launched')
    return { state: 'running', label: '', hidden: true };
  if (paused) return { state: 'paused', label: `Paused · ${cost}` };
  if (phase === 'rerunning')
    return { state: 'rerunning', label: `Rerunning · ${cost}` };
  return { state: 'running', label: `Running · ${cost}` };
}

/** The frame the run is at (the Flowchart toggle and run screens go here). A run not started yet is 3.1. */
export function runFrame(wf: Workflow) {
  return BEATS[wf.run.beat].frame;
}

/** Screens that show the same beat (a run screen whose beat moved on replaces itself with the beat's frame). */
export const FRAME_FAMILY: Record<string, string> = {
  '3.2': '3.2',
  '3.2-tasks': '3.2',
  '3.3': '3.2',
  '3.3-tasks': '3.2',
  '3.4': '3.2',
  '3.4-tasks': '3.2',
  '3.5': '3.2',
  '3.5-tasks': '3.2',
  '4.1': '4.1',
  '4.1b': '4.1',
  '4.2': '4.2',
  '4.2-tasks': '4.2',
  '4.3': '4.3',
  '5.1': '5.1',
  '5.2': '5.2',
};

// ---- Approval and summary ----------------------------------------------------------------------------------

/** The original's items for this team and these answers (dates, copy). */
function originalItems(wf: Workflow) {
  const facts = wf.asDrawn ? null : factsPass(wf);
  return APPROVAL_ITEMS.filter((i) => isLive(wf, i.owner)).map((i) =>
    facts
      ? {
          ...i,
          when: facts(i.when),
          body: facts(i.body),
          summary: { ...i.summary, label: facts(i.summary.label) },
        }
      : i
  );
}

// ---- Versions (forks) ---------------------------------------------------------------------------------------

/** The version that goes out: the fork you chose with "Use this version", else the original. */
export function chosenBranch(wf: Workflow): string {
  const id = wf.chosenVersion;
  return id && wf.forks.some((f) => f.id === id) ? id : 'original';
}

/** The chosen fork, when it isn't the original. */
export function chosenFork(wf: Workflow): Fork | undefined {
  return wf.forks.find((f) => f.id === chosenBranch(wf));
}

/** One branch's approvals ('original' or a fork id). */
export function branchApprovals(
  wf: Workflow,
  branch: string
): Record<string, ApprovalValue> {
  if (branch === 'original') return wf.approvals;
  return wf.forks.find((f) => f.id === branch)?.approvals ?? {};
}

/** Run steps after `from` (itself included), on the original graph: what a fork from that step redoes. */
function stepsAfter(from: string): Set<string> {
  const ids = new Set([from.replace(/-f\d$/, '')]);
  for (let grew = true; grew;) {
    grew = false;
    for (const e of AI_COACH_EDGES)
      if (ids.has(e.from) && !ids.has(e.to)) {
        ids.add(e.to);
        grew = true;
      }
  }
  return ids;
}

/**
 * A branch's items: the original's, or a fork's (the outputs of the helpers it redoes, with its own copy where it
 * has some). `fork` can be a fork the store doesn't have yet (a frame's drawn fork).
 */
export function branchItems(wf: Workflow, fork?: Pick<Fork, 'from' | 'copy'>) {
  const all = originalItems(wf);
  if (!fork) return all;
  const owners = new Set(
    [...stepsAfter(fork.from)].map((s) => HELPER_OF_STEP[s]).filter(Boolean)
  );
  const scoped = all.filter((i) => owners.has(i.owner));
  return (scoped.length ? scoped : all).map((i) =>
    fork.copy?.[i.id] ? { ...i, body: fork.copy[i.id] } : i
  );
}

/** A branch's items with the text you edited in place ("Edit" on 5.1 or a fork's approval panel, `edited` set). */
export function withEditedText<T extends { id: string; body: string }>(
  wf: Workflow,
  branch: string,
  items: T[]
): (T & { edited?: boolean })[] {
  const text = wf.approvalText;
  if (!text) return items;
  return items.map((i) => {
    const t = text[`${branch}:${i.id}`];
    return t ? { ...i, body: t, edited: true } : i;
  });
}

/** 5.1's items: the chosen version's, with the text you edited in place (5.1 "Edit", `edited` set). */
export function approvalItems(wf: Workflow) {
  return withEditedText(wf, chosenBranch(wf), branchItems(wf, chosenFork(wf)));
}

/** 5.1's approvals: the chosen version's. */
export function approvalsOf(wf: Workflow) {
  return branchApprovals(wf, chosenBranch(wf));
}

export function approvalWaiting(wf: Workflow) {
  const approvals = approvalsOf(wf);
  const n = approvalItems(wf).filter(
    (i) => (approvals[i.id] ?? 'waiting') === 'waiting'
  ).length;
  // Figma's 5.1 counts the blocked ad test too.
  return wf.asDrawn ? n + 1 : n;
}

/**
 * 5.2 for the chosen version. `blocked` says why an output couldn't go out (permissions.blockedOutput): such an item
 * reads "Not posted · <why>" and isn't counted among the posts you skipped.
 */
export function summaryView(
  wf: Workflow,
  blocked: (output: string) => string | undefined = () => undefined
) {
  const items = approvalItems(wf);
  const approvals = approvalsOf(wf);
  const skipped = items.filter(
    (i) => approvals[i.id] === 'wont-post' && !blocked(i.id)
  );
  const fork = chosenFork(wf);
  if (wf.asDrawn)
    return {
      line: LAUNCH_SUMMARY_LINE,
      wentOut: items.map((i) => ({ ...i.summary, skipped: false })),
      fixed: LAUNCH_FIXED,
      skipped: 0,
      askAbout: 'Let Community post to Discord without asking?',
      rule: 'community-discord',
      ruleHelper: 'Community',
      version: undefined,
    };
  const fixed: string[] = [];
  for (const id of ['missing', 'price'] as HandRaiseId[]) {
    const h = resolved(wf, id);
    if (!h) continue;
    fixed.push(...fixEffects(id, h.choices).map((e) => e.fixed));
    if (h.other.trim()) fixed.push(`Told the team: “${h.other.trim()}”`);
  }
  const mins = Math.max(
    1,
    Math.round(22 * (runCost(wf) / BEATS.launched.cost))
  );
  const community = isLive(wf, 'community');
  const ruleHelper = community
    ? wf.helpers.community.name
    : (wf.helpers.publisher?.name ?? 'Publisher');
  return {
    line: `${wf.title} · ${wf.resources.facts.date} · ${mins} min · ${money(runCost(wf))}`,
    /** The version that went out, when you chose a fork ("Vs Penny"); the others were kept, not posted. */
    version: fork?.name,
    wentOut: items.map((i) =>
      approvals[i.id] === 'wont-post'
        ? {
            label: i.summary.label,
            status: `Not posted · ${blocked(i.id) ?? 'you skipped it'}`,
            skipped: true,
          }
        : {
            ...i.summary,
            skipped: false,
            /** Your edited text (5.1 "Edit"): 5.2 shows it under the row. */
            edited: 'edited' in i && i.edited ? i.body : undefined,
          }
    ),
    fixed,
    skipped: skipped.length,
    askAbout: community
      ? `Let ${ruleHelper} post to Discord without asking?`
      : `Let ${ruleHelper} schedule posts without asking?`,
    rule: community ? 'community-discord' : 'publisher-schedule',
    ruleHelper,
  };
}

// ---- Home -----------------------------------------------------------------------------------------------------

/** A Home card's badge and line, from the workflow's live state (mock workflows keep Figma's text). */
export function workflowCard(wf: Workflow): {
  status: 'Running' | 'Draft' | 'Done';
  meta: string;
  needsYou: boolean;
} {
  if (
    wf.card &&
    wf.asDrawn === undefined &&
    wf.run.phase === 'launched' &&
    wf.card.status === 'Done'
  )
    return { ...wf.card, needsYou: false };
  if (wf.card && wf.status !== 'running' && wf.status !== 'needsYou')
    return { ...wf.card, needsYou: false };
  const st: WorkflowStatus = wf.status;
  // The version you chose, when it isn't the original ("Launched Mar 14 · Vs Penny").
  const version = chosenFork(wf)?.name;
  const withVersion = (meta: string) =>
    version ? `${meta} · ${version}` : meta;
  if (st === 'done')
    return {
      status: 'Done',
      meta: withVersion(`Launched ${wf.launchedOn ?? wf.resources.facts.date}`),
      needsYou: false,
    };
  if (st === 'draft')
    return { status: 'Draft', meta: 'Edited just now', needsYou: false };
  if (wf.run.phase === 'awaitingApproval')
    return {
      status: 'Running',
      meta: withVersion(`${approvalWaiting(wf)} to approve`),
      needsYou: true,
    };
  if (st === 'needsYou')
    return { status: 'Running', meta: 'Needs your input', needsYou: true };
  return {
    status: 'Running',
    meta: wf.run.paused ? 'Paused' : 'Running now',
    needsYou: false,
  };
}
