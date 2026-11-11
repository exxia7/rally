import { SegmentedControl } from '@/components/ui/SegmentedControl';

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
  const options: { value: PanelTab; label: string }[] = [
    { value: 'chat', label: 'Chat' },
    { value: 'sandbox', label: 'Sandbox' },
  ];
  if (phase === 'run')
    options.push({ value: 'decisions', label: `Decisions · ${decisions}` });
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
