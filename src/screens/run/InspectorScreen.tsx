import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.5', '3.5-tasks'];

// Figma 3.5 "Inspector" (2362:25089) and 3.5-tasks (2362:26887): the run with the Writer's Launch copy node open
// in the inspector.
export default function InspectorScreen() {
  const { id = '' } = useParams();
  const { layout } = useLiveRun(id);
  return (
    <RunScreenLayout
      {...layout}
      initialPanel={{ kind: 'inspector', nodeId: 'writer' }}
      initialTasksOpen={id === '3.5-tasks'}
    />
  );
}
