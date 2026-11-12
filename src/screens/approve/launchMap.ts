import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksOverlay';
import {
  AI_COACH_EDGES,
  AI_COACH_MAP,
  AI_COACH_NODES,
  AI_COACH_RUN,
  AI_COACH_TASKS,
} from '@/screens/run/aiCoachMap';

// The AI Coach run map once every step has finished (5.1 "Approval" 2362:25514, 5.2 "Launch summary" 2362:25620):
// the 3.2 layout with every handoff passed. 5.1 waits on Publisher (hand raised, "6 items waiting"); 5.2 has
// posted everything. 5.1 draws this map at 0.68175 (its canvas is narrower with the panel docked).
export const LAUNCH_MAP = AI_COACH_MAP;
export const APPROVAL_MAP_SCALE = 119.442138671875 / 175.2;

type Overrides = Partial<MapNode>;

const DONE: Record<string, Overrides> = {
  decision: {
    flag: { label: 'Updated', tone: 'blue' },
    status: { text: 'Decided: existing budgeters, vs Penny' },
  },
  writer: {
    y: 18.619,
    state: 'default',
    flag: { label: 'Updated', tone: 'blue' },
    preview: {
      label: 'X post',
      text: 'Penny gives tips. AI Coach knows your actual budget. Live Mar 12.',
    },
    status: { text: 'Done · 5 pieces' },
    avatar: undefined,
  },
  designer: {
    state: 'waiting',
    status: { text: 'Done · 3 images' },
    avatar: undefined,
  },
  discord: { status: { text: 'Done' }, avatar: undefined },
};

export function launchNodes(phase: 'approval' | 'launched'): MapNode[] {
  return AI_COACH_NODES.map((n) => {
    const o: Overrides = { ...DONE[n.id] };
    if (n.id === 'schedule' && phase === 'approval')
      o.avatar = { agent: 'Publisher', state: 'hand-raised' };
    if (n.id === 'ready')
      Object.assign(
        o,
        phase === 'approval'
          ? {
              state: 'default',
              status: { text: '6 items waiting', tone: 'strong' },
            }
          : { state: 'waiting', status: { text: 'Posted' } }
      );
    return { ...n, ...o };
  });
}

export const LAUNCH_EDGES: MapEdge[] = AI_COACH_EDGES.map((e) => ({
  ...e,
  status: 'passed',
  marker: e.marker && { ...e.marker, status: 'passed' },
}));

export const APPROVAL_DONE: AgentName[] = [
  'Planner',
  'Scout',
  'Insights',
  'Strategist',
  'Writer',
  'Designer',
  'Community',
];
export const LAUNCHED_DONE: AgentName[] = [...APPROVAL_DONE, 'Publisher'];

// ---- The same finish as run data for the timeline (src/state/timeline.ts) --------------------------------------

const tasksAll = (states: Record<string, TaskItem['state']>): TaskItem[] =>
  AI_COACH_TASKS.map((t) => ({ ...t, state: states[t.id!] ?? 'done' }));

/** After the Writer's fix: Community and Publisher get their posts ready (no Figma frame). */
export const FINISHING_RUN: RunData = {
  ...AI_COACH_RUN,
  map: {
    ...AI_COACH_RUN.map,
    nodes: launchNodes('approval').map((n) =>
      n.id === 'discord'
        ? {
            ...n,
            state: 'working',
            status: { text: 'Drafting the post', tone: 'live' },
            avatar: { agent: 'Community', state: 'working' },
          }
        : n.id === 'schedule'
          ? {
              ...n,
              state: 'working',
              status: { text: 'Scheduling', tone: 'live' },
              avatar: { agent: 'Publisher', state: 'working' },
            }
          : n.id === 'ready'
            ? { ...n, state: 'waiting', status: { text: 'Waits for your OK' } }
            : n
    ),
    edges: LAUNCH_EDGES.map((e) =>
      e.to === 'ready'
        ? {
            ...e,
            status: 'pending',
            marker: e.marker && { ...e.marker, status: 'pending' },
          }
        : e
    ),
  },
  completed: ['Planner', 'Scout', 'Insights', 'Strategist', 'Writer', 'Designer'],
  tasks: tasksAll({
    task: 'running',
    discord: 'running',
    schedule: 'running',
    ready: 'approval',
  }),
};

