import close from '@/assets/icons/close.svg';
import { ImportButton } from '@/components/panels/ImportButton';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';
import {
  type SandboxItem,
  SandboxPanel,
  type SandboxSection,
} from '@/components/run/SandboxPanel';
import type { MenuItemData } from '@/components/ui/Menu';
import { IconButton } from '@/components/ui/IconButton';

// The planning side panel's Sandbox tab (2.6 / 2.7 "SandboxPanel", 2362:24362): a header with a 1px line (20px top,
// 12px bottom, 24px sides, 4px gap; 88px with a one-line note): Panel tabs (Chat · Sandbox) and a Primary Small
// "Import", then a 12/18 muted note that wraps on narrow screens. Below, the Sandbox sections (Assets, Skills, Tools, Launch facts, Permissions, Estimate):
// rows drag onto helpers on the map. A section's "+" calls `onAdd` (sections marked `addable: false` have none).
// Under 1280px it is an overlay with ×, under 768px a half-height sheet (SidePanel); the header stays put while the
// sections scroll under it.
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
      header={
        <div className="flex w-full shrink-0 flex-col items-start gap-1 border-b border-line px-6 pt-5 pb-3 max-md:px-4">
          <div className="flex w-full items-center justify-between gap-2">
            <PanelTabs phase="plan" value="sandbox" onChange={onTabChange} />
            <div className="flex items-center gap-2">
              <ImportButton onClick={onImport} />
              {onClose && (
                <IconButton
                  icon={close}
                  iconSize={16}
                  label="Close panel"
                  onClick={onClose}
                  className="xl:hidden"
                />
              )}
            </div>
          </div>
          <p className="w-full shrink-0 pr-2 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
            {note}
          </p>
        </div>
      }
    >
      <SandboxPanel
        key={sectionsKey}
        sections={sections}
        note={null}
        onAdd={onAdd}
        onRowDragStart={onRowDragStart}
        onRowDragEnd={onRowDragEnd}
        rowMenu={rowMenu}
      />
    </SidePanel>
  );
}
