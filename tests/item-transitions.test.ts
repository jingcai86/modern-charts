import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerBarChart, type BarDatum, type ChartConfig, type MCBarChart } from '../src/entries/bar';
import { patternLines } from '../src/entries/core';
import { registerPieChart, type MCPieChart, type PieDatum } from '../src/entries/pie';

const exitLayerSelector = '[data-item-transition="exit"]';
const firstQuarter = { quarter: 'Q1', Cloud: 14, Edge: 21 };
const secondQuarter = { quarter: 'Q2', Cloud: 24, Edge: 17 };
const thirdQuarter = { quarter: 'Q3', Cloud: 33, Edge: 22 };
const compute = { id: 'Compute', value: 25 };
const storage = { id: 'Storage', value: 35 };
const network = { id: 'Network', value: 45 };

beforeAll(async () => {
  await registerBarChart();
  await registerPieChart();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function mountBar(options: ChartConfig<BarDatum[]> = {}): MCBarChart {
  const chart = document.createElement('mc-bar-chart') as MCBarChart;
  chart.config = {
    width: 540,
    height: 360,
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    data: [firstQuarter, secondQuarter],
    ...options
  };
  document.body.append(chart);
  return chart;
}

function mountPie(options: ChartConfig<PieDatum[]> = {}): MCPieChart {
  const chart = document.createElement('mc-pie-chart') as MCPieChart;
  chart.config = {
    width: 480,
    height: 360,
    innerRadius: 0.5,
    data: [compute, storage, network],
    ...options
  };
  document.body.append(chart);
  return chart;
}

function captureAnimations() {
  const calls: Array<{ mark: Element; animation: Animation; timing?: KeyframeAnimationOptions | number }> = [];
  vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, _keyframes, timing) {
    let resolve!: (value: Animation) => void;
    let reject!: (reason: DOMException) => void;
    const finished = new Promise<Animation>((complete, fail) => {
      resolve = complete;
      reject = fail;
    });
    const animation = {
      finished,
      finish: () => resolve(animation),
      cancel: vi.fn(() => reject(new DOMException('Animation cancelled', 'AbortError')))
    } as unknown as Animation;
    calls.push({ mark: this, animation, timing });
    return animation;
  });
  return calls;
}

function animatedItemIds(
  calls: ReturnType<typeof captureAnimations>,
  attr: 'data-index' | 'data-id'
): string[] {
  return calls.flatMap(({ mark }) =>
    mark.matches(exitLayerSelector)
      ? Array.from(mark.querySelectorAll(`[${attr}]`), (clone) => `exit:${clone.getAttribute(attr)}`)
      : [`enter:${mark.getAttribute(attr)}`]
  ).sort();
}

it('animates only entering and exiting bar marks while committing the new data immediately', async () => {
  const calls = captureAnimations();
  const chart = mountBar({ itemTransitions: true });
  const root = chart.shadowRoot!;
  expect(calls.map(({ mark }) => mark.getAttribute('data-index'))).toEqual(
    expect.arrayContaining(['Q1', 'Q2'])
  );
  calls.length = 0;

  const next = [firstQuarter, thirdQuarter];
  chart.data = next;

  expect(chart.data).toBe(next);
  expect(animatedItemIds(calls, 'data-index')).toEqual([
    'enter:Q3', 'enter:Q3', 'exit:Q2', 'exit:Q2'
  ]);
  const entering = calls.filter(({ mark }) => mark.getAttribute('data-index') === 'Q3');
  expect(entering.map(({ timing }) => typeof timing === 'object' ? timing.delay ?? 0 : 0)).toEqual([0, 0]);
  const exitLayer = root.querySelector<SVGGElement>(exitLayerSelector)!;
  expect(Array.from(
    exitLayer.querySelectorAll('[data-key]'),
    (mark) => mark.getAttribute('data-key')
  ).sort()).toEqual(['Cloud', 'Edge']);
  expect(exitLayer.getAttribute('aria-hidden')).toBe('true');
  expect(exitLayer.getAttribute('pointer-events') || exitLayer.style.pointerEvents).toBe('none');
  expect(exitLayer.querySelector('[data-item-component], [tabindex], [data-event-id], [data-aria-id]')).toBeNull();

  for (const { animation } of calls) animation.finish();
  await Promise.all(calls.map(({ animation }) => animation.finished));
  expect(root.querySelector(exitLayerSelector)).toBeNull();
  expect(root.querySelectorAll('.mc-bar-rect[data-index="Q1"]')).toHaveLength(2);
  expect(root.querySelectorAll('.mc-bar-rect[data-index="Q3"]')).toHaveLength(2);
});

