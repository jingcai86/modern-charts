import { arc, pie, type PieArcDatum } from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type { ChartRenderContext, PieDatum } from '../core/types';

export interface ComputedPieArcModel {
  index: number;
  totalCount: number;
  data: PieDatum;
  value: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
  pathD: string;
  hoverPathD: string;
  centroid: [number, number];
  linkPoints: [[number, number], [number, number], [number, number]];
  isRightSide: boolean;
}

export interface PieChartModel {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  total: number;
  arcs: ComputedPieArcModel[];
  enableArcLabels: boolean;
  enableArcLinkLabels: boolean;
  centerLabel?: string;
}

export interface PieModelInput {
  innerRadiusRatio: number;
  cornerRadius: number;
  padAngleDeg?: number;
  enableArcLabels: boolean;
  enableArcLinkLabels: boolean;
  centerLabel?: string;
}

/**
 * Pure Model Layer for `<mc-pie-chart>`.
 */
export function computePieChartModel(
  ctx: ChartRenderContext<PieDatum[]>,
  input: PieModelInput
): PieChartModel {
  const items = Array.isArray(ctx.data) ? ctx.data : [];
  const total =
    items.reduce((acc, d) => acc + Math.max(0, Number(d.value ?? 0)), 0) || 1;
  const cx = ctx.innerWidth / 2;
  const cy = ctx.innerHeight / 2;
  const outerRadius = Math.max(
    30,
    Math.min(ctx.innerWidth, ctx.innerHeight) / 2 - 16
  );
  const innerRadius = outerRadius * input.innerRadiusRatio;
  const padAngle =
    input.padAngleDeg !== undefined
      ? (Number(input.padAngleDeg) * Math.PI) / 180
      : 0.02;

  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    items.map((d) => d.id)
  );

  const pieGen = pie<PieDatum>()
    .value((d) => Math.max(0, Number(d.value ?? 0)))
    .padAngle(padAngle)
    .sort(null);

  const arcGen = arc<PieArcDatum<PieDatum>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(input.cornerRadius);

  const hoverArcGen = arc<PieArcDatum<PieDatum>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius + 7)
    .cornerRadius(input.cornerRadius);

  const linkStartArc = arc<PieArcDatum<PieDatum>>()
    .innerRadius(outerRadius)
    .outerRadius(outerRadius);

  const linkMidArc = arc<PieArcDatum<PieDatum>>()
    .innerRadius(outerRadius + 14)
    .outerRadius(outerRadius + 14);

  const pieArcs = pieGen(items);
  const arcs: ComputedPieArcModel[] = pieArcs.map((a, index) => {
    const midAngle = (a.startAngle + a.endAngle) / 2;
    const isRightSide = midAngle < Math.PI;
    const p0 = linkStartArc.centroid(a);
    const p1 = linkMidArc.centroid(a);
    const p2: [number, number] = [p1[0] + (isRightSide ? 16 : -16), p1[1]];
    return {
      index,
      totalCount: pieArcs.length,
      data: a.data,
      value: Number(a.data.value ?? 0),
      percentage: (Number(a.data.value ?? 0) / total) * 100,
      startAngle: a.startAngle,
      endAngle: a.endAngle,
      midAngle,
      color: a.data.color || ctx.colorScale(a.data.id),
      pathD: arcGen(a) || '',
      hoverPathD: hoverArcGen(a) || '',
      centroid: arcGen.centroid(a),
      linkPoints: [p0, p1, p2],
      isRightSide
    };
  });

  return {
    cx,
    cy,
    outerRadius,
    innerRadius,
    total,
    arcs,
    enableArcLabels: input.enableArcLabels,
    enableArcLinkLabels: input.enableArcLinkLabels,
    centerLabel: input.centerLabel
  };
}
