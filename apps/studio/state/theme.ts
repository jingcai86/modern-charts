import {
  resolveEffectiveThemeMode,
  type ThemeModePreference
} from '../../../src/index';

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';

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
