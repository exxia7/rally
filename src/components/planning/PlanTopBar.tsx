import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { Button } from '@/components/ui/Button';
import { useStartLaunch } from '@/state/actions';
import { useGo } from '@/state/nav';
import { estimate as planEstimate } from '@/state/planView';
import { runFrame } from '@/state/runView';
import { useWorkflow } from '@/state/store';

// The top bar of the planning-map frames (2.3–2.7, e.g. 2362:23645): Planning view, "About 9 min · $0.30",
// workflow settings, the side-panel toggle and the Primary "Start launch". Flowchart and Start launch move on to
// the run: Start launch starts it (3.2), Flowchart opens it where it is (3.1 until it has started); settings opens
// 2.8 and comes back here. The title and estimate come from the workflow in the store.
export function PlanTopBar({
  panelOpen,
  onTogglePanel,
  estimate,
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
  estimate?: string;
}) {
  const go = useGo();
  const wf = useWorkflow();
  const start = useStartLaunch();
  return (
    <WorkflowTopBar
      title={wf.title}
      view="planning"
      onViewChange={(v) =>
        v === 'flowchart' && go(runFrame(wf), { returnHere: true })
      }
      estimate={estimate ?? planEstimate(wf)}
      onSettings={() => go('2.8', { returnHere: true })}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      action={
        <Button
          variant="primary"
          className="md:min-w-[100px]"
          onClick={start}
        >
          {/* "Start" on phones, so the workflow title keeps room. */}
          <span className="max-md:hidden">Start launch</span>
          <span className="md:hidden">Start</span>
        </Button>
      }
    />
  );
}
