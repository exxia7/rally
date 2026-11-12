import type { OutputItem } from '@/components/panels/OutputsCard';
import type { PlanLayout, PlanNode } from '@/components/planning/PlanMap';
import type { ChatLine } from '@/state/types';

import {
  AI_COACH_OUTPUTS,
  AI_COACH_PLAN,
  AI_COACH_PLAN_COMPACT,
  type Helper,
  helperCard,
} from './aiCoachPlan';

// The AI Coach team after "I also want to post on our Discord forum." (2.4e, 2.5, 2.6): a new Community helper
// joins the Post column above Publisher, both after "You approve". Built on aiCoachPlan's team and layouts.

export const COMMUNITY: Helper = {
  name: 'Community',
  agent: 'Community',
  kind: 'action',
  description: 'Posts your launch in Discord',
  model: 'Haiku 5.5',
  tokensK: 2,
  tools: ['Discord'],
  skills: [],
  files: [],
  extra: [{ label: 'Posts', value: 'After your OK' }],
  getsFrom: 'Writer, after your OK',
  passesTo: 'your Discord forum',
  passes: 'A launch post in #launches',
  checks: 'Always · before posting',
  state: 'new',
};

export const DISCORD_OUTPUT: OutputItem = {
  id: 'discord',
  label: 'Discord post',
  type: 'post',
  isNew: true,
};

/** What goes out with Community: Discord post sits before the waitlist email. */
export const COMMUNITY_OUTPUTS: OutputItem[] = [
  ...AI_COACH_OUTPUTS.slice(0, 3),
  DISCORD_OUTPUT,
  ...AI_COACH_OUTPUTS.slice(3),
];

const withCommunity = (
  base: PlanLayout,
  community: { x: number; y: number; height?: number },
  moves: Record<string, Partial<PlanNode>>,
  gate: { y: number }
): PlanLayout => ({
  ...base,
  nodes: [
    ...base.nodes.map((n) => ({ ...n, ...moves[n.id] })),
    { id: 'community', ...helperCard(COMMUNITY), ...community },
  ],
  edges: [...base.edges, { from: 'approve', to: 'community' }],
  gates: base.gates?.map((g) => ({ ...g, ...gate })),
});

/** 2.4e / 2.5: the 2.3 map (cards at 0.85) with Community at the top of Post (frame 2362:27695). */
export const COMMUNITY_PLAN = withCommunity(
  AI_COACH_PLAN,
  { x: 711.225, y: 99.025, height: 121.5075 },
  { publisher: { y: 232.4325, height: 121.617 } },
  { y: 237.341 }
);

/** 2.6: the compact map (cards at 0.59) beside the Sandbox, 16px higher than 2.4's (frame 2362:24308). */
export const COMMUNITY_PLAN_COMPACT: PlanLayout = (() => {
  const up = (n: PlanNode): Partial<PlanNode> => ({ y: n.y - 16 });
  const moves = Object.fromEntries(
    AI_COACH_PLAN_COMPACT.nodes.map((n) => [n.id, up(n)])
  );
  moves.publisher = { y: 255.825, height: 99.516 };
  return {
    ...withCommunity(AI_COACH_PLAN_COMPACT, { x: 511.3, y: 162.125, height: 85.44 }, moves, {
      y: 259.22,
    }),
    stageY: (AI_COACH_PLAN_COMPACT.stageY ?? 0) - 16,
  };
})();

/** The chat that adds Community (2.5): the ask, the plan, the yes, and "Done" with Undo. `n` keeps ids unique. */
export const COMMUNITY_ASK = 'I also want to post on our Discord forum.';
export const communityChat = (n: number, ask = COMMUNITY_ASK): ChatLine[] => [
  { id: `ask-${n}`, from: 'user', text: ask },
  {
    id: `idea-${n}`,
    from: 'assistant',
    text: "Good idea. I'll add a Community helper that turns your launch copy into a Discord post.",
  },
  {
    id: `check-${n}`,
    from: 'assistant',
    text: 'Should it check with you before posting?',
  },
  { id: `yes-${n}`, from: 'user', text: 'Yes, ask me first' },
  {
    id: `done-${n}`,
    from: 'assistant',
    text: 'Done. It\'ll post after you approve, along with Publisher. I also added "Discord post" to What goes out.',
    undo: { kind: 'community' },
  },
];
