import type { SceneKey } from './sceneFlow';
import type { Settings } from '../settings/accessibility';

/**
 * Every event the game can emit, with its payload type.
 * Add new events here; emit/on are type-checked against this map.
 */
export interface EventMap {
  'state:changed': { reason: string };
  'state:reset': undefined;
  'settings:changed': { settings: Settings };
  'scene:enter': { key: SceneKey };
  'pause:opened': undefined;
  'pause:closed': undefined;
}

export type EventName = keyof EventMap;
type AnyHandler = (payload: never) => void;

export class EventBus<M extends object = EventMap> {
  private handlers = new Map<keyof M, Set<AnyHandler>>();

  on<K extends keyof M>(event: K, handler: (payload: M[K]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  once<K extends keyof M>(event: K, handler: (payload: M[K]) => void): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void {
    this.handlers.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends keyof M>(
    event: K,
    ...args: M[K] extends undefined ? [payload?: undefined] : [payload: M[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy so handlers can unsubscribe themselves while we iterate.
    for (const handler of [...set]) {
      (handler as (p: M[K] | undefined) => void)(args[0]);
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  listenerCount(event: keyof M): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

/** The shared game-wide bus. Tests should construct their own EventBus. */
export const events = new EventBus<EventMap>();
