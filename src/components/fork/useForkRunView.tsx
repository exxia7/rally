import { useState, type ReactNode } from 'react';

import type { MapNode } from '@/components/map/FlowMap';
import type { ForkNumber } from '@/components/map/forks';
import type { ApprovalState } from '@/components/panels/Cards';
import { FORK_CARD_OPTIONS } from '@/components/panels/forkCardOptions';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData, RunPanel } from '@/components/run/RunScreenLayout';
import { approvalItems } from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';

import {
  type Branch,
  type BranchId,
  branchFromFork,
  branchOfNode,
  forkBranchId,
  forkFromBranch,
  forkNameFromInput,
  mergeBranches,
  nextForkNumber,
} from './branches';
import { BranchesRow } from './BranchesRow';
import {
  ForkApprovalPanel,
  type ForkApprovalItem,
  type VersionLine,
} from './ForkApprovalPanel';
import {
  renameRun,
  renameSwaps,
  swapText,
  viewBranches,
  withForkLane,
  withInlineForkForm,
} from './forkMapView';

// Forks on a run screen, from the store: RunScreenLayout calls this once and gets back the run data with every
// branch drawn (drawn forks renamed to your names, a lane for each fork no frame draws, focus and the chosen version
// applied), the Branches row, the fork-scoped approval panel, and the inline Fork card. With no forks it hands the
// data back untouched, and a frame as drawn (`asDrawn`, a direct load) never shows the row, so Figma frames stay
// exact.

export type CreateForkInput = {
  /** The step forked (run-map node id). */
  from: string;
  /** Its branch ('original' or `fork-<n>`). */
  parent: BranchId;
  /** The Fork card's instruction (chip text or typed). */
  instruction: string;
  /** The card's chips (to name the fork after a chosen chip). */
  options?: { label: string; text: string }[];
  /** The name the frame this fork opens on draws it with (6.4 → 6.5 "Vs Penny"), kept for the card's first chip. */
  drawnName?: string;
  /** Fork colours the screen already shows. */
  used?: number[];
};

/** Creates a fork named from the Fork card's input (finding 2g) and returns it, or null when all colours are taken. */
export function useCreateFork() {
  const wf = useWorkflow();
  return (input: CreateForkInput): Branch | null => {
    const n = nextForkNumber([
      ...(input.used ?? []),
      ...wf.forks.map((f) => f.n),
    ]);
    if (!n) return null;
    const branch: Branch & { fork: ForkNumber } = {
      id: forkBranchId(n),
      fork: n,
      name:
        forkNameFromInput(
          input.instruction,
          input.options ?? FORK_CARD_OPTIONS,
          input.drawnName
        ) ?? `Fork ${n}`,
      brief: input.instruction.trim(),
      parent: input.parent,
      from: input.from,
    };
    dispatch({ type: 'fork/create', fork: forkFromBranch(branch) });
    return branch;
  };
}

const forkNumbers = (nodes: MapNode[]) => [
  ...new Set(nodes.map((n) => n.fork).filter((f): f is ForkNumber => !!f)),
];

