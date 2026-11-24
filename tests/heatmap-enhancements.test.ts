import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type HeatmapRow,
  type MCHeatmapChart
} from '../src/index';

const HEATMAP_DATA: HeatmapRow[] = [
  {
    id: 'Node-A',
    data: [
      { x: '00:00', y: 20 },
      { x: '06:00', y: 80 },
      { x: '12:00', y: null }
    ]
  },
  {
    id: 'Node-B',
    data: [
      { x: '00:00', y: 50 },
      { x: '06:00', y: 100 }
      // '12:00' intentionally omitted to test missing intersection emptyColor
    ]
  }
];

describe('Heatmap Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports xInnerPadding, yInnerPadding, forceSquare,sizeVariation, emptyColor, and min/max domain bounds', () => {
    const heatmap = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
    document.body.appendChild(heatmap);

    heatmap.config = {
      width: 540,
      height: 320,
      xInnerPadding: 0.2,
      yInnerPadding: 0.05,
      forceSquare: true,
      sizeVariation: 0.5,
      emptyColor: '#334155',
      min: 0,
      max: 100,
      data: HEATMAP_DATA
    };

    const cells = Array.from(
      heatmap.shadowRoot!.querySelectorAll<SVGRectElement>('.mc-heatmap-cell')
    );
    // 2 rows x 3 columns = 6 cells (including explicit null and omitted intersection)
    expect(cells.length).toBe(6);

    const emptyCells = heatmap.shadowRoot!.querySelectorAll<SVGRectElement>(
      '.mc-heatmap-cell[data-empty="true"]'
    );
    expect(emptyCells.length).toBe(2);
    expect(emptyCells[0].getAttribute('fill')).toBe('#334155');

    // Verify forceSquare (width === height) and sizeVariation (y=20 cell is smaller than y=100 cell)
    const lowCell = heatmap.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-heatmap-cell[data-row="Node-A"][data-col="00:00"]'
    )!;
    const highCell = heatmap.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-heatmap-cell[data-row="Node-B"][data-col="06:00"]'
    )!;
    const lowW = Number(lowCell.getAttribute('width'));
    const lowH = Number(lowCell.getAttribute('height'));
    const highW = Number(highCell.getAttribute('width'));
    expect(lowW).toBeCloseTo(lowH, 3);
    expect(highW).toBeGreaterThan(lowW);
  });
});
