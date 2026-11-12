import plusWhite from '@/assets/icons/plus-white.svg';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';
import {
  type SandboxItem,
  SandboxPanel,
  type SandboxSection,
} from '@/components/run/SandboxPanel';
import { Button } from '@/components/ui/Button';
import type { MenuItemData } from '@/components/ui/Menu';
import { Icon } from '@/components/ui/Icon';

// The planning side panel's Sandbox tab (2.6 / 2.7 "SandboxPanel", 2362:24362): SidePanel's tabs header (underline
// Panel tabs, a Primary Small "Import", × under 1280px), then the 12/18 muted note at the top of the body (Figma has
// the note in an 88px header; moved with the underline tabs, design/non-figma-ui.md). Below, the Sandbox sections (Assets, Skills, Tools, Launch facts, Permissions, Estimate):
// rows drag onto helpers on the map. Under 1280px it is an overlay with ×, under 768px a sheet (SidePanel).
export function PlanSandboxPanel({
  sections,
  sectionsKey,
  onTabChange,
  onImport,
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
      headerExtra={
        <Button
          variant="primary"
          size="sm"
          leading={<Icon src={plusWhite} size={16} />}
          onClick={onImport}
          className="w-[82px]"
        >
          Import
        </Button>
      }
    >
      <SandboxPanel
        key={sectionsKey}
        sections={sections}
        note={note}
        onRowDragStart={onRowDragStart}
        onRowDragEnd={onRowDragEnd}
        rowMenu={rowMenu}
      />
    </SidePanel>
  );
}
