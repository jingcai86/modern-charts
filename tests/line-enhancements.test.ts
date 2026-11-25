import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  patternLines,
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

  it('splits a patterned area when the baseline crosses a threshold below the whole line', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.config = {
      width: 480,
      height: 300,
      animate: false,
      enableArea: true,
      areaBaselineValue: 0,
      data: [{ id: 'Load', color: '#456', data: [{ x: 'AM', y: 7 }, { x: 'PM', y: 9 }] }],
      defs: [patternLines('warning')],
      markers: [{
        id: 'limit', axis: 'y', value: 5, condition: 'above',
        matchStyle: { color: '#c00', fill: 'warning', opacity: 0.25 }
      }]
    };
    document.body.append(line);
    const root = line.shadowRoot!;
    const path = root.querySelector('path.mc-line-path')!;
    const base = root.querySelector('.mc-line-area-segment--base')!;
    const overlay = root.querySelector('.mc-line-area-segment--threshold')!;

    expect(path.getAttribute('stroke')).toBe('#c00');
    expect(path.getAttribute('clip-path')).toBeNull();
    expect(base.getAttribute('fill')).toMatch(/^url\(#mc-line-area-grad-/);
    expect(overlay.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-warning/);
    expect(Number(overlay.getAttribute('fill-opacity'))).toBeCloseTo(0.55);
    expect(overlay.getAttribute('clip-path')).not.toBe(base.getAttribute('clip-path'));
  });

  it('uses item-wide stroke overrides and restores the point symbol after hovering', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.config = {
      width: 480,
      height: 300,
      animate: false,
      data: [{ id: 'Load', color: '#456', symbol: 'diamond', lineStyle: 'dashed', data: [
        { x: 'AM', y: 2 }, { x: 'PM', y: 9 }
      ] }],
      markers: [{
        id: 'limit', axis: 'y', value: 5, condition: 'below', matchScope: 'item',
        matchStyle: { stroke: '#c00', strokeWidth: 4, className: 'low-load', radius: 6 }
      }]
    };
    document.body.append(line);
    const root = line.shadowRoot!;
    const path = root.querySelector('path.mc-line-path')!;
    const point = root.querySelector('path.mc-line-point.low-load')!;
    const initialPath = point.getAttribute('d');

    expect(path.getAttribute('stroke')).toBe('#c00');
    expect(path.getAttribute('stroke-width')).toBe('4');
    expect(path.getAttribute('stroke-dasharray')).toBe('8 5');
    expect(point.getAttribute('data-under-threshold')).toBe('true');
    expect(point.getAttribute('stroke')).toBe('#c00');
    point.dispatchEvent(new MouseEvent('mouseenter'));
    const tooltip = line.getTooltipElement()!;
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.renderedHtml).toContain('limit');
    expect(point.getAttribute('d')).not.toBe(initialPath);
    point.dispatchEvent(new MouseEvent('mouseleave'));
    expect(point.getAttribute('d')).toBe(initialPath);
    expect(tooltip.hidden).toBe(true);
  });

  it('honors an explicitly declared area layer and data-label overrides without enabling slices', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.innerHTML = '<mc-chart-layer name="areas"></mc-chart-layer>';
    line.config = {
      width: 480,
      height: 300,
      animate: false,
      enableSlices: false,
      pointSize: 0,
      label: { target: 'data' },
      data: [
        { id: 'Observation', data: [{ x: 'AM', y: -2, label: 'Measured' }] },
        { id: 'No observations', data: [{ x: 'AM', y: null }] }
      ]
    };
    document.body.append(line);
    const root = line.shadowRoot!;

    expect(root.querySelector('.mc-line-area[data-series-id="Observation"]')).not.toBeNull();

    line.config = { ...line.config, layers: ['areas', 'lines', 'points', 'pointLabels', 'slices'] };
    expect(root.querySelectorAll('.mc-line-path')).toHaveLength(1);
    expect(root.querySelector('.mc-line-point')).toBeNull();
    expect(root.querySelector('[data-label-id="point-label-Observation-0"]')?.textContent).toBe('Measured');
    expect(root.querySelector('.mc-slice-hit')).toBeNull();
  });

  it.each([
    ['catmullRom', /C/g, 2],
    ['natural', /C/g, 2],
    ['step', /L/g, 5],
    ['stepAfter', /L/g, 4],
    ['stepBefore', /L/g, 4]
  ] as const)('renders the %s curve with the expected path geometry', (curve, command, count) => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.config = {
      width: 480,
      height: 300,
      animate: false,
      data: [{ id: 'Load', data: [{ x: 'AM', y: 2 }, { x: 'Noon', y: 9 }, { x: 'PM', y: 3 }] }]
    };
    line.curve = curve;
    document.body.append(line);
    const path = line.shadowRoot!.querySelector('.mc-line-path')!.getAttribute('d')!;

    expect(line.getAttribute('curve')).toBe(curve);
    expect(path.match(command)).toHaveLength(count);
  });
});
