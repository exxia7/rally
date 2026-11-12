import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import plusGray14 from '@/assets/icons/plus-gray-14.svg';
import { SectionToggle } from '@/components/nav/SectionToggle';
import { ResourceRow } from '@/components/panels/Cards';
import { Icon } from '@/components/ui/Icon';
import { Menu, type MenuItemData } from '@/components/ui/Menu';
import { useOutsideClick } from '@/lib/useOutsideClick';

export type SandboxItem = { name: string; source: string };

export type SandboxSection = {
  id: string;
  title: string;
  items: SandboxItem[];
  /** Open on load (3.3 opens Assets). */
  open?: boolean;
  /** Rows shown before "Show N more". Default: all. */
  visible?: number;
  /** Count on the toggle when it isn't the row count (Permissions 4 in 2.7). */
  count?: number;
  /** A custom body instead of resource rows (2.7's Permissions settings). */
  content?: ReactNode;
};

// The Sandbox tab of the run side panel (3.3, 2362:24921): a 12/18 muted note (4px top, 24px sides), then
// collapsible sections, each 12px top/bottom with a 1px line under it. A section header is a Section toggle with
// its count and a 14px plus on the right; open sections list Resource rows (6px above) and a Medium 12/18 muted
// "Show N more" (20px in). Rows drag onto helpers on the map: `onRowDragStart` / `onRowDragEnd` tell the screen
// which resource is in flight. The plan Sandbox (2.6, 2.7) puts its note in the panel header: `note={null}`.
// Touch screens can't drag, so `rowMenu` gives a row a tap path: return menu items (e.g. "Add to Community") and a
// tap opens them under the row; return undefined to keep the row drag-only. Row checkboxes tick (local selection).
// A section's "+" opens it and calls `onAdd` (the run Sandbox imports into that section).
export function SandboxPanel({
  sections,
  note = 'Running now · new items only reach steps that haven’t started.',
  onRowDragStart,
  onRowDragEnd,
  rowMenu,
  onAdd,
}: {
  sections: SandboxSection[];
  note?: string | null;
  onAdd?: (section: SandboxSection) => void;
  onRowDragStart?: (item: SandboxItem, section: SandboxSection) => void;
  onRowDragEnd?: () => void;
  rowMenu?: (
    item: SandboxItem,
    section: SandboxSection,
  ) => MenuItemData[] | undefined;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuRefs = useMemo(() => [menuRef], []);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  useOutsideClick(menuRefs, menuFor !== null, closeMenu);
  const [open, setOpen] = useState(
    () => new Set(sections.filter((s) => s.open).map((s) => s.id)),
  );
  const [expanded, setExpanded] = useState(() => new Set<string>());
  const [ticked, setTicked] = useState(() => new Set<string>());
  const tick = (key: string, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const toggle = (id: string, to?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (to ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="flex w-full flex-1 flex-col items-start">
      {note !== null && (
        <p className="w-full px-6 pt-3 text-[12px] leading-[18px] tracking-[-0.08px] text-muted max-md:px-4">
          {note}
        </p>
      )}
      <div className="flex w-full flex-col items-start px-6 max-md:px-4">
        {sections.map((s) => {
          const isOpen = open.has(s.id);
          const limit = expanded.has(s.id)
            ? s.items.length
            : (s.visible ?? s.items.length);
          const hidden = s.items.length - limit;
          return (
            <section
              key={s.id}
              className="flex w-full flex-col items-start border-b border-line py-3"
            >
              <div className="flex h-5 w-full items-center gap-2">
                <SectionToggle
                  label={s.title}
                  count={s.count ?? s.items.length}
                  open={isOpen}
                  onToggle={() => toggle(s.id)}
                  className="min-w-px flex-1"
                />
                <button
                  type="button"
                  aria-label={`Add to ${s.title}`}
                  onClick={() => {
                    toggle(s.id, true);
                    onAdd?.(s);
                  }}
                  className="flex shrink-0 rounded-[4px] hover:bg-hover"
                >
                  <Icon src={plusGray14} size={14} />
                </button>
              </div>
              {isOpen && s.content}
              {isOpen && !s.content && (
                <div className="flex w-full flex-col items-start pt-1.5">
                  {s.items.slice(0, limit).map((item) => {
                    const row = (
                      <ResourceRow
                        key={item.name}
                        name={item.name}
                        source={item.source}
                        onDragStart={
                          onRowDragStart
                            ? () => onRowDragStart(item, s)
                            : undefined
                        }
                        onDragEnd={onRowDragEnd}
                        checked={ticked.has(`${s.id}/${item.name}`)}
                        onCheckedChange={(on) =>
                          tick(`${s.id}/${item.name}`, on)
                        }
                        onClick={
                          rowMenu
                            ? () => {
                                const key = `${s.id}/${item.name}`;
                                if (rowMenu(item, s))
                                  setMenuFor((k) => (k === key ? null : key));
                              }
                            : undefined
                        }
                        expanded={menuFor === `${s.id}/${item.name}`}
                      />
                    );
                    if (!rowMenu) return row;
                    const key = `${s.id}/${item.name}`;
                    const items =
                      menuFor === key ? rowMenu(item, s) : undefined;
                    return (
                      <div
                        key={item.name}
                        ref={items ? menuRef : undefined}
                        className="relative w-full"
                      >
                        {row}
                        {items && (
                          <Menu
                            label={`Add ${item.name} to…`}
                            items={items}
                            onClose={closeMenu}
                            className="absolute top-full right-0 w-[240px]"
                          />
                        )}
                      </div>
                    );
                  })}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => new Set(prev).add(s.id))
                      }
                      className="flex w-full items-start overflow-clip pt-1.5 pb-0.5 pl-5 text-[12px] leading-[18px] font-medium whitespace-nowrap text-muted hover:text-ink"
                    >
                      Show {hidden} more
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
