import { joinChartItems } from '../../core/chart-item-join';
import { renderUnifiedLegendLayer } from '../../core/legend-engine';
import type { ChartRenderContext, HeatmapRow } from '../../core/types';
import type { HeatmapChartModel } from '../../models/heatmap.model';
import { renderHeatmapCellItem } from '../items/cell.item';
import { renderHeatmapColorLegend } from './heatmap-color-legend';
import {
  bindRectangularItemLabel,
  renderRectangularItem,
  retractRectangularItem
} from './rectangular-item-motion';

export function renderHeatmapCellsLayer(
  model: HeatmapChartModel,
  ctx: ChartRenderContext<HeatmapRow[]>
): void {
  const updateContext: typeof ctx = {
    ...ctx,
    animateItem: (mark) => mark.setAttribute('data-animated', 'false')
  };
  joinChartItems(
    ctx.layerGroup,
    model.cells,
    (cell) => JSON.stringify([cell.rowId, cell.colId]),
    ctx.animationConfig,
    (group, cell, { initial, motion }) => {
      const mark = renderHeatmapCellItem(cell, initial ? ctx : updateContext);
      renderRectangularItem(group, mark, cell, motion, true);
    },
    retractRectangularItem
  );
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
    const label = ctx.renderLabel(ctx.layerGroup, {
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
    bindRectangularItemLabel(cell, label);
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
