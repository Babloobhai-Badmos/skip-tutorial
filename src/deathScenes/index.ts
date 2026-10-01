import { d01 } from './d01_kyaSeKya';
import { d02 } from './d02_rasode';
import { d03 } from './d03_buffet';
import { d04 } from './d04_groupChat';
import { d05 } from './d05_phoneAFriend';
import { d06 } from './d06_laughTrack';
import { d07 } from './d07_blueTicks';
import { d08 } from './d08_darwazaTodo';
import { d09 } from './d09_gadbad';
import { d10 } from './d10_postmortem';
import { d11 } from './d11_freddy';
import { d12 } from './d12_landline';
import type { DeathScene } from './types';

/** Registry order = priority for cause-specific matches. */
export const DEATH_SCENES: readonly DeathScene[] = [
  d01,
  d02,
  d03,
  d04,
  d05,
  d06,
  d07,
  d08,
  d09,
  d10,
  d11,
  d12,
];
