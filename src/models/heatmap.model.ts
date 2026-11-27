import { buildAxisScale } from '../core/scale-manager';
import {
  createSequentialColorScale,
  normalizeSequentialDomain,
  type SequentialColorScale
} from '../core/color-schemes';
import { parseColorToRgb, resolveSequentialColorRamp } from '../core/theme';
import type { ChartRenderContext, HeatmapRow } from '../core/types';

function getContrastingCellTextColor(bgColor: string): string {
  const [r, g, b] = parseColorToRgb(bgColor) ?? [0, 0, 0];
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  // Black and white give equal contrast at a relative luminance of about 0.179.
  return lum >= 0.179 ? '#000' : '#fff';
}

export interface ComputedHeatmapCellModel {
  index: number;
  totalCount: number;
  rowId: string;
  colId: string;
  value: number;
  isEmpty?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  shape: 'rect' | 'circle';
  color: string;
  textColor: string;
}

export interface HeatmapColorBin {
  min: number;
  max: number;
  color: string;
}

export interface HeatmapChartModel {
  cells: ComputedHeatmapCellModel[];
  bins: HeatmapColorBin[];
  minVal: number;
  maxVal: number;
  xInnerPadding: number;
  yInnerPadding: number;
  sizeVariation: number;
  emptyColor: string;
  forceSquare: boolean;
  seqScale: SequentialColorScale;
  enableLabels: boolean;
}

export interface HeatmapModelInput {
  cellPadding: number;
  xInnerPadding?: number;
  yInnerPadding?: number;
  sizeVariation?: number;
  emptyColor?: string;
  forceSquare?: boolean;
  min?: number;
  max?: number;
  colorScheme: string;
  cellShape: 'rect' | 'circle';
  borderRadius: number;
  enableLabels: boolean;
}

function finiteNumber(value: number | undefined): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function cellValue(value: unknown): number | undefined {
  return value == null || value === '' ? undefined : finiteNumber(Number(value));
}

function createHeatmapColorBins(
  min: number,
  max: number,
  steps: number | undefined,
  scale: SequentialColorScale
): HeatmapColorBin[] {
  const requestedSteps = finiteNumber(steps) ?? 10;
  const count = min === max ? 1 : Math.max(1, Math.min(100, Math.floor(requestedSteps)));
  const span = max - min;
  const edges = [min];
  for (let index = 1; index < count; index++) {
    const fraction = index / count;
    const edge = Number.isFinite(span)
      ? min + span * fraction
      : min * (1 - fraction) + max * fraction;
    edges.push(edge);
  }
  edges.push(max);

  const ramp = scale.copy().domain([0, 1]);
  return Array.from({ length: count }, (_, index) => ({
    min: edges[index],
    max: edges[index + 1],
    color: ramp((index + 0.5) / count)
  }));
}

function getBinColor(bins: readonly HeatmapColorBin[], value: number): string {
  if (value <= bins[0].min) return bins[0].color;
  let low = 0;
  let high = bins.length - 1;
  // Interior boundaries belong to the upper bin. Endpoints clamp to the first or last bin.
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (value < bins[mid].max) high = mid;
    else low = mid + 1;
  }
  return bins[low].color;
}

/**
 * Pure Model Layer for `<mc-heatmap-chart>`.
 * Supports `xInnerPadding` / `yInnerPadding`, `sizeVariation`, `emptyColor` for missing/null cells,
 * `forceSquare` 1:1 cell aspect ratio, and `min` / `max` color domain bounds.
 */
