import type { OutputItem } from '@/components/panels/OutputsCard';
import type { HelperCardData } from '@/components/planning/HelperCard';
import type {
  PlanEdge,
  PlanLayout,
  PlanNode,
} from '@/components/planning/PlanMap';

// The AI Coach launch team on the planning map, as Figma draws it in 2.3 "Proposed team" (ZoomStage 2362:23662,
// 954×830 beside the side panel). Every 2.x planning frame starts from these:
// - AI_COACH_PLAN (2.3, 2.4b, 2.4d…) or AI_COACH_PLAN_COMPACT (beside the helper drawer: 2.4, 2.4b-full).
// - `planNodes(layout, overrides, rest)` for per-frame states (dimmed, selected, updated…).
// - AI_COACH_TEAM holds each helper as editable data (model, tools, resources, handoffs); `helperCard()` turns
//   one into its map card, so an edit in a drawer or the chat shows on the card.

export type HelperId =
  | 'planner'
  | 'scout'
  | 'insights'
  | 'strategist'
  | 'writer'
  | 'designer'
  | 'publisher';

export type ModelName = 'Haiku 5.5' | 'Opus 5.5';

export type Helper = Omit<HelperCardData, 'settings'> & {
  model: ModelName;
  /** ~k tokens a run uses (the drawer's cost hint: Haiku $0.005/k, Opus $0.01/k). */
  tokensK: number;
  /** Tools it may use; undefined = a helper without a tool list (its drawer shows Resources first). */
  tools?: string[];
  skills: string[];
  files: string[];
  /** Files uploaded in the helper drawer (shown with Files on the card). */
  uploads?: string[];
  /** A setting changed by chat ("Tone · Playful" in 2.4d). Shown highlighted after Model. */
  tone?: string;
  /** Extra card rows after the resources (Publisher: Ads, Posts). */
  extra?: { label: string; value: string; highlighted?: boolean }[];
  getsFrom: string;
  passesTo: string;
  passes: string;
  /** "Checks with you" override. */
  checks: string;
  /** A duplicate ("Strategist copy"): drawn under that helper, with its lines (src/state/planView.planLayout). */
  copyOf?: string;
};

export const AI_COACH_TEAM: Record<HelperId, Helper> = {
  planner: {
    name: 'Planner',
    agent: 'Planner',
    agentSize: 29.29,
    agentLeft: 149.325,
    kind: 'action',
    description: 'Plans the timeline and budget',
    model: 'Haiku 5.5',
    tokensK: 2,
    tools: ['Calendar'],
    skills: [],
    files: [],
    getsFrom: 'Your launch',
    passesTo: 'Strategist',
    passes: 'Timeline, budget, launch date',
    checks: 'Team default · when unsure',
  },
  scout: {
    name: 'Scout',
    agent: 'Scout',
    kind: 'action',
    description: 'Checks what competitors are doing',
    model: 'Haiku 5.5',
    tokensK: 2,
    tools: ['Web search'],
    skills: [],
    files: [],
    getsFrom: 'Your launch',
    passesTo: 'Strategist',
    passes: 'Competitor launches, pricing, dates',
    checks: 'Team default · when unsure',
  },
  insights: {
    name: 'Insights',
    agent: 'Insights',
    kind: 'action',
    description: 'Reads what your waitlist told you',
    model: 'Haiku 5.5',
    tokensK: 2,
    skills: [],
    files: ['Waitlist survey'],
    getsFrom: 'Your launch',
    passesTo: 'Strategist',
    passes: 'What waitlist members asked for',
    checks: 'Team default · when unsure',
  },
  strategist: {
    name: 'Strategist',
    agent: 'Strategist',
    // Figma draws the bunny and the penguin at 121% of their avatar box in the 2.3 cards.
    agentSize: 30,
    agentLeft: 148.38,
    kind: 'decision',
    description: "Picks who it's for and what to say",
    model: 'Opus 5.5',
    tokensK: 4,
    skills: ['Positioning playbook'],
    files: ['Competitor notes'],
    getsFrom: 'Launch facts, Planner, Scout, Insights',
    passesTo: 'Writer and Designer',
    passes: 'Audience, message, price, launch date',
    checks: 'Team default · when unsure',
  },
  writer: {
    name: 'Writer',
    agent: 'Writer',
    agentSize: 30,
    agentLeft: 148.63,
    kind: 'output',
    description: 'Writes your posts and email',
    model: 'Opus 5.5',
    tokensK: 6,
    skills: ['Brand voice'],
    files: ['Brand guide'],
    getsFrom: 'Strategist',
    passesTo: 'Publisher',
    passes: 'Posts, email, Product Hunt page',
    checks: 'Team default · when unsure',
  },
  designer: {
    name: 'Designer',
    agent: 'Designer',
    kind: 'output',
    description: 'Makes the images',
    model: 'Haiku 5.5',
    tokensK: 3,
    tools: ['Image maker'],
    skills: [],
    files: ['Logo, 3 inspo images'],
    getsFrom: 'Strategist',
    passesTo: 'Publisher',
    passes: 'Social images, Product Hunt gallery',
    checks: 'Team default · when unsure',
  },
  publisher: {
    name: 'Publisher',
    agent: 'Publisher',
    agentSize: 26.0625,
    kind: 'action',
    description: 'Posts everything on launch day',
    model: 'Haiku 5.5',
    tokensK: 2,
    tools: ['Email', 'X', 'LinkedIn'],
    skills: [],
    files: [],
    extra: [
      { label: 'Ads', value: 'Up to $50' },
      { label: 'Posts', value: 'After your OK' },
    ],
    getsFrom: 'Writer and Designer, after your OK',
    passesTo: 'your audience',
    passes: 'Posts on X, LinkedIn and email',
    checks: 'Always · before posting',
  },
};

