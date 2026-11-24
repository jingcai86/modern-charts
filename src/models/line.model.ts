import {
  area,
  curveCatmullRom,
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  line,
  type CurveFactory
} from 'd3';
import { buildAxisScale, getScalePosition } from '../core/scale-manager';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  LineSeries,
  ThresholdEvaluationResult,
  ThresholdMatchedItem
} from '../core/types';

export interface ComputedLinePointModel {
  id: string;
  globalIndex: number;
  pointIndex: number;
  totalPoints: number;
  seriesId: string;
  originalColor: string;
  color: string;
  xValue: any;
  yValue: number;
  y0Value: number;
  px: number;
  py: number;
  py0: number;
  radius: number;
  label: string;
  threshold: ThresholdEvaluationResult;
  raw: any;
}

export interface ComputedLineSeriesModel {
  id: string;
  index: number;
  color: string;
  linePathD: string;
  areaPathD: string;
  strokeWidth: number;
  areaOpacity: number;
  hasThresholdMatches: boolean;
  points: ComputedLinePointModel[];
}

export interface LineChartModel {
  series: ComputedLineSeriesModel[];
  curve: string;
  enableArea: boolean;
  enablePointLabels: boolean;
  enableSlices: boolean;
  xTitle?: string;
  yTitle?: string;
}

export interface LinePointCoord {
  xKey: string;
  px: number;
  py: number;
  py0: number;
}

export interface LineSeriesTransitionFrame {
  seriesId: string;
  fromPoints: LinePointCoord[];
  toPoints: LinePointCoord[];
  /** Extra leading point leaving the left edge during a sliding-window shift so the curve stays anchored seamlessly across x=0. */
  exitingLeftPoint?: { from: LinePointCoord; to: LinePointCoord };
  /** Indices of newly appended/inserted points not present in the previous frame. */
  enteringIndices: Set<number>;
  hasMotion: boolean;
}

export interface InterpolatedLineFrame {
  linePathD: string;
  areaPathD: string;
  points: LinePointCoord[];
}

export interface LineModelInput {
  curve: string;
  enableArea: boolean;
  areaOpacity: number;
  lineWidth: number;
  pointSize: number;
  enablePointLabels: boolean;
  enableSlices: boolean;
  xTitle?: string;
  yTitle?: string;
  setupThresholds: (ctx: ChartRenderContext<LineSeries[]>) => void;
  recordThresholdItem?: (
    item: Omit<
      ThresholdMatchedItem,
      | 'effectiveColor'
      | 'isUnderThreshold'
      | 'isAboveThreshold'
      | 'matchedMarkerIds'
      | 'style'
    >,
    evalResult: ThresholdEvaluationResult
  ) => ThresholdMatchedItem;
}

export function getD3CurveFactory(curveName: string): CurveFactory {
  switch (curveName) {
    case 'linear':
      return curveLinear;
    case 'catmullRom':
      return curveCatmullRom.alpha(0.5);
    case 'natural':
      return curveNatural;
    case 'step':
      return curveStep;
    case 'stepAfter':
      return curveStepAfter;
    case 'stepBefore':
      return curveStepBefore;
    case 'monotoneX':
    default:
      return curveMonotoneX;
  }
}

/**
 * Pure Model Layer for `<mc-line-chart>`.
 * Computes D3 scales, path strings (`linePathD`, `areaPathD`), point coordinates,
 * and threshold evaluations without touching the DOM.
 */
