import { scaleLinear } from '../core/scales';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  RadarBlendMode,
  RadarDatum
} from '../core/types';

export interface ComputedRadarPointModel {
  globalIndex: number;
  totalDots: number;
  seriesKey: string;
  color: string;
  axis: string;
  value: number;
  angle: number;
  x: number;
  y: number;
  dotRadius: number;
  dotBorderWidth: number;
}

export interface ComputedRadarSeriesModel {
  key: string;
  index: number;
  color: string;
  fillOpacity: number;
  blendMode: RadarBlendMode;
  polygonPointsAttr: string;
  points: ComputedRadarPointModel[];
}

export interface RadarChartModel {
  cx: number;
  cy: number;
  radius: number;
  maxVal: number;
  gridLevels: number;
  gridShape: 'circular' | 'linear';
  startAngle: number;
  gridLabelOffset: number;
  dotSize: number;
  dotBorderWidth: number;
  blendMode: RadarBlendMode;
  splitArea: boolean;
  axes: string[];
  axisAngles: number[];
  series: ComputedRadarSeriesModel[];
  enableDots: boolean;
  enableDotLabels: boolean;
}

export interface RadarModelInput {
  indexBy: string;
  keys: string[];
  maxValue?: number;
  gridLevels: number;
  gridShape: 'circular' | 'linear';
  startAngle?: number;
  gridLabelOffset?: number;
  fillOpacity: number;
  enableDots: boolean;
  enableDotLabels: boolean;
  dotSize?: number;
  dotBorderWidth?: number;
  blendMode?: RadarBlendMode;
  splitArea?: boolean;
}

/**
 * Pure Model Layer for `<mc-radar-chart>`.
 * Supports `maxValue`, `startAngle` rotation offset, `gridLabelOffset`,
 * `dotSize`, `dotBorderWidth`, `blendMode`, and `splitArea` concentric band shading.
 */
export function computeRadarChartModel(
  ctx: ChartRenderContext<RadarDatum[]>,
  input: RadarModelInput
): RadarChartModel {
  const rows = Array.isArray(ctx.data) ? ctx.data : [];
  const { indexBy, keys: activeKeys } = input;
  const axes = rows.map((r) => String(r[indexBy] ?? ''));

  const startAngle = Number.isFinite(input.startAngle)
    ? Number(input.startAngle)
    : 0;
  const startAngleRad = (startAngle * Math.PI) / 180;
  const gridLabelOffset = Number.isFinite(input.gridLabelOffset)
    ? Math.max(4, Number(input.gridLabelOffset))
    : 18;
  const dotSize = Number.isFinite(input.dotSize)
    ? Math.max(0, Number(input.dotSize))
    : 8.4;
  const dotRadius = dotSize / 2;
  const dotBorderWidth = Number.isFinite(input.dotBorderWidth)
    ? Math.max(0, Number(input.dotBorderWidth))
    : 1.8;
  const blendMode: RadarBlendMode = input.blendMode ?? 'normal';
  const splitArea = Boolean(input.splitArea);

  let maxVal =
    input.maxValue !== undefined &&
    Number.isFinite(input.maxValue) &&
    Number(input.maxValue) > 0
      ? Number(input.maxValue)
      : 0;
  if (!maxVal || maxVal <= 0) {
    rows.forEach((r) => {
      activeKeys.forEach((k) => {
        const v = Number(r[k] ?? 0);
        if (v > maxVal) maxVal = v;
      });
    });
  }
  if (maxVal <= 0) maxVal = 100;

  const cx = ctx.innerWidth / 2;
  const cy = ctx.innerHeight / 2;
  const radius = Math.max(
    36,
    Math.min(ctx.innerWidth, ctx.innerHeight) / 2 -
      Math.max(18, gridLabelOffset + 10)
  );
  const rScale = scaleLinear().domain([0, maxVal]).range([0, radius]).clamp(true);

  ctx.colorScale = createOrdinalColorScale(ctx.theme, activeKeys);

  const axisAngles = rows.map(
    (_, i) =>
      (i / Math.max(1, rows.length)) * 2 * Math.PI -
      Math.PI / 2 +
      startAngleRad
  );

  const totalDots = activeKeys.length * rows.length;
  let globalIndex = 0;

  const series: ComputedRadarSeriesModel[] = activeKeys.map((key, sIdx) => {
    const color = ctx.colorScale(key);
    const points: ComputedRadarPointModel[] = rows.map((row, i) => {
      const val = Number(row[key] ?? 0);
      const angle = axisAngles[i];
      const r = rScale(val);
      const pt: ComputedRadarPointModel = {
        globalIndex,
        totalDots,
        seriesKey: key,
        color,
        axis: String(row[indexBy] ?? ''),
        value: val,
        angle,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        dotRadius,
        dotBorderWidth
      };
      globalIndex++;
      return pt;
    });

    return {
      key,
      index: sIdx,
      color,
      fillOpacity: input.fillOpacity,
      blendMode,
      polygonPointsAttr: points.map((p) => `${p.x},${p.y}`).join(' '),
      points
    };
  });

  return {
    cx,
    cy,
    radius,
    maxVal,
    gridLevels: input.gridLevels,
    gridShape: input.gridShape,
    startAngle,
    gridLabelOffset,
    dotSize,
    dotBorderWidth,
    blendMode,
    splitArea,
    axes,
    axisAngles,
    series,
    enableDots: input.enableDots,
    enableDotLabels: input.enableDotLabels
  };
}
