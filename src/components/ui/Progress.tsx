import clsx from 'clsx';
import { motion } from 'framer-motion';

import { transitions, useMotionOn } from '@/lib/motion';

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
  const on = useMotionOn();
  const from =
    on && fromValue !== undefined
      ? Math.max(0, Math.min(100, fromValue))
      : undefined;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('w-full overflow-clip rounded-full bg-line', className)}
      style={{ height }}
    >
      {/* Motion: the fill grows to a new value (from the one the viewer saw, across a route swap); the bar is a few
          dozen px, so animating its width is cheap. */}
      <motion.div
        className="h-full rounded-full bg-accent"
        style={{ backgroundColor: fillColor }}
        initial={from !== undefined ? { width: `${from}%` } : false}
        animate={{ width: `${pct}%` }}
        transition={
          on ? { ...transitions.slow, duration: 0.6 } : transitions.instant
        }
      />
    </div>
  );
}
