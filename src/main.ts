import Phaser from 'phaser';
import { getAudio, sfx } from './audio/engine';
import { getStore } from './core/gameState';
import { Boot } from './scenes/Boot';
import { CaseFiles } from './scenes/CaseFiles';
import { ContentNotice } from './scenes/ContentNotice';
import { Death } from './scenes/Death';
import { Level1Hall } from './scenes/Level1Hall';
import { Level2Kitchen } from './scenes/Level2Kitchen';
import { Level3Wedding } from './scenes/Level3Wedding';
import { Loading } from './scenes/Loading';
import { Pause } from './scenes/Pause';
import { Placeholder } from './scenes/Placeholder';
import { Settings } from './scenes/Settings';
import { Title } from './scenes/Title';
import { TutorialScene } from './scenes/TutorialScene';
import { GAME_HEIGHT, GAME_WIDTH, COLORS } from './ui/theme';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1200 }, debug: false } },
  // Overlays (Pause, Settings) are listed last so they render on top.
  scene: [
    Boot,
    ContentNotice,
    Title,
    Loading,
    TutorialScene,
    Level1Hall,
    Level2Kitchen,
    Level3Wedding,
    Placeholder,
    CaseFiles,
    Death,
    Settings,
    Pause,
  ],
});

// Play-time feeds the HorrorDirector later. Phaser stops stepping when the tab is hidden.
game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => {
  getStore().addPlaytime(Math.min(delta, 250));
});

const flush = () => getStore().save();
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

if (import.meta.env.DEV) {
  // Handy in the console while testing milestones.
  Object.assign(window, { __game: game, __store: getStore(), __sfx: sfx, __audio: getAudio });
}
