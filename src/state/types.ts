import type { ForkNumber } from '@/components/map/forks';
import type { NodeState } from '@/components/map/NodeCard';
import type { OutputItem } from '@/components/panels/OutputsCard';
import type { NewStep } from '@/components/planning/AddStepPopover';
import type { PlanEdge } from '@/components/planning/PlanMap';
import type { Helper } from '@/screens/plan/aiCoachPlan';

// The app's single source of truth (design/ux-audit.md, "Proposed single source of truth"). Every screen is a view
// of this state plus its own UI state (open panel, tab, drawer). See CLAUDE.md "App state".

export type WorkflowId = string;
/** A plan helper id: 'planner', 'writer', 'community', or 'step-1' for one added on a line. */
export type HelperId = string;
/** A run-map step id: 'task', 'plan', 'decision', 'writer', 'discord', 'schedule', 'ready'… */
export type StepId = string;

export type WorkflowStatus = 'draft' | 'running' | 'needsYou' | 'done';
export type Preview = 'ai-coach' | 'pricing' | 'product-launch' | 'hiring';

export type Brief = {
  /** The brief as typed (2.2's first chat message and the Launch brief "What"). */
  what: string;
  /** The run's task card lead ("Launch AI Coach to 2,800 waitlist signups"). */
  summary: string;
  when: string;
  who: string;
  goal?: string;
  channels?: string;
};

/** Where the planning view is: 2.1 brief, 2.2 chat with the Planner, 2.3 the team map. */
export type PlanStage = 'brief' | 'chat' | 'team';

export type ChatLine = {
  id: string;
  from: 'assistant' | 'user';
  text: string;
  /** 2.2: the "See your team" button under this message. */
  action?: 'team';
  /** 2.3: an Undo button under this message. */
  undo?: UndoRef;
};

export type UndoRef =
  | { kind: 'remove'; helper: HelperId }
  | { kind: 'playful' }
  /** 2.5: the Community helper the chat added (and its Discord post). */
  | { kind: 'community' };

export type PlanStepEdit = {
  edge: Pick<PlanEdge, 'from' | 'to'>;
  step: NewStep;
  id: string;
};

/** "What goes out": a plan output, with the helper that makes it and the channel it posts to. */
export type Output = OutputItem & {
  owner?: HelperId;
  channel?: string;
  needsConnection?: boolean;
};

export type LaunchFacts = {
  date: string;
  time: string;
  price: string;
  audience: string;
  claim: string;
  budget: string;
  signups: string;
};

export type ResourceItem = {
  name: string;
  usedBy: HelperId[];
  source?: string;
};

export type Resources = {
  assets: ResourceItem[];
  skills: ResourceItem[];
  /** Tools this workflow uses; `connected` comes from the workspace's tools. */
  tools: ResourceItem[];
  facts: LaunchFacts;
};

export type PresetName = string;

export type WorkflowPermissions = {
  preset: PresetName;
  /** When the team checks with you (src/state/permissions.ts: 'every' | 'unsure' | 'go'). */
  checkLevel: 'every' | 'unsure' | 'go';
  adLimit: number;
  /** 5.2 "Next time": per rule, what you chose. */
  nextTime: Record<string, 'allow' | 'keep'>;
};

export type WorkspaceTool = {
  name: string;
  connected: boolean;
  account?: string;
};

export type Workspace = {
  name: string;
  tools: WorkspaceTool[];
  defaultPreset: PresetName;
  /** `check`/`adLimit`: set on presets you edit or add in 1.2 (built-ins fall back to permissions.PRESET_RULES). */
  presets: {
    key: string;
    name: PresetName;
    rules: string;
    check?: 'every' | 'unsure' | 'go';
    adLimit?: number;
  }[];
};

// ---- Run -------------------------------------------------------------------------------------------------------

export type RunPhase =
  | 'notStarted'
  | 'running'
  | 'needsYou'
  | 'rerunning'
  | 'awaitingApproval'
  | 'launched';

/** A position on the scripted timeline (src/state/timeline.ts). Each Figma run frame is one beat. */
export type BeatId =
  | 'idle'
  | 'launch'
  | 'deciding'
  | 'running'
  | 'handRaise1'
  | 'rerun'
  | 'handRaise2'
  | 'finishing'
  | 'approval'
  | 'launched';

/** What the user changed on one step (the timeline owns the rest of its state). */
export type StepOverride = {
  state?: NodeState;
  status?: string;
  /** "I'll do this one" in the inspector. */
  takenOver?: boolean;
};

