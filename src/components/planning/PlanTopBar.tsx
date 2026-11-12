import clsx from 'clsx';

import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { Button } from '@/components/ui/Button';
import { useStartLaunch } from '@/state/actions';
import { useGo } from '@/state/nav';
import { estimate as planEstimate } from '@/state/planView';
import { runFrame } from '@/state/runView';
import { useWorkflow } from '@/state/store';
import type { Workflow } from '@/state/types';

// The top bar of the planning-map frames (2.3–2.7, e.g. 2362:23645): Planning view, "About 9 min · $0.30",
// workflow settings, the side-panel toggle and the Primary "Start launch". Flowchart and Start launch move on to
// the run: Start launch starts it (3.2), Flowchart opens it where it is (3.1 until it has started); settings opens
// 2.8 and comes back here. The title and estimate come from the workflow in the store.
// Mid-run (audit 3h) the main action is "Back to run" and a strip under the bar says edits only reach steps that
// haven't started (PlanMidRunNote).
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
  return (
    <>
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
        action={<PlanMainAction className="md:min-w-[100px]" />}
      />
      <PlanMidRunNote />
    </>
  );
}

/** Whether the workflow's run has started (planning then edits a live run): "Back to run", and 2.3's chat says
 *  edits reach the steps that haven't started. */
// eslint-disable-next-line react-refresh/only-export-components -- the one live-run check the planning views share
export const runStarted = (wf: Workflow) => wf.run.phase !== 'notStarted';

/** The planning views' main action: "Start launch" before the run, "Back to run" once it has started. */
export function PlanMainAction({ className }: { className?: string }) {
  const go = useGo();
  const wf = useWorkflow();
  const start = useStartLaunch();
  if (runStarted(wf))
    return (
      <Button
        variant="primary"
        className={className}
        onClick={() => go(runFrame(wf))}
      >
        {/* "Run" on phones, so the workflow title keeps room. */}
        <span className="max-md:hidden">Back to run</span>
        <span className="md:hidden">Run</span>
      </Button>
    );
  return (
    <Button variant="primary" className={className} onClick={start}>
      {/* "Start" on phones, so the workflow title keeps room. */}
      <span className="max-md:hidden">Start launch</span>
      <span className="md:hidden">Start</span>
    </Button>
  );
}

/**
 * Not in Figma: mid-run, a one-line strip under the planning top bar (accent-soft, 12/18 ink-2): edits apply to
 * steps that haven't started. Renders nothing before the run (or after launch), so the Figma frames are unchanged.
 */
export function PlanMidRunNote({ className }: { className?: string }) {
  const wf = useWorkflow();
  if (!runStarted(wf) || wf.run.phase === 'launched') return null;
  return (
    <div
      role="status"
      className={clsx(
        'flex min-h-9 w-full shrink-0 items-center gap-2 border-b border-line bg-accent-soft px-4 py-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-ink-2 max-md:px-3',
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
      <span className="min-w-px flex-1">
        The run is live. Changes apply to steps that haven&apos;t started.
      </span>
    </div>
  );
}
