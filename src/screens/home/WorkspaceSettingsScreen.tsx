import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import arrowLeftDark from '@/assets/icons/arrow-left-dark.svg';
import lock from '@/assets/icons/lock.svg';
import more from '@/assets/icons/more.svg';
import plusDark14 from '@/assets/icons/plus-dark-14.svg';
import { Breadcrumb } from '@/components/nav/Breadcrumb';
import { SettingsNav } from '@/components/nav/SettingsNav';
import {
  SettingName,
  SettingsCard,
  SettingsLinkButton,
  SettingsWellRow,
} from '@/components/panels/SettingsCard';
import { AppShell, TopBar } from '@/components/shell/AppShell';
import { UserAvatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Menu, type MenuItemData } from '@/components/ui/Menu';
import { TextInput } from '@/components/ui/TextInput';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { Progress } from '@/components/ui/Progress';
import { screenPath } from '@/screens/registry';
import { PresetEditor } from '@/components/panels/PresetEditor';
import { useConnectTool } from '@/components/planning/useConnectTool';
import { useGo } from '@/state/nav';
import { presetAdLimit, presetCheck } from '@/state/permissions';
import { dispatch, useAppState } from '@/state/store';

import { TOOLS, YOU } from './workspaceData';

export const screenId = '1.2';

type Section =
  | 'general'
  | 'tools'
  | 'brand'
  | 'presets'
  | 'people'
  | 'usage'
  | 'notifications';

const NAV: { value: Section; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'tools', label: 'Connected tools' },
  { value: 'brand', label: 'Brand kit' },
  { value: 'presets', label: 'Permission presets' },
  { value: 'people', label: 'People and approvals' },
  { value: 'usage', label: 'Usage and budget' },
  { value: 'notifications', label: 'Notifications' },
];

const BRAND: { name: string; kind: 'File' | 'Skill' }[] = [
  { name: 'Brand guide.pdf', kind: 'File' },
  { name: 'Logo.svg', kind: 'File' },
  { name: 'Brand voice', kind: 'Skill' },
];

const PEOPLE: { initial: string; name: string; you?: boolean }[] = [
  { initial: YOU.initial, name: `${YOU.name} · ${YOU.role}`, you: true },
  { initial: 'V', name: 'Vivian' },
  { initial: 'T', name: 'Tonia' },
];

