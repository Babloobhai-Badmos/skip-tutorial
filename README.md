# Skip Tutorial — Desi Death Chodu CID Edition

A browser horror-comedy platformer. Vite + TypeScript + Phaser 3.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests (pure logic, no browser)
npm run lint       # ESLint
npm run build      # typecheck + production build into dist/
```

## Layout

- `src/core` — `gameState` (versioned, persisted store), `saveMigration`, `events` (typed bus),
  `sceneFlow` (allowed scene transitions), `rng` (seeded), `horrorDirector` (only writer of `horrorLevel`).
- `src/settings/accessibility.ts` — safety settings (flash→fade, jump-scare cap, SFX mute categories).
- `src/characters` — Pintu: dialogue engine (`pintu.ts`), body (`pintuView.ts`), glue (`pintuActor.ts`).
- `src/core/pintuLoss.ts` — what Pintu loses, in order; the tutorial room quietly gives voice lines back.
- `src/tutorial` — Confident Walking timer, safe-room timer (pure logic).
- `src/audio` — Web Audio engine, mixer (channels + category/voice mutes), synthesized sfx presets.
- `src/core/horrorDirector.ts` — the tone brain (levels 0–5); the only writer of `horrorLevel`.
- `src/core/deaths.ts` + `src/deathScenes` — death logging/routing and the `DeathScene` modules
  (laugh phase always, break phase when the HorrorDirector allows it).
- `src/scenes` — Phaser scenes. `Death` is an overlay on top of a paused level. Gameplay scenes extend `GameplayScene` so pause is always available.
- `src/ui` — menu (keyboard + mouse), theme, effects.
- `src/content/*.json` — every player-facing string.

## Controls

←/→ or A/D walk · ↑/W/Space jump · E/Enter open door · K skip · Esc/P pause.
Menus work with arrows + Enter or the mouse.

## Dev helpers

- `?fast=1` (dev only) runs the tutorial timers at 20x: Confident Walking takes 9s, the
  tutorial-room reward 3s.
- The console exposes `__game`, `__store`, `__sfx(name)` and `__audio()`.
- To see break phases quickly: die 4+ times in the hall (the pit is right there).
- Reset progress with `__store.reset()` (keeps safety settings) or `localStorage.clear()`.

## Milestones

- [x] M1 — Skeleton: boot, content notice, title, settings, pause, GameState, event bus, scene flow.
- [x] M2 — Tutorial comedy: Pintu dialogue + loss system, stations, certificate, tips, [SKIP], sfx
- [x] M3 — Death system + HorrorDirector: D01, D02, D07 (laugh + break), hall prototype
- [ ] M4 — CID engine
- [ ] M5 — Levels
- [ ] M6 — Act 3
- [ ] M7 — Endgame
- [ ] M8 — Async death tips server
- [ ] M9 — Polish
