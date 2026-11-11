import clsx from 'clsx';
import type { ReactNode } from 'react';

import chevronRight from '@/assets/icons/chevron-right.svg';
import { Icon } from '@/components/ui/Icon';

// Figma "Section toggle" (2362:29239): collapsible section header with a count (e.g. Skills 2) in the Sandbox
// panel. Chevron right rotates down when open; the body renders below when open.
export function SectionToggle({
  label,
  count,
  open,
  onToggle,
  children,
  className,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex w-full flex-col', className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <Icon
          src={chevronRight}
          size={14}
          className={clsx('transition-transform', open && 'rotate-90')}
        />
        <span className="text-[13px] leading-[19.5px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
          {label}
        </span>
        {count !== undefined && (
          <span className="rounded-full bg-well px-1.5 text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
            {count}
          </span>
        )}
      </button>
      {open && children}
    </div>
  );
}
