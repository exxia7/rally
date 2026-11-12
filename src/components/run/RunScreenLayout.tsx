import { backendCommand } from '@/state/backend';
import { baseStep, branchId } from '@/state/backendViews';
import { affectedSteps } from '../../../shared/domain';
import { ConfirmDialog } from '@/components/panels/ConfirmDialog';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import actionGlyph from '@/assets/icons/node-kind-action-glyph.svg';
import outputGlyph from '@/assets/icons/node-kind-output-glyph.svg';
import taskGlyph from '@/assets/icons/node-kind-task-glyph.svg';
import play16 from '@/assets/icons/play-16.svg';
import type { AgentName } from '@/components/agents/characters';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import type { Branch } from '@/components/fork/branches';
import { useForkRunView } from '@/components/fork/useForkRunView';
import {
  FlowMap,
  type ForkLine,
  type MapEdge,
  type MapNode,
  type MapOverlay,
} from '@/components/map/FlowMap';
import type { ForkNumber } from '@/components/map/forks';
import { MapCanvas } from '@/components/map/MapCanvas';
import type { NodeKindName } from '@/components/map/NodeKind';
import { RUN_MAP_SCALE, runMapFocus } from '@/components/map/runMapView';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import type { Decision } from '@/components/panels/DecisionLog';
import type { PanelTab } from '@/components/panels/PanelTabs';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PauseIcon } from '@/components/ui/PauseIcon';
import type { RunState } from '@/components/ui/RunStatus';
import { useChangedFrom } from '@/lib/motion';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useGo } from '@/state/nav';
import { goesOut } from '@/state/runView';
import { useAppState, useWorkflow } from '@/state/store';

import { HandRaisePanel, type HandRaiseData } from './HandRaisePanel';
import { InspectorPanel, type InspectorData } from './InspectorPanel';
import {
  RunSidePanel,
  type RunChatMessage,
  type SandboxStep,
} from './RunSidePanel';
import type { SandboxSection } from './SandboxPanel';
import { TasksDropdown, type TaskItem } from './TasksDropdown';

export type RunMap = {
  nodes: MapNode[];
  edges: MapEdge[];
  overlays?: MapOverlay[];
  /** Fork lines joining fork lanes to the path they forked from (4.5, 6.5, 6.6). */
  forkLines?: ForkLine[];
  /** Placement on the 1362×830 canvas stage (side panel closed). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Placement on the 954px stage when the side panel is docked: Figma redraws the map smaller. */
  docked?: { x: number; y: number; width: number };
  /** Placement with the side panel closed, when it differs from x/y/width at map scale: a map grown by fork
   *  lanes is drawn smaller so it still fits the stage. */
  full?: { x: number; y: number; width: number };
};

/** Everything a run screen shows; each workflow/rerun/fork variant passes its own. */
export type RunData = {
  map: RunMap;
  completed: AgentName[];
  tasks: TaskItem[];
  tasksSummary?: string;
  sandbox: SandboxSection[];
  decisions: Decision[];
  decisionsMore?: string;
  chat: RunChatMessage[];
  chatSuggestions?: string[];
  /** Inspector content per node id; other nodes get one built from their card. */
  inspectors?: Record<string, InspectorData>;
  /** A helper raised its hand (4.1, 4.3): the side panel's hand-raise content. */
  handRaise?: HandRaiseData;
  /** Tasks header text and bar during a rerun ("Rerunning", no bar). */
  tasksChip?: {
    label?: string;
    progress?: number | null;
    /** On a fork the bar takes the fork's colour (6.5: "Vs Penny · 1 of 3 done"). */
    fork?: ForkNumber;
  };
};

export type RunPanel =
  | { kind: 'tabs'; tab: PanelTab }
  | { kind: 'inspector'; nodeId: string; forkOpen?: boolean }
  | { kind: 'hand-raise' }
  /** A branch's "Ready to post" once the run has forks: the approval scoped to that branch. */
  | { kind: 'approval'; branch: string }
  | null;

const STAGE = { width: 1362, height: 830 };
const XL = '(min-width: 1280px)';

