import { scaleLinear } from '../core/scales';
import { createOrdinalColorScale } from '../core/theme';
import type { ChartRenderContext, RadarDatum } from '../core/types';

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
}

export interface ComputedRadarSeriesModel {
  key: string;
  index: number;
  color: string;
  fillOpacity: number;
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
  axes: string[];
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
  fillOpacity: number;
  enableDots: boolean;
  enableDotLabels: boolean;
}

/**
 * Pure Model Layer for `<mc-radar-chart>`.
 */
export function computeRadarChartModel(
  ctx: ChartRenderContext<RadarDatum[]>,
  input: RadarModelInput
): RadarChartModel {
  const rows = Array.isArray(ctx.data) ? ctx.data : [];
  const { indexBy, keys: activeKeys } = input;
  const axes = rows.map((r) => String(r[indexBy] ?? ''));

  let maxVal = input.maxValue ?? 0;
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
    Math.min(ctx.innerWidth, ctx.innerHeight) / 2 - 28
  );
  const rScale = scaleLinear().domain([0, maxVal]).range([0, radius]);

  ctx.colorScale = createOrdinalColorScale(ctx.theme, activeKeys);

  const totalDots = activeKeys.length * rows.length;
  let globalIndex = 0;

  const series: ComputedRadarSeriesModel[] = activeKeys.map((key, sIdx) => {
    const color = ctx.colorScale(key);
    const points: ComputedRadarPointModel[] = rows.map((row, i) => {
      const val = Number(row[key] ?? 0);
      const angle = (i / Math.max(1, rows.length)) * 2 * Math.PI - Math.PI / 2;
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
        y: Math.sin(angle) * r
      };
      globalIndex++;
      return pt;
    });

    return {
      key,
      index: sIdx,
      color,
      fillOpacity: input.fillOpacity,
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
    axes,
    series,
    enableDots: input.enableDots,
    enableDotLabels: input.enableDotLabels
  };
}
