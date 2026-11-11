import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

import { Icon } from './Icon';

// Figma "Icon button" (2362:28674): 32px icon-only button. Ghost in toolbars (back, close), Outlined when it
// stands alone (settings, attach). `active` keeps the hover fill.
// `selected` is the Outlined Selected look (2.7, 2.8, 5.1): accent-soft fill, accent-line border; pass the blue icon.
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  iconSize = 16,
  active,
  selected,
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: string;
  label: string;
  variant?: 'ghost' | 'outlined';
  iconSize?: number;
  active?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'flex size-8 shrink-0 items-center justify-center rounded-control',
        variant === 'outlined'
          ? selected
            ? 'border border-accent-line bg-accent-soft'
            : 'border border-line-2 bg-white hover:bg-hover'
          : 'hover:bg-hover',
        active && 'bg-hover',
        className
      )}
      {...rest}
    >
      <Icon src={icon} size={iconSize} />
    </button>
  );
}
