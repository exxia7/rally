import type { Ref } from 'react';

import link from '@/assets/icons/link.svg';
import spark from '@/assets/icons/pathfinder-spark.svg';
import upload from '@/assets/icons/upload.svg';
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
