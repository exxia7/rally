import { useState } from 'react';

import arrowRightWhite from '@/assets/icons/arrow-right-white.svg';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import { TextArea } from '@/components/ui/TextArea';

import { FORK_CARD_OPTIONS } from './forkCardOptions';

/** What a Fork card says; the inspector data carries it for steps that can fork (4.4, 6.4). */
export type ForkCardContent = {
  title?: string;
  original?: string;
  prompt?: string;
  options?: { label: string; text: string }[];
  note?: string;
  helpers?: string[];
};

// Figma "Fork card" (2362:30304): new-fork form in the node inspector (from an Output or a Decision).
// 1px line border, 10px radius, 16px padding. Title, "Original: …", the prompt with choice chips that fill the
// instruction text area, a note, helper badges, then Create fork (Primary Small + arrow) and Cancel.
export function ForkCard({
  title = 'New fork from Launch copy',
  original = '“Your money finally has a coach…”',
  prompt = 'What should the fork try?',
  options = FORK_CARD_OPTIONS,
  note = 'Earlier steps are reused. 3 helpers work on a new branch · about 1 min. The original path stays as it is.',
  helpers = ['Writer', 'Community', 'Publisher'],
  onCreate,
  onCancel,
}: {
  title?: string;
  original?: string;
  prompt?: string;
  options?: { label: string; text: string }[];
  note?: string;
  helpers?: string[];
  onCreate?: (instruction: string) => void;
  onCancel?: () => void;
}) {
  const [picked, setPicked] = useState(0);
  const [text, setText] = useState(options[0]?.text ?? '');
  return (
    <div className="flex w-[350px] max-w-full flex-col items-start rounded-[10px] border border-line p-4">
      <p className="text-[14px] leading-5 font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
        {title}
      </p>
      <div className="flex h-[26px] w-full items-start gap-1 pt-1 text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap">
        <span className="shrink-0 text-muted">Original:</span>
        <span className="min-w-px flex-1 truncate text-ink">{original}</span>
      </div>
      <p className="h-[30px] pt-4 text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted">
        {prompt}
      </p>
      <div className="flex w-full flex-wrap content-start items-start gap-1.5 pt-2">
        {options.map((o, i) => (
          <ChoiceChip
            key={o.label}
            selected={i === picked}
            onClick={() => {
              setPicked(i);
              setText(o.text);
            }}
          >
            {o.label}
          </ChoiceChip>
        ))}
      </div>
      <div className="w-full pt-2">
        <TextArea
          aria-label="What the fork should try"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <p className="w-full pt-4 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
        {note}
      </p>
      <div className="flex w-full flex-wrap content-start items-start gap-1.5 pt-2">
        {helpers.map((h) => (
          <Badge key={h} tone="subtle">
            {h}
          </Badge>
        ))}
      </div>
      <div className="flex h-12 w-full items-start gap-2 pt-4">
        <Button
          variant="primary"
          size="sm"
          trailing={<Icon src={arrowRightWhite} size={16} />}
          onClick={() => onCreate?.(text)}
        >
          Create fork
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
