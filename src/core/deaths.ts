import type { DeathScene } from '../deathScenes/types';
import type { GameStore } from './gameState';
import type { Rng } from './rng';
import type { DeathLogEntry, GameState } from './stateSchema';

export interface DeathInput {
  x: number;
  y: number;
  scene: string;
  cause: string;
}

/** Logs a death. Ids are sequential and never reused (twist #6 needs them). */
export function recordDeath(store: GameStore, input: DeathInput, now = Date.now()): DeathLogEntry {
  const entry: DeathLogEntry = {
    id: store.state.deathCount + 1,
    x: Math.round(input.x),
    y: Math.round(input.y),
    scene: input.scene,
    cause: input.cause,
    timestamp: now,
  };
  store.update(`death:${input.cause}`, (d) => {
    d.deathCount = entry.id;
    d.deathLog.push(entry);
  });
  return entry;
}

export function markBreakPlayed(store: GameStore, id: number): void {
  store.update('death:break', (d) => {
    const e = d.deathLog.find((x) => x.id === id);
    if (e) e.breakPlayed = true;
  });
}

/**
 * Which death plays: a scene that owns this cause wins; otherwise rotate
 * through unlocked general scenes (seeded), avoiding an immediate repeat.
 */
export function pickDeathScene(
  scenes: readonly DeathScene[],
  state: Readonly<GameState>,
  cause: string,
  rng: Rng,
  lastId?: string,
): DeathScene {
  const unlocked = scenes.filter((s) => s.unlockCondition(state));
  const specific = unlocked.find((s) => s.causes.includes(cause));
  if (specific) return specific;
  const general = unlocked.filter((s) => s.general);
  const fresh = general.filter((s) => s.id !== lastId);
  const pool = fresh.length > 0 ? fresh : general;
  if (pool.length === 0) {
    const fallback = scenes.find((s) => s.general);
    if (!fallback) throw new Error('No general death scene registered');
    return fallback;
  }
  return rng.pick(pool);
}

export function shouldRunBreak(scene: DeathScene, horrorLevel: number): boolean {
  return horrorLevel >= scene.horrorLevelRequired;
}

/** Deaths in one level whose break phase played: their bodies stay (D01). */
export function corpsesIn(state: Readonly<GameState>, sceneKey: string): DeathLogEntry[] {
  return state.deathLog.filter((d) => d.scene === sceneKey && d.breakPlayed);
}
