import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import {
  registerBarChart,
  type BarDatum,
  type ChartConfig,
  type MCBarChart
} from '../src/entries/bar';
import { patternLines } from '../src/entries/core';

beforeAll(() => registerBarChart());

afterEach(() => {
  document.body.replaceChildren();
});

function mountBar(options: ChartConfig<BarDatum[]> = {}): MCBarChart {
  const chart = document.createElement('mc-bar-chart') as MCBarChart;
  chart.config = {
    width: 520,
    height: 320,
    max: 100,
    data: [{ category: 'Q1', sales: 35 }, { category: 'Q2', sales: 70 }],
    animation: { duration: 160, easing: 'linear', stagger: 0 },
    ...options
  };
  document.body.append(chart);
  return chart;
}

function bar(chart: MCBarChart, category = 'Q1', key = 'sales'): SVGElement {
  return chart.shadowRoot!.querySelector<SVGElement>(`.mc-bar-rect[data-index="${category}"][data-key="${key}"]`)!;
}

function displayedBar(rect: SVGElement) {
  const transform = rect.parentElement!.getAttribute('transform');
  const x = Number(rect.getAttribute('x'));
  const y = Number(rect.getAttribute('y'));
  const width = Number(rect.getAttribute('width'));
  const height = Number(rect.getAttribute('height'));
  if (!transform) return { x, y, width, height };
  const [, dx, dy, sx, sy] = /^translate\(([^,]+),([^)]+)\) scale\(([^,]+),([^)]+)\)$/.exec(transform)!;
  return {
    x: x * Number(sx) + Number(dx),
    y: y * Number(sy) + Number(dy),
    width: width * Number(sx),
    height: height * Number(sy)
  };
}

function displayedTop(rect: SVGElement): number {
  return displayedBar(rect).y;
}

it('animates changed values when setConfig retains the same bar keys', async () => {
  const chart = mountBar();
  const wrapper = bar(chart).parentElement!;
  const previousTop = displayedTop(bar(chart));

  chart.setConfig({ ...chart.config, data: [{ category: 'Q1', sales: 60 }, chart.data![1]] });

  expect(bar(chart).parentElement).toBe(wrapper);
  expect(bar(chart).getAttribute('data-animated')).toBe('false');
  expect(displayedTop(bar(chart))).toBeCloseTo(previousTop);
  const nextTop = Number(bar(chart).getAttribute('y'));
  expect(nextTop).toBeLessThan(previousTop);

  await vi.waitFor(() => expect(wrapper.hasAttribute('transform')).toBe(false));
  expect(displayedTop(bar(chart))).toBeCloseTo(nextTop);
});

