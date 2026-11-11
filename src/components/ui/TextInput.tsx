import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

import { Icon } from './Icon';

// Figma "Text Input" (2362:28920): single-line field, 40px. Outlined (1px line-2 border in layout, 12px padding,
// 8px radius) or Borderless inside a composer box. Placeholder is ink at 50%. Optional leading icon (search).
export function TextInput({
  appearance = 'outlined',
  leadingIcon,
  className,
  inputClassName,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  appearance?: 'outlined' | 'borderless';
  leadingIcon?: string;
  inputClassName?: string;
}) {
  return (
    <label
      className={clsx(
        'flex h-10 min-w-0 items-center justify-center gap-2 overflow-clip',
        appearance === 'outlined' &&
          'rounded-control border border-line-2 px-3 focus-within:border-accent-line',
        className
      )}
    >
      {leadingIcon && <Icon src={leadingIcon} size={14} />}
      <input
        className={clsx(
          'min-w-px flex-1 bg-transparent text-[13px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]',
          inputClassName
        )}
        {...rest}
      />
    </label>
  );
}
