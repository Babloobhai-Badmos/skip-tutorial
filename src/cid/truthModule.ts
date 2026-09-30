import content from '../content/cid.json';
import type { Rng } from '../core/rng';
import { fill, line, pick } from './format';
import type { Investigation, InvestigationInput } from './types';

const T = content.truth;
const COUNTED = ['spotDeaths', 'calledPintu', 'skips', 'doorsKicked', 'minutes'] as const;

/**
 * Only cite facts that are true AND non-trivial: "0 baar skip dabaya" is
 * accurate but not unsettling. Falls back to the full list if nothing fits.
 */
function usable(list: readonly string[], vars: Record<string, string | number>): string[] {
  const ok = list.filter((t) => COUNTED.every((k) => !t.includes(`{${k}}`) || Number(vars[k]) > 0));
  return ok.length > 0 ? ok : [...list];
}

/**
 * The horror engine (horrorLevel >= 3). Same voices, same stings, same
 * structure and formatting as the LogicModule - only the content changes, and
 * the content is accurate: where you died, how often, what you did for fun.
 */
export function truthInvestigation(input: InvestigationInput, rng: Rng): Investigation {
  const f = input.facts;
  const vars = {
    object: T.object,
    Object: T.Object,
    x: f.x,
    spotDeaths: f.spotDeaths,
    deathCount: f.deathCount,
    calledPintu: f.calledPintu,
    skips: f.skips,
    doorsKicked: f.doorsKicked,
    minutes: f.minutes,
  };
  const lines = [
    line(pick(rng, T.opening), 'opening', 'acp', vars),
    line(pick(rng, usable(T.salunkhe, vars)), 'finding', 'salunkhe', vars),
    line(pick(rng, usable(T.freddy, vars)), 'theory', 'freddy', vars),
    line(T.accuse, 'accuse', 'acp', vars),
    line(T.how, 'how', 'daya', vars),
    line(pick(rng, T.because), 'because', 'acp', vars),
    line(T.demand, 'demand', 'acp', vars),
    line(pick(rng, usable(T.confessions, vars)), 'confession', 'suspect', vars),
  ];
  return {
    mode: 'truth',
    caseNumber: input.caseNumber,
    caseName: fill(pick(rng, T.caseNames), vars),
    suspect: { label: T.object, isPlayer: true },
    lines,
    recap: fill(T.recap, vars),
    confessionPauseMs: rng.int(1500, 4000),
  };
}
