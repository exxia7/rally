import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

import chevronDown from '@/assets/icons/chevron-down-dark-14.svg';
import claudeLogo from '@/assets/icons/claude.svg';
import { Menu } from '@/components/ui/Menu';
import type { Effort, ModelId } from '@/state/types';
import { useOutsideClick } from '@/lib/useOutsideClick';

// Model and effort pickers in the brief composer (2.1). Not in Figma (design/non-figma-ui.md): ghost 32px
// buttons ("Sonnet 5.5 ⌄", "Medium effort ⌄") beside the attach button, each opening the shared Menu 8px below
// with a check on the current choice. The choice is saved on the workflow (brief/model, brief/effort).
type Option<T> = {
  value: T;
  label: string;
  description: string;
  logo?: string;
};

// Every model shows its maker's logo (button and menu). A model from a new maker: add its logo to assets/icons,
// a line here, then the model with that `maker`.
const MAKER_LOGOS = {
  anthropic: claudeLogo,
};
type Maker = keyof typeof MAKER_LOGOS;

const model = (
  value: ModelId,
  maker: Maker,
  label: string,
  description: string
): Option<ModelId> => ({ value, label, description, logo: MAKER_LOGOS[maker] });

const MODELS: Option<ModelId>[] = [
  model(
    'opus',
    'anthropic',
    'Opus 5.5',
    'Best for big, multi-channel launches'
  ),
  model('sonnet', 'anthropic', 'Sonnet 5.5', 'Balanced quality and cost'),
  model('haiku', 'anthropic', 'Haiku 5.5', 'Fastest and cheapest'),
];
const EFFORTS: Option<Effort>[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Quick first pass, fewer drafts',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'A few drafts per output',
  },
  {
    value: 'high',
    label: 'High',
    description: 'More research and drafts',
  },
];
const DEFAULT_MODEL: ModelId = 'sonnet';
const DEFAULT_EFFORT: Effort = 'medium';

function Picker<T extends string>({
  label,
  buttonText,
  options,
  value,
  onChange,
  className,
  placement = 'below',
}: {
  label: string;
  buttonText: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Where the menu opens: under the button (default) or above it (composers pinned to the bottom). */
  placement?: 'below' | 'above';
}) {
  const [open, setOpen] = useState(false);
  const logo = options.find((o) => o.value === value)?.logo;
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([ref], open, close);
  return (
    <div ref={ref} className={clsx('relative flex shrink-0', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className={clsx(
          'flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink-2',
          open ? 'bg-hover' : 'hover:bg-hover'
        )}
      >
        {logo && (
          <img src={logo} alt="" width={14} height={14} className="mr-0.5" />
        )}
        {buttonText}
        <img src={chevronDown} alt="" width={14} height={14} />
      </button>
      {open && (
        <Menu
          label={label}
          onClose={close}
          className={clsx(
            'absolute left-0 w-[263px]',
            placement === 'above' ? 'bottom-10' : 'top-10'
          )}
          items={options.map((o) => ({
            key: o.value,
            label: o.label,
            description: o.description,
            icon: o.logo,
            checked: o.value === value,
            onSelect: () => onChange(o.value),
          }))}
        />
      )}
    </div>
  );
}

export function ModelPicker({
  value = DEFAULT_MODEL,
  onChange,
  placement,
}: {
  value?: ModelId;
  onChange: (value: ModelId) => void;
  placement?: 'below' | 'above';
}) {
  return (
    <Picker
      label="Model"
      buttonText={MODELS.find((m) => m.value === value)!.label}
      options={MODELS}
      value={value}
      onChange={onChange}
      placement={placement}
    />
  );
}

export function EffortPicker({
  value = DEFAULT_EFFORT,
  onChange,
}: {
  value?: Effort;
  onChange: (value: Effort) => void;
}) {
  const current = EFFORTS.find((e) => e.value === value)!.label;
  return (
    <Picker
      label="Effort"
      buttonText={`${current} effort`}
      options={EFFORTS}
      value={value}
      onChange={onChange}
    />
  );
}
