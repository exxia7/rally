import clsx from 'clsx';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Radio } from '@/components/ui/Radio';
import { TextInput } from '@/components/ui/TextInput';
import { CHECK_LONG, type CheckLevel, CUSTOM } from '@/state/permissions';

// The pieces every permission editor shares (audit 2i: one model, one set of controls): the preset chips (2.7, 2.8),
// the "When should your team check with you?" radios (2.7, 1.2's preset editor), and an ad limit you can click to
// change (2.7, 2.8, the preset editor). Props-driven: the screen reads and writes src/state/permissions.ts.

// The Figma chip widths: Figma's Inter sets these labels ~1px wider than Chrome.
const CHIP_W: Record<string, string> = {
  Careful: 'w-[62px]',
  Balanced: 'w-[73px]',
  'Hands-off': 'w-[78px]',
  [CUSTOM]: 'w-[65px]',
};

/** Preset chips: the workspace's presets, then Custom. */
export function PresetChips({
  presets,
  value,
  onChange,
  className,
}: {
  presets: string[];
  value: string;
  onChange: (preset: string) => void;
  className?: string;
}) {
  return (
    <div
      className={clsx('flex w-full flex-wrap items-start gap-1.5', className)}
    >
      {[...presets, CUSTOM].map((p) => (
        <ChoiceChip
          key={p}
          selected={p === value}
          className={CHIP_W[p]}
          onClick={() => onChange(p)}
        >
          {p}
        </ChoiceChip>
      ))}
    </div>
  );
}

const CHECKS: CheckLevel[] = ['every', 'unsure', 'go'];

/** 2.7's 36px radio rows (Recommended on "when unsure"). */
export function CheckLevelRadios({
  value,
  onChange,
  className,
}: {
  value: CheckLevel;
  onChange: (check: CheckLevel) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={clsx('flex w-full flex-col', className)}>
      {CHECKS.map((c) => {
        const on = c === value;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(c)}
            className="flex h-9 w-full items-center gap-2.5 text-left"
          >
            <Radio on={on} />
            <span
              className={clsx(
                'text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink',
                on && 'font-medium'
              )}
            >
              {CHECK_LONG[c]}
            </span>
            {c === 'unsure' && <Badge tone="subtle">Recommended</Badge>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * "$50": the ad limit as text that turns into a small number field when clicked (Enter or leaving it saves).
 * Not in Figma as an editor; the value looks exactly as drawn until you click it.
 */
export function AdLimitValue({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const save = () => {
    const n = Math.round(Number((editing ?? '').replace(/[^0-9.]/g, '')));
    if (editing !== null && Number.isFinite(n) && n >= 0) onChange(n);
    setEditing(null);
  };
  if (editing !== null)
    return (
      <span className={clsx('flex items-center', className)}>
        $
        <input
          autoFocus
          aria-label="Ad spend limit in dollars"
          inputMode="numeric"
          value={editing}
          onChange={(e) => setEditing(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(null);
          }}
          className="w-14 rounded-[6px] border border-accent-line px-1 text-right outline-none"
        />
      </span>
    );
  return (
    <button
      type="button"
      aria-label={`Ad spend limit: $${value}. Change it`}
      onClick={() => setEditing(String(value))}
      className={clsx('cursor-text hover:text-accent', className)}
    >
      {/* One text node: "$" + {value} would split it and shift Chrome's glyph antialiasing. */}
      {`$${value}`}
    </button>
  );
}

/** Not in Figma: name a new preset in place ("Save as a new preset") instead of leaving for workspace settings. */
export function PresetNameForm({
  onSave,
  onCancel,
  className,
}: {
  onSave: (name: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [name, setName] = useState('');
  return (
    <form
      className={clsx('flex w-full items-center gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <TextInput
        autoFocus
        aria-label="New preset name"
        placeholder="Preset name"
        className="h-8 min-w-0 flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <Button type="submit" variant="primary" size="sm">
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