export const HELPER_IDS = Object.keys(AI_COACH_TEAM) as HelperId[];

/** The drawer's cost hint for a model choice, e.g. "~4k tokens · $0.04". */
export function modelCost(h: Pick<Helper, 'model' | 'tokensK'>) {
  const rate = h.model === 'Opus 5.5' ? 0.01 : 0.005;
  return `~${h.tokensK}k tokens · $${(h.tokensK * rate).toFixed(2)}`;
}

/** A helper as its plan-map card: Model, Tone, Tools, Skills, Files, then any extra rows. */
export function helperCard(h: Helper): HelperCardData {
  const rows: HelperCardData['settings'] = [
    { label: 'Model', value: `Claude ${h.model}` },
  ];
  if (h.tone) rows.push({ label: 'Tone', value: h.tone, highlighted: true });
  if (h.tools?.length) rows.push({ label: 'Tools', value: h.tools.join(', ') });
  if (h.skills.length)
    rows.push({ label: 'Skills', value: h.skills.join(', ') });
  const files = [...h.files, ...(h.uploads ?? [])];
  if (files.length) rows.push({ label: 'Files', value: files.join(', ') });
  rows.push(...(h.extra ?? []));
  return {
    name: h.name,
    agent: h.agent,
    agentSize: h.agentSize,
    agentLeft: h.agentLeft,
    agentState: h.agentState,
    kind: h.kind,
    description: h.description,
    settings: rows,
    state: h.state,
    selected: h.selected,
  };
}

const EDGES: PlanEdge[] = [
  { from: 'planner', to: 'strategist' },
  { from: 'scout', to: 'strategist' },
  { from: 'insights', to: 'strategist' },
  { from: 'strategist', to: 'writer' },
  { from: 'strategist', to: 'designer' },
  { from: 'writer', to: 'approve' },
  { from: 'designer', to: 'approve' },
  { from: 'approve', to: 'publisher' },
];

const STAGES = ['Research', 'Decide the message', 'Create', 'Post'];

type Positions = Record<HelperId, { x: number; y: number }>;

const layout = (
  base: Omit<PlanLayout, 'nodes'>,
  positions: Positions
): PlanLayout => ({
  ...base,
  nodes: HELPER_IDS.map((id) => ({
    id,
    ...helperCard(AI_COACH_TEAM[id]),
    ...positions[id],
  })),
});

/** 2.3 "Proposed team" (and 2.4b, 2.4d): the full-size map, cards at 0.85 (154.275px). Stage 954×830. */
export const AI_COACH_PLAN: PlanLayout = layout(
  {
    scale: 0.85,
    edges: EDGES,
    gates: [{ id: 'approve', x: 605.506, y: 237.171, width: 85.2125 }],
    stages: STAGES.map((label, i) => ({
      label,
      x: [24, 227.15, 431.15, 711.65][i],
    })),
    stageY: 61.625,
    stageScale: 0.85,
  },
  {
    planner: { x: 24, y: 99.025 },
    scout: { x: 24, y: 232.087 },
    insights: { x: 24, y: 365.5 },
    strategist: { x: 227.3625, y: 232.35 },
    writer: { x: 430.725, y: 99.1126 },
    designer: { x: 430.725, y: 365.588 },
    // Figma pins this card at 121.6px so its 4-row well hangs out; cards hug their content here instead.
    publisher: { x: 711.225, y: 232.2625 },
  }
);

/** 2.4 "Edit a helper · drawer" (and 2.4b-full): the same map, smaller, beside a helper drawer. Cards at 0.5895 (107px). */
export const AI_COACH_PLAN_COMPACT: PlanLayout = layout(
  {
    scale: 107 / 181.5,
    edges: EDGES,
    gates: [
      {
        id: 'approve',
        x: 438.11,
        y: 273.661,
        width: 59.3797,
        scale: 14.6278 / 24.75,
      },
    ],
    stages: STAGES.map((label, i) => ({ label, x: [36, 177, 317, 511][i] })),
    stageY: 134.125,
    stageScale: 1,
  },
  {
    planner: { x: 36, y: 178.125 },
    scout: { x: 36, y: 270.154 },
    insights: { x: 36, y: 362.425 },
    strategist: { x: 176.65, y: 270.336 },
    writer: { x: 317.3, y: 178.186 },
    designer: { x: 317.3, y: 362.485 },
    publisher: { x: 511.3, y: 270.275 },
  }
);

