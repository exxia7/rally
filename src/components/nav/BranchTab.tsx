import clsx from 'clsx';

// Figma "Branch tab" (2362:29280): branch switcher on the canvas, 28px pill. Selected = soft blue fill,
// Default = text only, Add = dashed "+ fork" slot.
export function BranchTab({
  label,
  state = 'default',
  onClick,
  className,
}: {
  label: string;
  state?: 'selected' | 'default' | 'add';
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={state === 'selected'}
      onClick={onClick}
      className={clsx(
        'flex h-7 shrink-0 flex-col items-center justify-center rounded-full px-3 text-center text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap',
        state === 'selected' && 'bg-accent-soft text-accent',
        state === 'default' && 'text-ink-2 hover:bg-hover',
        state === 'add' &&
          'border border-dashed border-[#cfd0d6] text-muted-2 hover:bg-hover',
        className
      )}
    >
      {label}
    </button>
  );
}
