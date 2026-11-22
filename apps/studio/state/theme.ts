import type { ThemeModePreference } from '../../../src/index';

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';

function getSystemColorScheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'dark';
}

function readStoredOverride(): 'light' | 'dark' | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function syncDocumentColorScheme(override: 'light' | 'dark' | null): 'light' | 'dark' {
  const effective = override ?? getSystemColorScheme();
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = override ?? 'light dark';
  }
  document.documentElement.dataset.theme = effective;
  return effective;
}

let storedOverride: 'light' | 'dark' | null = readStoredOverride();
let effectiveMode: 'light' | 'dark' = syncDocumentColorScheme(storedOverride);

/**
 * Returns the active rendered color scheme (`'light'` or `'dark'`) shown in the UI
 * and applied to charts.
 */
export function getGlobalThemeMode(): ThemeModePreference {
  return effectiveMode;
}

/**
 * Applies a two-state Light / Dark selection:
 * - If `target` differs from the current OS preference, stores the literal override.
 * - If `target` matches the current OS preference, removes the stored override so
 *   `<meta name="color-scheme">` returns to `light dark` and follows future OS changes.
 */
export function setGlobalThemeMode(target: 'light' | 'dark'): 'light' | 'dark' {
  const sys = getSystemColorScheme();
  storedOverride = target === sys ? null : target;
  try {
    if (storedOverride) {
      localStorage.setItem(THEME_STORAGE_KEY, storedOverride);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors; still apply visually
  }
  effectiveMode = syncDocumentColorScheme(storedOverride);
  return effectiveMode;
}

/**
 * Subscribes to both OS color-scheme changes (when no override is stored) and
 * cross-tab `localStorage` changes so all open Studio tabs stay synchronized.
 */
export function subscribeThemeChanges(
  onThemeChange: (nextMode: 'light' | 'dark') => void
): void {
  if (typeof window === 'undefined') return;

  if (typeof window.matchMedia === 'function') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        // Never retroactively clear a stored override when OS matches it
        if (storedOverride === null) {
          effectiveMode = syncDocumentColorScheme(null);
          onThemeChange(effectiveMode);
        }
      });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      storedOverride = readStoredOverride();
      effectiveMode = syncDocumentColorScheme(storedOverride);
      onThemeChange(effectiveMode);
    }
  });
}
