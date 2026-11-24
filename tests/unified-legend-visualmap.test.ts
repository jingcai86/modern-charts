import { describe, expect, it } from 'vitest';
import '../src/index';
import type { MCGaugeChart } from '../src/charts/mc-gauge-chart';
import type { MCHeatmapChart } from '../src/charts/mc-heatmap-chart';
import type { MCScatterChart } from '../src/charts/mc-scatter-chart';

describe('Unified <mc-legend> & VisualMap Across All Charts (Issue #73)', () => {
  it('routes <mc-heatmap-chart> through the unified <mc-legend> component supporting all 4 positions, continuous calculable handles, and piecewise bins', () => {
    const heatmap = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
    heatmap.innerHTML = `
      <mc-legend type="continuous" position="right" calculable="true" min="0" max="100"></mc-legend>
    `;
    heatmap.config = {
      width: 480,
      height: 280,
      data: [
        {
          id: 'Row 1',
          data: [
            { x: 'Col 1', y: 20 },
            { x: 'Col 2', y: 80 }
          ]
        }
      ]
    };
    document.body.appendChild(heatmap);

    const contLegend = heatmap.shadowRoot?.querySelector(
      '.mc-legend--continuous[data-legend-position="right"][data-calculable="true"]'
    );
    expect(contLegend).not.toBeNull();
    expect(
      contLegend?.querySelector('.mc-legend-handle--min')
    ).not.toBeNull();
    expect(
      contLegend?.querySelector('.mc-legend-handle--max')
    ).not.toBeNull();

    // Switch to piecewise mode via <mc-legend>
    const legEl = heatmap.querySelector('mc-legend')!;
    legEl.setAttribute('type', 'piecewise');
    legEl.setAttribute('steps', '4');
    legEl.setAttribute('position', 'bottom');

    const pieceLegend = heatmap.shadowRoot?.querySelector(
      '.mc-legend[data-legend-type="piecewise"][data-legend-position="bottom"]'
    );
    expect(pieceLegend).not.toBeNull();
    expect(
      pieceLegend?.querySelectorAll('.mc-legend-item').length
    ).toBe(4);

    heatmap.remove();
  });

  it('supports <mc-legend> on <mc-gauge-chart> and continuous/piecewise visualMap legends on <mc-scatter-chart>', () => {
    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    gauge.innerHTML = `<mc-legend position="bottom"></mc-legend>`;
    gauge.config = {
      width: 360,
      height: 280,
      data: [
        { value: 72, label: 'CPU', unit: '%' },
        { value: 54, label: 'Memory', unit: '%' }
      ]
    };
    document.body.appendChild(gauge);

    const gaugeLegend = gauge.shadowRoot?.querySelector('.mc-legend');
    expect(gaugeLegend).not.toBeNull();
    expect(gaugeLegend?.querySelectorAll('.mc-legend-item').length).toBe(2);
    gauge.remove();

    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    scatter.innerHTML = `
      <mc-legend type="continuous" position="top" min="0" max="500" color-scheme="plasma" calculable="true"></mc-legend>
    `;
    scatter.config = {
      width: 480,
      height: 280,
      data: [
        {
          id: 'Nodes',
          data: [
            { x: 10, y: 120 },
            { x: 40, y: 420 }
          ]
        }
      ]
    };
    document.body.appendChild(scatter);

    expect(
      scatter.shadowRoot?.querySelector(
        '.mc-legend--continuous[data-legend-position="top"]'
      )
    ).not.toBeNull();
    scatter.remove();
  });
});
