import content from '../content/cid.json';
import type { Rng } from '../core/rng';
import type { DeathLogEntry, GameState } from '../core/stateSchema';
import { logicInvestigation } from './logicModule';
import { truthInvestigation } from './truthModule';
import type { Facts, Investigation, InvestigationInput } from './types';

export const TRUTH_LEVEL = 3;
export const UNASKED_LEVEL = 4;
const SPOT_RADIUS = 80;

/** Gathers the real history the TruthModule is allowed to be right about. */
export function factsFor(state: Readonly<GameState>, death: DeathLogEntry): Facts {
  return {
    x: death.x,
    spotDeaths: state.deathLog.filter(
      (d) => d.scene === death.scene && Math.abs(d.x - death.x) <= SPOT_RADIUS,
    ).length,
    deathCount: state.deathCount,
    calledPintu: state.flags.calledPintuCount,
    skips: state.flags.skipCount,
    doorsKicked: state.flags.doorsKicked,
    minutes: Math.floor(state.timePlayedMs / 60_000),
  };
}

/** The object whose x is nearest the death spot. */
export function nearestObject(objects: readonly { label: string; x: number }[], x: number): string {
  let best = objects[0];
  for (const o of objects) if (best && Math.abs(o.x - x) < Math.abs(best.x - x)) best = o;
  return best?.label ?? content.objects.floor;
}

/**
 * Logic (comedy) below level 3, Truth (horror) from level 3. At level 4
 * something confesses that nobody asked.
 */
export function buildInvestigation(input: InvestigationInput, rng: Rng): Investigation {
  const inv =
    input.horrorLevel >= TRUTH_LEVEL
      ? truthInvestigation(input, rng)
      : logicInvestigation(input, rng);
  if (input.horrorLevel >= UNASKED_LEVEL) {
    inv.lines.push({ speaker: 'unasked', kind: 'unasked', text: content.unasked });
  }
  return inv;
}
