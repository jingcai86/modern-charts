import { describe, expect, it } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCHeatmapChart } from '../src/charts/mc-heatmap-chart';
import type { MCLineChart } from '../src/charts/mc-line-chart';
import type { MCScatterChart } from '../src/charts/mc-scatter-chart';

describe('Unified <mc-scale-layer> & 4-Position Axes (Issue #73)', () => {
  it('supports all 4 axis positions (top, right, bottom, left, both, none) via <mc-scale-layer> across bar, line, scatter, and heatmap charts', () => {
    const lineChart = document.createElement('mc-line-chart') as MCLineChart;
    lineChart.innerHTML = `
      <mc-scale-layer x-type="point" x-position="top" x-title="Timeline (Top)" y-type="log" y-position="right" y-title="Log Latency (Right)"></mc-scale-layer>
    `;
    lineChart.config = {
      width: 520,
      height: 320,
      data: [
        {
          id: 'p99',
          data: [
            { x: 'T1', y: 10 },
            { x: 'T2', y: 100 },
            { x: 'T3', y: 1000 }
          ]
        }
      ]
    };
    document.body.appendChild(lineChart);

    const topX = lineChart.shadowRoot?.querySelector(
      '.mc-axis--x.mc-axis--top[data-axis-position="top"]'
    );
    const rightY = lineChart.shadowRoot?.querySelector(
      '.mc-axis--y.mc-axis--right[data-axis-position="right"]'
    );
    expect(topX).not.toBeNull();
    expect(rightY).not.toBeNull();
    expect(
      lineChart.shadowRoot?.querySelector('.mc-axis--x.mc-axis--bottom')
    ).toBeNull();
    expect(
      lineChart.shadowRoot?.querySelector('.mc-axis--y.mc-axis--left')
    ).toBeNull();

    lineChart.remove();
  });

  it('combines multiple <mc-scale-layer> position elements into dual 4-side axes (top + bottom + left + right) on <mc-bar-chart>', () => {
    const barChart = document.createElement('mc-bar-chart') as MCBarChart;
    barChart.innerHTML = `
      <mc-scale-layer position="bottom"></mc-scale-layer>
      <mc-scale-layer position="top"></mc-scale-layer>
      <mc-scale-layer position="left" type="symlog"></mc-scale-layer>
      <mc-scale-layer position="right"></mc-scale-layer>
    `;
    barChart.config = {
      width: 500,
      height: 320,
      indexBy: 'region',
      keys: ['revenue'],
      data: [
        { region: 'NA', revenue: 120 },
        { region: 'EU', revenue: 340 },
        { region: 'APAC', revenue: 890 }
      ]
    };
    document.body.appendChild(barChart);

    expect(
      barChart.shadowRoot?.querySelector('.mc-axis--x.mc-axis--bottom')
    ).not.toBeNull();
    expect(
      barChart.shadowRoot?.querySelector('.mc-axis--x.mc-axis--top')
    ).not.toBeNull();
    expect(
      barChart.shadowRoot?.querySelector('.mc-axis--y.mc-axis--left')
    ).not.toBeNull();
    expect(
      barChart.shadowRoot?.querySelector('.mc-axis--y.mc-axis--right')
    ).not.toBeNull();

    barChart.remove();
  });

  it('preserves log, symlog, sqrt, and time scale types on <mc-scatter-chart> and <mc-heatmap-chart> via <mc-scale-layer>', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    scatter.innerHTML = `
      <mc-scale-layer x-type="log" y-type="symlog" x-position="both" y-position="both"></mc-scale-layer>
    `;
    scatter.config = {
      width: 500,
      height: 320,
      data: [
        {
          id: 'Cluster',
          data: [
            { x: 1, y: -50 },
            { x: 10, y: 0 },
            { x: 100, y: 250 }
          ]
        }
      ]
    };
    document.body.appendChild(scatter);

    expect(scatter.resolveScaleConfig().x.type).toBe('log');
    expect(scatter.resolveScaleConfig().y.type).toBe('symlog');
    expect(
      scatter.shadowRoot?.querySelectorAll('.mc-axis').length
    ).toBe(4);

    scatter.remove();

    const heatmap = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
    heatmap.innerHTML = `
      <mc-scale-layer x-position="top" y-position="right"></mc-scale-layer>
    `;
    heatmap.config = {
      width: 480,
      height: 280,
      xTitle: 'Columns',
      yTitle: 'Rows',
      data: [
        {
          id: 'R1',
          data: [
            { x: 'C1', y: 12 },
            { x: 'C2', y: 48 }
          ]
        }
      ]
    };
    document.body.appendChild(heatmap);

    expect(
      heatmap.shadowRoot?.querySelector('.mc-axis--x.mc-axis--top')
    ).not.toBeNull();
    expect(
      heatmap.shadowRoot?.querySelector('.mc-axis--y.mc-axis--right')
    ).not.toBeNull();

    heatmap.remove();
  });
});
