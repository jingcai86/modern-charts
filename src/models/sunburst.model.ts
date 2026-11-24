import {
  arc,
  hierarchy as d3Hierarchy,
  partition as d3Partition,
  type HierarchyRectangularNode
} from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  HierarchyNode,
  SunburstFocusMode,
  SunburstLabelOrientation,
  SunburstSortOrder
} from '../core/types';

function brightenHexColor(input: string, k: number): string {
  const hex = input.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return input;
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits[0] + digits[0] + digits[1] + digits[1] + digits[2] + digits[2];
  }
  const factor = Math.pow(1 / 0.7, k);
  const brightenChannel = (offset: number): string => {
    const raw = parseInt(digits.slice(offset, offset + 2), 16);
    const next = Math.min(255, Math.round(raw === 0 ? 18 * factor : raw * factor));
    return next.toString(16).padStart(2, '0');
  };
  return `#${brightenChannel(0)}${brightenChannel(2)}${brightenChannel(4)}`;
}

export interface ComputedSunburstArcModel {
  index: number;
  totalCount: number;
  name: string;
  breadcrumb: string;
  pathNames: string[];
  pathKey: string;
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
  tangentialRotation: number;
  labelRotation: number;
  sweepAngleDeg: number;
  arcLength: number;
  ringThickness: number;
  hasChildren: boolean;
}

