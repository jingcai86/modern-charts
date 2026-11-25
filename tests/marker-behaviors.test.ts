import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCMarkerElement, MCMarkerLayer } from '../src/components/mc-marker';
import { buildMarkerLegendItems, MarkerEngine, resolveMarkerAnnotation } from '../src/core/marker-engine';
import { scaleLinear } from '../src/core/scales';
import { createDefaultTheme } from '../src/core/theme';
import type { ChartRenderContext, MarkerConfig, MarkerLabelPosition, MarkerType } from '../src/core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

function drawMarkers(markers: MarkerConfig[]) {
  const engine = new MarkerEngine();
  const layerGroup = document.createElementNS(SVG_NS, 'g');
  const x = scaleLinear().domain([0, 100]).range([0, 200]);
  const y = scaleLinear().domain([0, 100]).range([100, 0]);
  const renderLabel = vi.fn<ChartRenderContext['renderLabel']>(() => null);
  const ctx: Partial<ChartRenderContext> = {
    innerWidth: 200,
    innerHeight: 100,
    layerGroup,
    markers: engine.resolveMarkers(markers, x, y, 200, 100),
    isInteractive: false,
    theme: createDefaultTheme('dark'),
    renderLabel,
    registerEventTarget: (element: Element) => element
  };
  engine.renderMarkersLayer(ctx as ChartRenderContext);
  return { layerGroup, labels: renderLabel.mock.calls.map(([, label]) => label) };
}

afterEach(() => document.body.replaceChildren());

