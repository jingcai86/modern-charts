import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureChartFeatures,
  configureI18n,
  getChartFeatures,
  isChartFeatureEnabled,
  registerModernCharts,
  type MCBaseChart
} from '../src/index';
import { registerBarChart } from '../src/entries/bar';
import { registerLineChart } from '../src/entries/line';
import { registerPieChart } from '../src/entries/pie';
import { registerHeatmapChart } from '../src/entries/heatmap';
import { registerRadarChart } from '../src/entries/radar';
import { registerSunburstChart } from '../src/entries/sunburst';
import { registerSankeyChart } from '../src/entries/sankey';
import { registerScatterChart } from '../src/entries/scatter';
import { registerTreemapChart } from '../src/entries/treemap';
import { registerGaugeChart } from '../src/entries/gauge';
import {
  CHART_CATALOG,
  getAllAttributesForChart
} from '../apps/studio/catalog';
import { SAMPLE_BAR_DATA, SAMPLE_LINE_DATA } from '../apps/studio/sample-data';
import { renderChartDetailPage } from '../apps/studio/pages/chart-detail';
import { resetChartConfig } from '../apps/studio/state/config-store';
import { GUIDES_CATALOG, renderGuidePage } from '../apps/studio/guides';
import {
  extractChartConfigBlock,
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';

beforeAll(async () => {
  await registerModernCharts();
});

afterEach(async () => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  configureI18n({});
  await configureChartFeatures({ features: { zoom: false, csvExport: false } });
  for (const entry of CHART_CATALOG) {
    resetChartConfig(entry);
  }
});

describe('Opt-in zoom feature bootstrapping (default false across all charts)', () => {
  it('defaults zoom feature to false on registerModernCharts() and all 10 register<Chart>() entrypoints, and enables when features.zoom is true', async () => {
    await configureChartFeatures({ features: { zoom: false } });
    expect(isChartFeatureEnabled('zoom')).toBe(false);
    expect(getChartFeatures().zoom).toBe(false);

    // Calling registerModernCharts() and all 10 per-chart registrars without options keeps zoom: false
    await registerModernCharts();
    const registrars = [
      registerBarChart,
      registerLineChart,
      registerPieChart,
      registerHeatmapChart,
      registerRadarChart,
      registerSunburstChart,
      registerSankeyChart,
      registerScatterChart,
      registerTreemapChart,
      registerGaugeChart
    ];
    for (const registerFn of registrars) {
      await registerFn();
      expect(isChartFeatureEnabled('zoom')).toBe(false);
    }

    // Mount a chart while zoom feature is false (default)
    const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
    bar.config = {
      width: 480,
      height: 280,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud'],
      data: SAMPLE_BAR_DATA,
      view: { zoomable: true, pannable: true, showControls: true }
    };
    document.body.appendChild(bar);

    expect(bar.isFeatureEnabled('zoom')).toBe(false);
    expect(bar.zoomable).toBe(false);
    const controls = bar.shadowRoot!.querySelector<HTMLElement>(
      '.mc-view-controls'
    )!;
    expect(controls.hidden).toBe(true);
    expect(bar.toggleZoom()).toBe(false);
    bar.zoomIn();
    bar.zoomOut();
    bar.resetZoom();
    expect(
      bar.shadowRoot!.querySelector('.mc-chart-viewport')!.hasAttribute('transform')
    ).toBe(false);

    // Enable zoom via per-chart bootstrap function
    await registerBarChart({ features: { zoom: true } });
    expect(isChartFeatureEnabled('zoom')).toBe(true);
    expect(bar.isFeatureEnabled('zoom')).toBe(true);
    expect(bar.zoomable).toBe(true);
    expect(controls.hidden).toBe(false);

    bar.zoomIn();
    expect(
      bar.shadowRoot!.querySelector('.mc-chart-viewport')!.getAttribute('transform')
    ).toContain('scale(1.25)');

    // Disabling zoom feature at runtime hides controls and resets transform
    await registerBarChart({ features: { zoom: false } });
    expect(bar.isFeatureEnabled('zoom')).toBe(false);
    expect(controls.hidden).toBe(true);
    expect(
      bar.shadowRoot!.querySelector('.mc-chart-viewport')!.hasAttribute('transform')
    ).toBe(false);
  });
});

