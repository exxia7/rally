import { useNavigate } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { FORK_RUNNING_RUN, isForkLaneNode } from './data';

export const screenId = '6.5';

// Figma 6.5 "Fork running" (2362:26232): "Vs Penny" (Fork 1) runs in its lane under the original path; its Launch
// copy is open in the inspector. Forking a step inside the lane makes a fork from a fork (6.6).
export default function ForkRunningScreen() {
  const navigate = useNavigate();
  return (
    <RunScreenLayout
      data={FORK_RUNNING_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'writer-f1' }}
      cost="Vs Penny · $0.24"
      onInspectorFork={(id) =>
        navigate(screenPath(isForkLaneNode(id) ? '6.6' : '6.4'))
      }
      onForkCreate={() => navigate(screenPath('6.5'))}
    />
  );
}
