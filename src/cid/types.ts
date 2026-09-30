import type { DeathLogEntry } from '../core/stateSchema';

export const SQUAD = ['acp', 'daya', 'salunkhe', 'freddy'] as const;
export type SquadMember = (typeof SQUAD)[number];
export type Speaker = SquadMember | 'suspect' | 'unasked';

export type LineKind =
  | 'opening'
  | 'finding'
  | 'theory'
  | 'accuse'
  | 'how'
  | 'because'
  | 'demand'
  | 'confession'
  | 'unasked';

export interface InvLine {
  speaker: Speaker;
  kind: LineKind;
  text: string;
}

/** Real in-game history. Only the TruthModule is allowed to use it. */
export interface Facts {
  x: number;
  spotDeaths: number;
  deathCount: number;
  calledPintu: number;
  skips: number;
  doorsKicked: number;
  minutes: number;
}

export interface InvestigationInput {
  death: DeathLogEntry;
  /** Label of the inanimate object nearest the death (the comedy suspect). */
  nearestObject: string;
  caseNumber: number;
  horrorLevel: number;
  facts: Facts;
}

export interface Investigation {
  mode: 'logic' | 'truth';
  caseNumber: number;
  caseName: string;
  suspect: { label: string; isPlayer: boolean };
  lines: InvLine[];
  recap: string;
  /** Silence after "sach bol do" before the confession (always < 10s). */
  confessionPauseMs: number;
}
