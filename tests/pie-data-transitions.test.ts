import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerPieChart, type ChartConfig, type MCPieChart, type PieDatum } from '../src/entries/pie';

const baseData: PieDatum[] = [{ id: 'A', value: 2 }, { id: 'B', value: 3 }];

function mountPie(animate?: boolean, config: Partial<ChartConfig<PieDatum[]>> = {}) {
  const pie = document.createElement('mc-pie-chart') as MCPieChart;
  pie.config = {
    animate,
    data: baseData,
    width: 440,
    height: 360,
    animation: { duration: 100, easing: 'linear' },
    ...config
  };
  document.body.append(pie);
  return pie;
}

function readSlice(pie: MCPieChart, id: string): SVGPathElement {
  return pie.shadowRoot!.querySelector<SVGPathElement>(`.mc-pie-arc[data-id="${id}"]`)!;
}

// With no pad angle or corners, the outer circle's move and arc points are the slice boundaries.
function outerEdges(path: SVGPathElement) {
  const points = /^M([^,]+),([^A]+)A(?:[^,]+,){5}([^,]+),([^ALZ]+)/.exec(path.getAttribute('d')!);
  expect(points).not.toBeNull();
  return { start: points!.slice(1, 3).map(Number), end: points!.slice(3, 5).map(Number) };
}

function firstLabelPosition(pie: MCPieChart) {
  const label = pie.shadowRoot!.querySelector('[data-label-id="arc-label-0"]')!;
  const transforms = label.getAttribute('transform')!.matchAll(/translate\(([^,]+), ([^)]+)\)/g);
  return Array.from(transforms).reduce(([x, y], [, dx, dy]) => [x + Number(dx), y + Number(dy)], [0, 0]);
}

const structuralMotion = {
  padAngle: 0,
  cornerRadius: 0,
  animation: { duration: 320, easing: 'linear' }
} as const;

beforeAll(() => registerPieChart());

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it('morphs keyed slices from the displayed arc on successive data edits', async () => {
  const pie = mountPie();
  const original = readSlice(pie, 'A');
  const start = original.getAttribute('d');
  const group = original.parentElement;
  pie.data = [{ id: 'A', value: 11 }, { id: 'B', value: 3 }];

  const updated = readSlice(pie, 'A');
  expect(updated.parentElement).toBe(group);
  expect(updated.getAttribute('d')).toBe(start);
  expect(updated.getAttribute('data-item-transition')).toBe('update');
  await vi.waitFor(() => expect(updated.getAttribute('d')).not.toBe(start));

  const shown = updated.getAttribute('d');
  const finalData = [{ id: 'A', value: 4 }, { id: 'B', value: 5 }];
  pie.setConfig({ ...pie.config, data: finalData });
  const latest = readSlice(pie, 'A');
  expect(latest.getAttribute('d')).toBe(shown);

  const staticPie = mountPie(false);
  staticPie.data = finalData;
  await vi.waitFor(() => {
    expect(latest.hasAttribute('data-item-transition')).toBe(false);
    expect(latest.getAttribute('d')).toBe(readSlice(staticPie, 'A').getAttribute('d'));
  });
});

it.each([
  { name: 'append', config: {}, order: ['A', 'B', 'C'] },
  { name: 'reverse sorted', config: { sort: 'desc', startAngle: 270, endAngle: -30 } as const, order: ['C', 'B', 'A'] }
])('opens a $name slice from its neighbor while preserving a continuous ring', async ({ config, order }) => {
  const pie = mountPie(undefined, { ...structuralMotion, ...config });
  const a = readSlice(pie, 'A').getAttribute('d');
  const b = readSlice(pie, 'B').getAttribute('d');
  const label = firstLabelPosition(pie);
  const readLink = () => pie.shadowRoot!.querySelector<SVGPolylineElement>('.mc-pie-link-line')!;
  const linkPoints = readLink().getAttribute('points');
  pie.data = [...baseData, { id: 'C', value: 4 }];
  const added = readSlice(pie, 'C');
  const initialD = added.getAttribute('d');
  expect(added.getAttribute('data-item-transition')).toBe('enter');
  expect(readSlice(pie, 'A').getAttribute('d')).toBe(a);
  expect(readSlice(pie, 'B').getAttribute('d')).toBe(b);
  expect(firstLabelPosition(pie)[0]).toBeCloseTo(label[0]);
  expect(firstLabelPosition(pie)[1]).toBeCloseTo(label[1]);
  expect(readLink().style.visibility).toBe('');
  expect(readLink().getAttribute('points')).toBe(linkPoints);

  await vi.waitFor(() => {
    expect(added.getAttribute('data-item-transition')).toBe('enter');
    expect(added.getAttribute('d')).not.toBe(initialD);
    expect(readLink().getAttribute('points')).not.toBe(linkPoints);
    const edges = order.map(id => outerEdges(readSlice(pie, id)));
    expect(edges[0].end).toEqual(edges[1].start);
    expect(edges[1].end).toEqual(edges[2].start);
  }, { interval: 10 });

  await vi.waitFor(() => expect(added.hasAttribute('data-item-transition')).toBe(false));
  expect(firstLabelPosition(pie)).not.toEqual(label);
  expect(readLink().style.visibility).toBe('');
});