// The run screen (3.2–3.5, reused by Stuck 4.x and Rerun/fork 6.x with their own data): workflow top bar, the
// pannable run map with its canvas overlays (Tasks chip and anchored Tasks overlay, Completed agents, zoom), and
// an optional side panel: the Chat · Sandbox · Decisions tabs or a node's inspector. All of it is local state;
// `initial*` props pick the frame a route opens on. With the panel docked (≥1280px) the canvas narrows; below 1280
// the panel overlays the map. The map is drawn the same way in both; MapCanvas picks a readable zoom and keeps it.
// A helper's raised hand opens `data.handRaise` in the side panel (or `handRaisedScreen` when there is none).
export function RunScreenLayout({
  data: frameData,
  drawnForks,
  title,
  initialPanel = null,
  initialTasksOpen = false,
  initialPaused = false,
  cost = '$0.18',
  status,
  handRaisedScreen = '4.1',
  canvasOverlay,
  onHandRaiseConfirm,
  onNodeRerun,
  onInspectorRerun,
  onInspectorFork,
  onForkCreate,
  nodeLinks,
  paused: pausedProp,
  onPauseToggle,
  agentNames,
  planningTarget = '2.3',
  onEditNode,
}: {
  data: RunData;
  /** The forks this frame draws, with Figma's names and briefs (4.5, 6.5, 6.6): a fork you created in the same
   *  colour is shown under your name. */
  drawnForks?: Branch[];
  title?: string;
  initialPanel?: RunPanel;
  initialTasksOpen?: boolean;
  initialPaused?: boolean;
  /** Spend shown in the status pill. */
  cost?: string;
  /** Override the status pill (e.g. a hand-raised run). Default: running / paused from the Pause button. */
  status?: { state: RunState; label: string; hidden?: boolean };
  /** Where a node whose helper raised its hand leads. */
  handRaisedScreen?: string;
  /** Extra canvas overlays (pinned to the viewport); a function gets the open panel (6.4's Branches row shows
   *  while a fork is being set up). */
  canvasOverlay?: ReactNode | ((panel: RunPanel) => ReactNode);
  /** The hand-raise panel's last button (default: open the rerun confirm frame 4.1b). */
  onHandRaiseConfirm?: (choices?: number[], other?: string) => void;
  /** A map card's own Rerun button (hand-raised cards). Default: same as `onHandRaiseConfirm`. */
  onNodeRerun?: (node: MapNode) => void;
  /** Inspector "Rerun from here" (default: 6.1). */
  onInspectorRerun?: (nodeId: string) => void;
  /** Inspector "Fork from here" (default: 6.1). */
  onInspectorFork?: (nodeId: string) => void;
  /** Create fork in an inspector's Fork card (4.4 → 4.5, 6.4 → 6.5). */
  onForkCreate?: (nodeId: string, instruction: string) => void;
  /** Nodes that lead to another frame instead of their inspector (node id → screen id). */
  nodeLinks?: Record<string, string>;
  /** Controlled pause (the store's run.paused); without it, Pause is local state. */
  paused?: boolean;
  onPauseToggle?: () => void;
  /** Renamed helpers for the agents bar (character → name). */
  agentNames?: Partial<Record<AgentName, string>>;
  /** Where the Planning toggle goes. */
  planningTarget?: string;
  /** Inspector "Edit" (default: the 2.4 drawer frame). */
  onEditNode?: (nodeId: string) => void;
}) {
  const go = useGo();
  const xl = useMediaQuery(XL);
  const [localPaused, setPaused] = useState(initialPaused);
  const paused = pausedProp ?? localPaused;
  // While a hand is raised the run waits for you: Resume (and the card with the raised hand) opens the hand-raise
  // panel instead, or, when it's already open, brings it to the step you haven't answered (HandRaisePanel `nudge`).
  const [handNudge, setHandNudge] = useState(0);
  const showHandRaise = () => {
    setPanel({ kind: 'hand-raise' });
    setHandNudge((n) => n + 1);
  };
  const togglePause = () => {
    if (status?.state === 'waiting' && data.handRaise && paused)
      showHandRaise();
    else if (onPauseToggle) onPauseToggle();
    else setPaused((p) => !p);
  };
  // Under 1280px a panel covers the map, so a `*-tasks` frame opens only the Tasks list there.
  const [panel, setPanel] = useState<RunPanel>(
    initialTasksOpen && !xl ? null : initialPanel
  );
  // Forks (store): every branch drawn, the Branches row, fork-scoped approval, the inline Fork card.
  const forks = useForkRunView({
    data: frameData,
    drawn: drawnForks,
    panel,
    setPanel,
    inline: !onInspectorFork,
  });
  const data = forks.data;
  // Motion memory for this workflow's run (src/lib/motion.ts): a hand raised while you watch slides its panel in.
  const { activeId } = useAppState();
  const scope = `run:${activeId}`;
  // The Tasks list's "Goes out": the plan's outputs and where each is in the run.
  const wf = useWorkflow();
  const [rerunNode, setRerunNode] = useState<string | null>(null);
  const questionKey = data.handRaise?.steps[0]?.problem.title;
  const backendId = wf.backend?.id;
  useEffect(() => { if (backendId && questionKey) setPanel({ kind: 'hand-raise' }); }, [questionKey, backendId]);
  const outputs = useMemo(() => goesOut(wf), [wf]);
  const asideFrom = useChangedFrom(`${scope}:aside`, panel?.kind ?? 'none');
  const [takenOver, setTakenOver] = useState<Set<string>>(() => new Set());

  const { map } = data;
  // One placement whatever the panel does: the canvas keeps its zoom as the panel docks (MapCanvas), instead of
  // Figma's smaller redraw of the map beside a docked panel (`map.docked`).
  const place = map.full ?? map;
  const scale = place.width / map.width;
  // Generated plans and fork lanes can grow beyond the original Figma frame.
  // Give the whole map a scrollable stage instead of clipping it at 830px.
  const stageWidth = Math.max(STAGE.width, place.x + map.width * scale + 40);
  const stageHeight = Math.max(STAGE.height, place.y + map.height * scale + 40);

  const inspect = (nodeId: string) => setPanel({ kind: 'inspector', nodeId });
  const onNodeClick = (node: MapNode) => {
    if (wf.backend && node.id === 'ready' && !wf.forks.length) { if (wf.run.phase === 'launched') go('5.2'); else if (wf.run.phase === 'awaitingApproval') go('5.1'); return; }
    const branchPanel = forks.nodePanel(node);
    if (branchPanel) setPanel(branchPanel);
    else if (nodeLinks?.[node.id]) go(nodeLinks[node.id]);
    else if (node.avatar?.state === 'hand-raised') {
      if (data.handRaise) showHandRaise();
      else go(handRaisedScreen);
    } else inspect(node.id);
  };
  const confirmHandRaise = onHandRaiseConfirm ?? (() => go('4.1b'));

  // The map keeps the node that needs you in view (else the first one working, else Ready to post).
  const focus = runMapFocus(map.nodes, place, scale);

  const inspected =
    panel?.kind === 'inspector'
      ? map.nodes.find((n) => n.id === panel.nodeId)
      : undefined;

  let aside: ReactNode = null;
  if (panel?.kind === 'hand-raise' && data.handRaise)
    aside = (
      <HandRaisePanel
        data={data.handRaise}
        // A hand raised while you watch slides its panel in, even over another open panel.
        enter={asideFrom !== undefined && asideFrom !== 'hand-raise'}
        nudge={handNudge}
        onClose={() => setPanel(null)}
        onConfirm={confirmHandRaise}
      />
    );
  else if (panel?.kind === 'approval')
    aside = forks.renderApproval(panel.branch);
  else if (panel?.kind === 'tabs')
    aside = (
      <RunSidePanel
        tab={panel.tab}
        onTabChange={(tab) => setPanel({ kind: 'tabs', tab })}
        onClose={() => setPanel(null)}
        sandbox={data.sandbox}
        decisions={data.decisions}
        decisionsMore={data.decisionsMore}
        chat={data.chat}
        chatSuggestions={data.chatSuggestions}
        onDecisionChange={() => setPanel({ kind: 'tabs', tab: 'chat' })}
        steps={notStartedSteps(data)}
        onDecisionFork={() => go('4.4')}
        typing={
          paused || status?.state === 'waiting'
            ? undefined
            : typingHelper(data, agentNames)
        }
      />
    );
  const inspectorData =
    inspected &&
    forks.inspector(
      data.inspectors?.[inspected.id] ?? inspectorFromNode(inspected),
      inspected
    );
  if (!aside && inspected && inspectorData)
    aside = (
      <InspectorPanel
        key={inspected.id}
        data={inspectorData}
        onClose={() => setPanel(null)}
        forkOpen={panel?.kind === 'inspector' && !!panel.forkOpen}
        onForkOpenChange={(forkOpen) =>
          setPanel({ kind: 'inspector', nodeId: inspected.id, forkOpen })
        }
        onForkCreate={(text) =>
          onForkCreate
            ? onForkCreate(inspected.id, text)
            : forks.create(inspected.id, text, inspectorData)
        }
        onFork={() =>
          onInspectorFork ? onInspectorFork(inspected.id) : go('6.1')
        }
        onRerun={() =>
          wf.backend ? setRerunNode(inspected.id) : onInspectorRerun ? onInspectorRerun(inspected.id) : go('6.1')
        }
        onEdit={() =>
          onEditNode
            ? onEditNode(inspected.id)
            : go('2.4', { returnHere: true })
        }
        takenOver={takenOver.has(inspected.id)}
        onTakeOver={() =>
          setTakenOver((prev) => {
            const next = new Set(prev);
            if (!next.delete(inspected.id)) next.add(inspected.id);
            return next;
          })
        }
      />
    );

  return (
    <AppShell aside={aside} overlay={wf.backend && rerunNode ? <ConfirmDialog open onClose={() => setRerunNode(null)}
      title={`Rerun ${wf.helpers[baseStep(rerunNode)]?.name ?? 'this step'}?`}
      body="This step and its dependent steps will produce new versions. Earlier work stays available."
      note={{ label: 'What should change?', defaultValue: '', placeholder: 'Make it shorter…' }}
      affected={[...affectedSteps(wf.backend.plan!, baseStep(rerunNode))].map(id => ({ key: id, art: null, name: wf.helpers[id].name, detail: wf.helpers[id].description }))}
      cost="Real Claude run · no external posts" confirmLabel="Rerun"
      onConfirm={(_, note) => { void backendCommand(wf.id, { type: 'rerun', branch: branchId(wf, rerunNode), step: baseStep(rerunNode), text: note || 'Improve this output.', fork: false }).then(result => { if (result) { setRerunNode(null); setPanel(null); } }); }} /> : undefined}>
      <WorkflowTopBar
        title={title}
        view="flowchart"
        onViewChange={(v) => v === 'planning' && go(planningTarget)}
        status={
          status?.hidden
            ? undefined
            : (status?.state ?? (paused ? 'paused' : 'running'))
        }
        statusLabel={
          status?.hidden
            ? undefined
            : forks.costLabel(
                status?.label ?? `${paused ? 'Paused' : 'Running'} · ${cost}`
              )
        }
        onSettings={() => go('2.8', { returnHere: true })}
        panelOpen={panel !== null}
        onTogglePanel={() =>
          setPanel((p) => (p ? null : { kind: 'tabs', tab: 'sandbox' }))
        }
        action={
          (!wf.backend || wf.backend.branches.some((branch) =>
            ['running', 'paused', 'needs_input', 'failed'].includes(branch.status)
          )) && <Button
            leading={paused ? <Icon src={play16} size={16} /> : <PauseIcon />}
            onClick={togglePause}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="max-md:px-2"
          >
            {/* Icon-only on phones. */}
            <span className="max-md:hidden">{paused ? 'Resume' : 'Pause'}</span>
          </Button>
        }
      />
      <MapCanvas
        stageWidth={stageWidth}
        stageHeight={stageHeight}
        contentScale={RUN_MAP_SCALE * scale}
        viewKey={`run:${activeId}`}
        focus={focus}
        // Phones: a hand-raise or inspector opens as a half-height sheet, so keep the card above it.
        focusAt={panel && panel.kind !== 'tabs' ? 0.2 : 0.5}
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TasksDropdown
              outputs={outputs}
              motionKey={`${scope}:tasks`}
              tasks={data.tasks}
              note={data.tasksSummary}
              label={data.tasksChip?.label}
              progress={data.tasksChip?.progress}
              fork={data.tasksChip?.fork}
              defaultOpen={initialTasksOpen}
              // Under 1280px the panel covers the map: opening the list closes it.
              onOpen={() => !xl && setPanel(null)}
              // A row does what clicking its card does (inspector, hand-raise panel, a fork's approval).
              onSelectTask={(t) => {
                const node = map.nodes.find((n) => n.id === t.id);
                if (node) onNodeClick(node);
              }}
            />
            <CompletedAgents
              motionKey={`${scope}:done`}
              agents={data.completed}
              names={agentNames}
              className="absolute bottom-4 left-4 max-md:right-4"
            />
            {typeof canvasOverlay === 'function'
              ? canvasOverlay(panel)
              : canvasOverlay}
            {forks.overlay}
          </>
        }
      >
        <div
          className="absolute origin-top-left"
          style={{
            left: place.x,
            top: place.y,
            transform: scale === 1 ? undefined : `scale(${scale})`,
          }}
        >
          <FlowMap
            nodes={map.nodes}
            edges={map.edges}
            overlays={map.overlays}
            forkLines={map.forkLines}
            width={map.width}
            height={map.height}
            onNodeClick={onNodeClick}
            onNodeRerun={onNodeRerun ?? (() => confirmHandRaise())}
          />
        </div>
      </MapCanvas>
    </AppShell>
  );
}

