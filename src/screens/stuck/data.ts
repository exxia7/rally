import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import type { HandRaiseData } from '@/components/run/HandRaisePanel';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksOverlay';
import { patchById } from '@/lib/patchById';
import {
  AI_COACH_EDGES,
  AI_COACH_NODES,
  AI_COACH_RUN,
} from '@/screens/run/aiCoachMap';

// Stuck (4.x): the AI Coach run when a helper raises its hand, and the rerun that follows. Every variant starts from
// the 3.2 run map (AI_COACH_RUN) and patches node states, edges and the side panel.

// While a hand is raised Figma fades the rest of the map with layer opacity: finished steps 0.45, the outputs that
// wait on the stuck step 0.62 (over their own Waiting fade), "Ready to post" 0.9.
const FADED = 0.45;
// Some docked instances keep the kind tile's unscaled mark (and radius): see NodeCard `tile`.
const BIG_MARK = { glyph: 15.732 };
const BIG_TILE = { glyph: 15.732, radius: 7.261 };
const edgeKey = (e: MapEdge) => `${e.from}>${e.to}`;

// Every connector dimmed, one blocked (red) where the handoff went wrong.
function blockedEdges(blocked: string): MapEdge[] {
  return AI_COACH_EDGES.map((e) =>
    edgeKey(e) === blocked
      ? {
          ...e,
          status: 'blocked',
          dimmed: true,
          marker: e.marker && { status: 'blocked', dx: e.marker.dx },
        }
      : {
          ...e,
          dimmed: true,
          marker: e.marker && { ...e.marker, dimmed: true },
        }
  );
}

// ---- 4.1 Hand raised · 2 things to fix (2362:27564) ----------------------------------------------------------

const WAITING_ON_STRATEGIST = "Waiting for Strategist's card";

export const HAND_RAISED_NODES: MapNode[] = patchById(AI_COACH_NODES, {
  task: { opacity: FADED },
  plan: { opacity: FADED },
  scout: { opacity: FADED },
  insights: { opacity: FADED },
  decision: {
    state: 'needs-you',
    flag: null,
    status: { text: 'Hand raised · Missing 2 things', tone: 'problem' },
    showRerun: true,
    padY: 5.868,
    avatar: { agent: 'Strategist', state: 'hand-raised' },
  },
  writer: {
    state: 'waiting',
    opacity: 0.62,
    status: { text: WAITING_ON_STRATEGIST },
    avatar: { agent: 'Writer', state: 'waiting' },
    tile: BIG_MARK,
  },
  designer: {
    state: 'waiting',
    opacity: 0.62,
    status: { text: WAITING_ON_STRATEGIST },
    avatar: { agent: 'Designer', state: 'waiting' },
    tile: BIG_TILE,
  },
  discord: {
    opacity: FADED,
    avatar: { agent: 'Community', state: 'waiting' },
  },
  schedule: { opacity: FADED },
  ready: { opacity: 0.9 },
});

export const HAND_RAISED_TASKS: TaskItem[] = [
  { id: 'decision', title: 'Who is this launch for?', state: 'approval' },
  { id: 'task', title: 'Your launch', state: 'running' },
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'writer', title: 'Launch copy', state: 'waiting' },
  { id: 'designer', title: 'Visuals', state: 'waiting' },
  { id: 'discord', title: 'Discord post', state: 'waiting' },
  { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
  { id: 'plan', title: 'Launch plan', state: 'done' },
  { id: 'scout', title: 'Competitor scan', state: 'done' },
  { id: 'insights', title: 'Waitlist survey', state: 'done' },
];

// The hand-raise panel (2362:27655): two things to fix, one at a time. Step 2 has no Figma frame.
export const HAND_RAISE_MISSING: HandRaiseData = {
  eyebrow: 'Strategist raised its hand',
  title: 'Scout’s handoff is missing 2 things',
  meta: 'Strategist can’t pick the message without them. Fix them one at a time; nothing reruns until both are done.',
  confirmLabel: 'Rerun Strategist',
  steps: [
    {
      label: 'Competitor dates',
      problem: {
        kind: 'Missing',
        context: '· Didn’t reach Strategist',
        title:
          'Penny launches its own AI coach on Mar 12, the same day as you.',
        detail:
          'Scout found this but didn’t pass it on. Source: penny.app/blog',
        height: 184,
      },
      options: [
        {
          title: 'Keep Mar 12 and mention Penny in the copy',
          description: '3 helpers redo their work · about 40 sec · ~6k tokens',
        },
        {
          title: 'Move the launch to Mar 14',
          description: '7 helpers redo their work · about 2 min · ~41k tokens',
        },
      ],
    },
    {
      label: 'Competitor pricing',
      problem: {
        kind: 'Missing',
        context: '· Didn’t reach Strategist',
        title: 'Penny’s coach is free. AI Coach is $12/mo.',
        detail:
          'Scout compared prices but left them out of the handoff. Source: penny.app/pricing',
        height: 184,
      },
      options: [
        {
          title: 'Say what you get for $12/mo',
          description: '2 helpers redo their work · about 30 sec · ~4k tokens',
        },
        {
          title: 'Leave pricing out of the launch',
          description: '1 helper redoes its work · about 10 sec · ~2k tokens',
        },
      ],
    },
  ],
};

