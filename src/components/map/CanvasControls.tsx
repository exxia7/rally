import clsx from 'clsx';
import type { CSSProperties } from 'react';

import chevronDown from '@/assets/icons/chevron-down-14.svg';
import chevronUp from '@/assets/icons/chevron-up.svg';
import minus from '@/assets/icons/minus.svg';
import plus from '@/assets/icons/plus-dark.svg';
import { Icon } from '@/components/ui/Icon';
import { Progress } from '@/components/ui/Progress';

import { FORK_COLOR, type ForkNumber } from './forks';

// Figma "Task progress chip" (2362:30092): collapsed run progress on the canvas. Opens the task list.
// A rerun swaps the "N of M done" text for its own `label` ("Rerunning", 4.2) and may drop the bar
// (`progress={null}`), or keep it for the rerun's own steps ("Rerunning · 1 of 3 done", 6.3).
export function TaskProgressChip({
  done,
  total,
  label,
  progress,
  fork,
  open,
  onClick,
  className,
  style,
}: {
  done: number;
  total: number;
  /** Replaces "N of M done". */
  label?: string;
  /** Bar value 0–100 (default done/total); null hides the bar. */
  progress?: number | null;
  /** On a fork (4.5, 6.5: "Vs Penny · 1 of 3 done") the bar takes the fork's colour. */
  fork?: ForkNumber;
  open?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-expanded={open}
      className={clsx(
        'flex items-center gap-2 rounded-control border border-control-border bg-white py-2 pr-2.5 pl-3 hover:bg-hover',
        className
      )}
    >
      <span className="text-[12px] leading-[18px] font-semibold whitespace-nowrap text-ink">
        Tasks
      </span>
      {progress !== null && (
        <Progress
          value={progress ?? (done / total) * 100}
          height={4}
          fillColor={fork && FORK_COLOR[fork]}
          className="w-10! shrink-0"
        />
      )}
      <span className="text-[12px] leading-[18px] font-medium whitespace-nowrap text-muted">
        {label ?? `${done} of ${total} done`}
      </span>
      <Icon src={open ? chevronUp : chevronDown} size={14} />
    </button>
  );
}

// Figma "Zoom controls" (2362:30112): canvas zoom. 16px from the canvas bottom-right.
export function ZoomControls({
  label,
  onZoomOut,
  onZoomIn,
  onFit,
  className,
}: {
  label: string;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onFit?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 rounded-[10px] edge bg-white p-1 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="flex size-7 items-center justify-center rounded-control hover:bg-hover"
      >
        <Icon src={minus} size={16} />
      </button>
      <div className="flex h-7 w-9 items-center justify-center text-center text-[12px] leading-4 font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
        {label}
      </div>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="flex size-7 items-center justify-center rounded-control hover:bg-hover"
      >
        <Icon src={plus} size={16} />
      </button>
      <div className="h-4 w-px shrink-0 bg-line" />
      <button
        type="button"
        onClick={onFit}
        className="flex h-7 min-w-[63px] items-center justify-center gap-1 rounded-control px-[9px] text-[12px] leading-4 font-medium whitespace-nowrap text-ink hover:bg-hover"
      >
        Fit view
      </button>
    </div>
  );
}
