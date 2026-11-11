import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';

// The AI Coach launch run map as Figma draws it in 3.2 "Running" (FlowMap frame 2362:24759, 1282×581
// placed at 45,83 on the 1362×830 canvas). Other run/rerun/fork frames start from these and override
// node states, edges and overlays.
export const AI_COACH_MAP = { x: 45, y: 83, width: 1282, height: 581.05 };

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
