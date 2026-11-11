import clsx from 'clsx';

// Figma "Segmented control" (2362:28671) built from "_Segment" (2362:28683): two-way view switch
// (Planning / Flowchart). Well fill, 1px line border (in layout), 2px padding, 28px segments; the selected one
// is white with a soft drop shadow. `fit="fixed"` is the 32px top-bar control (segments centred);
// `fit="hug"` hugs the segments (34px), as Panel tabs do.
export type Segment<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fit = 'fixed',
  label,
  className,
}: {
  options: Segment<T>[];
  value: T;
  onChange?: (value: T) => void;
  fit?: 'fixed' | 'hug';
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx(
        'flex shrink-0 rounded-[9px] border border-line bg-well p-[2px]',
        fit === 'fixed' ? 'h-8 items-center' : 'items-start',
        className
      )}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(o.value)}
            className={clsx(
              'flex h-7 shrink-0 flex-col items-center justify-center rounded-[7px] px-3.5 text-center text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap',
              selected
                ? 'bg-white text-ink drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]'
                : 'text-muted hover:text-ink'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
