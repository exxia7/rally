import clsx from 'clsx';

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

// Figma "Task row" (2362:30062): one step in the run task list. Running and Approval get a badge;
// finished steps recede.
export function TaskRow({
  state,
  title,
  className,
}: {
  state: TaskRowState;
  title: string;
  className?: string;
}) {
  const finished = state === 'done' || state === 'reused';
  return (
    <div
      className={clsx(
        'flex h-8 w-full items-center gap-2.5 py-[7px]',
        className
      )}
    >
      <div className="relative size-3.5 shrink-0">
        {state === 'waiting' ? (
          <img
            src={waiting}
            alt=""
            className="absolute top-px left-px size-3"
          />
        ) : (
          <img src={ICON[state]} alt="" className="absolute inset-0 size-3.5" />
        )}
      </div>
      <p
        className={clsx(
          'min-w-px flex-1 truncate text-[12px] leading-[18px]',
          finished ? 'text-muted' : 'font-medium text-ink'
        )}
      >
        {title}
      </p>
      {state === 'running' && (
        <span className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] bg-accent-soft px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-accent">
          Running
        </span>
      )}
      {state === 'approval' && (
        <span className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] bg-well px-1.5 py-0.5 text-center text-[11px] leading-4 font-medium whitespace-nowrap text-ink-2">
          Needs your OK
        </span>
      )}
      {(state === 'waiting' || finished) && (
        <p className="shrink-0 text-[12px] leading-[18px] whitespace-nowrap text-muted">
          {state === 'waiting'
            ? 'Waiting'
            : state === 'done'
              ? 'Done'
              : 'Reused'}
        </p>
      )}
    </div>
  );
}
