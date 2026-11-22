import type {
  ChartRenderContext,
  MarkerMatchStyle,
  ResolvedMarker
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

let nextClipUid = 0;

export interface PixelInterval {
  start: number;
  end: number;
}

export interface ThresholdOverlayRegion {
  marker: ResolvedMarker;
  intervals: PixelInterval[];
  style: MarkerMatchStyle;
}

export interface PartialClipPlan {
  axis: 'x' | 'y';
  /** True when the item crosses at least one threshold boundary (0% < matched < 100%). */
  isPartial: boolean;
  /** True when 100% of the item's axis span lies inside matched partial-scope region(s). */
  isFullMatch: boolean;
  /** Unmatched (complement) pixel intervals along the item's axis span. */
  baseIntervals: PixelInterval[];
  /** Per-marker matched pixel intervals clipped to the item's axis span. */
  overlays: ThresholdOverlayRegion[];
  /** IDs of partial-scope markers whose region intersects the item. */
  matchedMarkerIds: string[];
}

export function allocateUniqueSvgId(prefix: string): string {
  nextClipUid += 1;
  return `${prefix}-${nextClipUid}`;
}

function mergeIntervals(intervals: PixelInterval[]): PixelInterval[] {
  const valid = intervals
    .map((iv) => ({
      start: Math.min(iv.start, iv.end),
      end: Math.max(iv.start, iv.end)
    }))
    .filter((iv) => iv.end - iv.start > 0.25)
    .sort((a, b) => a.start - b.start);

  if (valid.length === 0) return [];
  const merged: PixelInterval[] = [{ ...valid[0] }];
  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = valid[i];
    if (curr.start <= prev.end + 0.25) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

function subtractIntervals(
  span: PixelInterval,
  toRemove: PixelInterval[]
): PixelInterval[] {
  const merged = mergeIntervals(toRemove);
  const result: PixelInterval[] = [];
  let cursor = span.start;

  for (const iv of merged) {
    if (iv.end <= cursor) continue;
    if (iv.start >= span.end) break;
    if (iv.start > cursor + 0.25) {
      result.push({ start: cursor, end: Math.min(iv.start, span.end) });
    }
    cursor = Math.max(cursor, Math.min(iv.end, span.end));
  }

  if (span.end - cursor > 0.25) {
    result.push({ start: cursor, end: span.end });
  }
  return result;
}

function resolveMarkerStyle(marker: ResolvedMarker): MarkerMatchStyle {
  const fallbackColor =
    marker.matchStyle?.color ||
    marker.matchStyle?.fill ||
    marker.stroke ||
    '#ef4444';
  return {
    color: fallbackColor,
    fill: marker.matchStyle?.fill || fallbackColor,
    stroke: marker.matchStyle?.stroke || marker.stroke || fallbackColor,
    ...(marker.matchStyle ?? {})
  };
}

/**
 * Resolves the plot-space pixel interval(s) matched by a marker's declarative
 * `condition` when `matchScope` is `'partial'` (the default).
 * Returns an empty array for `matchScope: 'item'` or predicate functions.
 */
export function resolveMarkerPixelIntervals(
  marker: ResolvedMarker,
  ctx: ChartRenderContext<any>
): PixelInterval[] {
  if (!marker.condition || typeof marker.condition === 'function') return [];
  if ((marker.matchScope ?? 'partial') !== 'partial') return [];

  const isY = marker.axis === 'y';
  const axisMax = isY ? ctx.innerHeight : ctx.innerWidth;
  if (axisMax <= 0) return [];

  const clamp = (v: number) => Math.max(0, Math.min(axisMax, v));

  // Determine which side of a threshold pixel corresponds to lower numeric values.
  // For standard Y scales, scale(0) >= scale(1) -> lower values are toward axisMax (bottom).
  // For standard X scales, scale(0) <= scale(1) -> lower values are toward 0 (left).
  let lowSideIsMaxPx = isY;
  const scale = isY ? ctx.yScale : ctx.xScale;
  if (scale && typeof scale === 'function') {
    const p0 = Number(scale(0));
    const p1 = Number(scale(1));
    if (Number.isFinite(p0) && Number.isFinite(p1) && p0 !== p1) {
      lowSideIsMaxPx = p0 > p1;
    }
  }

  const cond = marker.condition;

  if (cond === 'between' || cond === 'outside') {
    const rawFrom =
      marker.pixelFrom ??
      (marker.from !== undefined && scale ? Number(scale(marker.from)) : undefined);
    const rawTo =
      marker.pixelTo ??
      (marker.to !== undefined && scale ? Number(scale(marker.to)) : undefined);
    if (
      rawFrom === undefined ||
      rawTo === undefined ||
      !Number.isFinite(rawFrom) ||
      !Number.isFinite(rawTo)
    ) {
      return [];
    }
    const lo = clamp(Math.min(rawFrom, rawTo));
    const hi = clamp(Math.max(rawFrom, rawTo));
    if (cond === 'between') {
      return hi - lo > 0.25 ? [{ start: lo, end: hi }] : [];
    }
    const out: PixelInterval[] = [];
    if (lo > 0.25) out.push({ start: 0, end: lo });
    if (axisMax - hi > 0.25) out.push({ start: hi, end: axisMax });
    return out;
  }

  const rawPos =
    marker.pixelPos ??
    (marker.value !== undefined && scale ? Number(scale(marker.value)) : undefined) ??
    marker.pixelTo ??
    marker.pixelFrom;
  if (rawPos === undefined || !Number.isFinite(rawPos)) return [];
  const pos = clamp(rawPos);

  const isLowCondition = cond === 'below' || cond === 'under' || cond === 'lte';
  const isHighCondition = cond === 'above' || cond === 'over' || cond === 'gte';
  if (!isLowCondition && !isHighCondition) return [];

  const targetMaxSide = isLowCondition ? lowSideIsMaxPx : !lowSideIsMaxPx;
  const interval = targetMaxSide
    ? { start: pos, end: axisMax }
    : { start: 0, end: pos };

  return interval.end - interval.start > 0.25 ? [interval] : [];
}

/**
 * Computes whether an item spanning `[itemStart, itemEnd]` along `axis` is
 * untouched, partially split across a threshold boundary, or 100% matched.
 */
export function computePartialClipPlan(
  axis: 'x' | 'y',
  itemStart: number,
  itemEnd: number,
  ctx: ChartRenderContext<any>
): PartialClipPlan {
  const start = Math.min(itemStart, itemEnd);
  const end = Math.max(itemStart, itemEnd);
  const spanLength = end - start;

  const empty: PartialClipPlan = {
    axis,
    isPartial: false,
    isFullMatch: false,
    baseIntervals: spanLength > 0 ? [{ start, end }] : [],
    overlays: [],
    matchedMarkerIds: []
  };

  if (spanLength <= 0.5 || !ctx.markers || ctx.markers.length === 0) {
    return empty;
  }

  const overlays: ThresholdOverlayRegion[] = [];
  const allMatchedIntervals: PixelInterval[] = [];
  const matchedMarkerIds: string[] = [];

  for (const marker of ctx.markers) {
    if (marker.axis !== axis) continue;
    const markerIntervals = resolveMarkerPixelIntervals(marker, ctx);
    if (markerIntervals.length === 0) continue;

    const clipped: PixelInterval[] = [];
    for (const iv of markerIntervals) {
      const cStart = Math.max(start, iv.start);
      const cEnd = Math.min(end, iv.end);
      if (cEnd - cStart > 0.5) {
        clipped.push({ start: cStart, end: cEnd });
        allMatchedIntervals.push({ start: cStart, end: cEnd });
      }
    }

    if (clipped.length > 0) {
      overlays.push({
        marker,
        intervals: mergeIntervals(clipped),
        style: resolveMarkerStyle(marker)
      });
      matchedMarkerIds.push(marker.id);
    }
  }

  if (overlays.length === 0) {
    return empty;
  }

  const mergedMatched = mergeIntervals(allMatchedIntervals);
  const matchedLength = mergedMatched.reduce(
    (sum, iv) => sum + (iv.end - iv.start),
    0
  );

  if (matchedLength <= 0.5) {
    return empty;
  }

  if (matchedLength >= spanLength - 0.5) {
    return {
      axis,
      isPartial: false,
      isFullMatch: true,
      baseIntervals: [],
      overlays,
      matchedMarkerIds
    };
  }

  const baseIntervals = subtractIntervals({ start, end }, mergedMatched);
  return {
    axis,
    isPartial: true,
    isFullMatch: false,
    baseIntervals,
    overlays,
    matchedMarkerIds
  };
}

/**
 * Appends a unique `<clipPath>` to `<defs>` covering the given axis intervals
 * within `bounds` (expanding the cross-axis slightly by `crossPad` so strokes
 * are never clipped along the sides).
 */
export function createAxisClipPath(
  defs: Element,
  axis: 'x' | 'y',
  intervals: PixelInterval[],
  bounds: { x: number; y: number; width: number; height: number },
  crossPad = 6
): string {
  const clipId = allocateUniqueSvgId('mc-thresh-clip');
  const clipPath = document.createElementNS(SVG_NS, 'clipPath');
  clipPath.setAttribute('id', clipId);

  for (const iv of intervals) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    if (axis === 'y') {
      rect.setAttribute('x', String(bounds.x - crossPad));
      rect.setAttribute('y', String(iv.start));
      rect.setAttribute('width', String(Math.max(0, bounds.width + crossPad * 2)));
      rect.setAttribute('height', String(Math.max(0, iv.end - iv.start)));
    } else {
      rect.setAttribute('x', String(iv.start));
      rect.setAttribute('y', String(bounds.y - crossPad));
      rect.setAttribute('width', String(Math.max(0, iv.end - iv.start)));
      rect.setAttribute('height', String(Math.max(0, bounds.height + crossPad * 2)));
    }
    clipPath.appendChild(rect);
  }

  defs.appendChild(clipPath);
  return clipId;
}
