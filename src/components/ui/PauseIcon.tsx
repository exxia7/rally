import clsx from 'clsx';

// Figma "Icon / Pause" (2362:28554): two rounded bars, drawn as boxes in Figma (not a vector), so they are
// rebuilt here from its exact geometry: bars at 25–41.67% and 58.33–75% across, 16.67% inset top and bottom.
export function PauseIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx('relative block shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-y-[16.67%] right-[58.33%] left-1/4 rounded-[0.75px] bg-ink" />
      <span className="absolute inset-y-[16.67%] right-1/4 left-[58.33%] rounded-[0.75px] bg-ink" />
    </span>
  );
}
