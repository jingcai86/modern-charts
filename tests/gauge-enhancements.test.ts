import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type MCGaugeChart
} from '../src/index';

describe('Gauge Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
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
});
