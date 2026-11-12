import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['3.3', '3.3-tasks'];

// Figma 3.3 "Running · Sandbox open" (2362:24825) and 3.3-tasks (2362:26584): the run with the side panel on its
// Sandbox tab.
export default function SandboxScreen() {
  const { id = '' } = useParams();
  const { layout } = useLiveRun(id);
  return (
    <RunScreenLayout
      {...layout}
      initialPanel={{ kind: 'tabs', tab: 'sandbox' }}
      initialTasksOpen={id === '3.3-tasks'}
    />
  );
}
