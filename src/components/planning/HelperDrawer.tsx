import clsx from 'clsx';
import { useCallback, useRef, useState, type ReactNode } from 'react';

import chevronDownDark from '@/assets/icons/chevron-down-dark-14.svg';
import close from '@/assets/icons/close.svg';
import dragHandle from '@/assets/icons/drag-handle.svg';
import decisionGlyph from '@/assets/icons/node-kind-decision-glyph.svg';
import outputGlyph from '@/assets/icons/node-kind-output-glyph.svg';
import plusGray from '@/assets/icons/plus-gray.svg';
import upload from '@/assets/icons/upload-16.svg';
import { AgentAvatar } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { NodeKindGlyph, type NodeKindName } from '@/components/map/NodeKind';
import { SidePanel } from '@/components/panels/SidePanel';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Menu } from '@/components/ui/Menu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { ToolRow } from '@/components/ui/ToolRow';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { TOOLS } from './tools';

const KIND_LABEL: Record<Exclude<NodeKindName, 'task'>, string> = {
  action: 'Does the work',
  decision: 'Makes a call',
  output: 'Makes content',
};

const CHECKS_OPTIONS = [
  'Team default · when unsure',
  'Always · before every step',
  'Never · run on its own',
];

export type DrawerResource = { name: string; type: string };

export type HelperDraft = {
  name: string;
  agent?: AgentName;
  kind: Exclude<NodeKindName, 'task'>;
  description: string;
  model: 'Haiku 5.5' | 'Opus 5.5';
  cost: string;
  /** Undefined = no Tools section; the drawer then leads with Resources (2.4). */
  tools?: string[];
  resources: DrawerResource[];
  getsFrom: string;
  passesTo: string;
  passes: string;
  checks: string;
};

