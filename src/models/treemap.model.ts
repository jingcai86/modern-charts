import {
  hierarchy as d3Hierarchy,
  treemap as d3Treemap,
  treemapBinary,
  treemapDice,
  treemapResquarify,
  treemapSlice,
  treemapSliceDice,
  treemapSquarify
} from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  HierarchyNode,
  TreemapColorBy,
  TreemapTileMethod
} from '../core/types';

export interface ComputedTreemapParentModel {
  index: number;
  name: string;
  pathNames: string[];
  value: number;
  x0: number;
  y0: number;
  width: number;
  height: number;
  headerHeight: number;
  rx: number;
  color: string;
}

export interface ComputedTreemapLeafModel {
  index: number;
  totalLeaves: number;
  name: string;
  category: string;
  depth: number;
  pathNames: string[];
  drillPathNames: string[];
  value: number;
  x0: number;
  y0: number;
  width: number;
  height: number;
  rx: number;
  color: string;
  opacity: number;
  labelRotation: number;
}

export interface TreemapChartModel {
  tile: TreemapTileMethod;
  leavesOnly: boolean;
  parentLabelHeight: number;
  orientLabel: boolean;
  colorBy: TreemapColorBy;
  nodeOpacity: number;
  interactiveDrilldown: boolean;
  focusPath: string[];
  isDrilledDown: boolean;
  activeRootName: string;
  breadcrumbText: string;
  breadcrumbHeight: number;
  parents: ComputedTreemapParentModel[];
  leaves: ComputedTreemapLeafModel[];
  categories: { id: string; label: string; color: string }[];
  enableLabels: boolean;
}

export interface TreemapModelInput {
  focusPath?: string[];
  tile?: TreemapTileMethod;
  tilePadding: number;
  borderRadius: number;
  leavesOnly?: boolean;
  parentLabelHeight?: number;
  orientLabel?: boolean;
  colorBy?: TreemapColorBy;
  nodeOpacity?: number;
  interactiveDrilldown?: boolean;
  enableLabels: boolean;
}

const TILE_METHODS: Record<TreemapTileMethod, any> = {
  squarify: treemapSquarify,
  binary: treemapBinary,
  slice: treemapSlice,
  dice: treemapDice,
  sliceDice: treemapSliceDice,
  resquarify: treemapResquarify
};

function resolveFocus(root: HierarchyNode, path: string[]) {
  let curr = root;
  const focusPath: string[] = [];
  for (const seg of path) {
    const child = curr.children?.find((c) => c.name === seg);
    if (!child) break;
    curr = child;
    focusPath.push(seg);
  }
  return { activeRootData: curr, focusPath };
}

/**
 * Pure Model Layer for `<mc-treemap-chart>`.
 * Supports all 6 D3 tiling algorithms (`tile`), `leavesOnly`, `parentLabelHeight`,
 * `orientLabel` vertical label rotation in narrow tiles, `colorBy` (`'parent' | 'depth' | 'name'`),
 * `nodeOpacity`, and `interactiveDrilldown` subtree navigation.
 */
