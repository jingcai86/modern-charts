import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerPieChart, type MCPieChart, type PieDatum } from '../src/entries/pie';

const baseData: PieDatum[] = [{ id: 'A', value: 2 }, { id: 'B', value: 3 }];

function mountPie(animate?: boolean) {
  const pie = document.createElement('mc-pie-chart') as MCPieChart;
  pie.config = {
    animate,
    data: baseData,
    width: 440,
    height: 360,
    animation: { duration: 100, easing: 'linear' }
  };
  document.body.append(pie);
  return pie;
}

function readSlice(pie: MCPieChart, id: string): SVGPathElement {
  return pie.shadowRoot!.querySelector<SVGPathElement>(`.mc-pie-arc[data-id="${id}"]`)!;
}

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

it('animates an added slice while the existing slices settle synchronously', async () => {
  const pie = mountPie();
  pie.data = [...baseData, { id: 'C', value: 4 }];
  const added = readSlice(pie, 'C');
  const initialD = added.getAttribute('d');
  expect(added.getAttribute('data-item-transition')).toBe('enter');
  expect(readSlice(pie, 'A').hasAttribute('data-item-transition')).toBe(false);
  expect(readSlice(pie, 'B').hasAttribute('data-item-transition')).toBe(false);

  await vi.waitFor(() => {
    expect(added.hasAttribute('data-item-transition')).toBe(false);
    expect(added.getAttribute('d')).not.toBe(initialD);
  });
});

it('keeps only the removed slice visible during exit without keyboard access', async () => {
  const pie = mountPie();
  pie.setConfig({
    ...pie.config,
    defs: [{ id: 'dots', type: 'dots' }],
    fill: [{ id: 'dots', match: 'B' }]
  });
  const departing = readSlice(pie, 'B');
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
  expect(readSlice(pie, 'A').hasAttribute('data-item-transition')).toBe(false);

  await vi.waitFor(() => expect(exit.isConnected).toBe(false));
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
