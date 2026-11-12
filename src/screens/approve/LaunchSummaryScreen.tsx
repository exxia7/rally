import { useMemo, useState } from 'react';

import checkDark from '@/assets/icons/check-dark.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { RUN_MAP_SCALE, runMapFocus } from '@/components/map/runMapView';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { InspectorPanel } from '@/components/run/InspectorPanel';
import { inspectorFromNode } from '@/components/run/RunScreenLayout';
import { TasksDropdown } from '@/components/run/TasksDropdown';
import { AppShell } from '@/components/shell/AppShell';
import { RallyAvatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { planFrame, useGo, useRunFrameSync } from '@/state/nav';
import { blockedOutput } from '@/state/permissions';
import { agentNames, goesOut, runData, summaryView } from '@/state/runView';
import { dispatch, useAppState, useWorkflow } from '@/state/store';

import { LAUNCH_MAP } from './launchMap';

export const screenId = '5.2';

const rowClass =
  'flex h-10 w-full shrink-0 items-center gap-2 border-b border-line';
// Phones: a long status wraps (right-aligned) instead of squeezing the label.
const status =
  'text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted max-md:max-w-[55%] max-md:whitespace-normal max-md:text-right';
const heading =
  'w-full shrink-0 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] text-muted';
const dash =
  'w-3.5 shrink-0 text-center text-[13px] leading-5 tracking-[-0.08px] text-muted';

// Figma 5.2 "Launch summary" (2362:25601): the finished run map behind a blurred scrim, and the summary modal:
// what went out, what you fixed, and a "Next time" permission suggestion. Done goes Home; closing the modal
// (Escape, the scrim) leaves you on the run map; Planning goes back to the plan map.
export default function LaunchSummaryScreen() {
  const go = useGo();
  const [open, setOpen] = useState(true);
  // Once the summary is closed, a map card opens its own read-only inspector; "Ready to post" reopens the summary.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const xl = useMediaQuery('(min-width: 1280px)');
  const wf = useWorkflow();
  useRunFrameSync('5.2');
  const run = useMemo(() => runData(wf), [wf]);
  const names = useMemo(() => agentNames(wf), [wf]);
  // What went out, what you fixed and the "Next time" rule follow your approvals and hand-raise answers.
  // An output your connections held back (LinkedIn) says why, and isn't one you skipped.
  const app = useAppState();
  const summary = useMemo(
    () => summaryView(wf, (id) => blockedOutput(app, wf, id)),
    [wf, app]
  );
  // Posts that went out exactly as drafted: the case for letting the helper post on its own next time.
  const approvedAsWritten = summary.wentOut.filter(
    (w) => !w.skipped && !('edited' in w && w.edited) && !/^Not /.test(w.status)
  ).length;
  const WENT_OUT = summary.wentOut;
  const FIXED = summary.fixed;
  const rules: Partial<Record<string, 'allow' | 'keep'>> =
    wf.permissions.nextTime;
  const nextTime = rules[summary.rule] ?? 'ask';
  const setNextTime = (v: 'ask' | 'allow' | 'keep') =>
    dispatch({
      type: 'permissions/nextTime',
      rule: summary.rule,
      value: v === 'ask' ? undefined : v,
    });
  const helper = summary.ruleHelper;
  const posts =
    summary.rule === 'community-discord' ? 'post to Discord' : 'schedule posts';
  const [exported, setExported] = useState(false);
  const inspected = inspecting
    ? run.map.nodes.find((n) => n.id === inspecting)
    : undefined;

  // A map card or its Tasks row: "Ready to post" reopens the summary, any other step its read-only inspector.
  const openNode = (id: string) => {
    if (id === 'ready') {
      setInspecting(null);
      setOpen(true);
    } else setInspecting(id);
  };

  const exportSummary = () => {
    const text = [
      `Your launch is live: ${summary.line}`,
      ...WENT_OUT.map(
        (r) => `${r.skipped ? '–' : '✓'} ${r.label}: ${r.status}`
      ),
      '– $300 ad test: Not run, over your $50 ad limit',
      ...FIXED.map((f) => `Fixed: ${f}`),
    ].join('\n');
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setExported(true);
  };

  return (
    <AppShell
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
      />
      <MapCanvas
        contentScale={RUN_MAP_SCALE}
        viewKey={`run:${app.activeId}`}
        focus={runMapFocus(run.map.nodes, LAUNCH_MAP)}
        zoomClassName="z-[60] max-md:bottom-[95px] max-md:z-0"
        overlay={
          <>
            <TasksDropdown
              outputs={goesOut(wf)}
              motionKey={`run:${app.activeId}:tasks`}
              tasks={run.tasks}
              onSelectTask={(t) => t.id && openNode(t.id)}
              // Under 1280px the inspector covers the map: opening the list closes it.
              onOpen={() => !xl && setInspecting(null)}
            />
            <CompletedAgents
              agents={run.completed}
              names={names}
              className="absolute bottom-4 left-4 max-md:right-4"
            />
            <Modal
              open={open}
              onClose={() => setOpen(false)}
              label="Launch summary"
              width={560}
              appearance="summary"
              contained
              header={
                <div className="flex w-full items-center gap-3">
                  <RallyAvatar size={52} />
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <h2 className="text-[24px] leading-7 font-semibold tracking-[-0.48px] text-ink max-md:text-[20px]">
                      Your launch is live
                    </h2>
                    <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                      {summary.line}
                    </p>
                  </div>
                </div>
              }
              footer={
                <>
                  <Button onClick={exportSummary}>
                    {exported ? 'Copied' : 'Export summary'}
                  </Button>
                  <Button variant="primary" onClick={() => go('1.1')}>
                    Done
                  </Button>
                </>
              }
            >
              <p className={heading}>
                {/* The version you chose with "Use this version"; the others were kept, not posted. */}
                {summary.version
                  ? `What went out · ${summary.version}`
                  : 'What went out'}
              </p>
              <div className="flex w-full shrink-0 flex-col items-start pt-1">
                {WENT_OUT.map((r) => (
                  <div
                    key={r.label}
                    // An item you edited on 5.1 shows your text under its row (the row grows to fit).
                    className={
                      'edited' in r && r.edited
                        ? `${rowClass} h-auto min-h-10 py-2`
                        : rowClass
                    }
                  >
                    {r.skipped ? (
                      // Declined on 5.1: drawn like the ad test that didn't run.
                      <p className={dash}>–</p>
                    ) : (
                      <span className="flex w-3.5 shrink-0 justify-center">
                        <Icon src={checkDark} size={7.545} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p
                        title={r.label}
                        className={`truncate text-[13px] leading-5 tracking-[-0.08px] ${r.skipped ? 'text-muted' : 'text-ink'}`}
                      >
                        {r.label}
                      </p>
                      {'edited' in r && r.edited && (
                        <p className="text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                          Your edit: “{r.edited}”
                        </p>
                      )}
                    </div>
                    <p className={status}>{r.status}</p>
                  </div>
                ))}
              </div>
              <div className={rowClass}>
                <p className={dash}>–</p>
                <p className="min-w-0 flex-1 truncate text-[13px] leading-5 tracking-[-0.08px] text-muted">
                  $300 ad test
                </p>
                <p className={status}>Not run, over your $50 ad limit</p>
              </div>
              <p className={`${heading} pt-5`}>What you fixed</p>
              <ul className="flex w-full shrink-0 flex-col items-start gap-1 pt-1.5">
                {FIXED.map((f) => (
                  <li
                    key={f}
                    className="w-full text-[13px] leading-5 tracking-[-0.08px] text-ink"
                  >
                    {f}
                  </li>
                ))}
              </ul>
              {/* Phones: "Next time" moves up under the header so its buttons aren't below the fold. */}
              <div className="flex w-full shrink-0 flex-col pt-5 max-md:order-first max-md:pt-0 max-md:pb-5">
                <div className="flex w-full items-center gap-3 rounded-[10px] bg-well p-4 max-md:flex-col max-md:items-start">
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <p className="text-[12px] leading-4 tracking-[-0.08px] text-muted">
                      Next time
                    </p>
                    <p className="w-full text-[13px] leading-5 font-semibold tracking-[-0.08px] text-ink">
                      {summary.askAbout}
                    </p>
                    <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                      {nextTime === 'allow'
                        ? `${helper} will ${posts} on its own next time.`
                        : nextTime === 'keep'
                          ? `${helper} will keep asking before it posts.`
                          : summary.skipped
                            ? // Why it's worth trusting the helper more: what you approved unchanged, not what you skipped.
                              `You approved ${approvedAsWritten} of its post${approvedAsWritten === 1 ? '' : 's'} as written today.`
                            : 'You approved every post as written today.'}
                    </p>
                  </div>
                  {nextTime === 'ask' ? (
                    <div className="flex shrink-0 items-start gap-1.5">
                      <Button onClick={() => setNextTime('allow')}>
                        Allow
                      </Button>
                      <Button onClick={() => setNextTime('keep')}>
                        Keep asking
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={nextTime === 'allow' ? 'green' : 'neutral'}>
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
          onNodeClick={(n) => openNode(n.id)}
        />
      </MapCanvas>
    </AppShell>
  );
}
