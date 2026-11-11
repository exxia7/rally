import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { AI_COACH_RUN } from './aiCoachMap';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.5', '3.5-tasks'];

// Figma 3.5 "Inspector" (2362:25089) and 3.5-tasks (2362:26887): the run with the Writer's Launch copy node open
// in the inspector.
export default function InspectorScreen() {
  const { id } = useParams();
  return (
    <RunScreenLayout
      data={AI_COACH_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'writer' }}
      initialTasksOpen={id === '3.5-tasks'}
    />
  );
}
