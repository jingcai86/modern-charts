import { extent, scaleSqrt } from '../core/scales';
import { buildAxisScale, getScalePosition } from '../core/scale-manager';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  ScatterNodeSizeSpec,
  ScatterPoint,
  ScatterSeries,
  ScatterSymbolType,
  ThresholdEvaluationResult,
  ThresholdMatchedItem
} from '../core/types';

export interface ComputedScatterNodeModel {
  index: number;
  totalNodes: number;
  seriesId: string;
  originalColor: string;
  color: string;
  xValue: number;
  yValue: number;
  sizeValue: number;
  px: number;
  py: number;
  radius: number;
  symbol: ScatterSymbolType;
  symbolRotate: number;
  blendMode: string;
  label?: string;
  threshold: ThresholdEvaluationResult;
}

export interface ScatterChartModel {
  nodes: ComputedScatterNodeModel[];
  seriesList: ScatterSeries[];
  trendline: { x1: number; y1: number; x2: number; y2: number } | null;
  enableLabels: boolean;
  enableTrendline: boolean;
  symbol: ScatterSymbolType;
  symbolRotate: number;
  blendMode: string;
  useMesh: boolean;
  clip: boolean;
  jitter: number;
  xTitle?: string;
  yTitle?: string;
}

export interface ScatterModelInput {
  minNodeSize: number;
  maxNodeSize: number;
  nodeSize?: ScatterNodeSizeSpec;
  symbol?: ScatterSymbolType;
  symbolRotate?: number;
  blendMode?: string;
  useMesh?: boolean;
  clip?: boolean;
  jitter?: number;
  enableLabels: boolean;
  enableTrendline: boolean;
  xTitle?: string;
  yTitle?: string;
  setupThresholds: (ctx: ChartRenderContext<ScatterSeries[]>) => void;
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

const VALID_SYMBOLS = new Set<ScatterSymbolType>([
  'circle',
  'rect',
  'roundRect',
  'triangle',
  'diamond',
  'pin',
  'arrow',
  'cross',
  'star'
]);

function normalizeSymbol(
  raw: unknown,
  fallback: ScatterSymbolType = 'circle'
): ScatterSymbolType {
  if (typeof raw === 'string' && VALID_SYMBOLS.has(raw as ScatterSymbolType)) {
    return raw as ScatterSymbolType;
  }
  return fallback;
}

function resolvePointRadius(
  pt: ScatterPoint,
  series: ScatterSeries,
  spec: ScatterNodeSizeSpec | undefined,
  defaultScale: (val: number) => number,
  minNodeSize: number
): number {
  if (typeof spec === 'number' && Number.isFinite(spec) && spec > 0) {
    return spec;
  }
  if (typeof spec === 'function') {
    const val = Number(spec(pt, series));
    return Number.isFinite(val) && val > 0 ? val : minNodeSize;
  }
  if (
    spec &&
    typeof spec === 'object' &&
    Array.isArray(spec.values) &&
    Array.isArray(spec.sizes)
  ) {
    const key = spec.key ?? 'size';
    const rawVal = Number((pt as Record<string, unknown>)[key] ?? pt.size ?? 0);
    const [v0, v1] = spec.values;
    const [s0, s1] = spec.sizes;
    if (!Number.isFinite(rawVal) || v1 === v0) return s0;
    const t = Math.max(0, Math.min(1, (rawVal - v0) / (v1 - v0)));
    return s0 + (s1 - s0) * t;
  }
  return pt.size !== undefined ? defaultScale(Number(pt.size)) : minNodeSize;
}

/**
 * Pure Model Layer for `<mc-scatter-chart>`.
 * Computes continuous X/Y/Radius scales, symbols, deterministic jitter,
 * linear regression trendline coordinates, and threshold evaluations without creating DOM nodes.
 */
export function computeScatterChartModel(
  ctx: ChartRenderContext<ScatterSeries[]>,
  input: ScatterModelInput
): ScatterChartModel {
  const seriesList = Array.isArray(ctx.data) ? ctx.data : [];
  const allX: number[] = [];
  const allY: number[] = [];
  const allS: number[] = [];

  seriesList.forEach((s) => {
    (s.data ?? []).forEach((pt) => {
      allX.push(Number(pt.x));
      allY.push(Number(pt.y));
      if (pt.size !== undefined) allS.push(Number(pt.size));
    });
  });

  ctx.xScale = buildAxisScale(
    { ...ctx.scaleConfig.x, type: 'linear' },
    allX,
    [0, ctx.innerWidth]
  );
  ctx.yScale = buildAxisScale(
    { ...ctx.scaleConfig.y, type: 'linear' },
    allY,
    [ctx.innerHeight, 0]
  );
  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    seriesList.map((s) => s.id)
  );

