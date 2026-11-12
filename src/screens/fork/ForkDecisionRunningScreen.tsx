import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { FORK_DECISION_RUNNING_RUN } from './data';
import { FIRST_TIMERS } from './drawnForks';

export const screenId = '4.5';

// Figma 4.5 "Fork running · from a decision" (2362:27924): the "First-timers" fork (Fork 1) runs in its own lane
// under the original path, joined to the decision by the bold pink fork line. The decision's inspector shows the
// fork's brief; the Tasks chip counts the fork's steps.
export default function ForkDecisionRunningScreen() {
  return (
    <RunScreenLayout
      data={FORK_DECISION_RUNNING_RUN}
      drawnForks={[FIRST_TIMERS]}
      initialPanel={{ kind: 'inspector', nodeId: 'decision' }}
      cost="First-timers · $0.33"
    />
  );
}
