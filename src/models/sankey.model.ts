import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  SankeyAlign,
  SankeyData,
  SankeyFocusMode
} from '../core/types';

export interface ComputedSankeyNodeModel {
  index: number;
  totalNodes: number;
  id: string;
  name: string;
  color: string;
  column: number;
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  outOffset: number;
  inOffset: number;
  borderRadius: number;
  isVertical: boolean;
}

export interface ComputedSankeyLinkModel {
  index: number;
  totalLinks: number;
  id: string;
  source: ComputedSankeyNodeModel;
  target: ComputedSankeyNodeModel;
  value: number;
  width: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  pathD: string;
  gradientId: string;
  opacity: number;
  curveness: number;
  isVertical: boolean;
}

export interface SankeyChartModel {
  nodes: ComputedSankeyNodeModel[];
  links: ComputedSankeyLinkModel[];
  maxCol: number;
  layout: 'horizontal' | 'vertical';
  align: SankeyAlign;
  nodeBorderRadius: number;
  curveness: number;
  focusMode: SankeyFocusMode;
  enableLabels: boolean;
}

export interface SankeyModelInput {
  nodeWidth: number;
  nodePadding: number;
  linkOpacity: number;
  enableLabels: boolean;
  layout?: 'horizontal' | 'vertical';
  align?: SankeyAlign;
  nodeBorderRadius?: number;
  curveness?: number;
  focusMode?: SankeyFocusMode;
}

/**
 * Pure Model Layer for `<mc-sankey-chart>`.
 * Computes DAG topological column/row ranks with configurable alignment
 * (`'justify' | 'center' | 'start' | 'end' | 'left' | 'right'`),
 * horizontal or vertical node rectangles, and variable-curveness cubic Bezier flow links.
 */
