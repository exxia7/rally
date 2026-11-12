import clsx from "clsx";
import { useRef } from "react";

import { TaskRow, type TaskRowState } from "@/components/map/TaskRow";
import { Progress } from "@/components/ui/Progress";
import { useScrollEdges } from "@/lib/useScrollEdges";

export type TaskItem = {
  /** Map node id, so picking a task can open its inspector. */
  id?: string;
  title: string;
  state: TaskRowState;
};

const FINISHED: TaskRowState[] = ["done", "reused"];

// Figma "Task progress" (anchored tasks overlay, 3.2-tasks 2362:26565): the run's task list, dropped 8px below the
// Tasks chip (canvas 16, 60). 360px white card, control-border 1px (in layout), 10px radius, 16px padding, 6px gaps,
// soft shadow. SemiBold 12 "Tasks", an 11.5/18 muted summary, a progress bar, then the open steps (6px top
// padding) and, after a 1px divider, the finished ones. A transparent layer behind it closes it on any outside
// click (Figma's "Click outside to close"). Under 768px it is as wide as the canvas allows and scrolls.
export function TasksOverlay({
  tasks,
  summary,
  onClose,
  onSelect,
  showClose,
  showProgress = true,
  className,
}: {
  tasks: TaskItem[];
  /** e.g. "4 of 10 done · about 4 min left". Defaults to the done count. */
  summary?: string;
  onClose: () => void;
  /** Picking a step (e.g. open its inspector). */
  onSelect?: (task: TaskItem) => void;
  /** A SemiBold muted "Close" on the right of the title (4.2-tasks, 2362:27256). */
  showClose?: boolean;
  /** The progress bar under the summary (a rerun's list drops it: 4.2-tasks). */
  showProgress?: boolean;
  className?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(list);
  const open = tasks.filter((t) => !FINISHED.includes(t.state));
  const finished = tasks.filter((t) => FINISHED.includes(t.state));
  const row = (t: TaskItem) => (
    <button
      key={t.id ?? t.title}
      type="button"
      onClick={() => onSelect?.(t)}
      className="flex w-full shrink-0 rounded-[6px] text-left hover:bg-well"
    >
      <TaskRow state={t.state} title={t.title} />
    </button>
  );
  return (
    <>
      <div aria-hidden onClick={onClose} className="fixed inset-0 z-20" />
      <div
        role="dialog"
        aria-label="Tasks"
        className={clsx(
          "absolute top-[60px] left-4 z-20 flex max-h-[calc(100%-76px)] w-[360px] max-w-[calc(100%-32px)] flex-col items-start gap-1.5 overflow-hidden rounded-[10px] border border-control-border bg-white pt-4 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)]",
          className,
        )}
      >
        <div className="flex w-full shrink-0 items-start justify-between px-4 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] whitespace-nowrap">
          <p className="text-ink">Tasks</p>
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-ink"
            >
              Close
            </button>
          )}
        </div>
        <p className="w-full shrink-0 px-4 text-[11.5px] leading-[18px] tracking-[-0.08px] text-muted">
          {summary ?? `${finished.length} of ${tasks.length} done`}
        </p>
        {showProgress && (
          <div className="w-full shrink-0 px-4">
            <Progress value={(finished.length / tasks.length) * 100} />
          </div>
        )}
        {/* The summary stays put; a long list scrolls under it, with a fade at the cut while there's more. */}
        <div className="relative flex min-h-0 w-full flex-col">
          <div
            ref={list}
            className="flex min-h-0 w-full flex-col items-start gap-1.5 overflow-y-auto overscroll-contain px-4 pb-4"
          >
            <div className="flex w-full shrink-0 flex-col items-start pt-1.5">
              {open.map(row)}
            </div>
            {finished.length > 0 && (
              <>
                <div className="h-px w-full shrink-0 bg-line" />
                <div className="flex w-full shrink-0 flex-col items-start">
                  {finished.map(row)}
                </div>
              </>
            )}
          </div>
          {edges.bottom && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
            />
          )}
        </div>
      </div>
    </>
  );
}