describe('Marker behavior', () => {
  it('uses numeric X samples for statistical lines and locates the lowest point', () => {
    const engine = new MarkerEngine();
    const x = scaleLinear().domain([0, 30]).range([0, 300]);
    const y = scaleLinear().domain([-10, 10]).range([200, 0]);
    const [medianX, lowPoint, singleAxisPoint] = engine.resolveMarkers([
      { axis: 'x', value: 'median' },
      { type: 'point', value: 'min' },
      { type: 'point', axis: 'x', value: 6 }
    ], x, y, 300, 200, [null, { id: 24, data: [
      null, { x: 2, y: 5 }, { x: 4, y: -3 }, { x: 8, y: 7 },
      { x: 10, y: 'missing' }, { y: -8 }
    ] }]);
    expect(medianX).toMatchObject({ value: 6, pixelPos: 60 });
    expect(lowPoint).toMatchObject({ x: 24, y: -8, pixelX: 240, pixelY: 180 });
    expect(singleAxisPoint).toMatchObject({ x: 6, pixelPos: 60, pixelY: 100 });
  });

  it('keeps centered points and full-plot areas when their scales are unavailable', () => {
    const engine = new MarkerEngine();
    const markers = engine.resolveMarkers([
      { type: 'point' }, { type: 'area', axis: 'x' }, { type: 'area' }, { value: 'median' }
    ], undefined, undefined, 240, 120, { value: NaN });
    expect(markers).toMatchObject([
      { pixelX: 120, pixelY: 60 }, { pixelFrom: 0, pixelTo: 240 },
      { pixelFrom: 120, pixelTo: 0 }, { value: 0, pixelPos: 0 }
    ]);
  });

  it('derives annotation defaults and retains inline icons and tooltip options', () => {
    expect(resolveMarkerAnnotation({ annotation: '  Limit  ' })).toMatchObject({
      text: 'Limit', position: 'right', padding: 8, enableTooltip: true
    });
    expect(resolveMarkerAnnotation({ annotation: '   ' })).toBeNull();
    expect(resolveMarkerAnnotation({ annotation: {} })).toBeNull();
    expect(resolveMarkerAnnotation({ label: 'Limit', annotation: { padding: Infinity } })).toMatchObject({
      text: 'Limit', position: 'right', padding: 8
    });
    const icon = document.createElementNS(SVG_NS, 'path');
    const tooltip = { enabled: false };
    expect(resolveMarkerAnnotation({ axis: 'x', annotation: { icon, tooltip, padding: -2 } })).toMatchObject({
      text: '', position: 'top', padding: 0, icon, enableTooltip: false, tooltipConfig: tooltip
    });
  });

  it('uses annotation and marker names as fallbacks for custom legend swatches', () => {
    const engine = new MarkerEngine();
    const markers = engine.resolveMarkers([
      { id: 'hidden', legend: { enabled: false } },
      { id: 'goal', value: 60, annotation: 'Revenue target', legend: { swatch: 'square', color: '#246' } },
      { id: 'range', type: 'area', legend: true, stroke: '#468' },
      { id: 'default-color', type: 'area', from: 10, to: 15, legend: true }
    ], undefined, undefined, 200, 100);
    expect(buildMarkerLegendItems(markers)).toMatchObject([
      { id: 'marker:goal', label: 'Revenue target', swatch: 'square', color: '#246', value: 60 },
      { id: 'marker:range', label: 'range', swatch: 'area', color: '#468', value: '0 – 0', fillOpacity: 0.25 },
      { id: 'marker:default-color', swatch: 'area', color: '#ef4444', value: '10 – 15' }
    ]);
  });

  it.each<{
    axis: 'x' | 'y'; type: MarkerType; position: MarkerLabelPosition;
    x: number; y: number; anchor: string; baseline: string;
  }>([
    { axis: 'x', type: 'line', position: 'top-left', x: 90, y: 10, anchor: 'end', baseline: 'hanging' },
    { axis: 'x', type: 'line', position: 'middle', x: 100, y: 10, anchor: 'middle', baseline: 'hanging' },
    { axis: 'x', type: 'line', position: 'bottom-left', x: 90, y: 90, anchor: 'end', baseline: 'alphabetic' },
    { axis: 'x', type: 'line', position: 'bottom-center', x: 100, y: 90, anchor: 'middle', baseline: 'alphabetic' },
    { axis: 'x', type: 'line', position: 'bottom-right', x: 110, y: 90, anchor: 'start', baseline: 'alphabetic' },
    { axis: 'x', type: 'area', position: 'top-left', x: 60, y: 10, anchor: 'start', baseline: 'hanging' },
    { axis: 'x', type: 'area', position: 'start', x: 140, y: 10, anchor: 'end', baseline: 'hanging' },
    { axis: 'x', type: 'area', position: 'bottom-left', x: 60, y: 90, anchor: 'start', baseline: 'alphabetic' },
    { axis: 'x', type: 'area', position: 'bottom-right', x: 140, y: 90, anchor: 'end', baseline: 'alphabetic' },
    { axis: 'y', type: 'line', position: 'start', x: 10, y: 40, anchor: 'start', baseline: 'alphabetic' },
    { axis: 'y', type: 'line', position: 'middle', x: 100, y: 40, anchor: 'middle', baseline: 'alphabetic' },
    { axis: 'y', type: 'line', position: 'bottom-left', x: 10, y: 60, anchor: 'start', baseline: 'hanging' },
    { axis: 'y', type: 'line', position: 'bottom-center', x: 100, y: 60, anchor: 'middle', baseline: 'hanging' },
    { axis: 'y', type: 'area', position: 'top-center', x: 100, y: 35, anchor: 'middle', baseline: 'hanging' },
    { axis: 'y', type: 'area', position: 'end', x: 190, y: 35, anchor: 'end', baseline: 'hanging' },
    { axis: 'y', type: 'area', position: 'bottom-left', x: 10, y: 65, anchor: 'start', baseline: 'alphabetic' },
    { axis: 'y', type: 'area', position: 'bottom-center', x: 100, y: 65, anchor: 'middle', baseline: 'alphabetic' },
    { axis: 'y', type: 'area', position: 'bottom-right', x: 190, y: 65, anchor: 'end', baseline: 'alphabetic' }
  ])('places the $axis $type marker label at $position', ({ axis, type, position, x, y, anchor, baseline }) => {
    const { labels } = drawMarkers([
      { axis, type, labelPosition: position, label: 'Target', value: 50, from: 25, to: 75 }
    ]);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ x, y, anchor, baseline });
  });

  it('forwards marker label formatting and styles and paints the requested SVG mark', () => {
    const labelStyle = {
      formatter: (text: string) => text.toUpperCase(),
      renderMode: 'foreignObject' as const,
      background: '#eee', borderColor: '#ccc', borderRadius: 3,
      padding: { top: 2, right: 4, bottom: 2, left: 4 }, maxWidth: 95, rotation: 15,
      templateHtml: '<strong>Target</strong>', renderer: () => 'Target', iconPosition: 'end' as const
    };
    const { layerGroup, labels } = drawMarkers([
      { axis: 'x', from: 25, to: 75, stroke: '#468', strokeDasharray: '2 3', label: 'Range', labelStyle },
      { value: 50, label: 'Target', labelStyle },
      { type: 'point', axis: 'x', value: 50, fillOpacity: 0.6, label: 'Peak', labelStyle }
    ]);
    const area = layerGroup.querySelector('.mc-marker-area');
    expect(['x', 'width', 'height', 'stroke', 'stroke-width', 'stroke-dasharray']
      .map((name) => area?.getAttribute(name))).toEqual(['50', '100', '100', '#468', '1', '2 3']);
    expect(layerGroup.querySelector('.mc-marker-point')?.getAttribute('fill-opacity')).toBe('0.6');
    const { formatter, ...forwardedStyle } = labelStyle;
    expect(labels).toMatchObject([
      { text: 'RANGE', ...forwardedStyle },
      { text: 'TARGET', ...forwardedStyle },
      { text: 'PEAK', x: 100, y: 37, background: '#eee', borderRadius: 3, color: '#fecdd3' }
    ]);
  });

  it('keeps outside labels attached to the plot edges for horizontal and vertical markers', () => {
    const labelPadding = { top: 4, right: 0, bottom: 0, left: 0 };
    const { layerGroup, labels } = drawMarkers([
      { value: 50, annotation: { text: 'Below', position: 'bottom', offsetX: 10, offsetY: 4 } },
      { axis: 'x', value: 25, annotation: { text: 'Left', position: 'left' } },
      { axis: 'x', value: 75, annotation: {
        text: 'Right', position: 'right', borderRadius: 3, labelPadding,
        formatter: (text) => text.toUpperCase(), renderer: () => 'Right'
      } }
    ]);
    expect(labels).toMatchObject([
      { text: 'Below', x: 110, y: 112, anchor: 'middle', baseline: 'hanging' },
      { text: 'Left', x: -8, y: 50, anchor: 'end' },
      { text: 'RIGHT', x: 208, y: 50, anchor: 'start', borderRadius: 3, padding: labelPadding }
    ]);
    expect([...layerGroup.querySelectorAll('.mc-marker-annotation')]
      .map((node) => node.getAttribute('pointer-events'))).toEqual(['none', 'none', 'none']);
  });

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
