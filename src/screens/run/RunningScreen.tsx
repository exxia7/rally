import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.2', '3.2-tasks'];

// Figma 3.2 "Running" (2362:24736): the run flowchart while helpers work, and 3.2-tasks (2362:26475) with the
// anchored Tasks overlay open from the Tasks chip.
export default function RunningScreen() {
  const { id = '' } = useParams();
  const { layout } = useLiveRun(id);
  return (
    <RunScreenLayout {...layout} initialTasksOpen={id === '3.2-tasks'} />
  );
}