export function useForkRunView({
  data: drawnData,
  drawn = [],
  panel,
  setPanel,
  inline,
}: {
  data: RunData;
  /** The forks this frame draws, with the name and brief Figma gives them. */
  drawn?: Branch[];
  panel: RunPanel;
  setPanel: (p: RunPanel) => void;
  /** "Fork from here" opens a Fork card in place (false: the screen handles it). */
  inline: boolean;
}) {
  const wf = useWorkflow();
  const createFork = useCreateFork();
  const [focus, setFocus] = useState<BranchId | null>(null);
  // STATE: per-fork approvals belong in `forks[].approvals` (a 'fork/approval' action); the original's already use
  // 'approval/set'. Forks the frame draws but the store doesn't have keep theirs here.
  const [forkApprovals, setForkApprovals] = useState<
    Record<BranchId, Record<string, ApprovalState>>
  >({});
  // STATE: chosenVersion defaults to 'original', so "you picked the original" can't be told from "nothing picked
  // yet". An optional chosenVersion (undefined until "Use this version") would replace this flag.
  const [choseOriginal, setChoseOriginal] = useState(false);

  // Branches: Original + the frame's forks, renamed / added from the store.
  const live = wf.forks.map(branchFromFork);
  const branches = mergeBranches(drawn, live);
  const drawnNumbers = new Set(forkNumbers(drawnData.map.nodes));
  let data = renameRun(drawnData, renameSwaps(drawn, branches));
  for (const b of branches)
    if (b.fork && !drawnNumbers.has(b.fork)) data = withForkLane(data, b);
  const hasForks = branches.length > 1;
  const swaps = renameSwaps(drawn, branches);

  const chosen: BranchId | undefined =
    wf.chosenVersion !== 'original' &&
    branches.some((b) => b.id === wf.chosenVersion)
      ? wf.chosenVersion
      : choseOriginal && hasForks
        ? 'original'
        : undefined;
  const view =
    hasForks && (focus || chosen)
      ? viewBranches(data, (id) => id !== (focus ?? chosen), chosen)
      : data;

  const nodes = view.map.nodes;
  const nodeById = (id: string) => nodes.find((n) => n.id === id);
  const branchName = (id: BranchId) =>
    branches.find((b) => b.id === id)?.name ?? 'Original';
  const usedForks = [
    ...forkNumbers(nodes),
    ...branches.flatMap((b) => (b.fork ? [b.fork] : [])),
  ];
  const nextFork = nextForkNumber(usedForks);

  const inspectedBranch =
    panel?.kind === 'inspector'
      ? (() => {
          const n = nodeById(panel.nodeId);
          return n ? branchOfNode(n) : undefined;
        })()
      : panel?.kind === 'approval'
        ? panel.branch
        : undefined;

  /** The steps of a branch, in map order. */
  const laneOf = (id: BranchId) => nodes.filter((n) => branchOfNode(n) === id);

  // ---- Approval scoped to one branch ----

  const itemsFor = (b: Branch): ForkApprovalItem[] => {
    const all = approvalItems(wf);
    if (!b.fork) return all;
    const lane = laneOf(b.id);
    const owners = new Set(lane.map((n) => n.agent?.toLowerCase()));
    const scoped = all.filter((i) => owners.has(i.owner));
    // The lane's own copy replaces the original's where a step previews it ("X post").
    const copy = new Map(
      lane.flatMap((n) =>
        n.preview ? [[n.preview.label, n.preview.text]] : []
      )
    );
    return (scoped.length ? scoped : all).map((i) => ({
      ...i,
      body: copy.get(i.title) ?? i.body,
    }));
  };
  const statesFor = (b: Branch): Record<string, ApprovalState> =>
    b.fork
      ? {
          ...wf.forks.find((f) => forkBranchId(f.n) === b.id)?.approvals,
          ...forkApprovals[b.id],
        }
      : (wf.approvals as Record<string, ApprovalState>);
  const setState = (b: Branch, id: string, s: ApprovalState) => {
    if (!b.fork) dispatch({ type: 'approval/set', output: id, value: s });
    else
      setForkApprovals((all) => ({
        ...all,
        [b.id]: { ...all[b.id], [id]: s },
      }));
  };
  const lead = (b: Branch) => {
    const items = itemsFor(b);
    return (items.find((i) => i.id === 'x') ?? items[0])?.body ?? '';
  };

  const renderApproval = (branchId: BranchId): ReactNode => {
    const b = branches.find((x) => x.id === branchId) ?? branches[0];
    const items = itemsFor(b);
    const states = statesFor(b);
    const originalLead = lead(branches[0]);
    const compare: VersionLine[] = branches.map((x) => {
      const text = lead(x);
      return {
        branch: x,
        text: x.fork && text === originalLead && x.brief ? x.brief : text,
      };
    });
    const close = () => setPanel(null);
    return (
      <ForkApprovalPanel
        key={b.id}
        branch={b}
        items={items}
        states={states}
        onStateChange={(id, s) => setState(b, id, s)}
        compare={compare}
        chosen={chosen === b.id}
        onUseVersion={() => {
          // STATE: 'fork/choose' sets chosenVersion; Home, 5.1 and 5.2 should read it to post only this version.
          dispatch({ type: 'fork/choose', id: b.id });
          setChoseOriginal(b.id === 'original');
          setFocus(null);
        }}
        onApproveAll={() => {
          for (const i of items)
            if ((states[i.id] ?? 'waiting') === 'waiting')
              setState(b, i.id, 'approved');
        }}
        onEdit={() => {
          const first = laneOf(b.id).find((n) => n.agent);
          if (first) setPanel({ kind: 'inspector', nodeId: first.id });
        }}
        onClose={close}
        onDecideLater={close}
      />
    );
  };

  /** A branch's "Ready to post" opens its approval once the run has forks. */
  const nodePanel = (node: MapNode): RunPanel | undefined =>
    hasForks && /^ready(-f\d)?$/.test(node.id)
      ? { kind: 'approval', branch: branchOfNode(node) }
      : undefined;

  // ---- Inline Fork card ----

  const inspector = (insp: InspectorData, node: MapNode): InspectorData =>
    inline
      ? withInlineForkForm(insp, node, view.map, branchName(branchOfNode(node)))
      : insp;

  /** Create fork in an inline card: the new fork's lane appears here, with its first step open. */
  const create = (
    nodeId: string,
    instruction: string,
    insp?: InspectorData
  ) => {
    const node = nodeById(nodeId);
    if (!node) return;
    const b = createFork({
      from: nodeId,
      parent: branchOfNode(node),
      instruction,
      options: insp?.forkForm?.options,
      used: usedForks,
    });
    if (!b?.fork) return;
    // The new fork's lane is in focus, its first step open.
    setFocus(b.id);
    setPanel({
      kind: 'inspector',
      nodeId: `${nodeId.replace(/-f\d$/, '')}-f${b.fork}`,
    });
  };

  // ---- Branches row ----

  const openNewFork = () => {
    if (panel?.kind === 'inspector')
      return setPanel({ ...panel, forkOpen: true });
    const branch = focus ?? inspectedBranch ?? 'original';
    const lane = laneOf(branch);
    const start =
      lane.find((n) => n.id.replace(/-f\d$/, '') === 'writer') ??
      lane.find((n) => n.agent);
    if (start)
      setPanel({ kind: 'inspector', nodeId: start.id, forkOpen: true });
  };

  const forkOpen = panel?.kind === 'inspector' && !!panel.forkOpen;
  const overlay =
    hasForks && !wf.asDrawn ? (
      <BranchesRow
        branches={branches}
        selected={focus ?? inspectedBranch ?? chosen ?? 'original'}
        chosen={chosen}
        onSelect={(id) => setFocus((f) => (f === id ? null : id))}
        onNewFork={nextFork ? openNewFork : undefined}
        pendingFork={forkOpen ? nextFork : null}
      />
    ) : null;

  return {
    data: view,
    branches,
    chosen,
    overlay,
    nodePanel,
    renderApproval,
    inspector,
    create,
    /** A label with drawn fork names swapped for yours (the status pill's "Vs Penny · $0.24"). */
    swap: (s: string) => swapText(s, swaps),
  };
}