export function computeSankeyChartModel(
  ctx: ChartRenderContext<SankeyData>,
  input: SankeyModelInput
): SankeyChartModel {
  const rawNodes = ctx.data?.nodes ?? [];
  const rawLinks = ctx.data?.links ?? [];
  const { nodeWidth, nodePadding, linkOpacity } = input;
  const layout: 'horizontal' | 'vertical' =
    input.layout === 'vertical' ? 'vertical' : 'horizontal';
  const isVertical = layout === 'vertical';
  const align: SankeyAlign = input.align ?? 'justify';
  const nodeBorderRadius = Math.max(
    0,
    Number.isFinite(input.nodeBorderRadius) ? Number(input.nodeBorderRadius) : 4
  );
  const curveness = Math.max(
    0,
    Math.min(1, Number.isFinite(input.curveness) ? Number(input.curveness) : 0.5)
  );
  const focusMode: SankeyFocusMode = input.focusMode ?? 'adjacency';

  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    rawNodes.map((n) => n.id)
  );

  const nodeMap = new Map<string, ComputedSankeyNodeModel>();
  rawNodes.forEach((n, idx) => {
    nodeMap.set(n.id, {
      index: idx,
      totalNodes: rawNodes.length,
      id: n.id,
      name: n.name || n.id,
      color: n.color || ctx.colorScale(n.id),
      column: 0,
      value: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      outOffset: 0,
      inOffset: 0,
      borderRadius: nodeBorderRadius,
      isVertical
    });
  });

  const outTotals = new Map<string, number>();
  const inTotals = new Map<string, number>();

  rawLinks.forEach((l) => {
    if (!nodeMap.has(l.source)) {
      nodeMap.set(l.source, {
        index: nodeMap.size,
        totalNodes: 0,
        id: l.source,
        name: l.source,
        color: ctx.colorScale(l.source),
        column: 0,
        value: 0,
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 0,
        outOffset: 0,
        inOffset: 0,
        borderRadius: nodeBorderRadius,
        isVertical
      });
    }
    if (!nodeMap.has(l.target)) {
      nodeMap.set(l.target, {
        index: nodeMap.size,
        totalNodes: 0,
        id: l.target,
        name: l.target,
        color: ctx.colorScale(l.target),
        column: 0,
        value: 0,
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 0,
        outOffset: 0,
        inOffset: 0,
        borderRadius: nodeBorderRadius,
        isVertical
      });
    }
    const v = Math.max(0, Number(l.value ?? 0));
    outTotals.set(l.source, (outTotals.get(l.source) ?? 0) + v);
    inTotals.set(l.target, (inTotals.get(l.target) ?? 0) + v);
  });

  // 1. Forward pass: earliest topological stage from sources
  const maxIters = nodeMap.size + 2;
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;
    rawLinks.forEach((l) => {
      const s = nodeMap.get(l.source)!;
      const t = nodeMap.get(l.target)!;
      if (s.id !== t.id && t.column <= s.column) {
        t.column = Math.min(nodeMap.size - 1, s.column + 1);
        changed = true;
      }
    });
    if (!changed) break;
  }

  let maxCol = 0;
  const forwardCols = new Map<string, number>();
  nodeMap.forEach((n) => {
    n.value = Math.max(
      outTotals.get(n.id) ?? 0,
      inTotals.get(n.id) ?? 0,
      1
    );
    forwardCols.set(n.id, n.column);
    if (n.column > maxCol) maxCol = n.column;
  });

  // 2. Reverse pass: longest topological distance to sinks (used for 'end'/'right' and 'center')
  const reverseDist = new Map<string, number>();
  nodeMap.forEach((n) => reverseDist.set(n.id, 0));
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;
    rawLinks.forEach((l) => {
      if (l.source === l.target) return;
      const sForward = forwardCols.get(l.source) ?? 0;
      const tForward = forwardCols.get(l.target) ?? 0;
      // Only propagate along forward DAG edges to stay cycle-safe
      if (tForward <= sForward) return;
      const sRev = reverseDist.get(l.source) ?? 0;
      const tRev = reverseDist.get(l.target) ?? 0;
      if (sRev <= tRev) {
        reverseDist.set(l.source, Math.min(maxCol, tRev + 1));
        changed = true;
      }
    });
    if (!changed) break;
  }

  // 3. Apply stage alignment ('justify' | 'start'/'left' | 'end'/'right' | 'center')
  nodeMap.forEach((n) => {
    const fwd = forwardCols.get(n.id) ?? 0;
    const rev = reverseDist.get(n.id) ?? 0;
    const latest = Math.max(fwd, maxCol - rev);

    if (align === 'start' || align === 'left') {
      n.column = fwd;
    } else if (align === 'end' || align === 'right') {
      n.column = latest;
    } else if (align === 'center') {
      n.column = Math.round((fwd + latest) / 2);
    } else {
      // 'justify' (default): sinks pushed to maxCol
      n.column = (outTotals.get(n.id) ?? 0) === 0 && maxCol > 0 ? maxCol : fwd;
    }
  });

  const columns = new Map<number, ComputedSankeyNodeModel[]>();
  nodeMap.forEach((n) => {
    const list = columns.get(n.column) ?? [];
    list.push(n);
    columns.set(n.column, list);
  });

  const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);
  const stageSpan = isVertical ? ctx.innerHeight : ctx.innerWidth;
  const bandSpan = isVertical ? ctx.innerWidth : ctx.innerHeight;

  const stageGap =
    sortedCols.length > 1
      ? (stageSpan - nodeWidth) / (sortedCols.length - 1)
      : 0;

  let kScale = Infinity;
  sortedCols.forEach((colIdx, cPos) => {
    const colNodes = columns.get(colIdx) ?? [];
    const sumVal = colNodes.reduce((acc, n) => acc + n.value, 0) || 1;
    const availBand = Math.max(
      40,
      bandSpan - Math.max(0, colNodes.length - 1) * nodePadding
    );
    kScale = Math.min(kScale, availBand / sumVal);
    colNodes.forEach((n) => {
      if (isVertical) {
        n.y0 = cPos * stageGap;
        n.y1 = n.y0 + nodeWidth;
      } else {
        n.x0 = cPos * stageGap;
        n.x1 = n.x0 + nodeWidth;
      }
    });
  });
  if (!Number.isFinite(kScale) || kScale <= 0) kScale = 1;

  sortedCols.forEach((colIdx) => {
    const colNodes = columns.get(colIdx) ?? [];
    const totalBand =
      colNodes.reduce((acc, n) => acc + n.value * kScale, 0) +
      Math.max(0, colNodes.length - 1) * nodePadding;
    let cursor = Math.max(0, (bandSpan - totalBand) / 2);

    colNodes.forEach((n) => {
      const span = Math.max(6, n.value * kScale);
      if (isVertical) {
        n.x0 = cursor;
        n.x1 = cursor + span;
      } else {
        n.y0 = cursor;
        n.y1 = cursor + span;
      }
      cursor += span + nodePadding;
    });
  });

  const nodes = Array.from(nodeMap.values()).map((n, index, arr) => ({
    ...n,
    index,
    totalNodes: arr.length
  }));
  const finalNodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Pre-sort outgoing links by target breadth and incoming links by source breadth
  // (D3 sankey ascendingTargetBreadth / ascendingSourceBreadth) to minimize link crossovers.
  const outLinksByNode = new Map<string, number[]>();
  const inLinksByNode = new Map<string, number[]>();
  rawLinks.forEach((l, idx) => {
    const outList = outLinksByNode.get(l.source) ?? [];
    outList.push(idx);
    outLinksByNode.set(l.source, outList);

    const inList = inLinksByNode.get(l.target) ?? [];
    inList.push(idx);
    inLinksByNode.set(l.target, inList);
  });

  const linkWidths = rawLinks.map((l) =>
    Math.max(2, Math.max(0, Number(l.value ?? 0)) * kScale)
  );
  const linkOutOffsets = new Array<number>(rawLinks.length).fill(0);
  const linkInOffsets = new Array<number>(rawLinks.length).fill(0);

  const breadthCoord = (n: ComputedSankeyNodeModel): number =>
    isVertical ? (n.x0 + n.x1) / 2 : (n.y0 + n.y1) / 2;

  outLinksByNode.forEach((indices, nodeId) => {
    const node = finalNodeMap.get(nodeId)!;
    indices.sort((a, b) => {
      const ta = finalNodeMap.get(rawLinks[a].target)!;
      const tb = finalNodeMap.get(rawLinks[b].target)!;
      return breadthCoord(ta) - breadthCoord(tb) || a - b;
    });
    let offset = 0;
    for (const idx of indices) {
      linkOutOffsets[idx] = offset;
      offset += linkWidths[idx];
    }
    node.outOffset = offset;
  });

  inLinksByNode.forEach((indices, nodeId) => {
    const node = finalNodeMap.get(nodeId)!;
    indices.sort((a, b) => {
      const sa = finalNodeMap.get(rawLinks[a].source)!;
      const sb = finalNodeMap.get(rawLinks[b].source)!;
      return breadthCoord(sa) - breadthCoord(sb) || a - b;
    });
    let offset = 0;
    for (const idx of indices) {
      linkInOffsets[idx] = offset;
      offset += linkWidths[idx];
    }
    node.inOffset = offset;
  });

  const links: ComputedSankeyLinkModel[] = rawLinks.map((l, index) => {
    const source = finalNodeMap.get(l.source)!;
    const target = finalNodeMap.get(l.target)!;
    const val = Math.max(0, Number(l.value ?? 0));
    const w = linkWidths[index];
    const outOff = linkOutOffsets[index];
    const inOff = linkInOffsets[index];

    let sx = 0;
    let sy = 0;
    let tx = 0;
    let ty = 0;
    let pathD = '';

    if (isVertical) {
      const sx0 = source.x0 + outOff;
      const sx1 = sx0 + w;
      sx = sx0 + w / 2;

      const tx0 = target.x0 + inOff;
      const tx1 = tx0 + w;
      tx = tx0 + w / 2;

      sy = source.y1;
      ty = target.y0;
      const dy = ty - sy;
      const cy0 = sy + dy * curveness;
      const cy1 = ty - dy * curveness;
      pathD = `M${sx0},${sy} C${sx0},${cy0} ${tx0},${cy1} ${tx0},${ty} L${tx1},${ty} C${tx1},${cy1} ${sx1},${cy0} ${sx1},${sy} Z`;
    } else {
      const sy0 = source.y0 + outOff;
      const sy1 = sy0 + w;
      sy = sy0 + w / 2;

      const ty0 = target.y0 + inOff;
      const ty1 = ty0 + w;
      ty = ty0 + w / 2;

      sx = source.x1;
      tx = target.x0;
      const dx = tx - sx;
      const cx0 = sx + dx * curveness;
      const cx1 = tx - dx * curveness;
      pathD = `M${sx},${sy0} C${cx0},${sy0} ${cx1},${ty0} ${tx},${ty0} L${tx},${ty1} C${cx1},${ty1} ${cx0},${sy1} ${sx},${sy1} Z`;
    }

    return {
      index,
      totalLinks: rawLinks.length,
      id: `sankey-link-${index}`,
      source,
      target,
      value: val,
      width: w,
      sx,
      sy,
      tx,
      ty,
      pathD,
      gradientId: `mc-sankey-grad-${index}`,
      opacity: linkOpacity,
      curveness,
      isVertical
    };
  });

  return {
    nodes,
    links,
    maxCol,
    layout,
    align,
    nodeBorderRadius,
    curveness,
    focusMode,
    enableLabels: input.enableLabels
  };
}