// Figma "HelperDrawer" (2.4, 2362:23798; 2.4b-full, 2362:27856): edit one helper in the side panel. Header (kind
// glyph + label, "Saved", ×), then name, What it does, Model, Tools (when the helper has a tool list), Resources,
// Checks with you and the Gets from / Passes on card, and a footer with Remove helper / Duplicate. Resources
// add by Upload only (a real file picker; the file joins the list): the user asked to drop "Add from Sandbox". A helper with
// tools (2.4b-full) packs its sections 16px apart and puts Checks with you last; one without (2.4) uses 20px.
// Every field is live: the screen gets each change through `onChange`.
export function HelperDrawer({
  helper,
  onChange,
  onClose,
  onRemove,
  onDuplicate,
  onConnectTool,
}: {
  helper: HelperDraft;
  onChange: (patch: Partial<HelperDraft>) => void;
  onClose: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  onConnectTool?: () => void;
}) {
  const hasTools = helper.tools !== undefined;
  const fileInput = useRef<HTMLInputElement>(null);

  const header = (
    <div className="flex w-full shrink-0 items-center gap-2 px-6 pt-5 max-md:px-4">
      {helper.kind === 'decision' ? (
        <Icon src={decisionGlyph} size={16} />
      ) : helper.kind === 'output' ? (
        <Icon src={outputGlyph} size={11.99} />
      ) : (
        <NodeKindGlyph kind="action" />
      )}
      <p className="text-[12px] leading-4 font-medium tracking-[-0.08px] whitespace-nowrap text-muted">
        {KIND_LABEL[helper.kind]}
      </p>
      <div className="flex min-w-px flex-1 items-start justify-end">
        <p className="text-[12px] leading-4 tracking-[-0.08px] whitespace-nowrap text-muted">
          Saved
        </p>
      </div>
      <IconButton icon={close} label="Close helper" onClick={onClose} />
    </div>
  );

  const footer = (
    <div className="flex h-14 w-full shrink-0 items-center justify-between border-t border-line px-6 max-md:px-4">
      <Button variant="danger" size="sm" onClick={onRemove}>
        Remove helper
      </Button>
      <Button size="sm" onClick={onDuplicate}>
        Duplicate
      </Button>
    </div>
  );

  const checks = (
    <ChecksWithYou
      value={helper.checks}
      onChange={(v) => onChange({ checks: v })}
      hintClassName={hasTools ? 'h-[22px]' : 'h-[23px]'}
    />
  );

  return (
    <SidePanel header={header} footer={footer} onClose={onClose}>
      <div
        className={clsx(
          'flex w-full flex-col items-start px-6 py-4 max-md:px-4',
          hasTools ? 'gap-4' : 'gap-5'
        )}
      >
        <div className="flex w-full items-center gap-3">
          {helper.agent && <AgentAvatar agent={helper.agent} size={40} />}
          <TextInput
            aria-label="Helper name"
            className="flex-1"
            inputClassName="text-[15px]! font-semibold"
            value={helper.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <label className="flex w-full flex-col items-start gap-1.5">
          <FieldLabel>What it does</FieldLabel>
          <TextArea
            value={helper.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </label>
        <div className="flex w-full flex-col items-start">
          <FieldLabel>Model</FieldLabel>
          <div
            className={clsx(
              'flex w-full items-center gap-3 pt-1.5',
              hasTools ? 'h-[38px]' : 'h-9'
            )}
          >
            <SegmentedControl
              label="Model"
              options={[
                { value: 'Haiku 5.5', label: 'Haiku 5.5' },
                { value: 'Opus 5.5', label: 'Opus 5.5' },
              ]}
              value={helper.model}
              onChange={(model) => onChange({ model })}
            />
            <p className="text-[12px] leading-4 tracking-[-0.08px] whitespace-nowrap text-muted">
              {helper.cost}
            </p>
          </div>
        </div>
        {helper.tools && (
          <div className="flex w-full flex-col items-start">
            <FieldLabel>Tools</FieldLabel>
            <div className="flex w-full flex-col items-start pt-1.5">
              <div className="flex w-full flex-col items-start overflow-clip rounded-[10px] border border-line py-0.5">
                {TOOLS.map((t) => (
                  <ToolRow
                    key={t.name}
                    name={t.name}
                    source={t.source}
                    dense
                    checked={helper.tools?.includes(t.name)}
                    onToggle={() =>
                      onChange({
                        tools: helper.tools?.includes(t.name)
                          ? helper.tools.filter((x) => x !== t.name)
                          : [...(helper.tools ?? []), t.name],
                      })
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex w-full items-center pt-2">
              <Button
                size="sm"
                leading={<Icon src={plusGray} size={16} />}
                onClick={onConnectTool}
              >
                Connect a tool
              </Button>
            </div>
          </div>
        )}
        <div className="flex w-full flex-col items-start">
          <FieldLabel>Resources</FieldLabel>
          {helper.resources.length > 0 && (
            <div className="flex w-full flex-col items-start gap-1 pt-1.5">
              {helper.resources.map((r) => (
                <div
                  key={r.name}
                  className="flex h-11 w-full items-center gap-2 rounded-[11px] bg-well px-2.5"
                >
                  <Icon src={dragHandle} size={14} />
                  <div className="flex min-w-px flex-1 flex-col items-start">
                    <p className="truncate text-[13px] leading-[18.75px] font-medium tracking-[-0.08px] text-ink">
                      {r.name}
                    </p>
                    <p className="text-[12px] leading-4 tracking-[-0.08px] whitespace-nowrap text-muted">
                      {r.type}
                    </p>
                  </div>
                  <IconButton
                    icon={close}
                    label={`Remove ${r.name}`}
                    onClick={() =>
                      onChange({
                        resources: helper.resources.filter((x) => x !== r),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <div
            className={clsx(
              'flex w-full items-center gap-4',
              helper.resources.length > 0 ? 'pt-2' : 'pt-1.5'
            )}
          >
            <Button
              size="sm"
              leading={<Icon src={upload} size={16} />}
              onClick={() => fileInput.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].map((f) => ({
                  name: f.name,
                  type: 'File · uploaded',
                }));
                if (files.length)
                  onChange({ resources: [...helper.resources, ...files] });
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {!hasTools && checks}
        <div className="flex w-full flex-col items-start rounded-card border border-line">
          <HandoffRow
            label="Gets from"
            value={helper.getsFrom}
            onChange={(v) => onChange({ getsFrom: v })}
            // 2.4 draws these rows at 62.25 / 61.25px, 2.4b-full at 62 / 61.
            className={clsx(
              'border-b border-line',
              hasTools ? 'h-[62px]' : 'h-[62.25px]'
            )}
          />
          <HandoffRow
            label={`Passes on · to ${helper.passesTo}`}
            value={helper.passes}
            onChange={(v) => onChange({ passes: v })}
            className={hasTools ? 'h-[61px]' : 'h-[61.25px]'}
          />
        </div>
        {hasTools && checks}
      </div>
    </SidePanel>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
      {children}
    </p>
  );
}

// "Checks with you": a 36px dropdown (1px line-2, 10px radius) that overrides the team's ask-first rule.
function ChecksWithYou({
  value,
  onChange,
  hintClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  hintClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  useOutsideClick([ref], open, closeMenu);
  return (
    <div className="flex w-full flex-col items-start">
      <div className="flex h-6 w-full flex-col items-start pb-1.5">
        <FieldLabel>Checks with you</FieldLabel>
      </div>
      <div ref={ref} className="relative w-full">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full items-center gap-2 overflow-clip rounded-[10px] border border-line-2 bg-white pr-2.5 pl-3 text-left hover:bg-hover"
        >
          <span className="min-w-px flex-1 truncate text-[13px] leading-[normal] tracking-[-0.08px] text-ink">
            {value}
          </span>
          <Icon src={chevronDownDark} size={14} />
        </button>
        {open && (
          <Menu
            label="Checks with you"
            onClose={closeMenu}
            className="absolute top-10 left-0 w-full"
            items={CHECKS_OPTIONS.map((o) => ({
              key: o,
              label: o,
              onSelect: () => onChange(o),
            }))}
          />
        )}
      </div>
      <p
        className={clsx(
          'w-full pt-1.5 text-[12px] leading-4 tracking-[-0.08px] text-muted',
          hintClassName
        )}
      >
        Overrides the team rule for this helper only.
      </p>
    </div>
  );
}

// One handoff in the Gets from / Passes on card: muted label, Medium 13 value, Secondary Small "Edit" that turns
// the value into a field (Enter or Done saves).
function HandoffRow({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={clsx('flex w-full items-start gap-2 p-3', className)}>
      <div className="flex h-full min-w-px flex-1 flex-col items-start">
        <p className="text-[12px] leading-4 tracking-[-0.08px] whitespace-nowrap text-muted">
          {label}
        </p>
        <div className="flex h-[21px] w-full items-start pt-0.5">
          {editing ? (
            <input
              autoFocus
              aria-label={label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              className="w-full bg-transparent text-[13px] leading-[18.75px] font-medium tracking-[-0.08px] text-ink outline-none"
            />
          ) : (
            <p className="truncate text-[13px] leading-[18.75px] font-medium tracking-[-0.08px] text-ink">
              {value}
            </p>
          )}
        </div>
      </div>
      <Button size="sm" onClick={() => setEditing((e) => !e)}>
        {editing ? 'Done' : 'Edit'}
      </Button>
    </div>
  );
}
