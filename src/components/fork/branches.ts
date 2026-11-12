import type { ForkNumber } from '@/components/map/forks';
import type { Fork } from '@/state/types';

// Branches of a run: the original path plus its forks. A branch's id is 'original' or `fork-<n>` (n = the fork's
// colour, Fork 1 pink, Fork 2 teal, Fork 3 violet), so a fork the store creates and the fork a Figma frame draws in
// that colour are the same branch.

export type BranchId = string;

export type Branch = {
  /** 'original' or `fork-<n>`. */
  id: BranchId;
  /** "Original" or the fork's name ("Vs Penny", or whatever the user typed or picked). */
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
    name: f.name,
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
 * Original + every fork, by colour: a live fork (from the store) replaces the fork a frame draws in the same colour,
 * so a fork you named shows under your name on the frame that draws it.
 */
export function mergeBranches(drawn: Branch[], live: Branch[]): Branch[] {
  const byId = new Map<BranchId, Branch>();
  for (const b of [...drawn, ...live]) if (b.fork) byId.set(b.id, b);
  return [
    ORIGINAL,
    ...[...byId.values()].sort((a, b) => (a.fork ?? 0) - (b.fork ?? 0)),
  ];
}

/**
 * A fork's name from the Fork card (finding 2g): a chosen chip names it after the chip ("Students"); typed text
 * names it after its first words ("Lead with the free trial"). The card's first chip, untouched, keeps the name the
 * frame that draws this fork gives it (`drawnName`: "Vs Penny", "First-timers").
 */
export function forkNameFromInput(
  instruction: string,
  options: { label: string; text: string }[] = [],
  drawnName?: string
): string | null {
  const text = instruction.trim();
  if (!text) return null;
  const i = options.findIndex((o) => o.text.trim() === text);
  if (i === 0 && drawnName) return drawnName;
  if (i >= 0) return options[i].label;
  return shortName(text);
}

const MAX_NAME = 24;

function shortName(text: string) {
  const head = text.split(/[:;.!?\n—]/)[0].trim() || text;
  let out = '';
  for (const w of head.split(/\s+/)) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > MAX_NAME) break;
    out = next;
  }
  if (!out) out = head.slice(0, MAX_NAME);
  out = out.replace(/[,'"“”‘’]+$/g, '').replace(/^["“‘']+/, '');
  return out ? out[0].toUpperCase() + out.slice(1) : null;
}
