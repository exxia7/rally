import actionGlyph from '@/assets/icons/node-kind-action-glyph.svg';
import decisionGlyph from '@/assets/icons/node-kind-decision-glyph-12.svg';
import outputGlyph from '@/assets/icons/node-kind-output-glyph.svg';
import { createElement } from 'react';

import type { AgentName } from '@/components/agents/characters';
import { ForkLabel, ForkPill } from '@/components/map/Fork';
import type {
  ForkLine,
  MapEdge,
  MapNode,
  MapOverlay,
} from '@/components/map/FlowMap';
import type { ForkNumber } from '@/components/map/forks';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData, RunMap } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksOverlay';
import {
  AI_COACH_EDGES,
  AI_COACH_INSPECTOR,
  AI_COACH_NODES,
  AI_COACH_RUN,
} from '@/screens/run/aiCoachMap';

// Fork frames (4.4, 4.5, 6.4–6.6): the AI Coach run (3.2–3.5) with a fork set up or running. Forking grows the
// map: each fork gets its own lane under the original path, joined by a bold fork line in that fork's colour
// (Fork 1 pink, Fork 2 teal, …); the original path stays as it is.
//
// Figma draws these frames only with the side panel docked, where the map is 874px wide (K = 874/1282 of map
// scale) and the fork lanes sit on round numbers at that scale. Fork-lane geometry below is written in those docked
// px and converted with `d()`, so it reads straight off the frames' metadata.
const K = 874 / 1282;
const d = (v: number) => v / K;
const FORK_PORT_DY = d(13);
const FORK_W = d(119.4676);
const FORK_MARKER = d(13);

// Kind tiles some instances draw with the unscaled mark (15.732px), with or without its 7.261px radius.
const LARGE_TILE = { tile: { glyph: 15.732, radius: 7.261 } };
const LARGE_MARK = { tile: { glyph: 15.732 } };

const original = (overrides: Record<string, Partial<MapNode>>): MapNode[] =>
  AI_COACH_NODES.map((n) => ({ ...n, ...overrides[n.id] }));

const passedEdges: MapEdge[] = AI_COACH_EDGES.map((e) => ({
  ...e,
  status: 'passed',
  marker: e.marker && { ...e.marker, status: 'passed' },
}));

// Fork pill on the fork line and the lane's Fork label, both sized for the docked map.
const forkMarks = (
  fork: ForkNumber,
  pill: { x: number; y: number; label: string },
  label: { x: number; y: number; label: string }
): MapOverlay[] => [
  {
    id: `fork-${fork}-pill`,
    x: d(pill.x),
    y: d(pill.y),
    scale: 1 / K,
    content: createElement(ForkPill, { fork, label: pill.label }),
  },
  {
    id: `fork-${fork}-label`,
    x: d(label.x),
    y: d(label.y),
    scale: 1 / K,
    content: createElement(ForkLabel, { fork, label: label.label }),
  },
];

// A lane step: Figma's fork-lane cards attach their connectors 13px (docked) below the top.
const laneNode = (
  n: Omit<MapNode, 'x' | 'y'> & { x: number; y: number }
): MapNode => ({ portDy: FORK_PORT_DY, ...n, x: d(n.x), y: d(n.y) });

const laneEdge = (
  from: string,
  to: string,
  opts: { lane?: number; radius?: number; markerDx?: number } = {}
): MapEdge => ({
  from,
  to,
  status: 'pending',
  handles: true,
  lane: opts.lane === undefined ? undefined : d(opts.lane),
  radius: opts.radius === undefined ? undefined : d(opts.radius),
  marker:
    opts.markerDx === undefined
      ? undefined
      : { status: 'pending', dx: d(opts.markerDx), size: FORK_MARKER },
});

// The stub marker after the decision, where a fork from the decision (4.5) or from Launch copy (6.5) leaves.
const DECISION_STUB = { x: d(418.137), y: d(155.937) };

// The map grown by fork lanes, fitted to the 1362×830 stage when the side panel is closed (between the Tasks chip
// and the Completed agents).
const fitFull = (height: number) => {
  const s = Math.min(1, 685 / height);
  const width = 1282 * s;
  return { x: (1362 - width) / 2, y: 60 + (685 - height * s) / 2, width };
};

