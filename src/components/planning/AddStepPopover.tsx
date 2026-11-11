import clsx from 'clsx';
import { useRef, useState, type CSSProperties } from 'react';

import close16 from '@/assets/icons/close-16.svg';
import mic from '@/assets/icons/mic.svg';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { StepOption } from './PlanMapParts';

export type NewStep =
  | { type: 'helper'; name: string; description: string }
  | { type: 'approval' }
  | { type: 'condition' };

const SUGGESTED = [
  {
    name: 'Fact-checker',
    description: 'Checks claims before anything is written',
  },
  { name: 'Reviewer', description: 'Reads the message as your customer would' },
  { name: 'Translator', description: 'Makes a Spanish version' },
];

// Figma "AddStepPopover" (2.4c, 2362:24051): opens from the "+" on a plan-map connector. 222.75px at map scale 1
// (white, 0.825px line stroke, 8.25px radius, 6.6px padding, layered shadow): "Add a step between A and B" + ×,
// "Suggested for this launch" helpers, a describe-a-helper field with a mic, then "Flow steps" (You approve,
// Only if…). Picking one calls `onPick`; the field adds a helper named after what you type. `scale` draws it at
// another map scale (CSS zoom).
export function AddStepPopover({
  from,
  to,
  onPick,
  onClose,
  scale,
  className,
  style,
}: {
  from: string;
  to: string;
  onPick: (step: NewStep) => void;
  onClose: () => void;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const refs = useRef([ref]).current;
  useOutsideClick(refs, true, onClose);
  const [text, setText] = useState('');
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Add a step between ${from} and ${to}`}
      className={clsx(
        'flex w-[222.75px] flex-col items-start rounded-[8.25px] bg-white p-[7.425px] shadow-[inset_0_0_0_0.825px_var(--color-line)] [filter:drop-shadow(0px_0.825px_1.237px_rgba(16,18,24,0.06))_drop-shadow(0px_9.9px_13.2px_rgba(16,18,24,0.1))]',
        className
      )}
      style={scale ? { zoom: scale, ...style } : style}
    >
      <div className="flex w-full items-center px-[6.6px] pt-[3.3px]">
        <p className="min-w-px flex-1 text-[10.725px] leading-[16.5px] font-semibold tracking-[-0.066px] text-ink">
          Add a step between {from} and {to}
        </p>
        <IconButton icon={close16} label="Close" onClick={onClose} />
      </div>
      <p className="w-full px-[6.6px] pt-[6.6px] text-[9.075px] leading-[14px] tracking-[-0.066px] whitespace-nowrap text-muted">
        Suggested for this launch
      </p>
      <div className="flex w-full flex-col items-start pt-[3.3px]">
        {SUGGESTED.map((s) => (
          <StepOption
            key={s.name}
            type="helper"
            title={s.name}
            hint={s.description}
            onClick={() => onPick({ type: 'helper', ...s })}
          />
        ))}
      </div>
      <div className="flex w-full flex-col items-start px-[3.3px] pt-[3.3px]">
        <label className="flex h-[29.7px] w-full items-center gap-[3.3px] rounded-[8.25px] px-[8.25px] shadow-[inset_0_0_0_0.825px_var(--color-line)]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              const name = text.trim();
              if (e.key === 'Enter' && name)
                onPick({
                  type: 'helper',
                  name,
                  description: 'A helper you described',
                });
            }}
            placeholder="Or describe a helper…"
            aria-label="Describe a helper"
            className="h-[14.85px] min-w-px flex-1 bg-transparent text-[9.9px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
          />
          <Icon src={mic} size={11.55} />
        </label>
      </div>
      <p className="h-[23.9px] w-full px-[6.6px] pt-[9.9px] text-[9.075px] leading-[14px] tracking-[-0.066px] whitespace-nowrap text-muted">
        Flow steps
      </p>
      <div className="flex w-full flex-col items-start pt-[3.3px]">
        <StepOption
          type="approval"
          onClick={() => onPick({ type: 'approval' })}
        />
        <StepOption
          type="condition"
          onClick={() => onPick({ type: 'condition' })}
        />
      </div>
    </div>
  );
}
