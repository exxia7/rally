
import { useCreateFork } from '@/components/fork/useForkRunView';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';

import { FORK_DECISION_RUN } from './data';
import { DECISION_OPTIONS, FIRST_TIMERS } from './drawnForks';

export const screenId = '4.4';

// Figma 4.4 "Fork" (2362:25394): from the Decisions tab (3.4), Fork from here on the Strategist's audience call. The
// finished run waits for you; the decision's inspector has its Fork card open (what the fork tries, which helpers
// work on the new branch). Create fork starts it (4.5); Cancel closes the card.
export default function ForkScreen() {
  const go = useGo();
  const createFork = useCreateFork();
  return (
    <RunScreenLayout
      data={FORK_DECISION_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'decision', forkOpen: true }}
      initialPaused
      status={{ state: 'waiting', label: 'Needs you · $0.31' }}
      // The fork is named from the chip or text you chose (2g); 4.5 draws it under that name.
      onForkCreate={(from, instruction) => {
        createFork({
          from,
          parent: 'original',
          instruction,
          options: DECISION_OPTIONS,
          drawnName: FIRST_TIMERS.name,
        });
        go('4.5');
      }}
    />
  );
}
