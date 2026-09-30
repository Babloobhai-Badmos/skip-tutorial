import { describe, expect, it } from 'vitest';
import pintuContent from '../src/content/pintu.json';
import {
  degrade,
  lineAvailable,
  losableIds,
  PINTU_MOODS,
  PintuBrain,
  selectLine,
  speechRate,
  type PintuLine,
} from '../src/characters/pintu';
import { createRng } from '../src/core/rng';

const lines = pintuContent.lines as PintuLine[];
const none = new Set<string>();

describe('pintu content', () => {
  it('every line is well-formed with a unique id', () => {
    const ids = new Set<string>();
    for (const l of lines) {
      expect(l.id).toMatch(/^[a-z0-9_]+$/);
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(PINTU_MOODS).toContain(l.mood);
      expect(l.text.length).toBeGreaterThan(0);
      expect(l.minLoss ?? 0).toBeLessThanOrEqual(l.maxLoss ?? Infinity);
    }
  });

  it('every context has something to say at every loss level, even with all losable lines gone', () => {
    const allLost = new Set(losableIds(lines));
    const contexts = new Set(lines.map((l) => l.context));
    for (const ctx of contexts) {
      for (let loss = 0; loss <= 12; loss++) {
        const ok = lines.some((l) => l.context === ctx && lineAvailable(l, loss, allLost));
        expect(ok, `${ctx} @ loss ${loss}`).toBe(true);
      }
    }
  });

  it('the loss sequence only names real, losable lines', async () => {
    const { LOSS_SEQUENCE } = await import('../src/core/pintuLoss');
    const losable = new Set(losableIds(lines));
    for (const step of LOSS_SEQUENCE) {
      if (step.item === 'voiceLine') expect(losable.has(step.detail ?? '')).toBe(true);
    }
  });
});

describe('selectLine', () => {
  it('prefers the requested mood and context', () => {
    const line = selectLine(lines, {
      context: 'greet',
      mood: 'scared',
      lossCount: 0,
      lostIds: none,
      rng: createRng(1),
    });
    expect(line?.context).toBe('greet');
    expect(line?.mood).toBe('scared');
  });

  it('falls back to any mood when the mood has no line', () => {
    const line = selectLine(lines, {
      context: 'certificate',
      mood: 'scared',
      lossCount: 0,
      lostIds: none,
      rng: createRng(1),
    });
    expect(line?.id).toBe('certificate');
  });

  it('never says a lost line', () => {
    for (let seed = 0; seed < 50; seed++) {
      const line = selectLine(lines, {
        context: 'jump',
        mood: 'anxious',
        lossCount: 3,
        lostIds: new Set(['jump_speed']),
        rng: createRng(seed),
      });
      expect(line?.id).not.toBe('jump_speed');
    }
  });

  it('respects loss ranges', () => {
    const early = selectLine(lines, {
      context: 'skip',
      mood: 'scared',
      lossCount: 0,
      lostIds: none,
      recent: ['skip_2'],
      rng: createRng(3),
    });
    // skip_3 needs minLoss 4, skip_2 was recent -> falls back within the mood pool
    expect(early?.id).toBe('skip_2');
  });

  it('avoids recent lines when possible and is deterministic', () => {
    const q = { context: 'idle', lossCount: 0, lostIds: none, recent: ['idle_1', 'idle_2'] };
    const a = selectLine(lines, { ...q, rng: createRng(9) });
    const b = selectLine(lines, { ...q, rng: createRng(9) });
    expect(a?.id).toBe(b?.id);
    expect(['idle_1', 'idle_2']).not.toContain(a?.id);
  });

  it('avoids scared lines before the Act 2 turn', () => {
    for (let seed = 0; seed < 40; seed++) {
      const line = selectLine(lines, {
        context: 'idle',
        avoidMoods: ['scared'],
        lossCount: 0,
        lostIds: none,
        rng: createRng(seed),
      });
      expect(line?.mood).not.toBe('scared');
    }
  });

  it('returns null when nothing fits (caller shows silence)', () => {
    expect(
      selectLine(lines, { context: 'nope', lossCount: 0, lostIds: none, rng: createRng(1) }),
    ).toBeNull();
  });
});

describe('degrade', () => {
  const text = 'Itni speed se kaun kood-ta hai bhai?!';
  it('leaves early lines alone', () => {
    expect(degrade(text, 0)).toBe(text);
    expect(degrade(text, 1)).toBe(text);
  });
  it('drops words, then slows, then breathes', () => {
    expect(degrade(text, 2)).toBe('Itni speed se kaun kood-ta hai...');
    expect(degrade(text, 4)).toBe('Itni... speed... se... kaun...');
    expect(degrade(text, 6)).toBe('Itni... speed...');
    expect(degrade(text, 8)).toBe('(saans)');
    expect(degrade(text, 20)).toBe('(saans)');
  });
  it('never stacks punctuation onto the ellipses', () => {
    const t = 'Aap aa gaye. Main gin raha tha. Kya gin raha tha, yaad nahi.';
    for (const n of [2, 3, 4, 5, 6, 7]) expect(degrade(t, n)).not.toMatch(/[.,!?]\.\.\./);
    expect(degrade(t, 4)).toBe('Aap... aa... gaye... Main... gin... raha... tha...');
  });

  it('gets monotonically shorter', () => {
    const lens = [0, 2, 4, 6, 8].map((n) => degrade(text, n).replace(/\./g, '').length);
    for (let i = 1; i < lens.length; i++) expect(lens[i]).toBeLessThan(lens[i - 1] as number);
  });
  it('speech slows with loss but never stops', () => {
    expect(speechRate(0)).toBe(1);
    expect(speechRate(4)).toBeLessThan(speechRate(1));
    expect(speechRate(100)).toBeGreaterThan(0);
  });
});

describe('PintuBrain', () => {
  it('maps moods to body states and returns to idle', () => {
    const brain = new PintuBrain();
    const scared = lines.find((l) => l.mood === 'scared') as PintuLine;
    const ms = brain.say(scared, 0);
    expect(brain.state).toBe('panicking');
    expect(brain.busy).toBe(true);
    brain.update(ms + 1);
    expect(brain.state).toBe('idle');
    const sorry = lines.find((l) => l.mood === 'apologetic') as PintuLine;
    brain.say(sorry, 0);
    expect(brain.state).toBe('apologizing');
  });
});