const KIND_LABEL: Record<NodeKindName, string> = {
  task: 'Task',
  action: 'Action',
  decision: 'Decision',
  output: 'Output',
};
const KIND_GLYPH: Record<NodeKindName, string | null> = {
  task: taskGlyph,
  action: actionGlyph,
  decision: null,
  output: outputGlyph,
};

// The helper the run Chat shows typing: the first one working on the map.
function typingHelper(
  data: RunData,
  names?: Partial<Record<AgentName, string>>
) {
  const n = data.map.nodes.find(
    (x) => x.avatar?.state === 'working' || (x.state === 'working' && x.avatar)
  );
  if (!n?.avatar) return undefined;
  const agent = n.avatar.agent;
  return { agent, name: names?.[agent] ?? n.agent ?? agent };
}

// Steps the Sandbox's "Add to…" menu offers: tasks that haven't started, named by their helper.
function notStartedSteps(data: RunData): SandboxStep[] {
  return data.tasks
    .filter((t) => t.state === 'waiting' && t.id)
    .flatMap((t) => {
      const n = data.map.nodes.find((x) => x.id === t.id);
      return n ? [{ id: n.id, name: n.agent ?? n.title, detail: n.title }] : [];
    });
}

// Inspector content for a node without hand-written inspector data, built from its map card. 5.1 and 5.2 use it
// read-only for the finished run's cards.
// eslint-disable-next-line react-refresh/only-export-components -- a plain helper shared with the approval screens
export function inspectorFromNode(n: MapNode): InspectorData {
  const working = n.state === 'working';
  const notStarted = n.state === 'waiting' || n.status?.text.startsWith('Wait');
  const who = n.agent ?? 'this helper';
  return {
    eyebrow: KIND_LABEL[n.kind],
    kindIcon: KIND_GLYPH[n.kind],
    branch: 'Original path',
    title: n.title,
    meta: [n.agent, n.status?.text].filter(Boolean).join(' · '),
    preview: n.preview && {
      eyebrow: `${n.agent ?? 'Helper'} wrote`,
      quote: n.preview.text,
      working,
      action: null,
    },
    fork: {
      description: 'Try another direction. The original path stays as it is.',
    },
    rerun: {
      description: working
        ? `Available once ${who} finishes. Earlier steps stay as they are.`
        : notStarted
          ? 'Available once this step has run.'
          : 'Run this step again. Earlier steps stay as they are.',
      disabled: working || notStarted,
    },
    fields: [
      ...(n.lead ? [{ label: 'Brief', value: n.lead }] : []),
      ...(n.status ? [{ label: 'Status', value: n.status.text }] : []),
      ...(n.asksYouFirst
        ? [{ label: 'Permission', value: 'Asks you before it goes out.' }]
        : []),
    ],
  };
}
