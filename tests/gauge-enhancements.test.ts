import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type ChartRenderContext,
  type GaugeDataInput,
  type MCGaugeChart
} from '../src/index';
import type { GaugeChartModel } from '../src/models/gauge.model';

describe('Gauge Chart Enhancements (Issue #73)', () => {
  beforeAll(async () => {
    await registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports custom startAngle, endAngle, innerRadius, cornerRadius, splitNumber, and minorSplitNumber', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    document.body.appendChild(gauge);

    gauge.config = {
      width: 480,
      height: 320,
      min: 0,
      max: 200,
      unit: ' km/h',
      startAngle: -90,
      endAngle: 90,
      innerRadius: 0.65,
      cornerRadius: 0,
      splitNumber: 4,
      minorSplitNumber: 5,
      data: {
        value: 100,
        label: 'Half-Circle Speedometer'
      }
    };

    // 4 major splits -> 5 major tick lines + 5 tick labels
    const majorTicks = gauge.shadowRoot!.querySelectorAll('.mc-gauge-tick-line');
    expect(majorTicks.length).toBe(5);

    // 4 major splits * (5 - 1) minor subdivisions = 16 minor tick lines
    const minorTicks = gauge.shadowRoot!.querySelectorAll('.mc-gauge-minor-tick-line');
    expect(minorTicks.length).toBe(16);

    // At value = 100 (midpoint of 0..200 on -90..+90 sweep), needle points straight up (x2 ≈ 0, y2 < 0)
    const needle = gauge.shadowRoot!.querySelector<SVGLineElement>('.mc-gauge-needle')!;
    expect(Number(needle.getAttribute('x2'))).toBeCloseTo(0, 3);
    expect(Number(needle.getAttribute('y2'))).toBeLessThan(-40);
  });

  it('supports needle, triangle, pin, and none pointer types along with pointerLength and pointerWidth', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    document.body.appendChild(gauge);

    // 1. Triangle pointer
    gauge.config = {
      width: 440,
      height: 300,
      pointerType: 'triangle',
      pointerLength: 0.92,
      pointerWidth: 5,
      data: { value: 75 }
    };
    const tri = gauge.shadowRoot!.querySelector('.mc-gauge-needle--triangle');
    expect(tri).not.toBeNull();
    expect(tri!.tagName.toLowerCase()).toBe('polygon');

    // 2. Pin pointer
    gauge.config = {
      ...gauge.config,
      pointerType: 'pin'
    };
    const pin = gauge.shadowRoot!.querySelector('.mc-gauge-needle--pin');
    expect(pin).not.toBeNull();
    expect(pin!.tagName.toLowerCase()).toBe('circle');
    expect(gauge.shadowRoot!.querySelector('.mc-gauge-pivot')).toBeNull();

    // 3. None pointer (arc-only progress gauge)
    gauge.config = {
      ...gauge.config,
      pointerType: 'none'
    };
    expect(gauge.shadowRoot!.querySelector('.mc-gauge-needle')).toBeNull();
  });

  it('supports multi-ring / multi-pointer GaugeDatum[] data arrays', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    document.body.appendChild(gauge);

    gauge.config = {
      width: 480,
      height: 340,
      min: 0,
      max: 100,
      unit: '%',
      pointerType: 'needle',
      data: [
        { value: 88, label: 'CPU', color: '#6366f1' },
        { value: 64, label: 'Memory', color: '#10b981' },
        { value: 42, label: 'Disk', color: '#f59e0b' }
      ]
    };

    const tracks = gauge.shadowRoot!.querySelectorAll('.mc-gauge-track');
    const arcs = gauge.shadowRoot!.querySelectorAll('.mc-gauge-value-arc');
    const needles = gauge.shadowRoot!.querySelectorAll('.mc-gauge-needle');
    expect(tracks.length).toBe(3);
    expect(arcs.length).toBe(3);
    expect(needles.length).toBe(3);
  });

  it('clamps each gauge ring to its own range and keeps its unit in the tooltip', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    let model: GaugeChartModel | undefined;
    gauge.config = {
      width: 440,
      height: 340,
      animate: false,
      centerLabel: 'Pressure',
      startAngle: 0,
      endAngle: 360,
      innerRadius: 70,
      splitNumber: 0,
      data: [
        { min: 20, max: 20, value: 130, unit: ' kPa' },
        { min: -10, max: 10, value: -15, unit: ' °C' }
      ],
      layers: ['track', 'valueArc', 'ticks', 'center', 'legends', (ctx: ChartRenderContext<GaugeDataInput>) => {
        model = ctx.state.model as GaugeChartModel;
      }]
    };
    document.body.append(gauge);
    const root = gauge.shadowRoot!;

    expect(model).toMatchObject({
      min: 20,
      max: 120,
      innerRadius: 70,
      series: [
        { value: 120, min: 20, max: 120, unit: ' kPa' },
        { value: -10, min: -10, max: 10, unit: ' °C' }
      ]
    });
    expect(model?.arcBottomY).toBe(model?.bandOuterRadius);
    expect(root.querySelector('[data-label-id="gauge-value-label"]')?.textContent).toBe('120 kPa / -10 °C');
    expect(root.querySelector('[data-label-id="gauge-subtitle-label"]')?.textContent).toBe('Pressure');
    expect(root.querySelector('.mc-gauge-tick-line')).toBeNull();

    const secondaryArc = root.querySelector('.mc-gauge-value-arc[data-series-index="1"]')!;
    secondaryArc.dispatchEvent(new MouseEvent('mouseenter'));
    const tooltip = gauge.getTooltipElement()!;
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.renderedHtml).toContain('-10 °C');
    secondaryArc.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);
  });

  it('keeps graduation marks and an explicit single-value legend when gauge labels are disabled', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    gauge.setAttribute('enable-labels', 'false');
    gauge.config = {
      width: 440,
      height: 320,
      animate: false,
      legend: { enabled: true },
      splitNumber: 2,
      minorSplitNumber: 1,
      data: { value: 62, unit: '%' }
    };
    document.body.append(gauge);
    const root = gauge.shadowRoot!;

    expect(root.querySelectorAll('.mc-gauge-tick-line')).toHaveLength(3);
    expect(root.querySelector('.mc-gauge-minor-tick-line')).toBeNull();
    expect(root.querySelector('[data-label-id="gauge-tick-0"]')).toBeNull();
    expect(root.querySelector('[data-label-id="gauge-value-label"]')).toBeNull();
    expect(root.querySelector('.mc-legend-item[data-legend-id="gauge-value"]')?.textContent).toContain('Value');
  });

  it('renders the empty state for missing or nonnumeric gauge readings and recovers at zero', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    gauge.config = { width: 440, height: 320, animate: false };
    document.body.append(gauge);
    const root = gauge.shadowRoot!;

    for (const data of ['[]', '[null, 2]', '[{"value":null}, {}, {"value":""}, {"value":"broken"}]']) {
      gauge.setAttribute('data', data);
      expect(gauge.chartState).toBe('empty');
      expect(root.querySelector('.mc-gauge-value-arc')).toBeNull();
    }

    gauge.setAttribute('data', '{"value":0}');
    expect(gauge.chartState).toBe('ready');
    expect(root.querySelector('[data-label-id="gauge-value-label"]')?.textContent).toBe('0');
  });
});
