import clsx from 'clsx';

import { Checkbox } from './Checkbox';

// Figma "Tool row" (2362:28952): a tool in the tool picker: checkbox, name, and where it comes from
// (Built in / Connected). 32px, 12px padding, 6px radius. Clicking the row toggles it.
// `fill` stretches it to its list (the tool picker on a card); `dense` is the 30px row in the helper drawer's list.
export function ToolRow({
  name,
  source = 'Built in',
  checked,
  onToggle,
  fill,
  dense,
  className,
}: {
  name: string;
  source?: string;
  checked?: boolean;
  onToggle?: () => void;
  fill?: boolean;
  dense?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={clsx(
        'flex max-w-full shrink-0 items-center gap-2.5 rounded-[6px] px-3 text-left hover:bg-well',
        dense ? 'h-[30px]' : 'h-8',
        fill || dense ? 'w-full' : 'w-[240px]',
        className
      )}
    >
      <Checkbox style="solid" checked={checked} />
      <span className="min-w-px flex-1 text-[13px] leading-5 tracking-[-0.066px] whitespace-nowrap text-ink">
        {name}
      </span>
      <span className="text-center text-[12px] leading-[18px] tracking-[-0.066px] whitespace-nowrap text-muted">
        {source}
      </span>
    </button>
  );
}
