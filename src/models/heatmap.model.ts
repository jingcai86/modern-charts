import { buildAxisScale } from '../core/scale-manager';
import { createSequentialColorScale } from '../core/color-schemes';
import type { ChartRenderContext, HeatmapRow } from '../core/types';

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

export interface HeatmapChartModel {
  cells: ComputedHeatmapCellModel[];
  minVal: number;
  maxVal: number;
  xInnerPadding: number;
  yInnerPadding: number;
  sizeVariation: number;
  emptyColor: string;
  forceSquare: boolean;
  seqScale: (val: number) => string;
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
  const colIds: string[] = [];
  const values: number[] = [];

  rows.forEach((r) => {
    (r.data ?? []).forEach((c) => {
      if (!c) return;
      const colKey = String(c.x);
      if (!colIds.includes(colKey)) colIds.push(colKey);
      if (
        c.y !== null &&
        c.y !== undefined &&
        (c.y as unknown) !== '' &&
        Number.isFinite(Number(c.y))
      ) {
        values.push(Number(c.y));
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

  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const dataMax = values.length > 0 ? Math.max(...values) : 100;
  const minVal =
    input.min !== undefined && Number.isFinite(input.min)
      ? Number(input.min)
      : dataMin;
  const maxVal =
    input.max !== undefined && Number.isFinite(input.max)
      ? Number(input.max)
      : dataMax;

  const seqScale = createSequentialColorScale(input.colorScheme, [
    minVal,
    maxVal
  ]).clamp(true);

  const bandW =
    typeof ctx.xScale.bandwidth === 'function' ? ctx.xScale.bandwidth() : 36;
  const bandH =
    typeof ctx.yScale.bandwidth === 'function' ? ctx.yScale.bandwidth() : 36;

  const baseCellW = forceSquare ? Math.min(bandW, bandH) : bandW;
  const baseCellH = forceSquare ? Math.min(bandW, bandH) : bandH;

  const rawCells: Omit<ComputedHeatmapCellModel, 'index' | 'totalCount'>[] = [];
  rows.forEach((row) => {
    const bandY = Number(ctx.yScale(row.id) ?? 0);
    const cellMap = new Map<string, number | null>();
    (row.data ?? []).forEach((c) => {
      if (!c) return;
      const v =
        c.y !== null &&
        c.y !== undefined &&
        (c.y as unknown) !== '' &&
        Number.isFinite(Number(c.y))
          ? Number(c.y)
          : null;
      cellMap.set(String(c.x), v);
    });

    const colsToVisit =
      emptyColor && colIds.length > 0
        ? colIds
        : (row.data ?? []).map((c) => String(c.x));

    colsToVisit.forEach((colId) => {
      const bandX = Number(ctx.xScale(colId) ?? 0);
      const val = cellMap.get(colId);
      const isEmpty = val === null || val === undefined || !Number.isFinite(val);

      const norm = isEmpty
        ? 1
        : maxVal > minVal
          ? Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)))
          : 0.5;
      const scaleFactor =
        isEmpty || sizeVariation <= 0
          ? 1
          : 1 - sizeVariation + sizeVariation * norm;

      const w = Math.max(4, baseCellW * scaleFactor);
      const h = Math.max(4, baseCellH * scaleFactor);
      const x = bandX + (bandW - w) / 2;
      const y = bandY + (bandH - h) / 2;

      const color = isEmpty ? emptyColor : seqScale(val);
      const textColor = norm > 0.62 ? '#0f172a' : '#f8fafc';

      rawCells.push({
        rowId: row.id,
        colId,
        value: isEmpty ? NaN : val,
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
