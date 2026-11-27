import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerModernCharts } from '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCLineChart } from '../src/charts/mc-line-chart';
import type { MCScatterChart } from '../src/charts/mc-scatter-chart';
import type { ViewConfig } from '../src/core/types';

beforeAll(async () => {
  await registerModernCharts({ features: { zoom: true } });
});

afterEach(() => document.body.replaceChildren());

function mountZoomChart(view: Partial<ViewConfig>) {
  const chart = document.createElement('mc-bar-chart') as MCBarChart;
  chart.config = {
    width: 500,
    height: 300,
    animate: false,
    indexBy: 'month',
    keys: ['sales'],
    data: [{ month: 'June', sales: 20 }, { month: 'July', sales: 30 }],
    view
  };
  document.body.append(chart);
  const root = chart.shadowRoot!;
  return {
    chart,
    svg: root.querySelector<SVGSVGElement>('.mc-chart-svg')!,
    viewport: root.querySelector<SVGGElement>('.mc-chart-viewport')!
  };
}

describe('Unified <mc-view-layer> Zoom, Brush, and DataZoom Slider Across Charts (Issue #73)', () => {
  it('renders interactive dataZoom range slider and applies [start, end] percentage range on <mc-line-chart> and <mc-bar-chart>', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.innerHTML = `
      <mc-view-layer slider="true" start="25" end="75" direction="x"></mc-view-layer>
    `;
    line.config = {
      width: 500,
      height: 300,
      data: [
        {
          id: 'Series A',
          data: [
            { x: '1', y: 10 },
            { x: '2', y: 30 },
            { x: '3', y: 20 },
            { x: '4', y: 50 }
          ]
        }
      ]
    };
    document.body.appendChild(line);

    const slider = line.shadowRoot?.querySelector(
      '.mc-view-slider'
    ) as HTMLDivElement | null;
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute('data-start')).toBe('25');
    expect(slider?.getAttribute('data-end')).toBe('75');

    const viewport = line.shadowRoot?.querySelector('.mc-chart-viewport');
    expect(viewport?.getAttribute('transform')).toContain('scale(2)');

    line.remove();

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    bar.innerHTML = `
      <mc-view-layer slider="true" start="0" end="50"></mc-view-layer>
    `;
    bar.config = {
      width: 480,
      height: 280,
      indexBy: 'c',
      keys: ['v'],
      data: [
        { c: 'A', v: 10 },
        { c: 'B', v: 20 }
      ]
    };
    document.body.appendChild(bar);

    expect(bar.shadowRoot?.querySelector('.mc-view-slider')).not.toBeNull();
    bar.remove();
  });

  it('supports drag brush-to-zoom selection via <mc-view-layer brush="true"> on <mc-scatter-chart>', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    scatter.innerHTML = `
      <mc-view-layer brush="true" slider="true"></mc-view-layer>
    `;
    scatter.config = {
      width: 500,
      height: 300,
      data: [
        {
          id: 'Cluster',
          data: [
            { x: 10, y: 20 },
            { x: 50, y: 80 },
            { x: 90, y: 40 }
          ]
        }
      ]
    };
    document.body.appendChild(scatter);

    const onBrush = vi.fn();
    scatter.addEventListener('mc-brush', onBrush);

    const svg = scatter.shadowRoot?.querySelector('.mc-chart-svg') as SVGSVGElement;
    svg.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 80 })
    );
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 250, clientY: 180 })
    );
    expect(svg.querySelector('.mc-view-brush')).not.toBeNull();

    svg.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 250, clientY: 180 })
    );
    expect(onBrush).toHaveBeenCalledTimes(1);
    expect(svg.querySelector('.mc-view-brush')).toBeNull();

    scatter.remove();
  });
});