/** 5.1: everything made, waiting for your OK. Figma counts 9 of 10 done and 7 agents. */
export const APPROVAL_RUN: RunData = {
  ...AI_COACH_RUN,
  map: { ...AI_COACH_RUN.map, nodes: launchNodes('approval'), edges: LAUNCH_EDGES },
  completed: APPROVAL_DONE,
  tasks: tasksAll({ schedule: 'approval', ready: 'approval' }),
};

/** 5.2: posted. */
export const LAUNCHED_RUN: RunData = {
  ...AI_COACH_RUN,
  map: { ...AI_COACH_RUN.map, nodes: launchNodes('launched'), edges: LAUNCH_EDGES },
  completed: LAUNCHED_DONE,
  tasks: tasksAll({}),
};

// ---- 5.1 approval items and 5.2 summary -----------------------------------------------------------------------

export type ApprovalItemData = {
  /** The "What goes out" output it posts. */
  id: string;
  title: string;
  when: string;
  body: string;
  /** The body when the copy doesn't lead with Penny (you moved the launch instead). */
  bodyWithoutPenny?: string;
  channelNote?: string;
  /** Figma's item height: its text boxes round each line up to whole pixels. */
  minH: string;
  /** The helper that posts it (removing that helper drops the item). */
  owner: string;
  /** 5.2 "What went out" label and status once approved. */
  summary: { label: string; status: string };
};

export const APPROVAL_ITEMS: ApprovalItemData[] = [
  {
    id: 'ph',
    title: 'Product Hunt page',
    when: 'Mar 12 · 12:01am PT',
    body: 'Lumen AI Coach: the budgeting coach for people who already budget',
    minH: 'min-h-[130px]',
    owner: 'publisher',
    summary: { label: 'Product Hunt page', status: 'Posted' },
  },
  {
    id: 'x',
    title: 'X post',
    when: 'Mar 12 · 9am',
    body: 'Penny gives tips. AI Coach knows your actual budget. Live Mar 12.',
    bodyWithoutPenny:
      'Your money finally has a coach. AI Coach is live Mar 12.',
    minH: 'min-h-[130px]',
    owner: 'publisher',
    summary: { label: 'X post', status: 'Posted' },
  },
  {
    id: 'li',
    title: 'LinkedIn post',
    when: 'Mar 12 · 9am',
    body: 'We built AI Coach for people who already budget and want someone in their corner.',
    minH: 'min-h-[130px]',
    owner: 'publisher',
    summary: { label: 'LinkedIn post', status: 'Posted' },
  },
  {
    id: 'discord',
    title: 'Discord post',
    when: 'Mar 12 · 11am',
    channelNote: 'Posts to your #launches channel',
    body: 'We made a budgeting coach for people who already budget. Feedback welcome',
    minH: 'min-h-[156px]',
    owner: 'community',
    summary: { label: 'Discord post', status: 'Posted' },
  },
  {
    id: 'email',
    title: 'Waitlist email · 2,800 people',
    when: 'Mar 12 · 9am',
    channelNote: 'Sent with Resend from hello@lumen.app',
    body: "Subject: You're in. Meet AI Coach",
    minH: 'min-h-[139px]',
    owner: 'publisher',
    summary: { label: 'Waitlist email', status: 'Sent to 2,800' },
  },
];

/** 5.2 as Figma draws it. */
export const LAUNCH_SUMMARY_LINE = 'AI Coach launch · Mar 12 · 22 min · $0.34';
export const LAUNCH_FIXED = [
  'Kept Mar 12 and mentioned Penny in the copy',
  'Changed the price in the copy from $15 to $12',
];
