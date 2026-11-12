import type { Branch } from '@/components/fork/branches';
import { FORK_CARD_OPTIONS } from '@/components/panels/forkCardOptions';

import { FORK_DECISION_RUN } from './data';

// The forks the fork frames draw, with Figma's names and briefs. Each is the Fork card's first chip, untouched: a
// fork you create with another chip or your own words takes this colour under your name and brief.

const DECISION_OPTIONS =
  FORK_DECISION_RUN.inspectors?.decision?.forkForm?.options ?? [];

/** 4.5: Fork 1 from the Strategist's audience call (4.4's first chip). */
export const FIRST_TIMERS: Branch = {
  id: 'fork-1',
  fork: 1,
  name: 'First-timers',
  parent: 'original',
  from: 'decision',
  brief: DECISION_OPTIONS[0]?.text,
};

/** 6.5 / 6.6: Fork 1 from Launch copy (6.4's first chip). */
export const VS_PENNY: Branch = {
  id: 'fork-1',
  fork: 1,
  name: 'Vs Penny',
  parent: 'original',
  from: 'writer',
  brief: FORK_CARD_OPTIONS[0].text,
};

/** 6.6: Fork 2 from Vs Penny's Discord post. */
export const IN_GENERAL: Branch = {
  id: 'fork-2',
  fork: 2,
  name: 'In #general',
  parent: 'fork-1',
  from: 'discord-f1',
  brief: 'Post in #general too, so the whole community sees it.',
};

export { DECISION_OPTIONS };
