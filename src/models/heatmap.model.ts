import { buildAxisScale } from '../core/scale-manager';
import { createSequentialColorScale } from '../core/theme';
import type { ChartRenderContext, HeatmapRow } from '../core/types';

export interface ComputedHeatmapCellModel {
  index: number;
  totalCount: number;
  rowId: string;
  colId: string;
  value: number;
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
  seqScale: (val: number) => string;
  enableLabels: boolean;
}

export interface HeatmapModelInput {
  cellPadding: number;
  colorScheme: string;
  cellShape: 'rect' | 'circle';
  borderRadius: number;
  enableLabels: boolean;
}

/**
 * Pure Model Layer for `<mc-heatmap-chart>`.
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
      if (!colIds.includes(String(c.x))) colIds.push(String(c.x));
      values.push(Number(c.y));
    });
  });

  const pad = input.cellPadding;
  ctx.xScale = buildAxisScale(
    {
      ...ctx.scaleConfig.x,
      type: 'band',
      innerPadding: pad,
      outerPadding: pad / 2
    },
    colIds,
    [0, ctx.innerWidth]
  );
  ctx.yScale = buildAxisScale(
    {
      ...ctx.scaleConfig.y,
      type: 'band',
      innerPadding: pad,
      outerPadding: pad / 2
    },
    rowIds,
    [0, ctx.innerHeight]
  );

  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const seqScale = createSequentialColorScale(input.colorScheme, [
    minVal,
    maxVal
  ]);

  const cellW =
    typeof ctx.xScale.bandwidth === 'function' ? ctx.xScale.bandwidth() : 36;
  const cellH =
    typeof ctx.yScale.bandwidth === 'function' ? ctx.yScale.bandwidth() : 36;

  const rawCells: Omit<ComputedHeatmapCellModel, 'index' | 'totalCount'>[] = [];
  rows.forEach((row) => {
    const y = Number(ctx.yScale(row.id) ?? 0);
    (row.data ?? []).forEach((c) => {
      const x = Number(ctx.xScale(String(c.x)) ?? 0);
      const val = Number(c.y);
      const color = seqScale(val);
      const norm = maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0.5;
      const textColor = norm > 0.62 ? '#0f172a' : '#f8fafc';
      rawCells.push({
        rowId: row.id,
        colId: String(c.x),
        value: val,
        x,
        y,
        width: cellW,
        height: cellH,
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
    seqScale,
    enableLabels: input.enableLabels
  };
}
