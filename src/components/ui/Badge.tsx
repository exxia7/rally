import clsx from 'clsx';
import type { ReactNode } from 'react';

// Figma "Badge" (2362:28603): static label, 20px, soft fill, no border.
// Neutral = info, Blue = changed/new, Green = done/ok, Amber = waits for you, Red = problem. Solid blue only for "New".
export type BadgeTone =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'solid';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-chip text-ink-2',
  blue: 'bg-accent-soft text-accent',
  green: 'bg-[#e9f6ee] text-[#1a7f45]',
  amber: 'bg-[#fdf3e1] text-[#a1600a]',
  red: 'bg-[#fdecec] text-problem',
  solid: 'bg-accent text-white',
};

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-[6px] px-1.5 py-0.5 text-center text-[11px] leading-4 font-medium whitespace-nowrap',
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