const forkMap = (
  m: Pick<RunMap, 'nodes' | 'edges' | 'overlays' | 'forkLines'>,
  docked?: { y: number; height: number }
): RunMap => ({
  x: AI_COACH_RUN.map.x,
  y: AI_COACH_RUN.map.y,
  width: AI_COACH_RUN.map.width,
  height: docked ? d(docked.height) : AI_COACH_RUN.map.height,
  docked: { x: 43, y: docked?.y ?? 165, width: 874 },
  full: docked ? fitFull(d(docked.height)) : undefined,
  ...m,
});

const ALL_DONE: AgentName[] = [
  'Planner',
  'Scout',
  'Insights',
  'Strategist',
  'Writer',
  'Designer',
  'Community',
  'Publisher',
];

const FORK_ACTION = {
  description: 'Try another direction. The original path stays as it is.',
};

const KIND: Record<MapNode['kind'], [string, string | null]> = {
  task: ['Task', null],
  action: ['Action', actionGlyph],
  decision: ['Decision', decisionGlyph],
  output: ['Output', outputGlyph],
};

// Inspectors for a fork lane's steps: on that branch, in its colour.
const laneInspectors = (
  nodes: MapNode[],
  branch: string,
  fork: ForkNumber
): Record<string, InspectorData> =>
  Object.fromEntries(
    nodes
      .filter((n) => n.fork === fork)
      .map((n) => {
        const working = n.state === 'working';
        return [
          n.id,
          {
            eyebrow: KIND[n.kind][0],
            kindIcon: KIND[n.kind][1],
            branch,
            branchFork: fork,
            title: n.title,
            meta: [n.agent, `on ${branch}`, n.status?.text]
              .filter(Boolean)
              .join(' · '),
            preview: n.preview && {
              eyebrow: `${n.agent ?? 'Helper'} is writing`,
              quote: n.preview.text,
              working,
              action: null,
            },
            fork: {
              description: `Try another direction from this step. ${branch} stays as it is.`,
            },
            rerun: {
              description: working
                ? `Running now. You can rerun again once ${n.agent} finishes.`
                : 'Available once this step has run.',
              disabled: true,
            },
            fields: n.status ? [{ label: 'Status', value: n.status.text }] : [],
          } satisfies InspectorData,
        ];
      })
  );

// ── 4.4 Fork · from a decision ───────────────────────────────────────────────────────────────────────────────
// The run has finished; the Strategist's audience call is open in the inspector with its Fork card. Everything
// after the decision would rerun on the new branch ("Will rerun").

const DONE_COPY =
  'Penny gives tips. AI Coach knows your actual budget. Live Mar 12.';

const finishedNodes = (willRerun: boolean) => {
  const rerun: Partial<MapNode> = willRerun
    ? { state: 'will-rerun', flag: { label: 'Will rerun', tone: 'blue' } }
    : { state: 'done' };
  return original({
    decision: {
      flag: { label: 'Updated', tone: 'blue', clip: d(10.09) },
      status: { text: 'Decided: existing budgeters, vs Penny' },
    },
    writer: {
      ...rerun,
      ...(willRerun ? LARGE_TILE : LARGE_MARK),
      preview: { label: 'X post', text: DONE_COPY },
      status: { text: 'Done · 5 pieces' },
      avatar: undefined,
    },
    designer: {
      ...rerun,
      ...LARGE_MARK,
      status: { text: 'Done · 3 images' },
      avatar: undefined,
    },
    discord: {
      ...rerun,
      ...LARGE_TILE,
      status: { text: 'Done' },
      avatar: undefined,
    },
    schedule: { ...rerun, ...LARGE_TILE },
  });
};

const DECISION_FIELDS = [
  { label: 'Why', value: '61% of the waitlist already budgets every month.' },
  {
    label: 'Assumption',
    value: 'People who already budget will try a coach first.',
  },
];

const FIRST_TIMERS_TEXT =
  'Lead with first-time budgeters. Most of our new signups have never budgeted.';

