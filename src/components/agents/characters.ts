import beaver from '@/assets/art/character-beaver.svg';
import agentCommunity from '@/assets/art/agent-community.svg';
import agentDesigner from '@/assets/art/agent-designer.svg';
import agentInsights from '@/assets/art/agent-insights.svg';
import agentPublisher from '@/assets/art/agent-publisher.svg';
import agentScout from '@/assets/art/agent-scout.svg';
import agentStrategist from '@/assets/art/agent-strategist.svg';
import agentWriter from '@/assets/art/agent-writer.svg';
import bird from '@/assets/art/character-bird.svg';
import bunny from '@/assets/art/character-bunny.svg';
import cat from '@/assets/art/character-cat.svg';
import chameleon from '@/assets/art/character-chameleon.svg';
import fish from '@/assets/art/character-fish.svg';
import flamingo from '@/assets/art/character-flamingo.svg';
import frog from '@/assets/art/character-frog.svg';
import octopus from '@/assets/art/character-octopus.svg';
import owl from '@/assets/art/character-owl.svg';
import penguin from '@/assets/art/character-penguin.svg';
import phoenix from '@/assets/art/character-phoenix.svg';
import snail from '@/assets/art/character-snail.svg';
import walrus from '@/assets/art/character-walrus.svg';

// Figma "Characters" (2362:28202): source artwork. `w`/`h` is the symbol frame; `art` is the exported
// artwork size when it doesn't fill the frame (the Owl group sits top-left inside a slightly bigger frame).
export type CharacterName =
  | 'owl'
  | 'walrus'
  | 'beaver'
  | 'flamingo'
  | 'snail'
  | 'chameleon'
  | 'fish'
  | 'phoenix'
  | 'bird'
  | 'penguin'
  | 'cat'
  | 'frog'
  | 'bunny'
  | 'octopus';

export type CharacterArt = {
  src: string;
  w: number;
  h: number;
  art?: { w: number; h: number };
};

export const CHARACTERS: Record<CharacterName, CharacterArt> = {
  owl: { src: owl, w: 124, h: 122, art: { w: 123.454, h: 121.131 } },
  walrus: { src: walrus, w: 127, h: 106 },
  beaver: { src: beaver, w: 127, h: 106 },
  flamingo: { src: flamingo, w: 126, h: 108 },
  snail: { src: snail, w: 141, h: 145 },
  chameleon: { src: chameleon, w: 126, h: 129 },
  fish: { src: fish, w: 124, h: 138 },
  phoenix: { src: phoenix, w: 125, h: 174 },
  bird: { src: bird, w: 134, h: 97 },
  penguin: { src: penguin, w: 118, h: 161 },
  cat: { src: cat, w: 129, h: 131 },
  frog: { src: frog, w: 140, h: 100 },
  bunny: { src: bunny, w: 109, h: 170 },
  octopus: { src: octopus, w: 132, h: 139 },
};

// Figma "Agent art / <Helper>" (2362:29003…29017): each helper nests one character.
export type AgentName =
  | 'Planner'
  | 'Scout'
  | 'Insights'
  | 'Strategist'
  | 'Writer'
  | 'Designer'
  | 'Community'
  | 'Publisher';

export const AGENT_CHARACTER: Record<AgentName, CharacterName> = {
  Planner: 'owl',
  Scout: 'flamingo',
  Insights: 'snail',
  Strategist: 'bunny',
  Writer: 'penguin',
  Designer: 'chameleon',
  Community: 'fish',
  Publisher: 'octopus',
};

export const AGENTS = Object.keys(AGENT_CHARACTER) as AgentName[];

// The artwork each "Agent art" component renders. Most recolour their character (e.g. the Writer's
// penguin is #183B75, not the source #31326B), so they are exported per helper; the Planner keeps the
// Owl's own colours. Sizes are the exported (contain-fitted, 30px) artwork.
export const AGENT_ART: Record<AgentName, CharacterArt> = {
  Planner: CHARACTERS.owl,
  Scout: { src: agentScout, w: 30, h: 25.7143 },
  Insights: { src: agentInsights, w: 29.1729, h: 30 },
  Strategist: { src: agentStrategist, w: 19.2353, h: 30 },
  Writer: { src: agentWriter, w: 21.9876, h: 30 },
  Designer: { src: agentDesigner, w: 29.3023, h: 30 },
  Community: { src: agentCommunity, w: 26.9565, h: 30 },
  Publisher: { src: agentPublisher, w: 28.4893, h: 30 },
};
