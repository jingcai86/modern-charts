import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type LineSeries,
  type MCLineChart
} from '../src/index';

const LINE_DATA_WITH_NULL: LineSeries[] = [
  {
    id: 'API',
    data: [
      { x: 'T1', y: 100 },
      { x: 'T2', y: null },
      { x: 'T3', y: 180 }
    ]
  },
  {
    id: 'Worker',
    data: [
      { x: 'T1', y: 50 },
      { x: 'T2', y: 90 },
      { x: 'T3', y: 120 }
    ]
  }
];

describe('Line Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports connectNulls (true vs false), stacked, areaBaselineValue, lineStyle, symbol, pointBorderWidth, and crosshairType', () => {
    const lineChart = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(lineChart);

    // 1. connectNulls: false splits the 'API' path across the null T2 point (2 'M' subpaths)
    lineChart.config = {
      width: 560,
      height: 360,
      curve: 'linear',
      connectNulls: false,
      enableArea: true,
      areaBaselineValue: 20,
      lineStyle: 'dashed',
      symbol: 'diamond',
      pointBorderWidth: 3.5,
      crosshairType: 'cross',
      data: LINE_DATA_WITH_NULL
    };

    const apiPath = lineChart.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="API"]'
    )!;
    const moveCommandsFalse = (apiPath.getAttribute('d') || '').match(/M/g) || [];
    expect(moveCommandsFalse.length).toBe(2);
    expect(apiPath.getAttribute('stroke-dasharray')).toBe('8 5');

    // Only 5 defined points are rendered (API has 2 defined points, Worker has 3)
    const points = lineChart.shadowRoot!.querySelectorAll<SVGPathElement>('.mc-line-point');
    expect(points.length).toBe(5);
    expect(points[0].getAttribute('data-symbol')).toBe('diamond');
    expect(points[0].getAttribute('stroke-width')).toBe('3.5');

    // crosshairType: 'cross' renders both .mc-crosshair--x and .mc-crosshair--y
    expect(lineChart.shadowRoot!.querySelector('.mc-crosshair--x')).not.toBeNull();
    expect(lineChart.shadowRoot!.querySelector('.mc-crosshair--y')).not.toBeNull();

    // 2. connectNulls: true bridges across null T2 in a single continuous path (1 'M' command) + stacked: true
    lineChart.config = {
      ...lineChart.config,
      connectNulls: true,
      stacked: true,
      lineStyle: 'dotted'
    };

    const apiPathConnected = lineChart.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-line-path[data-series-id="API"]'
    )!;
    const moveCommandsTrue =
      (apiPathConnected.getAttribute('d') || '').match(/M/g) || [];
    expect(moveCommandsTrue.length).toBe(1);
    expect(apiPathConnected.getAttribute('stroke-dasharray')).toBe('2 4');
  });
});
