import approval from '@/assets/icons/task-approval.svg';
import done from '@/assets/icons/task-done.svg';
import reused from '@/assets/icons/task-reused.svg';
import running from '@/assets/icons/task-running.svg';
import waiting from '@/assets/icons/task-waiting.png';

export type TaskRowState =
  | 'running'
  | 'approval'
  | 'waiting'
  | 'done'
  | 'reused';

const ICON: Record<Exclude<TaskRowState, 'waiting'>, string> = {
  running,
  approval,
  done,
  reused,
};

// Figma "Task row" (2362:30062) parts, used by the Tasks list's rows (CanvasListRow): the 14px state icon (the
// waiting clock is 12px, inset 1px) and the trailing status. Running and Approval get a badge; the rest a muted word.
export function TaskIcon({ state }: { state: TaskRowState }) {
  return (
    <span className="relative size-3.5 shrink-0">
      {state === 'waiting' ? (
        <img src={waiting} alt="" className="absolute top-px left-px size-3" />
      ) : (
        <img src={ICON[state]} alt="" className="absolute inset-0 size-3.5" />
      )}
    </span>
  );
}

export function TaskStatus({ state }: { state: TaskRowState }) {
  if (state === 'running')
    return (
      <span className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] bg-accent-soft px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-accent">
        Running
      </span>
    );
  if (state === 'approval')
    return (
      <span className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] bg-well px-1.5 py-0.5 text-center text-[11px] leading-4 font-medium whitespace-nowrap text-ink-2">
        Needs your OK
      </span>
    );
  return (
    <span className="shrink-0 text-[12px] leading-[18px] whitespace-nowrap text-muted">
      {state === 'waiting' ? 'Waiting' : state === 'done' ? 'Done' : 'Reused'}
    </span>
  );
}
