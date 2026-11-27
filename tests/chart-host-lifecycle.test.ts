import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PALETTES, registerModernCharts, type MCBarChart } from '../src/index';

beforeAll(async () => {
  await registerModernCharts({ features: { zoom: true } });
});

const data = [{ category: 'January', value: 12 }, { category: 'February', value: 20 }];
const svgNamespace = 'http://www.w3.org/2000/svg';

function createChart() {
  return document.createElement('mc-bar-chart') as MCBarChart;
}

function mountChart() {
  const chart = createChart();
  chart.config = { data, width: 480, height: 300, animate: false };
  document.body.append(chart);
  return chart;
}

function svg(chart: MCBarChart) {
  return chart.shadowRoot!.querySelector<SVGSVGElement>('.mc-chart-svg')!;
}

function bars(chart: MCBarChart) {
  return Array.from(svg(chart).querySelectorAll<SVGRectElement>('.mc-bar-rect'));
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('chart host lifecycle and declarative configuration', () => {
  it('keeps zoom actions working with slotted icons and consumer-owned buttons', () => {
    const chart = createChart();
    chart.config = {
      data, width: 480, height: 300, animate: false,
      indexBy: 'category', keys: ['value'],
      view: { zoomable: true, showControls: true }
    };
    document.body.append(chart);

    const controls = chart.shadowRoot!.querySelector<HTMLElement>('.mc-view-controls')!;
    const buttons = Array.from(controls.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map((button) => button.dataset.zoom)).toEqual(['in', 'out', 'reset']);
    const [zoomIn, zoomOut, reset] = buttons;
    expect(zoomIn.getAttribute('part')?.split(' ')).toEqual(['zoom-button', 'zoom-in']);
    expect(zoomOut.getAttribute('part')?.split(' ')).toEqual(['zoom-button', 'zoom-out']);
    expect(reset.getAttribute('part')?.split(' ')).toEqual(['zoom-button', 'zoom-reset']);

    const icon = document.createElementNS(svgNamespace, 'svg');
    icon.setAttribute('slot', 'zoom-in-icon');
    const path = document.createElementNS(svgNamespace, 'path');
    icon.append(path);
    const image = document.createElement('img');
    image.slot = 'zoom-reset-icon';
    image.alt = '';
    const extra = document.createElement('button');
    extra.slot = 'zoom-controls-extra';
    extra.className = 'custom-zoom';
    extra.addEventListener('click', () => chart.zoomIn(2));
    chart.append(icon, image, extra);

    const zoomInIcon = zoomIn.querySelector('slot')!;
    const resetIcon = reset.querySelector('slot')!;
    const extraSlot = controls.querySelector<HTMLSlotElement>('slot[name="zoom-controls-extra"]')!;
    expect(zoomInIcon.assignedElements()).toEqual([icon]);
    expect(resetIcon.assignedElements()).toEqual([image]);
    expect(extraSlot.assignedElements()).toEqual([extra]);
    expect(extra.className).toBe('custom-zoom');

    const transform = () => svg(chart).querySelector('.mc-chart-viewport')!.getAttribute('transform');
    // Happy DOM exposes assigned elements without dispatching their composed slot path.
    const clickIcon = (targets: EventTarget[]) => {
      const click = new MouseEvent('click', { bubbles: true, composed: true });
      const nativePath = click.composedPath.bind(click);
      vi.spyOn(click, 'composedPath').mockImplementation(() =>
        click.eventPhase === Event.AT_TARGET ? [...targets, controls] : nativePath()
      );
      controls.dispatchEvent(click);
    };
    clickIcon([path, icon, zoomInIcon, zoomIn]);
    expect(transform()).toContain('scale(1.25)');
    zoomOut.click();
    expect(transform()).toContain('scale(1)');
    extra.click();
    expect(transform()).toContain('scale(2)');

    chart.config = {
      ...chart.config, i18n: { messages: { resetZoom: 'Restore zoom', resetZoomLabel: 'Restore' } }
    };
    expect(reset.getAttribute('aria-label')).toBe('Restore zoom');
    expect(reset.title).toBe('Restore');
    expect(resetIcon.textContent?.trim()).toBe('');
    expect(resetIcon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(resetIcon.assignedElements()).toEqual([image]);
    clickIcon([image, resetIcon, reset]);
    expect(transform()).toContain('scale(1)');

    chart.toggleZoom(false);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    extra.click();
    expect(transform()).toContain('scale(1)');
  });

  it('keeps the last valid chart while attributes are being edited and clears it when data is removed', () => {
    const chart = createChart();
    chart.setAttribute('config', JSON.stringify({ title: 'Sales', animate: false, keys: ['value'] }));
    chart.setAttribute('data', JSON.stringify(data));
    chart.setAttribute('width', '460');
    chart.setAttribute('height', '280');
    document.body.append(chart);

    expect(svg(chart).getAttribute('viewBox')).toBe('0 0 460 280');
    expect(svg(chart).querySelector('title')?.textContent).toBe('Sales');
    expect(bars(chart)).toHaveLength(2);

    chart.setAttribute('config', '{"title":');
    chart.setAttribute('data', '[{"category":');
    expect(svg(chart).querySelector('title')?.textContent).toBe('Sales');
    expect(bars(chart)).toHaveLength(2);

    chart.setAttribute('config', JSON.stringify({ title: 'Updated Sales', animate: false }));
    chart.setAttribute('data', JSON.stringify(data.slice(0, 1)));
    expect(svg(chart).querySelector('title')?.textContent).toBe('Updated Sales');
    expect(bars(chart)).toHaveLength(1);

    chart.removeAttribute('data');
    expect(chart.chartState).toBe('empty');
    expect(bars(chart)).toHaveLength(0);
  });

  it.each([
    ['18', { top: 18, right: 18, bottom: 18, left: 18 }],
    ['12, 16 20, 24', { top: 12, right: 16, bottom: 20, left: 24 }],
    ['{"left":24}', { top: 32, right: 28, bottom: 76, left: 24 }],
    ['{"left":', { top: 32, right: 28, bottom: 76, left: 56 }],
    ['12 16', { top: 32, right: 28, bottom: 76, left: 56 }]
  ])('positions the plot for margin="%s"', (attribute, expected) => {
    const chart = mountChart();
    chart.setAttribute('margin', attribute);

    expect(chart.resolveDimensions().margin).toEqual(expected);
    expect(svg(chart).querySelector('.mc-chart-root')?.getAttribute('transform'))
      .toBe(`translate(${expected.left}, ${expected.top})`);
  });

  it('resizes with its container and disconnects the observer when auto-size is turned off', () => {
    let notifyResize: () => void = () => {};
    const disconnect = vi.fn();
    class TestResizeObserver {
      observe() {}
      disconnect = disconnect;

      constructor(callback: () => void) {
        notifyResize = callback;
      }
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);

    const container = document.createElement('div');
    let width = 450;
    vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, width, 260));
    const chart = createChart();
    chart.config = { data, animate: false };
    chart.autoSize = true;
    container.append(chart);
    document.body.append(container);
    expect(svg(chart).getAttribute('viewBox')).toBe('0 0 450 260');

    const originalBar = bars(chart)[0];
    notifyResize();
    expect(bars(chart)[0]).toBe(originalBar);

    width = 550;
    notifyResize();
    expect(svg(chart).getAttribute('viewBox')).toBe('0 0 550 260');
    expect(bars(chart)[0]).not.toBe(originalBar);

    chart.autoSize = false;
    expect(disconnect).toHaveBeenCalledOnce();
    expect(chart.hasAttribute('auto-size')).toBe(false);
    chart.resize(620);
    expect(svg(chart).getAttribute('viewBox')).toBe('0 0 620 260');
    chart.resize(undefined, 320);
    expect(svg(chart).getAttribute('viewBox')).toBe('0 0 620 320');
  });

  it('applies title and focus changes made through the host after connection', () => {
    const chart = mountChart();
    chart.chartTitle = 'Quarterly sales';
    expect(chart.getAttribute('chart-title')).toBe('Quarterly sales');
    expect(svg(chart).querySelector('title')?.textContent).toBe('Quarterly sales');
    chart.chartTitle = '';
    expect(chart.hasAttribute('chart-title')).toBe(false);
    expect(svg(chart).querySelector('title')?.textContent).not.toContain('Quarterly sales');

    chart.isFocusable = false;
    expect(bars(chart).every((bar) => !bar.hasAttribute('tabindex'))).toBe(true);
    chart.setAttribute('is-focusable', 'true');
    expect(bars(chart)[0].getAttribute('tabindex')).toBe('0');
    chart.setAttribute('is-interactive', 'false');
    expect(chart.isFocusable).toBe(false);
    expect(chart.getTooltipElement()).toBeNull();
    chart.removeAttribute('is-interactive');
    chart.removeAttribute('is-focusable');
    expect(chart.isInteractive).toBe(true);
    expect(chart.isFocusable).toBe(true);
    expect(chart.getTooltipElement()).not.toBeNull();
  });
});

