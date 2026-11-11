import clsx from 'clsx';
import type { ReactNode } from 'react';

// Figma "Choice chip" (2362:28622): pill, 28px, Medium 12.
export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'flex h-7 shrink-0 flex-col items-center justify-center rounded-[14px] px-2.5 text-center text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap',
        selected ? 'bg-accent-chip text-accent' : 'bg-chip text-ink-2'
      )}
    >
      {children}
    </button>
  );
}
