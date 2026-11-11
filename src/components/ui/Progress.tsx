import clsx from 'clsx';

// Figma "Progress" (2362:28627): determinate bar, line-grey track, accent fill, fully rounded.
// The library bar is 3.69px high (node cards); the settings usage bar is 6px. Width comes from the parent.
export function Progress({
  value,
  height = 3.689,
  className,
}: {
  /** 0–100 */
  value: number;
  height?: number;
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
        className="h-full rounded-full bg-accent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
