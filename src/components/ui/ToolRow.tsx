import clsx from 'clsx';

import { Checkbox } from './Checkbox';

// Figma "Tool row" (2362:28952): a tool in the tool picker: checkbox, name, and where it comes from
// (Built in / Connected). 32px, 12px padding, 6px radius. Clicking the row toggles it.
export function ToolRow({
  name,
  source = 'Built in',
  checked,
  onToggle,
  className,
}: {
  name: string;
  source?: string;
  checked?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={clsx(
        'flex h-8 w-[240px] max-w-full items-center gap-2.5 rounded-[6px] px-3 text-left hover:bg-well',
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