  input.setupThresholds(ctx);

  const defaultSymbol = normalizeSymbol(input.symbol, 'circle');
  const defaultRotate = Number.isFinite(input.symbolRotate)
    ? Number(input.symbolRotate)
    : 0;
  const blendMode = input.blendMode || 'normal';
  const useMesh = Boolean(input.useMesh);
  const clip = Boolean(input.clip);
  const jitter = Math.max(
    0,
    Number.isFinite(input.jitter) ? Number(input.jitter) : 0
  );

  const sExtent = extent(allS) as [number, number];
  const rScale =
    allS.length > 0 && sExtent[0] !== undefined
      ? scaleSqrt()
          .domain(
            sExtent[0] === sExtent[1]
              ? [0, sExtent[1] || 10]
              : [sExtent[0], sExtent[1]]
          )
          .range([input.minNodeSize, input.maxNodeSize])
      : () => input.minNodeSize;

  const rawNodes: Omit<ComputedScatterNodeModel, 'index' | 'totalNodes'>[] = [];
  let globalIdx = 0;

  seriesList.forEach((s) => {
    const baseColor = s.color || ctx.colorScale(s.id);
    const seriesSymbol = normalizeSymbol(s.symbol, defaultSymbol);
    const seriesRotate = Number.isFinite(s.symbolRotate)
      ? Number(s.symbolRotate)
      : defaultRotate;

    (s.data ?? []).forEach((pt, idx) => {
      let px = getScalePosition(ctx.xScale, pt.x);
      let py = getScalePosition(ctx.yScale, pt.y);

      if (jitter > 0) {
        // Deterministic golden-angle 2D disk jitter so re-renders never flicker randomly
        const angle = ((globalIdx + 1) * 2.399963229728653) % (Math.PI * 2);
        const radial = jitter * Math.sqrt(((globalIdx * 7 + 3) % 16) / 15);
        px += Math.cos(angle) * radial;
        py += Math.sin(angle) * radial;
      }
      globalIdx++;

      const radius = resolvePointRadius(
        pt,
        s,
        input.nodeSize,
        rScale,
        input.minNodeSize
      );
      const ptSymbol = normalizeSymbol(pt.symbol, seriesSymbol);
      const ptRotate = Number.isFinite(pt.symbolRotate)
        ? Number(pt.symbolRotate)
        : seriesRotate;

      const evalResult = ctx.evaluateThresholds(
        Number(pt.y),
        { seriesId: s.id, ...pt },
        'y',
        baseColor
      );
      const color = evalResult.effectiveColor || baseColor;

      input.recordThresholdItem?.(
        {
          id: pt.label || `${s.id}-${idx}`,
          seriesId: s.id,
          category: String(pt.x),
          value: Number(pt.y),
          px,
          py,
          originalColor: baseColor,
          datum: { seriesId: s.id, ...pt }
        },
        evalResult
      );

      rawNodes.push({
        seriesId: s.id,
        originalColor: baseColor,
        color,
        xValue: Number(pt.x),
        yValue: Number(pt.y),
        sizeValue: Number(pt.size ?? 1),
        px,
        py,
        radius: evalResult.style.radius ?? radius,
        symbol: ptSymbol,
        symbolRotate: ptRotate,
        blendMode,
        label: pt.label || pt.id,
        threshold: evalResult
      });
    });
  });

  const totalNodes = rawNodes.length;
  const nodes: ComputedScatterNodeModel[] = rawNodes.map((n, index) => ({
    ...n,
    index,
    totalNodes
  }));

  let trendline: { x1: number; y1: number; x2: number; y2: number } | null =
    null;
  if (input.enableTrendline && nodes.length >= 2) {
    const n = nodes.length;
    const sumX = nodes.reduce((a, d) => a + d.px, 0);
    const sumY = nodes.reduce((a, d) => a + d.py, 0);
    const sumXY = nodes.reduce((a, d) => a + d.px * d.py, 0);
    const sumXX = nodes.reduce((a, d) => a + d.px * d.px, 0);
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) >= 1e-6) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      trendline = {
        x1: 0,
        y1: intercept,
        x2: ctx.innerWidth,
        y2: slope * ctx.innerWidth + intercept
      };
    }
  }

  return {
    nodes,
    seriesList,
    trendline,
    enableLabels: input.enableLabels,
    enableTrendline: input.enableTrendline,
    symbol: defaultSymbol,
    symbolRotate: defaultRotate,
    blendMode,
    useMesh,
    clip,
    jitter,
    xTitle: input.xTitle,
    yTitle: input.yTitle
  };
}
