import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureI18n,
  registerModernCharts,
  type MCBaseChart
} from '../src/index';
import {
  CHART_CATALOG,
  getAllAttributesForChart
} from '../apps/studio/catalog';
import { SAMPLE_LINE_DATA } from '../apps/studio/sample-data';
import { renderChartDetailPage } from '../apps/studio/pages/chart-detail';
import { resetChartConfig } from '../apps/studio/state/config-store';
import { GUIDES_CATALOG, renderGuidePage } from '../apps/studio/guides';
import {
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';

beforeAll(() => {
  registerModernCharts();
});

afterEach(() => {
  document.body.replaceChildren();
  configureI18n({});
  for (const entry of CHART_CATALOG) {
    resetChartConfig(entry);
  }
});

describe('Dedicated Zoom on/off button and zoom support across all 10 chart types (Issue #125)', () => {
  it('enables zoom support in Studio catalog and renders a keyboard-accessible Zoom on/off toggle button for all 10 charts', () => {
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
      expect( chart.setZoomEnabled(true), entry.id).toBe(true);
      expect(chart.zoomable, entry.id).toBe(true);

      root.remove();
    }
  }, 20000);

  it('prevents brush and slider zoom gestures from changing the view when zoom is disabled', () => {
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

describe('Zoom Controls & Viewport Lock Studio guide', () => {
  it('renders interactive zoom toggle controls and all 10 chart switchers', () => {
    expect(
      GUIDES_CATALOG.find((g) => g.id === 'view-zoom')?.title
    ).toContain('Zoom Controls & Viewport Lock');

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'view-zoom', 'dark');
    expect(charts).toHaveLength(2);

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
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('false');
    expect(zoomInBtn1.disabled).toBe(true);
    expect(parseConfigObjectLiteral(editor1.value).view.zoomable).toBe(false);

    // Re-enable via on-chart toggle button in Example 1
    charts[0]
      .shadowRoot!.querySelector<HTMLButtonElement>(
        'button[data-zoom="toggle"]'
      )!
      .click();
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('true');

    // Reset button on live config editor 1
    ex1.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(toggleBtn1.getAttribute('aria-pressed')).toBe('true');

    // Update from live config editor 1
    const cfg = parseConfigObjectLiteral(editor1.value);
    cfg.view.zoomable = false;
    editor1.value = formatConfigAssignment(cfg);
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
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
    activeChart2.toggleZoom(false);
    expect(readout2.textContent).toContain('zoomable: false');

    const cfg2 = parseConfigObjectLiteral(editor2.value);
    cfg2.view.zoomable = true;
    editor2.value = formatConfigAssignment(cfg2);
    editor2.dispatchEvent(new Event('input', { bubbles: true }));
    expect(readout2.textContent).toContain('zoomable: true');

    ex2.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(readout2.textContent).toContain('zoomable: true');
  }, 20000);
});