describe('chart host configuration updates', () => {
  it('updates the rendered theme and restores its palette when a property override is cleared', () => {
    const chart = mountChart();
    chart.setAttribute('palette', 'material');
    expect(bars(chart)[0].getAttribute('fill')).toBe(PALETTES.material[0]);

    chart.theme = { colors: ['#8B1234'], textColor: '#456789' };
    expect(chart.theme?.textColor).toBe('#456789');
    expect(bars(chart)[0].getAttribute('fill')).toBe('#8B1234');
    chart.theme = null;
    expect(bars(chart)[0].getAttribute('fill')).toBe(PALETTES.material[0]);
  });

  it('updates scales, view controls, and the accessible name after mounting', () => {
    const chart = mountChart();
    const originalHeight = Number(bars(chart)[0].getAttribute('height'));
    chart.scaleConfig = { y: { type: 'linear', min: 0, max: 40 } };
    expect(chart.scaleConfig?.y?.max).toBe(40);
    expect(Number(bars(chart)[0].getAttribute('height'))).toBeLessThan(originalHeight);
    chart.scaleConfig = null;
    expect(Number(bars(chart)[0].getAttribute('height'))).toBe(originalHeight);

    const controls = chart.shadowRoot!.querySelector<HTMLElement>('.mc-view-controls')!;
    chart.viewConfig = { zoomable: true, pannable: false, showControls: true, maxZoom: 3 };
    expect(chart.viewConfig?.maxZoom).toBe(3);
    expect(controls.hidden).toBe(false);
    chart.viewConfig = null;
    expect(controls.hidden).toBe(true);

    chart.ariaConfig = { label: 'Sales by month', description: 'January and February', includeDataTable: false };
    expect(chart.ariaConfig?.description).toBe('January and February');
    expect(svg(chart).getAttribute('aria-label')).toBe('Sales by month');
    expect(svg(chart).querySelector('desc')?.textContent).toBe('January and February');
    chart.ariaConfig = null;
    expect(svg(chart).hasAttribute('aria-label')).toBe(false);
  });

  it('switches marker and tooltip options at runtime', () => {
    const chart = mountChart();
    const originalFill = bars(chart)[0].getAttribute('fill');
    chart.markers = [{
      id: 'target', type: 'line', axis: 'y', value: 15, condition: 'below',
      matchScope: 'item', matchStyle: { color: '#AB1234' }
    }];
    expect(chart.markers.map((marker) => marker.id)).toContain('target');
    expect(bars(chart)[0].getAttribute('fill')).toBe('#AB1234');
    chart.markers = [];
    expect(bars(chart)[0].getAttribute('fill')).toBe(originalFill);

    expect(chart.tooltipPosition).toBe('item');
    chart.tooltipPosition = 'follow';
    expect(chart.getAttribute('tooltip-position')).toBe('follow');
    expect(chart.resolveTooltipConfig().position).toBe('follow');
    chart.removeAttribute('tooltip-position');
    expect(chart.tooltipPosition).toBe('item');
  });

  it('updates animation options and replays using the current duration', () => {
    const chart = mountChart();
    chart.animationConfig = { enabled: true, duration: 250, stagger: 0 };
    expect(chart.animationConfig?.duration).toBe(250);
    chart.replayAnimation();
    expect(bars(chart)[0].getAttribute('data-animation-duration')).toBe('250');

    chart.animationConfig = null;
    expect(bars(chart)[0].getAttribute('data-animated')).toBe('false');
    const animation = document.createElement('mc-animation');
    animation.setAttribute('enabled', 'true');
    animation.setAttribute('duration', '180');
    chart.append(animation);
    chart.replayAnimation();
    expect(bars(chart)[0].getAttribute('data-animation-duration')).toBe('180');
  });

  it('updates label overflow and custom rendering independently after mounting', () => {
    const chart = mountChart();
    const axis = () => svg(chart).querySelector('.mc-layer--axes')!;
    expect(axis().textContent).toContain('January');
    chart.labelOverflow = { strategy: 'truncate', maxChars: 4, ellipsis: '~' };
    expect(axis().textContent).toContain('Jan~');
    expect(chart.labelOverflow).toMatchObject({ maxChars: 4 });

    chart.labelRenderer = (descriptor, _measured, renderDefault) => {
      const element = renderDefault();
      if (descriptor.type === 'axis-tick') element.setAttribute('data-custom-tick', '');
      return element;
    };
    expect(axis().querySelector('[data-custom-tick]')).not.toBeNull();
    chart.labelRenderer = undefined;
    expect(axis().querySelector('[data-custom-tick]')).toBeNull();
    expect(axis().textContent).toContain('Jan~');

    chart.labelOverflow = undefined;
    expect(axis().textContent).toContain('January');
  });

  it.each([
    ['', 'auto'], ['90', 90], ['bottom-to-top', 'bottom-to-top']
  ] as const)('applies gradient="%s" and allows config to disable it', (attribute, direction) => {
    const chart = mountChart();
    chart.setAttribute('gradient', attribute);
    expect(chart.resolveGradientConfig()?.direction).toBe(direction);
    const paint = bars(chart)[0].getAttribute('fill');
    expect(paint).toMatch(/^url\(#.+\)$/);
    expect(svg(chart).querySelectorAll('.mc-chart-defs linearGradient').length).toBeGreaterThan(0);

    chart.config = { ...chart.config, gradient: false };
    expect(bars(chart)[0].getAttribute('fill')).toBe(PALETTES.shadcn[0]);
  });
});

describe('runtime layer composition', () => {
  it('supports returned SVG elements and markup and removes layers by name', () => {
    const chart = mountChart();
    const labels = () => svg(chart).querySelector('.mc-layer--labels');
    const circle = () => svg(chart).querySelector('circle[data-custom="annotation"]');
    const annotation = {
      name: 'annotation',
      render() {
        const element = document.createElementNS(svgNamespace, 'circle');
        element.setAttribute('data-custom', 'annotation');
        return element;
      }
    };
    function caption() {
      return '<text data-custom="caption">Sales target</text>';
    }

    chart.layers = ['bars', 'labels'];
    chart.appendLayer(annotation);
    chart.appendLayer(caption);
    expect(chart.getActiveLayers()).toEqual(['bars', 'labels', 'annotation', 'caption']);
    expect(circle()).not.toBeNull();
    expect(svg(chart).querySelector('[data-custom="caption"]')?.textContent).toBe('Sales target');

    chart.removeLayer('annotation');
    chart.removeLayer('labels');
    expect(circle()).toBeNull();
    expect(labels()).toBeNull();
    expect(chart.getActiveLayers()).toEqual(['bars', 'caption']);
    expect(bars(chart)).toHaveLength(2);
  });

  it('positions declarative custom layers around built-ins and removes their source nodes', () => {
    const chart = createChart();
    chart.config = { data, animate: false };
    chart.setAttribute('layers', ' grid, , bars, labels ');
    chart.innerHTML = `
      <mc-custom-layer name="behind" order="before:bars"><circle r="4" /></mc-custom-layer>
      <mc-custom-layer name="overlay" order="after:bars"><text>Target</text></mc-custom-layer>
      <mc-custom-layer name="fallback" order="after:unknown"><text>Note</text></mc-custom-layer>
      <mc-custom-layer name="disabled" enabled="false"><text>Hidden</text></mc-custom-layer>
    `;
    document.body.append(chart);

    expect(chart.getActiveLayers()).toEqual(['grid', 'behind', 'bars', 'overlay', 'labels', 'fallback']);
    expect(svg(chart).querySelector('.mc-layer--overlay')?.textContent).toBe('Target');
    chart.removeLayer('overlay');
    expect(chart.querySelector('[name="overlay"]')).toBeNull();
    expect(svg(chart).querySelector('.mc-layer--overlay')).toBeNull();
    expect(svg(chart).querySelector('.mc-layer--behind circle')).not.toBeNull();
  });
});
