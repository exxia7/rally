import clsx from 'clsx';
import type { TextareaHTMLAttributes } from 'react';

// Figma "Text area" (2362:28930): multi-line field for instructions (helper description, fork instruction).
// 57px tall by default, 1px line-2 border, 12/8 padding, 13/20 text.
export function TextArea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'block h-[57px] w-full resize-none overflow-clip rounded-control border border-line-2 bg-white px-3 py-2 text-[13px] leading-5 tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)] focus:border-accent-line',
        className
      )}
      {...rest}
    />
  );
}
