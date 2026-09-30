import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/events';

interface TestEvents {
  ping: { n: number };
  bare: undefined;
}

describe('EventBus', () => {
  it('delivers typed payloads to subscribers', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.emit('ping', { n: 3 });
    expect(fn).toHaveBeenCalledWith({ n: 3 });
  });

  it('supports events without payloads', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.on('bare', fn);
    bus.emit('bare');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off() and the returned unsubscribe both work', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = bus.on('ping', a);
    bus.on('ping', b);
    unsubA();
    bus.off('ping', b);
    bus.emit('ping', { n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(bus.listenerCount('ping')).toBe(0);
  });

  it('once() fires exactly once', () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();
    bus.once('ping', fn);
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
  });

  it('handlers may unsubscribe during emit without skipping others', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];
    const off = bus.on('ping', () => {
      calls.push('first');
      off();
    });
    bus.on('ping', () => calls.push('second'));
    bus.emit('ping', { n: 0 });
    bus.emit('ping', { n: 0 });
    expect(calls).toEqual(['first', 'second', 'second']);
  });
});
