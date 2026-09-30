import { events } from '../core/events';
import type { GameStore } from '../core/gameState';

/** "Kuch toh gadbad hai" - every time the ACP says it, the HUD counts. */
export function addGadbad(store: GameStore, amount = 1, reason = 'acp'): number {
  store.update(`gadbad:${reason}`, (d) => {
    d.gadbadCount += amount;
  });
  events.emit('gadbad:changed', { count: store.state.gadbadCount });
  return store.state.gadbadCount;
}
