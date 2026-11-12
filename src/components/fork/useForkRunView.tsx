import type { ReactNode } from 'react';

import type { MapNode } from '@/components/map/FlowMap';
import type { ForkNumber } from '@/components/map/forks';
import type { ApprovalState } from '@/components/panels/Cards';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData, RunPanel } from '@/components/run/RunScreenLayout';
import {
  branchApprovals,
  branchItems,
  withEditedText,
} from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';

import {
  type Branch,
  type BranchId,
  branchFromFork,
  branchOfNode,
  forkBranchId,
  forkFromBranch,
  forkName,
  mergeBranches,
  nextForkNumber,
} from './branches';
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

/** Creates a fork (named by its number) and returns it, or null when all colours are taken. */
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
      name: forkName(n),
      brief: input.instruction.trim(),
      parent: input.parent,
      from: input.from,
    };
    dispatch({ type: 'fork/create', fork: forkFromBranch(branch) });
    return branch;
  };
}

/** What one step of a fork lane spends (6.5's four-step Vs Penny lane: $0.06). */
const LANE_STEP_COST = 0.015;

const forkNumbers = (nodes: MapNode[]) => [
  ...new Set(nodes.map((n) => n.fork).filter((f): f is ForkNumber => !!f)),
];

export function useForkRunView({
  data: drawnData,
  drawn = [],
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

  // Branches: Original + the frame's forks, renamed / added from the store.
  const live = wf.forks.map(branchFromFork);
  const branches = mergeBranches(drawn, live);
  const drawnNumbers = new Set(forkNumbers(drawnData.map.nodes));
  let data = renameRun(drawnData, renameSwaps(drawn, branches));
  for (const b of branches)
    if (b.fork && !drawnNumbers.has(b.fork)) data = withForkLane(data, b);
  const hasForks = branches.length > 1;
  const swaps = renameSwaps(drawn, branches);

  // The version you chose ("Use this version"); undefined until you choose.
  const chosen: BranchId | undefined = branches.some(
    (b) => b.id === wf.chosenVersion
  )
    ? wf.chosenVersion
    : undefined;
  const view =
    hasForks && chosen
      ? viewBranches(data, (id) => id !== chosen, chosen)
      : data;

  const nodes = view.map.nodes;
  const nodeById = (id: string) => nodes.find((n) => n.id === id);
  const usedForks = [
    ...forkNumbers(nodes),
    ...branches.flatMap((b) => (b.fork ? [b.fork] : [])),
  ];
  const branchName = (id: BranchId) =>
    branches.find((b) => b.id === id)?.name ?? 'Original';
  /** The steps of a branch, in map order. */
  const laneOf = (id: BranchId) => nodes.filter((n) => branchOfNode(n) === id);

  // ---- Approval scoped to one branch ----

  const storedFork = (b: Branch) => wf.forks.find((f) => f.id === b.id);
  /** The lane's own copy, by output id, where a step previews it ("X post" on Vs Penny's Launch copy). */
  const laneCopy = (b: Branch): Record<string, string> => {
    const items = branchItems(wf, { from: b.from ?? '' });
    return Object.fromEntries(
      laneOf(b.id).flatMap((n) => {
        const item = n.preview && items.find((i) => i.title === n.preview!.label);
        return item && n.preview!.text !== item.body
          ? [[item.id, n.preview!.text]]
          : [];
      })
    );
  };
  const itemsFor = (b: Branch): ForkApprovalItem[] =>
    withEditedText(
      wf,
      b.id,
      b.fork
        ? branchItems(wf, {
            from: b.from ?? '',
            copy: storedFork(b)?.copy ?? laneCopy(b),
          })
        : branchItems(wf)
    );
  /** A fork the frame draws joins the store the first time you act on it (approve, choose), with its copy. */
  const ensureFork = (b: Branch) => {
    if (!b.fork) return;
    const stored = storedFork(b);
    if (!stored)
      dispatch({
        type: 'fork/create',
        fork: { ...forkFromBranch({ ...b, fork: b.fork }), copy: laneCopy(b) },
      });
    else if (!stored.copy)
      dispatch({ type: 'fork/update', id: b.id, patch: { copy: laneCopy(b) } });
  };
  const statesFor = (b: Branch): Record<string, ApprovalState> =>
    branchApprovals(wf, b.id);
  const setState = (b: Branch, id: string, s: ApprovalState) => {
    ensureFork(b);
    dispatch({ type: 'fork/approval', branch: b.id, output: id, value: s });
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
          // 5.1, 5.2 and Home follow the chosen version (runView.chosenBranch).
          ensureFork(b);
          dispatch({ type: 'fork/choose', id: b.id });
        }}
        onApproveAll={() => {
          for (const i of items)
            if ((states[i.id] ?? 'waiting') === 'waiting')
              setState(b, i.id, 'approved');
        }}
        // Edit changes the text in place; the store keeps it per branch, so 5.1 and 5.2 show it once chosen.
        onBodyChange={(id, text) => {
          ensureFork(b);
          dispatch({ type: 'approval/edit', branch: b.id, output: id, text });
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
    // The new fork's first step opens.
    setPanel({
      kind: 'inspector',
      nodeId: `${nodeId.replace(/-f\d$/, '')}-f${b.fork}`,
    });
  };

  // ---- Status pill ----

  /**
   * The status pill with the forks counted: "Running · <fork> · $x" for one fork, "<n> forks · $x" for more, and
   * each fork no frame draws adding its lane's spend. A frame as drawn keeps Figma's label.
   */
  const costLabel = (label: string) => {
    const named = swapText(label, swaps);
    if (!hasForks || wf.asDrawn) return named;
    const forks = branches.filter((b) => b.fork);
    const added = forks
      .filter((b) => b.fork && !drawnNumbers.has(b.fork))
      .reduce((sum, b) => sum + laneOf(b.id).length * LANE_STEP_COST, 0);
    const parts = named.split(' · ');
    let money = -1;
    parts.forEach((p, i) => {
      if (/^\$\d+\.\d\d$/.test(p)) money = i;
    });
    if (money < 0) return named;
    parts[money] = `$${(Number(parts[money].slice(1)) + added).toFixed(2)}`;
    const segment =
      forks.length === 1 ? forks[0].name : `${forks.length} forks`;
    const names = new Set(forks.map((b) => b.name));
    const at = parts.findIndex((p) => names.has(p) || /^\d+ forks$/.test(p));
    if (at >= 0) parts[at] = segment;
    else parts.splice(money, 0, segment);
    return parts.join(' · ');
  };

  // No Branches row: every lane shows on the map, and the chosen version is badged on it.
  const overlay = null;

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
    costLabel,
  };
}
