import {
  DEFAULT_PALETTE,
  PALETTES,
  resolveEffectiveThemeMode
} from '../../../src/core/theme';
import type { BuiltInPaletteName, ThemeModePreference } from '../../../src/core/types';

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';
const PALETTE_STORAGE_KEY = 'modern-charts-palette';

function isBuiltInPalette(value: unknown): value is BuiltInPaletteName {
  return typeof value === 'string' && Object.hasOwn(PALETTES, value);
}

function readStoredPalette(): BuiltInPaletteName {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (isBuiltInPalette(saved)) return saved;
  } catch {
    // Use the default when storage is unavailable.
  }
  return DEFAULT_PALETTE;
}

let currentPalette: BuiltInPaletteName = readStoredPalette();

/** The design-system palette used for new Studio chart configurations. */
export function getGlobalPalette(): BuiltInPaletteName {
  return currentPalette;
}

export function setGlobalPalette(palette: BuiltInPaletteName): BuiltInPaletteName {
  if (!isBuiltInPalette(palette)) return currentPalette;
  currentPalette = palette;
  try {
    if (palette === DEFAULT_PALETTE) localStorage.removeItem(PALETTE_STORAGE_KEY);
    else localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // Keep the current session usable when storage is unavailable.
  }
  return currentPalette;
}

export function subscribePaletteChanges(onPaletteChange: (palette: BuiltInPaletteName) => void): void {
  window.addEventListener('storage', (event) => {
    if (event.key === PALETTE_STORAGE_KEY || event.key === null) {
      currentPalette = readStoredPalette();
      onPaletteChange(currentPalette);
    }
  });
}

function readStoredPreference(): ThemeModePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'system';
}

function syncDocumentColorScheme(pref: ThemeModePreference): 'light' | 'dark' {
  const effective = resolveEffectiveThemeMode(pref);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = pref === 'system' ? 'light dark' : pref;
  }
  document.documentElement.dataset.theme = effective;
  return effective;
}

let currentThemePreference: ThemeModePreference = readStoredPreference();
syncDocumentColorScheme(currentThemePreference);

/**
 * Returns the selected theme preference (`'system'`, `'dark'`, or `'light'`).
 */
export function getGlobalThemeMode(): ThemeModePreference {
  return currentThemePreference;
}

/**
 * Sets and persists the 3-state theme preference (`'system' | 'dark' | 'light'`).
 * Selecting `'system'` removes any pinned override and restores `<meta name="color-scheme" content="light dark">`.
 */
export function setGlobalThemeMode(pref: ThemeModePreference): ThemeModePreference {
  currentThemePreference = pref;
  try {
    if (pref === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    }
  } catch {
    // ignore storage errors; still apply visually
  }
  syncDocumentColorScheme(pref);
  return pref;
}

/**
 * Subscribes to both OS color-scheme changes (when in `'system'` mode) and
 * cross-tab `localStorage` changes so all open Studio tabs stay synchronized.
 */
export function subscribeThemeChanges(
  onThemeChange: (nextPref: ThemeModePreference) => void
): void {
  if (typeof window === 'undefined') return;

  if (typeof window.matchMedia === 'function') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (currentThemePreference === 'system') {
          syncDocumentColorScheme('system');
          onThemeChange('system');
        }
      });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      currentThemePreference = readStoredPreference();
      syncDocumentColorScheme(currentThemePreference);
      onThemeChange(currentThemePreference);
    }
  });
}
