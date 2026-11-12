import type { ForkNumber } from '@/components/map/forks';
import { BranchTab, Branches } from '@/components/nav/BranchTab';

import type { Branch, BranchId } from './branches';

export type BranchesRowProps = {
  /** Original first, then each fork (`mergeBranches`). */
  branches: Branch[];
  /** The branch whose lane is in focus (its tab is selected). */
  selected: BranchId;
  /** The version you chose ("Use this version"): its tab says so. */
  chosen?: BranchId;
  onSelect: (id: BranchId) => void;
  /** "+ New fork"; omitted when all three fork colours are taken. */
  onNewFork?: () => void;
  /** A Fork card is open: the "+ New fork" slot takes the colour the new fork will get (6.4). */
  pendingFork?: ForkNumber | null;
  className?: string;
};

// The Branches row on a run screen with forks (finding 1f): Figma's Branches (6.4) with a tab per branch, each fork
// in its colour, and "+ New fork". Selecting a tab focuses that branch's lane (the others are muted). The
// screen pins it under the Tasks chip (16, 62), like 6.4.
export function BranchesRow({
  branches,
  selected,
  chosen,
  onSelect,
  onNewFork,
  pendingFork,
  className = 'absolute top-[62px] left-4 max-w-[calc(100%-32px)]',
}: BranchesRowProps) {
  return (
    <Branches className={className}>
      {branches.map((b) => (
        <BranchTab
          key={b.id}
          label={b.id === chosen ? `${b.name} · chosen` : b.name}
          fork={b.fork}
          state={b.id === selected ? 'selected' : 'default'}
          onClick={() => onSelect(b.id)}
        />
      ))}
      {onNewFork && (
        <BranchTab
          label="+ New fork"
          state="add"
          fork={pendingFork ?? undefined}
          onClick={onNewFork}
        />
      )}
    </Branches>
  );
}
