import type { CookerPattern } from './kitchenRhythm';

/** Kitchen geometry shared by the scene and the tests (no Phaser here). */
export const KITCHEN_WIDTH = 2800;
export const KITCHEN_FLOOR_Y = 640;

/** Cookers along the counter. Patterns are learnable: listen, then go. */
export const KITCHEN_COOKERS: readonly { x: number; pattern: CookerPattern }[] = [
  { x: 520, pattern: { beats: [0, 2] } },
  { x: 900, pattern: { beats: [1] } },
  { x: 1280, pattern: { beats: [0, 1] } },
  { x: 1700, pattern: { beats: [2, 3] } },
  { x: 2080, pattern: { beats: [0, 2] } },
  { x: 2380, pattern: { beats: [1, 3] } },
];

/** Gaps in the floor (between counters). */
export const KITCHEN_GAPS: readonly { from: number; to: number }[] = [
  { from: 1080, to: 1180 },
  { from: 1880, to: 1990 },
];

export const KITCHEN_CHECKPOINTS = [150, 1450, 2250];
