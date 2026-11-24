import { scaleOrdinal } from './scales';
import type {
  BuiltInPaletteName,
  ChartPaletteName,
  ChartTheme,
  ThemeModePreference
} from './types';
export { createSequentialColorScale } from './color-schemes';

export const DEFAULT_PALETTE: BuiltInPaletteName = 'shadcn';

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

const hexList = (csv: string): string[] => csv.split(',').map((c) => `#${c}`);

/**
 * 20-color categorical palettes aligned with popular UI design systems:
 * - `material`: Angular Material / Material Design
 * - `bootstrap`: Bootstrap 5
 * - `antd`: Ant Design 5
 * - `shadcn`: shadcn/ui (Tailwind / Radix tokens)
 */
export const PALETTES: Record<BuiltInPaletteName, string[]> = {
  material: hexList(
    '3f51b5,2196f3,00bcd4,009688,4caf50,8bc34a,ffc107,ff9800,ff5722,f44336,e91e63,9c27b0,673ab7,03a9f4,cddc39,795548,607d8b,1e88e5,00897b,d81b60'
  ),
  bootstrap: hexList(
    '0d6efd,6610f2,6f42c1,d63384,dc3545,fd7e14,ffc107,198754,20c997,0dcaf0,3d8bfd,8540f5,8c68cd,de5c9d,e35d6a,fd9843,479f76,4dd4ac,3dd5f3,6c757d'
  ),
  antd: hexList(
    '1677ff,52c41a,13c2c2,722ed1,eb2f96,fa8c16,faad14,f5222d,2f54eb,fa541c,a0d911,fadb14,4096ff,73d13d,36cfc9,9254de,f759ab,ffa940,ff4d4f,597ef7'
  ),
  shadcn: hexList(
    '2563eb,10b981,f59e0b,8b5cf6,ef4444,06b6d4,ec4899,f97316,14b8a6,6366f1,84cc16,0ea5e9,a855f7,f43f5e,eab308,22c55e,d946ef,64748b,3b82f6,0d9488'
  )
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const hex = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) * 60;
  } else {
    h = ((rn - gn) / d + 4) * 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(1, s));
  const ln = Math.max(0, Math.min(1, l));
  const a = sn * Math.min(ln, 1 - ln);
  const ch = (n: number) => {
    const k = (n + hn / 30) % 12;
    return clampByte((ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [ch(0), ch(8), ch(4)];
}

function parseColorToRgb(raw: string): [number, number, number] | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (/^[0-9a-fA-F]{3,4}$/.test(hex)) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    }
    if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
    return null;
  }

  if (s.length > 64) return null;

  // rgb(...) / rgba(...) and hsl(...) / hsla(...) — linear O(n) parser (no ReDoS)
  const lower = s.toLowerCase();
  const openIdx = lower.indexOf('(');
  if (openIdx > 0 && lower.endsWith(')')) {
    const fn = lower.slice(0, openIdx);
    const body = lower.slice(openIdx + 1, -1).trim();
    const slashIdx = body.indexOf('/');
    const primary = (slashIdx === -1 ? body : body.slice(0, slashIdx)).trim();
    const parts = primary
      .split(primary.includes(',') ? ',' : ' ')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;

    if (fn === 'rgb' || fn === 'rgba') {
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return null;
      }
      return [clampByte(r), clampByte(g), clampByte(b)];
    }

    if (fn === 'hsl' || fn === 'hsla') {
      const hStr = parts[0].endsWith('deg') ? parts[0].slice(0, -3) : parts[0];
      if (!parts[1].endsWith('%') || !parts[2].endsWith('%')) return null;
      const h = Number(hStr);
      const sat = Number(parts[1].slice(0, -1));
      const lit = Number(parts[2].slice(0, -1));
      if (!Number.isFinite(h) || !Number.isFinite(sat) || !Number.isFinite(lit)) {
        return null;
      }
      return hslToRgb(h, sat / 100, lit / 100);
    }
  }

  return null;
}

/**
 * Generates an ordered light-to-dark color palette (defaulting to 20 colors)
 * treating `baseColor` as the exact middle anchor value (`Math.floor((total - 1) / 2)`).
 *
 * Accepts `#RGB`, `#RRGGBB`, `rgb(...)`, or `hsl(...)` strings.
 */
export function generateColorPalette(baseColor: string, count = 20): string[] {
  const total = Math.max(
    2,
    Math.floor(Number.isFinite(count) ? count : 20)
  );
  const rgb = parseColorToRgb(baseColor) ?? [37, 99, 235]; // fallback #2563eb
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const mid = Math.floor((total - 1) / 2);
  const midHex = rgbToHex(rgb[0], rgb[1], rgb[2]);

  const lightEnd = l >= 0.95 ? Math.min(0.99, l + 0.04) : 0.95;
  const darkEnd = l <= 0.11 ? Math.max(0.03, l - 0.04) : 0.11;

  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    if (i === mid) {
      out.push(midHex);
      continue;
    }
    if (i < mid) {
      const t = i / mid; // 0 (lightest) -> 1 (midpoint)
      const li = lightEnd + (l - lightEnd) * t;
      const si = s * (0.82 + 0.18 * t);
      const [rr, gg, bb] = hslToRgb(h, si, li);
      out.push(rgbToHex(rr, gg, bb));
    } else {
      const t = (i - mid) / (total - 1 - mid); // >0 -> 1 (darkest)
      const li = l + (darkEnd - l) * t;
      const si = Math.min(1, s * (1 + 0.06 * t));
      const [rr, gg, bb] = hslToRgb(h, si, li);
      out.push(rgbToHex(rr, gg, bb));
    }
  }
  return out;
}

/**
 * Resolves a built-in design-system palette (`'material'`, `'bootstrap'`, `'antd'`, `'shadcn'`)
 * or a custom seed color string (auto-generating a 20-color light-to-dark palette centered on it).
 */
export function resolvePaletteColors(
  palette: ChartPaletteName = DEFAULT_PALETTE,
  count = 20
): string[] {
  if (
    typeof palette === 'string' &&
    Object.prototype.hasOwnProperty.call(PALETTES, palette)
  ) {
    return PALETTES[palette as BuiltInPaletteName];
  }
  if (typeof palette === 'string' && parseColorToRgb(palette) !== null) {
    return generateColorPalette(palette, count);
  }
  return PALETTES[DEFAULT_PALETTE];
}

export function createDefaultTheme(
  mode: ThemeModePreference = 'light',
  palette: ChartPaletteName = DEFAULT_PALETTE
): ChartTheme {
  const effectiveMode = resolveEffectiveThemeMode(mode);
  const isDark = effectiveMode === 'dark';
  return {
    mode: effectiveMode,
    palette,
    colors: resolvePaletteColors(palette),
    background: isDark ? '#0f172a' : '#ffffff',
    textColor: isDark ? '#e2e8f0' : '#1e293b',
    mutedTextColor: isDark ? '#94a3b8' : '#64748b',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
    axisColor: isDark ? '#334155' : '#cbd5e1',
    gridColor: isDark
      ? 'rgba(148, 163, 184, 0.14)'
      : 'rgba(148, 163, 184, 0.24)',
    gridStrokeDasharray: '4 4',
    tooltipBackground: isDark
      ? 'rgba(15, 23, 42, 0.95)'
      : 'rgba(255, 255, 255, 0.97)',
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
