import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { isSfxMuted, SFX_CATEGORIES, toggleSfxCategory } from '../settings/accessibility';
import type { MenuItem } from './menu';

const s = ui.settings;

/** The accessibility toggles, shared by the content notice and the Settings screen. */
export function settingsMenuItems(): MenuItem[] {
  const store = getStore();
  const onOff = (v: boolean) => (v ? s.on : s.off);
  return [
    {
      label: () => `${s.reduceFlashing}: ${onOff(store.state.settings.reduceFlashing)}`,
      onSelect: () =>
        store.update('settings:reduceFlashing', (d) => {
          d.settings.reduceFlashing = !d.settings.reduceFlashing;
        }),
    },
    {
      label: () => `${s.reduceJumpscares}: ${onOff(store.state.settings.reduceJumpscares)}`,
      onSelect: () =>
        store.update('settings:reduceJumpscares', (d) => {
          d.settings.reduceJumpscares = !d.settings.reduceJumpscares;
        }),
    },
    { label: () => s.subtitles, enabled: () => false },
    { label: () => s.muteHeading, heading: true },
    ...SFX_CATEGORIES.map((cat): MenuItem => ({
      label: () =>
        `   ${s.sfxCategories[cat]}: ${isSfxMuted(store.state.settings, cat) ? s.muted : s.audible}`,
      onSelect: () =>
        store.update(`settings:mute:${cat}`, (d) => {
          d.settings = toggleSfxCategory(d.settings, cat);
        }),
    })),
  ];
}
