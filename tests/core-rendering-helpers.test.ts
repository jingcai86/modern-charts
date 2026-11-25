import { describe, expect, it, vi } from 'vitest';
import { createSequentialColorScale } from '../src/core/color-schemes';
import { formatAxisNumber, formatDisplayValue, formatGroupedNumber } from '../src/core/format';
import { createChartI18n } from '../src/core/i18n';
import {
  resolveLabelOverflowConfig,
  splitGraphemes,
  truncateSingleLine,
  truncateTextWithPretext
} from '../src/core/label-truncate';
import {
  createDefaultTheme,
  generateColorGradient,
  generateColorPalette,
  generateGradientPalette,
  parseColorToRgb,
  resolveSequentialColorRamp
} from '../src/core/theme';

describe('color ramps and gradients', () => {
  it.each([
    [' #1a2f ', [17, 170, 34]],
    ['#804020aa', [128, 64, 32]],
    ['RGB(-20 32.4 300 / 0.5)', [0, 32, 255]],
    ['hsla(240deg, 100%, 50%, 0.25)', [0, 0, 255]],
    ['hsl(-120 100% 50% / 0.5)', [0, 0, 255]]
  ])('normalizes valid color %s for interpolation', (input, rgb) => {
    expect(parseColorToRgb(input)).toEqual(rgb);
  });

  it.each([
    '', '#12xz', 'rgb(1 2)', 'rgb(1 2 3 4 5)', 'rgba(1, 2, NaN, 0.5)',
    'hsl(20 10 45%)', 'hsl(20 10% 45)', 'hsl(invalid 80% 40%)',
    'hsl(20 invalid% 40%)', 'hsl(20 80% invalid%)', 'x'.repeat(65)
  ])('rejects malformed or unsupported color %j', (input) => {
    expect(parseColorToRgb(input)).toBeNull();
  });

  it('keeps extremely light and dark palette seeds as exact anchors', () => {
    const light = generateColorPalette('#fafafa', 3);
    const dark = generateColorPalette('#141414', 3);
    expect(light).toEqual(['#fcfcfc', '#fafafa', '#1c1c1c']);
    expect(dark).toEqual(['#f2f2f2', '#141414', '#0a0a0a']);
    expect(generateColorPalette('#000000', NaN)).toHaveLength(20);
  });

  it('uses explicit theme ramp colors and falls back to the preset when no seed remains', () => {
    const theme = createDefaultTheme('light', 'neutral');
    const config = { colors: ['#608', 'no color', 'rgb(40 80 120)'] };
    expect(resolveSequentialColorRamp({ theme, config }, 'magma')).toBe('magma');
    const ramp = resolveSequentialColorRamp({ theme, config }, 'theme');
    const scale = createSequentialColorScale(ramp, [5, 15]);
    expect(scale(5)).toBe('rgb(102, 0, 136)');
    expect(scale(15)).toBe('rgb(40, 80, 120)');
    expect(scale(10)).toBe('rgb(71, 40, 128)');

    const oneStop = resolveSequentialColorRamp({ theme, config: { colors: ['#286'] } }, 'theme');
    expect(oneStop).toHaveLength(9);
    expect(oneStop[4]).toBe('#228866');
    const noSeed = resolveSequentialColorRamp({ theme: { ...theme, colors: [] }, config: {} }, 'theme');
    expect(noSeed[4]).toBe('#2563eb');
  });

  it('uses the midpoint for a constant domain and isolates copied scale bounds', () => {
    const scale = createSequentialColorScale(['#000000', '#ffffff'], [8, 8]);
    expect(scale(8)).toBe('rgb(128, 128, 128)');
    expect(scale.clamp()).toBe(false);
    const copy = scale.copy().domain([0, 10]).clamp(true);
    expect(copy.clamp()).toBe(true);
    expect(copy(-1)).toBe('rgb(0, 0, 0)');
    expect(copy(20)).toBe('rgb(255, 255, 255)');
    expect(scale.domain()).toEqual([8, 8]);
    expect(createSequentialColorScale(['#000000'])(0)).toBe(createSequentialColorScale()(0));
    expect(createSequentialColorScale('unknown')(100)).toBe(createSequentialColorScale()(100));
  });

  it('keeps extreme gradient stops legible and clamps invalid opacity values', () => {
    const light = generateColorGradient('#ededed', { intensity: NaN, startOpacity: 1.7 });
    const dark = generateColorGradient('#0a0a0a', { endOpacity: -1 });
    expect(light).toMatchObject({ colors: [
      { color: '#f7f7f7', opacity: 1 }, { color: '#ededed' }, { color: '#cdcdcd' }
    ] });
    expect(dark).toMatchObject({ colors: [
      { offset: '0%' }, { color: '#0a0a0a' }, { color: '#0d0d0d', opacity: 0 }
    ] });
  });

  it('uses the default gradient palette when given an empty color list or theme', () => {
    const theme = { ...createDefaultTheme(), colors: [] };
    expect(generateGradientPalette([]).colors).toEqual(generateGradientPalette().colors);
    expect(generateGradientPalette(theme).colors).toEqual(generateGradientPalette().colors);
  });
});

