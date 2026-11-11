import clsx from 'clsx';
import type { ReactNode } from 'react';

import { FORK_COLOR, type ForkNumber } from '@/components/map/forks';

// Figma "Branch tab" (2362:29280): branch switcher on the canvas, 28px pill. Selected = soft blue fill,
// Default = text only, Add = dashed "+ fork" slot. An Add slot for a fork being set up (6.4's "+ New fork") takes
// that fork's colour for its dashed border and label.
export function BranchTab({
  label,
  state = 'default',
  fork,
  onClick,
  className,
}: {
  label: string;
  state?: 'selected' | 'default' | 'add';
  fork?: ForkNumber;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={state === 'selected'}
      onClick={onClick}
      className={clsx(
        'flex h-7 shrink-0 flex-col items-center justify-center rounded-full px-3 text-center text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap',
        state === 'selected' && 'bg-accent-soft text-accent',
        state === 'default' && 'text-ink-2 hover:bg-hover',
        state === 'add' &&
          'border border-dashed border-[#cfd0d6] text-muted-2 hover:bg-hover',
        className
      )}
      style={
        state === 'add' && fork
          ? { borderColor: FORK_COLOR[fork], color: FORK_COLOR[fork] }
          : undefined
      }
    >
      {label}
    </button>
  );
}

// Figma "Branches" (6.4, 2362:26203): the branch switcher on the canvas, under the Tasks chip. White, 1px line
// border (in layout), 12px radius, soft shadow, 8px sides, 6px gaps, 40px tall: a 12/18 muted "Branches" label
// (6px sides), then one Branch tab per branch. Scrolls sideways when the canvas is narrow.
export function Branches({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Branches"
      className={clsx(
        'flex h-10 items-center gap-1.5 overflow-x-auto rounded-card border border-line bg-white px-2 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)] [scrollbar-width:none]',
        className
      )}
    >
      <p className="shrink-0 px-1.5 text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted">
        Branches
      </p>
      {children}
    </div>
  );
}