describe('Chart view controls', () => {
  it('zooms once per button press after reconnecting and resets the viewport', () => {
    const { chart, viewport } = mountZoomChart({ minZoom: 1, maxZoom: 2 });
    const onZoom = vi.fn();
    chart.addEventListener('mc-zoom', onZoom);
    const controls = chart.shadowRoot!.querySelector<HTMLElement>('.mc-view-controls')!;
    const button = (action: string) => controls.querySelector<HTMLButtonElement>(`[data-zoom="${action}"]`)!;

    expect(controls.hidden).toBe(false);
    controls.click();
    expect(onZoom).not.toHaveBeenCalled();
    button('in').click();
    expect(viewport.getAttribute('transform')).toBe('translate(-62.5, -37.5) scale(1.25)');
    button('out').click();
    expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');

    chart.remove();
    document.body.append(chart);
    onZoom.mockClear();
    button('in').click();
    expect(onZoom).toHaveBeenCalledOnce();
    button('reset').click();
    expect(viewport.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
    expect(onZoom.mock.lastCall?.[0].detail).toEqual({ k: 1, x: 0, y: 0 });
  });

  it('anchors wheel zoom in a scaled SVG and releases scrolling when zoom is disabled', () => {
    const { chart, svg, viewport } = mountZoomChart({ direction: 'y', pannable: false });
    Object.defineProperty(svg, 'clientWidth', { value: 250 });
    vi.spyOn(svg, 'getScreenCTM').mockReturnValue(new DOMMatrix([0.5, 0, 0, 0.5, 40, 20]));
    // Happy DOM's WheelEvent does not inherit client coordinates from MouseEvent.
    const wheel = () => Object.assign(
      new MouseEvent('wheel', { clientX: 100, clientY: 120, cancelable: true }),
      { deltaY: -20, deltaMode: WheelEvent.DOM_DELTA_LINE }
    );

    expect(svg.dispatchEvent(wheel())).toBe(false);
    expect(viewport.getAttribute('transform')).toBe('translate(0, -200) scale(2)');

    chart.viewConfig = { enabled: true, zoomable: false };
    expect(svg.dispatchEvent(wheel())).toBe(true);
    expect(viewport.hasAttribute('transform')).toBe(false);
  });

  it('pans along the enabled axis, ignoring right clicks and small pointer moves', () => {
    const { chart, svg, viewport } = mountZoomChart({
      direction: 'x', zoomable: false, initialPanX: -20, initialPanY: -30
    });
    const onZoom = vi.fn();
    chart.addEventListener('mc-zoom', onZoom);
    const pointer = (type: string, x: number, y: number, button = 0) => {
      svg.dispatchEvent(new PointerEvent(type, { button, clientX: x, clientY: y }));
    };

    expect(viewport.getAttribute('transform')).toBe('translate(-20, 0) scale(1)');
    pointer('pointerdown', 70, 50, 2);
    pointer('pointermove', 100, 100);
    expect(onZoom).not.toHaveBeenCalled();

    pointer('pointerdown', 70, 50);
    pointer('pointermove', 71, 51);
    expect(onZoom).not.toHaveBeenCalled();
    pointer('pointermove', 100, 100);
    expect(viewport.getAttribute('transform')).toBe('translate(10, 0) scale(1)');
    pointer('pointercancel', 100, 100);
    pointer('pointermove', 150, 150);
    expect(onZoom).toHaveBeenCalledOnce();
  });

  it('moves the slider window, resizes each edge, and stops dragging after cancellation', () => {
    const { chart, viewport } = mountZoomChart({ direction: 'x', slider: true, start: 25, end: 75 });
    const slider = chart.shadowRoot!.querySelector<HTMLElement>('.mc-view-slider')!;
    const sliderWindow = slider.querySelector<HTMLElement>('.mc-view-slider-window')!;
    const start = slider.querySelector<HTMLElement>('[data-handle="start"]')!;
    const end = slider.querySelector<HTMLElement>('[data-handle="end"]')!;
    const pointer = (element: HTMLElement, type: string, x: number) => {
      element.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x }));
    };
    const range = () => [Number(slider.dataset.start), Number(slider.dataset.end)];
    vi.spyOn(slider, 'clientWidth', 'get').mockReturnValue(400);

    pointer(sliderWindow, 'pointerdown', 120);
    pointer(slider, 'pointermove', 160);
    pointer(slider, 'pointerup', 160);
    expect(range()).toEqual([35, 85]);
    expect(viewport.getAttribute('transform')).toBe('translate(-350, 0) scale(2)');

    pointer(start, 'pointerdown', 140);
    pointer(slider, 'pointermove', 180);
    pointer(slider, 'pointerup', 180);
    expect(range()).toEqual([45, 85]);

    pointer(end, 'pointerdown', 340);
    pointer(slider, 'pointermove', 460);
    expect(range()).toEqual([45, 100]);
    pointer(slider, 'pointercancel', 460);
    pointer(slider, 'pointermove', 300);
    expect(range()).toEqual([45, 100]);
  });
});
