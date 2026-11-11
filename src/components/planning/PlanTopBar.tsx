import { useNavigate } from 'react-router-dom';

import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { Button } from '@/components/ui/Button';
import { screenPath } from '@/screens/registry';

// The top bar of the planning-map frames (2.3–2.7, e.g. 2362:23645): Planning view, "About 9 min · $0.30",
// workflow settings, the side-panel toggle and the Primary "Start launch". Flowchart and Start launch move on to
// the run (3.1); settings opens 2.8.
export function PlanTopBar({
  panelOpen,
  onTogglePanel,
  estimate = 'About 9 min · $0.30',
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
  estimate?: string;
}) {
  const navigate = useNavigate();
  return (
    <WorkflowTopBar
      view="planning"
      onViewChange={(v) => v === 'flowchart' && navigate(screenPath('3.1'))}
      estimate={estimate}
      onSettings={() => navigate(screenPath('2.8'))}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      action={
        <Button
          variant="primary"
          className="md:min-w-[100px]"
          onClick={() => navigate(screenPath('3.1'))}
        >
          {/* "Start" on phones, so the workflow title keeps room. */}
          <span className="max-md:hidden">Start launch</span>
          <span className="md:hidden">Start</span>
        </Button>
      }
    />
  );
}
