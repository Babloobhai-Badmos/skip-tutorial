/**
 * Accessibility & safety settings (spec section 13).
 * Pure logic only - Phaser-side helpers live in src/ui/effects.ts.
 */

export const SFX_CATEGORIES = ['stings', 'phone', 'voices', 'audience', 'ambience', 'ui'] as const;
export type SfxCategory = (typeof SFX_CATEGORIES)[number];

export interface Settings {
  /** Opt-in only. Never recorded/stored/transmitted even when true. */
  micOptIn: boolean;
  /** Opt-in only. Local mirror only, never recorded/uploaded. */
  camOptIn: boolean;
  reduceFlashing: boolean;
  reduceJumpscares: boolean;
  /** Subtitles are always on: dark beats must be playable with sound off. */
  subtitles: true;
  mutedSfxCategories: SfxCategory[];
  /** 0..1 */
  masterVolume: number;
}

export function defaultSettings(): Settings {
  return {
    micOptIn: false,
    camOptIn: false,
    reduceFlashing: false,
    reduceJumpscares: false,
    subtitles: true,
    mutedSfxCategories: [],
    masterVolume: 0.8,
  };
}

const isSfxCategory = (v: unknown): v is SfxCategory =>
  typeof v === 'string' && (SFX_CATEGORIES as readonly string[]).includes(v);

/** Coerce anything (e.g. an old or hand-edited save) into valid Settings. */
export function normalizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const muted = Array.isArray(r.mutedSfxCategories)
    ? [...new Set(r.mutedSfxCategories.filter(isSfxCategory))]
    : d.mutedSfxCategories;
  const vol =
    typeof r.masterVolume === 'number' && Number.isFinite(r.masterVolume)
      ? Math.min(1, Math.max(0, r.masterVolume))
      : d.masterVolume;
  return {
    micOptIn: bool(r.micOptIn, d.micOptIn),
    camOptIn: bool(r.camOptIn, d.camOptIn),
    reduceFlashing: bool(r.reduceFlashing, d.reduceFlashing),
    reduceJumpscares: bool(r.reduceJumpscares, d.reduceJumpscares),
    subtitles: true,
    mutedSfxCategories: muted,
    masterVolume: vol,
  };
}

/** Every flash effect in the game goes through this: flashes become fades. */
export function flashStyle(settings: Settings): 'flash' | 'fade' {
  return settings.reduceFlashing ? 'fade' : 'flash';
}

/** Flashy stings get capped; dread beats (silence, text, UI) always play. */
export function allowsJumpscare(settings: Settings): boolean {
  return !settings.reduceJumpscares;
}

export function isSfxMuted(settings: Settings, category: SfxCategory): boolean {
  return settings.mutedSfxCategories.includes(category);
}

export function toggleSfxCategory(settings: Settings, category: SfxCategory): Settings {
  const muted = isSfxMuted(settings, category)
    ? settings.mutedSfxCategories.filter((c) => c !== category)
    : [...settings.mutedSfxCategories, category];
  return { ...settings, mutedSfxCategories: muted };
}