/** 2.4c "Add a step on a line": the map at full size (cards 181.5px) beside the old left chat column. Stage 1062×830.
 *  Its "+" sits on the Strategist → Writer line, just out of the Strategist. */
export const AI_COACH_PLAN_WIDE: PlanLayout = layout(
  {
    scale: 1,
    edges: EDGES.map((e) =>
      e.from === 'strategist' && e.to === 'writer'
        ? { ...e, addAt: { x: 476.55, y: 280.525 } }
        : e
    ),
    gates: [{ id: 'approve', x: 720.705, y: 268.15, width: 100.25 }],
    stages: STAGES.map((label, i) => ({ label, x: [36, 275, 515, 845][i] })),
    stageY: 61.625,
    stageScale: 1,
  },
  {
    planner: { x: 36, y: 105.625 },
    scout: { x: 36, y: 262.169 },
    insights: { x: 36, y: 419.125 },
    strategist: { x: 275.25, y: 262.478 },
    writer: { x: 514.5, y: 105.728 },
    designer: { x: 514.5, y: 419.2285 },
    publisher: { x: 844.5, y: 262.375 },
  }
);

/**
 * A layout's nodes with per-helper overrides, e.g. dim everyone but the Strategist and select it:
 * `planNodes(AI_COACH_PLAN_COMPACT, { strategist: { selected: true } }, { state: 'dimmed' })`.
 * `rest` applies to every helper without its own override. Pass `team` to draw edited helpers.
 */
export function planNodes(
  plan: PlanLayout,
  overrides: Partial<Record<HelperId, Partial<PlanNode>>> = {},
  rest: Partial<PlanNode> = {},
  team?: Partial<Record<HelperId, Helper>>
): PlanNode[] {
  return plan.nodes.map((n) => {
    const id = n.id as HelperId;
    const edited = team?.[id];
    const base = edited ? { ...n, ...helperCard(edited) } : n;
    return { ...base, ...(overrides[id] ?? rest) };
  });
}

/** "What goes out" in 2.3. */
export const AI_COACH_OUTPUTS: OutputItem[] = [
  { id: 'ph', label: 'Product Hunt page', type: 'page' },
  { id: 'x', label: 'X post', type: 'post' },
  { id: 'li', label: 'LinkedIn post', type: 'post' },
  { id: 'email', label: 'Waitlist email', type: 'email' },
];

/** The planning chat's opening messages (2.3 side panel). */
export const PLAN_CHAT_INTRO = [
  "Here's your team as a map. Read it left to right: each box is a helper with one job, and lines show who passes work to whom. Click a helper to see or change it. When it looks right, press Start launch.",
  'They check with you before anything gets posted or costs money. Want to change anything?',
];

export const PLAN_CHAT_SUGGESTIONS = [
  'I also want to post on our Discord forum.',
  'Make the Writer more playful, and add a TikTok script.',
];

// ---- The brief and the 2.2 chat with the Planner --------------------------------------------------------------

/** The AI Coach brief as the user typed it in 2.2, and the run's task card lead (3.2). */
export const AI_COACH_BRIEF = {
  what: 'launch campaign for our new AI Coach feature',
  summary: 'Launch AI Coach to 2,800 waitlist signups',
  when: 'Mar 12',
  who: '2,800 waitlist signups',
};

/** The 2.2 chat (2362:23548): the Planner asks, you answer. `brief` is your first message. */
export function briefChat(brief: string) {
  return [
    {
      id: '1',
      from: 'assistant' as const,
      text: "Hi, I'm the Planner. What are you launching? Describe it like you'd tell a friend.",
    },
    { id: '2', from: 'user' as const, text: brief },
    {
      id: '3',
      from: 'assistant' as const,
      text: 'Nice. Two quick questions so I can plan the right team:\n1. When is the launch? 2. Who is it for?',
    },
    {
      id: '4',
      from: 'user' as const,
      text: `${AI_COACH_BRIEF.when}, to our ${AI_COACH_BRIEF.who}`,
    },
    {
      id: '5',
      from: 'assistant' as const,
      text: "Your team is ready: 7 helpers, from research to posting on launch day. Next you'll see them on a map, where you can change anything. Nothing runs until you press Start launch.",
      action: 'team' as const,
    },
  ];
}

/** Launch facts (the run Sandbox's "Launch facts", the hand-raise problems, approvals and summary). */
export const AI_COACH_FACTS = {
  date: 'Mar 12',
  time: '9am',
  price: '$12/mo',
  audience: 'People who already budget',
  claim: 'AI Coach knows your actual budget',
  budget: '$300',
  signups: '2,800',
};
