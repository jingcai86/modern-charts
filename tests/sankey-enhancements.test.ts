import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type MCSankeyChart,
  type SankeyData
} from '../src/index';

const BRANCHING_DAG: SankeyData = {
  nodes: [
    { id: 'A', name: 'Source A' },
    { id: 'B', name: 'Stage B' },
    { id: 'C', name: 'Stage C' },
    { id: 'D', name: 'Final Sink D' },
    { id: 'EarlySink', name: 'Early Sink' },
    { id: 'ParallelE', name: 'Parallel E' }
  ],
  links: [
    { source: 'A', target: 'B', value: 40 },
    { source: 'B', target: 'C', value: 40 },
    { source: 'C', target: 'D', value: 40 },
    { source: 'A', target: 'EarlySink', value: 20 },
    { source: 'A', target: 'ParallelE', value: 25 },
    { source: 'ParallelE', target: 'D', value: 25 }
  ]
};

describe('Sankey Vertical Layout, Alignment, Curveness & Focus Modes (Issue #71)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders both horizontal (left->right) and vertical (top->bottom) Sankey layouts with directional link gradients', () => {
    const sankey = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(sankey);

    // 1. Horizontal layout (default)
    sankey.config = {
      width: 560,
      height: 360,
      layout: 'horizontal',
      nodeWidth: 20,
      data: BRANCHING_DAG
    };

    const hNodeA = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="A"]')!;
    const hNodeD = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="D"]')!;
    expect(Number(hNodeA.getAttribute('width'))).toBe(20);
    expect(Number(hNodeD.getAttribute('x'))).toBeGreaterThan(Number(hNodeA.getAttribute('x')));

    const hGrad = sankey.shadowRoot!.querySelector<SVGLinearGradientElement>('defs linearGradient#mc-sankey-grad-0')!;
    expect(Number(hGrad.getAttribute('x2'))).toBeGreaterThan(Number(hGrad.getAttribute('x1')));
    expect(hGrad.getAttribute('y1')).toBe('0');
    expect(hGrad.getAttribute('y2')).toBe('0');

    // 2. Vertical layout (top -> bottom)
    sankey.config = {
      ...sankey.config,
      layout: 'vertical'
    };

    const vNodeA = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="A"]')!;
    const vNodeD = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="D"]')!;
    expect(Number(vNodeA.getAttribute('height'))).toBe(20);
    expect(Number(vNodeD.getAttribute('y'))).toBeGreaterThan(Number(vNodeA.getAttribute('y')));

    const vGrad = sankey.shadowRoot!.querySelector<SVGLinearGradientElement>('defs linearGradient#mc-sankey-grad-0')!;
    expect(Number(vGrad.getAttribute('y2'))).toBeGreaterThan(Number(vGrad.getAttribute('y1')));
    expect(vGrad.getAttribute('x1')).toBe('0');
    expect(vGrad.getAttribute('x2')).toBe('0');

    const vLabelText = sankey.shadowRoot!.querySelector('.mc-layer--labels .mc-label text')!;
    expect(vLabelText.getAttribute('text-anchor')).toBe('middle');
  });

  it('supports justify, start/left, end/right, and center stage alignments', () => {
    const sankey = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(sankey);

    const getCol = (id: string): number =>
      Number(
        sankey.shadowRoot!
          .querySelector(`.mc-sankey-node[data-node-id="${id}"]`)!
          .getAttribute('data-column')
      );

    // 1. justify (default): EarlySink has 0 outgoing links -> pushed to maxCol (3)
    sankey.config = { width: 560, height: 340, align: 'justify', data: BRANCHING_DAG };
    expect(getCol('A')).toBe(0);
    expect(getCol('D')).toBe(3);
    expect(getCol('EarlySink')).toBe(3);
    expect(getCol('ParallelE')).toBe(1);

    // 2. start / left: EarlySink stays at earliest topological depth (1)
    sankey.config = { ...sankey.config, align: 'start' };
    expect(getCol('EarlySink')).toBe(1);
    expect(getCol('ParallelE')).toBe(1);

    // 3. end / right: EarlySink (latest=3) and ParallelE (feeds D at 3 -> latest=2) pulled right
    sankey.config = { ...sankey.config, align: 'end' };
    expect(getCol('EarlySink')).toBe(3);
    expect(getCol('ParallelE')).toBe(2);

    // 4. center: EarlySink centered between fwd=1 and latest=3 -> 2
    sankey.config = { ...sankey.config, align: 'center' };
    expect(getCol('EarlySink')).toBe(2);
  });

  it('applies nodeBorderRadius, nodeGap alias, and curveness to nodes and Bezier links', () => {
    const sankey = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(sankey);

    sankey.config = {
      width: 560,
      height: 340,
      nodeBorderRadius: 11,
      nodeGap: 24,
      curveness: 0,
      data: BRANCHING_DAG
    };

    const nodeEl = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node')!;
    expect(nodeEl.getAttribute('rx')).toBe('11');

    // When curveness = 0, control point 1 equals start point (M sx,sy C sx,sy tx,ty tx,ty)
    const straightD = sankey.shadowRoot!
      .querySelector<SVGPathElement>('.mc-sankey-link')!
      .getAttribute('d')!;
    const m = /^M([^,]+),([^\s]+)\s+C([^,]+),([^\s]+)\s+([^,]+),([^\s]+)\s+([^,]+),([^\s]+)$/.exec(
      straightD
    );
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeCloseTo(Number(m![3]), 2);
    expect(Number(m![5])).toBeCloseTo(Number(m![7]), 2);
  });

  it('distinguishes 1-hop adjacency focus from full end-to-end trajectory focus on hover', () => {
    const sankey = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(sankey);

    const getNodeState = (id: string) =>
      sankey.shadowRoot!
        .querySelector(`.mc-sankey-node[data-node-id="${id}"]`)!
        .getAttribute('data-focus-state');

    // 1. adjacency mode: hovering Stage B highlights A, B, C (1-hop) and dims D (2 hops away) & ParallelE
    sankey.config = {
      width: 560,
      height: 340,
      focusMode: 'adjacency',
      data: BRANCHING_DAG
    };

    const nodeB = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="B"]')!;
    nodeB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(getNodeState('A')).toBe('active');
    expect(getNodeState('B')).toBe('active');
    expect(getNodeState('C')).toBe('active');
    expect(getNodeState('D')).toBe('dimmed');
    expect(getNodeState('ParallelE')).toBe('dimmed');

    nodeB.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(getNodeState('D')).toBeNull();

    // 2. trajectory mode (via emphasis.focus): hovering Stage B highlights entire A -> B -> C -> D chain while dimming ParallelE & EarlySink
    sankey.config = {
      width: 560,
      height: 340,
      emphasis: { focus: 'trajectory' },
      data: BRANCHING_DAG
    };

    const nodeBTraj = sankey.shadowRoot!.querySelector<SVGRectElement>('.mc-sankey-node[data-node-id="B"]')!;
    nodeBTraj.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(getNodeState('A')).toBe('active');
    expect(getNodeState('B')).toBe('active');
    expect(getNodeState('C')).toBe('active');
    expect(getNodeState('D')).toBe('active');
    expect(getNodeState('ParallelE')).toBe('dimmed');
    expect(getNodeState('EarlySink')).toBe('dimmed');
  });
});
