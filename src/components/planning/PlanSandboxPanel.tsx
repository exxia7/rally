import close from '@/assets/icons/close.svg';
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
import { IconButton } from '@/components/ui/IconButton';

// The planning side panel's Sandbox tab (2.6 / 2.7 "SandboxPanel", 2362:24362): an 88px header with a 1px line
// (20px top, 24px sides, 4px gap; Figma's 16px bottom padding is overridden by the fixed 88px, leaving 12): Panel
// tabs (Chat · Sandbox) and a Primary Small "Import", then a 12/18 muted note. Below, the Sandbox sections (Assets, Skills, Tools, Launch facts, Permissions, Estimate):
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
    section: SandboxSection,
  ) => MenuItemData[] | undefined;
  note?: string;
}) {
  return (
    <SidePanel
      onClose={onClose}
      header={
        <div className="flex h-[88px] w-full shrink-0 flex-col items-start gap-1 border-b border-line px-6 pt-5 pb-3 max-md:px-4">
          <div className="flex w-full items-center justify-between gap-2">
            <PanelTabs phase="plan" value="sandbox" onChange={onTabChange} />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leading={<Icon src={plusWhite} size={16} />}
                onClick={onImport}
                className="w-[82px]"
              >
                Import
              </Button>
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
          <p className="w-full shrink-0 truncate pr-2 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
            {note}
          </p>
        </div>
      }
    >
      <SandboxPanel
        key={sectionsKey}
        sections={sections}
        note={null}
        onRowDragStart={onRowDragStart}
        onRowDragEnd={onRowDragEnd}
        rowMenu={rowMenu}
      />
    </SidePanel>
  );
}
