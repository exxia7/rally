import type { AgentName } from '@/components/agents/characters';
import { PRESETS, TOOLS } from '@/screens/home/workspaceData';
import {
  AI_COACH_BRIEF,
  AI_COACH_FACTS,
  AI_COACH_OUTPUTS,
  AI_COACH_TEAM,
  briefChat,
  type Helper,
  HELPER_IDS,
  PLAN_CHAT_INTRO,
  PLAN_CHAT_SUGGESTIONS,
} from '@/screens/plan/aiCoachPlan';
import {
  COMMUNITY,
  COMMUNITY_OUTPUTS,
  communityChat,
} from '@/screens/plan/communityPlan';
import { AI_COACH_SANDBOX } from '@/screens/run/aiCoachMap';

import { BEATS } from './timeline';
import type {
  AppState,
  BeatId,
  ChatLine,
  HandRaise,
  Output,
  ResourceItem,
  Workflow,
  WorkflowId,
} from './types';

// A scene per Figma frame: the whole store state that frame shows. A direct load of /s/<id> (or '/', or a link from
// /screens) seeds the store from its scene, so it renders exactly its Figma state; in-app navigation carries the
// live store instead (src/state/nav.ts). Scenes are built from the screens' data files, never copies of them.

export const STATE_VERSION = 1;
export const AI_COACH_ID = 'ai-coach';

// ---- Building blocks -----------------------------------------------------------------------------------------

const OUTPUT_OWNER: Record<string, string> = {
  ph: 'writer',
  x: 'writer',
  li: 'writer',
  email: 'writer',
  discord: 'community',
  tiktok: 'writer',
};
const CHANNEL: Record<string, string> = {
  ph: 'Product Hunt',
  x: 'X',
  li: 'LinkedIn',
  email: 'Email (Resend)',
  discord: 'Discord',
};

export const toOutputs = (items: typeof AI_COACH_OUTPUTS): Output[] =>
  items.map((o) => ({
    ...o,
    owner: OUTPUT_OWNER[o.id],
    channel: CHANNEL[o.id],
    needsConnection: o.id === 'li' || o.id === 'ph' ? true : undefined,
  }));

const helperIdOf = (name: string) => name.trim().toLowerCase();

const resourceItems = (sectionId: string): ResourceItem[] =>
  (AI_COACH_SANDBOX.find((s) => s.id === sectionId)?.items ?? []).map((i) => ({
    name: i.name,
    source: i.source,
    usedBy: (i.source ?? '')
      .split(',')
      .map(helperIdOf)
      .filter((h) => h in AI_COACH_TEAM || h === 'community'),
  }));

const planIntro = (): ChatLine[] =>
  PLAN_CHAT_INTRO.map((text, i) => ({
    id: `intro-${i}`,
    from: 'assistant',
    text,
  }));

/** The AI Coach team: the 7 helpers of 2.3, or with Community (the Discord helper every run frame draws). */
export function team(withCommunity: boolean, communityIsNew = false) {
  const helpers: Record<string, Helper> = { ...AI_COACH_TEAM };
  const order: string[] = [...HELPER_IDS];
  if (withCommunity) {
    helpers.community = {
      ...COMMUNITY,
      state: communityIsNew ? COMMUNITY.state : undefined,
    };
    // The Post column: Community sits before Publisher.
    order.splice(order.indexOf('publisher'), 0, 'community');
  }
  return { helpers, helperOrder: order };
}

const runStep = (beat: BeatId) => ({
  phase: BEATS[beat].phase,
  beat,
  paused: false,
  steps: {},
});

/** The live AI Coach workflow at a point in the story. */
function aiCoach(o: {
  beat?: BeatId;
  stage?: Workflow['planStage'];
  community?: boolean;
  communityIsNew?: boolean;
  asDrawn?: string;
  hold?: boolean;
}): Workflow {
  const beat = o.beat ?? 'idle';
  const community = o.community ?? beat !== 'idle';
  const t = team(community, o.communityIsNew);
  const phase = BEATS[beat].phase;
  return {
    id: AI_COACH_ID,
    title: 'AI Coach launch',
    preview: 'ai-coach',
    status:
      phase === 'notStarted'
        ? 'draft'
        : phase === 'launched'
          ? 'done'
          : phase === 'needsYou' || phase === 'awaitingApproval'
            ? 'needsYou'
            : 'running',
    brief: { ...AI_COACH_BRIEF },
    attachments: [],
    planStage: o.stage ?? 'team',
    briefChat: briefChat(AI_COACH_BRIEF.what),
    planChat: planIntro(),
    ...t,
    removed: [],
    planSteps: [],
    outputs: toOutputs(
      community
        ? COMMUNITY_OUTPUTS.map((x) =>
            x.id === 'discord' ? { ...x, isNew: o.communityIsNew } : x
          )
        : AI_COACH_OUTPUTS
    ),
    resources: {
      assets: resourceItems('assets'),
      skills: resourceItems('skills'),
      tools: resourceItems('tools'),
      facts: { ...AI_COACH_FACTS },
    },
    permissions: {
      preset: 'Balanced',
      checkLevel: 'unsure',
      adLimit: 50,
      nextTime: {},
    },
    run: { ...runStep(beat), hold: o.hold || undefined },
    handRaises: handRaisesAt(beat),
    decisions: [],
    reruns: atOrAfter(beat, 'rerun')
      ? [
          {
            id: 'rerun-1',
            from: 'decision',
            note: 'Adding: how we differ from Penny',
            scope: ['decision', 'writer', 'discord'],
            at: 0,
          },
        ]
      : [],
    approvals:
      beat === 'launched'
        ? {
            ph: 'approved',
            x: 'approved',
            li: 'approved',
            discord: 'approved',
            email: 'approved',
          }
        : {},
    forks: [],
    launchedOn: beat === 'launched' ? AI_COACH_FACTS.date : undefined,
    asDrawn: o.asDrawn,
  };
}

