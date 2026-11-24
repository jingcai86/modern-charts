import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  PALETTES,
  createDefaultTheme,
  generateColorGradient,
  generateColorPalette,
  generateGradientPalette,
  registerModernCharts,
  resolveGradientAngles,
  resolvePaletteColors,
  type GradientStop,
  type MCBarChart
} from '../src/index';
import { renderThemesGuide } from '../apps/studio/guides/themes';

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

describe('Directional Gradient Generator & Chart Gradient Config', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves positive and reversed-negative angles across auto, vertical, horizontal, cardinal, diagonal, and custom angles', () => {
    expect(resolveGradientAngles('auto', 'vertical')).toEqual({
      positiveAngle: 0,
      negativeAngle: 180
    });
    expect(resolveGradientAngles('auto', 'horizontal')).toEqual({
      positiveAngle: 270,
      negativeAngle: 90
    });
    expect(resolveGradientAngles('vertical')).toEqual({
      positiveAngle: 0,
      negativeAngle: 180
    });
    expect(resolveGradientAngles('horizontal')).toEqual({
      positiveAngle: 270,
      negativeAngle: 90
    });
    expect(resolveGradientAngles('left-to-right')).toEqual({
      positiveAngle: 90,
      negativeAngle: 270
    });
    expect(resolveGradientAngles('bottom-to-top')).toEqual({
      positiveAngle: 180,
      negativeAngle: 0
    });
    expect(resolveGradientAngles('diagonal')).toEqual({
      positiveAngle: 45,
      negativeAngle: 225
    });
    expect(resolveGradientAngles(-30)).toEqual({
      positiveAngle: 330,
      negativeAngle: 150
    });
  });

  it('generates tonal gradients from theme palettes, custom colors[], single seed colors, and ChartTheme objects', () => {
    // Single color gradient
    const single = generateColorGradient('#2563eb', {
      id: 'brand-grad',
      direction: 'vertical'
    });
    expect(single.id).toBe('brand-grad');
    expect(single.angle).toBe(0);
    const stops = single.colors as GradientStop[];
    expect(stops.length).toBe(3);
    expect(stops[1].color).toBe('#2563eb');
    expect(hexLuminance(stops[0].color)).toBeGreaterThan(hexLuminance(stops[1].color));
    expect(hexLuminance(stops[1].color)).toBeGreaterThan(hexLuminance(stops[2].color));

    // Built-in theme palette -> 20 positive + 20 negative defs
    const fromTheme = generateGradientPalette('material', { direction: 'vertical' });
    expect(fromTheme.colors).toEqual(PALETTES.material);
    expect(fromTheme.gradients.length).toBe(20);
    expect(fromTheme.negativeGradients.length).toBe(20);
    expect(fromTheme.defs.length).toBe(40);
    expect(fromTheme.gradients[0].angle).toBe(0);
    expect(fromTheme.negativeGradients[0].angle).toBe(180);

    // Single seed color -> auto-expands like generateColorPalette with matching gradients
    const fromSeed = generateGradientPalette('#10b981', {
      count: 15,
      direction: 'horizontal'
    });
    expect(fromSeed.colors.length).toBe(15);
    expect(fromSeed.colors[7]).toBe('#10b981');
    expect(fromSeed.gradients.length).toBe(15);
    expect(fromSeed.negativeGradients.length).toBe(15);
    expect(fromSeed.gradients[7].angle).toBe(270);
    expect(fromSeed.negativeGradients[7].angle).toBe(90);

    // Custom colors[] array with reverseOnNegative: false
    const fromArr = generateGradientPalette(['#2563eb', '#f59e0b'], {
      direction: 'diagonal',
      reverseOnNegative: false
    });
    expect(fromArr.colors).toEqual(['#2563eb', '#f59e0b']);
    expect(fromArr.gradients.length).toBe(2);
    expect(fromArr.negativeGradients.length).toBe(0);
    expect(fromArr.defs.length).toBe(2);
    expect(fromArr.gradients[0].angle).toBe(45);

    // ChartTheme object
    const fromThemeObj = generateGradientPalette(createDefaultTheme('dark', 'antd'));
    expect(fromThemeObj.colors).toEqual(PALETTES.antd);
  });

  it('renders opposing gradient directions for positive vs negative bars in both vertical and horizontal layouts', () => {
    const getGradElement = (chart: MCBarChart, rect: Element): SVGLinearGradientElement | null => {
      const fill = rect.getAttribute('fill') ?? '';
      const m = /^url\(#([^)]+)\)$/.exec(fill);
      expect(m, `expected url(#...) fill, got "${fill}"`).not.toBeNull();
      return chart.shadowRoot!.querySelector<SVGLinearGradientElement>(`defs linearGradient#${CSS.escape(m![1])}`);
    };

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    // 1. Vertical diverging bars with auto gradient
    bar.config = {
      width: 520,
      height: 320,
      palette: 'shadcn',
      layout: 'vertical',
      gradient: true,
      indexBy: 'q',
      keys: ['Net'],
      data: [
        { q: 'Q1', Net: 100 },
        { q: 'Q2', Net: -60 }
      ]
    };

    const vertRects = Array.from(bar.shadowRoot!.querySelectorAll<SVGRectElement>('rect.mc-bar-rect'));
    expect(vertRects.length).toBe(2);
    const posVertGrad = getGradElement(bar, vertRects[0])!;
    const negVertGrad = getGradElement(bar, vertRects[1])!;
    expect(posVertGrad.id).not.toBe(negVertGrad.id);
    // Positive vertical bar: top (0%) -> bottom (100%)
    expect(posVertGrad.getAttribute('y1')).toBe('0%');
    expect(posVertGrad.getAttribute('y2')).toBe('100%');
    // Negative vertical bar: bottom (100%) -> top (0%)
    expect(negVertGrad.getAttribute('y1')).toBe('100%');
    expect(negVertGrad.getAttribute('y2')).toBe('0%');

    // 2. Horizontal diverging bars with auto gradient
    bar.config = {
      ...bar.config,
      layout: 'horizontal'
    };

    const horizRects = Array.from(bar.shadowRoot!.querySelectorAll<SVGRectElement>('rect.mc-bar-rect'));
    expect(horizRects.length).toBe(2);
    const posHorizGrad = getGradElement(bar, horizRects[0])!;
    const negHorizGrad = getGradElement(bar, horizRects[1])!;
    expect(posHorizGrad.id).not.toBe(negHorizGrad.id);
    // Positive horizontal bar: right (100%) -> left (0%)
    expect(posHorizGrad.getAttribute('x1')).toBe('100%');
    expect(posHorizGrad.getAttribute('x2')).toBe('0%');
    // Negative horizontal bar: left (0%) -> right (100%)
    expect(negHorizGrad.getAttribute('x1')).toBe('0%');
    expect(negHorizGrad.getAttribute('x2')).toBe('100%');

    // 3. Programmatic spread (...generateGradientPalette) with reverseOnNegative: false shares same gradient
    const noFlip = generateGradientPalette(['#ef4444'], {
      direction: 'vertical',
      reverseOnNegative: false
    });
    bar.config = {
      width: 520,
      height: 320,
      layout: 'vertical',
      indexBy: 'q',
      keys: ['Net'],
      data: [
        { q: 'Q1', Net: 100 },
        { q: 'Q2', Net: -60 }
      ],
      ...noFlip
    };
    const sameRects = Array.from(bar.shadowRoot!.querySelectorAll<SVGRectElement>('rect.mc-bar-rect'));
    expect(sameRects[0].getAttribute('fill')).toBe(sameRects[1].getAttribute('fill'));
  });

  it('mounts the interactive directional gradient demo in the Themes guide and toggles layout & direction live', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const charts = renderThemesGuide(root, 'dark');
    // Themes guide now mounts: Ex1 bar + pie (2), Ex2 gen bar (1), Ex3 gradient bar (1), Ex4 brand line (1) = 5 charts
    expect(charts.length).toBe(5);

    const gradChart = charts[3];
    const horizBtn = root.querySelector<HTMLButtonElement>('[data-grad-layout="horizontal"]')!;
    const seedBtn = root.querySelector<HTMLButtonElement>('[data-grad-source="seed"]')!;
    const angleBadge = root.querySelector<HTMLElement>('#grad-angle-badge')!;

    expect(angleBadge.textContent).toContain('0° top→bottom');
    expect(angleBadge.textContent).toContain('180° bottom→top');

    horizBtn.click();
    expect(gradChart.config.layout).toBe('horizontal');
    expect(angleBadge.textContent).toContain('270° right→left');
    expect(angleBadge.textContent).toContain('90° left→right');

    seedBtn.click();
    const swatches = root.querySelectorAll('#grad-swatch-strip > div');
    expect(swatches.length).toBe(20);
  });

  it('places fallback bar labels to the right/left on thin horizontal bars and below on narrow negative vertical bars', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    // 1. Thin horizontal grouped diverging bars -> labels outside right (positive) & left (negative), centered vertically on each bar
    bar.config = {
      width: 480,
      height: 220,
      layout: 'horizontal',
      groupMode: 'grouped',
      margin: { top: 32, right: 40, bottom: 48, left: 56 },
      indexBy: 'q',
      keys: ['A', 'B', 'C'],
      data: [
        { q: 'Q1', A: 120, B: -48, C: 62 },
        { q: 'Q2', A: 94, B: 76, C: -54 },
        { q: 'Q3', A: -64, B: 112, C: 85 },
        { q: 'Q4', A: 146, B: -38, C: -72 }
      ]
    };

    const rects = Array.from(bar.shadowRoot!.querySelectorAll<SVGRectElement>('rect.mc-bar-rect'));
    const labels = Array.from(bar.shadowRoot!.querySelectorAll<SVGGElement>('.mc-layer--labels .mc-label'));
    expect(rects.length).toBe(12);
    expect(labels.length).toBe(12);

    const parseTranslate = (el: Element): [number, number] => {
      const m = /translate\(\s*([^,\s)]+)[,\s]+([^)]+)\)/.exec(
        el.getAttribute('transform') ?? ''
      );
      expect(m).not.toBeNull();
      return [Number(m![1]), Number(m![2])];
    };

    // First bar is Q1/A = +120 (positive horizontal) -> label right of bar, vertically aligned with bar midpoint
    const posRect = rects[0];
    const posText = labels[0].querySelector('text')!;
    const [posLabelX, posLabelY] = parseTranslate(labels[0]);
    const posX = Number(posRect.getAttribute('x'));
    const posW = Number(posRect.getAttribute('width'));
    const posMidY = Number(posRect.getAttribute('y')) + Number(posRect.getAttribute('height')) / 2;
    expect(posText.getAttribute('text-anchor')).toBe('start');
    expect(posLabelX).toBeCloseTo(posX + posW + 6, 1);
    expect(posLabelY).toBeCloseTo(posMidY, 1);

    // Second bar is Q1/B = -48 (negative horizontal) -> label left of bar, vertically aligned with bar midpoint
    const negRect = rects[1];
    const negText = labels[1].querySelector('text')!;
    const [negLabelX, negLabelY] = parseTranslate(labels[1]);
    const negX = Number(negRect.getAttribute('x'));
    const negMidY = Number(negRect.getAttribute('y')) + Number(negRect.getAttribute('height')) / 2;
    expect(negText.getAttribute('text-anchor')).toBe('end');
    expect(negLabelX).toBeCloseTo(negX - 6, 1);
    expect(negLabelY).toBeCloseTo(negMidY, 1);

    // 2. Narrow vertical diverging bars -> negative bar label falls back BELOW bar (not above onto zero axis)
    bar.config = {
      ...bar.config,
      width: 260,
      height: 220,
      layout: 'vertical'
    };
    const vRects = Array.from(bar.shadowRoot!.querySelectorAll<SVGRectElement>('rect.mc-bar-rect'));
    const vLabels = Array.from(bar.shadowRoot!.querySelectorAll<SVGGElement>('.mc-layer--labels .mc-label'));
    const vNegRect = vRects[1]; // Q1/B = -48
    const [, vNegLabelY] = parseTranslate(vLabels[1]);
    const vNegBottom = Number(vNegRect.getAttribute('y')) + Number(vNegRect.getAttribute('height'));
    expect(vNegLabelY).toBeGreaterThan(vNegBottom);
  });
});
