import clsx from 'clsx';

// Figma "Fix step" (2362:29245): numbered tab in the hand-raise panel when there are several things to fix.
// Current = solid accent 20px number + SemiBold ink label; Upcoming = outlined number + muted label.
export function FixStep({
  n,
  label,
  current,
  onClick,
}: {
  n: number;
  label: string;
  current?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current}
      onClick={onClick}
      className="flex shrink-0 items-center gap-2"
    >
      <span
        className={clsx(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-center text-[11px] leading-[16.5px] tracking-[-0.08px]',
          current
            ? 'bg-accent font-semibold text-white'
            : 'border border-line-2 text-muted'
        )}
      >
        {n}
      </span>
      <span
        className={clsx(
          'text-center text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap',
          current ? 'font-semibold text-ink' : 'text-muted'
        )}
      >
        {label}
      </span>
    </button>
  );
}
