import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerSunburstChart, type HierarchyNode, type MCSunburstChart } from '../src/entries/sunburst';

const original: HierarchyNode = {
  name: 'Root', children: [
    { name: 'Branch', children: [{ name: 'Leaf', value: 3 }, { name: 'Other', value: 2 }] },
    { name: 'Sibling', value: 4 }
  ]
};

function mountSunburst(animate?: boolean) {
  const chart = document.createElement('mc-sunburst-chart') as MCSunburstChart;
  chart.config = { data: original, width: 480, height: 380, sort: 'none', animate, animation: { duration: 180 } };
  document.body.append(chart);
  return chart;
}

function slice(chart: MCSunburstChart, path: string): SVGPathElement {
  return chart.shadowRoot!.querySelector<SVGPathElement>(`.mc-sunburst-arc[data-path="${path}"]`)!;
}

beforeAll(() => registerSunburstChart());

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it('morphs retained hierarchy wedges and animates entering and departing paths', async () => {
  const chart = mountSunburst();
  const leaf = slice(chart, 'Branch/Leaf');
  const group = leaf.parentElement;
  const before = leaf.getAttribute('d');
  const removed = slice(chart, 'Branch/Other');
  const oldPath = removed.getAttribute('d');
  const updated: HierarchyNode = {
    name: 'Root', children: [
      { name: 'Branch', children: [{ name: 'Leaf', value: 6 }, { name: 'New', value: 3 }] },
      original.children![1]
    ]
  };
  chart.data = updated;

  const next = slice(chart, 'Branch/Leaf');
  const entering = slice(chart, 'Branch/New');
  expect(next.parentElement).toBe(group);
  expect(next.getAttribute('d')).toBe(before);
  expect(entering.getAttribute('data-item-transition')).toBe('enter');
  expect(removed.parentElement?.getAttribute('aria-hidden')).toBe('true');
  expect(removed.hasAttribute('tabindex')).toBe(false);

  await vi.waitFor(() => {
    expect(next.getAttribute('d')).not.toBe(before);
    expect(removed.getAttribute('d')).not.toBe(oldPath);
  });
  const currentPath = next.getAttribute('d');
  chart.data = original;
  expect(slice(chart, 'Branch/Leaf').getAttribute('d')).toBe(currentPath);
  await vi.waitFor(() => {
    expect(slice(chart, 'Branch/Leaf').getAttribute('d')).toBe(before);
    expect(entering.isConnected).toBe(false);
  });
});

it('keeps absolute descendant identity during drilldown and recovers if its branch disappears', async () => {
  const chart = mountSunburst();
  const leaf = slice(chart, 'Branch/Leaf');
  const group = leaf.parentElement;
  const before = leaf.getAttribute('d');
  slice(chart, 'Branch').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(slice(chart, 'Branch/Leaf').parentElement).toBe(group);
  expect(slice(chart, 'Branch/Leaf').getAttribute('d')).toBe(before);
  expect(chart.shadowRoot!.querySelector('[data-label-id="sunburst-center-label"]')!.textContent).toMatch(/^↩ Bra/);

  chart.data = { name: 'Root', children: [original.children![1]] };
  const sibling = slice(chart, 'Sibling');
  expect(sibling.getAttribute('tabindex')).toBe('0');
  expect(chart.shadowRoot!.querySelector('[data-label-id="sunburst-center-label"]')!.textContent).toContain('Root');
  await vi.waitFor(() => expect(group?.isConnected).toBe(false));
});

it('settles hierarchy changes immediately with reduced motion', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const chart = mountSunburst();
  chart.data = { name: 'Root', children: [{ name: 'Sibling', value: 5 }] };
  expect(chart.shadowRoot!.querySelectorAll('[data-item-transition]')).toHaveLength(0);
  expect(chart.shadowRoot!.querySelectorAll('.mc-sunburst-arc')).toHaveLength(1);
});
