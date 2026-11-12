import clsx from 'clsx';
import { type ReactNode, useState } from 'react';

import arrowLeftDark from '@/assets/icons/arrow-left-dark.svg';
import lockAmber from '@/assets/icons/lock-amber-10.svg';
import { SettingsNav } from '@/components/nav/SettingsNav';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { ConfirmDialog } from '@/components/panels/ConfirmDialog';
import { SettingsCard } from '@/components/panels/SettingsCard';
import { AppShell } from '@/components/shell/AppShell';
import { UserAvatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { useGo } from '@/state/nav';

export const screenId = '2.8';

type Section =
  | 'permissions'
  | 'facts'
  | 'tools'
  | 'budget'
  | 'approvers'
  | 'duplicate'
  | 'archive';

const NAV: { value: Section; label: string }[] = [
  { value: 'permissions', label: 'Permissions' },
  { value: 'facts', label: 'Launch facts' },
  { value: 'tools', label: 'Tools' },
  { value: 'budget', label: 'Budget' },
  { value: 'approvers', label: 'Approvers' },
];
const MORE: { value: Section; label: string }[] = [
  { value: 'duplicate', label: 'Duplicate or save as template' },
  { value: 'archive', label: 'Archive' },
];

type Preset = 'careful' | 'balanced' | 'hands-off' | 'custom';
// `w` is the Figma chip width: Figma's Inter sets these labels ~1px wider than Chrome.
const PRESETS: { value: Preset; label: string; check: string; w: string }[] = [
  {
    value: 'careful',
    label: 'Careful',
    check: 'Before every choice',
    w: 'w-[62px]',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    check: 'Only when unsure',
    w: 'w-[73px]',
  },
  { value: 'hands-off', label: 'Hands-off', check: 'Just go', w: 'w-[78px]' },
  {
    value: 'custom',
    label: 'Custom',
    check: 'Only when unsure',
    w: 'w-[65px]',
  },
];

const FACTS = [
  { key: 'date', label: 'Launch date', value: 'Mar 12' },
  { key: 'audience', label: 'Audience', value: '2,800 waitlist signups' },
  { key: 'price', label: 'Price', value: '$12/mo' },
  { key: 'claim', label: 'Approved claim', value: 'Saves you an hour a week' },
];

const TOOLS = [
  { name: 'Discord', helper: 'Community', on: true },
  { name: 'Email (Resend)', helper: 'Publisher', on: true },
  { name: 'X', helper: 'Publisher', on: true },
  { name: 'Web search', helper: 'Scout', on: true },
];

const label =
  'min-w-px flex-1 text-[13px] leading-[19.5px] tracking-[-0.08px] text-ink-2';
const value =
  'text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink';

function SettingRow({
  name,
  hint,
  children,
}: {
  name: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      {hint ? (
        <div className="flex min-w-px flex-1 flex-col items-start tracking-[-0.08px]">
          <p className="h-5 w-full text-[13px] leading-[19.5px] text-ink-2">
            {name}
          </p>
          <p className="h-[17px] w-full text-[11px] leading-[16.5px] text-muted">
            {hint}
          </p>
        </div>
      ) : (
        <p className={label}>{name}</p>
      )}
      {children}
    </div>
  );
}

// Figma 2.8 "Workflow settings" (2362:24542): settings that apply to this workflow only, over the workspace
// defaults. Same page layout as 1.2 (side nav, 920px content, two 410px card columns).
export default function WorkflowSettingsScreen() {
  const go = useGo();
  const [section, setSection] = useState<Section | undefined>();
  const [preset, setPreset] = useState<Preset>('balanced');
  const [tools, setTools] = useState(TOOLS);
  const [facts, setFacts] = useState(FACTS);
  const [editing, setEditing] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<'duplicate' | 'archive' | null>(
    null
  );
  const [toast, showToast] = useToast();
  const [archived, setArchived] = useState(false);

  const goTo = (s: Section) => {
    if (s === 'duplicate' || s === 'archive') {
      setConfirm(s);
      return;
    }
    setSection(s);
    document
      .getElementById(`wf-settings-${s}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const check = PRESETS.find((p) => p.value === preset)!.check;
  // Opened from a run (the run's settings button or its ⌄ menu): Back returns to the run, and the main action
  // is "Back to run" instead of Start launch.
  const fromRun = /^[3-6]\./.test(go.backTarget('2.3'));
  const back = () => go.back('2.3');

  return (
    <AppShell sidebar="none">
      <WorkflowTopBar
        view="planning"
        onViewChange={(v) =>
          v === 'flowchart' && (fromRun ? back() : go('3.1'))
        }
        estimate="About 9 min · $0.30"
        onSettings={back}
        settingsActive
        action={
          <Button
            variant="primary"
            className="w-[100px]"
            onClick={() => (fromRun ? back() : go('3.2'))}
          >
            {fromRun ? 'Back to run' : 'Start launch'}
          </Button>
        }
      />
      <div className="flex min-h-px w-full flex-1 items-start max-md:flex-col">
        <SettingsNav
          title="AI Coach launch"
          items={NAV}
          more={{
            title: 'More',
            items: archived
              ? MORE.map((m) =>
                  m.value === 'archive' ? { ...m, label: 'Restore' } : m
                )
              : MORE,
          }}
          value={section}
          onChange={goTo}
        />
        <div className="flex h-full min-h-px min-w-px flex-1 flex-col items-start overflow-y-auto bg-white max-md:w-full">
          <div className="flex w-[920px] max-w-full shrink-0 flex-col items-start p-10 max-md:px-4 max-md:py-6">
            <div className="flex w-full flex-col items-start pt-1">
              <Button
                size="sm"
                className="w-[140px]"
                leading={<Icon src={arrowLeftDark} size={16} />}
                onClick={back}
              >
                Back to the map
              </Button>
            </div>
            <h1 className="pt-4 text-[26px] leading-8 font-semibold tracking-[-0.52px] whitespace-nowrap text-ink max-md:text-[22px] max-md:leading-7">
              Workflow settings
            </h1>
            <p className="h-[26px] w-full pt-1.5 text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-muted max-xl:h-auto max-xl:whitespace-normal">
              Only for AI Coach launch. Anything you don&apos;t change follows
              workspace settings.
            </p>
            <div className="grid w-full grid-cols-[410px_410px] items-start gap-5 pt-8 max-xl:grid-cols-1">
              <div className="flex flex-col items-start gap-5">
                <SettingsCard
                  id="wf-settings-permissions"
                  title="Permissions"
                  subtitle="Start from a saved preset, then customize for this workflow"
                >
                  <div className="flex h-10 w-full flex-wrap items-start gap-1.5 pt-3 max-md:h-auto">
                    {PRESETS.map((p) => (
                      <ChoiceChip
                        key={p.value}
                        selected={p.value === preset}
                        className={p.w}
                        onClick={() => setPreset(p.value)}
                      >
                        {p.label}
                      </ChoiceChip>
                    ))}
                  </div>
                  <div className="flex w-full flex-col items-start gap-3 pt-4">
                    <SettingRow name="Check with you">
                      <p className={value}>{check}</p>
                      <Badge tone="subtle" className="w-[76px]">
                        {preset === 'custom' ? 'Changed here' : 'From preset'}
                      </Badge>
                    </SettingRow>
                    <SettingRow name="Posting or spending">
                      <p className={value}>Always waits for you</p>
                      <Badge
                        tone="subtle"
                        icon={<Icon src={lockAmber} size={10} />}
                        className="max-md:hidden"
                      >
                        Locked by workspace
                      </Badge>
                    </SettingRow>
                    <SettingRow
                      name="Ad spend limit"
                      hint={`${PRESETS.find((p) => p.value === preset)!.label} preset is ${preset === 'hands-off' ? '$50' : '$0'}`}
                    >
                      <p className={value}>$50</p>
                      <Badge tone="blue" className="w-[87px]">
                        Changed here
                      </Badge>
                    </SettingRow>
                    <SettingRow name="Checkpoint">
                      <p className={value}>You approve before step 4</p>
                      <Badge tone="blue" className="w-[111px] max-md:hidden">
                        This workflow only
                      </Badge>
                    </SettingRow>
                  </div>
                  <p className="min-h-[33px] w-full pt-4 text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted">
                    Save these as a new preset · A helper can still override in
                    its Details
                  </p>
                </SettingsCard>

                <SettingsCard
                  id="wf-settings-facts"
                  title="Launch facts"
                  subtitle="Every helper follows these. Fixes you make during a run get pinned here."
                  subtitleWrap
                >
                  <div className="flex w-full flex-col items-start pt-3">
                    {facts.map((f, i) => (
                      <div
                        key={f.key}
                        className={clsx(
                          'flex h-11 w-full items-center gap-3',
                          i < facts.length - 1 && 'border-b border-line',
                        )}
                      >
                        <p className="min-w-px flex-1 truncate text-[13px] leading-[19.5px] tracking-[-0.08px] text-ink-2">
                          {f.label}
                        </p>
                        {editing === f.key ? (
                          <input
                            autoFocus
                            aria-label={f.label}
                            value={f.value}
                            onChange={(e) =>
                              setFacts((all) =>
                                all.map((x) =>
                                  x.key === f.key
                                    ? { ...x, value: e.target.value }
                                    : x,
                                ),
                              )
                            }
                            onKeyDown={(e) =>
                              e.key === 'Enter' && setEditing(null)
                            }
                            className="h-7 w-[180px] min-w-0 rounded-control border border-accent-line px-2 text-right text-[13px] font-medium text-ink outline-none"
                          />
                        ) : (
                          <p className={clsx(value, 'truncate')}>{f.value}</p>
                        )}
                        <Button
                          size="sm"
                          className="w-[49px]"
                          onClick={() =>
                            setEditing((k) => (k === f.key ? null : f.key))
                          }
                        >
                          {editing === f.key ? 'Done' : 'Edit'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              </div>

              <div className="flex flex-col items-start gap-5">
                <SettingsCard
                  id="wf-settings-tools"
                  title="Tools for this workflow"
                  subtitle="Pick from tools connected in the workspace"
                >
                  <div className="flex w-full flex-col items-start pt-3">
                    {tools.map((t) => (
                      <div
                        key={t.name}
                        className="flex h-12 w-full items-center border-b border-line"
                      >
                        <div className="flex min-w-px flex-1 flex-col items-start">
                          <p className={clsx(value, 'h-5')}>{t.name}</p>
                          <p className="h-[17px] text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
                            {t.helper}
                          </p>
                        </div>
                        <Toggle
                          label={t.name}
                          checked={t.on}
                          onChange={(on) =>
                            setTools((all) =>
                              all.map((x) =>
                                x.name === t.name ? { ...x, on } : x,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                    <div className="flex h-12 w-full items-center">
                      <div className="flex min-w-px flex-1 flex-col items-start">
                        <p className="h-5 text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap text-muted">
                          LinkedIn
                        </p>
                        <p className="h-[17px] truncate text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted max-md:w-full">
                          Not connected · connect in workspace settings
                        </p>
                      </div>
                      <Toggle
                        label="LinkedIn (connect in workspace settings)"
                        checked={false}
                        onChange={() => go('1.2')}
                      />
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard
                  id="wf-settings-budget"
                  title="Budget for this workflow"
                >
                  <div className="flex w-full items-center pt-3">
                    <div className="flex min-w-px flex-1 flex-col items-start">
                      <p className={clsx(value, 'h-5')}>Spending cap</p>
                      <p className="min-h-[33px] w-full text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted">
                        Used $0.18 so far · pauses and asks you at the cap
                      </p>
                    </div>
                    <p className="h-[21px] w-12 shrink-0 pr-2 text-[14px] leading-[21px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
                      $2.00
                    </p>
                    <Badge tone="blue" className="w-[87px]">
                      Changed here
                    </Badge>
                  </div>
                </SettingsCard>

                <SettingsCard id="wf-settings-approvers" title="Approvers">
                  <div className="flex min-h-10 w-full flex-wrap items-center gap-3 pt-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar initial="E" tone="dark" />
                      <p className="text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink">
                        Emily
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserAvatar initial="V" />
                      <p className="text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink">
                        Vivian
                      </p>
                    </div>
                    <Badge tone="subtle" className="w-[100px]">
                      From workspace
                    </Badge>
                  </div>
                </SettingsCard>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* "Duplicate or save as template" and "Archive" confirm first, then say what happened. */}
      <ConfirmDialog
        key={`duplicate-${confirm === 'duplicate'}`}
        open={confirm === 'duplicate'}
        onClose={() => setConfirm(null)}
        title="Duplicate AI Coach launch"
        body="Makes a new draft with the same team, settings and launch facts. Runs, decisions and approvals stay here."
        note={{ label: 'Name', defaultValue: 'AI Coach launch copy' }}
        confirmLabel="Duplicate"
        onConfirm={(_, name) => {
          setConfirm(null);
          // STATE: the store should add a draft workflow (copy of helpers, settings and facts, no run) named
          // `name`, so it shows on Home and its toast action can open it.
          showToast({ message: `Created “${name.trim() || 'AI Coach launch copy'}” as a draft` });
        }}
      />
      <ConfirmDialog
        open={confirm === 'archive'}
        onClose={() => setConfirm(null)}
        title={archived ? 'Restore AI Coach launch' : 'Archive AI Coach launch'}
        body={
          archived
            ? 'It goes back to Workflows with its run and history.'
            : 'It leaves Workflows and stops any run. Its history is kept, and you can restore it here.'
        }
        confirmLabel={archived ? 'Restore' : 'Archive'}
        onConfirm={() => {
          setConfirm(null);
          // STATE: the store should set this workflow's status to archived (hidden from Home's list, run
          // stopped) and clear it on Undo / Restore.
          const next = !archived;
          setArchived(next);
          showToast(
            next
              ? {
                  message: 'Archived AI Coach launch',
                  action: { label: 'Undo', onClick: () => setArchived(false) },
                }
              : { message: 'Restored AI Coach launch' }
          );
        }}
      />
      {toast}
    </AppShell>
  );
}
