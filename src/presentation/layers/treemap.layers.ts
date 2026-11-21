import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, HierarchyNode } from '../../core/types';
import type { TreemapChartModel } from '../../models/treemap.model';
import { renderTreemapTileItem } from '../items/cell.item';

export function renderTreemapTilesLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  model.leaves.forEach((leaf) => {
    if (leaf.width <= 1 || leaf.height <= 1) return;
    ctx.layerGroup.appendChild(renderTreemapTileItem(leaf, ctx));
  });
}

export function renderTreemapLabelsLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  if (!model.enableLabels) return;

  model.leaves.forEach((leaf, idx) => {
    if (leaf.width < 36 || leaf.height < 22) return;
    const text =
      leaf.height >= 42 ? `${leaf.name} (${leaf.value})` : leaf.name;
    ctx.renderLabel(ctx.layerGroup, {
      id: `treemap-label-${idx}`,
      text,
      x: leaf.x0 + leaf.width / 2,
      y: leaf.y0 + leaf.height / 2,
      type: 'cell',
      anchor: 'middle',
      baseline: 'middle',
      maxWidth: Math.max(24, leaf.width - 10),
      maxHeight: Math.max(16, leaf.height - 8),
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color: '#ffffff',
      datum: {
        id: leaf.name,
        name: leaf.name,
        category: leaf.category,
        value: leaf.value
      }
    });
  });
}

export function renderTreemapLegendsLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  renderLegendLayer(ctx, model.categories, 'bottom');
}