it('closes a removed slice into the growing ring while keeping it out of keyboard order', async () => {
  const pie = mountPie(undefined, structuralMotion);
  pie.setConfig({
    ...pie.config,
    defs: [{ id: 'dots', type: 'dots' }],
    fill: [{ id: 'dots', match: 'B' }]
  });
  const departing = readSlice(pie, 'B');
  const oldWedge = departing.getAttribute('d');
  const oldNeighbor = readSlice(pie, 'A').getAttribute('d');
  const fill = departing.getAttribute('fill')!;
  expect(fill).toMatch(/^url\(#/);
  const paint = pie.shadowRoot!.getElementById(fill.slice(5, -1));
  expect(paint).not.toBeNull();
  expect(departing.getAttribute('tabindex')).toBe('0');
  pie.data = baseData.slice(0, 1);

  const exit = departing.parentElement!;
  expect(exit.getAttribute('data-item-transition')).toBe('exit');
  expect(exit.getAttribute('aria-hidden')).toBe('true');
  expect(departing.hasAttribute('tabindex')).toBe(false);
  expect(departing.getAttribute('fill')).toBe(fill);
  expect(exit.querySelector('defs')?.contains(paint)).toBe(true);
  expect(departing.getAttribute('d')).toBe(oldWedge);
  expect(readSlice(pie, 'A').getAttribute('d')).toBe(oldNeighbor);

  await vi.waitFor(() => {
    expect(exit.isConnected).toBe(true);
    expect(departing.getAttribute('d')).not.toBe(oldWedge);
    expect(outerEdges(readSlice(pie, 'A')).end).toEqual(outerEdges(departing).start);
  }, { interval: 10 });

  await vi.waitFor(() => expect(exit.isConnected).toBe(false));
  const staticPie = mountPie(false, structuralMotion);
  staticPie.data = pie.data;
  expect(readSlice(pie, 'A').getAttribute('d')).toBe(readSlice(staticPie, 'A').getAttribute('d'));
});

it('reenters a closing slice from its current shape when its key returns', async () => {
  const pie = mountPie(undefined, structuralMotion);
  const slice = readSlice(pie, 'B');
  const group = slice.parentElement;
  const full = slice.getAttribute('d');
  pie.data = baseData.slice(0, 1);
  await vi.waitFor(() => {
    expect(slice.isConnected).toBe(true);
    expect(slice.getAttribute('d')).not.toBe(full);
  }, { interval: 10 });

  const current = slice.getAttribute('d');
  pie.data = baseData;
  const returned = readSlice(pie, 'B');
  expect(returned.parentElement).toBe(group);
  expect(returned.getAttribute('d')).toBe(current);
  expect(returned.getAttribute('tabindex')).toBe('0');
  await vi.waitFor(() => expect(returned.getAttribute('d')).toBe(full));
});

it('honors reduced motion on updates', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const pie = mountPie();
  const initial = readSlice(pie, 'A').getAttribute('d');
  pie.data = [{ id: 'A', value: 7 }, { id: 'B', value: 1 }];

  const updated = readSlice(pie, 'A');
  expect(updated.hasAttribute('data-item-transition')).toBe(false);
  expect(updated.getAttribute('d')).not.toBe(initial);
});
