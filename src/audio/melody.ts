/**
 * The ringtone-era menu jingle: an ORIGINAL 8-note melody.
 * It deliberately does not follow the famous phone ringtone (Tarrega's
 * "Gran Vals" excerpt) - see tests/audio.test.ts, which checks the intervals.
 * [midi note, length in eighth-notes]
 */
export const JINGLE: readonly (readonly [number, number])[] = [
  [69, 1], // A4
  [78, 1], // F#5
  [76, 2], // E5
  [74, 1], // D5
  [71, 1], // B4
  [74, 2], // D5
  [69, 1], // A4
  [74, 3], // D5 (held)
];

/** The well-known ringtone's opening, used ONLY to prove we don't copy it. */
export const FAMOUS_RINGTONE_REFERENCE: readonly number[] = [76, 74, 66, 68, 73, 71, 62, 64];

export function intervals(notes: readonly number[]): number[] {
  return notes.slice(1).map((n, i) => n - (notes[i] as number));
}

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
