import type { GameStore } from '../core/gameState';
import type { CaseFile, GameState } from '../core/stateSchema';
import type { Investigation } from './types';

/** Case numbers count up from 1. (Case #0 is special - see M7.) */
export function nextCaseNumber(state: Readonly<GameState>): number {
  return state.caseFiles.reduce((max, c) => Math.max(max, c.number), 0) + 1;
}

export function caseTitle(c: Pick<CaseFile, 'number' | 'name'>): string {
  return `Case #${c.number}: ${c.name}`;
}

/** Saves the case and its confession(s). */
export function fileCase(store: GameStore, inv: Investigation, now = Date.now()): CaseFile {
  const file: CaseFile = {
    number: inv.caseNumber,
    name: inv.caseName,
    date: now,
    recap: inv.recap,
  };
  store.update(`case:${inv.caseNumber}`, (d) => {
    d.caseFiles.push(file);
    for (const l of inv.lines) {
      if (l.kind === 'confession' || l.kind === 'unasked') {
        d.confessions.push({
          caseNumber: inv.caseNumber,
          speaker: l.kind === 'unasked' ? '' : inv.suspect.label,
          text: l.text,
          timestamp: now,
        });
      }
    }
  });
  return file;
}
