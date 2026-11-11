import clsx from 'clsx';

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
  return (
    <div
      role="status"
      title={label ?? defaults[state]}
      className={clsx(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-[14px] bg-chip px-2.5 max-xl:w-7 max-xl:justify-center max-xl:px-0',
        className
      )}
    >
      <span className={clsx('size-1.5 shrink-0 rounded-full', dots[state])} />
      <span className="text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink max-xl:sr-only">
        {label ?? defaults[state]}
      </span>
    </div>
  );
}
