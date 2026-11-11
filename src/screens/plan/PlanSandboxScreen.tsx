import clsx from 'clsx';
import { type DragEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import lockDark from '@/assets/icons/lock-dark.svg';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import type { PlanNode } from '@/components/planning/PlanMap';
import { PlanSandboxPanel } from '@/components/planning/PlanSandboxPanel';
import { PlanTopBar } from '@/components/planning/PlanTopBar';
import type {
  SandboxItem,
  SandboxSection,
} from '@/components/run/SandboxPanel';
import { AppShell } from '@/components/shell/AppShell';
import type { MenuItemData } from '@/components/ui/Menu';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import { Radio } from '@/components/ui/Radio';
import { screenPath } from '@/screens/registry';

import {
  AI_COACH_OUTPUTS,
  AI_COACH_PLAN_COMPACT,
  AI_COACH_TEAM,
  type Helper,
  helperCard,
} from './aiCoachPlan';
import {
  COMMUNITY,
  COMMUNITY_OUTPUTS,
  COMMUNITY_PLAN_COMPACT,
} from './communityPlan';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.6', '2.7'];

// Figma 2.6 "Sandbox · drag a resource" (2362:24285) and 2.7 "Permissions" (2362:24400): the planning map, smaller,
// beside the Sandbox tab. 2.6 opens Tools with the new Community helper waiting for one ("Tools · None yet"); drag
// any Asset, Skill or Tool row onto a helper card and the card gains it (the row lights up as just changed). 2.7
// opens Permissions: preset chips, when the team checks with you, and the rules every preset keeps.
// Chat goes back to the map's chat (2.5 with Community, 2.3 without).

type Section = 'assets' | 'skills' | 'tools';
type Team = Record<string, Helper>;
type Drag = { item: SandboxItem; section: Section };

const ROW_FOR: Record<Section, 'files' | 'skills' | 'tools'> = {
  assets: 'files',
  skills: 'skills',
  tools: 'tools',
};

const SECTIONS: (SandboxSection & { id: string })[] = [
  {
    id: 'assets',
    title: 'Assets',
    items: [
      { name: 'Brand guide.pdf', source: 'Writer' },
      { name: 'Logo.svg', source: 'Designer' },
      { name: '3 inspo images', source: 'Designer' },
      { name: 'Waitlist survey.csv', source: 'Insights' },
      { name: 'Competitor notes.md', source: 'Strategist' },
      { name: 'lumen.app', source: 'Not used yet' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    items: [
      { name: 'Brand voice', source: 'Writer' },
      { name: 'Positioning playbook', source: 'Strategist' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    items: [
      { name: 'Web search', source: 'Built in' },
      { name: 'Image maker', source: 'Built in' },
      { name: 'Email (Resend)', source: 'Connected' },
      { name: 'X', source: 'Connected' },
      { name: 'Discord', source: 'Connected' },
    ],
  },
  {
    id: 'facts',
    title: 'Launch facts',
    items: [
      { name: 'Launch on Mar 12', source: 'From your chat' },
      { name: '2,800 waitlist signups', source: 'From your chat' },
      { name: '$12/mo', source: 'From your chat' },
    ],
  },
  { id: 'permissions', title: 'Permissions', items: [], count: 4 },
  {
    id: 'estimate',
    title: 'Estimate',
    items: [
      { name: 'About 9 min', source: 'Run time' },
      { name: '~38k tokens', source: '7 helpers' },
      { name: '$0.30', source: 'AI cost' },
    ],
  },
];

// A helper's card, with an empty tool list shown as "Tools · None yet" (2.6's Community).
function card(h: Helper, changed?: string) {
  const c = helperCard(h);
  const settings =
    h.tools && h.tools.length === 0
      ? [
          c.settings[0],
          { label: 'Tools', value: 'None yet' },
          ...c.settings.slice(1),
        ]
      : c.settings;
  return {
    ...c,
    settings: settings.map((s) => ({
      ...s,
      highlighted: s.highlighted || s.label === changed,
    })),
  };
}

// Figma's hug height of a helper card at plan-map scale 1: header + job + a 21.87px row per setting.
const cardHeight = (n: PlanNode, scale: number) =>
  n.height ?? (81.3 + 21.87 * n.settings.length) * scale;

// Touch screens and phones can't drag from the Sandbox sheet onto the map: rows get an "Add to…" menu instead.
const isTouchOrPhone = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

export default function PlanSandboxScreen() {
  const navigate = useNavigate();
  const { id = '2.6' } = useParams();
  const withCommunity = id === '2.6';
  const layout = withCommunity ? COMMUNITY_PLAN_COMPACT : AI_COACH_PLAN_COMPACT;
  const outputs = withCommunity ? COMMUNITY_OUTPUTS : AI_COACH_OUTPUTS;

  const [team, setTeam] = useState<Team>(() =>
    withCommunity
      ? { ...AI_COACH_TEAM, community: { ...COMMUNITY, tools: [] } }
      : AI_COACH_TEAM,
  );
  // Helpers that just got something, and the row that changed.
  const [changed, setChanged] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(isDesktop);
  const [sections, setSections] = useState(() =>
    SECTIONS.map((s) => ({
      ...s,
      open: s.id === (withCommunity ? 'tools' : 'permissions'),
    })),
  );
  const [imports, setImports] = useState(0);
  // The card that just got something from the "Add to…" menu: ringed and scrolled into view for a moment.
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    document
      .querySelector('[data-plan-flash]')
      ?.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'smooth',
      });
    const t = window.setTimeout(() => setFlash(null), 2500);
    return () => window.clearTimeout(t);
  }, [flash]);

  const focus = withCommunity ? 'community' : null;
  const nodes: PlanNode[] = layout.nodes.map((n) => {
    const h = team[n.id];
    const base = h ? { ...n, ...card(h, changed[n.id]) } : n;
    if (n.id === focus || changed[n.id]) return base;
    return { ...base, state: 'dimmed' };
  });

  const give = (helper: string, d: Drag) => {
    const h = team[helper];
    if (!h) return;
    const key = ROW_FOR[d.section];
    const list = h[key] ?? [];
    if (list.includes(d.item.name)) return;
    setTeam((t) => ({
      ...t,
      [helper]: {
        ...h,
        [key]: [...list, d.item.name],
        state: h.state === 'new' ? 'new' : 'updated',
      },
    }));
    setChanged((c) => ({
      ...c,
      [helper]:
        key === 'files' ? 'Files' : key === 'skills' ? 'Skills' : 'Tools',
    }));
    setSections((all) =>
      all.map((s) =>
        s.id === d.section
          ? {
              ...s,
              items: s.items.map((i) =>
                i.name === d.item.name && !i.source.includes(h.name)
                  ? {
                      ...i,
                      source: /^(Built in|Connected|Not used yet)$/.test(
                        i.source,
                      )
                        ? h.name
                        : `${i.source}, ${h.name}`,
                    }
                  : i,
              ),
            }
          : s,
      ),
    );
  };

  const importFile = () => {
    const n = imports + 1;
    setImports(n);
    setSections((all) =>
      all.map((s) =>
        s.id === 'assets'
          ? {
              ...s,
              open: true,
              items: [
                { name: `Upload ${n}.pdf`, source: 'Not used yet' },
                ...s.items,
              ],
            }
          : s,
      ),
    );
  };

  const rowMenu = (
    item: SandboxItem,
    section: SandboxSection,
  ): MenuItemData[] | undefined => {
    if (!isTouchOrPhone() || !(section.id in ROW_FOR)) return undefined;
    const d: Drag = { item, section: section.id as Section };
    const key = ROW_FOR[d.section];
    return layout.nodes
      .filter((n) => team[n.id])
      .map((n) => {
        const has = (team[n.id][key] ?? []).includes(item.name);
        return {
          key: n.id,
          label: `Add to ${n.name}`,
          description: has ? 'Already has it' : team[n.id].description,
          onSelect: () => {
            give(n.id, d);
            setPanelOpen(false);
            setFlash(n.id);
          },
        };
      });
  };

  const flashNode = !drag && flash && nodes.find((n) => n.id === flash);
  const flashRing = flashNode
    ? [
        {
          id: `flash-${flashNode.id}`,
          x: flashNode.x,
          y: flashNode.y,
          content: (
            <div
              data-plan-flash
              aria-hidden
              className="pointer-events-none rounded-[5px] outline-2 outline-offset-2 outline-accent outline-solid"
              style={{
                width: 181.5 * layout.scale,
                height: cardHeight(flashNode, layout.scale),
              }}
            />
          ),
        },
      ]
    : undefined;

  const dropZones = drag
    ? layout.nodes.map((n) => ({
        id: `drop-${n.id}`,
        x: n.x,
        y: n.y,
        content: (
          <div
            aria-label={`Give ${drag.item.name} to ${n.name}`}
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              if (over !== n.id) setOver(n.id);
            }}
            onDragLeave={() => setOver((o) => (o === n.id ? null : o))}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              give(n.id, drag);
              setDrag(null);
              setOver(null);
            }}
            className={clsx(
              'rounded-[5px] outline-dashed outline-offset-2',
              over === n.id
                ? 'bg-[rgba(36,87,214,0.08)] outline-2 outline-accent'
                : 'outline-1 outline-accent-line',
            )}
            style={{
              width: 181.5 * layout.scale,
              height: cardHeight(
                nodes.find((x) => x.id === n.id)!,
                layout.scale,
              ),
            }}
          />
        ),
      }))
    : undefined;

  return (
    <AppShell
      sidebar="none"
      aside={
        panelOpen && (
          <PlanSandboxPanel
            sections={sections.map((s) =>
              s.id === 'permissions'
                ? { ...s, content: <PermissionsSettings /> }
                : s,
            )}
            sectionsKey={imports}
            onTabChange={(t) =>
              t === 'chat' &&
              navigate(screenPath(withCommunity ? '2.5' : '2.3'))
            }
            onImport={importFile}
            onClose={() => setPanelOpen(false)}
            onRowDragStart={(item, section) =>
              ['assets', 'skills', 'tools'].includes(section.id)
                ? setDrag({ item, section: section.id as Section })
                : undefined
            }
            onRowDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            rowMenu={rowMenu}
          />
        )
      }
    >
      <PlanTopBar
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((o) => !o)}
      />
      <PlanCanvas
        layout={layout}
        nodes={nodes}
        outputs={outputs}
        outputsKey={id}
        zoomLabelBase={83}
        onNodeClick={() => navigate(screenPath('2.4'))}
        overlays={dropZones ?? flashRing}
        focus={{ x: 330, y: 300 }}
      />
    </AppShell>
  );
}

