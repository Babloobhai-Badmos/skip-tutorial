/**
 * Typed act/level progression. Pure logic (no Phaser) so it can be tested;
 * src/scenes/navigate.ts is the Phaser-side wrapper.
 */

export const SCENE_KEYS = [
  'Boot',
  'ContentNotice',
  'Title',
  'Settings',
  'Pause',
  'Placeholder',
  'TutorialScene',
  'Level1Hall',
  'Level2Kitchen',
  'Level3Wedding',
  'Act3Hallway',
  'CatAct',
  'FinalReveal',
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

/** Scenes where the player is "in the game": pause is always available here. */
export const GAMEPLAY_SCENES: ReadonlySet<SceneKey> = new Set<SceneKey>([
  'Placeholder',
  'TutorialScene',
  'Level1Hall',
  'Level2Kitchen',
  'Level3Wedding',
  'Act3Hallway',
  'CatAct',
  'FinalReveal',
]);

/**
 * Allowed transitions. Every gameplay scene can always quit to Title, and every
 * level can be sent back to the tutorial (twist #2: the tutorial is the dungeon).
 * Pause is an overlay (launched on top), not a transition.
 */
export const TRANSITIONS: Readonly<Record<SceneKey, readonly SceneKey[]>> = {
  Boot: ['ContentNotice'],
  ContentNotice: ['Title'],
  Title: ['TutorialScene', 'Settings', 'ContentNotice'],
  Settings: ['Title'],
  Pause: [],
  Placeholder: ['Title'],
  TutorialScene: ['Level1Hall', 'Title'],
  Level1Hall: ['Level2Kitchen', 'TutorialScene', 'Title'],
  Level2Kitchen: ['Level3Wedding', 'TutorialScene', 'Title'],
  Level3Wedding: ['Act3Hallway', 'TutorialScene', 'Title'],
  Act3Hallway: ['CatAct', 'TutorialScene', 'Title'],
  CatAct: ['FinalReveal', 'Title'],
  FinalReveal: ['Title'],
};

/** Scenes that exist in code. Anything else is routed to Placeholder. */
export const IMPLEMENTED_SCENES: ReadonlySet<SceneKey> = new Set<SceneKey>([
  'Boot',
  'ContentNotice',
  'Title',
  'Settings',
  'Pause',
  'Placeholder',
  'TutorialScene',
]);

export function isSceneKey(value: unknown): value is SceneKey {
  return typeof value === 'string' && (SCENE_KEYS as readonly string[]).includes(value);
}

export function canTransition(from: SceneKey, to: SceneKey): boolean {
  return TRANSITIONS[from].includes(to);
}

export type TransitionPlan =
  { ok: true; target: SceneKey; intended: SceneKey } | { ok: false; reason: string };

export function planTransition(from: SceneKey, to: SceneKey): TransitionPlan {
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Transition ${from} -> ${to} is not allowed` };
  }
  const target = IMPLEMENTED_SCENES.has(to) ? to : 'Placeholder';
  return { ok: true, target, intended: to };
}