const DECISION_INSPECTOR: InspectorData = {
  eyebrow: 'Decision',
  kindIcon: decisionGlyph,
  branch: 'Original path',
  title: 'Who is this launch for?',
  meta: "Strategist · wasn't sure, it asked you",
  preview: {
    eyebrow: 'Strategist decided',
    quote: 'People who already budget',
    action: null,
  },
  forkForm: {
    title: 'Fork from here',
    original: 'People who already budget',
    options: [
      { label: 'First-time budgeters', text: FIRST_TIMERS_TEXT },
      {
        label: 'Couples budgeting together',
        text: 'Lead with couples who budget together: one shared plan, two people on it.',
      },
      {
        label: 'Students',
        text: 'Lead with students: a first budget for a first paycheck.',
      },
    ],
    note: 'Earlier steps are reused. 4 helpers work on a new branch · about 1 min. The original path stays as it is.',
    helpers: ['Writer', 'Designer', 'Community', 'Publisher'],
  },
  fork: FORK_ACTION,
  rerun: null,
  fields: DECISION_FIELDS,
  footer: false,
};

const FINISHED_TASKS: TaskItem[] = [
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
  { id: 'task', title: 'Your launch', state: 'done' },
  { id: 'plan', title: 'Launch plan', state: 'done' },
  { id: 'scout', title: 'Competitor scan', state: 'done' },
  { id: 'insights', title: 'Waitlist survey', state: 'done' },
  { id: 'decision', title: 'Who is this launch for?', state: 'done' },
  { id: 'writer', title: 'Launch copy', state: 'done' },
  { id: 'designer', title: 'Visuals', state: 'done' },
  { id: 'discord', title: 'Discord post', state: 'done' },
];

export const FORK_DECISION_RUN: RunData = {
  ...AI_COACH_RUN,
  map: forkMap({ nodes: finishedNodes(true), edges: passedEdges }),
  completed: ALL_DONE,
  tasks: FINISHED_TASKS,
  tasksSummary: '8 of 10 done · waits for your OK',
  inspectors: { decision: DECISION_INSPECTOR },
};

// ── 4.5 Fork running · from a decision ───────────────────────────────────────────────────────────────────────
// "First-timers" (Fork 1) runs in its own lane under the original path: Writer and Designer redo their outputs for
// first-time budgeters, Community and Publisher wait for them.

const FIRST_TIMERS_LANE: MapNode[] = [
  laneNode({
    id: 'writer-f1',
    x: 446,
    y: 420,
    width: FORK_W,
    kind: 'output',
    agent: 'Writer',
    title: 'Launch copy',
    state: 'working',
    fork: 1,
    selected: true,
    preview: {
      label: 'X post',
      text: 'Never budgeted? AI Coach sets up your first budget with you. Live Mar 12.',
    },
    status: { text: 'Writing 1 of 5 pieces', tone: 'live' },
    avatar: { agent: 'Writer', state: 'working' },
  }),
  laneNode({
    id: 'designer-f1',
    x: 446,
    y: 560,
    width: FORK_W,
    kind: 'output',
    agent: 'Designer',
    title: 'Visuals',
    state: 'working',
    fork: 1,
    ...LARGE_MARK,
    preview: {
      label: 'Social image',
      text: '[ image: phone with AI Coach chat ]',
    },
    status: { text: 'Making image 1 of 3', tone: 'live' },
    avatar: { agent: 'Designer', state: 'working' },
  }),
  laneNode({
    id: 'discord-f1',
    x: 603.725,
    y: 420,
    fork: 1,
    kind: 'action',
    agent: 'Community',
    title: 'Discord post',
    asksYouFirst: true,
    status: { text: 'Waits for Writer' },
  }),
  laneNode({
    id: 'schedule-f1',
    x: 603.725,
    y: 560,
    fork: 1,
    kind: 'action',
    agent: 'Publisher',
    title: 'Schedule launch',
    asksYouFirst: true,
    status: { text: 'Waits for Writer' },
  }),
  laneNode({
    id: 'ready-f1',
    x: 754.725,
    y: 490,
    fork: 1,
    kind: 'output',
    title: 'Ready to post',
    state: 'waiting',
    status: { text: 'Waits for your OK' },
  }),
];