export function computeTreemapChartModel(
  ctx: ChartRenderContext<HierarchyNode>,
  input: TreemapModelInput
): TreemapChartModel {
  const rawRoot = ctx.data ?? { name: 'Root', children: [] };
  const { activeRootData, focusPath } = resolveFocus(rawRoot, input.focusPath ?? []);
  const isDrilledDown = focusPath.length > 0;
  const breadcrumbText = [rawRoot.name || ctx.i18n.messages.root, ...focusPath].join(' › ');
  const breadcrumbHeight = isDrilledDown ? 28 : 0;

  const tileMethod: TreemapTileMethod =
    input.tile && input.tile in TILE_METHODS ? input.tile : 'squarify';
  const leavesOnly = Boolean(input.leavesOnly);
  const parentLabelHeight = Number.isFinite(input.parentLabelHeight)
    ? Math.max(0, Number(input.parentLabelHeight))
    : 22;
  const orientLabel = input.orientLabel !== false;
  const colorBy: TreemapColorBy = input.colorBy ?? 'parent';
  const nodeOpacity = Number.isFinite(input.nodeOpacity)
    ? Math.max(0.05, Math.min(1, Number(input.nodeOpacity)))
    : 1;
  const interactiveDrilldown = input.interactiveDrilldown !== false;

  const hierarchy = d3Hierarchy<HierarchyNode>(activeRootData)
    .sum((d) =>
      d.children && d.children.length > 0
        ? 0
        : Math.max(0, Number(d.value ?? 0))
    )
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const hasNestedGroups = (hierarchy.children ?? []).some(
    (c) => Array.isArray(c.children) && c.children.length > 0
  );
  const showParentGroups =
    !leavesOnly && parentLabelHeight > 0 && hasNestedGroups;

  const availHeight = Math.max(40, ctx.innerHeight - breadcrumbHeight);
  const treemap = d3Treemap<HierarchyNode>()
    .tile(TILE_METHODS[tileMethod])
    .size([ctx.innerWidth, availHeight])
    .paddingInner(input.tilePadding)
    .paddingOuter(showParentGroups ? 4 : 2)
    .paddingTop((node) =>
      showParentGroups && node.depth === 1 && node.children ? parentLabelHeight : 0
    )
    .round(true);

  const root = treemap(hierarchy);
  const rawLeaves = root.leaves();

  const categoryNames = (root.children ?? []).map((c) => c.data.name);
  const depthKeys = Array.from(
    new Set(rawLeaves.map((l) => `Depth ${l.depth}`))
  );
  const leafNames = rawLeaves.map((l) => l.data.name);

  const domainKeys =
    colorBy === 'depth'
      ? depthKeys
      : colorBy === 'name'
        ? leafNames
        : categoryNames;
  ctx.colorScale = createOrdinalColorScale(ctx.theme, domainKeys);

  const parents: ComputedTreemapParentModel[] = showParentGroups
    ? (root.children ?? [])
        .filter((c) => Array.isArray(c.children) && c.children.length > 0)
        .map((parent, idx) => {
          const pName = parent.data.name;
          const pColor =
            parent.data.color ||
            ctx.colorScale(
              colorBy === 'depth' ? 'Depth 1' : pName
            );
          return {
            index: idx,
            name: pName,
            pathNames: [...focusPath, pName],
            value: parent.value ?? 0,
            x0: parent.x0,
            y0: parent.y0 + breadcrumbHeight,
            width: Math.max(0, parent.x1 - parent.x0),
            height: Math.max(0, parent.y1 - parent.y0),
            headerHeight: parentLabelHeight,
            rx: Math.min(12, input.borderRadius + 2),
            color: pColor
          };
        })
    : [];

  const leaves: ComputedTreemapLeafModel[] = rawLeaves.map((leaf, index) => {
    let top = leaf;
    while (top.depth > 1 && top.parent) top = top.parent;
    const cat = top.data.name;

    const colorKey =
      colorBy === 'depth'
        ? `Depth ${leaf.depth}`
        : colorBy === 'name'
          ? leaf.data.name
          : cat;
    const color =
      leaf.data.color ||
      (colorBy === 'parent' ? top.data.color : undefined) ||
      ctx.colorScale(colorKey);

    const ancestors = leaf
      .ancestors()
      .reverse()
      .slice(1)
      .map((a) => a.data.name);
    const pathNames = [...focusPath, ...ancestors];
    // Clicking a leaf inside a top-level category drills into that top-level category if it has children
    const drillPathNames =
      top.children && top.children.length > 0 ? [...focusPath, cat] : [];

    const width = Math.max(0, leaf.x1 - leaf.x0);
    const height = Math.max(0, leaf.y1 - leaf.y0);
    const shouldRotateVertical =
      orientLabel && height > width * 1.35 && width < 72 && height >= 40;

    return {
      index,
      totalLeaves: rawLeaves.length,
      name: leaf.data.name,
      category: cat,
      depth: leaf.depth,
      pathNames,
      drillPathNames,
      value: leaf.value ?? 0,
      x0: leaf.x0,
      y0: leaf.y0 + breadcrumbHeight,
      width,
      height,
      rx: input.borderRadius,
      color,
      opacity: nodeOpacity,
      labelRotation: shouldRotateVertical ? -90 : 0
    };
  });

  const categories = domainKeys.map((key) => ({
    id: key,
    label: key,
    color: ctx.colorScale(key)
  }));

  return {
    tile: tileMethod,
    leavesOnly,
    parentLabelHeight,
    orientLabel,
    colorBy,
    nodeOpacity,
    interactiveDrilldown,
    focusPath,
    isDrilledDown,
    activeRootName: activeRootData.name,
    breadcrumbText,
    breadcrumbHeight,
    parents,
    leaves,
    categories,
    enableLabels: input.enableLabels
  };
}
