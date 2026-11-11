import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { ShortcutKey } from './ShortcutKey';

// Figma "Button" (2362:28740): Primary, Secondary, Ghost, Danger; Small 28px, Medium 32px; Default, Hover, Disabled.
// 12px horizontal padding, 4px gap, 16px icons, 8px radius. Optional leading/trailing icon and keyboard shortcut.
// Secondary's 1px border takes layout space (Figma stroke included); its Disabled variant has no border.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Keyboard shortcut shown after the label, e.g. "S". */
  shortcut?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-ink',
  secondary:
    'border border-control-border bg-white text-ink hover:bg-hover disabled:border-0 disabled:bg-disabled disabled:text-disabled-ink',
  ghost:
    'bg-transparent text-ink hover:bg-hover disabled:bg-transparent disabled:text-disabled-ink',
  danger:
    'bg-transparent text-problem hover:bg-hover disabled:bg-transparent disabled:text-disabled-ink',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  leading,
  trailing,
  shortcut,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-control px-3 font-medium leading-4 whitespace-nowrap disabled:cursor-default',
        size === 'md' ? 'h-8 text-[13px]' : 'h-7 text-[12px]',
        variants[variant],
        className
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
      {shortcut && <ShortcutKey>{shortcut}</ShortcutKey>}
    </button>
  );
}
