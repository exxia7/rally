import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

import actionGlyph from '@/assets/icons/node-kind-action-glyph.svg';
import outputGlyph from '@/assets/icons/node-kind-output-glyph.svg';
import taskGlyph from '@/assets/icons/node-kind-task-glyph.svg';
import play16 from '@/assets/icons/play-16.svg';
import type { AgentName } from '@/components/agents/characters';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import type { Branch } from '@/components/fork/branches';
import { useForkRunView } from '@/components/fork/useForkRunView';
import { TaskProgressChip } from '@/components/map/CanvasControls';
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
import { useAppState } from '@/state/store';

import { HandRaisePanel, type HandRaiseData } from './HandRaisePanel';
import { InspectorPanel, type InspectorData } from './InspectorPanel';
import {
  RunSidePanel,
  type RunChatMessage,
  type SandboxStep,
} from './RunSidePanel';
import type { SandboxSection } from './SandboxPanel';
import { TasksOverlay, type TaskItem } from './TasksOverlay';

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
  /** Tasks chip text and bar during a rerun ("Rerunning", no bar); `width` pins Figma's chip width. */
  tasksChip?: {
    label?: string;
    progress?: number | null;
    width?: number;
    /** On a fork the bar takes the fork's colour (6.5: "Vs Penny · 1 of 3 done"). */
    fork?: ForkNumber;
  };
  /** Tasks overlay variant (4.2-tasks: a Close link, no progress bar). */
  tasksOverlay?: { showClose?: boolean; showProgress?: boolean };
};

export type RunPanel =
  | { kind: 'tabs'; tab: PanelTab }
  | { kind: 'inspector'; nodeId: string; forkOpen?: boolean }
  | { kind: 'hand-raise' }
  /** A branch's "Ready to post" once the run has forks: the approval scoped to that branch. */
  | { kind: 'approval'; branch: string }
  | null;

const STAGE = { width: 1362, docked: 954, height: 830 };
const DEFAULT_DOCKED = { x: 43, y: 165, width: 874 };
const XL = '(min-width: 1280px)';

// The run screen (3.2–3.5, reused by Stuck 4.x and Rerun/fork 6.x with their own data): workflow top bar, the
// pannable run map with its canvas overlays (Tasks chip and anchored Tasks overlay, Completed agents, zoom), and
// an optional side panel: the Chat · Sandbox · Decisions tabs or a node's inspector. All of it is local state;
// `initial*` props pick the frame a route opens on. With the panel docked (≥1280px) the canvas narrows to 954px
// and the map is redrawn at `map.docked`; below 1280 the panel overlays the full-size map. Between 1280 and 1440 the
// docked canvas is narrower than 954px, so the stage starts scaled down to fit its width (as Fit view would).
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
  // While a hand is raised the run waits for you: Resume opens the hand-raise panel instead.
  const togglePause = () => {
    if (status?.state === 'waiting' && data.handRaise && paused)
      setPanel({ kind: 'hand-raise' });
    else if (onPauseToggle) onPauseToggle();
    else setPaused((p) => !p);
  };
  const [panel, setPanel] = useState<RunPanel>(initialPanel);
  // Forks (store): every branch drawn, the Branches row, fork-scoped approval, the inline Fork card.
  const forks = useForkRunView({
    data: frameData,
    drawn: drawnForks,
    panel,
    setPanel,
    inline: !onInspectorFork,
  });
  const data = forks.data;
  const [tasksOpen, setTasksOpen] = useState(initialTasksOpen);
  // Motion memory for this workflow's run (src/lib/motion.ts): a hand raised while you watch slides its panel in.
  const scope = `run:${useAppState().activeId}`;
  const asideFrom = useChangedFrom(`${scope}:aside`, panel?.kind ?? 'none');
  const [takenOver, setTakenOver] = useState<Set<string>>(() => new Set());

  const { map } = data;
  const docked = xl && panel !== null;
  const place = docked ? (map.docked ?? DEFAULT_DOCKED) : (map.full ?? map);
  const scale = place.width / map.width;

  const inspect = (nodeId: string) => setPanel({ kind: 'inspector', nodeId });
  const onNodeClick = (node: MapNode) => {
    const branchPanel = forks.nodePanel(node);
    if (branchPanel) setPanel(branchPanel);
    else if (nodeLinks?.[node.id]) go(nodeLinks[node.id]);
    else if (node.avatar?.state === 'hand-raised') {
      if (data.handRaise) setPanel({ kind: 'hand-raise' });
      else go(handRaisedScreen);
    } else inspect(node.id);
  };
  const confirmHandRaise = onHandRaiseConfirm ?? (() => go('4.1b'));

  // Phones open the map on the node that needs you, else the first one working.
  const focusNode =
    map.nodes.find(
      (n) => n.state === 'needs-you' || n.avatar?.state === 'hand-raised'
    ) ?? map.nodes.find((n) => n.state === 'working');
  const focus = focusNode && {
    x: map.x + focusNode.x + (focusNode.width ?? 175.2) / 2,
    y: map.y + focusNode.y + 60,
  };

  const inspected =
    panel?.kind === 'inspector'
      ? map.nodes.find((n) => n.id === panel.nodeId)
      : undefined;

  let aside: ReactNode = null;
  if (panel?.kind === 'hand-raise' && data.handRaise)
    aside = (
      <HandRaisePanel
        data={data.handRaise}
        className={
          asideFrom !== undefined && asideFrom !== 'hand-raise'
            ? 'pf-slide-in'
            : undefined
        }
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
          onInspectorRerun ? onInspectorRerun(inspected.id) : go('6.1')
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
    <AppShell aside={aside}>
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
          <Button
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
        // Remount on dock/undock so the stage re-centres at its new size.
        key={docked ? 'docked' : 'full'}
        stageWidth={docked ? STAGE.docked : STAGE.width}
        stageHeight={STAGE.height}
        fitWidth={docked}
        focus={focus}
        // Phones: a hand-raise or inspector opens as a half-height sheet, so keep the card above it.
        focusAt={panel && panel.kind !== 'tabs' ? 0.2 : 0.5}
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TaskProgressChip
              motionKey={`${scope}:tasks`}
              done={data.tasks.filter((t) => t.state === 'done').length}
              total={data.tasks.length}
              label={data.tasksChip?.label}
              progress={data.tasksChip?.progress}
              fork={data.tasksChip?.fork}
              open={tasksOpen}
              onClick={() => setTasksOpen((o) => !o)}
              className={clsx(
                'absolute top-4 left-4',
                !data.tasksChip && 'w-[208px]'
              )}
              style={
                data.tasksChip?.width
                  ? { width: data.tasksChip.width }
                  : undefined
              }
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
            {tasksOpen && (
              <TasksOverlay
                tasks={data.tasks}
                summary={data.tasksSummary}
                showClose={data.tasksOverlay?.showClose}
                showProgress={data.tasksOverlay?.showProgress}
                onClose={() => setTasksOpen(false)}
                onSelect={(t) => {
                  setTasksOpen(false);
                  if (t.id) inspect(t.id);
                }}
              />
            )}
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
