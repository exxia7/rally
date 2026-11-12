import clsx from 'clsx';
import { useState } from 'react';

import taskGlyph from '@/assets/icons/node-kind-task-glyph.svg';
import { CanvasListCard, CanvasListRow } from '@/components/map/CanvasListCard';
import { FORK_COLOR, type ForkNumber } from '@/components/map/forks';
import {
  TaskIcon,
  TaskStatus,
  type TaskRowState,
} from '@/components/map/TaskRow';
import { TickText } from '@/components/motion/Motion';
import { Icon } from '@/components/ui/Icon';
import { Progress } from '@/components/ui/Progress';
import { useChangedFrom } from '@/lib/motion';

const TASK_FINISHED: readonly TaskRowState[] = ['done', 'reused'];

export type TaskItem = {
  /** Map node id, so picking a task can do what clicking its card does. */
  id?: string;
  title: string;
  state: TaskRowState;
};

// The run's Tasks list on every run canvas (3.x, 4.x, 6.x, 5.1, 5.2): Figma's "Task progress chip" (2362:30092)
// and anchored "Task progress" overlay (2362:26565) drawn as the plan map's "What goes out" card (CanvasListCard),
// pinned 16px in from the canvas's top-left. Folded, it is the header: the task glyph, "Tasks", the progress bar and
// "N of M done" (a rerun's or fork's own label, e.g. "Rerunning · 1 of 3 done"; `progress={null}` drops the bar).
// Open, the run's note, the open steps and, after a divider, the finished ones; it stops above the Completed agents
// bar (phones: above the zoom controls) and scrolls. It owns its open state: the header toggles it, a row folds it
// and calls `onSelectTask` (the screen does what clicking that step's card does), and an outside click or Escape
// folds it (the click still lands). Rows are live: they re-render from the store as the run advances.
export function TasksDropdown({
  tasks,
  note,
  done: doneProp,
  total: totalProp,
  label,
  progress,
  fork,
  motionKey,
  defaultOpen = false,
  onSelectTask,
  className,
}: {
  tasks: TaskItem[];
  /** A line over the rows, e.g. "4 of 10 done · about 4 min left". */
  note?: string;
  /** Header counts (default: the finished and total task counts). */
  done?: number;
  total?: number;
  /** Replaces "N of M done". */
  label?: string;
  /** Bar value 0–100 (default done/total); null hides the bar. */
  progress?: number | null;
  /** On a fork (4.5, 6.5: "Vs Penny · 1 of 3 done") the bar takes the fork's colour. */
  fork?: ForkNumber;
  /** Remembers the progress across beats, so the bar grows and the count ticks when a step finishes. */
  motionKey?: string;
  /** Opens on load (the `*-tasks` frames). */
  defaultOpen?: boolean;
  onSelectTask?: (task: TaskItem) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const unfinished = tasks.filter((t) => !TASK_FINISHED.includes(t.state));
  const finished = tasks.filter((t) => TASK_FINISHED.includes(t.state));
  const done = doneProp ?? finished.length;
  const total = totalProp ?? tasks.length;
  const value = progress ?? (total ? (done / total) * 100 : 0);
  const text = label ?? `${done} of ${total} done`;
  const fromValue = useChangedFrom(
    motionKey && `${motionKey}:bar`,
    String(progress === null ? 'none' : value)
  );
  const textFrom = useChangedFrom(motionKey && `${motionKey}:text`, text);

  const row = (t: TaskItem) => (
    <CanvasListRow
      key={t.id ?? t.title}
      icon={<TaskIcon state={t.state} />}
      label={t.title}
      muted={TASK_FINISHED.includes(t.state)}
      trailing={<TaskStatus state={t.state} />}
      onClick={() => {
        setOpen(false);
        onSelectTask?.(t);
      }}
    />
  );

  return (
    <CanvasListCard
      icon={<Icon src={taskGlyph} size={12} />}
      title="Tasks"
      open={open}
      onOpenChange={setOpen}
      summary={
        <>
          {progress !== null && (
            <Progress
              value={value}
              fromValue={
                fromValue === undefined || fromValue === 'none'
                  ? undefined
                  : Number(fromValue)
              }
              height={4}
              fillColor={fork && FORK_COLOR[fork]}
              className="w-10! shrink-0"
            />
          )}
          <TickText
            text={text}
            play={textFrom !== undefined}
            className="shrink-0 text-[12px] leading-[18px] font-medium whitespace-nowrap text-muted"
          />
        </>
      }
      className={clsx(
        // Clear of the Completed agents bar (bottom-left, 56px + 16px) and, on phones, the zoom controls above it.
        'absolute top-4 left-4 max-h-[calc(100%-104px)] max-md:max-h-[calc(100%-163px)]',
        className
      )}
    >
      {note && (
        <p className="w-full shrink-0 px-3 pt-1 pb-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
          {note}
        </p>
      )}
      {unfinished.map(row)}
      {unfinished.length > 0 && finished.length > 0 && (
        <div className="my-1 h-px w-full shrink-0 bg-line" />
      )}
      {finished.map(row)}
    </CanvasListCard>
  );
}
