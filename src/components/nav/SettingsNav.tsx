import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

// Left-hand nav of the settings pages (frames 1.2, 2.7, 2.8): 240px column, 1px right line, 16px padding,
// an 11px muted group label, then Figma "Settings nav item" rows (2362:29287): 32px, 10px padding, 8px radius;
// Selected = white with a soft drop shadow and Medium ink, Default = Regular ink-2.
// Under 768px it becomes a horizontal, scrollable tab row above the content.
// `value` is optional: 2.8 opens with nothing selected. `more` adds a second titled group (2.8 "More": 16px above
// its label); on phones its items join the same tab row, and a white fade on the right edge hints that the row
// scrolls until its last tab is in view.
export type SettingsNavItem<T extends string> = { value: T; label: string };

export function SettingsNav<T extends string>({
  title,
  items,
  value,
  onChange,
  more,
}: {
  title: string;
  items: SettingsNavItem<T>[];
  value?: T;
  onChange: (value: T) => void;
  more?: { title: string; items: SettingsNavItem<T>[] };
}) {
  const row = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  const measure = () => {
    const el = row.current;
    if (el) setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <aside className="flex w-[240px] max-md:relative shrink-0 flex-col items-start self-stretch border-r border-line bg-white p-4 max-md:w-full max-md:border-r-0 max-md:border-b max-md:px-3 max-md:py-2">
      <div className="flex h-[25px] w-full flex-col items-start px-2 pb-2 max-md:hidden">
        <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
          {title}
        </p>
      </div>
      <div
        ref={row}
        onScroll={measure}
        role="tablist"
        aria-label={title}
        className="flex w-full flex-col items-start max-md:flex-row max-md:gap-1 max-md:overflow-x-auto max-md:[scrollbar-width:none]"
      >
        {items.map((item) => (
          <SettingsNavButton
            key={item.value}
            label={item.label}
            selected={item.value === value}
            onClick={() => onChange(item.value)}
          />
        ))}
        {more && (
          <>
            <div className="flex h-[41px] w-full flex-col items-start px-2 pt-4 pb-2 max-md:hidden">
              <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
                {more.title}
              </p>
            </div>
            {more.items.map((item) => (
              <SettingsNavButton
                key={item.value}
                label={item.label}
                selected={item.value === value}
                onClick={() => onChange(item.value)}
              />
            ))}
          </>
        )}
      </div>
      {moreRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-white md:hidden"
        />
      )}
    </aside>
  );
}

export function SettingsNavButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={clsx(
        'flex h-8 w-full shrink-0 items-center rounded-control px-2.5 text-left text-[13px] leading-[19.5px] tracking-[-0.08px] max-md:w-auto max-md:whitespace-nowrap',
        selected
          ? 'bg-white font-medium text-ink drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]'
          : 'text-ink-2 hover:bg-hover'
      )}
    >
      <span className="min-w-px flex-1">{label}</span>
    </button>
  );
}
