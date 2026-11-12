import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';

// Confirm dialog from 4.1b "Rerun confirm" (2362:27130), built on Modal. SemiBold 18/26 title, 13/19 ink-2 body
// (6px apart), an optional note field (6.2 "Rerun from here", 2362:25977: Medium 12 label, 6px, a 57px Text area),
// optional well box listing what else is affected, a 12/17 muted cost line, an optional
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
  note,
}: {
  open: boolean;
  onClose: () => void;
  /** `note` is the note field's text when the dialog has one. */
  onConfirm: (dontShowAgain: boolean, note: string) => void;
  title: string;
  body: ReactNode;
  affectedLabel?: string;
  affected?: AffectedItem[];
  cost?: string;
  dontShowNote?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Free-text field under the body: what should change on the rerun. */
  note?: { label: string; defaultValue?: string; placeholder?: string };
}) {
  const [dontShow, setDontShow] = useState(false);
  const [noteText, setNoteText] = useState(note?.defaultValue ?? '');
  return (
    <Modal
      open={open}
      onClose={onClose}
      label={title}
      title={title}
      description={body}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(dontShow, noteText)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {note && (
        <label className="flex w-full flex-col items-start gap-1.5">
          <span className="text-[12px] leading-[15px] font-medium whitespace-nowrap text-ink max-md:whitespace-normal">
            {note.label}
          </span>
          <TextArea
            value={noteText}
            placeholder={note.placeholder}
            onChange={(e) => setNoteText(e.target.value)}
          />
        </label>
      )}
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
              <p
                title={`${a.name} · ${a.detail}`}
                className="min-w-0 flex-1 truncate text-[13px] leading-[19px]"
              >
                <span className="font-medium text-ink">{a.name}</span>
                <span className="text-muted"> · {a.detail}</span>
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
    </Modal>
  );
}
