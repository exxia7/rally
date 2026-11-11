import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

import chevronDown from '@/assets/icons/chevron-down.svg';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { Button } from './Button';
import { Icon } from './Icon';

// Figma "Workflow status filter" (2362:30248): secondary status filter beside the All / Running / Needs you chips.
// A Secondary Small button with a chevron ("Status" when All, otherwise the chosen value) that opens a 160px
// menu 36px below: Any status, Drafts, Done (Ghost Small rows). Closes on choice, outside click or Escape.
export type StatusFilterValue = 'all' | 'drafts' | 'done';

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'done', label: 'Done' },
];

export function StatusFilter({
  value,
  onChange,
  defaultOpen = false,
  className,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([ref], open, close);
  return (
    <div ref={ref} className={clsx('relative flex items-start', className)}>
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        trailing={<Icon src={chevronDown} size={16} />}
        onClick={() => setOpen((o) => !o)}
      >
        {value === 'all' ? 'Status' : value === 'drafts' ? 'Drafts' : 'Done'}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute top-9 left-0 z-30 flex w-[160px] max-w-[calc(100vw-32px)] flex-col items-start gap-1 overflow-clip rounded-control border border-control-border bg-white p-1"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex h-7 w-full shrink-0 items-center gap-1 rounded-control px-3 text-[12px] leading-4 font-medium whitespace-nowrap text-ink hover:bg-hover"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
