import {
  DEFAULT_PALETTE,
  generateColorPalette,
  PALETTES,
  resolveEffectiveThemeMode
} from '../../../src/core/theme';
import type { BuiltInPaletteName, ThemeModePreference } from '../../../src/core/types';

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';
const PALETTE_STORAGE_KEY = 'modern-charts-palette';

export type StudioPaletteName = BuiltInPaletteName | 'neutral';

function createNeutralPalette(): string[] {
  // Drop the extremes to keep the grayscale marks visible on light and dark surfaces.
  const shades = generateColorPalette('#737373', 32).slice(6, -6);
  const midpoint = Math.floor((shades.length - 1) / 2);
  const lighter = shades.slice(0, midpoint);
  const darker = shades.slice(midpoint + 1).reverse();
  return [
    shades[midpoint],
    ...lighter.flatMap((shade, index) => [shade, darker[index]]),
    ...darker.slice(lighter.length)
  ];
}

// Install the generated palette only in the Studio runtime so existing chart configs
// and the locally saved selection can continue to use the Neutral name.
export const STUDIO_PALETTES: Record<StudioPaletteName, string[]> =
  Object.assign(PALETTES, { neutral: createNeutralPalette() });

function isStudioPalette(value: unknown): value is StudioPaletteName {
  return typeof value === 'string' && Object.hasOwn(STUDIO_PALETTES, value);
}

function readStoredPalette(): StudioPaletteName {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (isStudioPalette(saved)) return saved;
  } catch {
    // Use the default when storage is unavailable.
  }
  return DEFAULT_PALETTE;
}

let currentPalette = readStoredPalette();

/** The selected palette used for new Studio chart configurations. */
export function getGlobalPalette(): StudioPaletteName {
  return currentPalette;
}

export function setGlobalPalette(palette: string): StudioPaletteName {
  if (!isStudioPalette(palette)) return currentPalette;
  currentPalette = palette;
  try {
    if (palette === DEFAULT_PALETTE) localStorage.removeItem(PALETTE_STORAGE_KEY);
    else localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // Keep the current session usable when storage is unavailable.
  }
  return currentPalette;
}

export function subscribePaletteChanges(onPaletteChange: (palette: StudioPaletteName) => void): void {
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
