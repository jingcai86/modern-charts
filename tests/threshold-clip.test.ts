import { describe, expect, it } from 'vitest';
import { scaleLinear } from '../src/core/scales';
import {
  computePartialClipPlan,
  createAxisClipPath,
  resolveMarkerPixelIntervals
} from '../src/core/threshold-clip';
import type { ChartRenderContext, ResolvedMarker } from '../src/core/types';

function createMarker(config: Partial<ResolvedMarker>): ResolvedMarker {
  return { id: 'limit', axis: 'x', type: 'line', matchedItems: [], ...config };
}

function createContext(config: Partial<ChartRenderContext> = {}): ChartRenderContext {
  return { innerWidth: 100, innerHeight: 80, ...config } as ChartRenderContext;
}

describe('partial threshold clipping', () => {
  it('resolves threshold values on a reversed scale and clips to the plot edges', () => {
    const xScale = scaleLinear().domain([0, 100]).range([100, 0]);
    const ctx = createContext({ xScale });
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'lte', value: 25 }), ctx))
      .toEqual([{ start: 75, end: 100 }]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'gte', value: 25 }), ctx))
      .toEqual([{ start: 0, end: 75 }]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'between', from: 50, to: 150 }), ctx))
      .toEqual([{ start: 0, end: 50 }]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'outside', from: 50, to: 150 }), ctx))
      .toEqual([{ start: 50, end: 100 }]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'outside', from: -20, to: 50 }), ctx))
      .toEqual([{ start: 0, end: 50 }]);
  });

  it('uses pixel positions for isolated plots and omits missing or zero-width ranges', () => {
    const ctx = createContext();
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'under', pixelFrom: 25 }), ctx))
      .toEqual([{ start: 0, end: 25 }]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'below', pixelPos: 0 }), ctx)).toEqual([]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'between', pixelFrom: 22, pixelTo: 22 }), ctx))
      .toEqual([]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'outside', pixelFrom: 22 }), ctx)).toEqual([]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'between', from: 22, to: 42 }), ctx))
      .toEqual([]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'above', value: 42 }), ctx)).toEqual([]);
    expect(resolveMarkerPixelIntervals(createMarker({ condition: 'above', pixelPos: 42 }),
      createContext({ innerWidth: 0 }))).toEqual([]);
  });

  it('preserves per-marker overlays and subtracts their union from an item span', () => {
    const left = createMarker({ id: 'left', condition: 'lte', pixelPos: 35 });
    const center = createMarker({ id: 'center', condition: 'between', pixelFrom: 25, pixelTo: 50 });
    const right = createMarker({ id: 'right', condition: 'gte', pixelPos: 80, matchStyle: { fill: '#864' } });
    const nonmatching = createMarker({ axis: 'y', condition: 'lte', pixelPos: 35 });
    const ctx = createContext({ markers: [left, center, right, nonmatching] });

    const plan = computePartialClipPlan('x', 90, 10, ctx);
    expect(plan).toMatchObject({
      isPartial: true,
      isFullMatch: false,
      matchedMarkerIds: ['left', 'center', 'right'],
      baseIntervals: [{ start: 50, end: 80 }],
      overlays: [
        { intervals: [{ start: 10, end: 35 }], style: { fill: '#ef4444' } },
        { intervals: [{ start: 25, end: 50 }] },
        { intervals: [{ start: 80, end: 90 }], style: { fill: '#864' } }
      ]
    });
    expect(computePartialClipPlan('x', 20, 40, ctx)).toMatchObject({
      isPartial: false, isFullMatch: true, baseIntervals: [], matchedMarkerIds: ['left', 'center']
    });
    expect(computePartialClipPlan('x', 60, 70, ctx)).toMatchObject({
      isPartial: false, isFullMatch: false, baseIntervals: [{ start: 60, end: 70 }], overlays: []
    });
  });

  it('creates distinct SVG clip paths and expands only the cross axis', () => {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const bounds = { x: 20, y: 30, width: 40, height: 50 };
    const clipX = createAxisClipPath(defs, 'x', [{ start: 22, end: 30 }, { start: 32, end: 40 }], bounds);
    const clipY = createAxisClipPath(defs, 'y', [{ start: 40, end: 55 }], bounds, 2);
    expect(clipX).not.toBe(clipY);
    const dimensions = (id: string) => [...defs.querySelectorAll(`#${id} rect`)]
      .map((rect) => ['x', 'y', 'width', 'height'].map((name) => Number(rect.getAttribute(name))));
    expect(dimensions(clipX)).toEqual([[22, 24, 8, 62], [32, 24, 8, 62]]);
    expect(dimensions(clipY)).toEqual([[18, 40, 44, 15]]);
  });
});