/**
 * Computes the set of active (non-dimmed) node IDs and link IDs when hovering or
 * focusing a Sankey node or link under `'adjacency'` (1-hop) or `'trajectory'`
 * (full upstream ancestor + downstream descendant chain) focus mode.
 */
export function computeSankeyFocusSet(
  model: SankeyChartModel,
  target: { kind: 'node' | 'link'; id: string },
  mode: SankeyFocusMode = model.focusMode
): { activeNodeIds: Set<string>; activeLinkIds: Set<string> } | null {
  if (mode === 'none') return null;

  const activeNodeIds = new Set<string>();
  const activeLinkIds = new Set<string>();

  if (mode === 'adjacency') {
    if (target.kind === 'node') {
      activeNodeIds.add(target.id);
      for (const l of model.links) {
        if (l.source.id === target.id || l.target.id === target.id) {
          activeLinkIds.add(l.id);
          activeNodeIds.add(l.source.id);
          activeNodeIds.add(l.target.id);
        }
      }
    } else {
      const link = model.links.find((l) => l.id === target.id);
      if (link) {
        activeLinkIds.add(link.id);
        activeNodeIds.add(link.source.id);
        activeNodeIds.add(link.target.id);
      }
    }
    return { activeNodeIds, activeLinkIds };
  }

  // 'trajectory' — full upstream + downstream DAG traversal
  const upQueue: string[] = [];
  const downQueue: string[] = [];
  const visitedUp = new Set<string>();
  const visitedDown = new Set<string>();

  if (target.kind === 'node') {
    activeNodeIds.add(target.id);
    upQueue.push(target.id);
    downQueue.push(target.id);
    visitedUp.add(target.id);
    visitedDown.add(target.id);
  } else {
    const link = model.links.find((l) => l.id === target.id);
    if (link) {
      activeLinkIds.add(link.id);
      activeNodeIds.add(link.source.id);
      activeNodeIds.add(link.target.id);
      upQueue.push(link.source.id);
      downQueue.push(link.target.id);
      visitedUp.add(link.source.id);
      visitedDown.add(link.target.id);
    }
  }

  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    for (const l of model.links) {
      if (l.target.id === curr) {
        activeLinkIds.add(l.id);
        activeNodeIds.add(l.source.id);
        if (!visitedUp.has(l.source.id)) {
          visitedUp.add(l.source.id);
          upQueue.push(l.source.id);
        }
      }
    }
  }

  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    for (const l of model.links) {
      if (l.source.id === curr) {
        activeLinkIds.add(l.id);
        activeNodeIds.add(l.target.id);
        if (!visitedDown.has(l.target.id)) {
          visitedDown.add(l.target.id);
          downQueue.push(l.target.id);
        }
      }
    }
  }

  return { activeNodeIds, activeLinkIds };
}