it('moves partial threshold clips with their bar and keeps them valid', () => {
  const chart = mountBar({
    markers: [{ id: 'limit', type: 'line', axis: 'y', value: 20, condition: 'above' }]
  });
  const wrapper = bar(chart).parentElement!;

  chart.data = [{ category: 'Q1', sales: 60 }, chart.data![1]];

  const mark = bar(chart);
  expect(mark.parentElement).toBe(wrapper);
  expect(wrapper.hasAttribute('transform')).toBe(true);
  for (const segment of mark.querySelectorAll('.mc-bar-segment')) {
    const clipId = /^url\(#(.+)\)$/.exec(segment.getAttribute('clip-path') ?? '')?.[1];
    expect(clipId && chart.shadowRoot!.getElementById(clipId)).toBeTruthy();
  }
  expect(mark.querySelector('.mc-bar-segment--threshold')).not.toBeNull();
});

it('keeps the original paint and clip definitions until a threshold bar exits', async () => {
  const chart = mountBar({
    defs: [patternLines('alerts')],
    markers: [{
      id: 'limit', type: 'line', axis: 'y', value: 20, condition: 'above',
      matchStyle: { fill: 'alerts' }
    }]
  });
  const mark = bar(chart);
  const wrapper = mark.parentElement!;
  const segment = mark.querySelector('.mc-bar-segment--threshold')!;
  const root = chart.shadowRoot!;
  const definitions = ['fill', 'clip-path'].map(attribute => {
    const id = segment.getAttribute(attribute)!.slice(5, -1);
    return root.getElementById(id)!;
  });
  expect(definitions.map(definition => definition.localName)).toEqual(['pattern', 'clipPath']);

  chart.setConfig({ ...chart.config, data: [chart.data![1]], markers: [], defs: [] });

  expect(wrapper.getAttribute('data-item-transition')).toBe('exit');
  for (const definition of definitions) {
    expect(root.getElementById(definition.id)).toBe(definition);
    expect(wrapper.contains(definition)).toBe(true);
  }
  await vi.waitFor(() => expect(wrapper.isConnected).toBe(false));
  expect(definitions.every(definition => !root.getElementById(definition.id))).toBe(true);
});

it('tweens a plain rect to zero thickness when its value and band padding change', async () => {
  const chart = mountBar({ groupMode: 'stacked' });
  const previousWidth = bar(chart).getAttribute('width');
  expect(Number(previousWidth)).toBeGreaterThan(0);

  chart.setConfig({
    ...chart.config,
    data: [{ category: 'Q1', sales: 62 }, chart.data![1]],
    xScale: { innerPadding: 1 }
  });

  expect(bar(chart).getAttribute('width')).toBe(previousWidth);
  await vi.waitFor(() => expect(bar(chart).getAttribute('width')).toBe('0'));
});

it('starts consecutive updates at the displayed geometry', async () => {
  const chart = mountBar({ animation: { duration: 1_000, easing: 'linear', stagger: 0 } });
  const start = displayedTop(bar(chart));
  chart.data = [{ category: 'Q1', sales: 65 }, chart.data![1]];
  await vi.waitFor(() => expect(displayedTop(bar(chart))).toBeLessThan(start));

  const current = displayedTop(bar(chart));
  chart.data = [{ category: 'Q1', sales: 20 }, chart.data![1]];

  expect(displayedTop(bar(chart))).toBeCloseTo(current);
});

it('grows and shrinks a quarter as its existing neighbors change widths', async () => {
  const chart = mountBar({ animation: { duration: 300, easing: 'linear', stagger: 0 } });
  const initial = displayedBar(bar(chart));
  const existing = bar(chart).parentElement!;
  chart.data = [...chart.data!, { category: 'Q3', sales: 45 }];

  const enteredBar = bar(chart, 'Q3');
  const enteredGroup = enteredBar.parentElement!;
  const label = chart.shadowRoot!.querySelector<SVGGElement>('[data-label-id="bar-label-2"]')!;
  expect(label.style.opacity).toBe('0');
  expect(bar(chart).parentElement).toBe(existing);
  expect(displayedBar(bar(chart)).width).toBeCloseTo(initial.width);
  expect(displayedBar(enteredBar)).toMatchObject({ width: 0, height: 0 });
  expect(displayedTop(enteredBar)).toBeCloseTo(Number(enteredBar.getAttribute('y')) + Number(enteredBar.getAttribute('height')));

  await vi.waitFor(() => expect(displayedBar(enteredBar).height).toBeGreaterThan(0), { interval: 10 });
  expect(displayedBar(enteredBar).height).toBeLessThan(Number(enteredBar.getAttribute('height')));
  await vi.waitFor(() => expect(enteredGroup.hasAttribute('transform')).toBe(false));
  expect(label.style.opacity).toBe('');
  const beforeExit = displayedBar(enteredBar);

  chart.data = chart.data!.slice(0, -1);

  expect(enteredGroup.getAttribute('data-item-transition')).toBe('exit');
  expect(enteredGroup.getAttribute('aria-hidden')).toBe('true');
  expect(displayedBar(enteredBar).height).toBeCloseTo(beforeExit.height);
  await vi.waitFor(() => expect(displayedBar(enteredBar).height).toBeLessThan(beforeExit.height), { interval: 10 });
  const shrinking = displayedBar(enteredBar);
  expect(shrinking.y + shrinking.height).toBeCloseTo(beforeExit.y + beforeExit.height);
  expect(displayedBar(bar(chart, 'Q2')).x + displayedBar(bar(chart, 'Q2')).width).toBeLessThan(shrinking.x);
  await vi.waitFor(() => expect(enteredGroup.isConnected).toBe(false));
  expect(displayedBar(bar(chart)).width).toBeCloseTo(initial.width);
});

it('starts a horizontal negative stack segment at the preceding segment tip', () => {
  const chart = mountBar({
    layout: 'horizontal',
    groupMode: 'stacked',
    min: -100,
    keys: ['sales', 'support']
  });
  chart.data = [...chart.data!, { category: 'Q3', sales: -35, support: -20 }];

  const first = bar(chart, 'Q3', 'sales');
  const second = bar(chart, 'Q3', 'support');
  expect(displayedBar(second).width).toBe(0);
  expect(displayedBar(second).x).toBeCloseTo(Number(first.getAttribute('x')));
});
