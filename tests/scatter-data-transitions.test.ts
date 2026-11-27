import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerScatterChart, type MCScatterChart, type ScatterPoint } from '../src/entries/scatter';

const mover: ScatterPoint = { id: 'move', label: 'Shared label', x: 2, y: 3, symbol: 'diamond' };
const stationary: ScatterPoint = { id: 'stay', label: 'Shared label', x: 8, y: 6 };

beforeAll(() => registerScatterChart());
afterEach(() => document.body.replaceChildren());

function series(data: ScatterPoint[]) {
  return [{ id: 'Series', data }];
}

function mountScatter() {
  const chart = document.createElement('mc-scatter-chart') as MCScatterChart;
  chart.config = {
    data: series([mover, stationary]),
    width: 500,
    height: 320,
    xScale: { min: 0, max: 10 },
    yScale: { min: 0, max: 10 },
    animation: { duration: 240, easing: 'linear', stagger: 0 },
    useMesh: true,
    clip: true
  };
  document.body.append(chart);
  return chart;
}

function node(chart: MCScatterChart, index: number): SVGElement {
  return chart.shadowRoot!.querySelector(`.mc-scatter-node[data-node-index="${index}"]`)!;
}

it('slides and resizes retained points by ID and starts rapid changes from the visible frame', async () => {
  const chart = mountScatter();
  const group = node(chart, 0).parentElement!;
  const initialX = Number(node(chart, 0).getAttribute('cx'));
  const initialPath = node(chart, 0).getAttribute('d');

  chart.data = series([stationary, { ...mover, x: 7, size: 15, symbolRotate: 30 }]);

  expect(node(chart, 1).parentElement).toBe(group);
  expect(node(chart, 1).getAttribute('d')).toBe(initialPath);
  await vi.waitFor(() => expect(Number(node(chart, 1).getAttribute('cx'))).toBeGreaterThan(initialX));
  const displayedX = node(chart, 1).getAttribute('cx');

  chart.data = series([stationary, { ...mover, x: 1 }]);
  expect(node(chart, 1).getAttribute('cx')).toBe(displayedX);
  await vi.waitFor(() => expect(Number(node(chart, 1).getAttribute('cx'))).toBeLessThan(initialX));
});

it('grows incoming points, preserves the mesh and shrinks inert exits to removal', async () => {
  const chart = mountScatter();
  const exitMark = node(chart, 0);
  const exit = exitMark.parentElement!;
  const originalRadius = Number(exitMark.getAttribute('r'));
  chart.data = series([{ id: 'enter', label: 'Incoming', x: 6, y: 7 }, stationary]);
  const root = chart.shadowRoot!;
  expect(root.querySelectorAll('.mc-scatter-mesh')).toHaveLength(1);
  expect(node(chart, 0).getAttribute('r')).toBe('0');
  expect(exit.getAttribute('data-item-transition')).toBe('exit');
  expect(exit.getAttribute('aria-hidden')).toBe('true');
  expect(exitMark.hasAttribute('tabindex')).toBe(false);
  await vi.waitFor(() => expect(Number(exitMark.getAttribute('r'))).toBeLessThan(originalRadius));
  await vi.waitFor(() => expect(exit.isConnected).toBe(false));
  expect(Number(node(chart, 0).getAttribute('r'))).toBeGreaterThan(0);

  chart.setConfig({ ...chart.config, clip: false, useMesh: false, animate: false, data: series([stationary]) });
  expect(root.querySelector('.mc-scatter-mesh')).toBeNull();
  expect(root.querySelector('.mc-layer--nodes')!.hasAttribute('clip-path')).toBe(false);
  expect(root.querySelectorAll('.mc-scatter-node')).toHaveLength(1);
});
