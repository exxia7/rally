import nodeKindOutputGlyph from '@/assets/icons/node-kind-output-glyph.svg';
import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import type { Decision } from '@/components/panels/DecisionLog';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { RunChatMessage } from '@/components/run/RunSidePanel';
import type { SandboxSection } from '@/components/run/SandboxPanel';
import type { TaskItem } from '@/components/run/TasksDropdown';

// The AI Coach launch run map as Figma draws it in 3.2 "Running" (FlowMap frame 2362:24759, 1282×581
// placed at 45,83 on the 1362×830 canvas). Other run/rerun/fork frames start from these and override
// node states, edges and overlays.
export const AI_COACH_MAP = { x: 45, y: 83, width: 1282, height: 581.05 };

// With the side panel docked (3.3–3.5) the canvas is 954px wide and Figma redraws the same map 874px wide at 43,165.
export const AI_COACH_DOCKED = { x: 43, y: 165, width: 874 };

export const AI_COACH_NODES: MapNode[] = [
  {
    id: 'task',
    x: -18.427,
    y: 208.21,
    kind: 'task',
    title: 'Your launch',
    lead: 'Launch AI Coach to 2,800 waitlist signups',
    status: { text: 'From your chat' },
  },
  {
    id: 'plan',
    x: 193.702,
    y: 36.662,
    kind: 'action',
    agent: 'Planner',
    title: 'Launch plan',
    status: { text: 'Timeline and $300 budget' },
  },
  {
    id: 'scout',
    x: 193.702,
    y: 208.21,
    kind: 'action',
    agent: 'Scout',
    title: 'Competitor scan',
    status: { text: '6 apps compared' },
  },
  {
    id: 'insights',
    x: 193.702,
    y: 379.758,
    kind: 'action',
    agent: 'Insights',
    title: 'Waitlist survey',
    status: { text: '61% want coaching' },
  },
  {
    id: 'decision',
    x: 419.666,
    y: 198.987,
    kind: 'decision',
    agent: 'Strategist',
    title: 'Who is this launch for?',
    flag: { label: 'Not sure' },
    status: { text: 'Decided: existing budgeters' },
  },
  {
    id: 'writer',
    x: 654.834,
    y: 18.504,
    width: 175.237,
    portDy: 20.233,
    kind: 'output',
    agent: 'Writer',
    title: 'Launch copy',
    state: 'working',
    preview: {
      label: 'X post',
      text: 'Your money finally has a coach. AI Coach is live for waitlist members.',
    },
    status: { text: 'Writing 3 of 5 pieces', tone: 'live' },
    avatar: { agent: 'Writer', state: 'working' },
  },
  {
    id: 'designer',
    x: 654.834,
    y: 332.029,
    width: 175.237,
    portDy: 20.29,
    kind: 'output',
    agent: 'Designer',
    title: 'Visuals',
    state: 'working',
    preview: {
      label: 'Social image',
      text: '[ image: phone with AI Coach chat ]',
    },
    status: { text: 'Making image 1 of 3', tone: 'live' },
    avatar: { agent: 'Designer', state: 'working' },
  },
  {
    id: 'discord',
    x: 885.428,
    y: 36.661,
    kind: 'action',
    agent: 'Community',
    title: 'Discord post',
    asksYouFirst: true,
    status: { text: 'Waits for Writer' },
    avatar: { agent: 'Community', state: 'idle' },
  },
  {
    id: 'schedule',
    x: 885.428,
    y: 350.244,
    kind: 'action',
    agent: 'Publisher',
    title: 'Schedule launch',
    asksYouFirst: true,
    status: { text: 'Mar 12, 9am' },
  },
  {
    id: 'ready',
    x: 1106.781,
    y: 198.987,
    kind: 'output',
    title: 'Ready to post',
    state: 'waiting',
    status: { text: 'Waits for your OK' },
  },
];

const RESEARCH_LANE = 405.813;
const DECISION_LANE = 636.389;

export const AI_COACH_EDGES: MapEdge[] = [
  { from: 'task', to: 'plan', status: 'passed' },
  { from: 'task', to: 'scout', status: 'passed' },
  { from: 'task', to: 'insights', status: 'passed' },
  {
    from: 'plan',
    to: 'decision',
    status: 'passed',
    lane: RESEARCH_LANE,
    marker: { status: 'passed', dx: 13.861 },
  },
  {
    from: 'scout',
    to: 'decision',
    status: 'passed',
    lane: RESEARCH_LANE,
    marker: { status: 'passed', dx: 13.861 },
  },
  {
    from: 'insights',
    to: 'decision',
    status: 'passed',
    lane: RESEARCH_LANE,
    marker: { status: 'passed', dx: 13.861 },
  },
  {
    from: 'decision',
    to: 'writer',
    status: 'passed',
    lane: DECISION_LANE,
    marker: { status: 'passed', dx: 18.464 },
  },
  { from: 'decision', to: 'designer', status: 'passed', lane: DECISION_LANE },
  {
    from: 'writer',
    to: 'discord',
    status: 'pending',
    marker: { status: 'pending', dx: 23.057 },
  },
  { from: 'writer', to: 'schedule', status: 'pending' },
  {
    from: 'designer',
    to: 'schedule',
    status: 'pending',
    marker: { status: 'pending', dx: 23.057 },
  },
  {
    from: 'discord',
    to: 'ready',
    status: 'pending',
    marker: { status: 'pending', dx: 13.854 },
  },
  {
    from: 'schedule',
    to: 'ready',
    status: 'pending',
    marker: { status: 'pending', dx: 13.854 },
  },
];

