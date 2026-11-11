import clsx from 'clsx';

// Figma "Segmented control" (2362:28671) built from "_Segment" (2362:28683): two-way view switch
// (Planning / Flowchart). Well fill, 1px line border (in layout), 2px padding, 28px segments; the selected one
// is white with a soft drop shadow. `fit="fixed"` is the 32px top-bar control (segments centred);
// `fit="hug"` hugs the segments (34px), as Panel tabs do.
// `minWidth` pins a segment to its Figma width: Chrome sets Inter a little narrower than Figma, so a
// text-hugging segment comes out ~0.5–1px short and shifts everything after it. It's a minimum, so a longer
// label still grows the segment.
export type Segment<T extends string> = { value: T; label: string; minWidth?: number };

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
            style={o.minWidth ? { minWidth: o.minWidth } : undefined}
            className={clsx(
              'flex h-7 shrink-0 flex-col justify-center rounded-[7px] px-3.5 text-[13px]',
              // A pinned segment keeps its label where Figma draws it, 14px in, and leaves the slack on the
              // right (Figma's text box is the wider one), instead of centring it.
              o.minWidth ? 'items-start text-left' : 'items-center text-center',
              'leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap',
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
