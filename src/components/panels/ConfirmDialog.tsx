import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';

// Confirm dialog from 4.1b "Rerun confirm" (2362:27130), built on Modal. SemiBold 18/26 title, 13/19 ink-2 body
// (6px apart), optional well box listing what else is affected, a 12/17 muted cost line, an optional
// "Don't show this again" block (1px top line, 12px top), then right-aligned Cancel + primary confirm.
export type AffectedItem = {
  key: string;
  art: ReactNode;
  name: string;
  detail: string;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  affectedLabel = 'Will also rerun',
  affected,
  cost,
  dontShowNote,
  confirmLabel,
  cancelLabel = 'Cancel',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgain: boolean) => void;
  title: string;
  body: ReactNode;
  affectedLabel?: string;
  affected?: AffectedItem[];
  cost?: string;
  dontShowNote?: string;
  confirmLabel: string;
  cancelLabel?: string;
}) {
  const [dontShow, setDontShow] = useState(false);
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="flex w-full flex-col items-start gap-1.5 overflow-clip">
        <p className="w-full text-[18px] leading-[26px] font-semibold text-ink">
          {title}
        </p>
        <p className="w-full text-[13px] leading-[19px] text-ink-2">{body}</p>
      </div>
      {affected && affected.length > 0 && (
        <div className="flex w-full flex-col items-start gap-2.5 overflow-clip rounded-[10px] bg-well px-3.5 py-3">
          <p className="text-[12px] leading-[17px] font-medium whitespace-nowrap text-muted">
            {affectedLabel}
          </p>
          {affected.map((a) => (
            <div
              key={a.key}
              className="flex w-full items-center gap-2.5 overflow-clip"
            >
              <div className="relative size-6 shrink-0">{a.art}</div>
              <p className="flex items-center gap-1.5 overflow-clip text-[13px] leading-[19px] whitespace-nowrap">
                <span className="font-medium text-ink">{a.name}</span>
                <span className="text-muted">· {a.detail}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {cost && (
        <p className="w-full text-[12px] leading-[17px] text-muted">{cost}</p>
      )}
      {dontShowNote && (
        <div className="flex w-full flex-col items-start gap-2 overflow-clip border-t border-line pt-3">
          <p className="w-full text-[12px] leading-[17px] text-muted">
            {dontShowNote}
          </p>
          <button
            type="button"
            role="checkbox"
            aria-checked={dontShow}
            onClick={() => setDontShow((v) => !v)}
            className="flex items-center gap-2"
          >
            <Checkbox checked={dontShow} />
            <span className="text-[13px] leading-[19px] font-medium whitespace-nowrap text-ink">
              Don&apos;t show this again
            </span>
          </button>
        </div>
      )}
      <div className="flex w-full items-start justify-end gap-2 overflow-clip pt-1">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant="primary" onClick={() => onConfirm(dontShow)}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
