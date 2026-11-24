import { describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCLineChart } from '../src/charts/mc-line-chart';
import type { MCScatterChart } from '../src/charts/mc-scatter-chart';

describe('Unified <mc-view-layer> Zoom, Brush, and DataZoom Slider Across Charts (Issue #73)', () => {
  it('renders interactive dataZoom range slider and applies [start, end] percentage range on <mc-line-chart> and <mc-bar-chart>', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.innerHTML = `
      <mc-view-layer slider="true" start="25" end="75" direction="x"></mc-view-layer>
    `;
    line.config = {
      width: 500,
      height: 300,
      data: [
        {
          id: 'Series A',
          data: [
            { x: '1', y: 10 },
            { x: '2', y: 30 },
            { x: '3', y: 20 },
            { x: '4', y: 50 }
          ]
        }
      ]
    };
    document.body.appendChild(line);

    const slider = line.shadowRoot?.querySelector(
      '.mc-view-slider'
    ) as HTMLDivElement | null;
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute('data-start')).toBe('25');
    expect(slider?.getAttribute('data-end')).toBe('75');

    const viewport = line.shadowRoot?.querySelector('.mc-chart-viewport');
    expect(viewport?.getAttribute('transform')).toContain('scale(2)');

    line.remove();

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    bar.innerHTML = `
      <mc-view-layer slider="true" start="0" end="50"></mc-view-layer>
    `;
    bar.config = {
      width: 480,
      height: 280,
      indexBy: 'c',
      keys: ['v'],
      data: [
        { c: 'A', v: 10 },
        { c: 'B', v: 20 }
      ]
    };
    document.body.appendChild(bar);

    expect(bar.shadowRoot?.querySelector('.mc-view-slider')).not.toBeNull();
    bar.remove();
  });

  it('supports drag brush-to-zoom selection via <mc-view-layer brush="true"> on <mc-scatter-chart>', () => {
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    scatter.innerHTML = `
      <mc-view-layer brush="true" slider="true"></mc-view-layer>
    `;
    scatter.config = {
      width: 500,
      height: 300,
      data: [
        {
          id: 'Cluster',
          data: [
            { x: 10, y: 20 },
            { x: 50, y: 80 },
            { x: 90, y: 40 }
          ]
        }
      ]
    };
    document.body.appendChild(scatter);

    const onBrush = vi.fn();
    scatter.addEventListener('mc-brush', onBrush);

    const svg = scatter.shadowRoot?.querySelector('.mc-chart-svg') as SVGSVGElement;
    svg.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 80 })
    );
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 250, clientY: 180 })
    );
    expect(svg.querySelector('.mc-view-brush')).not.toBeNull();

    svg.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 250, clientY: 180 })
    );
    expect(onBrush).toHaveBeenCalledTimes(1);
    expect(svg.querySelector('.mc-view-brush')).toBeNull();

    scatter.remove();
  });
});
