import { useState } from 'react';

import { CheckLevelRadios } from '@/components/planning/PermissionControls';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/TextInput';
import { type CheckLevel, presetRules } from '@/state/permissions';

export type PresetDraft = { name: string; check: CheckLevel; adLimit: number };

// Not in Figma: 1.2's preset editor (audit 1g), so "Edit" and "New preset" stay in workspace settings instead of
// opening a workflow's planning screen. Built on Modal with 2.7's check-level radios: name, when the team checks with
// you, the ad limit, and the rule every preset keeps; the one-line summary is what 1.2's row will say.
export function PresetEditor({
  initial,
  isNew,
  onSave,
  onClose,
}: {
  initial: PresetDraft;
  isNew?: boolean;
  onSave: (preset: PresetDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [limit, setLimit] = useState(String(initial.adLimit));
  const adLimit = Math.max(0, Math.round(Number(limit) || 0));
  const name = draft.name.trim();
  return (
    <Modal
      open
      onClose={onClose}
      label={isNew ? 'New preset' : `Edit ${initial.name}`}
      title={isNew ? 'New preset' : `Edit ${initial.name}`}
      description={
        isNew
          ? 'A saved set of rules any workflow can start from.'
          : 'Workflows using this preset pick up the change. Ones you customized keep their own.'
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name}
            onClick={() => onSave({ ...draft, name, adLimit })}
          >
            {isNew ? 'Add preset' : 'Save'}
          </Button>
        </>
      }
    >
      <label className="flex w-full flex-col items-start gap-1.5">
        <span className="text-[12px] leading-[15px] font-medium text-ink">
          Name
        </span>
        <TextInput
          autoFocus={isNew}
          className="w-full"
          value={draft.name}
          placeholder="e.g. Launch week"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <div className="flex w-full flex-col items-start">
        <span className="text-[12px] leading-[15px] font-medium text-ink">
          When should your team check with you?
        </span>
        <CheckLevelRadios
          className="pt-1"
          value={draft.check}
          onChange={(check) => setDraft({ ...draft, check })}
        />
      </div>
      <label className="flex w-full items-center gap-3">
        <span className="min-w-px flex-1 text-[13px] leading-[19.5px] text-ink-2">
          Ad spend limit
        </span>
        <TextInput
          className="h-8 w-24"
          inputMode="numeric"
          aria-label="Ad spend limit in dollars"
          inputClassName="text-right"
          value={`$${limit}`}
          onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </label>
      <p className="w-full rounded-[10px] bg-well px-3.5 py-3 text-[12px] leading-[17px] text-muted">
        {presetRules(draft.check, adLimit)}. Anything that posts or spends
        always waits for your approval.
      </p>
    </Modal>
  );
}
