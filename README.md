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
- `src/scenes` — Phaser scenes. Gameplay scenes extend `GameplayScene` so pause is always available.
- `src/ui` — menu (keyboard + mouse), theme, effects.
- `src/content/*.json` — every player-facing string.

## Dev helpers

In dev builds the console exposes `__game` (Phaser game) and `__store` (the GameStore).
Reset progress with `__store.reset()` (keeps safety settings) or `localStorage.clear()`.

## Milestones

- [x] M1 — Skeleton: boot, content notice, title, settings, pause, GameState, event bus, scene flow.
- [ ] M2 — Tutorial comedy
- [ ] M3 — Death system + HorrorDirector
- [ ] M4 — CID engine
- [ ] M5 — Levels
- [ ] M6 — Act 3
- [ ] M7 — Endgame
- [ ] M8 — Async death tips server
- [ ] M9 — Polish
