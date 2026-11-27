import { renderUnifiedLegendLayer } from '../../core/legend-engine';
import type { ChartRenderContext, HeatmapRow } from '../../core/types';
import type { HeatmapChartModel } from '../../models/heatmap.model';
import { renderHeatmapCellItem } from '../items/cell.item';
import { renderHeatmapColorLegend } from './heatmap-color-legend';

export function renderHeatmapCellsLayer(
  model: HeatmapChartModel,
  ctx: ChartRenderContext<HeatmapRow[]>
): void {
  model.cells.forEach((cell) => {
    ctx.layerGroup.appendChild(renderHeatmapCellItem(cell, ctx));
  });
}

export function renderHeatmapCellLabelsLayer(
  model: HeatmapChartModel,
  ctx: ChartRenderContext<HeatmapRow[]>
): void {
  if (!model.enableLabels) return;

  model.cells.forEach((cell, idx) => {
    if (
      cell.isEmpty ||
      !Number.isFinite(cell.value) ||
      cell.width < 22 ||
      cell.height < 16
    ) {
      return;
    }
    ctx.renderLabel(ctx.layerGroup, {
      id: `heatmap-label-${idx}`,
      text: ctx.i18n.formatNumber(cell.value, { useGrouping: false }),
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2,
      type: 'cell',
      anchor: 'middle',
      baseline: 'middle',
      maxWidth: cell.width - 4,
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color: cell.textColor,
      datum: {
        id: `${cell.rowId}-${cell.colId}`,
        row: cell.rowId,
        col: cell.colId,
        value: cell.value
      }
    });
  });
}

export function renderHeatmapLegendLayer(
  model: HeatmapChartModel,
  ctx: ChartRenderContext<HeatmapRow[]>,
  defs: Element | null | undefined,
  axisClearance: number
): void {
  if (!ctx.legendConfig.enabled) return;
  switch (ctx.legendConfig.type) {
    case 'categorical':
    case 'piecewise':
      renderUnifiedLegendLayer(ctx, []);
      break;
    default:
      renderHeatmapColorLegend(model, ctx, defs, axisClearance);
  }
}
