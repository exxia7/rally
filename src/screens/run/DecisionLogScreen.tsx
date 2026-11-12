import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.4', '3.4-tasks'];

// Figma 3.4 "Decision log" (2362:24954) and 3.4-tasks (2362:26732): the run with the side panel on its
// Decisions tab.
export default function DecisionLogScreen() {
  const { id = '' } = useParams();
  const { layout } = useLiveRun(id);
  return (
    <RunScreenLayout
      {...layout}
      initialPanel={{ kind: 'tabs', tab: 'decisions' }}
      initialTasksOpen={id === '3.4-tasks'}
    />
  );
}
