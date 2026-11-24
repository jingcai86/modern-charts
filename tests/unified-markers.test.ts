import { describe, expect, it } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCHeatmapChart } from '../src/charts/mc-heatmap-chart';
import type { MCLineChart } from '../src/charts/mc-line-chart';
import type { MCScatterChart } from '../src/charts/mc-scatter-chart';

describe('Unified <mc-marker> & <mc-marker-layer> Across Charts (Issue #73)', () => {
  it('supports statistical preset markers (average, min, max, median), lineStyle (solid, dashed, dotted), and point markers (markPoint) on <mc-line-chart> and <mc-bar-chart>', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.innerHTML = `
      <mc-marker id="avg-line" axis="y" value="average" line-style="dotted" label="Avg"></mc-marker>
      <mc-marker id="peak-pt" type="point" value="max" symbol="pin" size="16" label="Peak"></mc-marker>
    `;
    line.config = {
      width: 500,
      height: 300,
      data: [
        {
          id: 'Traffic',
          data: [
            { x: 'Mon', y: 10 },
            { x: 'Tue', y: 50 },
            { x: 'Wed', y: 30 }
          ]
        }
      ]
    };
    document.body.appendChild(line);

    const avgLine = line.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="avg-line"] .mc-marker-line'
    );
    expect(avgLine).not.toBeNull();
    expect(avgLine?.getAttribute('stroke-dasharray')).toBe('2 4');

    const peakPt = line.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="peak-pt"] .mc-marker-point'
    );
    expect(peakPt).not.toBeNull();
    expect(peakPt?.getAttribute('d')).toContain('M');

    line.remove();

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    bar.innerHTML = `
      <mc-marker id="median-bar" axis="y" value="median" line-style="solid" label="Median"></mc-marker>
    `;
    bar.config = {
      width: 480,
      height: 280,
      indexBy: 'q',
      keys: ['v'],
      data: [
        { q: 'Q1', v: 20 },
        { q: 'Q2', v: 40 },
        { q: 'Q3', v: 90 }
      ]
    };
    document.body.appendChild(bar);

    const solidLine = bar.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="median-bar"] .mc-marker-line'
    );
    expect(solidLine).not.toBeNull();
    expect(solidLine?.hasAttribute('stroke-dasharray')).toBe(false);
    bar.remove();
  });

  it('renders <mc-marker> lines, areas, point markers, and cell thresholds on <mc-heatmap-chart> and <mc-scatter-chart>', () => {
    const heatmap = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
    heatmap.innerHTML = `
      <mc-marker id="col-mark" axis="x" value="Tue" line-style="dashed" label="Deploy"></mc-marker>
      <mc-marker id="hot-threshold" axis="y" value="70" condition="above" match-color="#ef4444"></mc-marker>
      <mc-marker id="cell-pin" type="point" x="Tue" y="API" symbol="star" label="Hotspot"></mc-marker>
    `;
    heatmap.config = {
      width: 480,
      height: 280,
      data: [
        {
          id: 'API',
          data: [
            { x: 'Mon', y: 20 },
            { x: 'Tue', y: 95 }
          ]
        }
      ]
    };
    document.body.appendChild(heatmap);

    expect(
      heatmap.shadowRoot?.querySelector('.mc-layer--markers')
    ).not.toBeNull();
    expect(
      heatmap.shadowRoot?.querySelector('.mc-marker[data-marker-id="col-mark"] .mc-marker-line')
    ).not.toBeNull();
    expect(
      heatmap.shadowRoot?.querySelector('.mc-marker[data-marker-id="cell-pin"] .mc-marker-point')
    ).not.toBeNull();

    const hotCell = heatmap.shadowRoot?.querySelector(
      '.mc-heatmap-cell[data-row="API"][data-col="Tue"]'
    );
    expect(hotCell?.getAttribute('fill')).toBe('#ef4444');
    heatmap.remove();

    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    scatter.innerHTML = `
      <mc-marker id="center-pt" type="point" x="average" y="average" symbol="diamond" label="Centroid"></mc-marker>
    `;
    scatter.config = {
      width: 480,
      height: 280,
      data: [
        {
          id: 'S1',
          data: [
            { x: 10, y: 20 },
            { x: 30, y: 60 }
          ]
        }
      ]
    };
    document.body.appendChild(scatter);

    expect(
      scatter.shadowRoot?.querySelector(
        '.mc-marker[data-marker-id="center-pt"] .mc-marker-point'
      )
    ).not.toBeNull();
    scatter.remove();
  });
});
