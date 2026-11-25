import { afterEach, describe, expect, it } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCMarkerElement, MCMarkerLayer } from '../src/components/mc-marker';
import { MarkerEngine } from '../src/core/marker-engine';
import { scaleLinear } from '../src/core/scales';

afterEach(() => document.body.replaceChildren());

describe('Marker behavior', () => {
  it('uses numeric scale bounds for statistical presets when there are no samples', () => {
    const engine = new MarkerEngine();
    const x = scaleLinear().domain([10, 30]).range([0, 200]);
    const y = scaleLinear().domain([50, 100]).range([100, 0]);

    const [minimum, range, midpoint] = engine.resolveMarkers([
      { id: 'minimum', type: 'line', axis: 'x', value: ' MIN ' },
      { id: 'range', type: 'area', axis: 'y', from: 'median', to: 'max' },
      { id: 'midpoint', type: 'point', x: 'mean', y: 'average' }
    ], x, y, 200, 100);
    expect(minimum).toMatchObject({ value: 10, pixelPos: 0 });
    expect(range).toMatchObject({ from: 75, to: 100, pixelFrom: 50, pixelTo: 0 });
    expect(midpoint).toMatchObject({ x: 20, y: 75, pixelX: 100, pixelY: 50 });

    const [gaugeTarget] = engine.resolveMarkers([{ value: 'min' }], x, y, 200, 100, { value: 65 });
    expect(gaugeTarget.value).toBe(65);
    expect(gaugeTarget.pixelPos).toBeCloseTo(70);
  });

  it('tracks inclusive boundary matches, out-of-range values, and predicate styles by axis', () => {
    const engine = new MarkerEngine();
    const scale = scaleLinear().domain([0, 40]).range([0, 200]);
    const markers = engine.resolveMarkers([
      { id: 'low', value: 15, condition: 'lte', matchStyle: { opacity: 0.5 } },
      { id: 'high', value: 25, condition: 'gte' },
      { id: 'outside', from: 25, to: 15, condition: 'outside', matchStyle: { fill: '#928' } },
      { id: 'predicate', value: 20,
        condition: (_, datum) => datum?.outage === true,
        matchStyle: { fill: '#427', strokeWidth: 2 }
      },
      { id: 'x-range', axis: 'x', from: -10, to: 10, condition: 'between' }
    ], scale, scale, 200, 200);
    const thresholds = engine.createThresholdContext(markers);

    expect(thresholds.evaluate(15).matchedMarkerIds).toEqual(['low']);
    expect(thresholds.evaluate(25).matchedMarkerIds).toEqual(['high']);
    expect(thresholds.evaluate(20, undefined, 'y', '#fff')).toMatchObject({ matched: false, effectiveColor: '#fff' });
    expect(thresholds.evaluate(10, undefined, 'x')).toMatchObject({
      matchedMarkerIds: ['x-range'], isUnderThreshold: true
    });

    const datum = { outage: true };
    const item = thresholds.recordMatchedItem({ id: 'region', value: 12, originalColor: '#fff', datum },
      thresholds.evaluate(12, datum));
    expect(item).toMatchObject({
      effectiveColor: '#427',
      matchedMarkerIds: ['low', 'outside', 'predicate'],
      isUnderThreshold: true,
      isAboveThreshold: false,
      style: { opacity: 0.5, fill: '#427', strokeWidth: 2 }
    });
    expect(thresholds.underThresholdItems).toEqual([item]);
    expect(thresholds.aboveThresholdItems).toEqual([]);
    expect(markers.map((marker) => marker.matchedItems.length)).toEqual([1, 0, 1, 1, 0]);
  });

  it('updates a live marker layer when combining programmatic markers with declarative children', () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const layer = document.createElement('mc-marker-layer') as MCMarkerLayer;
    const child = document.createElement('mc-marker') as MCMarkerElement;
    child.id = 'floor';
    child.setAttribute('value', '10');
    child.setAttribute('match-scope', 'item');
    layer.append(child);
    chart.append(layer);
    chart.config = {
      width: 420, height: 280, indexBy: 'quarter', keys: ['sales'], animate: false,
      data: [{ quarter: 'Q1', sales: 10 }, { quarter: 'Q2', sales: 20 }]
    };
    document.body.append(chart);

    child.condition = 'lte';
    child.matchStyle = { fill: '#f00' };
    child.annotation = { text: 'Below target', position: 'top', enableTooltip: false };
    child.legend = { label: 'Target floor' };
    const reference = { id: 'reference', value: 18 };
    layer.markers = [reference];
    expect(layer.markers.map(({ id }) => id)).toEqual(['reference', 'floor']);
    const root = chart.shadowRoot!;
    expect(root.querySelectorAll('.mc-marker')).toHaveLength(2);
    expect(root.querySelector('.mc-bar-rect')?.getAttribute('fill')).toBe('#f00');
    const annotation = root.querySelector('.mc-marker-annotation[data-marker-id="floor"]');
    expect(annotation?.getAttribute('data-annotation-position')).toBe('top');
    expect(annotation?.hasAttribute('tabindex')).toBe(false);
    expect(root.querySelector('.mc-legend')?.textContent).toContain('Target floor');

    child.condition = undefined;
    expect(root.querySelector('.mc-bar-rect')?.getAttribute('fill')).not.toBe('#f00');
    layer.setAttribute('enabled', 'false');
    expect(root.querySelectorAll('.mc-marker')).toHaveLength(0);
  });
});
