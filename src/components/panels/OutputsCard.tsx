import { useState } from 'react';

import closeGray from '@/assets/icons/close-gray.svg';
import email from '@/assets/icons/email.svg';
import nodeKindOutput14 from '@/assets/icons/node-kind-output-glyph-14.svg';
import page from '@/assets/icons/page.svg';
import plusDarkThin from '@/assets/icons/plus-dark-thin.svg';
import post from '@/assets/icons/post.svg';
import { CanvasListCard, CanvasListRow } from '@/components/map/CanvasListCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// Output type icons (Figma Icon / Page, Post, Email): 16px muted strokes.
export type OutputType = 'page' | 'post' | 'email';
const TYPE_ICON: Record<OutputType, string> = { page, post, email };

export type OutputItem = {
  id: string;
  label: string;
  type: OutputType;
  isNew?: boolean;
};

// Figma "Output row" (2362:30364): one deliverable in "What goes out" (a CanvasListRow): type icon, label, optional
// xs solid "New" badge. Hover = well fill and the remove ×.
export function OutputRow({
  item,
  onRemove,
  className,
}: {
  item: OutputItem;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <CanvasListRow
      className={className}
      icon={<Icon src={TYPE_ICON[item.type]} size={16} />}
      label={item.label}
      trailing={
        <>
          {item.isNew && (
            <Badge tone="solid" size="xs">
              New
            </Badge>
          )}
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={onRemove}
              className="hidden shrink-0 group-focus-within:flex group-hover:flex"
            >
              <Icon src={closeGray} size={14} />
            </button>
          )}
        </>
      }
    />
  );
}

const DEFAULT_OUTPUTS: OutputItem[] = [
  { id: 'ph', label: 'Product Hunt page', type: 'page' },
  { id: 'x', label: 'X post', type: 'post' },
  { id: 'li', label: 'LinkedIn post', type: 'post' },
  { id: 'discord', label: 'Discord post', type: 'post', isNew: true },
  { id: 'email', label: 'Waitlist email', type: 'email' },
];

// Figma "Outputs card" (2362:30351): the "What goes out" card on the planning map, a CanvasListCard (the run's
// Tasks list is the same card): the output kind tile and title, the rows and a Ghost Small "Add an output". Rows
// can be removed; Add appends a new one. `onOpenChange` makes it fold into its header (the plan canvas under 1280px).
export function OutputsCard({
  initial = DEFAULT_OUTPUTS,
  showAdd = true,
  open,
  onOpenChange,
  className,
  onChange,
}: {
  initial?: OutputItem[];
  showAdd?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Called with the new list after a remove or an add (the plan screens write it to the store). */
  onChange?: (items: OutputItem[]) => void;
}) {
  const [items, setItemsState] = useState(initial);
  const setItems = (fn: (all: OutputItem[]) => OutputItem[]) => {
    const next = fn(items);
    setItemsState(next);
    onChange?.(next);
  };
  return (
    <CanvasListCard
      icon={<Icon src={nodeKindOutput14} size={14.264} />}
      title="What goes out"
      open={open}
      onOpenChange={onOpenChange}
      className={className}
      footer={
        showAdd && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            leading={<Icon src={plusDarkThin} size={16} />}
            onClick={() =>
              setItems((all) => [
                ...all,
                {
                  id: `new-${all.length}`,
                  label: 'New output',
                  type: 'post',
                  isNew: true,
                },
              ])
            }
          >
            Add an output
          </Button>
        )
      }
    >
      {items.map((item) => (
        <OutputRow
          key={item.id}
          item={item}
          onRemove={() => setItems((all) => all.filter((x) => x.id !== item.id))}
        />
      ))}
    </CanvasListCard>
  );
}