// Figma 1.2 "Workspace settings" (2362:23330). Button widths are the Figma instance widths: Figma's Inter
// sets these labels ~1px wider than Chrome, so hugging them would shift every right-aligned button.
export default function WorkspaceSettingsScreen() {
  const go = useGo();
  const [section, setSection] = useState<Section>('presets');
  // Presets, the default and connected tools are the workspace's in the store: 2.7, 2.8, the plan's cards and 5.1
  // read the same ones (src/state/permissions.ts).
  const app = useAppState();
  const ws = app.workspace;
  const tools = ws.tools.map((t) => {
    const seed = TOOLS.find((x) => x.name === t.name);
    return {
      ...t,
      detail:
        seed?.connected && t.account === seed.detail.split(' · ')[0]
          ? seed.detail
          : `${t.account ?? 'Lumen'} · used in 1 workflow`,
    };
  });
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [connectDialog, connect] = useConnectTool();
  const editPreset =
    editingPreset && editingPreset !== 'new'
      ? ws.presets.find((p) => p.key === editingPreset)
      : undefined;
  // Opened from a workflow (return-to stack): a way back to it.
  const backTo = go.backTarget('1.1');
  const wf = app.workflows[app.activeId];
  const [brand, setBrand] = useState(BRAND);
  const [people, setPeople] = useState(PEOPLE);
  const upload = useRef<HTMLInputElement>(null);

  const goTo = (s: Section) => {
    setSection(s);
    document
      .getElementById(`settings-${s}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppShell>
      <TopBar
        left={
          <Breadcrumb
            parents={[{ label: 'Lumen workspace', to: screenPath('1.1') }]}
            current="Settings"
          />
        }
      />
      <div className="flex min-h-px w-full flex-1 items-start max-md:flex-col">
        <SettingsNav
          title="Workspace"
          items={NAV}
          value={section}
          onChange={goTo}
        />
        <div className="flex h-full min-h-px min-w-px flex-1 flex-col items-start overflow-y-auto bg-white max-md:w-full">
          <div
            id="settings-general"
            className="flex w-[920px] max-w-full shrink-0 flex-col items-start p-10 max-md:px-4 max-md:py-6"
          >
            {backTo !== '1.1' && (
              <div className="flex w-full flex-col items-start pt-1 pb-4">
                <Button
                  size="sm"
                  leading={<Icon src={arrowLeftDark} size={16} />}
                  onClick={() => go.back('1.1')}
                >
                  {`Back to ${wf.title}`}
                </Button>
              </div>
            )}
            <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.52px] whitespace-nowrap text-ink max-md:text-[22px] max-md:leading-7">
              Workspace settings
            </h1>
            <p className="w-full pt-1.5 text-[13px] leading-[19.5px] tracking-[-0.08px] text-muted">
              These apply to every workflow. A workflow can pick a different
              preset or customize it, and a helper can override it in its
              Details.
            </p>
            <div className="grid w-full grid-cols-[410px_410px] items-start gap-5 pt-8 max-xl:grid-cols-1">
              <div className="flex flex-col items-start gap-5">
                <SettingsCard
                  id="settings-presets"
                  title="Permission presets"
                  subtitle="Saved sets of rules any workflow can use"
                >
                  <div className="flex w-full flex-col items-start gap-2 pt-4">
                    {ws.presets.map((p) => {
                      const isDefault = p.name === ws.defaultPreset;
                      return (
                        <SettingsWellRow key={p.key} className="py-3 max-md:flex-wrap max-md:gap-y-2">
                          <SettingName name={p.name} description={p.rules} className="max-md:basis-full" />
                          {isDefault ? (
                            <Badge tone="blue">Workspace default</Badge>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-[101px]"
                              onClick={() =>
                                dispatch({
                                  type: 'workspace/defaultPreset',
                                  name: p.name,
                                })
                              }
                            >
                              Make default
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-[49px]"
                            onClick={() => setEditingPreset(p.key)}
                          >
                            Edit
                          </Button>
                        </SettingsWellRow>
                      );
                    })}
                  </div>
                  <div className="flex w-full flex-col items-start pt-3">
                    <SettingsLinkButton
                      icon={plusDark14}
                      label="New preset"
                      onClick={() => setEditingPreset('new')}
                    />
                  </div>
                  <div className="flex w-full flex-col items-start pt-3">
                    <div className="flex min-h-[33px] w-full items-center gap-2">
                      <Icon src={lock} size={9.9} />
                      <p className="w-[350px] max-w-full text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted">
                        Always on in every preset: anything that posts or spends
                        waits for your approval.
                      </p>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard
                  id="settings-tools"
                  title="Connected tools"
                  subtitle="Connect once, use in any workflow"
                >
                  <div className="flex w-full flex-col items-start pt-4">
                    {tools.map((t, i) => (
                      <div
                        key={t.name}
                        className={
                          i < tools.length - 1
                            ? 'flex w-full items-center gap-3 border-b border-line py-3'
                            : 'flex w-full items-center gap-3 py-3'
                        }
                      >
                        <SettingName
                          name={t.name}
                          description={t.connected ? t.detail : 'Not connected'}
                        />
                        {t.connected ? (
                          <>
                            <Badge tone="green">Connected</Badge>
                            <RowMenu
                              label={`${t.name} actions`}
                              top="top-8"
                              items={[
                                {
                                  key: 'disconnect',
                                  label: 'Disconnect',
                                  description: 'Workflows ask you to connect it again',
                                  onSelect: () =>
                                    dispatch({
                                      type: 'workspace/tool',
                                      name: t.name,
                                      connected: false,
                                    }),
                                },
                              ]}
                              trigger={(p) => (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="w-[73px]"
                                  {...p}
                                >
                                  Manage
                                </Button>
                              )}
                            />
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-[79px]"
                            onClick={() => connect(t.name)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              </div>

              <div className="flex flex-col items-start gap-5">
                <SettingsCard
                  id="settings-brand"
                  title="Brand kit"
                  subtitle="Shared assets and skills every workflow can use"
                >
                  <div className="flex w-full flex-col items-start gap-2 pt-4">
                    {brand.map((b) => (
                      <SettingsWellRow key={b.name} className="h-11">
                        <SettingName name={b.name} weight="regular" />
                        <Badge tone="subtle">{b.kind}</Badge>
                        <BrandItemMenu
                          name={b.name}
                          onRemove={() =>
                            setBrand((list) =>
                              list.filter((x) => x.name !== b.name)
                            )
                          }
                        />
                      </SettingsWellRow>
                    ))}
                  </div>
                  <div className="flex w-full flex-col items-start pt-3">
                    <SettingsLinkButton
                      icon={plusDark14}
                      label="Upload a file or skill"
                      onClick={() => upload.current?.click()}
                    />
                    {/* The picked files only join the list here; nothing is uploaded anywhere. */}
                    <input
                      ref={upload}
                      type="file"
                      multiple
                      hidden
                      onChange={(e) => {
                        const picked = [...(e.target.files ?? [])].map((f) => ({
                          name: f.name,
                          kind: /\.(md|txt)$/i.test(f.name)
                            ? ('Skill' as const)
                            : ('File' as const),
                        }));
                        setBrand((list) => [
                          ...list,
                          ...picked.filter(
                            (f) => !list.some((x) => x.name === f.name)
                          ),
                        ]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </SettingsCard>

                <SettingsCard
                  id="settings-people"
                  title="People and approvals"
                  subtitle="Who can approve posts and spending"
                >
                  <div className="flex w-full flex-wrap items-center gap-4 pt-4">
                    {people.map((p) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <UserAvatar
                          initial={p.initial}
                          tone={p.you ? 'dark' : 'light'}
                        />
                        <p className="h-5 text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink">
                          {p.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <InviteRow
                    onInvite={(email) =>
                      setPeople((list) => [
                        ...list,
                        {
                          initial: email[0].toUpperCase(),
                          name: `${email} · Invited`,
                        },
                      ])
                    }
                  />
                </SettingsCard>

                <SettingsCard
                  id="settings-usage"
                  title="Usage and budget"
                  subtitle="AI cost across all workflows"
                >
                  <div className="flex w-full items-end justify-between pt-4">
                    <div className="flex flex-col items-start">
                      <p className="h-5 text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
                        This month
                      </p>
                      {/* Figma rounds this 16.5px line's box up to 17px; matching it keeps "This month" on Figma's y. */}
                      <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
                        ~410k tokens · 5 workflows
                      </p>
                    </div>
                    <p className="font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
                      <span className="text-[15px] leading-[22.5px]">
                        $3.40{' '}
                      </span>
                      <span className="text-[13px] leading-[19.5px] font-normal text-muted">
                        of $20
                      </span>
                    </p>
                  </div>
                  <div className="flex w-full flex-col items-start pt-3">
                    <Progress value={17} height={6} />
                  </div>
                </SettingsCard>
              </div>
            </div>
          </div>
        </div>
      </div>
      {(editingPreset === 'new' || editPreset) && (
        <PresetEditor
          isNew={editingPreset === 'new'}
          initial={
            editPreset
              ? {
                  name: editPreset.name,
                  check: presetCheck(editPreset),
                  adLimit: presetAdLimit(editPreset),
                }
              : { name: '', check: 'unsure', adLimit: 0 }
          }
          onClose={() => setEditingPreset(null)}
          onSave={(draft) => {
            dispatch({
              type: 'workspace/preset',
              preset: {
                key:
                  editPreset?.key ??
                  `preset-${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                ...draft,
              },
            });
            setEditingPreset(null);
          }}
        />
      )}
      {connectDialog}
    </AppShell>
  );
}

