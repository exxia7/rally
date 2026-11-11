import { SegmentedControl, type Segment } from '@/components/ui/SegmentedControl';

// Figma "Panel tabs" (2362:28900): tabs at the top of the right side panel. Plan: Chat + Sandbox.
// Run adds Decisions with a count. Same segments as the Segmented control, hugging (34px).
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
  // Figma tab widths (Panel tabs 2362:24918): Chat 58, Sandbox 83, Decisions · 2 106 → 147 / 253px.
  const options: Segment<PanelTab>[] = [
    { value: 'chat', label: 'Chat', minWidth: 58 },
    { value: 'sandbox', label: 'Sandbox', minWidth: 83 },
  ];
  if (phase === 'run')
    options.push({
      value: 'decisions',
      label: `Decisions · ${decisions}`,
      minWidth: 106,
    });
  return (
    <SegmentedControl
      label="Side panel"
      fit="hug"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
