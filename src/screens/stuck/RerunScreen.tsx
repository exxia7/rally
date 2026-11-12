import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['4.2', '4.2-tasks'];

// Figma 4.2 "Rerun" (2362:25201): after the rerun confirm, Strategist redoes its card while the steps it
// doesn't touch are reused; and 4.2-tasks (2362:27165) with the anchored Tasks overlay (a Close link, no bar) open
// from the "Tasks · Rerunning" chip. Writer is the next to raise its hand (4.3, price mismatch).
export default function RerunScreen() {
  const { id = '4.2' } = useParams();
  const { layout } = useLiveRun(id);
  // Writer raises its hand on its own when the Strategist's new card lands (the timeline's next beat).
  return (
    <RunScreenLayout {...layout} initialTasksOpen={id === '4.2-tasks'} />
  );
}
