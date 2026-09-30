import content from '../content/cid.json';
import type { Rng } from '../core/rng';
import type { InvLine, LineKind, Speaker, SquadMember } from './types';

const NAMES: Record<SquadMember, string> = {
  acp: content.squad.acp.name,
  daya: content.squad.daya.name,
  salunkhe: content.squad.salunkhe.name,
  freddy: content.squad.freddy.name,
};

export const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Replaces {key} placeholders; unknown keys are left visible (caught by tests). */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

const PREFIX = /^\{(acp|daya|salunkhe|freddy)\}:\s*/;

/** Templates may start with "{acp}: " to name their speaker. */
export function line(
  template: string,
  kind: LineKind,
  fallback: Speaker,
  vars: Record<string, string | number>,
): InvLine {
  const m = PREFIX.exec(template);
  const speaker = (m?.[1] as SquadMember | undefined) ?? fallback;
  return { speaker, kind, text: fill(template.replace(PREFIX, ''), { ...NAMES, ...vars }) };
}

export function pick(rng: Rng, list: readonly string[]): string {
  return rng.pick(list);
}

export { NAMES as SQUAD_NAMES };
