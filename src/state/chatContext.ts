import { useSyncExternalStore } from 'react';

import type { AgentName } from '@/components/agents/characters';
import type { NodeKindName } from '@/components/map/NodeKind';

import type { Workflow } from './types';

// What the open chat composer will send along: map blocks you clicked while the chat is open, and files, links or
// skills from its + menu. UI state shared between the map and the composer (not workflow data), so it lives here
// instead of the store; the composer clears it when it sends.
export type ChatChip = {
  key: string;
  label: string;
  /** A helper (clicked on the map): the reply comes from it. */
  helper?: string;
  /** The pill's icon: the helper's character, else the block's kind tile, else an attach-menu icon. */
  agent?: AgentName;
  kind?: NodeKindName;
  attach?: 'upload' | 'link' | 'skill';
};

let chips: ChatChip[] = [];
const listeners = new Set<() => void>();
const set = (next: ChatChip[]) => {
  chips = next;
  listeners.forEach((l) => l());
};

export const chatContext = {
  add: (chip: ChatChip) => {
    if (!chips.some((c) => c.key === chip.key)) set([...chips, chip]);
  },
  toggle: (chip: ChatChip) =>
    chips.some((c) => c.key === chip.key)
      ? set(chips.filter((c) => c.key !== chip.key))
      : set([...chips, chip]),
  remove: (key: string) => set(chips.filter((c) => c.key !== key)),
  clear: () => set([]),
};

export function useChatChips() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => chips
  );
}

// ---- @ mentions ------------------------------------------------------------------------------------------------

export type Mentionable = {
  id: string;
  name: string;
  agent?: AgentName;
  description: string;
};

/** The helpers you can @ in the chat: everyone on the team, in map order. */
export function mentionables(wf: Workflow): Mentionable[] {
  return wf.helperOrder
    .filter((id) => wf.helpers[id] && !wf.removed.includes(id))
    .map((id) => {
      const h = wf.helpers[id];
      return {
        id,
        name: h.name,
        agent: h.agent,
        description: h.description,
      };
    });
}

/**
 * When a message @mentions a helper (or carries a helper chip), that helper answers instead of Pathfinder.
 * Returns the first one addressed and its reply, or null.
 */
export function helperReply(
  wf: Workflow,
  text: string,
  chipHelpers: string[] = []
): { helper: Mentionable; text: string } | null {
  const team = mentionables(wf);
  const lower = text.toLowerCase();
  const helper =
    team.find((h) => lower.includes(`@${h.name.toLowerCase()}`)) ??
    team.find((h) => chipHelpers.includes(h.id));
  if (!helper) return null;
  const job = helper.description.replace(/\.$/, '').toLowerCase();
  const intro = `${helper.name} here, I ${job.replace(/^(\w+)s\b/, '$1')}.`;
  return {
    helper,
    text: text.includes('?')
      ? `${intro} Short answer: I’m going off your brief and what the step before me passed along. Want me to change how I do it?`
      : `${intro} Got it, I’ll do that for my part.`,
  };
}
