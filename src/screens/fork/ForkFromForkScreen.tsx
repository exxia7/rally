import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { FORK_FROM_FORK_RUN } from './data';
import { IN_GENERAL, VS_PENNY } from './drawnForks';

export const screenId = '6.6';

// Figma 6.6 "Fork from a fork" (2362:28047): Vs Penny's Discord post forked into "In #general", which takes the next
// colour (Fork 2, teal) and hangs its lane off Vs Penny's. Its inspector is open. Forking again opens the Fork card in
// place and adds Fork 3 (violet) here (1e); each Ready to post opens the approval scoped to its branch (1f).
export default function ForkFromForkScreen() {
  return (
    <RunScreenLayout
      data={FORK_FROM_FORK_RUN}
      drawnForks={[VS_PENNY, IN_GENERAL]}
      initialPanel={{ kind: 'inspector', nodeId: 'discord-f2' }}
      cost="2 forks · $0.26"
    />
  );
}
