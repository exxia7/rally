import clsx from 'clsx';

import { motion } from 'framer-motion';

import { useChangedFrom, useMotionOn } from '@/lib/motion';

// Figma "Run status" (2362:28658): run state in the top bar. 28px pill with a coloured dot, soft fill, no border,
// so it never reads as a button. Under 1280px it shrinks to a 28px dot; the label stays for screen readers
// (sr-only) and as a tooltip.
export type RunState = 'running' | 'paused' | 'rerunning' | 'waiting';

const dots: Record<RunState, string> = {
  running: 'bg-ok',
  paused: 'bg-[#b4b6bc]',
  rerunning: 'bg-accent',
  waiting: 'bg-problem',
};

const defaults: Record<RunState, string> = {
  running: 'Running · $0.18',
  paused: 'Paused · $0.21',
  rerunning: 'Rerunning · $0.22',
  waiting: 'Waiting for approval · $0.31',
};

export function RunStatus({
  state = 'running',
  label,
  className,
}: {
  state?: RunState;
  label?: string;
  className?: string;
}) {
  // Motion: the pill pulses once when the run comes to need you while you watch (one top bar at a time, so one key).
  const from = useChangedFrom('run-status', state);
  const pulse = useMotionOn() && state === 'waiting' && from !== undefined;
  return (
    <motion.div
      key={pulse ? 'needs-you' : 'pill'}
      initial={pulse ? { scale: 1 } : false}
      animate={pulse ? { scale: [1, 1.08, 0.98, 1] } : { scale: 1 }}
      transition={{
        duration: 0.64,
        times: [0, 0.35, 0.65, 1],
        ease: 'easeOut',
      }}
      role="status"
      title={label ?? defaults[state]}
      className={clsx(
        // Shrinks before the workflow title does: the label truncates (full text in the tooltip).
        'flex h-7 min-w-7 shrink items-center gap-1.5 rounded-[14px] bg-chip px-2.5 max-xl:w-7 max-xl:justify-center max-xl:px-0',
        className
      )}
    >
      <span className={clsx('size-1.5 shrink-0 rounded-full', dots[state])} />
      <span className="min-w-0 truncate text-[12px] leading-[18px] font-medium tracking-[-0.08px] text-ink max-xl:sr-only">
        {label ?? defaults[state]}
      </span>
    </motion.div>
  );
}