describe('Dedicated Zoom on/off button and zoom support across all 10 chart types (Issue #125)', () => {
  it('enables zoom support in Studio catalog and renders a keyboard-accessible Zoom on/off toggle button for all 10 charts', async () => {
    await registerModernCharts({ features: { zoom: true } });
    expect(CHART_CATALOG).toHaveLength(10);

    for (const entry of CHART_CATALOG) {
      expect(entry.supportsViewZoom, entry.id).toBe(true);
      expect(entry.subComponents, entry.id).toContain('mc-view-layer');
      const attrs = getAllAttributesForChart(entry).map((a) => a.configPath);
      expect(attrs, entry.id).toContain('view.zoomable');
      expect(attrs, entry.id).toContain('view.pannable');
      expect(attrs, entry.id).toContain('view.showControls');
      expect(attrs, entry.id).toContain('view.maxZoom');

      const root = document.createElement('div');
      document.body.appendChild(root);
      const chart = renderChartDetailPage(root, entry);

      // Studio toolbar has the dedicated Zoom on/off button
      const studioZoomBtn = root.querySelector<HTMLButtonElement>(
        '#btn-detail-zoom-toggle'
      )!;
      expect(studioZoomBtn, entry.id).not.toBeNull();
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(studioZoomBtn.getAttribute('data-zoom-state'), entry.id).toBe(
        'on'
      );

      // On-chart shared view controls have [data-zoom="toggle"], [data-zoom="in"], [data-zoom="out"], [data-zoom="reset"]
      const controls = chart.shadowRoot!.querySelector<HTMLElement>(
        '.mc-view-controls'
      )!;
      expect(controls.hidden, entry.id).toBe(false);
      const onChartToggle = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="toggle"]'
      )!;
      const zoomInBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="in"]'
      )!;
      const zoomOutBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="out"]'
      )!;
      const resetBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="reset"]'
      )!;
      expect(onChartToggle, entry.id).not.toBeNull();
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(onChartToggle.textContent, entry.id).toBe('Zoom: On');

      // 1. Zoom in while zoom is enabled
      const viewport = chart.shadowRoot!.querySelector<SVGGElement>(
        '.mc-chart-viewport'
      )!;
      zoomInBtn.click();
      const zoomedTransform = viewport.getAttribute('transform');
      expect(zoomedTransform, entry.id).toContain('scale(1.25)');

      // 2. Toggle zoom OFF via keyboard (Enter key) on the on-chart toggle button
      onChartToggle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      expect(chart.zoomable, entry.id).toBe(false);
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe(
        'false'
      );
      expect(onChartToggle.getAttribute('data-zoom-state'), entry.id).toBe(
        'off'
      );
      expect(onChartToggle.textContent, entry.id).toBe('Zoom: Off');
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe(
        'false'
      );
      expect(zoomInBtn.disabled, entry.id).toBe(true);
      expect(zoomOutBtn.disabled, entry.id).toBe(true);
      expect(resetBtn.disabled, entry.id).toBe(true);

      // 3. Disabling zoom prevents zoom controls (+, −, Reset) and wheel gestures from changing the view
      zoomInBtn.click();
      zoomOutBtn.click();
      resetBtn.click();
      chart.zoomIn();
      chart.zoomOut();
      chart.resetZoom();
      const svg = chart.shadowRoot!.querySelector<SVGSVGElement>(
        '.mc-chart-svg'
      )!;
      const wheelEvent = Object.assign(
        new MouseEvent('wheel', {
          clientX: 120,
          clientY: 120,
          cancelable: true
        }),
        { deltaY: -20, deltaMode: WheelEvent.DOM_DELTA_LINE }
      );
      expect(svg.dispatchEvent(wheelEvent), entry.id).toBe(true);
      expect(viewport.getAttribute('transform'), entry.id).toBe(
        zoomedTransform
      );

      // 4. Re-enable zoom via keyboard (Space key) on Studio's dedicated Zoom on/off button
      studioZoomBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      studioZoomBtn.dispatchEvent(
        new KeyboardEvent('keyup', { key: ' ', bubbles: true })
      );
      expect(chart.zoomable, entry.id).toBe(true);
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(zoomInBtn.disabled, entry.id).toBe(false);

      // 5. Reset button works again once zoom is re-enabled
      resetBtn.click();
      expect(viewport.getAttribute('transform'), entry.id).toBe(
        'translate(0, 0) scale(1)'
      );

      // 6. Programmatic zoomable setter and setZoomEnabled helper
      chart.zoomable = false;
      expect(chart.zoomable, entry.id).toBe(false);
      expect(chart.setZoomEnabled(true), entry.id).toBe(true);
      expect(chart.zoomable, entry.id).toBe(true);

      root.remove();
    }
  }, 20000);

  it('prevents brush and slider zoom gestures from changing the view when zoom is disabled', async () => {
    await registerModernCharts({ features: { zoom: true } });
    const line = document.createElement('mc-line-chart') as MCBaseChart<any>;
    line.config = {
      width: 500,
      height: 300,
      animate: false,
      data: SAMPLE_LINE_DATA,
      view: {
        zoomable: true,
        pannable: false,
        brush: true,
        slider: true,
        showControls: true
      }
    };
    document.body.appendChild(line);

    const svg = line.shadowRoot!.querySelector<SVGSVGElement>('.mc-chart-svg')!;
    const viewport = line.shadowRoot!.querySelector<SVGGElement>(
      '.mc-chart-viewport'
    )!;

    line.viewConfig = {
      zoomable: true,
      pannable: false,
      brush: true,
      slider: true,
      showControls: true
    };
    const slider = line.shadowRoot!.querySelector<HTMLElement>(
      '.mc-view-slider'
    )!;
    const sliderWindow = slider.querySelector<HTMLElement>(
      '.mc-view-slider-window'
    )!;

    // Start an active brush drag, then toggle zoom off mid-gesture to verify cleanup
    svg.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 60, clientY: 60 })
    );
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 160, clientY: 140 })
    );
    expect(svg.querySelector('.mc-view-brush')).not.toBeNull();

    // Disable zoom via toggleZoom(false)
    line.toggleZoom(false);
    expect(line.zoomable).toBe(false);
    expect(slider.getAttribute('aria-disabled')).toBe('true');

    // Attempt brush drag while zoom is disabled
    svg.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 80, clientY: 80 })
    );
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 240, clientY: 180 })
    );
    expect(svg.querySelector('.mc-view-brush')).toBeNull();
    svg.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 240, clientY: 180 })
    );
    expect(viewport.hasAttribute('transform')).toBe(false);

    // Attempt slider drag while zoom is disabled
    sliderWindow.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100 })
    );
    slider.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 220 })
    );
    slider.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 220 })
    );
    expect(viewport.hasAttribute('transform')).toBe(false);

    // Spacebar keyup activation on on-chart toggle button re-enables zoom
    const onChartToggle = line.shadowRoot!.querySelector<HTMLButtonElement>(
      'button[data-zoom="toggle"]'
    )!;
    onChartToggle.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    onChartToggle.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true })
    );
    expect(line.zoomable).toBe(true);
  });
});

