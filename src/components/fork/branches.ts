import type { ForkNumber } from '@/components/map/forks';
import type { Fork } from '@/state/types';

// Branches of a run: the original path plus its forks. A branch's id is 'original' or `fork-<n>` (n = the fork's
// colour, Fork 1 pink, Fork 2 teal, Fork 3 violet), so a fork the store creates and the fork a Figma frame draws in
// that colour are the same branch.

export type BranchId = string;

export type Branch = {
  /** 'original' or `fork-<n>`. */
  id: BranchId;
  /** "Original" or the fork's name: always its number ("Fork 1"), whatever the frame drew or the user typed. */
  name: string;
  /** The fork's colour; undefined for the original path. */
  fork?: ForkNumber;
  /** The branch it forked from ('original' or `fork-<n>`). */
  parent?: BranchId;
  /** The step it forked from (a run-map node id). */
  from?: string;
  /** What the fork tries (the Fork card's instruction). */
  brief?: string;
};

export const ORIGINAL: Branch = { id: 'original', name: 'Original' };

export const forkBranchId = (n: ForkNumber): BranchId => `fork-${n}`;

/** A fork's name everywhere it shows: its number. What it tries is its brief. */
export const forkName = (n: ForkNumber) => `Fork ${n}`;

/** The branch a map node is on (lane nodes carry their fork number). */
export const branchOfNode = (node: { fork?: ForkNumber }): BranchId =>
  node.fork ? forkBranchId(node.fork) : 'original';

const FORK_NUMBERS: ForkNumber[] = [1, 2, 3];

/** The next free fork colour, or null when all three are taken. */
export function nextForkNumber(used: Iterable<number>): ForkNumber | null {
  const taken = new Set(used);
  return FORK_NUMBERS.find((n) => !taken.has(n)) ?? null;
}

/** A store fork as a branch. */
export function branchFromFork(f: Fork): Branch {
  return {
    id: forkBranchId(f.n),
    name: forkName(f.n),
    fork: f.n,
    parent: f.parent,
    from: f.from,
    brief: f.brief,
  };
}

/** A branch as the store's fork entity (approvals start empty). */
export function forkFromBranch(b: Branch & { fork: ForkNumber }): Fork {
  return {
    id: b.id,
    n: b.fork,
    parent: b.parent ?? 'original',
    from: b.from ?? '',
    name: b.name,
    brief: b.brief ?? '',
    approvals: {},
  };
}

/**
 * Original + every fork, by colour: a live fork (from the store) replaces the fork a frame draws in the same colour.
 * Every fork is named by its number, so a frame's drawn name ("Vs Penny") is swapped for "Fork 1" (renameSwaps).
 */
export function mergeBranches(drawn: Branch[], live: Branch[]): Branch[] {
  const byId = new Map<BranchId, Branch>();
  for (const b of [...drawn, ...live])
    if (b.fork) byId.set(b.id, { ...b, name: forkName(b.fork) });
  return [
    ORIGINAL,
    ...[...byId.values()].sort((a, b) => (a.fork ?? 0) - (b.fork ?? 0)),
  ];
}