const FIRST_TIMERS_EDGES: MapEdge[] = [
  laneEdge('writer-f1', 'discord-f1', { markerDx: 15.733 }),
  laneEdge('designer-f1', 'schedule-f1', { markerDx: 15.733 }),
  laneEdge('discord-f1', 'ready-f1', {
    lane: 739,
    radius: 0,
    markerDx: 10.033,
  }),
  laneEdge('schedule-f1', 'ready-f1', {
    lane: 739,
    radius: 0,
    markerDx: 10.033,
  }),
];

const FIRST_TIMERS_FIELDS = DECISION_FIELDS;

export const FORK_DECISION_RUNNING_RUN: RunData = {
  ...FORK_DECISION_RUN,
  map: forkMap(
    {
      nodes: [...finishedNodes(false), ...FIRST_TIMERS_LANE],
      edges: [...passedEdges, ...FIRST_TIMERS_EDGES],
      forkLines: [
        { fork: 1, ...DECISION_STUB, to: ['writer-f1', 'designer-f1'] },
      ],
      overlays: forkMarks(
        1,
        { x: 383.637, y: 329.937, label: 'First-timers' },
        { x: 438, y: 401, label: 'First-timers · running' }
      ),
    },
    { y: 64, height: 694 }
  ),
  tasks: [
    { id: 'writer-f1', title: 'Launch copy', state: 'running' },
    { id: 'designer-f1', title: 'Visuals', state: 'running' },
    { id: 'discord-f1', title: 'Discord post', state: 'waiting' },
    { id: 'schedule-f1', title: 'Schedule launch', state: 'waiting' },
  ],
  tasksSummary: 'First-timers · 0 of 4 done · about 1 min left',
  tasksChip: {
    label: 'First-timers · 0 of 4 done',
    progress: 0,
    width: 279,
    fork: 1,
  },
  inspectors: {
    ...laneInspectors(FIRST_TIMERS_LANE, 'First-timers', 1),
    decision: {
      ...DECISION_INSPECTOR,
      branch: 'First-timers',
      branchFork: 1,
      meta: 'Strategist · First-timers picked first-time budgeters',
      brief: {
        eyebrow: 'First-timers brief',
        quote: `“${FIRST_TIMERS_TEXT}”`,
        fork: 1,
      },
      forkForm: undefined,
      fork: null,
      fields: FIRST_TIMERS_FIELDS,
    },
  },
};

// ── 6.4 Fork from here ───────────────────────────────────────────────────────────────────────────────────────
// Mid-run, Launch copy is open in the inspector with its Fork card ("Compare to Penny"). Branches on the canvas
// shows the new fork's slot in Fork 1's colour.

const WRITER = AI_COACH_INSPECTOR.writer;

const WRITER_INSPECTOR: InspectorData = {
  ...WRITER,
  meta: 'Writer · Done · 5 pieces',
  preview: { ...WRITER.preview!, action: 'See all 5 pieces' },
  forkForm: { title: 'Fork from here' },
  rerun: {
    description: 'Run this step again. Earlier steps stay as they are.',
  },
};

const RUN_TASKS_5: TaskItem[] = [
  { id: 'designer', title: 'Visuals', state: 'running' },
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'discord', title: 'Discord post', state: 'waiting' },
  { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
  { id: 'task', title: 'Your launch', state: 'running' },
  { id: 'plan', title: 'Launch plan', state: 'done' },
  { id: 'scout', title: 'Competitor scan', state: 'done' },
  { id: 'insights', title: 'Waitlist survey', state: 'done' },
  { id: 'decision', title: 'Who is this launch for?', state: 'done' },
  { id: 'writer', title: 'Launch copy', state: 'done' },
];

export const FORK_FROM_STEP_RUN: RunData = {
  ...AI_COACH_RUN,
  map: forkMap({
    nodes: original({
      writer: {
        y: d(12.615),
        state: 'default',
        selected: true,
        ...LARGE_TILE,
        flag: { label: 'Will rerun', tone: 'blue' },
        status: { text: 'Done · 5 pieces' },
      },
      designer: LARGE_MARK,
      discord: {
        state: 'will-rerun',
        ...LARGE_TILE,
        flag: { label: 'Will rerun', tone: 'blue' },
        status: { text: 'Done' },
      },
      schedule: {
        state: 'will-rerun',
        ...LARGE_TILE,
        flag: { label: 'Will rerun', tone: 'blue' },
        status: { text: 'Done' },
      },
    }),
    edges: AI_COACH_EDGES,
  }),
  tasks: RUN_TASKS_5,
  tasksSummary: '5 of 10 done · about 3 min left',
  inspectors: { writer: WRITER_INSPECTOR },
};

