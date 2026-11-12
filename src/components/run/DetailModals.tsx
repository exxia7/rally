import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { approvalItems } from '@/state/runView';
import { useWorkflow } from '@/state/store';

import type { HandRaiseData } from './HandRaisePanel';

// Not in Figma: the views behind "See all N pieces" (3.5), "See previous version" (6.3) and "See the full handoff"
// (4.1, 4.3). Built on Modal (the 4.1b dialog look): SemiBold 18/26 title, 13/19 ink-2 intro, then a list of
// 1px-line, 10px-radius cards (the approval card's text styles) and a Close button.

function DetailModal({
  open,
  onClose,
  title,
  intro,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} label={title} width={520}>
      <div className="flex w-full flex-col items-start gap-1.5">
        <p className="w-full text-[18px] leading-[26px] font-semibold text-ink">
          {title}
        </p>
        <p className="w-full text-[13px] leading-[19px] text-ink-2">{intro}</p>
      </div>
      <div className="flex w-full flex-col items-start gap-2">{children}</div>
      <div className="flex w-full justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

function DetailCard({
  title,
  meta,
  badge,
  body,
  muted,
}: {
  title: string;
  meta?: string;
  badge?: ReactNode;
  body: string;
  muted?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-1.5 rounded-[10px] border border-line p-3.5">
      <div className="flex w-full items-center gap-2">
        <p className="min-w-px flex-1 truncate text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] text-ink">
          {title}
        </p>
        {badge}
        {meta && (
          <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
            {meta}
          </p>
        )}
      </div>
      <p
        className={`w-full text-[13px] leading-[17.188px] tracking-[-0.08px] ${muted ? 'text-muted' : 'text-ink-2'}`}
      >
        {body}
      </p>
    </div>
  );
}

/**
 * Writer's pieces: "See all N pieces" lists the first `written` as written and the rest as not started;
 * `previousNote` turns it into "See previous version" (the last finished copy, while Writer rewrites with a note).
 */
export function PiecesModal({
  open,
  onClose,
  written,
  previousNote,
}: {
  open: boolean;
  onClose: () => void;
  written?: number;
  previousNote?: string;
}) {
  const wf = useWorkflow();
  const pieces = approvalItems(wf);
  const n = previousNote
    ? pieces.length
    : Math.min(written ?? pieces.length, pieces.length);
  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={previousNote ? 'Previous version' : 'Launch copy'}
      intro={
        previousNote
          ? `Writer’s last finished copy. It’s rewriting these now with your note: ${previousNote}`
          : `Writer has written ${n} of ${pieces.length} pieces. Nothing goes out until you approve it.`
      }
    >
      {pieces.map((p, i) =>
        i < n ? (
          <DetailCard
            key={p.id}
            title={p.title}
            meta={p.when}
            badge={previousNote && <Badge tone="subtle">Before</Badge>}
            body={p.body}
          />
        ) : (
          <DetailCard
            key={p.id}
            title={p.title}
            meta={p.when}
            body="Writer hasn’t started this one yet."
            muted
          />
        )
      )}
    </DetailModal>
  );
}

// What each hand-raise's handoff carried besides the problems on its Fix steps (the problems are added from the
// panel's own steps, so the list always shows them). STATE: these should come from the store's handoff cards once
// handoffs are modelled; keyed here by the helper that raised its hand.
const HANDOFF_PASSED: Record<
  string,
  { from: string; items: [string, string][] }
> = {
  Strategist: {
    from: 'Scout',
    items: [
      ['Competitor scan', '6 budgeting apps compared on features and coaching'],
      ['Feature comparison', 'Budgets, alerts and coaching across the 6 apps'],
    ],
  },
  Writer: {
    from: 'Strategist',
    items: [
      ['Audience', 'People who already budget'],
      ['Message', 'Lead with coaching, not tracking'],
      ['Launch date', 'Mar 12, 9am'],
    ],
  },
};

/** "See the full handoff": everything the handoff carried, with what passed and what's wrong. */
export function HandoffModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: HandRaiseData;
}) {
  const to = data.eyebrow.split(' ')[0];
  const passed = HANDOFF_PASSED[to] ?? { from: 'The step before', items: [] };
  const total = passed.items.length + data.steps.length;
  return (
    <DetailModal
      open={open}
      onClose={onClose}
      title={`${passed.from}’s handoff to ${to}`}
      intro={`${total} items. ${to} checks each handoff before it starts; the red ones are what stopped it.`}
    >
      {data.steps.map((s) => (
        <DetailCard
          key={s.label}
          title={s.label}
          badge={<Badge tone="red">{s.problem.kind}</Badge>}
          body={s.problem.title}
        />
      ))}
      {passed.items.map(([title, body]) => (
        <DetailCard
          key={title}
          title={title}
          badge={<Badge tone="green">Passed</Badge>}
          body={body}
        />
      ))}
    </DetailModal>
  );
}
