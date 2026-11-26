import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PALETTES, generateColorPalette, type MCBaseChart } from '../src/index';
import { extractChartConfigBlock, formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

const paletteKey = 'modern-charts-palette';
const appearanceKey = 'modern-charts-theme-mode';
let paletteSelect: HTMLSelectElement;
let appearanceSelect: HTMLSelectElement;
let systemIsDark = false;
let onSystemAppearanceChange: (() => void) | undefined;
let deliverPreviewIntersections: IntersectionObserverCallback;
let neutralColors: string[];

function select(control: HTMLSelectElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function route(hash: string) {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new Event('hashchange'));
}

function detailChart() {
  return document.querySelector<MCBaseChart<any>>('#detail-chart-stage > *')!;
}

async function revealPreview(chartId: string) {
  let observedStage: HTMLElement | null = null;
  return vi.waitFor(() => {
    const stage = document.getElementById(`preview-stage-${chartId}`)!;
    expect(stage).not.toBeNull();
    // Happy DOM can deliver a queued hashchange after a test has dispatched one.
    if (observedStage !== stage) {
      observedStage = stage;
      deliverPreviewIntersections(
        [{ target: stage.closest('.overview-card')!, isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    }
    const chart = stage.querySelector<MCBaseChart<any>>(':scope > *');
    expect(chart).not.toBeNull();
    return chart!;
  });
}

beforeAll(async () => {
  const fsModule = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fsModule);
  const html = readFileSync('apps/studio/index.html', 'utf8');
  const template = document.createElement('template');
  template.innerHTML = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  template.content.querySelectorAll('script').forEach((script) => script.remove());
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
  document.body.replaceChildren(template.content.cloneNode(true));
  localStorage.clear();
  localStorage.setItem(paletteKey, 'neutral');
  localStorage.setItem(appearanceKey, 'dark');
  history.replaceState(null, '', '#/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    get matches() { return query.includes('prefers-color-scheme') ? systemIsDark : true; },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (query.includes('prefers-color-scheme')) onSystemAppearanceChange = listener;
    },
    removeEventListener: () => {}
  }) as unknown as MediaQueryList);
  vi.stubGlobal('IntersectionObserver', class PreviewObserver {
    constructor(callback: IntersectionObserverCallback) {
      deliverPreviewIntersections = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  await import('../apps/studio/main');
  const { STUDIO_PALETTES } = await import('../apps/studio/state/theme');
  neutralColors = STUDIO_PALETTES.neutral;
  paletteSelect = document.querySelector('#global-palette-select')!;
  appearanceSelect = document.querySelector('#global-appearance-select')!;
}, 15_000);

afterEach(() => {
  route('#/');
  select(paletteSelect, 'shadcn');
  select(appearanceSelect, 'system');
});

afterAll(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Studio Theme and Appearance controls', () => {
  it('restores the generated Neutral palette and independent appearance preference', () => {
    expect(paletteSelect.value).toBe('neutral');
    expect(appearanceSelect.value).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(Array.from(paletteSelect.options, (option) => option.value)).toEqual(['shadcn', 'material', 'bootstrap', 'antd', 'neutral']);
    expect(paletteSelect.selectedOptions[0].textContent).toBe('Neutral (generated)');
    expect(neutralColors).toHaveLength(20);
    expect(neutralColors[0]).toBe('#737373');
    expect(new Set(neutralColors)).toEqual(new Set(generateColorPalette('#737373', 32).slice(6, -6)));
    expect(document.querySelector('label[for="global-palette-select"]')!.textContent).toBe('Theme:');
    expect(document.querySelector('label[for="global-appearance-select"]')!.textContent).toBe('Appearance:');
    expect(paletteSelect.compareDocumentPosition(appearanceSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('.global-controls-help')).toBeNull();
    expect(document.querySelector('nav a[href="#/guide/themes"]')).not.toBeNull();
  }, 15_000);

  it('applies the selected palette and appearance to existing and newly visible previews', async () => {
    const bar = await revealPreview('bar');
    const { data, markers, layers } = bar.config;
    select(paletteSelect, 'neutral');
    expect(bar.config.palette).toBe('neutral');
    expect(bar.resolveTheme().colors).toEqual(neutralColors);
    expect(bar.config.data).toBe(data);
    expect(bar.config.markers).toBe(markers);
    expect(bar.config.layers).toBe(layers);
    expect(appearanceSelect.value).toBe('system');
    expect(localStorage.getItem(paletteKey)).toBe('neutral');
    select(appearanceSelect, 'dark');
    expect(bar.resolveTheme().mode).toBe('dark');
    expect(bar.resolveTheme().colors).toEqual(neutralColors);
    expect(localStorage.getItem(appearanceKey)).toBe('dark');

    const line = await revealPreview('line');
    expect(line.resolveTheme().mode).toBe('dark');
    expect(line.resolveTheme().colors).toEqual(neutralColors);
  }, 15_000);

  it('keeps the selected theme and restores chart, controls, and markup from either reset button', async () => {
    select(paletteSelect, 'bootstrap');
    select(appearanceSelect, 'dark');
    route('#/chart/bar');
    await vi.waitFor(() => expect(detailChart()?.config.palette).toBe('bootstrap'));
    const defaultTitle = detailChart().config.title;
    const defaultData = detailChart().config.data;
    const editor = document.querySelector<HTMLTextAreaElement>('#detail-html-preview')!;
    editor.value = formatConfigAssignment({
      ...detailChart().config,
      title: 'My saved chart',
      enableLabels: false,
      data: [{ quarter: 'Q5', Cloud: 88, Edge: 60, OnPrem: 42 }],
      i18n: { locale: 'de-DE' },
      colors: ['#123456']
    });
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(detailChart().config.title).toBe('My saved chart');
    const data = detailChart().config.data;
    select(paletteSelect, 'antd');
    expect(detailChart().config.title).toBe('My saved chart');
    expect(detailChart().config.data).toBe(data);
    expect(detailChart().resolveI18n().locale).toBe('de-DE');
    expect(detailChart().resolveTheme().colors).toEqual(['#123456']);
    route('#/');
    route('#/chart/bar');
    expect(detailChart().config.palette).toBe('antd');
    const labelsControl = document.querySelector<HTMLInputElement>('[data-config-path="enableLabels"] input')!;
    expect(labelsControl.checked).toBe(false);
    const axesChip = Array.from(document.querySelectorAll<HTMLButtonElement>('#detail-layer-chips button'))
      .find((chip) => chip.textContent?.endsWith('axes'))!;
    axesChip.click();
    expect(detailChart().getActiveLayers()).not.toContain('axes');
    document.querySelector<HTMLButtonElement>('#btn-reset-default-attrs')!.click();

    expect(detailChart().config.palette).toBe('antd');
    expect(detailChart().resolveTheme().colors).toEqual(PALETTES.antd);
    expect(detailChart().config.themeMode).toBe('dark');
    expect(detailChart().config.title).toBe(defaultTitle);
    expect(detailChart().config.data).toEqual(defaultData);
    expect(detailChart().getActiveLayers()).toContain('axes');
    expect(labelsControl.checked).toBe(true);
    const resetCode = document.querySelector<HTMLTextAreaElement>('#detail-html-preview')!.value;
    const resetConfig = parseConfigObjectLiteral(extractChartConfigBlock(resetCode)!);
    expect(resetConfig.title).toBe(defaultTitle);
    expect(resetConfig.data).toEqual(defaultData);

    const markerControl = () => document.querySelector<HTMLInputElement>('[data-config-path="__markerEnabled"] input')!;
    expect(markerControl().checked).toBe(true);
    markerControl().click();
    expect(detailChart().config.markers).toEqual([]);
    route('#/');
    route('#/chart/bar');
    expect(markerControl().checked).toBe(false);
    document.querySelector<HTMLButtonElement>('#btn-reset-config')!.click();
    expect(markerControl().checked).toBe(true);
    expect(detailChart().config.markers?.length).toBeGreaterThan(0);
  }, 15_000);

  it('recolors the heatmap and its legend while preserving an explicit color scheme', async () => {
    const galleryChart = await revealPreview('heatmap');

    const readColors = (chart: MCBaseChart<any>) => {
      const root = chart.shadowRoot!;
      const cells = Array.from(root.querySelectorAll('.mc-heatmap-cell'));
      const fills = cells.map((cell) => cell.getAttribute('fill'));
      const minFill = root.querySelector('.mc-heatmap-cell[data-row="Fri"][data-col="00:00"]')!
        .getAttribute('fill');
      const maxFill = root.querySelector('.mc-heatmap-cell[data-row="Wed"][data-col="12:00"]')!
        .getAttribute('fill');
      const legendStops = Array.from(
        root.querySelectorAll('linearGradient[id^="mc-legend-continuous-grad"] stop'),
        (stop) => stop.getAttribute('stop-color')
      );
      expect(legendStops[0]).toBe(minFill);
      expect(legendStops.at(-1)).toBe(maxFill);
      return { fills, minFill, legendStops };
    };

    select(paletteSelect, 'shadcn');
    const shadcn = readColors(galleryChart);
    select(paletteSelect, 'neutral');
    const neutral = readColors(galleryChart);
    expect(neutral.fills).not.toEqual(shadcn.fills);
    expect(neutral.legendStops).not.toEqual(shadcn.legendStops);
    for (const color of [...neutral.fills, ...neutral.legendStops]) {
      expect(color).toMatch(/^rgb\((\d+), \1, \1\)$/);
    }

    route('#/chart/heatmap');
    expect(readColors(detailChart())).toEqual(neutral);
    select(paletteSelect, 'shadcn');
    expect(readColors(detailChart())).toEqual(shadcn);

    const scheme = document.querySelector<HTMLSelectElement>('[data-config-path="colorScheme"] select')!;
    select(scheme, 'viridis');
    const viridis = readColors(detailChart());
    expect(viridis.minFill).toBe('rgb(68, 1, 84)');
    select(paletteSelect, 'neutral');
    expect(readColors(detailChart())).toEqual(viridis);

    document.querySelector<HTMLButtonElement>('#btn-reset-config')!.click();
    expect(readColors(detailChart())).toEqual(neutral);
  }, 15_000);

  it('applies heatmap legend controls to the chart and generated config', async () => {
    route('#/chart/heatmap');
    const mode = () => document.querySelector<HTMLSelectElement>('[data-config-path="legend.type"] select')!;
    await vi.waitFor(() => expect(mode()?.value).toBe('continuous'));
    const chart = detailChart();
    const swatches = () => chart.shadowRoot!.querySelectorAll('.mc-legend-discrete-block');
    const steps = document.querySelector<HTMLInputElement>('[data-config-path="legend.steps"] input')!;
    const position = document.querySelector<HTMLSelectElement>('[data-config-path="legend.position"] select')!;
    const labelPlacement = document.querySelector<HTMLSelectElement>('[data-config-path="legend.labelPlacement"] select')!;
    const numberStyle = document.querySelector<HTMLSelectElement>('[data-config-path="legend.tickFormat.style"] select')!;
    const precision = document.querySelector<HTMLInputElement>('[data-config-path="legend.tickFormat.maximumFractionDigits"] input')!;

    expect(steps.closest<HTMLElement>('.attr-row')?.hidden).toBe(true);
    select(mode(), 'discrete');
    expect(steps.closest<HTMLElement>('.attr-row')?.hidden).toBe(false);
    expect(swatches()).toHaveLength(10);
    steps.value = '5';
    steps.dispatchEvent(new Event('input', { bubbles: true }));
    select(position, 'bottom');
    select(labelPlacement, 'ticks');
    expect(swatches()).toHaveLength(5);
    const legend = chart.shadowRoot!.querySelector('.mc-legend--discrete[data-legend-position="bottom"]')!;
    expect(legend.querySelectorAll('.mc-legend-tick')).toHaveLength(6);

    select(numberStyle, 'percent');
    precision.value = '0';
    precision.dispatchEvent(new Event('input', { bubbles: true }));
    const editor = document.querySelector<HTMLTextAreaElement>('#detail-html-preview')!;
    const generatedLegend = () => parseConfigObjectLiteral(extractChartConfigBlock(editor.value)!).legend;
    expect(generatedLegend()).toMatchObject({
      type: 'discrete', steps: 5, position: 'bottom', labelPlacement: 'ticks',
      tickFormat: { style: 'percent', maximumFractionDigits: 0 }
    });
    select(numberStyle, '');
    expect(generatedLegend().tickFormat).toEqual({ maximumFractionDigits: 0 });
    precision.value = '';
    precision.dispatchEvent(new Event('input', { bubbles: true }));
    expect(generatedLegend().tickFormat).toBeUndefined();

    document.querySelector<HTMLButtonElement>('#btn-reset-default-attrs')!.click();
    expect(mode().value).toBe('continuous');
    expect(detailChart().shadowRoot!.querySelector('.mc-legend--continuous')).not.toBeNull();
  });

  it('keeps lazy guide navigation and editors consistent with the selected theme', async () => {
    select(paletteSelect, 'bootstrap');
    route('#/guide/i18n');
    route('#/guide/themes');
    select(appearanceSelect, 'dark');
    const guideBar = () => document.querySelector<MCBaseChart<any>>('#guide-theme-bar > *')!;
    const editor = () => document.querySelector<HTMLTextAreaElement>('#guide-theme-code-1 textarea')!;
    await vi.waitFor(() => expect(guideBar()).not.toBeNull());
    expect(guideBar().config.palette).toBe('bootstrap');
    expect(document.querySelector<HTMLSelectElement>('#grad-palette-select')!.value).toBe('bootstrap');
    expect(parseConfigObjectLiteral(editor().value).palette).toBe('bootstrap');
    expect(guideBar().resolveTheme().mode).toBe('dark');
    select(appearanceSelect, 'light');
    expect(guideBar().config.palette).toBe('bootstrap');
    expect(guideBar().resolveTheme().mode).toBe('light');
    select(paletteSelect, 'neutral');
    expect(document.querySelector<HTMLSelectElement>('#grad-palette-select')!.value).toBe('neutral');
    const custom = document.querySelector<MCBaseChart<any>>('#guide-custom-theme-chart > *')!;
    expect(custom.config.colors).toEqual(['#b91c1c', '#1d4ed8', '#15803d']);
    expect(custom.config.theme?.background).toBe('#faf6ef');
    route('#/guide/i18n');
    const localizedChart = document.querySelector<MCBaseChart<any>>('#i18n-numbers mc-bar-chart')!;
    const localizedEditor = document.querySelector<HTMLTextAreaElement>('#i18n-numbers textarea')!;
    expect(localizedChart.config.palette).toBe('neutral');
    expect(parseConfigObjectLiteral(localizedEditor.value).palette).toBe('neutral');
    expect(localizedChart.resolveI18n().locale).toBe('de-DE');
  }, 15_000);

  it('synchronizes palette changes across tabs and keeps OS appearance updates independent', () => {
    localStorage.setItem(paletteKey, 'neutral');
    window.dispatchEvent(new StorageEvent('storage', { key: paletteKey, newValue: 'neutral' }));
    expect(paletteSelect.value).toBe('neutral');
    select(appearanceSelect, 'system');
    systemIsDark = true;
    onSystemAppearanceChange!();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(appearanceSelect.value).toBe('system');
    expect(paletteSelect.value).toBe('neutral');
    localStorage.setItem(paletteKey, 'unknown-theme');
    window.dispatchEvent(new StorageEvent('storage', { key: paletteKey, newValue: 'unknown-theme' }));
    expect(paletteSelect.value).toBe('shadcn');
    expect(appearanceSelect.value).toBe('system');
    systemIsDark = false;
  }, 15_000);

  it('recolors rendered line and bar series when switching to Neutral while keeping threshold overrides scoped and preserving explicit series colors (Issue #99)', async () => {
    select(paletteSelect, 'neutral');
    const [neutral0, neutral1, neutral2] = neutralColors;

    // 1. Overview gallery: Line & Area and Bar & Stack reflect Neutral palette in rendered SVG
    const overviewLine = await revealPreview('line');
    const overviewBar = await revealPreview('bar');

    // Inference (120..276) is completely above SLA < 90, so its path and area use neutral0 (#737373)
    const inferencePath = overviewLine.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="Inference"]'
    )!;
    expect(inferencePath.getAttribute('stroke')).toBe(neutral0);
    const edgeBaseSeg = overviewLine.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="Edge"] .mc-line-segment--base'
    )!;
    const legacyBaseSeg = overviewLine.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="Legacy"] .mc-line-segment--base'
    )!;
    expect(edgeBaseSeg.getAttribute('stroke')).toBe(neutral1);
    expect(legacyBaseSeg.getAttribute('stroke')).toBe(neutral2);

    // Legacy crosses below SLA < 90 in Jun-Jul (85, 72), so its threshold segment is red
    const legacyThreshSeg = overviewLine.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="Legacy"] .mc-line-segment--threshold'
    )!;
    expect(legacyThreshSeg.getAttribute('stroke')).toBe('#ef4444');

    // Bar chart: 10 of 12 bars are above Floor $50K and render as full Neutral rects (no red split)
    const q1Cloud = overviewBar.shadowRoot!.querySelector<SVGRectElement>(
      '[data-item-component="mc-bar-item"][data-key="Cloud"][data-index="Q1"]'
    )!;
    const q1Edge = overviewBar.shadowRoot!.querySelector<SVGRectElement>(
      '[data-item-component="mc-bar-item"][data-key="Edge"][data-index="Q1"]'
    )!;
    const q1OnPrem = overviewBar.shadowRoot!.querySelector<SVGRectElement>(
      '[data-item-component="mc-bar-item"][data-key="OnPrem"][data-index="Q1"]'
    )!;
    expect(q1Cloud.tagName.toLowerCase()).toBe('rect');
    expect(q1Cloud.getAttribute('fill')).toBe(neutral0);
    expect(q1Edge.tagName.toLowerCase()).toBe('rect');
    expect(q1Edge.getAttribute('fill')).toBe(neutral1);
    expect(q1OnPrem.tagName.toLowerCase()).toBe('rect');
    expect(q1OnPrem.getAttribute('fill')).toBe(neutral2);

    // Only Q3 OnPrem (49) and Q4 OnPrem (44) fall below $50K and receive the #ef4444 threshold fill
    const q3OnPrem = overviewBar.shadowRoot!.querySelector<SVGRectElement>(
      '[data-item-component="mc-bar-item"][data-key="OnPrem"][data-index="Q3"]'
    )!;
    const q4OnPrem = overviewBar.shadowRoot!.querySelector<SVGRectElement>(
      '[data-item-component="mc-bar-item"][data-key="OnPrem"][data-index="Q4"]'
    )!;
    expect(q3OnPrem.getAttribute('fill')).toBe('#ef4444');
    expect(q4OnPrem.getAttribute('fill')).toBe('#ef4444');

    // 2. Detail playground: Line chart responds to theme switch and still respects explicit series.color overrides
    route('#/chart/line');
    const lineDetail = detailChart();
    expect(
      lineDetail.shadowRoot!
        .querySelector<SVGPathElement>('.mc-line-path[data-series-id="Inference"]')!
        .getAttribute('stroke')
    ).toBe(neutral0);

    const editor = document.querySelector<HTMLTextAreaElement>('#detail-html-preview')!;
    const exportedConfig = parseConfigObjectLiteral(extractChartConfigBlock(editor.value)!);
    expect(exportedConfig.colors).toEqual(neutralColors);
    editor.value = formatConfigAssignment({ ...exportedConfig, title: 'Edited Neutral example' });
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(lineDetail.config.title).toBe('Edited Neutral example');
    expect(lineDetail.config.colors).toBeUndefined();

    // Explicit series.color override still takes precedence over the selected palette
    lineDetail.setConfig({
      ...lineDetail.config,
      data: lineDetail.config.data.map((s: any, idx: number) =>
        idx === 0 ? { ...s, color: '#123456' } : s
      )
    });
    expect(
      lineDetail.shadowRoot!
        .querySelector<SVGPathElement>('.mc-line-path[data-series-id="Inference"]')!
        .getAttribute('stroke')
    ).toBe('#123456');
  }, 15_000);
});
