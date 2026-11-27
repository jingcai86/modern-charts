import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  registerModernCharts,
  type HeatmapRow,
  type LegendItem,
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

function mountHeatmap(config: MCHeatmapChart['config']): MCHeatmapChart {
  const heatmap = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
  heatmap.config = { width: 660, height: 400, data: HEATMAP_DATA, ...config };
  document.body.appendChild(heatmap);
  return heatmap;
}

function legendOrigin(heatmap: MCHeatmapChart): number[] {
  const legend = heatmap.shadowRoot!.querySelector('.mc-legend')!;
  return legend.getAttribute('transform')!.slice('translate('.length, -1).split(',').map(Number);
}

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

  it('uses the ten default discrete swatches as cell colors and clamps out-of-range values', () => {
    const values = [-0.05, 0, 0.05, 0.2999, 0.3, 0.99, 1, 1.05, null];
    const legend = { type: 'discrete', min: 0, max: 1, colorScheme: 'plasma' } as const;
    const heatmap = mountHeatmap({
      data: [{ id: 'A', data: values.map((y, index) => ({ x: String(index), y })) }],
      emptyColor: '#334155',
      legend
    });
    const root = heatmap.shadowRoot!;
    const swatches = () => Array.from(root.querySelectorAll('.mc-legend-discrete-block'));
    const swatchColors = () => swatches().map((block) => block.getAttribute('fill'));
    const cellColors = () => values.map((_, index) => root
      .querySelector(`.mc-heatmap-cell[data-col="${index}"]`)?.getAttribute('fill'));

    expect(swatches()).toHaveLength(10);
    expect(swatches()[3].getAttribute('data-min')).toBe('0.3');
    expect(swatches().at(-1)?.getAttribute('data-max-inclusive')).toBe('true');
    const colors = swatchColors();
    const expected = [0, 0, 0, 2, 3, 9, 9, 9].map((index) => colors[index]);
    expect(new Set(colors).size).toBe(10);
    expect(cellColors()).toEqual([...expected, '#334155']);

    heatmap.setConfig({ ...heatmap.config, legend: { ...legend, enabled: false } });
    expect(swatches()).toHaveLength(0);
    expect(cellColors()).toEqual([...expected, '#334155']);

    heatmap.setConfig({ ...heatmap.config, legend: { ...legend, steps: 4 } });
    expect(swatches()).toHaveLength(4);
    expect(cellColors()[4]).toBe(swatchColors()[1]);

    const fourStepColors = cellColors();
    heatmap.setConfig({ ...heatmap.config, layers: ['axes', 'cells', 'labels'] });
    expect(swatches()).toHaveLength(0);
    expect(cellColors()).toEqual(fourStepColors);
  });

  it.each([
    ['top', 184, 16],
    ['bottom', 184, 16],
    ['left', 16, 128],
    ['right', 16, 128]
  ] as const)('positions the continuous gradient at %s with custom geometry and end labels', (position, width, height) => {
    const heatmap = mountHeatmap({
      legend: { position, width, height, borderRadius: 3, minLabel: 'Idle', maxLabel: 'Full' }
    });
    const legend = heatmap.shadowRoot!.querySelector(
      `.mc-legend--continuous[data-legend-position="${position}"]`
    )!;
    const bar = legend.querySelector('.mc-legend-gradient-bar')!;
    expect(bar.getAttribute('width')).toBe(String(width));
    expect(bar.getAttribute('height')).toBe(String(height));
    expect(bar.getAttribute('rx')).toBe('3');
    expect(legend.querySelector('[data-label-id="legend-continuous-min"]')?.textContent).toBe('Idle');
    expect(legend.querySelector('[data-label-id="legend-continuous-max"]')?.textContent).toBe('Full');
  });

  it.each([
    ['top', 'continuous'],
    ['bottom', 'continuous'],
    ['left', 'discrete'],
    ['right', 'discrete']
  ] as const)('aligns the %s legend from physical start to end on its side', (position, type) => {
    const horizontal = position === 'top' || position === 'bottom';
    const along = horizontal ? 0 : 1;
    const length = 120;
    const padding = { left: 20, right: 36, top: 10, bottom: 26 };
    const legend = {
      type, position, padding, labelPlacement: 'none',
      width: horizontal ? length : 16,
      height: horizontal ? 16 : length
    } as const;
    const heatmap = mountHeatmap({ legend, i18n: { direction: 'rtl' } });
    const { innerWidth, innerHeight } = heatmap.resolveDimensions();
    const start = horizontal ? padding.left : padding.top;
    const end = horizontal ? innerWidth - padding.right - length : innerHeight - padding.bottom - length;
    const middle = (start + end) / 2;
    const defaultOrigin = legendOrigin(heatmap);
    expect(defaultOrigin[along]).toBeCloseTo(middle);

    for (const [align, expected] of [['start', start], ['middle', middle], ['end', end]] as const) {
      heatmap.setConfig({ ...heatmap.config, legend: { ...legend, align } });
      const origin = legendOrigin(heatmap);
      expect(origin[along]).toBeCloseTo(expected);
      expect(origin[1 - along]).toBeCloseTo(defaultOrigin[1 - along]);
    }
  });

  it('renders formatted boundary ticks and exposes discrete ranges to the dedicated legend tooltip', () => {
    const legendItems: LegendItem[] = [];
    const heatmap = mountHeatmap({
      isFocusable: true,
      i18n: { locale: 'de-DE' },
      legend: {
        type: 'discrete', steps: 4, min: 0, max: 100, position: 'bottom', width: 320,
        labelPlacement: 'ticks', tickFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
        tooltip: { formatter: ({ datum }) => {
          if (datum) legendItems.push(datum);
          return 'Custom range';
        } }
      }
    });
    const root = heatmap.shadowRoot!;
    const legend = root.querySelector('.mc-legend--discrete')!;
    expect(legend.querySelectorAll('.mc-legend-tick')).toHaveLength(5);
    expect(Array.from(legend.querySelectorAll('[data-label-id^="legend-discrete-tick-"]'),
      (label) => label.textContent)).toEqual(['0,0', '25,0', '50,0', '75,0', '100,0']);

    const item = legend.querySelector('.mc-legend-item')!;
    const tooltip = heatmap.getLegendTooltipElement()!;
    expect(item.getAttribute('tabindex')).toBe('0');
    item.dispatchEvent(new MouseEvent('mouseenter', { clientX: 200, clientY: 332 }));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.shadowRoot?.textContent).toContain('Custom range');
    expect(legendItems.at(-1)?.meta).toMatchObject({ min: 0, max: 25, maxInclusive: false });
    item.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);

    item.dispatchEvent(new FocusEvent('focus'));
    expect(tooltip.hidden).toBe(false);
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tooltip.hidden).toBe(true);

    heatmap.setConfig({ ...heatmap.config, legend: {
      type: 'discrete', labelPlacement: 'none', enableTooltip: false
    } });
    const quietLegend = root.querySelector('.mc-legend--discrete')!;
    expect(quietLegend.querySelectorAll('text, .mc-legend-tick')).toHaveLength(0);
    quietLegend.querySelector('.mc-legend-item')!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.hidden).toBe(true);
  });

  it('supports declarative discrete sizing, end labels, block spacing, and live mode changes', async () => {
    const heatmap = mountHeatmap({});
    heatmap.innerHTML = `<mc-legend type="discrete" position="right" align="start" steps="3" width="18" height="150"
      border-radius="2" block-gap="3" label-placement="ends" min-label="Low" max-label="High"
      tick-format='{"minimumFractionDigits":1}'></mc-legend>`;
    const root = heatmap.shadowRoot!;
    const legend = await vi.waitFor(() => {
      const rendered = root.querySelector('.mc-legend--discrete[data-legend-position="right"]');
      expect(rendered).not.toBeNull();
      return rendered!;
    });
    const blocks = Array.from(legend.querySelectorAll('.mc-legend-discrete-block'));
    expect(blocks).toHaveLength(3);
    expect(blocks[0].getAttribute('width')).toBe('18');
    expect(blocks[0].getAttribute('height')).toBe('48');
    expect(blocks[0].getAttribute('rx')).toBe('2');
    expect(legend.querySelector('[data-label-id="legend-discrete-min"]')?.textContent).toBe('Low');
    expect(legend.querySelector('[data-label-id="legend-discrete-max"]')?.textContent).toBe('High');
    expect(legend.querySelector('.mc-legend-tick')).toBeNull();

    const declarativeLegend = heatmap.querySelector('mc-legend')!;
    expect(heatmap.resolveLegendConfig().align).toBe('start');
    const start = legendOrigin(heatmap)[1];
    declarativeLegend.setAttribute('align', 'end');
    const end = legendOrigin(heatmap)[1];
    expect(end).toBeGreaterThan(start);
    declarativeLegend.setAttribute('align', 'middle');
    expect(legendOrigin(heatmap)[1]).toBeCloseTo((start + end) / 2);
    declarativeLegend.removeAttribute('align');
    expect(legendOrigin(heatmap)[1]).toBeCloseTo((start + end) / 2);
    declarativeLegend.removeAttribute('min-label');
    expect(root.querySelector('[data-label-id="legend-discrete-min"]')?.textContent).toBe('20.0');
    declarativeLegend.setAttribute('type', 'continuous');
    expect(root.querySelector('.mc-legend--discrete')).toBeNull();
    expect(root.querySelector('.mc-legend--continuous[data-legend-position="right"]')).not.toBeNull();
  });

  it('renders one well-defined discrete range for an equal-valued domain', () => {
    const heatmap = mountHeatmap({
      data: [{ id: 'A', data: [{ x: 'X', y: -4 }, { x: 'Y', y: -4 }] }],
      legend: { type: 'discrete', tickFormat: (value) => `${value} C` }
    });
    const root = heatmap.shadowRoot!;
    const blocks = root.querySelectorAll('.mc-legend-discrete-block');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].getAttribute('data-min')).toBe('-4');
    expect(blocks[0].getAttribute('data-max')).toBe('-4');
    expect(root.querySelector('.mc-heatmap-cell')?.getAttribute('fill')).toBe(blocks[0].getAttribute('fill'));
    expect(root.querySelector('[data-label-id="legend-discrete-min"]')?.textContent).toBe('-4 C');
  });
});
