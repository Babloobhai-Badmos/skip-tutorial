import content from '../content/cid.json';
import type { Rng } from '../core/rng';
import { capitalize, fill, line, pick } from './format';
import type { Investigation, InvestigationInput } from './types';

const L = content.logic;

/**
 * The comedy engine: blames the nearest inanimate object, deadpan, with total
 * confidence. Deterministic for a given seed. It never looks at real history.
 */
export function logicInvestigation(input: InvestigationInput, rng: Rng): Investigation {
  const object = input.nearestObject;
  const vars = { object, Object: capitalize(object) };
  const lines = [
    line(pick(rng, L.opening), 'opening', 'acp', vars),
    line(pick(rng, L.salunkhe), 'finding', 'salunkhe', vars),
    line(pick(rng, L.freddy), 'theory', 'freddy', vars),
    line(L.accuse, 'accuse', 'acp', vars),
    line(L.how, 'how', 'daya', vars),
    line(pick(rng, L.because), 'because', 'acp', vars),
    line(L.demand, 'demand', 'acp', vars),
    line(pick(rng, L.confessions), 'confession', 'suspect', vars),
  ];
  return {
    mode: 'logic',
    caseNumber: input.caseNumber,
    caseName: fill(pick(rng, L.caseNames), vars),
    suspect: { label: object, isPlayer: false },
    lines,
    recap: fill(L.recap, vars),
    confessionPauseMs: rng.int(1500, 4000),
  };
}
