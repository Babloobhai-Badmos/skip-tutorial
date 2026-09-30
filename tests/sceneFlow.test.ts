import { describe, expect, it } from 'vitest';
import {
  canTransition,
  GAMEPLAY_SCENES,
  isSceneKey,
  planTransition,
  SCENE_KEYS,
  TRANSITIONS,
} from '../src/core/sceneFlow';

describe('sceneFlow', () => {
  it('allows the boot -> notice -> title -> tutorial path', () => {
    expect(canTransition('Boot', 'ContentNotice')).toBe(true);
    expect(canTransition('ContentNotice', 'Title')).toBe(true);
    expect(canTransition('Title', 'TutorialScene')).toBe(true);
  });

  it('blocks skipping ahead', () => {
    expect(canTransition('Boot', 'Title')).toBe(false);
    expect(canTransition('Title', 'FinalReveal')).toBe(false);
    const plan = planTransition('TutorialScene', 'FinalReveal');
    expect(plan.ok).toBe(false);
  });

  it('every gameplay scene can quit to Title (pause menu Quit)', () => {
    for (const key of GAMEPLAY_SCENES) expect(canTransition(key, 'Title')).toBe(true);
  });

  it('every level can return to the tutorial', () => {
    for (const key of ['Level1Hall', 'Level2Kitchen', 'Level3Wedding', 'Act3Hallway'] as const) {
      expect(canTransition(key, 'TutorialScene')).toBe(true);
    }
  });

  it('routes unbuilt scenes to Placeholder but remembers the intent', () => {
    expect(planTransition('TutorialScene', 'Level1Hall')).toEqual({
      ok: true,
      target: 'Placeholder',
      intended: 'Level1Hall',
    });
    expect(planTransition('Title', 'TutorialScene')).toEqual({
      ok: true,
      target: 'TutorialScene',
      intended: 'TutorialScene',
    });
  });

  it('transition table only references real scenes', () => {
    for (const key of SCENE_KEYS) {
      for (const to of TRANSITIONS[key]) expect(isSceneKey(to)).toBe(true);
    }
    expect(isSceneKey('Narnia')).toBe(false);
  });
});
