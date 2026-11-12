import type { Ref } from 'react';

import closeGray from '@/assets/icons/close-gray.svg';
import link from '@/assets/icons/link.svg';
import spark from '@/assets/icons/pathfinder-spark.svg';
import upload from '@/assets/icons/upload.svg';
import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';

// Figma "Attach menu" (2362:26459 in 2.2-attach, 2362:27498 in 2.1-attach): opens above the composer's attach
// button. 263px. Upload files / Paste a link / Add a skill, each with a one-line hint.
export function AttachMenu({
  onClose,
  onPick,
  className,
  ref,
}: {
  onClose: () => void;
  onPick?: (kind: 'upload' | 'link' | 'skill') => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <Menu
      ref={ref}
      label="Attach"
      onClose={onClose}
      className={className ?? 'w-[263px]'}
      items={[
        {
          key: 'upload',
          label: 'Upload files',
          description: 'Brand guide, logo, screenshots',
          icon: upload,
          onSelect: () => onPick?.('upload'),
        },
        {
          key: 'link',
          label: 'Paste a link',
          description: 'Inspiration, past posts',
          icon: link,
          onSelect: () => onPick?.('link'),
        },
        {
          key: 'skill',
          label: 'Add a skill',
          description: 'Reusable how-tos, like brand voice',
          icon: spark,
          onSelect: () => onPick?.('skill'),
        },
      ]}
    />
  );
}

/** What a link or skill pick adds as an attachment (Upload files opens the file picker instead). */
export const ATTACH_LABEL = { link: 'Link', skill: 'Skill · Brand voice' } as const;

// The attachments a composer holds (2.1, 2.2): 24px chip-grey chips, 6px radius, Medium 12 ink-2, with a × each.
export function AttachmentChips({
  items,
  onRemove,
  className = 'pt-2',
}: {
  items: string[];
  onRemove: (index: number) => void;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`flex w-full flex-wrap gap-1.5 ${className}`}>
      {items.map((a, i) => (
        <span
          key={`${a}-${i}`}
          className="flex h-6 items-center gap-1 rounded-[6px] bg-chip pr-1 pl-2 text-[12px] leading-4 font-medium text-ink-2"
        >
          {a}
          <button
            type="button"
            aria-label={`Remove ${a}`}
            onClick={() => onRemove(i)}
            className="flex rounded-[4px] hover:bg-hover"
          >
            <Icon src={closeGray} size={14} />
          </button>
        </span>
      ))}
    </div>
  );
}
