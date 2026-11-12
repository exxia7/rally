import clsx from 'clsx';
import { useState } from 'react';

import closeGray from '@/assets/icons/close-gray.svg';
import email from '@/assets/icons/email.svg';
import nodeKindOutput14 from '@/assets/icons/node-kind-output-glyph-14.svg';
import page from '@/assets/icons/page.svg';
import plusDarkThin from '@/assets/icons/plus-dark-thin.svg';
import post from '@/assets/icons/post.svg';
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

// Figma "Output row" (2362:30364): one deliverable in "What goes out". 32px, 12px sides, 8px gap, 6px radius;
// type icon, label (13/20), optional xs solid "New" badge. Hover = well fill and the remove ×.
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
    <div
      className={clsx(
        'group flex h-8 w-full shrink-0 items-center gap-2 rounded-[6px] px-3 hover:bg-well',
        className
      )}
    >
      <Icon src={TYPE_ICON[item.type]} size={16} />
      <p className="min-w-px flex-1 truncate text-[13px] leading-5 tracking-[-0.0878px] text-ink">
        {item.label}
      </p>
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
          className="hidden shrink-0 group-hover:flex"
        >
          <Icon src={closeGray} size={14} />
        </button>
      )}
    </div>
  );
}

const DEFAULT_OUTPUTS: OutputItem[] = [
  { id: 'ph', label: 'Product Hunt page', type: 'page' },
  { id: 'x', label: 'X post', type: 'post' },
  { id: 'li', label: 'LinkedIn post', type: 'post' },
  { id: 'discord', label: 'Discord post', type: 'post', isNew: true },
  { id: 'email', label: 'Waitlist email', type: 'email' },
];

// Figma "Outputs card" (2362:30351): the "What goes out" card on the planning map. 256px, white, 1px line border,
// 12px radius, layered drop shadow. Header (node-kind tile + Medium 14/20 title, 1px bottom line, 16/12 padding),
// then the rows (4px inset) and a Ghost Small "Add an output". Rows can be removed; Add appends a new one.
export function OutputsCard({
  initial = DEFAULT_OUTPUTS,
  showAdd = true,
  className,
  onChange,
}: {
  initial?: OutputItem[];
  showAdd?: boolean;
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
    <div
      className={clsx(
        'flex w-64 flex-col items-start rounded-card border border-line bg-white [filter:drop-shadow(0px_1px_1.5px_rgba(0,0,0,0.06))_drop-shadow(0px_8px_12px_rgba(0,0,0,0.12))]',
        className
      )}
    >
      <div className="flex w-full items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex size-4 shrink-0 items-center justify-center overflow-clip rounded-[6px]">
          <Icon src={nodeKindOutput14} size={14.264} />
        </span>
        <p className="min-w-px flex-1 text-[14px] leading-5 font-medium tracking-[-0.0878px] text-ink">
          What goes out
        </p>
      </div>
      <div className="flex w-full flex-col items-start overflow-clip px-1 pt-1 pb-2">
        {items.map((item) => (
          <OutputRow
            key={item.id}
            item={item}
            onRemove={() =>
              setItems((all) => all.filter((x) => x.id !== item.id))
            }
          />
        ))}
        {showAdd && (
          <div className="flex w-full items-start pt-1">
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
          </div>
        )}
      </div>
    </div>
  );
}
