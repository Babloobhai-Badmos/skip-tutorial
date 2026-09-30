import { describe, expect, it } from 'vitest';
import { createRng, hashString } from '../src/core/rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('accepts string seeds', () => {
    expect(createRng('pintu').next()).toEqual(createRng('pintu').next());
    expect(createRng('pintu').seed).toBe(hashString('pintu'));
  });

  it('next() stays in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() is inclusive and covers the whole range', () => {
    const r = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(() => r.int(5, 1)).toThrow(RangeError);
  });

  it('pick() and shuffle() are deterministic and non-destructive', () => {
    const items = ['cooker', 'billi', 'wifi', 'darwaza'] as const;
    expect(createRng(3).pick(items)).toBe(createRng(3).pick(items));
    const shuffled = createRng(3).shuffle(items);
    expect(shuffled).toEqual(createRng(3).shuffle(items));
    expect([...shuffled].sort()).toEqual([...items].sort());
    expect(items).toEqual(['cooker', 'billi', 'wifi', 'darwaza']);
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });

  it('fork() gives stable, independent streams', () => {
    const f1 = createRng(10).fork('cid');
    const f2 = createRng(10).fork('cid');
    const other = createRng(10).fork('truth');
    expect(f1.next()).toBe(f2.next());
    expect(createRng(10).fork('cid').next()).not.toBe(other.next());
  });
});
