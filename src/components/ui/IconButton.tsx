import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

import { Icon } from './Icon';

// Figma "Icon button" (2362:28674): 32px icon-only button. Ghost in toolbars (back, close), Outlined when it
// stands alone (settings, attach). `active` keeps the hover fill, for a toggle that is on (panel open).
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  iconSize = 16,
  active,
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: string;
  label: string;
  variant?: 'ghost' | 'outlined';
  iconSize?: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'flex size-8 shrink-0 items-center justify-center rounded-control',
        variant === 'outlined'
          ? 'border border-line-2 bg-white hover:bg-hover'
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
