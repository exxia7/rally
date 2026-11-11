import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { AI_COACH_RUN } from './aiCoachMap';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.2', '3.2-tasks'];

// Figma 3.2 "Running" (2362:24736): the run flowchart while helpers work, and 3.2-tasks (2362:26475) with the
// anchored Tasks overlay open from the Tasks chip.
export default function RunningScreen() {
  const { id } = useParams();
  return (
    <RunScreenLayout data={AI_COACH_RUN} initialTasksOpen={id === '3.2-tasks'} />
  );
}