type Preset = 'careful' | 'balanced' | 'hands-off' | 'custom';
type Check = 'every' | 'unsure' | 'go';

const PRESETS: { value: Preset; label: string; check?: Check; w: string }[] = [
  { value: 'careful', label: 'Careful', check: 'every', w: 'w-[62px]' },
  { value: 'balanced', label: 'Balanced', check: 'unsure', w: 'w-[73px]' },
  { value: 'hands-off', label: 'Hands-off', check: 'go', w: 'w-[78px]' },
  { value: 'custom', label: 'Custom', w: 'w-[65px]' },
];
const CHECKS: { value: Check; label: string }[] = [
  { value: 'every', label: 'Before every choice' },
  { value: 'unsure', label: "Only when they're unsure" },
  { value: 'go', label: 'Just go' },
];

const muted = 'text-[12px] leading-[18px] tracking-[-0.08px] text-muted';

// 2.7's open Permissions section (Sandbox, 2362:24400): 20px in, 10px below the toggle. Preset chips; "When should
// your team check with you?" radios (Recommended on the Balanced choice); the rules every preset keeps; a note on
// where the preset comes from and "Save as a new preset". Picking a check that isn't the preset's makes it Custom.
function PermissionsSettings() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>('balanced');
  const [check, setCheck] = useState<Check>('unsure');
  const presetLabel = PRESETS.find((p) => p.value === preset)!.label;

  return (
    <div className="flex w-full flex-col items-start pt-2.5 pl-5">
      <p className={`${muted} whitespace-nowrap`}>Start from a saved preset</p>
      <div className="flex min-h-9 w-full flex-wrap items-start gap-1.5 pt-2">
        {PRESETS.map((p) => (
          <ChoiceChip
            key={p.value}
            selected={p.value === preset}
            className={p.w}
            onClick={() => {
              setPreset(p.value);
              if (p.check) setCheck(p.check);
            }}
          >
            {p.label}
          </ChoiceChip>
        ))}
      </div>
      <p className={`${muted} h-[34px] pt-4 whitespace-nowrap`}>
        When should your team check with you?
      </p>
      <div role="radiogroup" className="flex w-full flex-col pt-1">
        {CHECKS.map((c) => {
          const on = c.value === check;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setCheck(c.value);
                // A check the preset doesn't use makes this workflow Custom.
                setPreset((p) =>
                  PRESETS.find((x) => x.value === p)?.check === c.value
                    ? p
                    : 'custom',
                );
              }}
              className="flex h-9 w-full items-center gap-2.5 text-left"
            >
              <Radio on={on} />
              <span
                className={clsx(
                  'text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink',
                  on && 'font-medium',
                )}
              >
                {c.label}
              </span>
              {c.value === 'unsure' && <Badge tone="subtle">Recommended</Badge>}
            </button>
          );
        })}
      </div>
      <div className="flex w-full flex-col gap-2 pt-3 text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap">
        <div className="flex w-full items-start justify-between">
          <p className="text-muted">Posting or spending</p>
          <p className="flex items-center gap-1 self-stretch font-medium text-ink">
            <Icon src={lockDark} size={9.9} />
            Always waits for you
          </p>
        </div>
        <div className="flex w-full items-start justify-between">
          <p className="text-muted">Ad spend limit</p>
          <p className="font-medium text-ink">$50</p>
        </div>
        <div className="flex w-full items-start justify-between gap-2">
          <p className="text-muted">Checkpoint</p>
          <p className="truncate font-medium text-ink">
            You approve before step 4
          </p>
        </div>
      </div>
      <p className="min-h-[66px] w-full pt-3 text-[11px] leading-[17.875px] tracking-[-0.08px] text-muted">
        {preset === 'custom'
          ? 'Custom for this workflow. Save it as a preset to use it again. A helper can still override in its Details.'
          : `Using the ${presetLabel} preset from workspace settings. Change anything to make it Custom for this workflow. A helper can still override in its Details.`}
      </p>
      <div className="flex w-full items-start pt-2">
        <button
          type="button"
          onClick={() => navigate(screenPath('1.2'))}
          className="text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink hover:text-accent"
        >
          Save as a new preset
        </button>
      </div>
    </div>
  );
}