export const HAND_RAISED_RUN: RunData = {
  ...AI_COACH_RUN,
  map: {
    ...AI_COACH_RUN.map,
    nodes: HAND_RAISED_NODES,
    edges: blockedEdges('scout>decision'),
  },
  completed: ['Planner', 'Scout', 'Insights', 'Publisher'],
  tasks: HAND_RAISED_TASKS,
  tasksSummary: '3 of 10 done · waiting on you',
  handRaise: HAND_RAISE_MISSING,
};

// 4.1b (2362:27019) draws the same panel with the problem card's context in the component's muted grey.
export const HAND_RAISED_RUN_CONFIRM: RunData = {
  ...HAND_RAISED_RUN,
  handRaise: {
    ...HAND_RAISE_MISSING,
    steps: HAND_RAISE_MISSING.steps.map((s) => ({
      ...s,
      problem: { ...s.problem, contextTone: 'muted' },
    })),
  },
};

// ---- 4.2 Rerun (2362:25201) and 4.2-tasks (2362:27165) -------------------------------------------------------

export const RERUN_NODES: MapNode[] = patchById(AI_COACH_NODES, {
  plan: { status: { text: 'Reused' } },
  scout: { status: { text: 'Reused' } },
  insights: { status: { text: 'Reused' } },
  decision: {
    y: 199.1016,
    state: 'working',
    flag: null,
    note: 'Adding: how we differ from Penny',
    status: { text: 'Redoing · 1 of 3', tone: 'live' },
    avatar: {
      agent: 'Strategist',
      state: 'working',
      at: { x: 562.983, y: 169.552, size: 38.882 },
    },
  },
  writer: {
    state: 'waiting',
    status: { text: 'Waits for new card' },
    avatar: { agent: 'Writer', state: 'idle' },
  },
  designer: { state: 'waiting', status: { text: 'Reused' }, avatar: null },
  discord: { status: { text: 'Waiting for new copy' } },
  schedule: { status: { text: 'Reused' } },
});

// The decision's outgoing lines wait again while Strategist redoes its card.
export const RERUN_EDGES: MapEdge[] = AI_COACH_EDGES.map((e) =>
  e.from === 'decision'
    ? {
        ...e,
        status: 'pending',
        marker: e.marker && { ...e.marker, status: 'pending' },
      }
    : e
);

// 4.2-tasks overlay (2362:27255).
export const RERUN_TASKS: TaskItem[] = [
  { id: 'decision', title: 'Who is this launch for?', state: 'running' },
  { id: 'task', title: 'Your launch', state: 'running' },
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'writer', title: 'Launch copy', state: 'waiting' },
  { id: 'discord', title: 'Discord post', state: 'waiting' },
  { id: 'plan', title: 'Launch plan', state: 'reused' },
  { id: 'scout', title: 'Competitor scan', state: 'reused' },
  { id: 'insights', title: 'Waitlist survey', state: 'reused' },
  { id: 'designer', title: 'Visuals', state: 'reused' },
  { id: 'schedule', title: 'Schedule launch', state: 'reused' },
];

export const RERUN_RUN: RunData = {
  ...AI_COACH_RUN,
  map: { ...AI_COACH_RUN.map, nodes: RERUN_NODES, edges: RERUN_EDGES },
  completed: ['Planner', 'Scout', 'Insights', 'Designer', 'Publisher'],
  tasks: RERUN_TASKS,
  tasksSummary: 'Only affected work is redone · about 40 sec',
  tasksChip: { label: 'Rerunning', progress: null },
  tasksOverlay: { showClose: true, showProgress: false },
};

// ---- 4.3 Price mismatch (2362:25290) --------------------------------------------------------------------------

export const PRICE_MISMATCH_NODES: MapNode[] = patchById(RERUN_NODES, {
  task: { opacity: FADED },
  plan: { opacity: FADED },
  scout: { opacity: FADED },
  insights: { opacity: FADED },
  decision: {
    opacity: FADED,
    state: 'default',
    note: null,
    flag: { label: 'Updated', tone: 'blue' },
    status: { text: 'Decided: existing budgeters, vs Penny' },
    avatar: null,
  },
  writer: {
    state: 'needs-you',
    status: { text: 'Hand raised · Price mismatch', tone: 'problem' },
    showRerun: true,
    avatar: { agent: 'Writer', state: 'hand-raised' },
    tile: BIG_TILE,
  },
  designer: { opacity: 0.62, tile: BIG_TILE },
  discord: {
    opacity: FADED,
    avatar: { agent: 'Community', state: 'waiting' },
  },
  schedule: { opacity: FADED },
  ready: { opacity: 0.9 },
});

