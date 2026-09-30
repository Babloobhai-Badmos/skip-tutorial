import { d01 } from './d01_kyaSeKya';
import { d02 } from './d02_rasode';
import { d07 } from './d07_blueTicks';
import { d08 } from './d08_darwazaTodo';
import { d09 } from './d09_gadbad';
import { d10 } from './d10_postmortem';
import type { DeathScene } from './types';

/** Registry order = priority for cause-specific matches. */
export const DEATH_SCENES: readonly DeathScene[] = [d01, d02, d07, d08, d09, d10];
