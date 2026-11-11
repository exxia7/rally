import { useNavigate } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { FORK_DECISION_RUN } from './data';

export const screenId = '4.4';

// Figma 4.4 "Fork" (2362:25394): from the Decisions tab (3.4), Fork from here on the Strategist's audience call. The
// finished run waits for you; the decision's inspector has its Fork card open (what the fork tries, which helpers
// work on the new branch). Create fork starts it (4.5); Cancel closes the card.
export default function ForkScreen() {
  const navigate = useNavigate();
  return (
    <RunScreenLayout
      data={FORK_DECISION_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'decision', forkOpen: true }}
      initialPaused
      status={{ state: 'waiting', label: 'Needs you · $0.31' }}
      onForkCreate={() => navigate(screenPath('4.5'))}
    />
  );
}