export type Run = {
  phase: RunPhase;
  beat: BeatId;
  paused: boolean;
  /** The timeline doesn't advance (frames other agents haven't converted yet). */
  hold?: boolean;
  startedAt?: number;
  /** When the current beat started (ms epoch); moved on by a pause so the beat keeps its remaining time. */
  beatAt?: number;
  pausedAt?: number;
  steps: Record<StepId, StepOverride>;
};

export type HandRaiseId = 'missing' | 'price';

export type HandRaise = {
  id: HandRaiseId;
  /** The step that raised its hand. */
  step: StepId;
  helper: HelperId;
  /** Chosen option index per problem. */
  choices: number[];
  other: string;
  resolved: boolean;
};

/** A decision you made (the helpers' own come from the timeline's frame data). */
export type DecisionEntry = {
  id: string;
  title: string;
  basis: string;
  time: string;
  /** A decision's "Change" (3.4): the id of the decision (a helper's or yours) this one replaces in the log. */
  replaces?: string;
};

export type Rerun = {
  id: string;
  /** The step that reruns first. */
  from: StepId;
  note?: string;
  /** Every step redone, in map order (derived from the chosen fix when it was confirmed). */
  scope: StepId[];
  at: number;
};

export type ApprovalValue = 'waiting' | 'approved' | 'wont-post';

export type Fork = {
  id: string;
  n: ForkNumber;
  /** 'original' or the fork it forked from. */
  parent: 'original' | string;
  from: StepId;
  name: string;
  brief: string;
  /** The fork's own run progress (for the follow-up fork work). */
  beat?: string;
  phase?: RunPhase;
  approvals: Record<string, ApprovalValue>;
  /** "Use this version": mirrors `Workflow.chosenVersion === id` (both set by `fork/choose`). */
  chosen?: boolean;
  /** The fork's own copy per output id where it differs from the original's (its lane's previews: "X post"). */
  copy?: Record<string, string>;
};

// ---- Workflow and app ----------------------------------------------------------------------------------------

export type Workflow = {
  id: WorkflowId;
  title: string;
  preview: Preview;
  /** Mock workflows on Home keep Figma's card text ("Edited 2 hours ago", "Launched Feb 2"). */
  card?: { status: 'Running' | 'Draft' | 'Done'; meta: string };
  status: WorkflowStatus;
  /** True until a brief is sent (3.1 and 2.1 show it as "New workflow"). */
  isNew?: boolean;
  brief: Brief;
  attachments: string[];
  planStage: PlanStage;
  /** 2.2 chat with the Planner. */
  briefChat: ChatLine[];
  /** 2.3 planning chat. */
  planChat: ChatLine[];
  helpers: Record<HelperId, Helper>;
  /** Display order (also the plan map's node order). */
  helperOrder: HelperId[];
  removed: HelperId[];
  planSteps: PlanStepEdit[];
  outputs: Output[];
  resources: Resources;
  permissions: WorkflowPermissions;
  run: Run;
  handRaises: HandRaise[];
  decisions: DecisionEntry[];
  reruns: Rerun[];
  approvals: Record<string, ApprovalValue>;
  forks: Fork[];
  /**
   * 'original' or a fork id: the version you chose to post ("Use this version"); undefined until you choose, which
   * posts the original. 5.1, 5.2 and Home follow it (runView.chosenBranch).
   */
  chosenVersion?: string;
  launchedOn?: string;
  /** 2.8 Archive: hidden from Home and its run stopped; Restore clears it. */
  archived?: boolean;
  /** 5.1 inline edits: the text you saved per `<branch>:<output id>` (approvalItems shows it). */
  approvalText?: Record<string, string>;
  /**
   * Set by a scene: the workflow is exactly Figma frame <id>, so views show that frame's literal text where Figma
   * disagrees with what the data implies (counts, estimate). Cleared by the first action that changes the workflow.
   */
  asDrawn?: string;
};

export type Speed = 'normal' | 'fast' | 'hold';

export type AppState = {
  version: number;
  workspace: Workspace;
  workflows: Record<WorkflowId, Workflow>;
  /** Home card order. */
  order: WorkflowId[];
  activeId: WorkflowId;
  /** Return-to stack of screen ids (settings, Sandbox…): `useGo().back()` pops it. */
  returnTo: string[];
  speed: Speed;
  /** The screen each workflow was last on (the sidebar's workflow list reopens it there). */
  lastScreen?: Record<WorkflowId, string>;
};
