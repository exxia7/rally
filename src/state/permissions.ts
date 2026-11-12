import type { Helper } from '@/screens/plan/aiCoachPlan';

import type { AppState, Workflow } from './types';

// One permission model (audit 2i), read and written by every place that shows it: workspace presets (1.2), the
// workflow's preset, check level and ad limit (2.7's Sandbox section = 2.8's Permissions card), a helper's own
// override (the drawer's "Checks with you" = 2.4e's "Before <helper> runs"), and 5.2's "Next time" rules (which
// set that helper's override). The run reads `needsYourOk` for the "Your OK" flags and the approvals.

/** When the team checks with you (a preset's or the workflow's). */
export type CheckLevel = 'every' | 'unsure' | 'go';
/** A helper's own rule: the team's, or one of 2.4e's three. */
export type HelperAsk = 'default' | 'ask-first' | 'spends-money' | 'just-go';

export type WorkspacePreset = {
  key: string;
  name: string;
  /** Derived from `check` and `adLimit` (presetRules) for presets you edit or add. */
  rules: string;
  check?: CheckLevel;
  adLimit?: number;
};

/** The three built-in presets' rules (1.2's copy). */
export const PRESET_RULES: Record<
  string,
  { check: CheckLevel; adLimit: number }
> = {
  careful: { check: 'every', adLimit: 0 },
  balanced: { check: 'unsure', adLimit: 0 },
  'hands-off': { check: 'go', adLimit: 50 },
};

export const presetCheck = (p: WorkspacePreset): CheckLevel =>
  p.check ?? PRESET_RULES[p.key]?.check ?? 'unsure';
export const presetAdLimit = (p: WorkspacePreset): number =>
  p.adLimit ?? PRESET_RULES[p.key]?.adLimit ?? 0;

/** "Ask when unsure · posting waits · $0 ads" (1.2's preset rows). */
export function presetRules(check: CheckLevel, adLimit: number) {
  const ask =
    check === 'every'
      ? 'Ask before every choice'
      : check === 'unsure'
        ? 'Ask when unsure'
        : 'Just go';
  return `${ask} · ${check === 'go' ? 'posting still waits' : 'posting waits'} · $${adLimit} ads`;
}

/** 2.8's "Check with you" value. */
export const CHECK_SHORT: Record<CheckLevel, string> = {
  every: 'Before every choice',
  unsure: 'Only when unsure',
  go: 'Just go',
};
/** 2.7's radio labels. */
export const CHECK_LONG: Record<CheckLevel, string> = {
  every: 'Before every choice',
  unsure: "Only when they're unsure",
  go: 'Just go',
};
/** 2.4e's "Team default: …" footer. */
export const CHECK_TEAM_DEFAULT: Record<CheckLevel, string> = {
  every: 'ask before every choice',
  unsure: 'ask when unsure',
  go: 'just go',
};

export const CUSTOM = 'Custom';

export function presetByName(s: AppState, name: string) {
  return s.workspace.presets.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  ) as WorkspacePreset | undefined;
}

/** The workflow's preset, check level and ad limit, with what the preset itself says (for "Changed here"). */
export function workflowPermissions(s: AppState, wf: Workflow) {
  const p = wf.permissions;
  const preset = presetByName(s, p.preset);
  const check = (p.checkLevel as CheckLevel) ?? 'unsure';
  return {
    preset: preset ? preset.name : CUSTOM,
    presetKey: preset?.key ?? 'custom',
    check,
    adLimit: p.adLimit,
    presetCheck: preset ? presetCheck(preset) : undefined,
    presetAdLimit: preset ? presetAdLimit(preset) : undefined,
    checkChanged: !preset || presetCheck(preset) !== check,
    adLimitChanged: !preset || presetAdLimit(preset) !== p.adLimit,
  };
}

// ---- A helper's own rule -------------------------------------------------------------------------------------

/** The drawer's stored "Checks with you" text → the rule. */
export function helperAsk(h: Pick<Helper, 'checks'> | undefined): HelperAsk {
  const c = h?.checks ?? '';
  if (c.startsWith('Always')) return 'ask-first';
  if (c.startsWith('Only when it spends')) return 'spends-money';
  if (c.startsWith('Never')) return 'just-go';
  return 'default';
}