export const AI_COACH_DONE: AgentName[] = [
  'Planner',
  'Scout',
  'Insights',
  'Strategist',
  'Publisher',
];

// The anchored Tasks overlay (3.2-tasks, 2362:26565).
export const AI_COACH_TASKS: TaskItem[] = [
  { id: 'writer', title: 'Launch copy', state: 'running' },
  { id: 'designer', title: 'Visuals', state: 'running' },
  { id: 'task', title: 'Your launch', state: 'running' },
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'discord', title: 'Discord post', state: 'waiting' },
  { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
  { id: 'plan', title: 'Launch plan', state: 'done' },
  { id: 'scout', title: 'Competitor scan', state: 'done' },
  { id: 'insights', title: 'Waitlist survey', state: 'done' },
  { id: 'decision', title: 'Who is this launch for?', state: 'done' },
];
export const AI_COACH_TASKS_SUMMARY = '4 of 10 done · about 4 min left';

// Sandbox tab (3.3, 2362:24921). Assets opens with 4 of 7 rows.
export const AI_COACH_SANDBOX: SandboxSection[] = [
  {
    id: 'assets',
    title: 'Assets',
    open: true,
    visible: 4,
    items: [
      { name: 'Brand guide.pdf', source: 'Writer, Designer' },
      { name: 'Logo.svg', source: 'Designer' },
      { name: 'lumen.app', source: 'Planner, Writer' },
      { name: 'Press kit.zip', source: 'New · not used yet' },
      { name: 'Waitlist export.csv', source: 'Insights' },
      { name: 'App screenshots.zip', source: 'Designer' },
      { name: 'Pricing page.url', source: 'Scout' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    items: [
      { name: 'Brand voice', source: 'Writer' },
      { name: 'Post examples', source: 'Writer, Community' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    items: [
      { name: 'Web search', source: 'Scout, Insights' },
      { name: 'Image maker', source: 'Designer' },
      { name: 'Discord', source: 'Community' },
      { name: 'X scheduler', source: 'Publisher' },
      { name: 'Survey reader', source: 'Insights' },
    ],
  },
  {
    id: 'facts',
    title: 'Launch facts',
    items: [
      { name: 'Launch on Mar 12, 9am', source: 'From your chat' },
      { name: '2,800 waitlist signups', source: 'From your chat' },
      { name: '$300 budget', source: 'Planner' },
    ],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    items: [
      { name: 'Post to Discord', source: 'Asks you first' },
      { name: 'Schedule on X', source: 'Asks you first' },
      { name: 'Spend on ads', source: 'Up to $50' },
      { name: 'Read your files', source: 'Allowed' },
    ],
  },
];

// Decisions tab (3.4, 2362:25048).
export const AI_COACH_DECISIONS: Decision[] = [
  {
    id: 'audience',
    agent: 'Strategist',
    who: 'Strategist',
    time: '2:10 pm',
    by: 'helper',
    title: 'Audience: people who already budget',
    basis: "Based on Insights' card (61% budget monthly)",
    tag: 'Was not sure',
    canFork: true,
  },
  {
    id: 'timing',
    agent: 'Planner',
    who: 'Planner',
    time: '2:02 pm',
    by: 'helper',
    title: 'Launch Mar 12 at 9am · $300 budget',
    basis: 'From your chat',
  },
];
export const AI_COACH_DECISIONS_MORE =
  '3 more · Permissions set to Balanced, ad limit $50, approved team';

// Chat tab while the run goes (no Figma frame: the plan chat's messages continued).
export const AI_COACH_CHAT: RunChatMessage[] = [
  { from: 'user', text: 'Mar 12, to our 2,800 waitlist signups' },
  {
    from: 'assistant',
    text: 'Your launch is running. Writer is on 3 of 5 pieces and Designer is making the first image. I’ll check with you before anything is posted.',
  },
];
export const AI_COACH_CHAT_SUGGESTIONS = [
  'Make the copy shorter',
  'Add an Instagram post',
];

// Node inspector (3.5, 2362:25179) for the Writer's Launch copy. Other nodes fall back to their card data.
export const AI_COACH_INSPECTOR: Record<string, InspectorData> = {
  writer: {
    eyebrow: 'Output',
    kindIcon: nodeKindOutputGlyph,
    branch: 'Original path',
    title: 'Launch copy',
    meta: 'Writer · Working · 4 pieces',
    preview: {
      eyebrow: 'Writer wrote',
      quote:
        '“Your money finally has a coach. AI Coach is live for waitlist members on Mar 12.”',
      action: 'See all 4 pieces',
    },
    fork: {
      description: 'Try another direction. The original path stays as it is.',
    },
    rerun: {
      description:
        'Available once Writer finishes. Earlier steps stay as they are.',
      disabled: true,
    },
    fields: [
      {
        label: 'Why',
        value:
          "The Strategist's card says lead with coaching, for people who already budget.",
      },
      {
        label: 'Based on',
        value:
          "Strategist's handoff ✓ and your brand voice skill. Every fact traces back to a card.",
      },
      {
        label: 'Impact',
        value: 'Community and Publisher use this copy next.',
      },
    ],
    extras: {
      label: 'Just for Writer',
      items: ['Brand voice · skill', 'Post examples · file'],
    },
  },
};

// Everything the AI Coach run screens (3.2–3.5) show, for RunScreenLayout.
export const AI_COACH_RUN: RunData = {
  map: {
    ...AI_COACH_MAP,
    nodes: AI_COACH_NODES,
    edges: AI_COACH_EDGES,
    docked: AI_COACH_DOCKED,
  },
  completed: AI_COACH_DONE,
  tasks: AI_COACH_TASKS,
  tasksSummary: AI_COACH_TASKS_SUMMARY,
  sandbox: AI_COACH_SANDBOX,
  decisions: AI_COACH_DECISIONS,
  decisionsMore: AI_COACH_DECISIONS_MORE,
  chat: AI_COACH_CHAT,
  chatSuggestions: AI_COACH_CHAT_SUGGESTIONS,
  inspectors: AI_COACH_INSPECTOR,
};

// ---- The timeline before 3.2 (no Figma frame; built from the 3.2 map) ------------------------------------------

/** Which run-map step each plan helper works on (the run map is the plan's helpers, one step each). */
export const STEP_OF_HELPER: Record<string, string> = {
  planner: 'plan',
  scout: 'scout',
  insights: 'insights',
  strategist: 'decision',
  writer: 'writer',
  designer: 'designer',
  community: 'discord',
  publisher: 'schedule',
};

const pendingFrom = (from: string[]): MapEdge[] =>
  AI_COACH_EDGES.map((e) =>
    from.includes(e.from)
      ? {
          ...e,
          status: 'pending',
          marker: e.marker && { ...e.marker, status: 'pending' },
        }
      : e
  );

const waitingOutput = (id: 'writer' | 'designer', text: string) => {
  const n = AI_COACH_NODES.find((x) => x.id === id)!;
  return {
    ...n,
    state: 'waiting' as const,
    preview: undefined,
    status: { text },
    avatar: { agent: n.avatar!.agent, state: 'idle' as const },
  };
};

const tasksWith = (states: Record<string, TaskItem['state']>): TaskItem[] =>
  AI_COACH_TASKS.map((t) => ({ ...t, state: states[t.id!] ?? t.state }));

/** Just launched: the research helpers start, everyone else waits. */
export const AI_COACH_LAUNCH_RUN: RunData = {
  ...AI_COACH_RUN,
  map: {
    ...AI_COACH_RUN.map,
    nodes: AI_COACH_NODES.map((n) => {
      const research: Record<string, [string, AgentName]> = {
        plan: ['Making the plan', 'Planner'],
        scout: ['Comparing apps', 'Scout'],
        insights: ['Reading the survey', 'Insights'],
      };
      if (research[n.id])
        return {
          ...n,
          state: 'working',
          status: { text: research[n.id][0], tone: 'live' },
          avatar: { agent: research[n.id][1], state: 'working' },
        };
      if (n.id === 'decision')
        return {
          ...n,
          state: 'waiting',
          flag: undefined,
          status: { text: 'Waits for research' },
        };
      if (n.id === 'writer' || n.id === 'designer')
        return waitingOutput(n.id, 'Waits for Strategist');
      return n;
    }),
    edges: pendingFrom(['plan', 'scout', 'insights', 'decision']),
  },
  completed: [],
  tasks: tasksWith({
    writer: 'waiting',
    designer: 'waiting',
    plan: 'running',
    scout: 'running',
    insights: 'running',
    decision: 'waiting',
  }),
  chat: [
    AI_COACH_CHAT[0],
    {
      from: 'assistant',
      text: 'Your launch is running. Planner, Scout and Insights are on the research. I’ll check with you before anything is posted.',
    },
  ],
};

/** Research is in: Strategist decides who the launch is for. */
export const AI_COACH_DECIDING_RUN: RunData = {
  ...AI_COACH_LAUNCH_RUN,
  map: {
    ...AI_COACH_RUN.map,
    nodes: AI_COACH_NODES.map((n) => {
      if (n.id === 'decision')
        return {
          ...n,
          state: 'working',
          flag: undefined,
          status: { text: 'Deciding who it’s for', tone: 'live' },
          avatar: { agent: 'Strategist', state: 'working' },
        };
      if (n.id === 'writer' || n.id === 'designer')
        return waitingOutput(n.id, 'Waits for Strategist');
      return n;
    }),
    edges: pendingFrom(['decision']),
  },
  completed: ['Planner', 'Scout', 'Insights'],
  tasks: tasksWith({
    writer: 'waiting',
    designer: 'waiting',
    decision: 'running',
  }),
};
