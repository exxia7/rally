import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { FORK_RUNNING_RUN } from './data';
import { VS_PENNY } from './drawnForks';

export const screenId = '6.5';

// Figma 6.5 "Fork running" (2362:26232): "Vs Penny" (Fork 1) runs in its lane under the original path; its Launch
// copy is open in the inspector. Fork from here on any step opens the Fork card in place; Create fork adds the next
// colour's lane here (a fork from a fork, 1e). Each Ready to post opens the approval scoped to its branch (1f).
export default function ForkRunningScreen() {
  return (
    <RunScreenLayout
      data={FORK_RUNNING_RUN}
      drawnForks={[VS_PENNY]}
      initialPanel={{ kind: 'inspector', nodeId: 'writer-f1' }}
      cost="Vs Penny · $0.24"
    />
  );
}