export const HAND_RAISE_PRICE: HandRaiseData = {
  eyebrow: 'Writer raised its hand',
  title: 'The price on Writer’s handoff is wrong',
  meta: 'Writer can’t finish the copy until the price is right. Pick one; nothing reruns until you confirm.',
  confirmLabel: 'Confirm',
  steps: [
    {
      label: 'Price',
      problem: {
        kind: 'Mismatch',
        context: '· Doesn’t match your launch facts',
        title: 'The handoff says $15/mo. Your launch facts say $12/mo.',
        detail: 'The price was edited after it left Strategist.',
        actionTop: 12,
        height: 167,
      },
      options: [
        {
          title: 'Use $12/mo from your launch facts',
          description: '1 helper redoes its work · about 10 sec · ~2k tokens',
        },
        {
          title: 'Change the launch fact to $15/mo',
          description: '3 helpers redo their work · about 40 sec · ~6k tokens',
        },
      ],
    },
  ],
};

export const PRICE_MISMATCH_RUN: RunData = {
  ...AI_COACH_RUN,
  map: {
    ...AI_COACH_RUN.map,
    nodes: PRICE_MISMATCH_NODES,
    edges: blockedEdges('decision>writer'),
  },
  completed: [
    'Planner',
    'Scout',
    'Insights',
    'Strategist',
    'Designer',
    'Publisher',
  ],
  tasks: [
    { id: 'writer', title: 'Launch copy', state: 'approval' },
    { id: 'task', title: 'Your launch', state: 'running' },
    { id: 'ready', title: 'Ready to post', state: 'approval' },
    { id: 'discord', title: 'Discord post', state: 'waiting' },
    { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
    { id: 'plan', title: 'Launch plan', state: 'done' },
    { id: 'scout', title: 'Competitor scan', state: 'done' },
    { id: 'insights', title: 'Waitlist survey', state: 'done' },
    { id: 'decision', title: 'Who is this launch for?', state: 'done' },
    { id: 'designer', title: 'Visuals', state: 'done' },
  ],
  tasksSummary: '5 of 10 done · waiting on you',
  handRaise: HAND_RAISE_PRICE,
};

// ---- What each hand-raise choice does (the live store applies these; see src/state/runView.ts) ----------------

/** One option's consequences: the steps it redoes, the line it adds to 5.2 "What you fixed", and what changes. */
export type FixEffect = {
  /** Run-map steps that redo their work (the helper count in the option's description comes from these). */
  affects: string[];
  fixed: string;
  /** The Strategist's note while it redoes its card (4.2). */
  note?: string;
  /** The Strategist's decision once it's redone. */
  decided?: string;
  /** Launch facts the choice changes. */
  facts?: { date?: string; price?: string };
  /** The copy still mentions Penny (the X post leads with it). */
  mentionsPenny?: boolean;
};

/** Per hand raise, per step, per option: lines up with HAND_RAISE_MISSING / HAND_RAISE_PRICE. */
export const FIX_EFFECTS: Record<'missing' | 'price', FixEffect[][]> = {
  missing: [
    [
      {
        affects: ['decision', 'writer', 'discord'],
        fixed: 'Kept Mar 12 and mentioned Penny in the copy',
        note: 'Adding: how we differ from Penny',
        decided: 'Decided: existing budgeters, vs Penny',
        mentionsPenny: true,
      },
      {
        affects: [
          'plan',
          'scout',
          'decision',
          'writer',
          'designer',
          'discord',
          'schedule',
        ],
        fixed: 'Moved the launch to Mar 14, after Penny',
        note: 'Moving the launch to Mar 14',
        decided: 'Decided: existing budgeters, Mar 14',
        facts: { date: 'Mar 14' },
      },
    ],
    [
      {
        affects: ['decision', 'writer'],
        fixed: 'Said what you get for $12/mo',
      },
      { affects: ['decision'], fixed: 'Left pricing out of the launch' },
    ],
  ],
  price: [
    [
      {
        affects: ['writer'],
        fixed: 'Changed the price in the copy from $15 to $12',
      },
      {
        affects: ['writer', 'discord', 'schedule'],
        fixed: 'Changed the launch fact to $15/mo',
        facts: { price: '$15/mo' },
      },
    ],
  ],
};

/** 4.1b "Rerun confirm" as Figma lists it (agent, step). The live list comes from the chosen fixes (runView). */
export const RERUN_CONFIRM_DRAWN: [AgentName, string][] = [
  ['Writer', 'Launch copy'],
  ['Designer', 'Visuals'],
  ['Community', 'Discord post'],
  ['Publisher', 'Schedule launch'],
];
