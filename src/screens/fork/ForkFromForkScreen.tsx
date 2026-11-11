import { useNavigate } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { FORK_FROM_FORK_RUN, isForkLaneNode } from './data';

export const screenId = '6.6';

// Figma 6.6 "Fork from a fork" (2362:28047): Vs Penny's Discord post forked into "In #general", which takes the next
// colour (Fork 2, teal) and hangs its lane off Vs Penny's. Its inspector is open.
export default function ForkFromForkScreen() {
  const navigate = useNavigate();
  return (
    <RunScreenLayout
      data={FORK_FROM_FORK_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'discord-f2' }}
      cost="2 forks · $0.26"
      onInspectorFork={(id) =>
        navigate(screenPath(isForkLaneNode(id) ? '6.6' : '6.4'))
      }
      onForkCreate={() => navigate(screenPath('6.5'))}
    />
  );
}