export function computeLineChartModel(
  ctx: ChartRenderContext<LineSeries[]>,
  input: LineModelInput
): LineChartModel {
  const seriesList = Array.isArray(ctx.data) ? ctx.data : [];
  const allX: any[] = [];
  const allY: number[] = [];

  seriesList.forEach((s) => {
    (s.data ?? []).forEach((pt) => {
      allX.push(pt.x);
      allY.push(Number(pt.y));
    });
  });

  const stacked = ctx.scaleConfig.y.stacked === true;
  const xTotals = new Map<string, number>();

  if (stacked) {
    seriesList.forEach((s) => {
      (s.data ?? []).forEach((pt) => {
        const key = String(pt.x);
        const prev = xTotals.get(key) ?? 0;
        xTotals.set(key, prev + Number(pt.y));
      });
    });
    allY.push(0, ...Array.from(xTotals.values()));
  } else if (ctx.scaleConfig.y.min === 'auto') {
    const minVal = allY.length > 0 ? Math.min(...allY) : 0;
    if (minVal >= 0) allY.push(0);
  }

  ctx.xScale = buildAxisScale(ctx.scaleConfig.x, allX, [0, ctx.innerWidth]);
  ctx.yScale = buildAxisScale(ctx.scaleConfig.y, allY, [ctx.innerHeight, 0]);
  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    seriesList.map((s) => s.id)
  );

  input.setupThresholds(ctx);

  const curveFactory = getD3CurveFactory(input.curve);
  const baseRadius = input.pointSize / 2;
  const totalPoints = seriesList.reduce(
    (acc, s) => acc + (s.data?.length ?? 0),
    0
  );
  let globalIndex = 0;

  const runningStack = new Map<string, number>();
  const series: ComputedLineSeriesModel[] = seriesList.map((s, sIdx) => {
    const baseColor = s.color || ctx.colorScale(s.id);
    const points: ComputedLinePointModel[] = (s.data ?? []).map((pt, ptIdx) => {
      const key = String(pt.x);
      const y0 = stacked ? runningStack.get(key) ?? 0 : 0;
      const yVal = stacked ? y0 + Number(pt.y) : Number(pt.y);
      if (stacked) runningStack.set(key, yVal);

      const px = getScalePosition(ctx.xScale, pt.x);
      const py = getScalePosition(ctx.yScale, yVal);
      const py0 = getScalePosition(
        ctx.yScale,
        stacked ? y0 : ctx.yScale.domain()[0] ?? 0
      );

      const evalResult = ctx.evaluateThresholds(
        Number(pt.y),
        { ...pt, seriesId: s.id, x: pt.x, y: Number(pt.y) },
        'y',
        baseColor
      );
      const effectiveColor = evalResult.effectiveColor || baseColor;

      input.recordThresholdItem?.(
        {
          id: `${s.id}-${pt.x}`,
          seriesId: s.id,
          category: String(pt.x),
          value: Number(pt.y),
          px,
          py,
          originalColor: baseColor,
          datum: { ...pt, seriesId: s.id, x: pt.x, y: Number(pt.y) }
        },
        evalResult
      );

      const itemModel: ComputedLinePointModel = {
        id: `${s.id}-${pt.x}`,
        globalIndex,
        pointIndex: ptIdx,
        totalPoints,
        seriesId: s.id,
        originalColor: baseColor,
        color: effectiveColor,
        xValue: pt.x,
        yValue: Number(pt.y),
        y0Value: y0,
        px,
        py,
        py0,
        radius: evalResult.style.radius ?? baseRadius,
        label: pt.label !== undefined ? String(pt.label) : String(pt.y),
        threshold: evalResult,
        raw: pt
      };
      globalIndex++;
      return itemModel;
    });

    const lineGen = line<ComputedLinePointModel>()
      .x((d) => d.px)
      .y((d) => d.py)
      .curve(curveFactory);

    const areaGen = area<ComputedLinePointModel>()
      .x((d) => d.px)
      .y0((d) => d.py0)
      .y1((d) => d.py)
      .curve(curveFactory);

    return {
      id: s.id,
      index: sIdx,
      color: baseColor,
      linePathD: points.length > 0 ? lineGen(points) || '' : '',
      areaPathD: points.length > 0 ? areaGen(points) || '' : '',
      strokeWidth: input.lineWidth,
      areaOpacity: input.areaOpacity,
      hasThresholdMatches: points.some((p) => p.threshold.matched),
      points
    };
  });

  return {
    series,
    curve: input.curve,
    enableArea: input.enableArea,
    enablePointLabels: input.enablePointLabels,
    enableSlices: input.enableSlices,
    xTitle: input.xTitle,
    yTitle: input.yTitle
  };
}

/**
 * Builds a 1:1 coordinate transition frame between a series' previous and next
 * rendered coordinates so sliding-window streams, appends, and in-place Y updates
 * can smoothly morph lines, areas, and points without full-chart redraw flashes.
 */