const ORDER: BeatId[] = [
  'idle',
  'launch',
  'deciding',
  'running',
  'handRaise1',
  'rerun',
  'handRaise2',
  'finishing',
  'approval',
  'launched',
];
const atOrAfter = (beat: BeatId, than: BeatId) =>
  ORDER.indexOf(beat) >= ORDER.indexOf(than);

/** The hand raises Figma's later frames have already answered, with the choices their copy implies. */
function handRaisesAt(beat: BeatId): HandRaise[] {
  const out: HandRaise[] = [];
  if (atOrAfter(beat, 'rerun'))
    out.push({
      id: 'missing',
      step: 'decision',
      helper: 'strategist',
      choices: [0, 0],
      other: '',
      resolved: true,
    });
  if (atOrAfter(beat, 'finishing'))
    out.push({
      id: 'price',
      step: 'writer',
      helper: 'writer',
      choices: [0],
      other: '',
      resolved: true,
    });
  return out;
}

/** A brand-new workflow from Home's "New workflow" (2.1, 3.1). */
export function newWorkflow(id: WorkflowId): Workflow {
  const base = aiCoach({ stage: 'brief', community: false });
  return {
    ...base,
    id,
    title: 'New workflow',
    preview: 'product-launch',
    isNew: true,
    status: 'draft',
    brief: { what: '', summary: '', when: '', who: '' },
    briefChat: [],
  };
}

/** Home's other cards (1.1): finished or draft workflows with Figma's card text. */
function mock(
  id: string,
  title: string,
  preview: Workflow['preview'],
  card: NonNullable<Workflow['card']>
): Workflow {
  const done = card.status === 'Done';
  const base = done
    ? aiCoach({ beat: 'launched', hold: true })
    : newWorkflow(id);
  return {
    ...base,
    id,
    title,
    preview,
    card,
    isNew: done ? undefined : false,
    status: done ? 'done' : 'draft',
    planStage: done ? 'team' : 'brief',
  };
}

const MOCKS: Workflow[] = [
  mock('pricing', 'Pricing change announcement', 'pricing', {
    status: 'Draft',
    meta: 'Edited 2 hours ago',
  }),
  mock('product-hunt', 'Product Hunt relaunch', 'product-launch', {
    status: 'Done',
    meta: 'Launched Feb 2',
  }),
  mock('hiring', 'Hiring: founding designer', 'hiring', {
    status: 'Done',
    meta: 'Posted Jan 18',
  }),
];

function app(active: Workflow, extra: Workflow[] = []): AppState {
  // Home always has the live AI Coach launch: as the frame draws it, or as 1.1 shows it (hand raised).
  const coach =
    active.id === AI_COACH_ID
      ? active
      : aiCoach({ beat: 'handRaise1', asDrawn: '4.1' });
  const all = [...extra, coach, ...MOCKS];
  if (active.id !== AI_COACH_ID && !all.some((w) => w.id === active.id))
    all.unshift(active);
  return {
    version: STATE_VERSION,
    workspace: {
      name: 'Lumen workspace',
      tools: TOOLS.map((t) => ({
        name: t.name,
        connected: t.connected,
        account: t.connected ? t.detail.split(' · ')[0] : undefined,
      })),
      defaultPreset: 'Balanced',
      presets: PRESETS.map((p) => ({
        key: p.key,
        name: p.name,
        rules: p.rules,
      })),
    },
    workflows: Object.fromEntries(all.map((w) => [w.id, w])),
    order: all.map((w) => w.id),
    activeId: active.id,
    returnTo: [],
    speed: 'normal',
  };
}

// ---- Scenes ----------------------------------------------------------------------------------------------------

const PLAYFUL: Partial<Helper> = {
  description: 'Writes your posts, email and a TikTok script',
  tone: 'Playful',
  state: 'updated',
};
export const PLAYFUL_WRITER = PLAYFUL;
export const TIKTOK_OUTPUT: Output = {
  id: 'tiktok',
  label: 'TikTok script',
  type: 'page',
  isNew: true,
  owner: 'writer',
};
export const WRITER_DONE =
  'Done. Writer is now playful, and I added a TikTok script to What goes out. Writer is the only helper that redoes its work.';