describe('label clipping and wrapping', () => {
  it('recognizes normalized strategy names and discards invalid overflow constraints', () => {
    const overflow = {
      strategy: ' WRAP ' as 'wrap', maxWidth: 86, maxChars: 7.7, maxLines: 3.8,
      ellipsis: '...', enableTooltip: false
    };
    const resolved = resolveLabelOverflowConfig({ maxWidth: 0, maxRotation: Infinity, overflow });
    expect(resolved).toMatchObject({
      strategy: 'wrap', maxWidth: undefined, maxChars: 7, maxLines: 3,
      ellipsis: '...', maxRotation: 45, enableTooltip: false
    });
    expect(resolveLabelOverflowConfig({ overflow: 'invalid' as 'none' }).strategy).toBe('truncate');
  });

  it('fits ellipses without splitting emoji or combining marks', () => {
    const count = (text: string) => splitGraphemes(text).length;
    const family = '👨‍👩‍👧‍👦';
    const accent = 'e\u0301';
    expect(truncateSingleLine(`${family}${accent}XY`, undefined, 3, '…', count)).toEqual({
      text: `${family}${accent}…`, width: 3, truncated: true
    });
    expect(truncateSingleLine('Revenue', 1, 1, '...', count).text).toBe('.');
    expect(truncateSingleLine('Revenue', 1, undefined, '…', count)).toEqual({
      text: '…', width: 1, truncated: true
    });
    expect(truncateSingleLine('', undefined, undefined, '…', count)).toEqual({
      text: '', width: 0, truncated: false
    });
  });

  it('truncates wrapped content at the final visible line', () => {
    const wrapped = truncateTextWithPretext('day week month', {
      strategy: 'wrap', maxWidth: 48, maxLines: 3, maxHeight: 20, lineHeight: 10
    });
    expect(wrapped.lines.map((line) => line.text.trimEnd())).toEqual(['day', 'week…']);
    expect(wrapped.width).toBeLessThanOrEqual(48);
    expect(wrapped.truncated).toBe(true);

    const limited = truncateTextWithPretext('abcdefghij', { strategy: 'wrap', maxChars: 5 });
    expect(limited.text).toBe('abcd…');
    expect(limited.truncated).toBe(true);
  });

  it('marks omitted explicit lines and respects custom ellipses and character limits', () => {
    const result = truncateTextWithPretext('Q1\nQ2\nQ3', {
      maxLines: 2, maxChars: 3, ellipsis: '..'
    });
    expect(result.text).toBe('Q1\nQ..');
    expect(result.truncated).toBe(true);
    expect(result.overflowTriggered).toBe(true);
  });

  it('keeps the text intact in rotation-only mode and caps the angle after overflow', () => {
    const options = { strategy: 'rotate' as const, rotation: -60, maxWidth: 10, maxRotation: 25 };
    const rotated = truncateTextWithPretext('Long label', options);
    expect(rotated).toMatchObject({
      text: 'Long label', appliedRotation: -25, truncated: false, overflowTriggered: true
    });
    expect(truncateTextWithPretext('Long label', { ...options, maxRotation: 0 }).appliedRotation)
      .toBe(0);
    expect(truncateTextWithPretext('Short', { ...options, maxWidth: 100 }).appliedRotation)
      .toBe(-60);
  });

  it('does not measure or mark empty labels as overflowing', () => {
    expect(truncateTextWithPretext('', { strategy: 'both', rotation: 15 })).toMatchObject({
      text: '', lines: [], width: 0, naturalWidth: 0, truncated: false,
      overflowTriggered: false, appliedRotation: 15
    });
  });

  it('estimates label widths when there is no native 2D canvas context', async () => {
    const prototype = HTMLCanvasElement.prototype;
    const getContext = prototype.getContext;
    const noContext: typeof getContext = () => null;
    try {
      prototype.getContext = noContext;
      vi.resetModules();
      await import('../src/core/label-truncate');

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      context.font = '12px sans-serif';
      const width = context.measureText('W i 東').width;
      expect(width).toBeGreaterThan(0);
      expect(context.measureText('WWW').width).toBeGreaterThan(context.measureText('iii').width);
      context.font = '24px sans-serif';
      expect(context.measureText('W i 東').width).toBeCloseTo(width * 2);
      expect(canvas.getContext('webgl')).toBeNull();
    } finally {
      prototype.getContext = getContext;
    }
  });
});

describe('display formatting boundaries', () => {
  it('leaves nonfinite values explicit and normalizes rounded negative zero', () => {
    expect(formatGroupedNumber(Infinity)).toBe('Infinity');
    expect(formatAxisNumber(NaN)).toBe('NaN');
    expect(formatAxisNumber(-0.001)).toBe('0');
    expect(formatDisplayValue(new Date(NaN))).toBe('');
  });

  it('retains locale formatting when cycling across number and date format options', () => {
    const i18n = createChartI18n({ locale: 'de-DE', timeZone: 'UTC' });
    const value = 1234.56;
    for (let minimumIntegerDigits = 1; minimumIntegerDigits <= 18; minimumIntegerDigits++) {
      for (const useGrouping of [true, false]) {
        const options = { minimumIntegerDigits, useGrouping, maximumFractionDigits: 2 };
        expect(i18n.formatNumber(value, options)).toBe(new Intl.NumberFormat('de-DE', options).format(value));
      }
    }
    expect(i18n.formatNumber(value, { minimumIntegerDigits: 1, maximumFractionDigits: 2 })).toBe('1.234,56');
    const time = new Date('2026-01-01T02:00:00Z');
    expect(i18n.formatDate(time, { timeZone: 'America/Los_Angeles', day: 'numeric' })).toBe('31');
    expect(i18n.formatDate(time, { day: 'numeric' })).toBe('1');
  });
});
