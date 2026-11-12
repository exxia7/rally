import clsx from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

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
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/ui/Toggle';
import {
  AdLimitValue,
  PresetChips,
  PresetNameForm,
} from '@/components/planning/PermissionControls';
import { PlanMainAction } from '@/components/planning/PlanTopBar';
import { useConnectTool } from '@/components/planning/useConnectTool';
import { useGo } from '@/state/nav';
import { CHECK_SHORT, toolConnected } from '@/state/permissions';
import { estimate as planEstimate } from '@/state/planView';
import { money, runCost } from '@/state/runView';
import { dispatch, store, useAppState } from '@/state/store';
import type { LaunchFacts, Workflow } from '@/state/types';
import { useWorkflowPermissions } from '@/state/usePermissions';

/** The budget card's "Used $0.18": what the run has spent so far (Figma's number on its own frame). */
const budgetUsed = (wf: Workflow) =>
  wf.asDrawn === '2.8' ? '$0.18' : money(runCost(wf));

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

// The workflow's launch facts, in 2.8's order. A hand-raise fix changes the date or price; edits here change any of
// them, and the run's copy, handoffs and approvals follow (`factsPass` in runView).
const FACTS: { key: 'date' | 'audience' | 'price' | 'claim'; label: string }[] = [
  { key: 'date', label: 'Launch date' },
  { key: 'audience', label: 'Audience' },
  { key: 'price', label: 'Price' },
  { key: 'claim', label: 'Approved claim' },
];

/** Figma 2.8's Audience and Approved claim, which differ from the scene's facts (shown while the frame is as drawn). */
const DRAWN_FACTS: Partial<LaunchFacts> = {
  audience: '2,800 waitlist signups',
  claim: 'Saves you an hour a week',
};
const shownFacts = (wf: Workflow): LaunchFacts =>
  wf.asDrawn === '2.8'
    ? { ...wf.resources.facts, ...DRAWN_FACTS }
    : wf.resources.facts;

