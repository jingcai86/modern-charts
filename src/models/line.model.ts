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
  enableArea: boolean;
  enablePointLabels: boolean;
  enableSlices: boolean;
  xTitle?: string;
  yTitle?: string;
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
    enableArea: input.enableArea,
    enablePointLabels: input.enablePointLabels,
    enableSlices: input.enableSlices,
    xTitle: input.xTitle,
    yTitle: input.yTitle
  };
}
