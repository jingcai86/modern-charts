import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { registerSankeyChart, type MCSankeyChart, type SankeyData } from '../src/entries/sankey';

const nodes = [{ id: 'A' }, { id: 'B' }];
const main = { source: 'A', target: 'B', value: 24 };
const secondary = { source: 'A', target: 'C', value: 16 };

beforeAll(() => registerSankeyChart());
afterEach(() => document.body.replaceChildren());

function mountSankey(
  layout: 'horizontal' | 'vertical' = 'horizontal',
  data: SankeyData = { nodes, links: [main, secondary] }
) {
  const chart = document.createElement('mc-sankey-chart') as MCSankeyChart;
  chart.config = {
    data,
    width: 540,
    height: 340,
    layout,
    animation: { duration: 260, easing: 'linear', stagger: 0 }
  };
  document.body.append(chart);
  return chart;
}

function node(chart: MCSankeyChart, id: string): SVGRectElement {
  return chart.shadowRoot!.querySelector(`.mc-sankey-node[data-node-id="${id}"]`)!;
}

function link(chart: MCSankeyChart, target: string): SVGPathElement {
  return chart.shadowRoot!.querySelector(`.mc-sankey-link[data-target="${target}"]`)!;
}

it('keeps node and ribbon identities through reordering and resumes from the current geometry', async () => {
  const chart = mountSankey();
  const nodeGroup = node(chart, 'B').parentElement!;
  const linkGroup = link(chart, 'B').parentElement!;
  const initialHeight = node(chart, 'B').getAttribute('height');
  const initialPath = link(chart, 'B').getAttribute('d');

  chart.data = { nodes, links: [secondary, { ...main, value: 9 }] };
  expect(node(chart, 'B').parentElement).toBe(nodeGroup);
  expect(link(chart, 'B').parentElement).toBe(linkGroup);
  expect(node(chart, 'B').getAttribute('height')).toBe(initialHeight);
  expect(link(chart, 'B').getAttribute('d')).toBe(initialPath);
  await vi.waitFor(() => expect(link(chart, 'B').getAttribute('d')).not.toBe(initialPath));
  const currentPath = link(chart, 'B').getAttribute('d');
  const currentHeight = node(chart, 'B').getAttribute('height');

  chart.data = { nodes, links: [{ ...main, value: 12 }, secondary] };
  expect(link(chart, 'B').getAttribute('d')).toBe(currentPath);
  expect(node(chart, 'B').getAttribute('height')).toBe(currentHeight);
});

it('retracts multiple ribbons toward their departing target node center', async () => {
  const chart = mountSankey('vertical', {
    nodes,
    links: [main, secondary, { source: 'B', target: 'C', value: 12 }]
  });
  const departing = node(chart, 'C');
  const center = Number(departing.getAttribute('x')) + Number(departing.getAttribute('width')) / 2;
  const ribbon = link(chart, 'C');

  chart.data = { nodes, links: [main] };

  await vi.waitFor(() => expect(ribbon.isConnected).toBe(false));
  const targetX = ribbon.getAttribute('d')!.split(' L')[1].split(',')[0];
  expect(Number(targetX)).toBeCloseTo(center);
});

it('grows inferred nodes and ribbons while leaving marks shrink with their original paint', async () => {
  const chart = mountSankey('vertical');
  const leavingNode = node(chart, 'C');
  const leavingLink = link(chart, 'C');
  const nodeGroup = leavingNode.parentElement!;
  const linkGroup = leavingLink.parentElement!;
  const nativeGradientId = leavingLink.getAttribute('fill')!.slice(5, -1);
  const leavingGradient = chart.shadowRoot!.getElementById(nativeGradientId)!;
  const oldWidth = Number(leavingNode.getAttribute('width'));
  const oldPath = leavingLink.getAttribute('d');
  const next: SankeyData = { nodes, links: [main, { source: 'A', target: 'D', value: 12 }] };

  chart.data = next;

  const entering = node(chart, 'D');
  expect(entering.getAttribute('width')).toBe('0');
  const collapsedPath = link(chart, 'D').getAttribute('d');
  expect(nodeGroup.getAttribute('aria-hidden')).toBe('true');
  expect(linkGroup.getAttribute('data-item-transition')).toBe('exit');
  expect(leavingLink.hasAttribute('tabindex')).toBe(false);
  expect(leavingLink.getAttribute('d')).toBe(oldPath);
  expect(linkGroup.contains(leavingGradient)).toBe(true);
  expect(leavingLink.getAttribute('fill')).toBe(`url(#${leavingGradient.id})`);
  expect(leavingGradient.id).not.toBe(nativeGradientId);

  await vi.waitFor(() => {
    expect(Number(leavingNode.getAttribute('width'))).toBeLessThan(oldWidth);
    expect(link(chart, 'D').getAttribute('d')).not.toBe(collapsedPath);
  });
  await vi.waitFor(() => {
    expect(nodeGroup.isConnected).toBe(false);
    expect(linkGroup.isConnected).toBe(false);
    expect(Number(entering.getAttribute('width'))).toBeGreaterThan(0);
  });
});