/** The text a rule is stored and shown as (the default one names the team's current level). */
export function checksLabel(
  ask: HelperAsk,
  team: CheckLevel,
  current?: string
): string {
  switch (ask) {
    case 'default':
      return `Team default · ${team === 'every' ? 'before every choice' : team === 'go' ? 'just go' : 'when unsure'}`;
    case 'ask-first':
      return current?.startsWith('Always')
        ? current
        : 'Always · before every step';
    case 'spends-money':
      return 'Only when it spends money';
    case 'just-go':
      return 'Never · run on its own';
  }
}

/** The drawer's "Checks with you" menu, in order. */
export const HELPER_ASKS: HelperAsk[] = [
  'default',
  'ask-first',
  'spends-money',
  'just-go',
];

/** 2.4e's choice for a helper that posts: its own rule, or (team default) "Ask me first", since posting waits. */
export function pickerAsk(h: Helper | undefined) {
  const a = helperAsk(h);
  return a === 'default' ? 'ask-first' : a;
}

/** Whether a helper's posts wait for your OK ("Your OK" on its run card, an item in 5.1). */
export function needsYourOk(wf: Workflow, helper: string) {
  const a = helperAsk(wf.helpers[helper]);
  return a === 'default' || a === 'ask-first';
}

/** The rows 2.4e's choice writes on a poster's card (Publisher: Ads, Posts; Community: Posts). */
export function posterRows(
  helper: string,
  ask: Exclude<HelperAsk, 'default'>,
  adLimit: number
): Record<string, string> {
  const ads = `Up to $${adLimit}`;
  const posts =
    ask === 'ask-first'
      ? 'After your OK'
      : ask === 'spends-money'
        ? 'On schedule'
        : 'On its own';
  if (helper === 'publisher')
    return {
      Ads: ask === 'spends-money' ? 'After your OK' : ads,
      Posts: posts,
    };
  return { Posts: posts };
}

export const isPoster = (wf: Workflow, id: string) =>
  !!wf.helpers[id]?.extra?.some((r) => r.label === 'Posts');

/** A helper as the plan card draws it: poster rows follow its rule and the ad limit (highlighted when changed). */
export function withPermissionRows(
  wf: Pick<Workflow, 'permissions'>,
  id: string,
  h: Helper
): Helper {
  if (!h.extra?.some((r) => r.label === 'Posts')) return h;
  const rows = posterRows(id, pickerAsk(h), wf.permissions.adLimit);
  const was = posterRows(id, 'ask-first', wf.permissions.adLimit);
  return {
    ...h,
    extra: h.extra.map((r) =>
      rows[r.label] === undefined
        ? r
        : // Rows that differ from "Ask me first" show as just changed (2.4e).
          { label: r.label, value: rows[r.label], highlighted: rows[r.label] !== was[r.label] }
    ),
  };
}

// ---- Tools -----------------------------------------------------------------------------------------------------

/** Plan tool names → the workspace's connected tool ("Email" is Resend). */
const WORKSPACE_TOOL: Record<string, string> = {
  Email: 'Email (Resend)',
  'X scheduler': 'X',
};
export const workspaceToolName = (name: string) => WORKSPACE_TOOL[name] ?? name;

/** Whether a tool that needs connecting is connected in the workspace (built-in tools always are). */
export function toolConnected(s: AppState, name: string) {
  const t = s.workspace.tools.find((x) => x.name === workspaceToolName(name));
  return t ? t.connected : true;
}

/**
 * Why an output can't go out under your workspace's connections ("LinkedIn isn’t connected"), else undefined. 5.1
 * holds it back on launch (stored as won't post); 5.2 says why instead of counting it as one you skipped.
 */
export function blockedOutput(
  s: AppState,
  wf: Workflow,
  output: string
): string | undefined {
  if (wf.asDrawn) return undefined;
  if (output === 'li' && !toolConnected(s, 'LinkedIn'))
    return 'LinkedIn isn’t connected';
  return undefined;
}

/** The workspace tools a helper uses that aren't connected (LinkedIn on Publisher). */
export function missingTools(s: AppState, h: Helper | undefined) {
  return (h?.tools ?? []).filter((t) => !toolConnected(s, t));
}

/** "This $300 ad test is over your $50 ad limit" (5.1's blocked item). */
export const AD_TEST = 300;
export const overAdLimit = (wf: Workflow) => wf.permissions.adLimit < AD_TEST;
export const adLimitNote = (wf: Workflow) =>
  `This $${AD_TEST} ad test is over your $${wf.permissions.adLimit} ad limit.`;
