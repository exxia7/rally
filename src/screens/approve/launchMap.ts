import type { AgentName } from '@/components/agents/characters';
import type { MapEdge, MapNode } from '@/components/map/FlowMap';
import {
  AI_COACH_EDGES,
  AI_COACH_MAP,
  AI_COACH_NODES,
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
