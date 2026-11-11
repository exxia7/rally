import clsx from 'clsx';

// Figma "Radio" (2362:28599): 16px single-choice dot. On = accent ring with an 8px dot.
// Visual only; the clickable row (Radio card, list item) owns the input semantics.
export function Radio({ on, className }: { on?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex size-4 shrink-0 items-center justify-center rounded-full border',
        on ? 'border-accent' : 'border-line-2',
        className
      )}
    >
      {on && <span className="size-2 rounded-full bg-accent" />}
    </span>
  );
}