export function computeLineTransitionFrame(
  seriesId: string,
  prevPoints: LinePointCoord[],
  nextPoints: LinePointCoord[]
): LineSeriesTransitionFrame | null {
  if (prevPoints.length === 0 || nextPoints.length === 0) return null;

  const prevByKey = new Map<string, { pt: LinePointCoord; idx: number }>();
  prevPoints.forEach((pt, idx) => {
    prevByKey.set(pt.xKey, { pt, idx });
  });

  // Count how many new xKeys existed in the previous frame
  let sharedCount = 0;
  for (const pt of nextPoints) {
    if (prevByKey.has(pt.xKey)) sharedCount++;
  }

  // Estimate horizontal step for smooth sliding-window entry/exit
  const stepX =
    nextPoints.length > 1
      ? Math.max(
          1,
          (nextPoints[nextPoints.length - 1].px - nextPoints[0].px) /
            (nextPoints.length - 1)
        )
      : prevPoints.length > 1
        ? Math.max(
            1,
            (prevPoints[prevPoints.length - 1].px - prevPoints[0].px) /
              (prevPoints.length - 1)
          )
        : 24;

  // Detect a left-shifting sliding window (e.g. [t1..t12] -> [t2..t13])
  const firstMatch = prevByKey.get(nextPoints[0].xKey);
  const shiftedLeft =
    sharedCount > 0 &&
    firstMatch !== undefined &&
    firstMatch.idx > 0 &&
    prevPoints.length > 1;

  let exitingLeftPoint: { from: LinePointCoord; to: LinePointCoord } | undefined;
  if (shiftedLeft && firstMatch) {
    const dropped = prevPoints[firstMatch.idx - 1];
    const shiftDelta = Math.max(stepX, firstMatch.pt.px - nextPoints[0].px);
    exitingLeftPoint = {
      from: { ...dropped },
      to: {
        xKey: dropped.xKey,
        px: dropped.px - shiftDelta,
        py: dropped.py,
        py0: dropped.py0
      }
    };
  }

  const enteringIndices = new Set<number>();
  const lastPrev = prevPoints[prevPoints.length - 1];
  const fromPoints: LinePointCoord[] = nextPoints.map((nextPt, idx) => {
    if (sharedCount > 0) {
      const matched = prevByKey.get(nextPt.xKey);
      if (matched) {
        return { ...matched.pt };
      }
      enteringIndices.add(idx);
      if (shiftedLeft) {
        // Slide new rightmost point(s) in from just past the right edge in lockstep
        const rightOffset =
          idx - (nextPoints.length - 1) + 1; // 1 for the newest rightmost point
        return {
          xKey: nextPt.xKey,
          px: lastPrev.px + stepX * Math.max(1, rightOffset),
          py: nextPt.py,
          py0: nextPt.py0
        };
      }
      // Growing window append: grow smoothly out of the previous rightmost point
      return {
        xKey: nextPt.xKey,
        px: lastPrev.px,
        py: lastPrev.py,
        py0: lastPrev.py0
      };
    }

    // Complete domain replacement (no shared xKeys): map cleanly by normalized index
    const prevIdx = Math.min(
      prevPoints.length - 1,
      Math.round(
        (idx / Math.max(1, nextPoints.length - 1)) * (prevPoints.length - 1)
      )
    );
    return { ...prevPoints[prevIdx] };
  });

  let hasMotion = Boolean(exitingLeftPoint);
  if (!hasMotion) {
    for (let i = 0; i < nextPoints.length; i++) {
      const a = fromPoints[i];
      const b = nextPoints[i];
      if (
        Math.abs(a.px - b.px) > 0.25 ||
        Math.abs(a.py - b.py) > 0.25 ||
        Math.abs(a.py0 - b.py0) > 0.25
      ) {
        hasMotion = true;
        break;
      }
    }
  }

  return {
    seriesId,
    fromPoints,
    toPoints: nextPoints.map((p) => ({ ...p })),
    exitingLeftPoint,
    enteringIndices,
    hasMotion
  };
}

/**
 * Evaluates a `LineSeriesTransitionFrame` at eased progress `e ∈ [0, 1]` and
 * builds interpolated SVG `linePathD`, `areaPathD`, and point coordinates.
 */
export function interpolateLineFrame(
  frame: LineSeriesTransitionFrame,
  e: number,
  curveName: string,
  includeArea: boolean
): InterpolatedLineFrame {
  const lerp = (a: number, b: number) => a + (b - a) * e;
  const points: LinePointCoord[] = frame.toPoints.map((toPt, i) => {
    const fromPt = frame.fromPoints[i];
    return {
      xKey: toPt.xKey,
      px: lerp(fromPt.px, toPt.px),
      py: lerp(fromPt.py, toPt.py),
      py0: lerp(fromPt.py0, toPt.py0)
    };
  });

  const pathPoints: LinePointCoord[] =
    e < 1 && frame.exitingLeftPoint
      ? [
          {
            xKey: frame.exitingLeftPoint.from.xKey,
            px: lerp(frame.exitingLeftPoint.from.px, frame.exitingLeftPoint.to.px),
            py: lerp(frame.exitingLeftPoint.from.py, frame.exitingLeftPoint.to.py),
            py0: lerp(
              frame.exitingLeftPoint.from.py0,
              frame.exitingLeftPoint.to.py0
            )
          },
          ...points
        ]
      : points;

  const curveFactory = getD3CurveFactory(curveName);
  const lineGen = line<LinePointCoord>()
    .x((d) => d.px)
    .y((d) => d.py)
    .curve(curveFactory);
  const areaGen = includeArea
    ? area<LinePointCoord>()
        .x((d) => d.px)
        .y0((d) => d.py0)
        .y1((d) => d.py)
        .curve(curveFactory)
    : null;

  return {
    linePathD: pathPoints.length > 0 ? lineGen(pathPoints) || '' : '',
    areaPathD: areaGen && pathPoints.length > 0 ? areaGen(pathPoints) || '' : '',
    points
  };
}
