import Phaser from 'phaser';
import ui from '../content/ui.json';
import { caseTitle } from '../cid/caseFiles';
import { getStore } from '../core/gameState';
import type { CaseFile } from '../core/stateSchema';
import { Menu, type MenuItem } from '../ui/menu';
import { SubtitleBar } from '../ui/subtitleBar';
import { COLORS, GAME_WIDTH, TEXT } from '../ui/theme';
import { goTo } from './navigate';

const c = ui.caseFiles;
const SHOWN = 10;

const date = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

/** Numbered case log. Selecting a case plays its one-line recap. */
export class CaseFiles extends Phaser.Scene {
  constructor() {
    super('CaseFiles');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0d1a2b);
    this.add.text(GAME_WIDTH / 2, 50, c.heading, TEXT.heading).setOrigin(0.5);
    const subtitles = new SubtitleBar(this);
    const cases = [...getStore().state.caseFiles].sort((a, b) => b.number - a.number);
    const shown = cases.slice(0, SHOWN);

    const item = (f: CaseFile): MenuItem => ({
      label: () => `${caseTitle(f)}   ·   ${date(f.date)}`,
      onSelect: () => subtitles.say('', f.recap, { holdMs: 3000 }),
    });
    const items: MenuItem[] = shown.length
      ? shown.map(item)
      : [{ label: () => c.empty, heading: true }];
    if (cases.length > SHOWN) {
      items.push({
        label: () => c.more.replace('{n}', String(cases.length - SHOWN)),
        heading: true,
      });
    }
    items.push(
      { label: () => '', heading: true },
      { label: () => c.back, onSelect: () => goTo(this, 'Title') },
    );
    new Menu(this, items, {
      x: 200,
      y: 140,
      spacing: 36,
      align: 'left',
      style: { ...TEXT.menu, fontSize: '20px' },
    }).refresh();

    this.add.text(GAME_WIDTH / 2, 92, c.hint, { ...TEXT.small, color: COLORS.dim }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => goTo(this, 'Title'));
  }
}
