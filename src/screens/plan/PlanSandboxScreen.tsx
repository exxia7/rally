import clsx from 'clsx';
import { type DragEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import lockDark from '@/assets/icons/lock-dark.svg';
import type { OutputItem } from '@/components/panels/OutputsCard';
import {
  AdLimitValue,
  CheckLevelRadios,
  PresetChips,
  PresetNameForm,
} from '@/components/planning/PermissionControls';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import type { PlanNode } from '@/components/planning/PlanMap';
import { PlanSandboxPanel } from '@/components/planning/PlanSandboxPanel';
import { PlanTopBar } from '@/components/planning/PlanTopBar';
import type {
  SandboxItem,
  SandboxSection,
} from '@/components/run/SandboxPanel';
import { AppShell } from '@/components/shell/AppShell';
import { Icon } from '@/components/ui/Icon';
import type { MenuItemData } from '@/components/ui/Menu';
import { useGo } from '@/state/nav';
import { CUSTOM, withPermissionRows } from '@/state/permissions';
import { estimate, planLayout } from '@/state/planView';
import { dispatch, useWorkflow } from '@/state/store';
import { useWorkflowPermissions } from '@/state/usePermissions';

import { AI_COACH_TEAM, type Helper, helperCard } from './aiCoachPlan';
import { COMMUNITY } from './communityPlan';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.6', '2.7'];

// Figma 2.6 "Sandbox · drag a resource" (2362:24285) and 2.7 "Permissions" (2362:24400): the workflow's planning map,
// smaller, beside the Sandbox tab. Everything is the store's workflow: the team (with Community once the chat added
// it), what each helper has, the launch facts, the estimate and the permissions. 2.6 opens Tools with the helper that
// has no tools yet in focus ("Tools · None yet"); drag any Asset, Skill or Tool row onto a helper card (or click a
// row for "Add to <helper>") and the helper gains it. 2.7 opens Permissions: preset chips, when the team checks with
// you, the rules every preset keeps and the ad limit, the same setting 2.8, 2.4e and the drawer show. A card opens
// that helper's drawer; Chat goes back to the map's chat.

type Section = 'assets' | 'skills' | 'tools';
type Drag = { item: SandboxItem; section: Section };

const ROW_FOR: Record<Section, 'files' | 'skills' | 'tools'> = {
  assets: 'files',
  skills: 'skills',
  tools: 'tools',
};
const ROW_LABEL = { files: 'Files', skills: 'Skills', tools: 'Tools' };

// The Sandbox's resources as Figma lists them; who uses each comes from the team (see `withUsers`).
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

const SEED: Record<string, Helper> = { ...AI_COACH_TEAM, community: COMMUNITY };

const BASE_TOKENS = Object.values(AI_COACH_TEAM).reduce(
  (sum, h) => sum + h.tokensK,
  0
);

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

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

export default function PlanSandboxScreen() {
  const go = useGo();
  const { id = '2.6' } = useParams();
  const wf = useWorkflow();
  const team = wf.helpers;
  const live = (h: string) => !!team[h] && !wf.removed.includes(h);
  const layout = planLayout(wf, 'compact');

  // Helpers that just got something here, and the row that changed (highlighted on their card).
  const [changed, setChanged] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  // The Sandbox is this frame's point, so it starts open at every size (a half-height sheet on phones).
  const [panelOpen, setPanelOpen] = useState(true);
  const [imports, setImports] = useState<string[]>([]);
  // The "You approve" gate opens the Sandbox on Permissions (the rule that holds Publisher until you say yes).
  const [gatePermissions, setGatePermissions] = useState(false);
  // The card that just got something from the "Add to…" menu: ringed and scrolled into view for a moment.
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    document.querySelector('[data-plan-flash]')?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'smooth',
    });
    const t = window.setTimeout(() => setFlash(null), 2500);
    return () => window.clearTimeout(t);
  }, [flash]);

  // In focus: a helper still waiting for a tool (2.6's new Community). Everyone else fades, unless just changed.
  const focus = layout.nodes.find(
    (n) => team[n.id]?.tools && team[n.id].tools!.length === 0
  )?.id;
  const nodes: PlanNode[] = layout.nodes.map((n) => {
    const h = team[n.id];
    const base = h
      ? { ...n, ...card(withPermissionRows(wf, n.id, h), changed[n.id]) }
      : n;
    if (n.id === focus || changed[n.id]) return base;
    return { ...base, state: 'dimmed' };
  });

  const give = (helper: string, d: Drag) => {
    const h = team[helper];
    if (!h) return;
    const key = ROW_FOR[d.section];
    const list = h[key] ?? [];
    if (list.includes(d.item.name)) return;
    dispatch({
      type: 'helper/patch',
      id: helper,
      patch: {
        [key]: [...list, d.item.name],
        state: h.state === 'new' ? 'new' : 'updated',
      },
    });
    setChanged((c) => ({ ...c, [helper]: ROW_LABEL[key] }));
  };

  // Who uses each row: Figma's text, plus every helper you've given it to since.
  const sections = useMemo(() => {
    const est = estimate(wf)
      .replace(/^About /, '')
      .split(' · ');
    const helpers = wf.helperOrder.filter(live);
    const tokens = helpers.reduce((sum, h) => sum + team[h].tokensK, 0);
    const facts = wf.resources.facts;
    return SECTIONS.map((sec) => {
      if (sec.id in ROW_FOR) {
        const key = ROW_FOR[sec.id as Section];
        const items = [
          ...imports.map((name) => ({ name, source: 'Not used yet' })),
          ...sec.items,
        ];
        return {
          ...sec,
          items: (sec.id === 'assets' ? items : sec.items).map((i) => {
            const users = helpers
              // Given here (the plan's own setup is already in Figma's text).
              .filter(
                (h) =>
                  (team[h][key] ?? []).includes(i.name) &&
                  !(SEED[h]?.[key] ?? []).includes(i.name)
              )
              .map((h) => team[h].name)
              .filter((name) => !i.source.includes(name));
            if (!users.length) return i;
            return {
              ...i,
              source: /^(Built in|Connected|Not used yet)$/.test(i.source)
                ? users.join(', ')
                : `${i.source}, ${users.join(', ')}`,
            };
          }),
        };
      }
      if (wf.asDrawn) return sec;
      if (sec.id === 'facts')
        return {
          ...sec,
          items: [
            { name: `Launch on ${facts.date}`, source: 'From your chat' },
            {
              name: `${facts.signups} waitlist signups`,
              source: 'From your chat',
            },
            { name: facts.price, source: 'From your chat' },
          ],
        };
      if (sec.id === 'estimate')
        return {
          ...sec,
          items: [
            { name: `About ${est[0]}`, source: 'Run time' },
            {
              name: `~${Math.round((38 * tokens) / BASE_TOKENS)}k tokens`,
              source: `${helpers.length} helpers`,
            },
            { name: est[1], source: 'AI cost' },
          ],
        };
      return sec;
    }).map((sec) => ({
      ...sec,
      open:
        sec.id === (id === '2.6' ? 'tools' : 'permissions') ||
        (sec.id === 'permissions' && gatePermissions) ||
        (sec.id === 'assets' && imports.length > 0),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `live` reads wf
  }, [wf, imports, id, gatePermissions]);

  const importFile = () =>
    setImports((all) => [`Upload ${all.length + 1}.pdf`, ...all]);

  const rowMenu = (
    item: SandboxItem,
    section: SandboxSection
  ): MenuItemData[] | undefined => {
    // Every row also has a click path: an "Add to…" menu (touch screens can't drag at all; on desktop a click
    // on a drag-only row used to do nothing).
    if (!(section.id in ROW_FOR)) return undefined;
    const d: Drag = { item, section: section.id as Section };
    const key = ROW_FOR[d.section];
    return layout.nodes
      .filter((n) => team[n.id])
      .map((n) => {
        const has = (team[n.id][key] ?? []).includes(item.name);
        return {
          key: n.id,
          label: `Add to ${team[n.id].name}`,
          description: has ? 'Already has it' : team[n.id].description,
          onSelect: () => {
            give(n.id, d);
            // The overlay/sheet hides the map under 1280px; the docked panel stays open beside it.
            if (!isDesktop()) setPanelOpen(false);
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
                : 'outline-1 outline-accent-line'
            )}
            style={{
              width: 181.5 * layout.scale,
              height: cardHeight(
                nodes.find((x) => x.id === n.id)!,
                layout.scale
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
            sections={sections.map((sec) =>
              sec.id === 'permissions'
                ? { ...sec, content: <PermissionsSettings /> }
                : sec
            )}
            sectionsKey={`${imports.length}-${gatePermissions}`}
            // Chat and Sandbox are two tabs on the same workflow: swap in place, no new history entry.
            onTabChange={(t) => t === 'chat' && go('2.3', { replace: true })}
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
        outputs={wf.outputs as OutputItem[]}
        outputsKey={wf.outputs.map((o) => o.id).join()}
        onOutputsChange={(items) =>
          dispatch({
            type: 'outputs/set',
            outputs: items.map(
              (i) => wf.outputs.find((o) => o.id === i.id) ?? i
            ),
          })
        }
        zoomLabelBase={83}
        // That helper's drawer, on the map with the chat (2.4).
        onNodeClick={(n) =>
          team[n.id] && go('2.4', { state: { drawer: n.id } })
        }
        onGateClick={() => {
          setGatePermissions(true);
          setPanelOpen(true);
        }}
        overlays={dropZones ?? flashRing}
        focus={{ x: 330, y: 300 }}
      />
    </AppShell>
  );
}

const muted = 'text-[12px] leading-[18px] tracking-[-0.08px] text-muted';

// 2.7's open Permissions section (Sandbox, 2362:24400): 20px in, 10px below the toggle. Preset chips; "When should
// your team check with you?" radios (Recommended on the Balanced choice); the rules every preset keeps and the ad
// limit; a note on where the preset comes from and "Save as a new preset", which names it right here and adds it
// to the workspace's presets (1.2). All of it is the workflow's permissions in the store (useWorkflowPermissions).
function PermissionsSettings() {
  const p = useWorkflowPermissions();
  const [naming, setNaming] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-start pt-2.5 pl-5">
      <p className={`${muted} whitespace-nowrap`}>Start from a saved preset</p>
      <PresetChips
        className="min-h-9 pt-2"
        presets={p.presets}
        value={p.preset}
        onChange={(name) => {
          setSaved(null);
          p.setPreset(name);
        }}
      />
      <p className={`${muted} h-[34px] pt-4 whitespace-nowrap`}>
        When should your team check with you?
      </p>
      <CheckLevelRadios
        className="pt-1"
        value={p.check}
        onChange={(c) => {
          setSaved(null);
          p.setCheck(c);
        }}
      />
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
          <AdLimitValue
            className="font-medium text-ink"
            value={p.adLimit}
            onChange={p.setAdLimit}
          />
        </div>
        <div className="flex w-full items-start justify-between gap-2">
          <p className="text-muted">Checkpoint</p>
          <p className="truncate font-medium text-ink">
            You approve before step 4
          </p>
        </div>
      </div>
      <p className="min-h-[66px] w-full pt-3 text-[11px] leading-[17.875px] tracking-[-0.08px] text-muted">
        {saved
          ? `Saved as the ${saved} preset in workspace settings. Any workflow can use it now. A helper can still override in its Details.`
          : p.preset === CUSTOM
            ? 'Custom for this workflow. Save it as a preset to use it again. A helper can still override in its Details.'
            : `Using the ${p.preset} preset from workspace settings. Change anything to make it Custom for this workflow. A helper can still override in its Details.`}
      </p>
      {naming ? (
        <PresetNameForm
          className="pt-2 pr-5"
          onSave={(name) => {
            p.saveAsPreset(name);
            setNaming(false);
            setSaved(name);
          }}
          onCancel={() => setNaming(false)}
        />
      ) : (
        <div className="flex w-full items-start pt-2">
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink hover:text-accent"
          >
            Save as a new preset
          </button>
        </div>
      )}
    </div>
  );
}
