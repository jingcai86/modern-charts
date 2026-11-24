import type { ChartRenderContext, HeatmapRow } from '../../core/types';
import type { HeatmapChartModel } from '../../models/heatmap.model';
import { renderHeatmapCellItem } from '../items/cell.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
      text: String(cell.value),
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
  defs?: Element | null
): void {
  if (!defs || !model.seqScale) return;

  const gradId = 'mc-heatmap-legend-grad';
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1', '0%');
  grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%');
  grad.setAttribute('y2', '0%');

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', `${t * 100}%`);
    stop.setAttribute(
      'stop-color',
      model.seqScale(model.minVal + t * (model.maxVal - model.minVal))
    );
    grad.appendChild(stop);
  }
  defs.appendChild(grad);

  const barW = Math.min(130, ctx.innerWidth * 0.34);
  const barH = 8;
  const startX = ctx.innerWidth - barW - 22;
  const startY = -20;

  const barRect = document.createElementNS(SVG_NS, 'rect');
  barRect.setAttribute('x', String(startX));
  barRect.setAttribute('y', String(startY));
  barRect.setAttribute('width', String(barW));
  barRect.setAttribute('height', String(barH));
  barRect.setAttribute('rx', '4');
  barRect.setAttribute('fill', `url(#${gradId})`);
  ctx.layerGroup.appendChild(barRect);

  ctx.renderLabel(ctx.layerGroup, {
    id: 'heatmap-legend-min',
    text: String(model.minVal),
    x: startX - 6,
    y: startY + barH / 2,
    type: 'legend',
    anchor: 'end',
    baseline: 'middle',
    fontSize: 10,
    color: ctx.theme.mutedTextColor
  });

  ctx.renderLabel(ctx.layerGroup, {
    id: 'heatmap-legend-max',
    text: String(model.maxVal),
    x: startX + barW + 6,
    y: startY + barH / 2,
    type: 'legend',
    anchor: 'start',
    baseline: 'middle',
    fontSize: 10,
    color: ctx.theme.mutedTextColor
  });
}