/** The "Back to …" button's label for where it returns. */
function backLabel(target: string) {
  if (/^2\./.test(target)) return 'Back to the map';
  if (target === '5.1') return 'Back to approvals';
  if (target === '5.2') return 'Back to the summary';
  if (/^[3-6]\./.test(target)) return 'Back to the run';
  if (target === '1.1') return 'Back to workflows';
  return 'Back';
}

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
  const location = useLocation();
  const s = useAppState();
  const wf = s.workflows[s.activeId];
  const perms = useWorkflowPermissions();
  const [connectDialog, connect] = useConnectTool();
  const [naming, setNaming] = useState(false);
  const [section, setSection] = useState<Section | undefined>(
    () => (location.state as { section?: Section } | null)?.section
  );
  const [tools, setTools] = useState(TOOLS);
  const [editing, setEditing] = useState<string | null>(null);
  const linkedIn = toolConnected(s, 'LinkedIn');
  const facts = shownFacts(wf);
  // The first edit on an as-drawn 2.8 keeps the other facts as shown (the frame's text), so nothing else flips.
  const setFact = (key: (typeof FACTS)[number]['key'], text: string) =>
    dispatch({
      type: 'facts/set',
      patch: {
        ...(wf.asDrawn === '2.8' ? DRAWN_FACTS : {}),
        [key]: text,
      },
    });
  // Opened for one section ("Change rule" on 5.1 → Permissions): scroll to it.
  useEffect(() => {
    const first = (location.state as { section?: Section } | null)?.section;
    if (first)
      document
        .getElementById(`wf-settings-${first}`)
        ?.scrollIntoView({ block: 'start' });
  }, [location.state]);

  const [confirm, setConfirm] = useState<'duplicate' | 'archive' | null>(
    null
  );
  const [toast, showToast] = useToast();
  // Controls agent: Archive / Restore and Duplicate are store actions (`wf/archive`, `wf/duplicate`).
  const archived = !!wf.archived;
  const setArchived = (v: boolean) => dispatch({ type: 'wf/archive', archived: v });

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
  // Opened from a run (the run's settings button or its ⌄ menu): Back returns to the run, and the main action
  // is "Back to run" instead of Start launch.
  const fromRun = /^[3-6]\./.test(go.backTarget('2.3'));
  const back = () => go.back('2.3');
  const backText = backLabel(go.backTarget('2.3'));

  return (
    <AppShell sidebar="none">
      <WorkflowTopBar
        view="planning"
        onViewChange={(v) =>
          v === 'flowchart' && (fromRun ? back() : go('3.1'))
        }
        title={wf.title}
        estimate={planEstimate(wf)}
        onSettings={back}
        settingsActive
        action={<PlanMainAction className="w-[100px]" />}
      />
      <div className="flex min-h-px w-full flex-1 items-start max-md:flex-col">
        <SettingsNav
          title={wf.title}
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
              {/* Returns to whoever opened settings (the map, the run, approvals…). */}
              <Button
                size="sm"
                className={backText === 'Back to the map' ? 'w-[140px]' : undefined}
                leading={<Icon src={arrowLeftDark} size={16} />}
                onClick={back}
              >
                {backText}
              </Button>
            </div>
            <h1 className="pt-4 text-[26px] leading-8 font-semibold tracking-[-0.52px] whitespace-nowrap text-ink max-md:text-[22px] max-md:leading-7">
              Workflow settings
            </h1>
            <p className="h-[26px] w-full pt-1.5 text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-muted max-xl:h-auto max-xl:whitespace-normal">
              {`Only for ${wf.title}. Anything you don't change follows workspace settings.`}
            </p>
            <div className="grid w-full grid-cols-[410px_410px] items-start gap-5 pt-8 max-xl:grid-cols-1">
              <div className="flex flex-col items-start gap-5">
                <SettingsCard
                  id="wf-settings-permissions"
                  title="Permissions"
                  subtitle="Start from a saved preset, then customize for this workflow"
                >
                  {/* The same permissions as 2.7's Sandbox section, 2.4e and the drawer (src/state/permissions.ts). */}
                  <PresetChips
                    className="h-10 pt-3 max-md:h-auto"
                    presets={perms.presets}
                    value={perms.preset}
                    onChange={perms.setPreset}
                  />
                  <div className="flex w-full flex-col items-start gap-3 pt-4">
                    <SettingRow name="Check with you">
                      <p className={value}>{CHECK_SHORT[perms.check]}</p>
                      {perms.checkChanged ? (
                        <Badge tone="blue" className="w-[87px]">
                          Changed here
                        </Badge>
                      ) : (
                        <Badge tone="subtle" className="w-[76px]">
                          From preset
                        </Badge>
                      )}
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
                      hint={
                        perms.presetAdLimit === undefined
                          ? 'Custom for this workflow'
                          : `${perms.preset} preset is $${perms.presetAdLimit}`
                      }
                    >
                      <AdLimitValue
                        className={value}
                        value={perms.adLimit}
                        onChange={perms.setAdLimit}
                      />
                      {perms.adLimitChanged ? (
                        <Badge tone="blue" className="w-[87px]">
                          Changed here
                        </Badge>
                      ) : (
                        <Badge tone="subtle" className="w-[76px]">
                          From preset
                        </Badge>
                      )}
                    </SettingRow>
                    <SettingRow name="Checkpoint">
                      <p className={value}>You approve before step 4</p>
                      <Badge tone="blue" className="w-[111px] max-md:hidden">
                        This workflow only
                      </Badge>
                    </SettingRow>
                  </div>
                  {naming ? (
                    <PresetNameForm
                      className="pt-4"
                      onSave={(name) => {
                        perms.saveAsPreset(name);
                        setNaming(false);
                      }}
                      onCancel={() => setNaming(false)}
                    />
                  ) : (
                    // One text node (as Figma draws it): the whole line saves these as a new preset.
                    <button
                      type="button"
                      onClick={() => setNaming(true)}
                      className="block min-h-[33px] w-full pt-4 text-left text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted hover:text-accent"
                    >
                      Save these as a new preset · A helper can still override in
                      its Details
                    </button>
                  )}
                </SettingsCard>

                <SettingsCard
                  id="wf-settings-facts"
                  title="Launch facts"
                  subtitle="Every helper follows these. Fixes you make during a run get pinned here."
                  subtitleWrap
                >
                  <div className="flex w-full flex-col items-start pt-3">
                    {FACTS.map((f, i) => (
                      <div
                        key={f.key}
                        className={clsx(
                          'flex h-11 w-full items-center gap-3',
                          i < FACTS.length - 1 && 'border-b border-line',
                        )}
                      >
                        <p className="min-w-px flex-1 truncate text-[13px] leading-[19.5px] tracking-[-0.08px] text-ink-2">
                          {f.label}
                        </p>
                        {editing === f.key ? (
                          <input
                            autoFocus
                            aria-label={f.label}
                            value={facts[f.key]}
                            onChange={(e) => setFact(f.key, e.target.value)}
                            onKeyDown={(e) =>
                              e.key === 'Enter' && setEditing(null)
                            }
                            className="h-7 w-[180px] min-w-0 rounded-control border border-accent-line px-2 text-right text-[13px] font-medium text-ink outline-none"
                          />
                        ) : (
                          <p className={clsx(value, 'truncate')}>
                            {facts[f.key]}
                          </p>
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
                    {/* LinkedIn: the workspace's connection (1.2), connected right here when it isn't. */}
                    <div className="flex h-12 w-full items-center">
                      <div className="flex min-w-px flex-1 flex-col items-start">
                        <p
                          className={clsx(
                            'h-5 text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap',
                            linkedIn ? 'text-ink' : 'text-muted'
                          )}
                        >
                          LinkedIn
                        </p>
                        <p className="h-[17px] truncate text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted max-md:w-full">
                          {linkedIn
                            ? 'Publisher'
                            : 'Not connected · connect in workspace settings'}
                        </p>
                      </div>
                      <Toggle
                        label={linkedIn ? 'LinkedIn' : 'LinkedIn (connect it)'}
                        checked={linkedIn}
                        onChange={(on) =>
                          on
                            ? connect('LinkedIn')
                            : dispatch({
                                type: 'workspace/tool',
                                name: 'LinkedIn',
                                connected: false,
                              })
                        }
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
                        {`Used ${budgetUsed(wf)} so far · pauses and asks you at the cap`}
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
          // A draft copy (same team, settings and facts; no run), first on Home; the toast opens it.
          const title = name.trim() || `${wf.title} copy`;
          dispatch({ type: 'wf/duplicate', title });
          const copyId = store.get().order[0];
          showToast({
            message: `Created “${title}” as a draft`,
            action: {
              label: 'Open',
              onClick: () => {
                dispatch({ type: 'wf/open', id: copyId });
                go('2.3');
              },
            },
          });
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
          // Archived: hidden from Home and the run paused; Undo / Restore bring it back.
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
      {connectDialog}
    </AppShell>
  );
}
