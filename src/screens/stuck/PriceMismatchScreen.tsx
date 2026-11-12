
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';
import { dispatch } from '@/state/store';
import { useLiveRun } from '@/state/useRun';


export const screenId = '4.3';

// Figma 4.3 "Price mismatch" (2362:25290): the second problem. Writer raised its hand because the price on its
// handoff doesn't match the launch facts; the side panel offers two fixes. Confirm (or the card's Rerun) applies
// the pick and the run moves on to the approval (5.1).
export default function PriceMismatchScreen() {
  const go = useGo();
  const { layout } = useLiveRun('4.3');
  return (
    <RunScreenLayout
      {...layout}
      initialPanel={{ kind: 'hand-raise' }}
      onHandRaiseConfirm={(choices, other) => {
        dispatch({
          type: 'handRaise/confirm',
          id: 'price',
          choices: choices ?? [0],
          other: other ?? '',
        });
        // Writer finishes, then Community and Publisher; the approval opens when they're done.
        go('3.2', { replace: true });
      }}
    />
  );
}
