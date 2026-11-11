import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { Progress } from '@/components/ui/Progress';
import { screenPath } from '@/screens/registry';

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

const PRESETS = [
  {
    key: 'careful',
    name: 'Careful',
    rules: 'Ask before every choice · posting waits · $0 ads',
  },
  {
    key: 'balanced',
    name: 'Balanced',
    rules: 'Ask when unsure · posting waits · $0 ads',
  },
  {
    key: 'hands-off',
    name: 'Hands-off',
    rules: 'Just go · posting still waits · $50 ads',
  },
];

const TOOLS = [
  {
    name: 'Discord',
    detail: '#launches · used in 2 workflows',
    connected: true,
  },
  {
    name: 'Email (Resend)',
    detail: 'hello@lumen.app · used in 3 workflows',
    connected: true,
  },
  { name: 'X', detail: '@lumenapp · used in 3 workflows', connected: true },
  { name: 'LinkedIn', detail: 'Not connected', connected: false },
];

const BRAND = [
  { name: 'Brand guide.pdf', kind: 'File' },
  { name: 'Logo.svg', kind: 'File' },
  { name: 'Brand voice', kind: 'Skill' },
];

const PEOPLE = [
  { initial: 'E', name: 'Emily · Owner', you: true },
  { initial: 'V', name: 'Vivian' },
  { initial: 'T', name: 'Tonia' },
];

// Figma 1.2 "Workspace settings" (2362:23330). Button widths are the Figma instance widths: Figma's Inter
// sets these labels ~1px wider than Chrome, so hugging them would shift every right-aligned button.
export default function WorkspaceSettingsScreen() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('presets');
  const [defaultPreset, setDefaultPreset] = useState('balanced');
  const [tools, setTools] = useState(TOOLS);

  const goTo = (s: Section) => {
    setSection(s);
    document
      .getElementById(`settings-${s}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppShell sidebar="none">
      <TopBar
        left={
          <Breadcrumb
            parents={[{ label: 'Lumen workspace', to: screenPath('1.1') }]}
            current="Settings"
          />
        }
        right={<UserAvatar />}
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
            <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.52px] whitespace-nowrap text-ink max-md:text-[22px] max-md:leading-7">
              Workspace settings
            </h1>
            <p className="h-[26px] w-full pt-1.5 text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-muted max-xl:h-auto max-xl:whitespace-normal">
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
                    {PRESETS.map((p) => {
                      const isDefault = p.key === defaultPreset;
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
                              onClick={() => setDefaultPreset(p.key)}
                            >
                              Make default
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-[49px]"
                            onClick={() => navigate(screenPath('2.7'))}
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
                      onClick={() => navigate(screenPath('2.7'))}
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
                          descriptionClassName="h-[19px]"
                        />
                        {t.connected ? (
                          <>
                            <Badge tone="green">Connected</Badge>
                            <Button variant="secondary" size="sm" className="w-[73px]">
                              Manage
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-[79px]"
                            onClick={() =>
                              setTools((all) =>
                                all.map((x) =>
                                  x.name === t.name
                                    ? {
                                        ...x,
                                        connected: true,
                                        detail: 'Lumen · used in 0 workflows',
                                      }
                                    : x
                                )
                              )
                            }
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
                    {BRAND.map((b) => (
                      <SettingsWellRow key={b.name} className="h-11">
                        <SettingName name={b.name} weight="regular" />
                        <Badge tone="subtle">{b.kind}</Badge>
                        <button
                          type="button"
                          aria-label={`More for ${b.name}`}
                          className="flex rounded-[4px] hover:bg-hover"
                        >
                          <Icon src={more} size={16} />
                        </button>
                      </SettingsWellRow>
                    ))}
                  </div>
                  <div className="flex w-full flex-col items-start pt-3">
                    <SettingsLinkButton
                      icon={plusDark14}
                      label="Upload a file or skill"
                    />
                  </div>
                </SettingsCard>

                <SettingsCard
                  id="settings-people"
                  title="People and approvals"
                  subtitle="Who can approve posts and spending"
                >
                  <div className="flex w-full flex-wrap items-center gap-4 pt-4">
                    {PEOPLE.map((p) => (
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
                  <div className="flex w-full flex-col items-start pt-4">
                    <SettingsLinkButton icon={plusDark14} label="Invite" />
                  </div>
                </SettingsCard>

                <SettingsCard
                  id="settings-usage"
                  title="Usage and budget"
                  subtitle="AI cost across all workflows"
                >
                  <div className="flex h-[53px] w-full items-end justify-between pt-4">
                    <div className="flex flex-col items-start">
                      <p className="h-5 text-[13px] leading-[19.5px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
                        This month
                      </p>
                      {/* Figma rounds this 16.5px line's box up to 17px; matching it keeps "This month" on Figma's y. */}
                      <p className="h-[17px] text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
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
    </AppShell>
  );
}
