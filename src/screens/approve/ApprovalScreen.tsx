import { useEffect, useMemo, useRef, useState } from 'react';

import checkBadge from '@/assets/icons/check-badge.svg';
import lockAmber from '@/assets/icons/lock-amber-10.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { TaskProgressChip } from '@/components/map/CanvasControls';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { ApprovalItem, type ApprovalState } from '@/components/panels/Cards';
import { InspectorHeader } from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { AppShell } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InspectorPanel } from '@/components/run/InspectorPanel';
import { inspectorFromNode } from '@/components/run/RunScreenLayout';
import { TasksOverlay } from '@/components/run/TasksOverlay';
import { planFrame, useGo, useRunFrameSync } from '@/state/nav';
import {
  agentNames,
  approvalItems,
  approvalWaiting,
  money,
  runCost,
  runData,
} from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';

import { APPROVAL_MAP_SCALE, LAUNCH_MAP } from './launchMap';

export const screenId = '5.1';

// Figma 5.1 "Approval" (2362:25491): the finished run map (drawn at 0.68 beside the docked panel) and the
// "Ready to post" approval panel. Approve / Don't post / Undo change each item; "Approve all" approves what's
// left and opens the launch summary (5.2).
export default function ApprovalScreen() {
  const go = useGo();
  const wf = useWorkflow();
  useRunFrameSync('5.1');
  const [panelOpen, setPanelOpen] = useState(true);
  // A map card other than "Ready to post" opens its own (read-only) inspector instead of the approval panel.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Items, states and counts all come from the store, so a choice survives Edit, Back or the Tasks chip.
  const run = useMemo(() => runData(wf), [wf]);
  const items = useMemo(() => approvalItems(wf), [wf]);
  const names = useMemo(() => agentNames(wf), [wf]);
  const stateOf = (id: string): ApprovalState => wf.approvals[id] ?? 'waiting';
  const waiting = items.filter((i) => stateOf(i.id) === 'waiting').length;
  const pill = approvalWaiting(wf);
  const cost = money(runCost(wf));
  const publisher = wf.helpers.publisher?.name ?? 'Publisher';
  const done = run.tasks.filter((t) => t.state === 'done').length;
  const inspected = inspecting
    ? run.map.nodes.find((n) => n.id === inspecting)
    : undefined;
  const launch = () => {
    for (const i of items)
      if (stateOf(i.id) === 'waiting')
        dispatch({ type: 'approval/set', output: i.id, value: 'approved' });
    // Let the badges flip before moving on to the summary.
    timer.current = window.setTimeout(
      () => {
        dispatch({ type: 'approval/launch' });
        go('5.2', { replace: true });
      },
      waiting ? 600 : 0
    );
  };

  return (
    <AppShell
      sidebar="none"
      aside={
        inspected ? (
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
        ) : (
          panelOpen && (
          <SidePanel
            sheet="half"
            onClose={() => setPanelOpen(false)}
            header={
              <div className="flex min-h-[113px] w-full shrink-0 flex-col">
                <InspectorHeader
                  eyebrow={`Approval · ${publisher}`}
                  kindIcon={null}
                  title="Ready to post"
                  meta="Nothing goes out until you approve it."
                  onClose={() => setPanelOpen(false)}
                />
              </div>
            }
            bodyClassName="px-6 py-5 max-md:px-4"
            footer={
              <div className="flex w-full shrink-0 items-start gap-2 border-t border-line bg-white px-6 py-4 max-md:px-4">
                <Button
                  variant="primary"
                  className="min-w-[106px]"
                  onClick={launch}
                >
                  {waiting ? `Approve all ${waiting}` : 'Launch'}
                </Button>
                <Button
                  className="w-[101px]"
                  // Decide later: back Home, where the card says what's waiting.
                  onClick={() => go('1.1')}
                >
                  Decide later
                </Button>
              </div>
            }
          >
            <Badge tone="green" icon={<Icon src={checkBadge} size={10} />}>
              14 handoff cards checked · 2 caught and fixed
            </Badge>
            <div className="flex w-full flex-col items-start gap-2.5">
              {items.map((item) => (
                <ApprovalItem
                  key={item.id}
                  title={item.title}
                  when={item.when}
                  body={item.body}
                  channelNote={item.channelNote}
                  state={stateOf(item.id)}
                  onChange={(s) =>
                    dispatch({ type: 'approval/set', output: item.id, value: s })
                  }
                  // Edit changes the text in place (ApprovalItem's own Text area), so nothing is lost.
                  // STATE: the store's approvals should keep the edited text (approvals{} "edited text"), so
                  // 5.2 "What went out" and a reopened panel show it (pass `onBodyChange`).
                  className={`w-full shrink-0 ${item.minH}`}
                />
              ))}
              <div className="flex w-full shrink-0 flex-col items-start rounded-[10px] border border-dashed border-line-2 p-3.5">
                <div className="flex w-[320px] max-w-full items-center gap-2">
                  <p className="min-w-px flex-1 text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] whitespace-nowrap text-muted">
                    $300 ad test
                  </p>
                  <Badge
                    tone="subtle"
                    icon={<Icon src={lockAmber} size={10} />}
                  >
                    Blocked by your rules
                  </Badge>
                </div>
                <p className="w-full pt-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                  Ads are blocked in Permissions. Change the rule to approve
                  this.
                </p>
              </div>
            </div>
          </SidePanel>
          )
        )
      }
    >
      <WorkflowTopBar
        view="flowchart"
        title={wf.title}
        onViewChange={(v) => v === 'planning' && go(planFrame(wf.planStage))}
        status="waiting"
        statusLabel={
          pill
            ? `${pill} waiting for your OK · ${cost}`
            : `Ready to launch · ${cost}`
        }
        onSettings={() => go('2.8', { returnHere: true })}
        panelOpen={panelOpen || !!inspected}
        onTogglePanel={() => {
          if (inspected) setInspecting(null);
          else setPanelOpen((o) => !o);
        }}
      />
      <MapCanvas
        stageWidth={954}
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TaskProgressChip
              done={wf.asDrawn ? 9 : done}
              total={wf.asDrawn ? 10 : run.tasks.length}
              open={tasksOpen}
              onClick={() => setTasksOpen((o) => !o)}
              className="absolute top-4 left-4 w-[208px]"
            />
            <CompletedAgents
              agents={run.completed}
              names={names}
              className="absolute bottom-[16.26px] left-4 max-md:right-4"
            />
            {tasksOpen && (
              <TasksOverlay
                tasks={run.tasks}
                summary={run.tasksSummary}
                onClose={() => setTasksOpen(false)}
                onSelect={() => setTasksOpen(false)}
              />
            )}
          </>
        }
      >
        <div
          className="absolute top-[165px] left-[43px] origin-top-left"
          style={{ transform: `scale(${APPROVAL_MAP_SCALE})` }}
        >
          <FlowMap
            nodes={run.map.nodes}
            edges={run.map.edges}
            width={LAUNCH_MAP.width}
            height={LAUNCH_MAP.height}
            onNodeClick={(n) => {
              if (n.id === 'ready') {
                setInspecting(null);
                setPanelOpen(true);
              } else setInspecting(n.id);
            }}
          />
        </div>
      </MapCanvas>
    </AppShell>
  );
}
