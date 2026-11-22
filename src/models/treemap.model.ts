import { hierarchy as d3Hierarchy, treemap as d3Treemap } from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type { ChartRenderContext, HierarchyNode } from '../core/types';

export interface ComputedTreemapLeafModel {
  index: number;
  totalLeaves: number;
  name: string;
  category: string;
  value: number;
  x0: number;
  y0: number;
  width: number;
  height: number;
  rx: number;
  color: string;
}

export interface TreemapChartModel {
  leaves: ComputedTreemapLeafModel[];
  categories: { id: string; label: string; color: string }[];
  enableLabels: boolean;
}

export interface TreemapModelInput {
  tilePadding: number;
  borderRadius: number;
  enableLabels: boolean;
}

/**
 * Pure Model Layer for `<mc-treemap-chart>`.
 */
export function computeTreemapChartModel(
  ctx: ChartRenderContext<HierarchyNode>,
  input: TreemapModelInput
): TreemapChartModel {
  const rootData = ctx.data ?? { name: 'Root', children: [] };

  const hierarchy = d3Hierarchy<HierarchyNode>(rootData)
    .sum((d) =>
      d.children && d.children.length > 0
        ? 0
        : Math.max(0, Number(d.value ?? 0))
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const treemap = d3Treemap<HierarchyNode>()
    .size([ctx.innerWidth, ctx.innerHeight])
    .paddingInner(input.tilePadding)
    .paddingOuter(2)
    .round(true);

  const root = treemap(hierarchy);
  const categoryNames = (root.children ?? []).map((c) => c.data.name);
  ctx.colorScale = createOrdinalColorScale(ctx.theme, categoryNames);

  const rawLeaves = root.leaves();
  const leaves: ComputedTreemapLeafModel[] = rawLeaves.map((leaf, index) => {
    let top = leaf;
    while (top.depth > 1 && top.parent) top = top.parent;
    const cat = top.data.name;
    const color = leaf.data.color || top.data.color || ctx.colorScale(cat);
    return {
      index,
      totalLeaves: rawLeaves.length,
      name: leaf.data.name,
      category: cat,
      value: leaf.value ?? 0,
      x0: leaf.x0,
      y0: leaf.y0,
      width: Math.max(0, leaf.x1 - leaf.x0),
      height: Math.max(0, leaf.y1 - leaf.y0),
      rx: input.borderRadius,
      color
    };
  });

  const categories = (root.children ?? []).map((c) => ({
    id: c.data.name,
    label: c.data.name,
    color: c.data.color || ctx.colorScale(c.data.name)
  }));

  return {
    leaves,
    categories,
    enableLabels: input.enableLabels
  };
}
