import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { renderUnifiedLegendLayer } from '../../core/legend-engine';
import { parseColorToRgb } from '../../core/theme';
import type { ChartRenderContext, HeatmapRow } from '../../core/types';
import type { HeatmapChartModel } from '../../models/heatmap.model';
import { renderHeatmapCellItem } from '../items/cell.item';
import { renderHeatmapColorLegend } from './heatmap-color-legend';
import {
  bindRectangularItemLabel,
  renderRectangularItem,
  retractRectangularItem
} from './rectangular-item-motion';

function parseFill(raw: string): [number, number, number, number] | null {
  const fill = raw.trim();
  if (fill.toLowerCase() === 'transparent') return [0, 0, 0, 0];
  const rgb = parseColorToRgb(fill);
  if (!rgb) return null;

  if (fill.startsWith('#')) {
    const alpha = fill.length === 5 ? fill[4].repeat(2) : fill.length === 9 ? fill.slice(-2) : 'ff';
    return [...rgb, Number.parseInt(alpha, 16) / 255];
  }
  const token = fill.split('/')[1] ?? fill.split(',')[3];
  const alpha = token ? Number.parseFloat(token) / (token.includes('%') ? 100 : 1) : 1;
  return [...rgb, Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1];
}

function tweenFill(previous: SVGElement, mark: SVGElement, motion: ItemMotion): void {
  const from = previous.style.fill || previous.getAttribute('fill');
  const to = mark.getAttribute('fill');
  if (!from || !to || from === to) return;
  const start = parseFill(from);
  const end = parseFill(to);
  if (!start || !end) return;
  motion((progress) => {
    const [red, green, blue, alpha] = start.map((value, index) => value + (end[index] - value) * progress);
    const rgb = `${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}`;
    mark.style.fill = alpha === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${alpha})`;
  }, () => {
    mark.style.fill = '';
  });
}

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
      const previous = group.lastElementChild as SVGElement | null;
      const mark = renderHeatmapCellItem(cell, initial ? ctx : updateContext);
      renderRectangularItem(group, mark, cell, motion);
      if (motion && previous) tweenFill(previous, mark, motion);
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
