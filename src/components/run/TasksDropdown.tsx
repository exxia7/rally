import clsx from 'clsx';
import { useState } from 'react';

import closeGray from '@/assets/icons/close-gray.svg';
import taskGlyph from '@/assets/icons/node-kind-task-glyph.svg';
import plusDarkThin from '@/assets/icons/plus-dark-thin.svg';
import { CanvasListCard, CanvasListRow } from '@/components/map/CanvasListCard';
import { FORK_COLOR, type ForkNumber } from '@/components/map/forks';
import {
  OutputIcon,
  OutputStatusText,
  type OutputItem,
  type OutputStatus,
} from '@/components/map/OutputRow';
import {
  TaskIcon,
  TaskStatus,
  type TaskRowState,
} from '@/components/map/TaskRow';
import { TickText } from '@/components/motion/Motion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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

// The Tasks list on every map canvas, pinned 16px in from the canvas's top-left (CanvasListCard). Run canvases (3.x,
// 4.x, 6.x, 5.1, 5.2) draw Figma's "Task progress chip" (2362:30092) and anchored "Task progress" overlay
// (2362:26565) this way; plan canvases (2.x) use it for the planned steps and what goes out (it replaces Figma's
// "What goes out" card). Folded, it is the header: the task glyph, "Tasks", the progress bar and "N of M done" (a
// rerun's or fork's own label, e.g. "Rerunning · 1 of 3 done", or "8 planned"; `progress={null}` drops the bar).
// Open: the run's note, the open steps, after a divider the finished ones, then "Goes out": the outputs with their
// type icons and run status, or (`onOutputsChange`, before the run) remove on hover and "Add an output". It stops
// above the bottom overlays (`fitClassName`) and scrolls. It owns its open state: the header toggles it, a step row
// folds it and calls `onSelectTask` (the screen does what clicking that step's card does), and an outside click or
// Escape folds it (the click still lands). Rows are live: they re-render from the store.
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
  onOpen,
  outputs,
  onOutputsChange,
  fitClassName = RUN_FIT,
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
  /** Called when it opens. Under 1280px a side panel overlays the canvas over a scrim; with `onOpen` the header sits
   *  above that scrim (under the panel itself), so a tap opens the list and the screen closes its panel here. */
  onOpen?: () => void;
  /** The "Goes out" section: the plan's outputs, with their run status on a run. */
  outputs?: (OutputItem & { status?: OutputStatus })[];
  /** Makes "Goes out" editable (plan canvases): remove a row, "Add an output". Called with the new list. */
  onOutputsChange?: (items: OutputItem[]) => void;
  /** Max height that keeps it clear of the canvas's bottom overlays (default: the run's agents bar and zoom). */
  fitClassName?: string;
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
  const addOutput = () => {
    if (!outputs || !onOutputsChange) return;
    // A fresh id: one past the highest "new-N" in the list.
    const n =
      Math.max(
        0,
        ...outputs.map((o) => Number(/^new-(\d+)$/.exec(o.id)?.[1] ?? 0))
      ) + 1;
    onOutputsChange([
      ...outputs,
      { id: `new-${n}`, label: 'New output', type: 'post', isNew: true },
    ]);
  };

  return (
    <CanvasListCard
      icon={<Icon src={taskGlyph} size={12} />}
      title="Tasks"
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) onOpen?.();
      }}
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
      footer={
        onOutputsChange && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            leading={<Icon src={plusDarkThin} size={16} />}
            onClick={addOutput}
          >
            Add an output
          </Button>
        )
      }
      className={clsx(
        'absolute top-4 left-4',
        onOpen && 'max-xl:z-[35]',
        fitClassName,
        className
      )}
    >
      {note && (
        <p className="w-full shrink-0 px-3 pt-1 pb-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
          {note}
        </p>
      )}
      {unfinished.map(row)}
      {unfinished.length > 0 && finished.length > 0 && <Divider />}
      {finished.map(row)}
      {outputs && (outputs.length > 0 || onOutputsChange) && (
        <>
          {tasks.length > 0 && <Divider />}
          <p className="w-full shrink-0 px-3 pt-1 pb-0.5 text-[12px] leading-[18px] font-medium tracking-[-0.08px] text-muted">
            Goes out
          </p>
          {outputs.map((o) => (
            <CanvasListRow
              key={o.id}
              icon={<OutputIcon type={o.type} />}
              label={o.label}
              trailing={
                <>
                  {o.isNew && (
                    <Badge tone="solid" size="xs">
                      New
                    </Badge>
                  )}
                  {o.status && <OutputStatusText status={o.status} />}
                  {onOutputsChange && (
                    <button
                      type="button"
                      aria-label={`Remove ${o.label}`}
                      onClick={() =>
                        onOutputsChange(outputs.filter((x) => x.id !== o.id))
                      }
                      className="hidden shrink-0 group-focus-within:flex group-hover:flex"
                    >
                      <Icon src={closeGray} size={14} />
                    </button>
                  )}
                </>
              }
            />
          ))}
        </>
      )}
    </CanvasListCard>
  );
}

const Divider = () => <div className="my-1 h-px w-full shrink-0 bg-line" />;

// Clear of the run's Completed agents bar (bottom-left, 62px + 16px) and, on phones, the zoom controls above it.
const RUN_FIT = 'max-h-[calc(100%-104px)] max-md:max-h-[calc(100%-163px)]';