it('keys pie item transitions by slice ID while setConfig applies new values and sort order', async () => {
  const calls = captureAnimations();
  const chart = mountPie({ itemTransitions: true, sort: 'desc' });
  const root = chart.shadowRoot!;
  const oldStorage = root.querySelector('.mc-pie-arc[data-id="Storage"]')!;
  const originalRootTransform = root.querySelector('.mc-chart-root')!.getAttribute('transform');
  const originalArcTransform = oldStorage.parentElement!.getAttribute('transform');
  calls.length = 0;
  const next = [network, { ...compute, value: 60 }, { id: 'AI Ops', value: 20 }];

  chart.setConfig({ ...chart.config, data: next, width: 560, margin: { left: 95 } });

  expect(chart.data).toBe(next);
  expect(animatedItemIds(calls, 'data-id')).toEqual(['enter:AI Ops', 'exit:Storage']);
  const retiringStorage = root.querySelector(`${exitLayerSelector} [data-id="Storage"]`)!;
  expect(retiringStorage).not.toBe(oldStorage);
  expect(retiringStorage.getAttribute('d')).toBe(oldStorage.getAttribute('d'));
  expect(retiringStorage.parentElement!.getAttribute('transform')).toBe(originalArcTransform);
  expect(retiringStorage.closest(exitLayerSelector)!.getAttribute('transform')).toBe(originalRootTransform);
  expect(root.querySelector('.mc-chart-root')!.getAttribute('transform')).not.toBe(originalRootTransform);

  for (const { animation } of calls) animation.finish();
  await Promise.all(calls.map(({ animation }) => animation.finished));
  expect(root.querySelector(exitLayerSelector)).toBeNull();
  expect(root.querySelector('.mc-pie-arc[data-id="AI Ops"]')).not.toBeNull();
});

