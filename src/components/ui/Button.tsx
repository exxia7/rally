import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Figma "Button" (2362:28740): Primary, Secondary, Ghost, Danger; Small 28px, Medium 32px.
// 12px horizontal padding, 4px gap, 16px icons, 8px radius.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-ink',
  secondary:
    'border border-control-border bg-white text-ink hover:bg-hover disabled:bg-disabled disabled:text-disabled-ink',
  ghost: 'bg-transparent text-ink hover:bg-hover disabled:text-disabled-ink',
  danger:
    'bg-transparent text-problem hover:bg-hover disabled:text-disabled-ink',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  leading,
  trailing,
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
    </button>
  );
}
