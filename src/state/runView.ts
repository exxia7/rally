import { createElement } from 'react';

import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import type { Decision } from '@/components/panels/DecisionLog';
import type { HandRaiseData } from '@/components/run/HandRaisePanel';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksOverlay';
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
import { AI_COACH_TEAM, type Helper } from '@/screens/plan/aiCoachPlan';
import { COMMUNITY } from '@/screens/plan/communityPlan';
import {
  AI_COACH_DECIDING_RUN,
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

import { bridgeEdges, rawCost } from './planView';
import { BEATS } from './timeline';
import type { BeatId, HandRaiseId, Workflow, WorkflowStatus } from './types';

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
  const { date, price } = wf.resources.facts;
  const swaps: [string, string][] = [];
  // Whole-copy swaps first, while the copy still reads "Mar 12".
  if (!mentionsPenny(wf))
    for (const item of APPROVAL_ITEMS)
      if (item.bodyWithoutPenny) swaps.push([item.body, item.bodyWithoutPenny]);
  if (date !== 'Mar 12') swaps.push(['Mar 12', date]);
  if (price !== '$12/mo') swaps.push(['$12/mo', price]);
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
              }              ),
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
  const yours: Decision[] = wf.decisions.map((x) => ({
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
    decisions: [...yours, ...d.decisions],
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
  const facts = factsPass(wf);
  if (facts)
    d = {
      ...d,
      map: { ...d.map, nodes: mapText(d.map.nodes, facts) },
      decisions: mapText(d.decisions, facts),
      inspectors: d.inspectors && mapText(d.inspectors, facts),
    };
  d = applyGone(d, wf);
  d = applyOverrides(d, wf);
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
                  text: n ? `${n} item${n === 1 ? '' : 's'} waiting` : 'Ready to launch',
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
  if (wf.asDrawn) return base;
  const gone = goneSteps(wf);
  const data: HandRaiseData = {
    ...base,
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

export function runStatus(wf: Workflow): { state: PillState; label: string } {
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
    return { state: 'running', label: `Launched · ${cost}` };
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

/** 5.1's items for this team and these answers (dates, copy). */
export function approvalItems(wf: Workflow) {
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

export function approvalWaiting(wf: Workflow) {
  const n = approvalItems(wf).filter(
    (i) => (wf.approvals[i.id] ?? 'waiting') === 'waiting'
  ).length;
  // Figma's 5.1 counts the blocked ad test too.
  return wf.asDrawn ? n + 1 : n;
}

export function summaryView(wf: Workflow) {
  const items = approvalItems(wf);
  const skipped = items.filter((i) => wf.approvals[i.id] === 'wont-post');
  if (wf.asDrawn)
    return {
      line: LAUNCH_SUMMARY_LINE,
      wentOut: items.map((i) => ({ ...i.summary, skipped: false })),
      fixed: LAUNCH_FIXED,
      skipped: 0,
      askAbout: 'Let Community post to Discord without asking?',
      rule: 'community-discord',
      ruleHelper: 'Community',
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
    wentOut: items.map((i) =>
      wf.approvals[i.id] === 'wont-post'
        ? {
            label: i.summary.label,
            status: 'Not posted · you skipped it',
            skipped: true,
          }
        : { ...i.summary, skipped: false }
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
  if (st === 'done')
    return {
      status: 'Done',
      meta: `Launched ${wf.launchedOn ?? wf.resources.facts.date}`,
      needsYou: false,
    };
  if (st === 'draft')
    return { status: 'Draft', meta: 'Edited just now', needsYou: false };
  if (wf.run.phase === 'awaitingApproval')
    return {
      status: 'Running',
      meta: `${approvalWaiting(wf)} to approve`,
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
