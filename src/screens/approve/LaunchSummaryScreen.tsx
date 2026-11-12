import { useMemo, useState } from 'react';

import checkDark from '@/assets/icons/check-dark.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { TaskProgressChip } from '@/components/map/CanvasControls';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { InspectorPanel } from '@/components/run/InspectorPanel';
import { inspectorFromNode } from '@/components/run/RunScreenLayout';
import { AppShell } from '@/components/shell/AppShell';
import { PathfinderAvatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { planFrame, useGo, useRunFrameSync } from '@/state/nav';
import {
  agentNames,
  money,
  runCost,
  runData,
  summaryView,
} from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';

import { LAUNCH_MAP } from './launchMap';

export const screenId = '5.2';

const rowClass =
  'flex h-10 w-full shrink-0 items-center gap-2 border-b border-line';
const status =
  'text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted';
const heading =
  'w-full shrink-0 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] whitespace-nowrap text-muted';

// Figma 5.2 "Launch summary" (2362:25601): the finished run map behind a blurred scrim, and the summary modal:
// what went out, what you fixed, and a "Next time" permission suggestion. Done goes Home; closing the modal
// (Escape, the scrim) leaves you on the run map; Planning goes back to the plan map.
export default function LaunchSummaryScreen() {
  const go = useGo();
  const [open, setOpen] = useState(true);
  // Once the summary is closed, a map card opens its own read-only inspector; "Ready to post" reopens the summary.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const wf = useWorkflow();
  useRunFrameSync('5.2');
  const run = useMemo(() => runData(wf), [wf]);
  const names = useMemo(() => agentNames(wf), [wf]);
  // What went out, what you fixed and the "Next time" rule follow your approvals and hand-raise answers.
  const summary = useMemo(() => summaryView(wf), [wf]);
  const WENT_OUT = summary.wentOut;
  const FIXED = summary.fixed;
  const rules: Partial<Record<string, 'allow' | 'keep'>> = wf.permissions.nextTime;
  const nextTime = rules[summary.rule] ?? 'ask';
  const setNextTime = (v: 'ask' | 'allow' | 'keep') =>
    dispatch({
      type: 'permissions/nextTime',
      rule: summary.rule,
      value: v === 'ask' ? undefined : v,
    });
  const helper = summary.ruleHelper;
  const posts = summary.rule === 'community-discord' ? 'post to Discord' : 'schedule posts';
  const [exported, setExported] = useState(false);
  const inspected = inspecting
    ? run.map.nodes.find((n) => n.id === inspecting)
    : undefined;

  const exportSummary = () => {
    const text = [
      `Your launch is live: ${summary.line}`,
      ...WENT_OUT.map((r) => `${r.skipped ? '–' : '✓'} ${r.label}: ${r.status}`),
      '– $300 ad test: Not run, over your $50 ad limit',
      ...FIXED.map((f) => `Fixed: ${f}`),
    ].join('\n');
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setExported(true);
  };

  return (
    <AppShell
      sidebar="none"
      aside={
        inspected && (
          <InspectorPanel
            key={inspected.id}
            data={{
              ...inspectorFromNode(inspected),
              fork: null,
              rerun: null,
              footer: false,
            }}
            onClose={() => setInspecting(null)}
          />
        )
      }
    >
      <WorkflowTopBar
        view="flowchart"
        title={wf.title}
        onViewChange={(v) => v === 'planning' && go(planFrame(wf.planStage))}
        status="running"
        statusLabel={`Launched · ${money(runCost(wf))}`}
      />
      <MapCanvas
        zoomClassName="z-[60] max-md:bottom-[95px] max-md:z-0"
        overlay={
          <>
            <TaskProgressChip
              done={run.tasks.filter((t) => t.state === 'done').length}
              total={run.tasks.length}
              className="absolute top-4 left-4 w-[213px]"
            />
            <CompletedAgents
              agents={run.completed}
              names={names}
              className="absolute bottom-[16.26px] left-4 max-md:right-4"
            />
            <Modal
              open={open}
              onClose={() => setOpen(false)}
              label="Launch summary"
              width={560}
              appearance="summary"
              contained
            >
              <div className="flex min-h-0 w-full flex-col items-start overflow-x-clip overflow-y-auto">
                {/* Phones: "Next time" moves up under this header so its buttons aren't below the fold. */}
                <div className="flex w-full shrink-0 items-center gap-3 max-md:order-[-2]">
                  <PathfinderAvatar size={52} />
                  <div className="flex min-w-px flex-1 flex-col items-start">
                    <h2 className="text-[24px] leading-7 font-semibold tracking-[-0.48px] whitespace-nowrap text-ink max-md:text-[20px]">
                      Your launch is live
                    </h2>
                    <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                      {summary.line}
                    </p>
                  </div>
                </div>
                <p className={`${heading} h-[42px] pt-6`}>What went out</p>
                <div className="flex w-full shrink-0 flex-col items-start pt-1">
                  {WENT_OUT.map((r) => (
                    <div key={r.label} className={rowClass}>
                      {r.skipped ? (
                        // Declined on 5.1: drawn like the ad test that didn't run.
                        <p className="w-3.5 shrink-0 text-center text-[13px] leading-[19.5px] tracking-[-0.08px] text-muted">
                          –
                        </p>
                      ) : (
                        <Icon src={checkDark} size={7.545} />
                      )}
                      <p
                        className={`min-w-px flex-1 truncate text-[13px] leading-[19.5px] tracking-[-0.08px] ${r.skipped ? 'text-muted' : 'text-ink'}`}
                      >
                        {r.label}
                      </p>
                      <p className={status}>{r.status}</p>
                    </div>
                  ))}
                </div>
                <div className={rowClass}>
                  <p className="w-3.5 shrink-0 text-center text-[13px] leading-[19.5px] tracking-[-0.08px] text-muted">
                    –
                  </p>
                  <p className="min-w-px flex-1 truncate text-[13px] leading-[19.5px] tracking-[-0.08px] text-muted">
                    $300 ad test
                  </p>
                  <p
                    className={`${status} max-md:whitespace-normal max-md:text-right`}
                  >
                    Not run, over your $50 ad limit
                  </p>
                </div>
                <p className={`${heading} h-[38px] pt-5`}>What you fixed</p>
                <ul className="flex w-full shrink-0 flex-col items-start gap-1 pt-1.5">
                  {FIXED.map((f) => (
                    <li
                      key={f}
                      className="min-h-5 w-full text-[13px] leading-[19.5px] tracking-[-0.08px] text-ink"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex w-full shrink-0 flex-col items-center pt-5 max-md:order-[-1]">
                  <div className="flex w-full items-center gap-3 rounded-[10px] bg-well p-4 max-md:flex-col max-md:items-start">
                    <div className="flex min-w-px flex-1 flex-col items-start">
                      <p className="min-h-[17px] text-[12px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
                        Next time
                      </p>
                      <p className="w-full pt-0.5 text-[13px] leading-[19.5px] font-semibold tracking-[-0.08px] text-ink">
                        {summary.askAbout}
                      </p>
                      <p className="w-full pt-0.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                        {nextTime === 'allow'
                          ? `${helper} will ${posts} on its own next time.`
                          : nextTime === 'keep'
                            ? `${helper} will keep asking before it posts.`
                            : summary.skipped
                              ? `You skipped ${summary.skipped} post${summary.skipped === 1 ? '' : 's'} today.`
                              : 'You approved every post as written today.'}
                      </p>
                    </div>
                    {nextTime === 'ask' ? (
                      <div className="flex shrink-0 items-start gap-1.5">
                        <Button
                          className="w-[60px]"
                          onClick={() => setNextTime('allow')}
                        >
                          Allow
                        </Button>
                        <Button
                          className="w-[102px]"
                          onClick={() => setNextTime('keep')}
                        >
                          Keep asking
                        </Button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          tone={nextTime === 'allow' ? 'green' : 'neutral'}
                        >
                          {nextTime === 'allow' ? 'Allowed' : 'Keeps asking'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNextTime('ask')}
                        >
                          Undo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex h-14 w-full shrink-0 items-start justify-end gap-2 pt-6">
                <Button className="w-[129px]" onClick={exportSummary}>
                  {exported ? 'Copied' : 'Export summary'}
                </Button>
                <Button
                  variant="primary"
                  className="w-[57px]"
                  onClick={() => go('1.1')}
                >
                  Done
                </Button>
              </div>
            </Modal>
          </>
        }
      >
        <FlowMap
          x={LAUNCH_MAP.x}
          y={LAUNCH_MAP.y}
          nodes={run.map.nodes}
          edges={run.map.edges}
          width={LAUNCH_MAP.width}
          height={LAUNCH_MAP.height}
          onNodeClick={(n) => {
            if (n.id === 'ready') {
              setInspecting(null);
              setOpen(true);
            } else setInspecting(n.id);
          }}
        />
      </MapCanvas>
    </AppShell>
  );
}