it('remaps copied paint and clip references for a retiring threshold bar', async () => {
  const calls = captureAnimations();
  const chart = mountBar({
    itemTransitions: true,
    keys: ['Cloud'],
    defs: [patternLines('alerts', { rotation: -45 })],
    markers: [{ id: 'limit', axis: 'y', value: 20, condition: 'above', matchStyle: { fill: 'alerts' } }]
  });
  const root = chart.shadowRoot!;
  const thresholdSegment = '.mc-bar-rect[data-index="Q2"] .mc-bar-segment--threshold';
  const original = root.querySelector(thresholdSegment)!;
  expect(original.getAttribute('fill')).toMatch(/^url\(#.+-alerts(?:-c\d+)?\)$/);
  expect(original.hasAttribute('clip-path')).toBe(true);
  calls.length = 0;

  chart.setConfig({ ...chart.config, data: [firstQuarter], defs: [], markers: [] });

  const exitLayer = root.querySelector(exitLayerSelector)!;
  const copied = exitLayer.querySelector(thresholdSegment)!;
  for (const [attribute, tag] of [['fill', 'pattern'], ['clip-path', 'clipPath']] as const) {
    const reference = copied.getAttribute(attribute)!;
    expect(reference).not.toBe(original.getAttribute(attribute));
    const id = /^url\(#(.+)\)$/.exec(reference)?.[1];
    expect(exitLayer.querySelector(`defs ${tag}[id="${id}"]`)).not.toBeNull();
  }
  const exit = calls.find(({ mark }) => mark === exitLayer)!;
  exit.animation.finish();
  await exit.animation.finished;
  expect(root.querySelector(exitLayerSelector)).toBeNull();
});

it('keeps normal animations by default and replays them explicitly with item transitions enabled', () => {
  const calls = captureAnimations();
  const defaultBar = mountBar();
  calls.length = 0;
  defaultBar.data = [firstQuarter, thirdQuarter];
  expect(calls.map(({ mark }) => mark.getAttribute('data-index'))).toEqual(
    expect.arrayContaining(['Q1', 'Q3'])
  );
  expect(defaultBar.shadowRoot!.querySelector(exitLayerSelector)).toBeNull();

  const itemBar = mountBar({ itemTransitions: true });
  calls.length = 0;
  itemBar.render();
  itemBar.data = [{ ...secondQuarter, Edge: 65 }, firstQuarter];
  expect(calls).toHaveLength(0);

  itemBar.replayAnimation();
  expect(calls.map(({ mark }) => mark.getAttribute('data-index'))).toEqual(
    expect.arrayContaining(['Q1', 'Q2'])
  );
});

it.each(['reduced motion', 'animate: false'] as const)('skips item animations with %s', (mode) => {
  if (mode === 'reduced motion') {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const result = matchMedia(query);
      if (query === '(prefers-reduced-motion: reduce)') {
        Object.defineProperty(result, 'matches', { value: true });
      }
      return result;
    });
  }

  const calls = captureAnimations();
  const chart = mountPie({ itemTransitions: true, animate: mode !== 'animate: false' });
  const next = [network, { id: 'AI Ops', value: 20 }];
  chart.data = next;

  expect(chart.data).toBe(next);
  expect(calls).toHaveLength(0);
  expect(chart.shadowRoot!.querySelector(exitLayerSelector)).toBeNull();
  expect(chart.shadowRoot!.querySelectorAll('.mc-pie-arc')).toHaveLength(2);
});

it('cancels stale exits on newer data and removes active exit marks on detach', async () => {
  const calls = captureAnimations();
  const chart = mountPie({ itemTransitions: true });
  const root = chart.shadowRoot!;
  calls.length = 0;
  chart.data = [compute, network];
  const firstExit = calls.find(({ mark }) => mark.matches(exitLayerSelector))!;
  expect(firstExit.mark.querySelector('[data-id="Storage"]')).not.toBeNull();
  calls.length = 0;

  const next = [compute, storage];
  chart.data = next;
  expect(firstExit.animation.cancel).toHaveBeenCalled();
  expect(firstExit.mark.isConnected).toBe(false);
  await Promise.allSettled([firstExit.animation.finished]);
  expect(chart.data).toBe(next);
  expect(root.querySelector(`${exitLayerSelector} [data-id="Network"]`)).not.toBeNull();
  const secondExit = calls.find(({ mark }) => mark.matches(exitLayerSelector))!;

  chart.remove();
  expect(secondExit.animation.cancel).toHaveBeenCalled();
  expect(root.querySelector(exitLayerSelector)).toBeNull();
  await Promise.allSettled([secondExit.animation.finished]);
});

it('cancels exit motion in the empty state and starts the next render with a fresh snapshot', async () => {
  const calls = captureAnimations();
  const chart = mountPie({ itemTransitions: true });
  const root = chart.shadowRoot!;
  const next = [compute, network];
  calls.length = 0;
  chart.data = next;
  const exit = calls.find(({ mark }) => mark.matches(exitLayerSelector))!;

  chart.data = null;
  expect(chart.chartState).toBe('empty');
  expect(exit.animation.cancel).toHaveBeenCalled();
  expect(root.querySelector(exitLayerSelector)).toBeNull();
  await Promise.allSettled([exit.animation.finished]);

  calls.length = 0;
  chart.data = next;
  expect(chart.chartState).toBe('ready');
  expect(animatedItemIds(calls, 'data-id')).toEqual(['enter:Compute', 'enter:Network']);
});
