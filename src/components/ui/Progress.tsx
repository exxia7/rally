import clsx from 'clsx';

// Figma "Progress" (2362:28627): determinate bar, line-grey track, accent fill, fully rounded.
// The library bar is 3.69px high (node cards); the settings usage bar is 6px. Width comes from the parent.
export function Progress({
  value,
  height = 3.689,
  fillColor,
  fromValue,
  className,
}: {
  /** 0–100 */
  value: number;
  /** The value it showed before a change the viewer saw: the fill grows from there (motion only). */
  fromValue?: number;
  height?: number;
  /** Fill colour other than the accent (a fork's progress takes its Branch/Fork colour). */
  fillColor?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('w-full overflow-clip rounded-full bg-line', className)}
      style={{ height }}
    >
      <div
        key={fromValue === undefined ? 'fill' : `from-${fromValue}`}
        className={clsx(
          'h-full rounded-full bg-accent',
          fromValue !== undefined && 'pf-grow'
        )}
        style={{
          width: `${pct}%`,
          backgroundColor: fillColor,
          ['--pf-from' as string]: `${Math.max(0, Math.min(100, fromValue ?? pct))}%`,
        }}
      />
    </div>
  );
}
