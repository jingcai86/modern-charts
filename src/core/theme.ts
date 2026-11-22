import { scaleOrdinal } from 'd3';
import type { ChartPaletteName, ChartTheme, ThemeModePreference } from './types';
export { createSequentialColorScale } from './color-schemes';

export function resolveEffectiveThemeMode(
  mode: ThemeModePreference = 'system'
): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'dark';
}

export const PALETTES: Record<ChartPaletteName, string[]> = {
  modern: [
    '#6366f1', // indigo-500
    '#06b6d4', // cyan-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#14b8a6'  // teal-500
  ],
  nivo: [
    '#e8c1a0',
    '#f47560',
    '#f1e15b',
    '#e8a838',
    '#61cdbb',
    '#97e3d5',
    '#a45de2',
    '#f77f00'
  ],
  echarts: [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc'
  ],
  emerald: [
    '#059669',
    '#10b981',
    '#34d399',
    '#0d9488',
    '#14b8a6',
    '#2dd4bf',
    '#6ee7b7',
    '#047857'
  ],
  sunset: [
    '#f43f5e',
    '#fb7185',
    '#f97316',
    '#fb923c',
    '#eab308',
    '#a855f7',
    '#ec4899',
    '#ef4444'
  ],
  ocean: [
    '#0284c7',
    '#0ea5e9',
    '#38bdf8',
    '#2563eb',
    '#3b82f6',
    '#6366f1',
    '#06b6d4',
    '#22d3ee'
  ],
  cyber: [
    '#00f5d4',
    '#00bbf9',
    '#fee440',
    '#f15bb5',
    '#9b5de5',
    '#fb5607',
    '#3a86ff',
    '#ff006e'
  ]
};

export function createDefaultTheme(
  mode: ThemeModePreference = 'light',
  palette: ChartPaletteName = 'modern'
): ChartTheme {
  const effectiveMode = resolveEffectiveThemeMode(mode);
  const isDark = effectiveMode === 'dark';
  return {
    mode: effectiveMode,
    palette,
    colors: PALETTES[palette] ?? PALETTES.modern,
    background: isDark ? '#0f172a' : '#ffffff',
    textColor: isDark ? '#e2e8f0' : '#1e293b',
    mutedTextColor: isDark ? '#94a3b8' : '#64748b',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
    axisColor: isDark ? '#334155' : '#cbd5e1',
    gridColor: isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.24)',
    gridStrokeDasharray: '4 4',
    tooltipBackground: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
    tooltipTextColor: isDark ? '#f8fafc' : '#0f172a',
    tooltipBorderColor: isDark ? '#334155' : '#e2e8f0',
    labelRenderMode: 'svg'
  };
}

export function createOrdinalColorScale(
  theme: ChartTheme,
  domain?: (string | number)[]
): (key: string | number) => string {
  const scale = scaleOrdinal<string | number, string>(theme.colors);
  if (domain && domain.length > 0) {
    scale.domain(domain);
  }
  return (key: string | number) => scale(key);
}
