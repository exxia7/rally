import clsx from 'clsx';

import boxIcon from '@/assets/icons/box.svg';
import diamondIcon from '@/assets/icons/diamond-outline.svg';
import chatIcon from '@/assets/icons/message-circle.svg';

// Tabs at the top of the right side panel. Plan: Chat + Sandbox. Run adds Decisions with a count chip.
// Not Figma's "Panel tabs" (2362:28900, a segmented pill like the Planning / Flowchart switch): changed to underline
// page tabs so the two don't read as the same control (design/non-figma-ui.md). 48px tall text tabs, 20px apart;
// the selected one is Medium ink with a 2px ink bar sitting on the header's bottom line. Each tab has a 14px
// Lucide icon (masked, so it takes the tab's text colour): chat bubble, box, outline diamond (a decision node).
export type PanelTab = 'chat' | 'sandbox' | 'decisions';

export function PanelTabs({
  phase,
  value,
  onChange,
  decisions = 2,
}: {
  phase: 'plan' | 'run';
  value: PanelTab;
  onChange: (tab: PanelTab) => void;
  decisions?: number;
}) {
  const tabs: {
    value: PanelTab;
    label: string;
    icon: string;
    count?: number;
  }[] = [
    { value: 'chat', label: 'Chat', icon: chatIcon },
    { value: 'sandbox', label: 'Sandbox', icon: boxIcon },
  ];
  if (phase === 'run')
    tabs.push({
      value: 'decisions',
      label: 'Decisions',
      icon: diamondIcon,
      count: decisions,
    });
  return (
    <div
      role="tablist"
      aria-label="Side panel"
      className="flex h-12 items-stretch gap-5"
    >
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.value)}
            className={clsx(
              'relative flex shrink-0 items-center gap-1.5 text-[13px] leading-5 tracking-[-0.08px] whitespace-nowrap',
              selected
                ? 'font-medium text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink'
                : 'text-muted hover:text-ink-2'
            )}
          >
            <span
              aria-hidden
              className="size-3.5 shrink-0 bg-current"
              style={{
                mask: `url("${t.icon}") center / contain no-repeat`,
                WebkitMask: `url("${t.icon}") center / contain no-repeat`,
              }}
            />
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-chip px-1.5 text-[11px] leading-4 font-medium text-ink-2">
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