// A button that opens a small menu under it, right-aligned with it: "More" on a Brand kit row (Remove) and
// "Manage" on a connected tool (Disconnect).
type TriggerProps = {
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  onClick: () => void;
};
function RowMenu({
  label,
  items,
  trigger,
  top = 'top-6',
}: {
  label: string;
  items: MenuItemData[];
  trigger: (props: TriggerProps) => ReactNode;
  top?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([anchor], open, close);
  return (
    <div ref={anchor} className="relative flex">
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: () => setOpen((o) => !o),
      })}
      {open && (
        <Menu
          label={label}
          onClose={close}
          className={`absolute right-0 w-[200px] ${top}`}
          items={items}
        />
      )}
    </div>
  );
}

function BrandItemMenu({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <RowMenu
      label={`${name} actions`}
      items={[{ key: 'remove', label: 'Remove', onSelect: onRemove }]}
      trigger={(p) => (
        // 16px icon; on phones a transparent 40px hit area around it (the look is unchanged).
        <button
          type="button"
          aria-label={`More for ${name}`}
          {...p}
          className="flex rounded-[4px] hover:bg-hover max-md:relative max-md:before:absolute max-md:before:-inset-3"
        >
          <Icon src={more} size={16} />
        </button>
      )}
    />
  );
}

// "+ Invite": opens an inline email field; Enter or "Send invite" adds the person as Invited.
function InviteRow({ onInvite }: { onInvite: (email: string) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    onInvite(v);
    setEmail('');
    setOpen(false);
  };
  return (
    <div className="flex w-full flex-col items-start pt-4">
      {open ? (
        <form onSubmit={submit} className="flex w-full items-center gap-2">
          <TextInput
            autoFocus
            type="email"
            aria-label="Email to invite"
            placeholder="name@company.com"
            className="h-8 flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          />
          <Button type="submit" variant="primary" size="sm">
            Send invite
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <SettingsLinkButton
          icon={plusDark14}
          label="Invite"
          onClick={() => setOpen(true)}
        />
      )}
    </div>
  );
}
