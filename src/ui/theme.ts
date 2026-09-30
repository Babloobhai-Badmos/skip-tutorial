import type Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  bg: 0x0b0b0f,
  panel: 0x16161d,
  panelEdge: 0x2a2a36,
  text: '#f2efe6',
  dim: '#8a8799',
  accent: '#ffcc33',
  accentHex: 0xffcc33,
  danger: '#ff5a4f',
  disabled: '#4d4b58',
} as const;

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const MONO = '"Courier New", ui-monospace, monospace';

type Style = Phaser.Types.GameObjects.Text.TextStyle;

export const TEXT = {
  title: { fontFamily: FONT, fontSize: '72px', color: COLORS.accent, fontStyle: 'bold' },
  heading: { fontFamily: FONT, fontSize: '40px', color: COLORS.text, fontStyle: 'bold' },
  body: { fontFamily: FONT, fontSize: '22px', color: COLORS.text, lineSpacing: 6 },
  small: { fontFamily: FONT, fontSize: '16px', color: COLORS.dim },
  menu: { fontFamily: FONT, fontSize: '24px', color: COLORS.text },
  mono: { fontFamily: MONO, fontSize: '18px', color: COLORS.dim },
} satisfies Record<string, Style>;
