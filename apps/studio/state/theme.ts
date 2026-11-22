import {
  resolveEffectiveThemeMode,
  type ThemeModePreference
} from '../../../src/index';

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';

function loadSavedThemePreference(): ThemeModePreference {
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

function saveThemePreference(pref: ThemeModePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore storage errors
  }
}

let currentThemeMode: ThemeModePreference = loadSavedThemePreference();
document.documentElement.dataset.theme = resolveEffectiveThemeMode(currentThemeMode);

export function getGlobalThemeMode(): ThemeModePreference {
  return currentThemeMode;
}

export function setGlobalThemeMode(pref: ThemeModePreference): void {
  currentThemeMode = pref;
  saveThemePreference(pref);
  document.documentElement.dataset.theme = resolveEffectiveThemeMode(pref);
}

export function subscribeSystemThemeChange(onSystemChange: () => void): void {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (currentThemeMode === 'system') {
          onSystemChange();
        }
      });
  }
}
