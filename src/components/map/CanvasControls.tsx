import clsx from 'clsx';

import chevronDown from '@/assets/icons/chevron-down-14.svg';
import minus from '@/assets/icons/minus.svg';
import plus from '@/assets/icons/plus-dark.svg';
import { Icon } from '@/components/ui/Icon';
import { Progress } from '@/components/ui/Progress';

// Figma "Task progress chip" (2362:30092): collapsed run progress on the canvas. Opens the task list.
export function TaskProgressChip({
  done,
  total,
  open,
  onClick,
  className,
}: {
  done: number;
  total: number;
  open?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={clsx(
        'flex items-center gap-2 rounded-control border border-control-border bg-white py-2 pr-2.5 pl-3 hover:bg-hover',
        className
      )}
    >
      <span className="text-[12px] leading-[18px] font-semibold whitespace-nowrap text-ink">
        Tasks
      </span>
      <Progress value={(done / total) * 100} height={4} className="w-10! shrink-0" />
      <span className="text-[12px] leading-[18px] font-medium whitespace-nowrap text-muted">
        {done} of {total} done
      </span>
      <Icon
        src={chevronDown}
        size={14}
        className={clsx(open && 'rotate-180')}
      />
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
