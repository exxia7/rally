import clsx from 'clsx';

import minus from '@/assets/icons/minus.svg';
import plus from '@/assets/icons/plus-dark.svg';
import { Icon } from '@/components/ui/Icon';

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
