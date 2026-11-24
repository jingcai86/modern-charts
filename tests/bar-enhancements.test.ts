import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  registerModernCharts,
  type BarDatum,
  type MCBarChart
} from '../src/index';

const BAR_DATA: BarDatum[] = [
  { category: 'Q1', Cloud: 2, Edge: 120 },
  { category: 'Q2', Cloud: 60, Edge: 180 }
];

describe('Bar Chart Enhancements (Issue #73)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('supports padding, innerPadding, barMaxWidth, barMinHeight, min/max, and reverse', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    bar.config = {
      width: 560,
      height: 360,
      indexBy: 'category',
      keys: ['Cloud', 'Edge'],
      groupMode: 'grouped',
      layout: 'vertical',
      padding: 0.3,
      innerPadding: 10,
      barMaxWidth: 28,
      barMinHeight: 14,
      min: 0,
      max: 250,
      data: BAR_DATA
    };

    const rects = Array.from(
      bar.shadowRoot!.querySelectorAll<SVGRectElement>('.mc-bar-rect')
    );
    expect(rects.length).toBe(4);

    // Every bar width is capped by barMaxWidth = 28
    for (const r of rects) {
      expect(Number(r.getAttribute('width'))).toBeLessThanOrEqual(28.01);
    }

    // Small Q1 Cloud bar (value = 2 on 0..250 domain) is boosted to at least barMinHeight = 14px
    const q1Cloud = bar.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-bar-rect[data-key="Cloud"][data-index="Q1"]'
    )!;
    expect(Number(q1Cloud.getAttribute('height'))).toBeGreaterThanOrEqual(14);

    // Gap between Q1 Cloud and Q1 Edge equals innerPadding = 10px
    const q1Edge = bar.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-bar-rect[data-key="Edge"][data-index="Q1"]'
    )!;
    const gap =
      Number(q1Edge.getAttribute('x')) -
      (Number(q1Cloud.getAttribute('x')) + Number(q1Cloud.getAttribute('width')));
    expect(gap).toBeCloseTo(10, 2);

    // Reversing value scale places zero baseline at the top (y = 0)
    bar.config = {
      ...bar.config,
      reverse: true
    };
    const reversedQ1Edge = bar.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-bar-rect[data-key="Edge"][data-index="Q1"]'
    )!;
    expect(Number(reversedQ1Edge.getAttribute('y'))).toBeCloseTo(0, 2);
  });
});