// ── 6.5 Fork running ─────────────────────────────────────────────────────────────────────────────────────────
// "Vs Penny" (Fork 1) runs under the original: a new Launch copy, then Community and Publisher wait for it.

const VS_PENNY_ORIGINAL = original({
  designer: LARGE_MARK,
  writer: {
    x: d(446),
    y: d(13),
    width: FORK_W,
    state: 'done',
    status: { text: 'Done · 5 pieces' },
    avatar: undefined,
  },
  discord: { x: d(603.725), y: d(25), strokeWidth: d(1) },
  schedule: {
    x: d(603.725),
    y: d(239),
    strokeWidth: d(1),
    status: { text: 'Waits for Designer' },
  },
});

const vsPennyLane = (selected: boolean): MapNode[] => [
  laneNode({
    id: 'writer-f1',
    x: 446,
    y: 392,
    width: FORK_W,
    kind: 'output',
    agent: 'Writer',
    title: 'Launch copy',
    state: 'working',
    fork: 1,
    selected,
    preview: {
      label: 'X post',
      text: 'Penny gives tips. We know your actual budget. Live Mar 12.',
    },
    status: { text: 'Writing 1 of 5 pieces', tone: 'live' },
    avatar: { agent: 'Writer', state: 'working' },
  }),
  laneNode({
    id: 'discord-f1',
    x: 603.725,
    y: 392,
    fork: 1,
    kind: 'action',
    agent: 'Community',
    title: 'Discord post',
    asksYouFirst: true,
    status: { text: 'Waits for Writer' },
  }),
  laneNode({
    id: 'schedule-f1',
    x: 603.725,
    y: 482,
    fork: 1,
    kind: 'action',
    agent: 'Publisher',
    title: 'Schedule launch',
    asksYouFirst: true,
    status: { text: 'Waits for Writer' },
  }),
  laneNode({
    id: 'ready-f1',
    x: 754.725,
    y: 437,
    fork: 1,
    kind: 'output',
    title: 'Ready to post',
    state: 'waiting',
    status: { text: 'Waits for your OK' },
  }),
];

const vsPennyEdges = (markerDx: number, readyMarkerDx: number): MapEdge[] => [
  laneEdge('writer-f1', 'discord-f1', { markerDx }),
  laneEdge('writer-f1', 'schedule-f1', { lane: 587, radius: 6 }),
  laneEdge('discord-f1', 'ready-f1', {
    lane: 739,
    radius: 0,
    markerDx: readyMarkerDx,
  }),
  laneEdge('schedule-f1', 'ready-f1', {
    lane: 739,
    radius: 0,
    markerDx: readyMarkerDx,
  }),
];

const VS_PENNY_MARKS = forkMarks(
  1,
  { x: 388.637, y: 331.937, label: 'Vs Penny' },
  { x: 438, y: 373, label: 'Vs Penny · running' }
);

const VS_PENNY_WRITER: InspectorData = {
  ...WRITER,
  branch: 'Vs Penny',
  branchFork: 1,
  meta: 'Writer · Working on Vs Penny · 1 of 5',
  preview: {
    eyebrow: 'Vs Penny brief',
    quote:
      '“Compare us to Penny up front: they give tips, we know your budget.”',
    fork: 1,
    action: null,
  },
  fork: FORK_ACTION,
  rerun: {
    description: 'Running now. You can rerun again once Writer finishes.',
    disabled: true,
  },
};

const VS_PENNY_TASKS: TaskItem[] = [
  { id: 'writer-f1', title: 'Launch copy', state: 'running' },
  { id: 'discord-f1', title: 'Discord post', state: 'waiting' },
  { id: 'decision', title: 'Who is this launch for?', state: 'reused' },
];

