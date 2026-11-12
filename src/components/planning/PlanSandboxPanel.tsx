import { ImportButton } from '@/components/panels/ImportButton';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';
import {
  type SandboxItem,
  SandboxPanel,
  type SandboxSection,
} from '@/components/run/SandboxPanel';
import type { MenuItemData } from '@/components/ui/Menu';

// The planning side panel's Sandbox tab (2.6 / 2.7 "SandboxPanel", 2362:24362): SidePanel's tabs header (underline
// Panel tabs, the Primary Small "Import", × under 1280px), then the 12/18 muted note at the top of the body (Figma has
// the note in an 88px header; moved with the underline tabs, design/non-figma-ui.md). Below, the Sandbox sections
// (Assets, Skills, Tools, Launch facts, Permissions, Estimate): rows drag onto helpers on the map. A section's "+"
// calls `onAdd` (sections marked `addable: false` have none). Under 1280px it is an overlay with ×, under 768px a
// half-height sheet (SidePanel).
export function PlanSandboxPanel({
  sections,
  sectionsKey,
  onTabChange,
  onImport,
  onAdd,
  onClose,
  onRowDragStart,
  onRowDragEnd,
  rowMenu,
  note = 'Drag anything onto a helper to give it to them.',
}: {
  sections: SandboxSection[];
  /** Change it to reset which sections are open (e.g. after an import opens Assets). */
  sectionsKey?: string | number;
  onTabChange: (tab: PanelTab) => void;
  onImport?: () => void;
  /** A section's "+" (Assets imports, Skills adds a skill, Tools connects one…). */
  onAdd?: (section: SandboxSection) => void;
  onClose?: () => void;
  onRowDragStart?: (item: SandboxItem, section: SandboxSection) => void;
  onRowDragEnd?: () => void;
  /** Touch path: a tapped row's "Add to…" menu items (see SandboxPanel). */
  rowMenu?: (
    item: SandboxItem,
    section: SandboxSection
  ) => MenuItemData[] | undefined;
  note?: string;
}) {
  return (
    <SidePanel
      // Phones: a half-height sheet, so the map (and the card a row's "Add to…" gives to) stays in view.
      sheet="half"
      onClose={onClose}
      tabs={<PanelTabs phase="plan" value="sandbox" onChange={onTabChange} />}
      headerExtra={<ImportButton onClick={onImport} />}
    >
      <SandboxPanel
        key={sectionsKey}
        sections={sections}
        note={note}
        onAdd={onAdd}
        onRowDragStart={onRowDragStart}
        onRowDragEnd={onRowDragEnd}
        rowMenu={rowMenu}
      />
    </SidePanel>
  );
}