export function computeHeatmapChartModel(
  ctx: ChartRenderContext<HeatmapRow[]>,
  input: HeatmapModelInput
): HeatmapChartModel {
  const rows = Array.isArray(ctx.data) ? ctx.data : [];
  const rowIds = rows.map((r) => r.id);
  const columns = new Set<string>();
  let dataMin = Number.POSITIVE_INFINITY;
  let dataMax = Number.NEGATIVE_INFINITY;

  rows.forEach((r) => {
    (r.data ?? []).forEach((c) => {
      if (!c) return;
      columns.add(String(c.x));
      const value = cellValue(c.y);
      if (value !== undefined) {
        dataMin = Math.min(dataMin, value);
        dataMax = Math.max(dataMax, value);
      }
    });
  });

  const xPad = Number.isFinite(input.xInnerPadding)
    ? Math.max(0, Math.min(0.8, Number(input.xInnerPadding)))
    : input.cellPadding;
  const yPad = Number.isFinite(input.yInnerPadding)
    ? Math.max(0, Math.min(0.8, Number(input.yInnerPadding)))
    : input.cellPadding;
  const sizeVariation = Number.isFinite(input.sizeVariation)
    ? Math.max(0, Math.min(0.9, Number(input.sizeVariation)))
    : 0;
  const emptyColor = input.emptyColor || 'rgba(148, 163, 184, 0.16)';
  const forceSquare = Boolean(input.forceSquare);
  const colIds = [...columns];

  ctx.xScale = buildAxisScale(
    {
      ...ctx.scaleConfig.x,
      type: 'band',
      innerPadding: xPad,
      outerPadding: xPad / 2
    },
    colIds,
    [0, ctx.innerWidth]
  );
  ctx.yScale = buildAxisScale(
    {
      ...ctx.scaleConfig.y,
      type: 'band',
      innerPadding: yPad,
      outerPadding: yPad / 2
    },
    rowIds,
    [0, ctx.innerHeight]
  );

  const legend = ctx.legendConfig;
  const legendType = legend?.type ?? 'continuous';
  const discrete = legendType === 'discrete';
  const colorLegend = discrete || legendType === 'continuous' ? legend : undefined;
  const legendMin = finiteNumber(colorLegend?.min);
  const legendMax = finiteNumber(colorLegend?.max);
  const inputMin = finiteNumber(input.min);
  const inputMax = finiteNumber(input.max);
  let minVal = legendMin ?? inputMin ?? finiteNumber(dataMin) ?? 0;
  let maxVal = legendMax ?? inputMax ?? finiteNumber(dataMax) ?? 100;

  if (discrete && minVal > maxVal) {
    // Keep a single explicitly supplied bound when it crosses the inherited endpoint.
    const [explicitMin, explicitMax] = legendMin !== undefined || legendMax !== undefined
      ? [legendMin, legendMax]
      : [inputMin, inputMax];
    if (explicitMin === undefined) minVal = maxVal;
    else if (explicitMax === undefined) maxVal = minVal;
    else [minVal, maxVal] = [maxVal, minVal];
  }

  const ramp = resolveSequentialColorRamp(ctx, colorLegend?.colorScheme || input.colorScheme);
  const seqScale = createSequentialColorScale(ramp, [minVal, maxVal]).clamp(true);
  const bins = discrete ? createHeatmapColorBins(minVal, maxVal, legend.steps, seqScale) : [];
  const getColor = discrete ? (value: number) => getBinColor(bins, value) : seqScale;

  const bandW =
    typeof ctx.xScale.bandwidth === 'function' ? ctx.xScale.bandwidth() : 36;
  const bandH =
    typeof ctx.yScale.bandwidth === 'function' ? ctx.yScale.bandwidth() : 36;

  const baseCellW = forceSquare ? Math.min(bandW, bandH) : bandW;
  const baseCellH = forceSquare ? Math.min(bandW, bandH) : bandH;

  const rawCells: Omit<ComputedHeatmapCellModel, 'index' | 'totalCount'>[] = [];
  rows.forEach((row) => {
    const bandY = Number(ctx.yScale(row.id) ?? 0);
    const cellMap = new Map<string, number | undefined>();
    (row.data ?? []).forEach((c) => {
      if (c) cellMap.set(String(c.x), cellValue(c.y));
    });

    colIds.forEach((colId) => {
      const bandX = Number(ctx.xScale(colId) ?? 0);
      const val = cellMap.get(colId);
      const isEmpty = val === undefined;

      const norm = isEmpty
        ? 1
        : maxVal > minVal
          ? Math.max(0, Math.min(1, normalizeSequentialDomain(val, minVal, maxVal)))
          : 0.5;
      const scaleFactor =
        isEmpty || sizeVariation <= 0
          ? 1
          : 1 - sizeVariation + sizeVariation * norm;

      const w = Math.max(4, baseCellW * scaleFactor);
      const h = Math.max(4, baseCellH * scaleFactor);
      const x = bandX + (bandW - w) / 2;
      const y = bandY + (bandH - h) / 2;

      const color = isEmpty ? emptyColor : getColor(val);
      const textColor = isEmpty
        ? ctx.theme.mutedTextColor
        : getContrastingCellTextColor(color);

      rawCells.push({
        rowId: row.id,
        colId,
        value: isEmpty ? Number.NaN : val,
        isEmpty,
        x,
        y,
        width: w,
        height: h,
        rx: input.borderRadius,
        shape: input.cellShape,
        color,
        textColor
      });
    });
  });

  const totalCount = rawCells.length;
  const cells: ComputedHeatmapCellModel[] = rawCells.map((c, index) => ({
    ...c,
    index,
    totalCount
  }));

  return {
    cells,
    bins,
    minVal,
    maxVal,
    xInnerPadding: xPad,
    yInnerPadding: yPad,
    sizeVariation,
    emptyColor,
    forceSquare,
    seqScale,
    enableLabels: input.enableLabels
  };
}