export interface SunburstChartModel {
  cx: number;
  cy: number;
  innerHole: number;
  innerRadius: number;
  padAngle: number;
  startAngle: number;
  endAngle: number;
  sort: SunburstSortOrder;
  inheritColorFromParent: boolean;
  focusMode: SunburstFocusMode;
  labelOrientation: SunburstLabelOrientation;
  minArcAngleForLabel: number;
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
  innerRadius?: number;
  padAngle?: number;
  startAngle?: number;
  endAngle?: number;
  sort?: SunburstSortOrder;
  inheritColorFromParent?: boolean;
  focusMode?: SunburstFocusMode;
  labelOrientation?: SunburstLabelOrientation;
  minArcAngleForLabel?: number;
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

function normalizeUprightAngle(deg: number): number {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return Number(a.toFixed(2));
}

/**
 * Pure Model Layer for `<mc-sunburst-chart>`.
 * Supports `innerRadius`, `padAngle`, `startAngle` / `endAngle`, `sort` (`'desc' | 'asc' | 'none'`),
 * `inheritColorFromParent`, `focusMode` (`'none' | 'ancestor' | 'descendant'`),
 * `labelOrientation` (`'horizontal' | 'radial' | 'tangential'`), and `minArcAngleForLabel`.
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

  const sortOrder: SunburstSortOrder = input.sort ?? 'desc';
  const inheritColorFromParent = input.inheritColorFromParent !== false;
  const focusMode: SunburstFocusMode = input.focusMode ?? 'none';
  const labelOrientation: SunburstLabelOrientation =
    input.labelOrientation ?? 'horizontal';
  const minArcAngleForLabel = Number.isFinite(input.minArcAngleForLabel)
    ? Math.max(0, Number(input.minArcAngleForLabel))
    : 8;

  const startAngle = Number.isFinite(input.startAngle)
    ? Number(input.startAngle)
    : 0;
  const endAngle = Number.isFinite(input.endAngle)
    ? Number(input.endAngle)
    : 360;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const totalSweepRad = endRad - startRad;

  const padAngleDeg = Number.isFinite(input.padAngle)
    ? Math.max(0, Number(input.padAngle))
    : 0.46;
  const padAngleRad = (padAngleDeg * Math.PI) / 180;

  let innerHole = radius * 0.22;
  let resolvedInnerRadius = 0.22;
  if (input.innerRadius !== undefined && Number.isFinite(input.innerRadius)) {
    const ir = Number(input.innerRadius);
    resolvedInnerRadius = ir;
    if (ir >= 0 && ir < 1) {
      innerHole = radius * Math.max(0, Math.min(0.85, ir));
    } else if (ir >= 1) {
      innerHole = Math.max(0, Math.min(radius - 16, ir));
    }
  }

  const hierarchy = d3Hierarchy<HierarchyNode>(activeRootData).sum((d) =>
    d.children && d.children.length > 0
      ? 0
      : Math.max(0, Number(d.value ?? 0))
  );

  if (sortOrder === 'desc') {
    hierarchy.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  } else if (sortOrder === 'asc') {
    hierarchy.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  }

  const partition = d3Partition<HierarchyNode>().size([1, radius]);
  const root = partition(hierarchy);
  const total = root.value || 1;
  const topCategoriesNames = (root.children ?? []).map((c) => c.data.name);
  const allNodeNames = root
    .descendants()
    .filter((d) => d.depth > 0)
    .map((d) => d.data.name);
  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    inheritColorFromParent ? topCategoriesNames : allNodeNames
  );

  const scaleAngle = (t: number) => startRad + t * totalSweepRad;
  const scaleY = (y: number) =>
    innerHole + (y / Math.max(1, radius)) * (radius - innerHole);

  const arcGen = arc<HierarchyRectangularNode<HierarchyNode>>()
    .startAngle((d) => scaleAngle(d.x0))
    .endAngle((d) => scaleAngle(d.x1))
    .padAngle((d) =>
      Math.min(Math.abs(scaleAngle(d.x1) - scaleAngle(d.x0)) / 2, padAngleRad)
    )
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

    let shade: string;
    if (inheritColorFromParent) {
      const baseColor =
        d.data.color ||
        topAncestor.data.color ||
        ctx.colorScale(topAncestor.data.name);
      shade =
        d.depth > 1
          ? brightenHexColor(baseColor, (d.depth - 1) * 0.28)
          : baseColor;
    } else {
      shade = d.data.color || ctx.colorScale(d.data.name);
    }

    const a0 = scaleAngle(d.x0);
    const a1 = scaleAngle(d.x1);
    const midAngle = (a0 + a1) / 2;
    const midR = (scaleY(d.y0) + scaleY(d.y1)) / 2;
    const radialRotation = normalizeUprightAngle(
      (midAngle * 180) / Math.PI - 90
    );
    const tangentialRotation = normalizeUprightAngle(
      (midAngle * 180) / Math.PI
    );
    const labelRotation =
      labelOrientation === 'radial'
        ? radialRotation
        : labelOrientation === 'tangential'
          ? tangentialRotation
          : 0;

    const sweepAngleRad = Math.abs(a1 - a0);
    const sweepAngleDeg = (sweepAngleRad * 180) / Math.PI;

    const ancestors = d
      .ancestors()
      .reverse()
      .slice(1)
      .map((a) => a.data.name);
    const pathNames = [...input.focusPath, ...ancestors];
    const pathKey = pathNames.join('/');
    const breadcrumb = [rawRoot.name || ctx.i18n.messages.root, ...pathNames].join(' › ');

    return {
      index,
      totalCount: descendants.length,
      name: d.data.name,
      breadcrumb,
      pathNames,
      pathKey,
      value: d.value ?? 0,
      percentage: ((d.value ?? 0) / total) * 100,
      depth: d.depth,
      x0: a0,
      x1: a1,
      y0: scaleY(d.y0),
      y1: scaleY(d.y1),
      color: shade,
      pathD: arcGen(d) || '',
      centroid: arcGen.centroid(d),
      rotation: radialRotation,
      tangentialRotation,
      labelRotation,
      sweepAngleDeg,
      arcLength: sweepAngleRad * midR,
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
    innerRadius: resolvedInnerRadius,
    padAngle: padAngleDeg,
    startAngle,
    endAngle,
    sort: sortOrder,
    inheritColorFromParent,
    focusMode,
    labelOrientation,
    minArcAngleForLabel,
    total,
    activeRootName: activeRootData.name,
    isDrilledDown: input.focusPath.length > 0,
    arcs,
    topCategories,
    enableLabels: input.enableLabels,
    interactiveDrilldown: input.interactiveDrilldown
  };
}

/**
 * Computes the set of active arc `pathKey`s when hovering or focusing an arc
 * under `'ancestor'` (hovered arc + all ancestor arcs up to root) or
 * `'descendant'` (hovered arc + all descendant subtree arcs) focusMode.
 */
export function computeSunburstFocusSet(
  model: SunburstChartModel,
  hoveredPathNames: string[],
  mode: SunburstFocusMode = model.focusMode
): Set<string> | null {
  if (!mode || mode === 'none' || hoveredPathNames.length === 0) return null;

  const activePathKeys = new Set<string>();
  if (mode === 'ancestor') {
    // Every prefix of hoveredPathNames is an ancestor
    for (let len = 1; len <= hoveredPathNames.length; len++) {
      activePathKeys.add(hoveredPathNames.slice(0, len).join('/'));
    }
    return activePathKeys;
  }

  // 'descendant': every arc whose pathNames starts with hoveredPathNames
  for (const arcItem of model.arcs) {
    if (arcItem.pathNames.length >= hoveredPathNames.length) {
      let isDescendant = true;
      for (let i = 0; i < hoveredPathNames.length; i++) {
        if (arcItem.pathNames[i] !== hoveredPathNames[i]) {
          isDescendant = false;
          break;
        }
      }
      if (isDescendant) {
        activePathKeys.add(arcItem.pathKey);
      }
    }
  }
  return activePathKeys;
}
