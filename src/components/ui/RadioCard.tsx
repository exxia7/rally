import clsx from 'clsx';

import { Radio } from './Radio';

// Figma "Radio card" (2362:28933): large single-choice option with a title and a what-changes preview.
// Used in hand-raise decisions. Selected = accent border, 40% accent-soft fill and a 3px #eef0fe ring.
export function RadioCard({
  title,
  description,
  selected,
  onSelect,
  className,
  titleClassName,
}: {
  title: string;
  description: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  /** e.g. `min-h-[21px]`: Figma rounds the 20.25px title box up to 21px in the hand-raise panel (4.1, 4.3). */
  titleClassName?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        'flex w-[350px] max-w-full items-start gap-3 overflow-clip rounded-[10px] border p-3.5 text-left',
        selected
          ? 'border-accent bg-[rgba(237,243,252,0.4)] shadow-[0px_0px_0px_3px_#eef0fe]'
          : 'border-line hover:bg-well',
        className
      )}
    >
      <span className="flex pt-0.5">
        <Radio on={selected} />
      </span>
      <span className="flex min-w-px flex-1 flex-col">
        <span
          className={clsx(
            'text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] text-ink',
            titleClassName
          )}
        >
          {title}
        </span>
        <span className="pt-0.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
          {description}
        </span>
      </span>
    </button>
  );
}
