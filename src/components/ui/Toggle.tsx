import clsx from 'clsx';
import { useState } from 'react';

// Figma "Toggle" (2362:28653): 36×20 on/off switch for tools and settings. Off is a 40% line-grey track.
// Controlled with `checked` + `onChange`, or uncontrolled from `defaultChecked`.
export function Toggle({
  checked,
  defaultChecked = false,
  onChange,
  label,
  className,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        setInner(!on);
        onChange?.(!on);
      }}
      className={clsx(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
        on ? 'bg-accent' : 'bg-line-2 opacity-40',
        className
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 size-4 rounded-full bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-[left]',
          on ? 'left-[18px]' : 'left-0.5'
        )}
      />
    </button>
  );
}
