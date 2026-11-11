import clsx from 'clsx';
import { useRef, type CSSProperties } from 'react';

import chevronRightDark from '@/assets/icons/chevron-right-dark.svg';
import plusDarkThin from '@/assets/icons/plus-dark-thin.svg';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ToolRow } from '@/components/ui/ToolRow';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { TOOLS } from './tools';

// Figma "ToolPicker" (2.4b, 2362:23931): edit a helper's tools right on its card. 296px popover (white, 1px line,
// 12px radius, 6px padding, layered shadow): "Tools for <helper>" + "From Sandbox", the Tool rows, then a line and
// Ghost Small "Connect a tool" / "Open full editor ›". The 2.4b map draws it at 0.85 (`scale`).
export function ToolPicker({
  helper,
  selected,
  onToggle,
  onConnect,
  onOpenFullEditor,
  onClose,
  scale,
  className,
  style,
}: {
  helper: string;
  selected: string[];
  onToggle: (tool: string) => void;
  onConnect?: () => void;
  onOpenFullEditor?: () => void;
  /** Called on a click outside or Escape. */
  onClose?: () => void;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const refs = useRef([ref]).current;
  useOutsideClick(refs, !!onClose, onClose ?? noop);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Tools for ${helper}`}
      className={clsx(
        'flex w-[296px] flex-col items-start rounded-card bg-white p-[7px] shadow-[inset_0_0_0_1px_var(--color-line)] [filter:drop-shadow(0px_1px_1.5px_rgba(0,0,0,0.06))_drop-shadow(0px_8px_12px_rgba(0,0,0,0.12))]',
        className
      )}
      style={scale ? { zoom: scale, ...style } : style}
    >
      <div className="flex w-full items-center justify-between px-3 pt-2.5 pb-2 tracking-[-0.066px] whitespace-nowrap">
        <p className="text-[14px] leading-5 font-medium text-ink">
          Tools for {helper}
        </p>
        <p className="text-[12px] leading-[18px] text-muted">From Sandbox</p>
      </div>
      {TOOLS.map((t) => (
        <ToolRow
          key={t.name}
          name={t.name}
          source={t.source}
          checked={selected.includes(t.name)}
          onToggle={() => onToggle(t.name)}
          fill
        />
      ))}
      <div className="flex w-full flex-col items-start pt-1.5">
        <div className="flex w-full items-center justify-between pt-[5px] shadow-[inset_0_1px_0_0_var(--color-line)]">
          <Button
            variant="ghost"
            size="sm"
            leading={<Icon src={plusDarkThin} size={16} />}
            onClick={onConnect}
          >
            Connect a tool
          </Button>
          <Button
            variant="ghost"
            size="sm"
            trailing={<Icon src={chevronRightDark} size={16} />}
            onClick={onOpenFullEditor}
          >
            Open full editor
          </Button>
        </div>
      </div>
    </div>
  );
}

const noop = () => {};
