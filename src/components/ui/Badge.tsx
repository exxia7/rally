import clsx from 'clsx';
import type { ReactNode } from 'react';

// Figma "Badge" (2362:28603): static label, 20px, soft fill, no border.
// Neutral = info, Blue = changed/new, Green = done/ok, Amber = waits for you, Red = problem. Solid blue only for "New".
// `subtle` is the Neutral instance the screens place on white cards (well fill, #f7f7f8).
// `size="xs"` is the scaled-down "New" badge inside an Output row.
export type BadgeTone =
  | 'neutral'
  | 'subtle'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'solid';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-chip text-ink-2',
  subtle: 'bg-well text-ink-2',
  blue: 'bg-accent-soft text-accent',
  green: 'bg-[#e5f6ec] text-[#17703c]',
  amber: 'bg-[#fff4e0] text-[#a66600]',
  red: 'bg-[#fff1f1] text-[#c42b30]',
  solid: 'bg-accent text-white',
};

export function Badge({
  tone = 'neutral',
  size = 'md',
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  size?: 'md' | 'xs';
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center text-center font-medium whitespace-nowrap',
        size === 'md'
          ? 'gap-1 rounded-[6px] px-1.5 py-0.5 text-[11px] leading-4'
          : 'gap-[3.112px] rounded-[4.668px] px-[4.668px] py-[1.556px] text-[8.559px] leading-[12.449px]',
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