describe('Zoom Controls & Bootstrapping Studio guides', () => {
  function editExampleConfig(
    editor: HTMLTextAreaElement,
    update: (config: Record<string, any>) => void
  ) {
    const block = extractChartConfigBlock(editor.value)!;
    const config = parseConfigObjectLiteral(block);
    update(config);
    editor.value = editor.value.replace(block, () => formatConfigAssignment(config, ''));
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('renders interactive zoom toggle controls and all 10 chart switchers in view-zoom guide', () => {
    expect(
      GUIDES_CATALOG.find((g) => g.id === 'view-zoom')?.title
    ).toContain('Zoom Controls & Viewport Lock');

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'view-zoom', 'dark');
    expect(charts).toHaveLength(2);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Example 1: Zoom toggle, zoom in/out/reset, and live config editor synchronization
    const ex1 = root.querySelector<HTMLElement>('#vz-zoom-toggle')!;
    const toggleBtn1 = ex1.querySelector<HTMLButtonElement>(
      '#vz-zoom-toggle-btn'
    )!;
    const zoomInBtn1 = ex1.querySelector<HTMLButtonElement>('#vz-zoom-in-btn')!;
    const zoomOutBtn1 =
      ex1.querySelector<HTMLButtonElement>('#vz-zoom-out-btn')!;
    const zoomResetBtn1 =
      ex1.querySelector<HTMLButtonElement>('#vz-zoom-reset-btn')!;
    const editor1 = ex1.querySelector<HTMLTextAreaElement>('textarea')!;

    zoomInBtn1.click();
    expect(ex1.querySelector('#vz-readout-1')!.textContent).toContain(
      'scale(1.25)'
    );
    zoomOutBtn1.click();
    zoomResetBtn1.click();
    expect(ex1.querySelector('#vz-readout-1')!.textContent).toContain(
      'scale(1)'
    );

    toggleBtn1.click();
    expect(log.mock.calls).toEqual([['Zoom enabled:', false]]);
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('false');
    expect(zoomInBtn1.disabled).toBe(true);
    expect(parseConfigObjectLiteral(extractChartConfigBlock(editor1.value)!).view.zoomable)
      .toBe(false);

    // Re-enable via on-chart toggle button in Example 1
    charts[0]
      .shadowRoot!.querySelector<HTMLButtonElement>(
        'button[data-zoom="toggle"]'
      )!
      .click();
    expect(log.mock.calls).toEqual([
      ['Zoom enabled:', false],
      ['Zoom enabled:', true]
    ]);
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('true');

    // Reset button on live config editor 1
    ex1.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('true');

    // Update from live config editor 1
    editExampleConfig(editor1, (config) => { config.view.zoomable = false; });
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('false');

    // Example 2: Switching across all 10 chart types updates active chart zoom readout
    const ex2 = root.querySelector<HTMLElement>('#vz-chart-types')!;
    const readout2 = ex2.querySelector<HTMLElement>('#vz-readout-2')!;
    const editor2 = ex2.querySelector<HTMLTextAreaElement>('textarea')!;
    const typeBtns = Array.from(
      ex2.querySelectorAll<HTMLButtonElement>('button[data-vz-chart-type]')
    );
    expect(typeBtns).toHaveLength(10);

    for (const btn of typeBtns) {
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(readout2.textContent).toContain('zoomable: true');
    }

    // Trigger on-chart zoom and toggle on Example 2 active chart + editor2 input & reset
    const activeChart2 = ex2.querySelector('mc-gauge-chart') as MCBaseChart<any>;
    activeChart2.zoomIn();
    expect(log).toHaveBeenLastCalledWith('Viewport:', {
      k: 1.25,
      x: expect.any(Number),
      y: expect.any(Number)
    });
    activeChart2.toggleZoom(false);
    expect(readout2.textContent).toContain('zoomable: false');

    editExampleConfig(editor2, (config) => { config.view.zoomable = true; });
    expect(readout2.textContent).toContain('zoomable: true');

    ex2.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(readout2.textContent).toContain('zoomable: true');
  }, 20000);

  it('bootstraps both Zoom examples and syncs shared flags without replacing chart settings', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'view-zoom', 'dark');
    const editor1 = root.querySelector<HTMLTextAreaElement>('#vz-editor-1 textarea')!;
    const editor2 = root.querySelector<HTMLTextAreaElement>('#vz-editor-2 textarea')!;
    const zoomActions = Array.from(root.querySelectorAll<HTMLButtonElement>(
      '#vz-zoom-toggle-btn, #vz-zoom-in-btn, #vz-zoom-out-btn, #vz-zoom-reset-btn'
    ));
    const readout1 = root.querySelector('#vz-readout-1')!;
    const readout2 = root.querySelector('#vz-readout-2')!;
    const onChartControls = () => charts.map((chart) => chart.shadowRoot!
      .querySelector<HTMLElement>('.mc-view-controls')!.hidden);

    expect(charts).toHaveLength(2);
    expect(root.querySelectorAll('textarea')).toHaveLength(2);
    expect(editor1.value).toContain("import { registerRadarChart } from 'modern-charts/radar';");
    expect(editor1.value).toContain('await registerRadarChart(');
    expect(editor1.value).toContain("document.createElement('mc-radar-chart')");
    expect(editor1.value).toContain("chart.addEventListener('mc-zoom-toggle'");
    expect(editor2.value).toContain("import { registerPieChart } from 'modern-charts/pie';");
    expect(editor2.value).toContain('await registerPieChart(');
    expect(editor2.value).toContain("document.createElement('mc-pie-chart')");
    expect(editor2.value).toContain("chart.addEventListener('mc-zoom'");
    expect(getChartFeatures()).toEqual({ zoom: true, csvExport: false });
    expect(onChartControls()).toEqual([false, false]);
    expect(zoomActions.every((button) => !button.disabled)).toBe(true);

    editor1.value = editor1.value.replace('zoom: true', 'zoom: false');
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    expect(editor2.value).toContain('zoom: false');
    expect(getChartFeatures()).toEqual({ zoom: false, csvExport: false });
    expect(onChartControls()).toEqual([true, true]);
    expect(zoomActions.every((button) => button.disabled)).toBe(true);
    expect(readout1.textContent).toContain('zoomable: false');
    expect(readout2.textContent).toContain('zoomable: false | pannable: false');
    expect(charts[0].config.view?.zoomable).toBe(true);

    editExampleConfig(editor1, (config) => { config.view.maxZoom = 4; });
    expect(charts[0].config.view?.maxZoom).toBe(4);
    expect(charts[1].config.view?.maxZoom).toBe(6);

    root.querySelector<HTMLButtonElement>('[data-vz-chart-type="line"]')!.click();
    expect(editor2.value).toContain("import { registerLineChart } from 'modern-charts/line';");
    expect(editor2.value).toContain('await registerLineChart(');
    expect(editor2.value).toContain('zoom: false');
    expect(charts[1]).toBe(root.querySelector('#vz-chart-2 mc-line-chart'));
    expect(onChartControls()).toEqual([true, true]);

    editor2.value = editor2.value.replace('zoom: false', 'zoom: true');
    editor2.dispatchEvent(new Event('input', { bubbles: true }));
    expect(editor1.value).toContain('zoom: true');
    expect(onChartControls()).toEqual([false, false]);
    expect(charts[0].config.view?.maxZoom).toBe(4);
    expect(zoomActions.every((button) => !button.disabled)).toBe(true);
    expect(readout1.textContent).toContain('zoomable: true');
    expect(readout2.textContent).toContain('zoomable: true | pannable: true');
  });

  it('bootstraps a live preview with the selected entry point, chart, and features', async () => {
    expect(GUIDES_CATALOG.find(({ id }) => id === 'bootstrapping')?.title).toContain(
      'Feature Bootstrapping & Lazy Loading'
    );

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'bootstrapping', 'dark');
    const entrypoint = root.querySelector<HTMLSelectElement>('#bs-entrypoint')!;
    const chartType = root.querySelector<HTMLSelectElement>('#bs-chart-type')!;
    const zoom = root.querySelector<HTMLInputElement>('#bs-zoom')!;
    const csvExport = root.querySelector<HTMLInputElement>('#bs-csv-export')!;
    const download = root.querySelector<HTMLButtonElement>('#bs-download-csv')!;
    const csvOutput = root.querySelector<HTMLElement>('#bs-csv-output')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#bs-bootstrap-code textarea')!;
    const featureCode = root.querySelector<HTMLElement>('#bs-feature-code')!;
    const featureSnippet = () => featureCode.querySelector('code')?.textContent;

    expect(root.querySelector('a[href="#/guide/view-zoom"]')).not.toBeNull();
    expect(root.querySelector('a[href="#/guide/csv-export"]')).not.toBeNull();
    expect(editor.closest('.guide-code-wrap')?.querySelector('.guide-code-live-badge')?.textContent)
      .toBe('LIVE JS');
    expect(entrypoint.value).toBe('library');
    expect(chartType.value).toBe('bar');
    expect(Array.from(chartType.options, ({ value }) => value).sort()).toEqual(
      CHART_CATALOG.map(({ id }) => id).sort()
    );
    expect(zoom.checked).toBe(false);
    expect(csvExport.checked).toBe(false);
    expect(download.disabled).toBe(true);
    expect(editor.value).toMatch(/^import \{ registerModernCharts \} from 'modern-charts';\s+await registerModernCharts\([\s\S]*\);$/);
    expect(editor.value).not.toMatch(/(?:zoom|csvExport):\s*true/);
    expect(featureCode.hidden).toBe(true);
    const copy = root.querySelector<HTMLButtonElement>('#bs-bootstrap-code button.guide-copy-btn')!;
    expect(copy.getAttribute('commandfor')).toBe(editor.id);

    await vi.waitFor(() => {
      expect(charts).toHaveLength(1);
      const bar = root.querySelector('#bs-chart mc-bar-chart') as MCBaseChart<any>;
      expect(bar).toBe(charts[0]);
      expect(bar.isFeatureEnabled('zoom')).toBe(false);
      expect(bar.toCsv()).toBe('');
    });

    zoom.checked = true;
    zoom.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(charts[0].zoomable).toBe(true);
      expect(editor.value).toMatch(/zoom:\s*true/);
      expect(editor.value).not.toContain('chart.toggleZoom');
      expect(featureCode.hidden).toBe(false);
      expect(featureSnippet()).toMatch(/chart\.(?:zoomIn|toggleZoom)\(/);
    });
    const zoomIn = charts[0].shadowRoot!.querySelector<HTMLButtonElement>(
      'button[data-zoom="in"]'
    )!;
    zoomIn.click();
    expect(charts[0].shadowRoot!.querySelector('.mc-chart-viewport')!.getAttribute('transform'))
      .toContain('scale(1.25)');
    expect(download.disabled).toBe(true);

    csvExport.checked = true;
    csvExport.dispatchEvent(new Event('change', { bubbles: true }));
    expect(download.disabled).toBe(true);
    await vi.waitFor(() => {
      expect(charts[0].isFeatureEnabled('csvExport')).toBe(true);
      expect(charts[0].toCsv()).toContain('quarter,Cloud,Edge,OnPrem');
      expect(csvOutput.textContent).toContain(charts[0].toCsv());
      expect(download.disabled).toBe(false);
      expect(editor.value).toMatch(/csvExport:\s*true/);
      expect(editor.value).not.toContain('chart.toCsv');
      expect(featureSnippet()).toContain('chart.toCsv()');
    });

    zoom.checked = false;
    zoom.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(charts[0].zoomable).toBe(false);
      expect(charts[0].isFeatureEnabled('csvExport')).toBe(true);
      expect(editor.value).not.toMatch(/zoom:\s*true/);
      expect(editor.value).toMatch(/csvExport:\s*true/);
      expect(featureSnippet()).not.toMatch(/chart\.(?:zoomIn|toggleZoom)\(/);
    });

    entrypoint.value = 'standalone';
    entrypoint.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.value).toContain("import { registerBarChart } from 'modern-charts/bar';");
    for (const { id, tagName } of CHART_CATALOG) {
      chartType.value = id;
      chartType.dispatchEvent(new Event('change', { bubbles: true }));
      const register = `register${id.charAt(0).toUpperCase()}${id.slice(1)}Chart`;
      await vi.waitFor(() => {
        expect(charts).toHaveLength(1);
        expect(root.querySelector(`#bs-chart ${tagName}`)).toBe(charts[0]);
        expect(root.querySelector('#bs-chart')?.childElementCount).toBe(1);
        expect(editor.value).toContain(`import { ${register} } from 'modern-charts/${id}';`);
        expect(editor.value).toContain(`await ${register}(`);
        expect(charts[0].toCsv().split('\n').length).toBeGreaterThan(1);
      });
    }

    csvExport.checked = false;
    csvExport.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => {
      expect(charts[0].toCsv()).toBe('');
      expect(download.disabled).toBe(true);
      expect(editor.value).not.toMatch(/csvExport:\s*true/);
      expect(featureCode.hidden).toBe(true);
    });
  }, 20000);

  it('applies valid bootstrap editor changes and resets the single preview', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'bootstrapping', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#bs-bootstrap-code textarea')!;
    const entrypoint = root.querySelector<HTMLSelectElement>('#bs-entrypoint')!;
    const chartType = root.querySelector<HTMLSelectElement>('#bs-chart-type')!;
    const zoom = root.querySelector<HTMLInputElement>('#bs-zoom')!;
    const csvExport = root.querySelector<HTMLInputElement>('#bs-csv-export')!;
    const download = root.querySelector<HTMLButtonElement>('#bs-download-csv')!;
    const defaultBootstrap = editor.value;
    const editBootstrap = (source: string) => {
      editor.value = source;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    editBootstrap(`import { registerModernCharts } from 'modern-charts';
await registerModernCharts({ features: { zoom: true, csvExport: false } });`);
    await vi.waitFor(() => {
      expect(editor.getAttribute('aria-invalid')).toBe('false');
      expect(entrypoint.value).toBe('library');
      expect(chartType.value).toBe('bar');
      expect(zoom.checked).toBe(true);
      expect(csvExport.checked).toBe(false);
      expect(charts[0].zoomable).toBe(true);
      expect(charts[0].toCsv()).toBe('');
    });

    editBootstrap(`import { registerHeatmapChart } from 'modern-charts/heatmap';
await registerHeatmapChart({ features: { zoom: false, csvExport: true } });`);
    await vi.waitFor(() => {
      expect(editor.getAttribute('aria-invalid')).toBe('false');
      expect(entrypoint.value).toBe('standalone');
      expect(chartType.value).toBe('heatmap');
      expect(zoom.checked).toBe(false);
      expect(csvExport.checked).toBe(true);
      expect(root.querySelector('#bs-chart mc-heatmap-chart')).toBe(charts[0]);
      expect(charts[0].zoomable).toBe(false);
      expect(charts[0].toCsv()).toContain('row,x,y');
      expect(download.disabled).toBe(false);
    });

    const heatmap = charts[0];
    const gaugeImport = "import { registerGaugeChart } from 'modern-charts/gauge';";
    for (const source of [
      'await registerGaugeChart();',
      `${gaugeImport}\nawait registerBarChart();`,
      `${gaugeImport}\nawait registerGaugeChart(null);`,
      `${gaugeImport}\nawait registerGaugeChart({ features: null });`,
      `${gaugeImport}\nawait registerGaugeChart({ features: { zoom: true, csvExport: 'false' } });`
    ]) {
      editBootstrap(source);
      expect(editor.getAttribute('aria-invalid')).toBe('true');
      expect(entrypoint.value).toBe('standalone');
      expect(chartType.value).toBe('heatmap');
      expect(zoom.checked).toBe(false);
      expect(csvExport.checked).toBe(true);
      expect(charts[0]).toBe(heatmap);
      expect(heatmap.toCsv()).toContain('row,x,y');
    }

    editBootstrap(`${gaugeImport}\nawait registerGaugeChart()`);
    expect(editor.getAttribute('aria-invalid')).toBe('false');
    expect(chartType.value).toBe('gauge');
    expect(charts[0].isFeatureEnabled('zoom')).toBe(false);
    expect(charts[0].isFeatureEnabled('csvExport')).toBe(false);

    root.querySelector<HTMLButtonElement>('#bs-bootstrap-code .guide-reset-btn')!.click();
    await vi.waitFor(() => {
      expect(editor.getAttribute('aria-invalid')).toBe('false');
      expect(editor.value).toBe(defaultBootstrap);
      expect(entrypoint.value).toBe('library');
      expect(chartType.value).toBe('bar');
      expect(zoom.checked).toBe(false);
      expect(csvExport.checked).toBe(false);
      expect(root.querySelector('#bs-chart mc-bar-chart')).toBe(charts[0]);
      expect(charts[0].zoomable).toBe(false);
      expect(charts[0].toCsv()).toBe('');
      expect(download.disabled).toBe(true);
    });
  }, 20000);
});
