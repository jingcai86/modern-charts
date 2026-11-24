import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type MCRadarChart,
  type RadarDatum
} from '../src/index';

const SAMPLE_RADAR: RadarDatum[] = [
  { metric: 'Speed', Alpha: 80, Beta: 60 },
  { metric: 'Safety', Alpha: 90, Beta: 75 },
  { metric: 'DX', Alpha: 70, Beta: 85 },
  { metric: 'Bundle', Alpha: 95, Beta: 50 }
];

describe('Radar Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports maxValue, startAngle rotation, and gridLabelOffset', () => {
    const radar = document.createElement('mc-radar-chart') as MCRadarChart;
    document.body.appendChild(radar);

    // 1. Default startAngle = 0 (first spoke points straight up at 12 o'clock: x2 ≈ 0, y2 < 0)
    radar.config = {
      width: 480,
      height: 380,
      indexBy: 'metric',
      keys: ['Alpha', 'Beta'],
      maxValue: 200,
      startAngle: 0,
      gridLabelOffset: 28,
      data: SAMPLE_RADAR
    };

    const spoke0 = radar.shadowRoot!.querySelectorAll<SVGLineElement>('.mc-radar-spoke')[0];
    expect(Number(spoke0.getAttribute('x2'))).toBeCloseTo(0, 3);
    expect(Number(spoke0.getAttribute('y2'))).toBeLessThan(-40);

    // 2. Rotate startAngle = 90 degrees (first spoke points right at 3 o'clock: x2 > 0, y2 ≈ 0)
    radar.config = {
      ...radar.config,
      startAngle: 90
    };

    const rotatedSpoke0 = radar.shadowRoot!.querySelectorAll<SVGLineElement>('.mc-radar-spoke')[0];
    expect(Number(rotatedSpoke0.getAttribute('x2'))).toBeGreaterThan(40);
    expect(Number(rotatedSpoke0.getAttribute('y2'))).toBeCloseTo(0, 3);
  });

  it('supports dotSize, dotBorderWidth, blendMode, and splitArea shading', () => {
    const radar = document.createElement('mc-radar-chart') as MCRadarChart;
    document.body.appendChild(radar);

    radar.config = {
      width: 480,
      height: 380,
      indexBy: 'metric',
      keys: ['Alpha', 'Beta'],
      gridLevels: 5,
      gridShape: 'linear',
      splitArea: true,
      blendMode: 'multiply',
      dotSize: 12,
      dotBorderWidth: 3,
      data: SAMPLE_RADAR
    };

    // splitArea on 5 levels renders alternating bands for levels 1, 3, 5 (3 bands)
    const splitBands = radar.shadowRoot!.querySelectorAll('.mc-radar-split-area');
    expect(splitBands.length).toBe(3);

    // Polygon blendMode
    const poly = radar.shadowRoot!.querySelector<SVGPolygonElement>('.mc-radar-polygon')!;
    expect(poly.getAttribute('data-blend-mode')).toBe('multiply');
    expect(poly.style.mixBlendMode).toBe('multiply');

    // Dot radius = dotSize / 2 = 6, stroke-width = 3
    const dot = radar.shadowRoot!.querySelector<SVGCircleElement>('.mc-radar-dot')!;
    expect(dot.getAttribute('r')).toBe('6');
    expect(dot.getAttribute('stroke-width')).toBe('3');
  });
});
