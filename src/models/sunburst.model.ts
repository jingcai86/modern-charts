import * as d3 from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type { ChartRenderContext, HierarchyNode } from '../core/types';

export interface ComputedSunburstArcModel {
  index: number;
  totalCount: number;
  name: string;
  breadcrumb: string;
  pathNames: string[];
  value: number;
  percentage: number;
  depth: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  color: string;
  pathD: string;
  centroid: [number, number];
  rotation: number;
  arcLength: number;
  ringThickness: number;
  hasChildren: boolean;
}

export interface SunburstChartModel {
  cx: number;
  cy: number;
  innerHole: number;
  total: number;
  activeRootName: string;
  isDrilledDown: boolean;
  arcs: ComputedSunburstArcModel[];
  topCategories: { id: string; label: string; color: string }[];
  enableLabels: boolean;
  interactiveDrilldown: boolean;
}

export interface SunburstModelInput {
  focusPath: string[];
  cornerRadius: number;
  enableLabels: boolean;
  interactiveDrilldown: boolean;
}

function findFocusNode(root: HierarchyNode, path: string[]): HierarchyNode {
  let curr = root;
  for (const seg of path) {
    const child = curr.children?.find((c) => c.name === seg);
    if (!child) break;
    curr = child;
  }
  return curr;
}

/**
 * Pure Model Layer for `<mc-sunburst-chart>`.
 */
export function computeSunburstChartModel(
  ctx: ChartRenderContext<HierarchyNode>,
  input: SunburstModelInput
): SunburstChartModel {
  const rawRoot = ctx.data ?? { name: 'Root', children: [] };
  const activeRootData =
    input.focusPath.length > 0
      ? findFocusNode(rawRoot, input.focusPath)
      : rawRoot;

  const radius = Math.max(
    40,
    Math.min(ctx.innerWidth, ctx.innerHeight) / 2 - 8
  );
  const cx = ctx.innerWidth / 2;
  const cy = ctx.innerHeight / 2;

  const hierarchy = d3
    .hierarchy<HierarchyNode>(activeRootData)
    .sum((d) =>
      d.children && d.children.length > 0
        ? 0
        : Math.max(0, Number(d.value ?? 0))
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius]);
  const root = partition(hierarchy);
  const total = root.value || 1;
  const topCategoriesNames = (root.children ?? []).map((c) => c.data.name);
  ctx.colorScale = createOrdinalColorScale(ctx.theme, topCategoriesNames);

  const innerHole = radius * 0.22;
  const scaleY = (y: number) =>
    innerHole + (y / Math.max(1, radius)) * (radius - innerHole);

  const arcGen = d3
    .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.008))
    .padRadius(radius / 2)
    .innerRadius((d) => Math.max(0, scaleY(d.y0)))
    .outerRadius((d) => Math.max(0, scaleY(d.y1) - 1.5))
    .cornerRadius(input.cornerRadius);

  const descendants = root.descendants().filter((d) => d.depth > 0);
  const arcs: ComputedSunburstArcModel[] = descendants.map((d, index) => {
    let topAncestor = d;
    while (topAncestor.depth > 1 && topAncestor.parent) {
      topAncestor = topAncestor.parent;
    }
    const baseColor =
      d.data.color ||
      topAncestor.data.color ||
      ctx.colorScale(topAncestor.data.name);
    const colorObj = d3.color(baseColor);
    const shade =
      d.depth > 1 && colorObj
        ? colorObj.brighter((d.depth - 1) * 0.28).formatHex()
        : baseColor;

    const midAngle = (d.x0 + d.x1) / 2;
    const midR = (scaleY(d.y0) + scaleY(d.y1)) / 2;
    const deg = (midAngle * 180) / Math.PI - 90;
    const rotation = deg > 90 ? deg - 180 : deg;

    const ancestors = d
      .ancestors()
      .reverse()
      .slice(1)
      .map((a) => a.data.name);
    const pathNames = [...input.focusPath, ...ancestors];
    const breadcrumb = [rawRoot.name || 'Root', ...pathNames].join(' › ');

    return {
      index,
      totalCount: descendants.length,
      name: d.data.name,
      breadcrumb,
      pathNames,
      value: d.value ?? 0,
      percentage: ((d.value ?? 0) / total) * 100,
      depth: d.depth,
      x0: d.x0,
      x1: d.x1,
      y0: scaleY(d.y0),
      y1: scaleY(d.y1),
      color: shade,
      pathD: arcGen(d) || '',
      centroid: arcGen.centroid(d),
      rotation,
      arcLength: (d.x1 - d.x0) * midR,
      ringThickness: Math.max(10, scaleY(d.y1) - scaleY(d.y0)),
      hasChildren: Boolean(d.data.children && d.data.children.length > 0)
    };
  });

  const topCategories = (root.children ?? []).map((c) => ({
    id: c.data.name,
    label: c.data.name,
    color: c.data.color || ctx.colorScale(c.data.name)
  }));

  return {
    cx,
    cy,
    innerHole,
    total,
    activeRootName: activeRootData.name,
    isDrilledDown: input.focusPath.length > 0,
    arcs,
    topCategories,
    enableLabels: input.enableLabels,
    interactiveDrilldown: input.interactiveDrilldown
  };
}
