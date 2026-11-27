import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  patternLines,
  type ChartRenderContext,
  type MCBarChart,
  type MCBaseChart,
  type MCHeatmapChart,
  type MCLineChart,
  type MCPieChart,
  type MCRadarChart,
  type MCSankeyChart,
  type MCSunburstChart,
  type PieChartModel,
  type PieDatum
} from '../src/index';

beforeAll(async () => {
  await registerModernCharts();
});

function mountChart<T extends MCBaseChart>(tag: string, config: T['config']): T {
  const chart = document.createElement(tag) as T;
  chart.config = { width: 520, height: 320, animate: false, ...config };
  document.body.append(chart);
  return chart;
}

afterEach(() => document.body.replaceChildren());

describe('Chart data and configuration edge cases', () => {
  it('infers bar series from numeric columns and accepts an explicit replacement key list', () => {
    const bar = mountChart<MCBarChart>('mc-bar-chart', {
      indexBy: 'day',
      data: [
        { day: 1, shipped: 12, returned: 3, note: 'First day' },
        { day: 2, shipped: 15, returned: 6, note: 'Second day' }
      ]
    });
    const bars = () => bar.shadowRoot!.querySelectorAll('.mc-bar-rect');

    expect(bars()).toHaveLength(4);
    expect(bars()[0].getAttribute('data-index')).toBe('1');
    expect(bar.keys).toEqual(['shipped', 'returned']);

    bar.keys = ['returned'];
    expect(bars()).toHaveLength(2);
    expect(Array.from(bars(), (rect) => rect.getAttribute('data-key'))).toEqual(['returned', 'returned']);

    bar.keys = [];
    expect(bar.chartState).toBe('empty');
    expect(bars()).toHaveLength(0);
  });

  it('uses the inferred stacked bar layout and renders outer labels once in their own layer', () => {
    const bar = mountChart<MCBarChart>('mc-bar-chart', {
      yScale: { stacked: true },
      data: [{ category: 'Q1', services: 6, licenses: 4 }],
      outerLabels: { scope: 'stack' },
      layers: ['bars', 'labels', 'outerLabels']
    });
    bar.setAttribute('enable-outer-labels', 'true');
    const root = bar.shadowRoot!;

    expect(bar.groupMode).toBe('stacked');
    expect(root.querySelectorAll('.mc-label--bar-outer')).toHaveLength(1);
    expect(root.querySelector('.mc-layer--outerLabels .mc-label--bar-outer')?.textContent).toBe('10');

    bar.config = { ...bar.config, yScale: { stacked: false } };
    bar.setAttribute('group-mode', 'grouped');
    expect(bar.getAttribute('group-mode')).toBe('grouped');
    const rects = Array.from(root.querySelectorAll('.mc-bar-rect'));
    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute('x')).not.toBe(rects[1].getAttribute('x'));
  });

  it('infers radar series from numeric columns and updates with declarative and imperative keys', () => {
    const radar = mountChart<MCRadarChart>('mc-radar-chart', {
      data: [
        { metric: 'Clarity', Aurora: 42, Boreal: 60, description: 'Readable' },
        { metric: 'Speed', Aurora: 67, Boreal: 48, description: 'Responsive' }
      ]
    });
    const dots = () => radar.shadowRoot!.querySelectorAll('.mc-radar-dot');
    expect(radar.keys).toEqual(['Aurora', 'Boreal']);
    expect(dots()).toHaveLength(4);

    radar.setAttribute('keys', ' Boreal, ');
    expect(radar.keys).toEqual(['Boreal']);
    expect(dots()).toHaveLength(2);

    radar.keys = [];
    expect(radar.chartState).toBe('empty');
    expect(dots()).toHaveLength(0);
  });

  it('allows a zero-valued radar series but treats a label-only dataset as empty', () => {
    const radar = mountChart<MCRadarChart>('mc-radar-chart', {
      data: [{ metric: 'Low', value: 0 }, { metric: 'High', value: 0 }]
    });
    const root = radar.shadowRoot!;
    const dots = Array.from(root.querySelectorAll('.mc-radar-dot'));
    expect(dots).toHaveLength(2);
    expect(dots.every((dot) => Number(dot.getAttribute('cx')) === 0 && Number(dot.getAttribute('cy')) === 0)).toBe(true);

    radar.data = [{ metric: 'Low', note: 'n/a' }, { metric: 'High', note: 'missing' }];
    expect(radar.chartState).toBe('empty');
    expect(root.querySelector('.mc-radar-polygon')).toBeNull();
  });

  it('retains a minimum pie slice angle with the requested sweep and the original percentage', () => {
    let model!: PieChartModel;
    mountChart<MCPieChart>('mc-pie-chart', {
      data: [
        { id: 'Small', value: 1 },
        { id: 'Large', value: 98 },
        { id: 'Other', value: 1 }
      ],
      startAngle: 90,
      endAngle: -90,
      minAngle: 15,
      sort: 'none',
      layers: ['arcs', (ctx: ChartRenderContext<PieDatum[]>) => { model = ctx.state.model as PieChartModel; }]
    });
    const [small, large, other] = model.arcs;
    const degrees = ({ startAngle, endAngle }: PieChartModel['arcs'][number]) =>
      (startAngle - endAngle) * 180 / Math.PI;

    expect(degrees(small)).toBeCloseTo(15);
    expect(degrees(other)).toBeCloseTo(15);
    expect(degrees(large)).toBeCloseTo(150);
    expect(small.startAngle).toBeCloseTo(Math.PI / 2);
    expect(other.endAngle).toBeCloseTo(-Math.PI / 2);
    expect(small.percentage).toBe(1);
  });

  it('scales rose slices by squared radius from the inner hole in area mode', () => {
    let model!: PieChartModel;
    mountChart<MCPieChart>('mc-pie-chart', {
      data: [{ id: 'Quarter', value: 25 }, { id: 'Full', value: 100 }],
      innerRadius: 0.25,
      roseType: 'area',
      layers: ['arcs', (ctx: ChartRenderContext<PieDatum[]>) => { model = ctx.state.model as PieChartModel; }]
    });
    const [quarter, full] = model.arcs;
    const radialArea = (radius: number) => radius ** 2 - model.innerRadius ** 2;
    expect(radialArea(quarter.sliceOuterRadius) / radialArea(full.sliceOuterRadius)).toBeCloseTo(0.25);
  });

  it('builds Sankey nodes from link endpoints and preserves supplied names', () => {
    const chart = mountChart<MCSankeyChart>('mc-sankey-chart', {
      data: {
        nodes: [{ id: 'stage', name: 'Known stage' }],
        links: [
          { source: 'origin', target: 'stage', value: 4 },
          { source: 'stage', target: 'end', value: 4 }
        ]
      }
    });
    const root = chart.shadowRoot!;
    const nodes = Array.from(root.querySelectorAll('.mc-sankey-node'));
    expect(nodes.map((node) => node.getAttribute('data-node-id'))).toEqual(['stage', 'origin', 'end']);
    expect(nodes.map((node) => [node.getAttribute('data-node-id'), node.getAttribute('data-column')])).toEqual([
      ['stage', '1'], ['origin', '0'], ['end', '2']
    ]);
    expect(root.querySelector('.mc-layer--labels')?.textContent).toContain('Known stage');
    expect(root.querySelectorAll('.mc-sankey-link')).toHaveLength(2);

    const link = root.querySelector('.mc-sankey-link[data-source="origin"]')!;
    link.dispatchEvent(new MouseEvent('mouseenter'));
    const tooltip = chart.getTooltipElement()!;
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.renderedHtml).toContain('origin → Known stage');
    link.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);
  });

  it.each([
    ['adjacency', ['B', 'C']],
    ['trajectory', ['A', 'B', 'C', 'D']],
    ['none', []]
  ] as const)('uses %s focus for a Sankey link and restores opacity on blur', (focusMode, expected) => {
    const chart = mountChart<MCSankeyChart>('mc-sankey-chart', {
      data: {
        nodes: ['A', 'B', 'C', 'D', 'Branch'].map((id) => ({ id })),
        links: [
          { source: 'A', target: 'B', value: 12 },
          { source: 'B', target: 'C', value: 12 },
          { source: 'C', target: 'D', value: 12 },
          { source: 'A', target: 'Branch', value: 6 }
        ]
      },
      focusMode,
      linkOpacity: 0.4
    });
    const root = chart.shadowRoot!;
    const link = root.querySelector('.mc-sankey-link[data-source="B"][data-target="C"]')!;
    link.dispatchEvent(new FocusEvent('focus'));

    expect(Array.from(
      root.querySelectorAll('.mc-sankey-node[data-focus-state="active"]'),
      (node) => node.getAttribute('data-node-id')
    )).toEqual(expected);
    expect(Number(link.getAttribute('fill-opacity'))).toBeCloseTo(focusMode === 'none' ? 0.4 : 0.75);

    link.dispatchEvent(new FocusEvent('blur'));
    expect(root.querySelector('[data-focus-state]')).toBeNull();
    expect(link.getAttribute('fill-opacity')).toBe('0.4');
  });

  it('keeps both crosshairs and tooltip data aligned with a time slice that has incomplete series', () => {
    const line = mountChart<MCLineChart>('mc-line-chart', {
      xScale: { type: 'time' },
      crosshairType: 'cross',
      enablePointLabels: true,
      i18n: { locale: 'en-US', timeZone: 'UTC' },
      data: [
        {
          id: 'Below limit',
          data: [
            { x: '2024-01-01T00:00:00Z', y: 8 },
            { x: '2024-01-02T00:00:00Z', y: 4, label: 'Observation' }
          ]
        },
        {
          id: 'Above limit',
          data: [
            { x: '2024-01-01T00:00:00Z', y: 30 },
            { x: '2024-01-02T00:00:00Z', y: 24 }
          ]
        },
        { id: 'Gap', data: [{ x: '2024-01-01T00:00:00Z', y: 10 }, { x: '2024-01-02T00:00:00Z', y: null }] },
        { id: 'Short series', data: [{ x: '2024-01-01T00:00:00Z', y: 17 }] }
      ],
      markers: [{ id: 'minimum', type: 'line', axis: 'y', condition: 'below', value: 10, matchStyle: { color: '#c00' } }]
    });
    const root = line.shadowRoot!;
    const x = root.querySelector<SVGLineElement>('.mc-crosshair--x')!;
    const y = root.querySelector<SVGLineElement>('.mc-crosshair--y')!;
    const slice = root.querySelectorAll('.mc-slice-hit')[1];
    const tooltip = line.getTooltipElement()!;

    slice.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 160 }));
    expect(x.style.opacity).toBe('0.75');
    expect(y.style.opacity).toBe('0.75');
    expect(Number(x.getAttribute('x1'))).toBeGreaterThan(0);
    const topPoint = root.querySelector('.mc-line-point[data-series-id="Above limit"][data-point-index="1"]')!;
    expect(y.getAttribute('y1')).toBe(topPoint.getAttribute('cy'));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.renderedHtml).toContain('Below limit');
    expect(tooltip.renderedHtml).toContain('Above limit');
    expect(tooltip.renderedHtml).toContain('⚠');
    expect(tooltip.renderedHtml).not.toContain('Gap');
    expect(tooltip.renderedHtml).not.toContain('Short series');
    expect(root.querySelector('.mc-layer--pointLabels')?.textContent).toContain('Observation');

    slice.dispatchEvent(new MouseEvent('mouseleave'));
    expect(x.style.opacity).toBe('0');
    expect(y.style.opacity).toBe('0');
    expect(tooltip.hidden).toBe(true);
  });

  it('applies threshold styles to the entire line and area when every point matches', () => {
    const line = mountChart<MCLineChart>('mc-line-chart', {
      data: [{ id: 'Load', data: [{ x: 'AM', y: 2 }, { x: 'PM', y: 4 }] }],
      enableArea: true,
      areaBaselineValue: 0,
      areaOpacity: 0.3,
      defs: [patternLines('warning')],
      markers: [{
        id: 'minimum', type: 'line', axis: 'y', condition: 'below', value: 6,
        matchStyle: { fill: 'warning', stroke: '#c00', strokeWidth: 5, strokeDasharray: '3 2', opacity: 0.5 }
      }]
    });
    const root = line.shadowRoot!;
    const path = root.querySelector<SVGPathElement>('path.mc-line-path')!;
    expect(path.getAttribute('stroke')).toBe('#c00');
    expect(path.getAttribute('stroke-width')).toBe('5');
    expect(path.getAttribute('stroke-dasharray')).toBe('3 2');
    expect(root.querySelector('path.mc-line-area')?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-warning(?:-c\d+)?\)$/);
    expect(root.querySelector('.mc-line-point')?.getAttribute('opacity')).toBe('0.5');
  });

  it('keeps separately styled base and threshold segments on a line that crosses a marker', () => {
    const line = mountChart<MCLineChart>('mc-line-chart', {
      data: [{ id: 'Load', color: '#456', data: [{ x: 'AM', y: 2 }, { x: 'PM', y: 8 }] }],
      lineStyle: 'dashed',
      enableArea: true,
      defs: [patternLines('base')],
      fill: [{ match: { target: 'area' }, id: 'base' }],
      markers: [{
        id: 'minimum', type: 'line', axis: 'y', condition: 'below', value: 5,
        matchStyle: { color: '#c00', strokeDasharray: '2 2', opacity: 0.4 }
      }]
    });
    const root = line.shadowRoot!;
    const base = root.querySelector('.mc-line-segment--base')!;
    const overlay = root.querySelector('.mc-line-segment--threshold')!;
    expect(base.getAttribute('stroke')).toBe('#456');
    expect(base.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(overlay.getAttribute('stroke')).toBe('#c00');
    expect(overlay.getAttribute('stroke-opacity')).toBe('0.4');
    expect(overlay.getAttribute('stroke-dasharray')).toBe('2 2');
    expect(root.querySelector('.mc-line-area-segment--base')?.getAttribute('fill')).toMatch(/^url\(#mc-def-\d+-base(?:-c\d+)?\)$/);
  });

  it('inherits short hex and named colors in nested sunburst rings', () => {
    const chart = mountChart<MCSunburstChart>('mc-sunburst-chart', {
      data: {
        name: 'Regions',
        children: [
          { name: 'Land', color: '#000', children: [{ name: 'Forest', value: 60 }] },
          { name: 'Water', color: 'royalblue', children: [{ name: 'Lake', value: 40 }] }
        ]
      },
      innerRadius: 45,
      sort: 'asc'
    });
    const root = chart.shadowRoot!;
    const fill = (name: string) => root.querySelector(`.mc-sunburst-arc[data-name="${name}"]`)?.getAttribute('fill');
    expect(fill('Land')).toBe('#000');
    expect(fill('Forest')).toMatch(/^#[0-9a-f]{6}$/);
    expect(fill('Forest')).not.toBe('#000000');
    expect(fill('Lake')).toBe('royalblue');
    expect(root.querySelector('.mc-sunburst-center')?.getAttribute('r')).toBe('42');
  });

  it('uses the middle heatmap color and preserves cell geometry for constant input', () => {
    const chart = mountChart<MCHeatmapChart>('mc-heatmap-chart', {
      data: [{ id: 'Region', data: [{ x: 'Morning', y: 7 }, { x: 'Evening', y: 7 }] }],
      sizeVariation: 0.5,
      cellShape: 'circle'
    });
    const cells = [...chart.shadowRoot!.querySelectorAll('.mc-heatmap-cell')];
    expect(cells).toHaveLength(2);
    expect(cells[0].tagName.toLowerCase()).toBe('circle');
    expect(Number(cells[0].getAttribute('r'))).toBeGreaterThan(0);
    expect(cells[0].getAttribute('r')).toBe(cells[1].getAttribute('r'));
    expect(cells.map((cell) => cell.getAttribute('fill'))).toEqual(['rgb(38, 130, 142)', 'rgb(38, 130, 142)']);
  });
});
