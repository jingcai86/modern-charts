import { createOrdinalColorScale } from '../core/theme';
import type { ChartRenderContext, SankeyData } from '../core/types';

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
}

export interface ComputedSankeyLinkModel {
  index: number;
  totalLinks: number;
  id: string;
  source: ComputedSankeyNodeModel;
  target: ComputedSankeyNodeModel;
  value: number;
  width: number;
  sy: number;
  ty: number;
  pathD: string;
  gradientId: string;
  opacity: number;
}

export interface SankeyChartModel {
  nodes: ComputedSankeyNodeModel[];
  links: ComputedSankeyLinkModel[];
  maxCol: number;
  enableLabels: boolean;
}

export interface SankeyModelInput {
  nodeWidth: number;
  nodePadding: number;
  linkOpacity: number;
  enableLabels: boolean;
}

/**
 * Pure Model Layer for `<mc-sankey-chart>`.
 * Computes DAG topological column ranks, node rectangles, and cubic Bezier flow link paths.
 */
export function computeSankeyChartModel(
  ctx: ChartRenderContext<SankeyData>,
  input: SankeyModelInput
): SankeyChartModel {
  const rawNodes = ctx.data?.nodes ?? [];
  const rawLinks = ctx.data?.links ?? [];
  const { nodeWidth, nodePadding, linkOpacity } = input;

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
      inOffset: 0
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
        inOffset: 0
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
        inOffset: 0
      });
    }
    const v = Math.max(0, Number(l.value ?? 0));
    outTotals.set(l.source, (outTotals.get(l.source) ?? 0) + v);
    inTotals.set(l.target, (inTotals.get(l.target) ?? 0) + v);
  });

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
  nodeMap.forEach((n) => {
    n.value = Math.max(
      outTotals.get(n.id) ?? 0,
      inTotals.get(n.id) ?? 0,
      1
    );
    if (n.column > maxCol) maxCol = n.column;
  });

  nodeMap.forEach((n) => {
    if ((outTotals.get(n.id) ?? 0) === 0 && maxCol > 0) {
      n.column = maxCol;
    }
  });

  const columns = new Map<number, ComputedSankeyNodeModel[]>();
  nodeMap.forEach((n) => {
    const list = columns.get(n.column) ?? [];
    list.push(n);
    columns.set(n.column, list);
  });

  const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);
  const colGap =
    sortedCols.length > 1
      ? (ctx.innerWidth - nodeWidth) / (sortedCols.length - 1)
      : 0;

  let ky = Infinity;
  sortedCols.forEach((colIdx, cPos) => {
    const colNodes = columns.get(colIdx) ?? [];
    const sumVal = colNodes.reduce((acc, n) => acc + n.value, 0) || 1;
    const availH = Math.max(
      40,
      ctx.innerHeight - Math.max(0, colNodes.length - 1) * nodePadding
    );
    ky = Math.min(ky, availH / sumVal);
    colNodes.forEach((n) => {
      n.x0 = cPos * colGap;
      n.x1 = n.x0 + nodeWidth;
    });
  });
  if (!Number.isFinite(ky) || ky <= 0) ky = 1;

  sortedCols.forEach((colIdx) => {
    const colNodes = columns.get(colIdx) ?? [];
    const totalH =
      colNodes.reduce((acc, n) => acc + n.value * ky, 0) +
      Math.max(0, colNodes.length - 1) * nodePadding;
    let cursorY = Math.max(0, (ctx.innerHeight - totalH) / 2);

    colNodes.forEach((n) => {
      const h = Math.max(6, n.value * ky);
      n.y0 = cursorY;
      n.y1 = cursorY + h;
      cursorY += h + nodePadding;
    });
  });

  const nodes = Array.from(nodeMap.values()).map((n, index, arr) => ({
    ...n,
    index,
    totalNodes: arr.length
  }));
  const finalNodeMap = new Map(nodes.map((n) => [n.id, n]));

  const links: ComputedSankeyLinkModel[] = rawLinks.map((l, index) => {
    const source = finalNodeMap.get(l.source)!;
    const target = finalNodeMap.get(l.target)!;
    const val = Math.max(0, Number(l.value ?? 0));
    const w = Math.max(2, val * ky);

    const sy = source.y0 + source.outOffset + w / 2;
    source.outOffset += w;

    const ty = target.y0 + target.inOffset + w / 2;
    target.inOffset += w;

    const x0 = source.x1;
    const x1 = target.x0;
    const mx = (x0 + x1) / 2;
    const pathD = `M${x0},${sy} C${mx},${sy} ${mx},${ty} ${x1},${ty}`;

    return {
      index,
      totalLinks: rawLinks.length,
      id: `sankey-link-${index}`,
      source,
      target,
      value: val,
      width: w,
      sy,
      ty,
      pathD,
      gradientId: `mc-sankey-grad-${index}`,
      opacity: linkOpacity
    };
  });

  return {
    nodes,
    links,
    maxCol,
    enableLabels: input.enableLabels
  };
}
