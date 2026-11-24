import { scaleOrdinal } from './scales';
import type {
  BuiltInPaletteName,
  ChartPaletteName,
  ChartTheme,
  FillMatchContext,
  FillRule,
  GeneratedGradientPalette,
  GradientDirection,
  GradientGeneratorOptions,
  GradientPaletteOptions,
  LinearGradientDef,
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

function clampUnit(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function normalizeColorKey(raw: string): string {
  const rgb = parseColorToRgb(raw);
  return rgb ? rgbToHex(rgb[0], rgb[1], rgb[2]) : raw.trim().toLowerCase();
}

/**
 * Resolves positive and reversed-negative SVG linear gradient angles (in degrees)
 * for vertical, horizontal, cardinal, diagonal, or custom numeric directions.
 *
 * Angle convention matches `PatternEngine`:
 * - `0°` = top → bottom (positive vertical bar: vivid top tip → zero baseline at bottom)
 * - `180°` = bottom → top (negative vertical bar: vivid bottom tip → zero baseline at top)
 * - `270°` = right → left (positive horizontal bar: vivid right tip → zero baseline at left)
 * - `90°` = left → right (negative horizontal bar: vivid left tip → zero baseline at right)
 */
export function resolveGradientAngles(
  direction: GradientDirection | number = 'vertical',
  layout: 'vertical' | 'horizontal' = 'vertical'
): { positiveAngle: number; negativeAngle: number } {
  let positiveAngle = 0;

  if (typeof direction === 'number' && Number.isFinite(direction)) {
    positiveAngle = ((direction % 360) + 360) % 360;
  } else {
    const resolved =
      direction === 'auto'
        ? layout === 'horizontal'
          ? 'horizontal'
          : 'vertical'
        : direction;

    switch (resolved) {
      case 'horizontal':
      case 'right-to-left':
        positiveAngle = 270;
        break;
      case 'left-to-right':
        positiveAngle = 90;
        break;
      case 'bottom-to-top':
        positiveAngle = 180;
        break;
      case 'diagonal':
        positiveAngle = 45;
        break;
      case 'vertical':
      case 'top-to-bottom':
      default:
        positiveAngle = 0;
        break;
    }
  }

  return {
    positiveAngle,
    negativeAngle: (positiveAngle + 180) % 360
  };
}

/**
 * Generates a smooth 3-stop tonal `<linearGradient>` definition from a single base color
 * (bright highlight at tip → exact base color anchor → deeper/softer baseline tail).
 */
export function generateColorGradient(
  baseColor: string,
  options: GradientGeneratorOptions = {}
): LinearGradientDef {
  const rgb = parseColorToRgb(baseColor) ?? [37, 99, 235];
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const intensity = clampUnit(options.intensity ?? 0.28, 0.28);
  const startOpacity = clampUnit(options.startOpacity ?? 1, 1);
  const endOpacity = clampUnit(options.endOpacity ?? 0.78, 0.78);
  const midOpacity =
    Math.round((startOpacity * 0.65 + endOpacity * 0.35) * 1000) / 1000;

  const startL =
    l >= 0.88
      ? Math.min(0.98, l + 0.04)
      : Math.min(0.92, l + intensity * 0.45);
  const endL =
    l <= 0.14
      ? Math.max(0.05, l - 0.04)
      : Math.max(0.12, l - intensity * 0.45);

  const [sr, sg, sb] = hslToRgb(h, Math.min(1, s * 1.05), startL);
  const [er, eg, eb] = hslToRgb(h, Math.min(1, s * 0.95), endL);

  const startHex = rgbToHex(sr, sg, sb);
  const midHex = rgbToHex(rgb[0], rgb[1], rgb[2]);
  const endHex = rgbToHex(er, eg, eb);

  const { positiveAngle } = resolveGradientAngles(
    options.direction ?? 'vertical',
    options.layout ?? 'vertical'
  );

  return {
    id: options.id ?? 'mc-grad',
    type: 'linearGradient',
    angle: positiveAngle,
    colors: [
      { offset: '0%', color: startHex, opacity: startOpacity },
      { offset: '48%', color: midHex, opacity: midOpacity },
      { offset: '100%', color: endHex, opacity: endOpacity }
    ]
  };
}

/**
 * Generates a full set of directional SVG `<linearGradient>` definitions and matching
 * `FillRule[]` from:
 * - a built-in design-system theme palette (`'shadcn'`, `'material'`, `'bootstrap'`, `'antd'`),
 * - a single seed color string (auto-expanded light-to-dark via `generateColorPalette`),
 * - a custom `colors[]` array, or
 * - a `ChartTheme` object.
 *
 * When `reverseOnNegative` is `true` (default), negative items (`value < 0`, e.g. negative
 * vertical or horizontal bars) automatically receive the opposite gradient direction (`+180°`)
 * so both positive and negative bars radiate outward from the zero axis.
 */
export function generateGradientPalette(
  source: ChartPaletteName | string[] | ChartTheme = DEFAULT_PALETTE,
  options: GradientPaletteOptions = {}
): GeneratedGradientPalette {
  const count = options.count ?? 20;
  let colors: string[];

  if (Array.isArray(source)) {
    colors =
      source.length > 0 ? [...source] : resolvePaletteColors(DEFAULT_PALETTE, count);
  } else if (
    source &&
    typeof source === 'object' &&
    Array.isArray(source.colors) &&
    source.colors.length > 0
  ) {
    colors = [...source.colors];
  } else if (typeof source === 'string') {
    colors = resolvePaletteColors(source, count);
  } else {
    colors = resolvePaletteColors(DEFAULT_PALETTE, count);
  }

  const reverseOnNegative = options.reverseOnNegative !== false;
  const idPrefix = options.idPrefix ?? 'mc-grad';
  const { positiveAngle, negativeAngle } = resolveGradientAngles(
    options.direction ?? 'vertical',
    options.layout ?? 'vertical'
  );

  const gradients: LinearGradientDef[] = [];
  const negativeGradients: LinearGradientDef[] = [];
  const defs: LinearGradientDef[] = [];
  const fill: FillRule[] = [];

  const isNegativeContext = (ctx: FillMatchContext): boolean =>
    ctx.target !== 'legend' && typeof ctx.value === 'number' && ctx.value < 0;

  colors.forEach((color, idx) => {
    const posId = `${idPrefix}-${idx}`;
    const posDef = generateColorGradient(color, {
      id: posId,
      direction: positiveAngle,
      intensity: options.intensity,
      startOpacity: options.startOpacity,
      endOpacity: options.endOpacity
    });
    gradients.push(posDef);
    defs.push(posDef);

    const normColor = normalizeColorKey(color);
    const keyName = options.keys?.[idx];
    const matchesTarget = (ctx: FillMatchContext): boolean =>
      keyName !== undefined
        ? ctx.key === keyName || ctx.seriesId === keyName || ctx.id === keyName
        : normalizeColorKey(ctx.color) === normColor;

    if (reverseOnNegative) {
      const negId = `${idPrefix}-${idx}-neg`;
      const negDef = generateColorGradient(color, {
        id: negId,
        direction: negativeAngle,
        intensity: options.intensity,
        startOpacity: options.startOpacity,
        endOpacity: options.endOpacity
      });
      negativeGradients.push(negDef);
      defs.push(negDef);

      fill.push({
        id: negId,
        match: (_datum, ctx) => isNegativeContext(ctx) && matchesTarget(ctx)
      });
    }

    fill.push({
      id: posId,
      match: (_datum, ctx) =>
        (!reverseOnNegative || !isNegativeContext(ctx)) && matchesTarget(ctx)
    });
  });

  return {
    colors,
    defs,
    fill,
    gradients,
    negativeGradients
  };
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
