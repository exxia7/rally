import type { MapNode } from '@/components/map/FlowMap';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData } from '@/components/run/RunScreenLayout';
import type { TaskItem } from '@/components/run/TasksOverlay';
import { patchById } from '@/lib/patchById';
import {
  AI_COACH_INSPECTOR,
  AI_COACH_NODES,
  AI_COACH_RUN,
  AI_COACH_TASKS,
} from '@/screens/run/aiCoachMap';

// Rerun from a step (6.1–6.3): the AI Coach run once Writer has finished Launch copy, with its inspector open.
// Derived from the 3.5 run (AI_COACH_RUN); only Writer's card and inspector, and the steps after it, change.

// Some docked instances keep the kind tile's unscaled mark (and radius): see NodeCard `tile`.
const BIG_MARK = { glyph: 15.732 };
const BIG_TILE = { glyph: 15.732, radius: 7.261 };

// ---- 6.1 Inspector · Rerun or fork (2362:25748), also under the 6.2 modal (2362:25860) -------------------------

export const COPY_DONE_NODES: MapNode[] = patchById(AI_COACH_NODES, {
  writer: {
    state: 'default',
    selected: true,
    status: { text: 'Done · 5 pieces' },
    avatar: { agent: 'Writer', state: 'idle' },
  },
  designer: { tile: BIG_MARK },
});

const WRITER = AI_COACH_INSPECTOR.writer;

export const COPY_DONE_INSPECTOR: InspectorData = {
  ...WRITER,
  meta: 'Writer · Done · 5 pieces',
  preview: WRITER.preview && { ...WRITER.preview, action: 'See all 5 pieces' },
  rerun: {
    description:
      'Redo this step with a note. Community and Publisher redo theirs too.',
  },
};

export const COPY_DONE_RUN: RunData = {
  ...AI_COACH_RUN,
  map: { ...AI_COACH_RUN.map, nodes: COPY_DONE_NODES },
  tasks: patchById(
    AI_COACH_TASKS as (TaskItem & { id: string })[],
    { writer: { state: 'done' } }
  ),
  tasksSummary: '5 of 10 done · about 3 min left',
  inspectors: { ...AI_COACH_RUN.inspectors, writer: COPY_DONE_INSPECTOR },
};

// The rerun confirm with a note (6.2, 2362:25973).
export const RERUN_NOTE_DEFAULT =
  'Mention Penny up front: they give tips, we know your actual budget.';

// ---- 6.3 Rerunning (2362:26001) --------------------------------------------------------------------------------

export const RERUNNING_NODES: MapNode[] = patchById(AI_COACH_NODES, {
  writer: {
    selected: true,
    preview: {
      label: 'X post',
      text: 'Penny gives tips. AI Coach knows your actual budget. Live Mar 12.',
    },
    status: { text: 'Rewriting 2 of 5 pieces', tone: 'live' },
  },
  designer: { tile: BIG_MARK },
  discord: {
    state: 'will-rerun',
    flag: { label: 'Will rerun', tone: 'blue' },
    status: { text: 'Waits for copy' },
    tile: BIG_TILE,
  },
  schedule: {
    state: 'will-rerun',
    flag: { label: 'Will rerun', tone: 'blue' },
    status: { text: 'Waits for copy' },
    tile: BIG_TILE,
  },
});

/** Writer's inspector while it rewrites with the founder's note (6.3, 2362:26091). */
export function rerunningInspector(note: string): InspectorData {
  return {
    ...WRITER,
    meta: 'Writer · Rerunning · 2 of 5 pieces',
    preview: {
      eyebrow: 'Rewriting with your note',
      quote: `“${note}”`,
      working: true,
      action: 'See previous version',
    },
    rerun: {
      description: 'Running now. You can rerun again once Writer finishes.',
      disabled: true,
    },
  };
}

export const RERUNNING_TASKS: TaskItem[] = [
  { id: 'writer', title: 'Launch copy', state: 'running' },
  { id: 'discord', title: 'Discord post', state: 'waiting' },
  { id: 'schedule', title: 'Schedule launch', state: 'waiting' },
  { id: 'designer', title: 'Visuals', state: 'running' },
  { id: 'ready', title: 'Ready to post', state: 'approval' },
  { id: 'plan', title: 'Launch plan', state: 'reused' },
  { id: 'scout', title: 'Competitor scan', state: 'reused' },
  { id: 'insights', title: 'Waitlist survey', state: 'reused' },
  { id: 'decision', title: 'Who is this launch for?', state: 'reused' },
  { id: 'task', title: 'Your launch', state: 'reused' },
];

export function rerunningRun(note: string): RunData {
  return {
    ...AI_COACH_RUN,
    map: { ...AI_COACH_RUN.map, nodes: RERUNNING_NODES },
    tasks: RERUNNING_TASKS,
    tasksSummary:
      'Only Launch copy and what uses it rerun · the old version is kept',
    tasksChip: {
      label: 'Rerunning · 1 of 3 done',
      progress: 100 / 3,
      width: 268,
    },
    inspectors: {
      ...AI_COACH_RUN.inspectors,
      writer: rerunningInspector(note),
    },
  };
}
