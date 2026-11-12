import clsx from 'clsx';
import type { ReactNode } from 'react';

import spark from '@/assets/icons/rally-spark.svg';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// Building blocks of the "Resources & outputs" side panel body (frame 2.2, 2362:23595): 20px padding,
// 28px between sections, 10px between a section header and its cards.

// "Section header": SemiBold 13/19 title + Medium 12/17 muted count, 6px apart.
export function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="flex w-full items-center gap-1.5 overflow-clip whitespace-nowrap">
      <p className="text-[13px] leading-[19px] font-semibold text-ink">
        {title}
      </p>
      {count !== undefined && (
        <p className="text-[12px] leading-[17px] font-medium text-muted">
          {count}
        </p>
      )}
    </div>
  );
}

export function PanelSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip">
      <SectionHeader title={title} count={count} />
      {children}
    </section>
  );
}

// "Output / …" card: 1px line border (in layout), 10px radius, 14px padding, 12px gaps.
// Top: 28px soft-blue tile with the spark, name + status badge, meta line. Then a well preview of
// label/value lines (unset values in #a1a3a9 Regular), then an Open button.
export type OutputLine = { label: string; value?: string };

export function OutputCard({
  name,
  status = 'Draft',
  meta,
  lines,
  onOpen,
}: {
  name: string;
  status?: string;
  meta: string;
  lines: OutputLine[];
  onOpen?: () => void;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[10px] border border-line p-3.5">
      <div className="flex w-full items-center gap-2.5 overflow-clip">
        <div className="flex size-7 shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-accent-soft">
          <Icon src={spark} size={14.297} />
        </div>
        <div className="flex min-w-px flex-1 flex-col items-start overflow-clip">
          <div className="flex items-center gap-1.5 overflow-clip">
            <p className="text-[13px] leading-[19px] font-medium whitespace-nowrap text-ink">
              {name}
            </p>
            <Badge tone="subtle">{status}</Badge>
          </div>
          <p className="text-[12px] leading-[17px] whitespace-nowrap text-muted">
            {meta}
          </p>
        </div>
      </div>
      <dl className="flex w-full flex-col items-start gap-1 overflow-clip rounded-control bg-well px-3 py-2.5 text-[12px] leading-[17px]">
        {lines.map((l) => (
          <div
            key={l.label}
            className="flex w-full items-start gap-2 overflow-clip"
          >
            <dt className="w-[60px] shrink-0 text-muted">{l.label}</dt>
            <dd
              className={clsx(
                'min-w-px flex-1',
                l.value ? 'font-medium text-ink' : 'text-[#a1a3a9]'
              )}
            >
              {l.value ?? 'Not set yet'}
            </dd>
          </div>
        ))}
      </dl>
      <Button variant="secondary" size="sm" onClick={onOpen}>
        Open
      </Button>
    </div>
  );
}

// "Resource / …" card: 1px line border, 10px radius, 14/12 padding, 10px gap; a 28px leading mark
// (user avatar or file icon), Medium 13/19 title and 12/17 muted description.
export function ResourceCard({
  leading,
  title,
  description,
  onClick,
}: {
  leading: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full shrink-0 items-start gap-2.5 overflow-clip rounded-[10px] border border-line px-3.5 py-3 text-left hover:bg-well"
    >
      {leading}
      <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <span className="text-[13px] leading-[19px] font-medium whitespace-nowrap text-ink">
          {title}
        </span>
        <span className="w-full text-[12px] leading-[17px] text-muted">
          {description}
        </span>
      </span>
    </button>
  );
}

// "File icon": 28px tinted tile with the file type in Bold 8 (PDF = problem red on #fff1f1).
export function FileIcon({ type = 'PDF' }: { type?: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center overflow-clip rounded-[6px] bg-[#fff1f1] text-[8px] leading-[normal] font-bold whitespace-nowrap text-problem">
      {type}
    </span>
  );
}
