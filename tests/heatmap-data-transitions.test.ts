import { color } from 'd3';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { patternLines } from '../src/entries/core';
import { registerHeatmapChart, type MCHeatmapChart } from '../src/entries/heatmap';

const data = [{ id: 'Node-A', data: [{ x: '09:00', y: 25 }, { x: '12:00', y: 80 }] }];

beforeAll(() => registerHeatmapChart());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function mountHeatmap(options: MCHeatmapChart['config'] = {}): MCHeatmapChart {
  const chart = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
  chart.config = {
    data,
    width: 520,
    height: 330,
    min: 0,
    max: 100,
    animation: { duration: 240, easing: 'linear', stagger: 0 },
    ...options
  };
  document.body.append(chart);
  return chart;
}

function cell(chart: MCHeatmapChart, column = '09:00'): SVGElement {
  return chart.shadowRoot!.querySelector<SVGElement>(`.mc-heatmap-cell[data-row="Node-A"][data-col="${column}"]`)!;
}

it('interpolates unchanged cell keys from the displayed color on consecutive data changes', async () => {
  const chart = mountHeatmap();
  const originalFill = cell(chart).getAttribute('fill')!;
  const originalColor = color(originalFill)!.formatRgb();
  const group = cell(chart).parentElement!;

  chart.data = [{ id: 'Node-A', data: [{ x: '09:00', y: 60 }, data[0].data[1]] }];

  expect(cell(chart).parentElement).toBe(group);
  expect(cell(chart).getAttribute('data-animated')).toBe('false');
  expect(cell(chart).getAttribute('fill')).not.toBe(originalFill);
  expect(cell(chart).style.fill).toBe(originalColor);

  await vi.waitFor(() => {
    expect(cell(chart).style.fill).toBeTruthy();
    expect(cell(chart).style.fill).not.toBe(originalColor);
  }, { interval: 10 });
  const displayed = cell(chart).style.fill;
  chart.data = data;

  expect(cell(chart).style.fill).toBe(displayed);
  await vi.waitFor(() => expect(cell(chart).style.fill).toBe(''));
  expect(cell(chart).getAttribute('fill')).toBe(originalFill);
});

it.each([
  ['rgba(19, 51, 82, 0.25)', 0.25],
  ['rgb(19 51 82 / 30%)', 0.3],
  ['#13335280', 128 / 255],
  ['#1566', 0.4],
  ['transparent', 0]
] as const)('preserves alpha when an empty cell filled with %s gains a value', async (emptyColor, alpha) => {
  const chart = mountHeatmap({ emptyColor, data: [{ id: 'Node-A', data: [{ x: '09:00', y: null }, data[0].data[1]] }] });
  chart.data = data;

  expect(color(cell(chart).style.fill)?.opacity).toBeCloseTo(alpha);
  await vi.waitFor(() => {
    const opacity = color(cell(chart).style.fill)?.opacity ?? 1;
    expect(opacity).toBeGreaterThan(alpha + 0.02);
    expect(opacity).toBeLessThan(1);
  }, { interval: 10 });
  await vi.waitFor(() => expect(cell(chart).style.fill).toBe(''));
});

it('applies paint-server fills immediately', () => {
  const chart = mountHeatmap();
  chart.setConfig({ ...chart.config, defs: [patternLines('alert')], fill: [{ match: '*', id: 'alert' }] });

  expect(cell(chart).getAttribute('fill')).toMatch(/^url\(#.+\)$/);
  expect(cell(chart).style.fill).toBe('');
});

it('grows and retracts cells as the other columns change position', async () => {
  const chart = mountHeatmap({ isFocusable: true, layers: ['labels', 'cells'] });
  const retained = cell(chart).parentElement!;
  const originalWidth = cell(chart).getAttribute('width');

  chart.data = [{ id: 'Node-A', data: [...data[0].data, { x: '15:00', y: 50 }] }];
  const entered = cell(chart, '15:00');
  const group = entered.parentElement!;
  const label = chart.shadowRoot!.querySelector<SVGGElement>('[data-label-id="heatmap-label-2"]')!;
  expect(cell(chart).parentElement).toBe(retained);
  expect(retained.hasAttribute('transform')).toBe(true);
  expect(group.getAttribute('transform')).toContain('scale(0,0)');
  expect(label.style.opacity).toBe('0');

  await vi.waitFor(() => {
    expect(group.getAttribute('transform')).toBeTruthy();
    expect(group.getAttribute('transform')).not.toContain('scale(0,0)');
  }, { interval: 10 });
  await vi.waitFor(() => expect(group.hasAttribute('transform')).toBe(false));
  expect(label.style.opacity).toBe('');

  chart.data = data;
  expect(group.getAttribute('data-item-transition')).toBe('exit');
  expect(group.getAttribute('aria-hidden')).toBe('true');
  expect(group.style.pointerEvents).toBe('none');
  expect(entered.hasAttribute('tabindex')).toBe(false);
  await vi.waitFor(() => expect(group.isConnected).toBe(false));
  expect(cell(chart).getAttribute('width')).toBe(originalWidth);
});

it('applies circle geometry and color immediately under reduced motion', () => {
  const media = window.matchMedia.bind(window);
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
    const result = media(query);
    if (query === '(prefers-reduced-motion: reduce)') {
      Object.defineProperty(result, 'matches', { value: true });
    }
    return result;
  });
  const chart = mountHeatmap({ cellShape: 'circle' });
  const exiting = cell(chart, '12:00');

  chart.data = [{ id: 'Node-A', data: [{ x: '09:00', y: 74 }] }];
  const mark = cell(chart);
  expect(mark.localName).toBe('circle');
  expect(Number(mark.getAttribute('r'))).toBeGreaterThan(0);
  expect(mark.parentElement!.hasAttribute('transform')).toBe(false);
  expect(mark.style.fill).toBe('');
  expect(exiting.isConnected).toBe(false);
});
