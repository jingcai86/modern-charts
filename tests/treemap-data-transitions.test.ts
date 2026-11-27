import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerTreemapChart, type HierarchyNode, type MCTreemapChart } from '../src/entries/treemap';

const data: HierarchyNode = {
  name: 'Bundle',
  children: [
    { name: 'Core', children: [{ name: 'Shared', value: 30 }, { name: 'Labels', value: 25 }] },
    { name: 'Charts', children: [{ name: 'Shared', value: 45 }, { name: 'Bar', value: 50 }] }
  ]
};

beforeAll(() => registerTreemapChart());
afterEach(() => document.body.replaceChildren());

function mountTreemap(options: MCTreemapChart['config'] = {}): MCTreemapChart {
  const chart = document.createElement('mc-treemap-chart') as MCTreemapChart;
  chart.config = {
    data,
    width: 540,
    height: 360,
    animation: { duration: 240, easing: 'linear', stagger: 0 },
    ...options
  };
  document.body.append(chart);
  return chart;
}

function tile(chart: MCTreemapChart, name: string, category: string): SVGRectElement {
  return chart.shadowRoot!.querySelector<SVGRectElement>(`.mc-treemap-tile[data-name="${name}"][data-category="${category}"]`)!;
}

it('matches same-named tiles by hierarchy path when new values reorder the layout', async () => {
  const chart = mountTreemap();
  const original = tile(chart, 'Shared', 'Core');
  const coreGroup = original.parentElement!;
  const chartsGroup = tile(chart, 'Shared', 'Charts').parentElement!;
  expect(original.getAttribute('data-animated')).toBe('true');

  chart.data = {
    ...data,
    children: [
      { name: 'Core', children: [{ name: 'Shared', value: 145 }, { name: 'Labels', value: 95 }] },
      data.children![1]
    ]
  };

  expect(tile(chart, 'Shared', 'Core').parentElement).toBe(coreGroup);
  expect(tile(chart, 'Shared', 'Charts').parentElement).toBe(chartsGroup);
  expect(tile(chart, 'Shared', 'Core').getAttribute('data-animated')).toBe('false');
  const from = coreGroup.getAttribute('transform');
  expect(from).toBeTruthy();
  await vi.waitFor(() => {
    expect(coreGroup.getAttribute('transform')).toBeTruthy();
    expect(coreGroup.getAttribute('transform')).not.toBe(from);
  }, { interval: 10 });
  await vi.waitFor(() => expect(coreGroup.hasAttribute('transform')).toBe(false));
});

it('grows new tiles from their centers and keeps exiting tiles inert until cleanup', async () => {
  const chart = mountTreemap({ isFocusable: true });
  const retained = tile(chart, 'Labels', 'Core').parentElement!;
  const core = data.children![0];
  chart.data = {
    ...data,
    children: [{ ...core, children: [...core.children!, { name: 'Events', value: 55 }] }, data.children![1]]
  };
  const entered = tile(chart, 'Events', 'Core');
  const group = entered.parentElement!;
  const entering = group.getAttribute('transform');
  expect(entering).toContain('scale(0,0)');
  expect(tile(chart, 'Labels', 'Core').parentElement).toBe(retained);
  await vi.waitFor(() => {
    expect(group.getAttribute('transform')).toBeTruthy();
    expect(group.getAttribute('transform')).not.toBe(entering);
  }, { interval: 10 });
  await vi.waitFor(() => expect(group.hasAttribute('transform')).toBe(false));

  chart.data = data;
  expect(group.getAttribute('data-item-transition')).toBe('exit');
  expect(group.getAttribute('aria-hidden')).toBe('true');
  expect(group.style.pointerEvents).toBe('none');
  expect(entered.hasAttribute('tabindex')).toBe(false);
  await vi.waitFor(() => expect(group.isConnected).toBe(false));
  expect(tile(chart, 'Labels', 'Core').parentElement).toBe(retained);
});

it('drills into a subtree immediately and returns to the root if that branch is removed', () => {
  const chart = mountTreemap();
  const chartsTile = tile(chart, 'Bar', 'Charts');
  tile(chart, 'Labels', 'Core').dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(chartsTile.isConnected).toBe(false);
  expect(chart.shadowRoot!.querySelector('.mc-treemap-breadcrumb')?.textContent).toContain('Bundle › Core');
  expect(chart.shadowRoot!.querySelectorAll('.mc-treemap-tile')).toHaveLength(2);

  chart.data = { ...data, children: [data.children![1]] };

  expect(chart.shadowRoot!.querySelector('.mc-treemap-breadcrumb')).toBeNull();
  expect(tile(chart, 'Bar', 'Charts')).not.toBeNull();
  expect(chart.shadowRoot!.querySelector('[data-item-transition="exit"]')).toBeNull();
});

it('commits tile removals immediately when chart animation is disabled', () => {
  const chart = mountTreemap({ animate: false });
  const standalone = tile(chart, 'Bar', 'Charts');
  chart.data = { ...data, children: [data.children![0]] };

  expect(standalone.isConnected).toBe(false);
  expect(tile(chart, 'Shared', 'Core').parentElement!.hasAttribute('transform')).toBe(false);
});