export const FORK_RUNNING_RUN: RunData = {
  ...AI_COACH_RUN,
  map: forkMap(
    {
      nodes: [...VS_PENNY_ORIGINAL, ...vsPennyLane(true)],
      edges: [...AI_COACH_EDGES, ...vsPennyEdges(15.733, 10.033)],
      forkLines: [{ fork: 1, ...DECISION_STUB, to: ['writer-f1'] }],
      overlays: VS_PENNY_MARKS,
    },
    { y: 96, height: 592 }
  ),
  tasks: VS_PENNY_TASKS,
  tasksSummary: 'Vs Penny · 1 of 3 done · about 1 min left',
  tasksChip: {
    label: 'Vs Penny · 1 of 3 done',
    progress: 33,
    width: 263,
    fork: 1,
  },
  inspectors: {
    ...laneInspectors(vsPennyLane(true), 'Vs Penny', 1),
    writer: WRITER_INSPECTOR,
    'writer-f1': VS_PENNY_WRITER,
  },
};

// ── 6.6 Fork from a fork ─────────────────────────────────────────────────────────────────────────────────────
// "In #general" (Fork 2, teal) forks Vs Penny's Discord post: its lane hangs off Vs Penny's lane, and its line stays
// dashed grey until Vs Penny's Writer finishes.

const IN_GENERAL_LANE: MapNode[] = [
  laneNode({
    id: 'discord-f2',
    x: 603.725,
    y: 618.495,
    kind: 'action',
    agent: 'Community',
    title: 'Discord post',
    asksYouFirst: true,
    fork: 2,
    selected: true,
    status: { text: 'Waits for Writer' },
  }),
  laneNode({
    id: 'ready-f2',
    x: 754.725,
    y: 618.495,
    fork: 2,
    kind: 'output',
    title: 'Ready to post',
    state: 'waiting',
    status: { text: 'Waits for your OK' },
  }),
];

export const FORK_FROM_FORK_RUN: RunData = {
  ...FORK_RUNNING_RUN,
  map: forkMap(
    {
      nodes: [...VS_PENNY_ORIGINAL, ...vsPennyLane(false), ...IN_GENERAL_LANE],
      edges: [
        ...AI_COACH_EDGES,
        ...vsPennyEdges(16.333, 9.533),
        laneEdge('discord-f2', 'ready-f2', { markerDx: 9.533 }),
      ],
      forkLines: [
        { fork: 1, ...DECISION_STUB, to: ['writer-f1'] },
        {
          fork: 2,
          x: d(587),
          y: d(495),
          to: ['discord-f2'],
          status: 'pending',
        } satisfies ForkLine,
      ],
      overlays: [
        ...VS_PENNY_MARKS,
        ...forkMarks(
          2,
          { x: 553.5, y: 573.866, label: 'In #general' },
          { x: 602, y: 599.495, label: 'In #general · from Vs Penny' }
        ),
      ],
    },
    { y: 80, height: 701.733 }
  ),
  inspectors: {
    ...FORK_RUNNING_RUN.inspectors,
    ...laneInspectors(IN_GENERAL_LANE, 'In #general', 2),
    'discord-f2': {
      eyebrow: 'Action',
      kindIcon: actionGlyph,
      branch: 'In #general',
      branchFork: 2,
      title: 'Discord post',
      meta: 'Community · forked from Vs Penny · waits for Writer',
      preview: {
        eyebrow: 'In #general brief',
        quote: '“Post in #general too, so the whole community sees it.”',
        fork: 2,
        action: null,
      },
      fork: {
        description:
          'Try another direction from this step. In #general stays as it is.',
      },
      rerun: {
        description:
          'Waits for Writer on Vs Penny. You can rerun once it has run.',
        disabled: true,
      },
      fields: [
        {
          label: 'Why',
          value: 'You asked to reach the whole community, not just #launches.',
        },
        {
          label: 'Based on',
          value:
            "Vs Penny's copy, once Writer finishes. Everything before it is reused.",
        },
        {
          label: 'Impact',
          value: 'Ready to post gets a second Discord post to approve.',
        },
      ],
    },
  },
};

/** Fork-lane steps: forking one of them makes a fork from a fork (6.6). */
export const isForkLaneNode = (id: string) => /-f\d$/.test(id);
