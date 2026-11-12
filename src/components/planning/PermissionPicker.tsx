import clsx from 'clsx';

import { Button } from '@/components/ui/Button';
import { RadioCard } from '@/components/ui/RadioCard';

export type AskLevel = 'ask-first' | 'spends-money' | 'just-go';

const ASK_OPTIONS: {
  value: AskLevel;
  title: string;
  description: string;
}[] = [
  {
    value: 'ask-first',
    title: 'Ask me first',
    description:
      'Waits for your OK before it posts or spends. Shows "Asks you first" on the card.',
  },
  {
    value: 'spends-money',
    title: 'Only when it spends money',
    description: 'Posts on schedule, asks before any ad spend.',
  },
  {
    value: 'just-go',
    title: 'Just go',
    description: 'Runs without asking. Workspace rules still apply.',
  },
];

// Figma "PermissionPicker" (2.4e, 2362:27748): "Before <helper> runs" popover beside a plan-map card. Designed at
// 320px (12px sides, 14px top, 12px bottom, 8px gaps, 12px radius, 1/3 + 8/24 shadow) and drawn on the 2.x map
// at its 0.85 scale (`scale`, CSS zoom). SemiBold 13 title, 12px muted-2 summary, three Radio cards (294px), and a
// footer with the team default (11px muted-2) and a Ghost Small "Permissions" link.
export function PermissionPicker({
  helper,
  summary,
  value,
  onChange,
  teamDefault = 'ask when unsure',
  onPermissions,
  scale,
  className,
}: {
  helper: string;
  summary: string;
  value: AskLevel;
  onChange: (value: AskLevel) => void;
  teamDefault?: string;
  onPermissions?: () => void;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Before ${helper} runs`}
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'flex w-[320px] flex-col items-start gap-2 overflow-clip rounded-card border border-line bg-white px-3 pt-3.5 pb-3 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.06),0px_8px_24px_0px_rgba(0,0,0,0.12)]',
        className
      )}
      style={scale ? { zoom: scale } : undefined}
    >
      <div className="flex w-full flex-col items-start gap-0.5 overflow-clip px-0.5 pb-0.5">
        <p className="text-[13px] leading-[15.3px] font-semibold whitespace-nowrap text-ink">
          Before {helper} runs
        </p>
        <p className="w-full text-[12px] leading-[14.12px] text-muted-2">
          {summary}
        </p>
      </div>
      {/* RadioCard is 350px with max-w-full: the 294px column sets its width. */}
      <div role="radiogroup" className="flex w-[294px] max-w-full flex-col gap-2">
        {ASK_OPTIONS.map((o) => (
          <RadioCard
            key={o.value}
            title={o.title}
            description={o.description}
            selected={o.value === value}
            onSelect={() => onChange(o.value)}
          />
        ))}
      </div>
      <div className="flex w-full items-center gap-2 overflow-clip pt-1 pl-0.5">
        <p className="min-w-px flex-1 text-[11px] leading-[normal] text-muted-2">
          Team default: {teamDefault}
        </p>
        <Button variant="ghost" size="sm" onClick={onPermissions}>
          Permissions
        </Button>
      </div>
    </div>
  );
}
