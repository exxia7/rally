import { useEffect, useMemo, useRef, useState } from 'react';

import checkBadge from '@/assets/icons/check-badge.svg';
import lockAmber from '@/assets/icons/lock-amber-10.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { RUN_MAP_SCALE, runMapFocus } from '@/components/map/runMapView';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { ApprovalItem, type ApprovalState } from '@/components/panels/Cards';
import { InspectorHeader } from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { useConnectTool } from '@/components/planning/useConnectTool';
import { InspectorPanel } from '@/components/run/InspectorPanel';
import { inspectorFromNode } from '@/components/run/RunScreenLayout';
import { TasksDropdown } from '@/components/run/TasksDropdown';
import { AppShell } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { planFrame, useGo, useRunFrameSync } from '@/state/nav';
import {
  AD_TEST,
  adLimitNote,
  overAdLimit,
  blockedOutput,
} from '@/state/permissions';
import {
  agentNames,
  approvalItems,
  approvalsOf,
  approvalWaiting,
  chosenFork,
  goesOut,
  money,
  runCost,
  runData,
} from '@/state/runView';
import { dispatch, useAppState, useWorkflow } from '@/state/store';

import { LAUNCH_MAP } from './launchMap';

export const screenId = '5.1';

// Figma 5.1 "Approval" (2362:25491): the finished run map (drawn at 0.68 beside the docked panel) and the
// "Ready to post" approval panel. Approve / Don't post / Undo change each item; "Approve all" approves what's
// left and opens the launch summary (5.2).
export default function ApprovalScreen() {
  const go = useGo();
  const wf = useWorkflow();
  useRunFrameSync('5.1');
  // Permissions/settings agent (3d, 3e): LinkedIn's workspace connection and the workflow's ad limit. A frame as drawn
  // keeps Figma's text.
  const app = useAppState();
  const [connectDialog, connect] = useConnectTool();
  const blockedBy = (id: string) => !!blockedOutput(app, wf, id);
  const [panelOpen, setPanelOpen] = useState(true);
  const xl = useMediaQuery('(min-width: 1280px)');
  // A map card other than "Ready to post" opens its own (read-only) inspector instead of the approval panel.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Items, states and counts all come from the store, so a choice survives Edit, Back or the Tasks chip.
  const run = useMemo(() => runData(wf), [wf]);
  const items = useMemo(() => approvalItems(wf), [wf]);
  const names = useMemo(() => agentNames(wf), [wf]);
  // The chosen version's items and approvals (the original's until you pick a fork with "Use this version").
  const approvals = approvalsOf(wf);
  const version = chosenFork(wf);
  const stateOf = (id: string): ApprovalState => approvals[id] ?? 'waiting';
  const waiting = items.filter((i) => stateOf(i.id) === 'waiting').length;
  const pill = approvalWaiting(wf);
  const cost = money(runCost(wf));
  const publisher = wf.helpers.publisher?.name ?? 'Publisher';
  const inspected = inspecting
    ? run.map.nodes.find((n) => n.id === inspecting)
    : undefined;
  // A map card or its Tasks row: "Ready to post" opens the approval panel, any other step its inspector.
  const openNode = (id: string) => {
    if (id === 'ready') {
      setInspecting(null);
      setPanelOpen(true);
    } else setInspecting(id);
  };
  const launch = () => {
    for (const i of items)
      if (stateOf(i.id) === 'waiting')
        dispatch({
          type: 'approval/set',
          output: i.id,
          // Not connected: it can't post, so it doesn't go out.
          value: blockedBy(i.id) ? 'wont-post' : 'approved',
        });
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
                <div className="flex w-full shrink-0 flex-col">
                  <InspectorHeader
                    eyebrow={`Approval · ${publisher}`}
                    kindIcon={null}
                    branch={version?.name}
                    branchColor={version && `bg-fork-${version.n}`}
                    branchTextColor={version && `text-fork-${version.n}`}
                    title="Ready to post"
                    meta="Nothing goes out until you approve it."
                    onClose={() => setPanelOpen(false)}
                  />
                </div>
              }
              bodyClassName="px-6 pb-5 max-md:px-4"
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
                    needs={
                      blockedBy(item.id)
                        ? {
                            note: 'LinkedIn isn’t connected, so this can’t post yet.',
                            action: 'Connect LinkedIn to post',
                            onAction: () => connect('LinkedIn'),
                          }
                        : undefined
                    }
                    onChange={(s) =>
                      dispatch({
                        type: 'approval/set',
                        output: item.id,
                        value: s,
                      })
                    }
                    // Edit changes the text in place (ApprovalItem's own Text area); the store keeps it, so a
                    // reopened panel and 5.2's "What went out" show your text.
                    onBodyChange={(text) =>
                      dispatch({ type: 'approval/edit', output: item.id, text })
                    }
                    className={`w-full shrink-0 ${item.minH}`}
                  />
                ))}
                <div className="flex w-full shrink-0 flex-col items-start rounded-[10px] border border-dashed border-line-2 p-3.5">
                  <div className="flex w-full items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] text-muted">
                      $300 ad test
                    </p>
                    {wf.asDrawn || overAdLimit(wf) ? (
                      <Badge
                        tone="subtle"
                        icon={<Icon src={lockAmber} size={10} />}
                      >
                        Blocked by your rules
                      </Badge>
                    ) : (
                      <Badge tone="green">Within your limit</Badge>
                    )}
                  </div>
                  {wf.asDrawn ? (
                    <p className="w-full pt-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                      Ads are blocked in Permissions. Change the rule to approve
                      this.
                    </p>
                  ) : (
                    // 3e: it's a limit, not a block; "Change rule" opens the workflow's Permissions and comes back.
                    <>
                      <p className="w-full pt-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                        {overAdLimit(wf)
                          ? `${adLimitNote(wf)} Raise the limit to run it.`
                          : `This $${AD_TEST} ad test is within your $${wf.permissions.adLimit} ad limit. It runs with the launch.`}
                      </p>
                      <div className="flex w-full items-center pt-2.5">
                        <Button
                          size="sm"
                          onClick={() =>
                            go('2.8', {
                              returnHere: true,
                              state: { section: 'permissions' },
                            })
                          }
                        >
                          Change rule
                        </Button>
                      </div>
                    </>
                  )}
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
        contentScale={RUN_MAP_SCALE}
        viewKey={`run:${app.activeId}`}
        focus={runMapFocus(run.map.nodes, LAUNCH_MAP)}
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TasksDropdown
              outputs={goesOut(wf)}
              motionKey={`run:${app.activeId}:tasks`}
              tasks={run.tasks}
              done={wf.asDrawn ? 9 : undefined}
              total={wf.asDrawn ? 10 : undefined}
              onSelectTask={(t) => t.id && openNode(t.id)}
              // Under 1280px the panel covers the map: opening the list closes it.
              onOpen={() => {
                if (xl) return;
                setInspecting(null);
                setPanelOpen(false);
              }}
            />
            <CompletedAgents
              agents={run.completed}
              names={names}
              className="absolute bottom-4 left-4 max-md:right-4"
            />
          </>
        }
      >
        {/* Drawn as on every run screen (5.2 too), not Figma's smaller redraw beside the docked panel. */}
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
      {/* Permissions/settings agent (3d): the connect step for "Connect LinkedIn to post". */}
      {connectDialog}
    </AppShell>
  );
}
