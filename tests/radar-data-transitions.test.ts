import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerRadarChart, type MCRadarChart } from '../src/entries/radar';

const data = [
  { metric: 'Speed', Alpha: 60, Beta: 30 },
  { metric: 'Safety', Alpha: 75, Beta: 85 },
  { metric: 'Size', Alpha: 40, Beta: 70 }
];

beforeAll(() => registerRadarChart());
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function mount() {
  const chart = document.createElement('mc-radar-chart') as MCRadarChart;
  chart.config = {
    width: 520, height: 360, keys: ['Alpha'], maxValue: 100,
    animation: { duration: 320, easing: 'linear', stagger: 0 }, data
  };
  document.body.append(chart);
  return chart;
}

function polygon(chart: MCRadarChart, key: string): SVGPolygonElement {
  return chart.shadowRoot!.querySelector(`.mc-radar-polygon[data-key="${key}"]`)!;
}

it('expands and retracts a series together with its vertex dots', async () => {
  const chart = mount();
  const retained = polygon(chart, 'Alpha').getAttribute('points');
  chart.setConfig({ ...chart.config, keys: ['Alpha', 'Beta'] });
  const entering = polygon(chart, 'Beta');
  const center = entering.getAttribute('points');
  expect(center).toBe('0,0 0,0 0,0');
  expect(polygon(chart, 'Alpha').getAttribute('points')).toBe(retained);
  const dot = chart.shadowRoot!.querySelector('.mc-radar-dot[data-event-id="Beta-Speed"]')!;
  expect(dot.getAttribute('r')).toBe('0');
  await vi.waitFor(() => expect(Number(dot.getAttribute('r'))).toBeGreaterThan(0), { interval: 10 });
  expect(entering.getAttribute('points')).not.toBe(center);
  await vi.waitFor(() => expect(Number(dot.getAttribute('r'))).toBe(4.2));

  const filled = entering.getAttribute('points');
  chart.setConfig({ ...chart.config, keys: ['Alpha'] });
  expect(entering.parentElement?.getAttribute('aria-hidden')).toBe('true');
  expect(dot.hasAttribute('tabindex')).toBe(false);
  expect(entering.getAttribute('points')).toBe(filled);
  await vi.waitFor(() => {
    expect(entering.isConnected).toBe(true);
    expect(entering.getAttribute('points')).not.toBe(filled);
  }, { interval: 10 });
  await vi.waitFor(() => expect(entering.isConnected).toBe(false));
  expect(dot.isConnected).toBe(false);
});

it('opens and closes a polygon vertex when the dataset adds or removes a metric', async () => {
  const chart = mount();
  const initial = polygon(chart, 'Alpha').getAttribute('points')!;
  chart.data = [...data, { metric: 'Cost', Alpha: 90 }];
  const expanded = polygon(chart, 'Alpha');
  const atEntry = expanded.getAttribute('points')!;
  const oldPoints = initial.split(' ');
  expect(atEntry).toBe([...oldPoints, oldPoints.at(-1)].join(' '));
  await vi.waitFor(() => expect(expanded.getAttribute('points')).not.toBe(atEntry));
  await vi.waitFor(() => {
    const finalDot = chart.shadowRoot!.querySelector('.mc-radar-dot[data-event-id="Alpha-Cost"]')!;
    expect(Number(finalDot.getAttribute('r'))).toBe(4.2);
  });

  const atExit = expanded.getAttribute('points');
  chart.data = data;
  const contracting = polygon(chart, 'Alpha');
  expect(contracting.getAttribute('points')).toBe(atExit);
  await vi.waitFor(() => expect(contracting.getAttribute('points')).toBe(initial));
});

it('settles immediately under reduced motion', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const chart = mount();
  const initial = polygon(chart, 'Alpha').getAttribute('points');
  chart.data = data.slice(0, 2);
  expect(polygon(chart, 'Alpha').getAttribute('points')?.split(' ')).toHaveLength(2);
  expect(polygon(chart, 'Alpha').getAttribute('points')).not.toBe(initial);
  expect(chart.shadowRoot!.querySelector('[data-item-transition="exit"]')).toBeNull();
});
