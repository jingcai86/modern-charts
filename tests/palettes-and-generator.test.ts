import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  PALETTES,
  createDefaultTheme,
  generateColorPalette,
  registerModernCharts,
  resolvePaletteColors,
  type MCBarChart
} from '../src/index';

function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('Design-System Palettes & Single-Color Light-to-Dark Generator (Issue #13)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ships strictly the 4 design-system palettes (material, bootstrap, antd, shadcn) with 20 hex colors each and removes all 7 legacy presets', () => {
    const keys = Object.keys(PALETTES).sort();
    expect(keys).toEqual(['antd', 'bootstrap', 'material', 'shadcn']);
    expect(DEFAULT_PALETTE).toBe('shadcn');

    for (const removed of [
      'modern',
      'nivo',
      'echarts',
      'emerald',
      'sunset',
      'ocean',
      'cyber'
    ]) {
      expect(Object.prototype.hasOwnProperty.call(PALETTES, removed)).toBe(false);
    }

    for (const name of keys as Array<keyof typeof PALETTES>) {
      const colors = PALETTES[name];
      expect(colors.length).toBe(20);
      for (const c of colors) {
        expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // Every palette should have 20 distinct color values
      expect(new Set(colors.map((c) => c.toLowerCase())).size).toBe(20);
    }
  });

  it('generates at least 20 colors from light to dark treating the user color as the exact middle anchor', () => {
    const ramp = generateColorPalette('#2563eb');
    expect(ramp.length).toBe(20);
    const mid = Math.floor((ramp.length - 1) / 2);
    expect(ramp[mid]).toBe('#2563eb');

    // Monotonically decreasing luminance from lightest (index 0) to darkest (index 19)
    for (let i = 0; i < ramp.length - 1; i++) {
      expect(ramp[i]).toMatch(/^#[0-9a-f]{6}$/);
      expect(hexLuminance(ramp[i])).toBeGreaterThanOrEqual(
        hexLuminance(ramp[i + 1])
      );
    }
    expect(hexLuminance(ramp[0])).toBeGreaterThan(210);
    expect(hexLuminance(ramp[ramp.length - 1])).toBeLessThan(65);

    // Supports custom counts from small (e.g. 5) up to large (e.g. 50) with exact midpoint
    const ramp5 = generateColorPalette('#10b981', 5);
    expect(ramp5.length).toBe(5);
    expect(ramp5[2]).toBe('#10b981');
    expect(hexLuminance(ramp5[0])).toBeGreaterThan(hexLuminance(ramp5[2]));
    expect(hexLuminance(ramp5[2])).toBeGreaterThan(hexLuminance(ramp5[4]));

    const ramp50 = generateColorPalette('#e91e63', 50);
    expect(ramp50.length).toBe(50);
    expect(ramp50[24]).toBe('#e91e63');
  });

  it('supports #RGB, #RRGGBB, rgb(), and hsl() seed color formats in generateColorPalette and resolvePaletteColors', () => {
    const fromShortHex = generateColorPalette('#09f');
    expect(fromShortHex[9]).toBe('#0099ff');

    const fromRgb = generateColorPalette('rgb(22, 119, 255)');
    expect(fromRgb[9]).toBe('#1677ff');

    const fromHsl = generateColorPalette('hsl(160, 84%, 39%)');
    expect(fromHsl.length).toBe(20);
    expect(hexLuminance(fromHsl[0])).toBeGreaterThan(hexLuminance(fromHsl[9]));
    expect(hexLuminance(fromHsl[9])).toBeGreaterThan(hexLuminance(fromHsl[19]));

    // resolvePaletteColors works for both built-in names and seed color strings
    expect(resolvePaletteColors('antd')).toEqual(PALETTES.antd);
    expect(resolvePaletteColors('#1677ff')).toEqual(fromRgb);
  });

  it('applies design-system palettes and seed-color palettes live on charts via config.palette and HTML attribute', () => {
    const themeMat = createDefaultTheme('dark', 'material');
    expect(themeMat.colors).toEqual(PALETTES.material);

    const themeSeed = createDefaultTheme('light', '#fa8c16');
    expect(themeSeed.colors.length).toBe(20);
    expect(themeSeed.colors[9]).toBe('#fa8c16');

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);
    bar.config = {
      width: 480,
      height: 300,
      palette: '#1677ff',
      indexBy: 'q',
      keys: ['A', 'B', 'C'],
      data: [
        { q: 'Q1', A: 10, B: 20, C: 30 },
        { q: 'Q2', A: 15, B: 25, C: 35 }
      ]
    };

    const resolved = bar.resolveTheme();
    expect(resolved.colors.length).toBe(20);
    expect(resolved.colors[9]).toBe('#1677ff');
  });
});