const run = (beat: BeatId, frame: string) =>
  app(aiCoach({ beat, asDrawn: frame }));

/** Frames still rendering their own data (forks, rerun from a step): a held run so nothing moves underneath. */
const held = (beat: BeatId, frame: string) =>
  app(aiCoach({ beat, asDrawn: frame, hold: true }));

/** 2.4e, 2.5, 2.6: the chat just added Community (Figma's chat shows only that exchange). */
const communityScene = (frame: string) => {
  const wf = aiCoach({ community: true, communityIsNew: true, asDrawn: frame });
  wf.planChat = communityChat(0);
  // 2.6: Community is waiting for a tool ("Tools · None yet").
  if (frame === '2.6')
    wf.helpers = {
      ...wf.helpers,
      community: { ...wf.helpers.community, tools: [] },
    };
  return app(wf);
};

const SCENES: Record<string, () => AppState> = {
  '1.1': () => app(aiCoach({ beat: 'handRaise1', asDrawn: '4.1' })),
  '1.2': () => app(aiCoach({ beat: 'handRaise1', asDrawn: '4.1' })),
  '2.1': () => app(newWorkflow('new')),
  '2.2': () => app(aiCoach({ stage: 'chat', asDrawn: '2.2' })),
  '2.1-attach': () => app(newWorkflow('new')),
  '2.2-attach': () => app(aiCoach({ stage: 'chat', asDrawn: '2.2-attach' })),
  '2.3': () => app(aiCoach({ asDrawn: '2.3' })),
  '2.4': () => app(aiCoach({ asDrawn: '2.4' })),
  '2.4b': () => app(aiCoach({ asDrawn: '2.4b' })),
  '2.4b-full': () => app(aiCoach({ asDrawn: '2.4b-full' })),
  '2.4c': () => {
    // 2.4c (an earlier pass) already lists the Discord post.
    const wf = aiCoach({ asDrawn: '2.4c' });
    wf.outputs = toOutputs(COMMUNITY_OUTPUTS);
    return app(wf);
  },
  '2.4d': () => {
    const wf = aiCoach({ asDrawn: '2.4d' });
    wf.helpers = {
      ...wf.helpers,
      writer: { ...wf.helpers.writer, ...PLAYFUL },
    };
    wf.outputs = [...wf.outputs, TIKTOK_OUTPUT];
    wf.planChat = [
      ...wf.planChat,
      { id: 'ask', from: 'user', text: PLAN_CHAT_SUGGESTIONS[1] },
      {
        id: 'done',
        from: 'assistant',
        text: WRITER_DONE,
        undo: { kind: 'playful' },
      },
    ];
    return app(wf);
  },
  '2.4e': () => communityScene('2.4e'),
  '2.5': () => communityScene('2.5'),
  '2.6': () => communityScene('2.6'),
  '2.7': () => app(aiCoach({ asDrawn: '2.7' })),
  '2.8': () => app(aiCoach({ asDrawn: '2.8' })),
  '3.1': () => app(newWorkflow('new')),
  '3.2': () => run('running', '3.2'),
  '3.2-tasks': () => run('running', '3.2-tasks'),
  '3.3': () => run('running', '3.3'),
  '3.3-tasks': () => run('running', '3.3-tasks'),
  '3.4': () => run('running', '3.4'),
  '3.4-tasks': () => run('running', '3.4-tasks'),
  '3.5': () => run('running', '3.5'),
  '3.5-tasks': () => run('running', '3.5-tasks'),
  '4.1': () => run('handRaise1', '4.1'),
  '4.1b': () => run('handRaise1', '4.1b'),
  '4.2': () => run('rerun', '4.2'),
  '4.2-tasks': () => run('rerun', '4.2-tasks'),
  '4.3': () => run('handRaise2', '4.3'),
  '5.1': () => run('approval', '5.1'),
  '5.2': () => run('launched', '5.2'),
  // Forks and rerun-from-a-step: the finished run, held (their screens still draw their own frame data).
  '4.4': () => held('approval', '4.4'),
  '4.5': () => held('approval', '4.5'),
  '6.1': () => held('finishing', '6.1'),
  '6.2': () => held('finishing', '6.2'),
  '6.3': () => held('finishing', '6.3'),
  '6.4': () => held('finishing', '6.4'),
  '6.5': () => held('finishing', '6.5'),
  '6.6': () => held('finishing', '6.6'),
};

/** The store state for frame `id` (Home's for unknown ids). Every registry id has one (see the check below). */
export function sceneFor(id: string): AppState {
  return (SCENES[id] ?? SCENES['1.1'])();
}

export const SCENE_IDS = Object.keys(SCENES);

/** Character names of the run team, in the agents bar's order. */
export const AGENT_ORDER: AgentName[] = [
  'Planner',
  'Scout',
  'Insights',
  'Strategist',
  'Writer',
  'Designer',
  'Community',
  'Publisher',
];
