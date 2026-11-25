import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type {
  MCScaleLayer,
  MCThemeLayer,
  MCViewLayer
} from '../src/components/layers/mc-layers';
import type { ScaleConfig } from '../src/core/types';

afterEach(() => document.body.replaceChildren());

describe('Declarative chart capabilities', () => {
  it('combines opposing axis positions while retaining axis bounds and secondary scale options', () => {
    const base: ScaleConfig = {
      x: { type: 'linear', position: 'bottom' },
      y: { type: 'linear', position: 'left' },
      color: { scheme: 'viridis' },
      size: { min: 2, max: 18 }
    };
    const layer = document.createElement('mc-scale-layer') as MCScaleLayer;
    layer.applyFromConfig({
      x: {
        type: 'log', position: 'top', title: 'Frequency', tickCount: 3,
        min: 1, max: 'auto', padding: 0.2, reverse: true, nice: false,
        clamp: true, base: 2, constant: 1
      },
      y: {
        type: 'symlog', position: 'right', title: 'Difference', tickCount: 7,
        min: 'auto', max: 50, stacked: true, reverse: false, nice: true,
        clamp: false, base: 10, constant: 4
      },
      color: { scheme: 'plasma' }
    });

    const result = layer.applyToConfig(base);
    expect(result).toEqual({
      x: {
        type: 'log', position: 'both', title: 'Frequency', tickCount: 3,
        min: 1, max: 'auto', padding: 0.2, reverse: true, nice: false,
        clamp: true, base: 2, constant: 1
      },
      y: {
        type: 'symlog', position: 'both', title: 'Difference', tickCount: 7,
        min: 'auto', max: 50, stacked: true, reverse: false, nice: true,
        clamp: false, base: 10, constant: 4
      },
      color: { scheme: 'plasma' },
      size: { min: 2, max: 18 }
    });
    expect(base.x).toEqual({ type: 'linear', position: 'bottom' });
    expect(base.y).toEqual({ type: 'linear', position: 'left' });
    expect(base.color).toEqual({ scheme: 'viridis' });
  });

  it('applies single-axis shorthand without changing the other axis', () => {
    const scope = document.createElement('div');
    scope.innerHTML = `
      <mc-scale-layer target="y" type="band" position="invalid" title=""
        tick-count="4" min="bad-bound" max="" stacked="false" reverse="true"
        nice="false" clamp="true" base="3" constant="2" padding="0.12"
        inner-padding="0.3" outer-padding="0.2" scheme="magma"></mc-scale-layer>
    `;
    const layer = scope.firstElementChild as MCScaleLayer;
    const base: ScaleConfig = { x: { type: 'linear' }, y: { type: 'band', position: 'right', title: 'Region' } };
    const result = layer.applyToConfig(base);

    expect(result.x).toEqual(base.x);
    expect(result.y).toEqual({
      type: 'band', position: 'right', title: undefined, tickCount: 4,
      min: 'auto', max: undefined, stacked: false, reverse: true, nice: false,
      clamp: true, base: 3, constant: 2, padding: 0.12,
      innerPadding: 0.3, outerPadding: 0.2
    });
    expect(result.color?.scheme).toBe('magma');
  });

  it('clamps the visible range and preserves the configured direction, zoom limits, and pan', () => {
    const layer = document.createElement('mc-view-layer') as MCViewLayer;
    layer.applyFromConfig({
      zoomable: false, pannable: false, brush: false, slider: false,
      start: 110, end: 80, minZoom: 1, maxZoom: 3, direction: 'y',
      showControls: false, initialZoom: 2, initialPanX: 10, initialPanY: -20
    });
    expect(layer.getViewConfig()).toEqual({
      enabled: true, zoomable: false, pannable: false, brush: false, slider: false,
      start: 95, end: 100, minZoom: 1, maxZoom: 3, direction: 'y',
      showControls: false, initialZoom: 2, initialPanX: 10, initialPanY: -20
    });

    layer.applyFromConfig({ start: -10, end: 110 });
    expect(layer.getViewConfig()).toMatchObject({ enabled: false, start: 0, end: 100 });
    layer.applyFromConfig({ brush: true, slider: true });
    expect(layer.getViewConfig()).toMatchObject({ enabled: true, brush: true, slider: true });
  });

  it('uses programmatic theme colors until they are cleared, then falls back to the declarative colors', () => {
    const layer = document.createElement('mc-theme-layer') as MCThemeLayer;
    const parent = document.createElement('section');
    const onLayerChange = vi.fn();
    parent.addEventListener('mc-layer-change', onLayerChange);
    parent.append(layer);
    document.body.append(parent);
    layer.setAttribute('colors', '#202020, #c0c0c0');
    expect(layer.getTheme().colors).toEqual(['#202020', '#c0c0c0']);
    layer.setAttribute('colors', '["#112233", "#334455"]');
    layer.colors = ['#abcdee'];
    expect(layer.getTheme().colors).toEqual(['#abcdee']);
    onLayerChange.mockClear();

    layer.colors = undefined;
    expect(layer.getTheme().colors).toEqual(['#112233', '#334455']);
    expect(onLayerChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      composed: true,
      detail: { source: 'mc-theme-layer', element: layer }
    }));
  });

  it('renders template annotations at scaled values and percentage positions', () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    chart.innerHTML = `
      <mc-chart-layer name="bars"></mc-chart-layer>
      <mc-custom-layer name="target">
        <template>
          <g class="annotations">
            <line class="trend" data-x1="A" data-y1="10" data-x2="B" data-y2="20"></line>
            <circle class="focus" data-x="B" data-y="50%" r="2"></circle>
            <mc-label text="Goal" data-x="50%" data-y="50%"></mc-label>
            <text class="raw-text">Guide</text>
          </g>
        </template>
      </mc-custom-layer>
    `;
    chart.config = {
      width: 420, height: 260, indexBy: 'quarter', keys: ['revenue'], animate: false,
      data: [{ quarter: 'A', revenue: 10 }, { quarter: 'B', revenue: 20 }]
    };
    document.body.append(chart);

    const annotations = chart.shadowRoot!.querySelector('.annotations')!;
    const trend = annotations.querySelector('.trend')!;
    const focus = annotations.querySelector('.focus')!;
    expect(annotations.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(Number(trend.getAttribute('x2'))).toBeGreaterThan(Number(trend.getAttribute('x1')));
    expect(Number(trend.getAttribute('y2'))).toBeLessThan(Number(trend.getAttribute('y1')));
    expect(focus.getAttribute('cx')).toBe(trend.getAttribute('x2'));
    expect(Number(focus.getAttribute('cy'))).toBeCloseTo(chart.resolveDimensions().innerHeight / 2);
    expect(annotations.querySelector('.mc-label')?.textContent).toBe('Goal');
    expect(annotations.querySelector('.raw-text')?.textContent).toBe('Guide');
    expect(chart.querySelector('template')?.content.querySelector('.focus')?.getAttribute('cx')).toBeNull();
  });
});
