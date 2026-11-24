import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type MCScatterChart,
  type ScatterSeries,
  type ScatterSymbolType
} from '../src/index';

const SAMPLE_SERIES: ScatterSeries[] = [
  {
    id: 'Group A',
    symbol: 'diamond',
    data: [
      { x: 10, y: 20, size: 10, weight: 25, label: 'A1' },
      { x: 50, y: 80, size: 30, weight: 75, label: 'A2', symbol: 'star', symbolRotate: 30 }
    ]
  },
  {
    id: 'Group B',
    data: [
      { x: 90, y: 40, size: 20, weight: 100, label: 'B1' }
    ]
  }
];

describe('Scatter Chart Nivo & ECharts Attributes (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders all 9 symbol shapes (chart-level, series-level, point-level) and applies symbolRotate', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    document.body.appendChild(scatter);

    scatter.config = {
      width: 520,
      height: 320,
      symbol: 'triangle',
      symbolRotate: 45,
      data: SAMPLE_SERIES
    };

    const nodes = Array.from(
      scatter.shadowRoot!.querySelectorAll<SVGElement>('.mc-scatter-node')
    );
    expect(nodes.length).toBe(3);

    // A1 inherits series symbol 'diamond' and chart symbolRotate 45
    expect(nodes[0].getAttribute('data-symbol')).toBe('diamond');
    expect(nodes[0].getAttribute('data-symbol-rotate')).toBe('45');
    expect(nodes[0].getAttribute('transform')).toContain('rotate(45 ');

    // A2 uses point-level symbol 'star' and point-level symbolRotate 30
    expect(nodes[1].getAttribute('data-symbol')).toBe('star');
    expect(nodes[1].getAttribute('data-symbol-rotate')).toBe('30');

    // B1 inherits chart-level symbol 'triangle'
    expect(nodes[2].getAttribute('data-symbol')).toBe('triangle');

    // Verify remaining symbol types render valid SVG paths
    const allShapes: ScatterSymbolType[] = [
      'circle',
      'rect',
      'roundRect',
      'triangle',
      'diamond',
      'pin',
      'arrow',
      'cross',
      'star'
    ];
    for (const shape of allShapes) {
      scatter.config = {
        width: 400,
        height: 260,
        symbol: shape,
        data: [{ id: 'S', data: [{ x: 10, y: 20 }] }]
      };
      const el = scatter.shadowRoot!.querySelector('.mc-scatter-node')!;
      expect(el.getAttribute('data-symbol')).toBe(shape);
      if (shape === 'circle') {
        expect(el.tagName.toLowerCase()).toBe('circle');
      } else {
        expect(el.tagName.toLowerCase()).toBe('path');
        expect(el.getAttribute('d')).toContain('M');
      }
    }
  });

  it('supports fixed numeric nodeSize, { key, values, sizes } scale object, and accessor function', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    document.body.appendChild(scatter);

    // 1. Fixed number
    scatter.config = {
      width: 500,
      height: 300,
      nodeSize: 14,
      data: SAMPLE_SERIES
    };
    const fixedRadii = Array.from(
      scatter.shadowRoot!.querySelectorAll('.mc-scatter-node')
    ).map((el) => Number(el.getAttribute('r')));
    expect(fixedRadii).toEqual([14, 14, 14]);

    // 2. Scale object { key: 'weight', values: [0, 100], sizes: [6, 26] }
    scatter.config = {
      width: 500,
      height: 300,
      nodeSize: { key: 'weight', values: [0, 100], sizes: [6, 26] },
      data: SAMPLE_SERIES
    };
    const scaledRadii = Array.from(
      scatter.shadowRoot!.querySelectorAll('.mc-scatter-node')
    ).map((el) => Number(el.getAttribute('r')));
    expect(scaledRadii).toEqual([11, 21, 26]);

    // 3. Accessor function
    scatter.config = {
      width: 500,
      height: 300,
      nodeSize: (pt) => pt.x * 0.2 + 5,
      data: SAMPLE_SERIES
    };
    const fnRadii = Array.from(
      scatter.shadowRoot!.querySelectorAll('.mc-scatter-node')
    ).map((el) => Number(el.getAttribute('r')));
    expect(fnRadii).toEqual([7, 15, 23]);
  });

  it('applies blendMode, plot clipPath, and deterministic jitter for overlapping points', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    document.body.appendChild(scatter);

    const overlappingData: ScatterSeries[] = [
      {
        id: 'Overlap',
        data: [
          { x: 50, y: 50, label: 'P1' },
          { x: 50, y: 50, label: 'P2' },
          { x: 50, y: 50, label: 'P3' }
        ]
      }
    ];

    scatter.config = {
      width: 500,
      height: 300,
      blendMode: 'multiply',
      clip: true,
      jitter: 12,
      data: overlappingData
    };

    const nodesLayer = scatter.shadowRoot!.querySelector('.mc-layer--nodes')!;
    expect(nodesLayer.getAttribute('data-clipped')).toBe('true');
    expect(nodesLayer.getAttribute('clip-path')).toMatch(/^url\(#mc-scatter-plot-clip-/);

    const nodes1 = Array.from(
      scatter.shadowRoot!.querySelectorAll<SVGElement>('.mc-scatter-node')
    );
    expect(nodes1[0].getAttribute('data-blend-mode')).toBe('multiply');
    expect(nodes1[0].style.mixBlendMode).toBe('multiply');

    const coords1 = nodes1.map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`);
    // All 3 overlapping points should be separated by jitter
    expect(new Set(coords1).size).toBe(3);

    // Re-rendering produces the exact same deterministic jitter positions
    scatter.render();
    const coords2 = Array.from(
      scatter.shadowRoot!.querySelectorAll<SVGElement>('.mc-scatter-node')
    ).map((el) => `${el.getAttribute('cx')},${el.getAttribute('cy')}`);
    expect(coords2).toEqual(coords1);
  });

  it('highlights the nearest scatter node when hovering the useMesh spatial overlay', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    document.body.appendChild(scatter);

    scatter.config = {
      width: 500,
      height: 300,
      useMesh: true,
      data: SAMPLE_SERIES
    };

    const mesh = scatter.shadowRoot!.querySelector<SVGRectElement>('.mc-scatter-mesh')!;
    expect(mesh).not.toBeNull();

    const nodes = Array.from(
      scatter.shadowRoot!.querySelectorAll<SVGElement>('.mc-scatter-node')
    );
    const targetX = Number(nodes[2].getAttribute('cx'));
    const targetY = Number(nodes[2].getAttribute('cy'));

    mesh.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: targetX + 48,
        clientY: targetY + 32
      })
    );

    expect(nodes[2].getAttribute('data-mesh-active')).toBe('true');
    expect(nodes[0].getAttribute('data-mesh-active')).toBeNull();

    mesh.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(nodes[2].getAttribute('data-mesh-active')).toBeNull();
  });
});
