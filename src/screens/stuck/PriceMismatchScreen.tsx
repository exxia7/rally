import { useNavigate } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { PRICE_MISMATCH_RUN } from './data';

export const screenId = '4.3';

// Figma 4.3 "Price mismatch" (2362:25290): the second problem. Writer raised its hand because the price on its
// handoff doesn't match the launch facts; the side panel offers two fixes. Confirm (or the card's Rerun) applies
// the pick and the run moves on to the approval (5.1).
export default function PriceMismatchScreen() {
  const navigate = useNavigate();
  return (
    <RunScreenLayout
      data={PRICE_MISMATCH_RUN}
      initialPanel={{ kind: 'hand-raise' }}
      initialPaused
      status={{ state: 'waiting', label: 'Needs you · $0.23' }}
      onHandRaiseConfirm={() => navigate(screenPath('5.1'))}
    />
  );
}
