import { arc, pie, type DefaultArcObject, type PieArcDatum } from 'd3';
import { createOrdinalColorScale } from '../core/theme';
import type {
  ChartRenderContext,
  PieDatum,
  PieRoseType,
  SunburstSortOrder
} from '../core/types';

export interface PieArcGeometry extends DefaultArcObject {
  cornerRadius: number;
  padAngle: number;
}

const sliceShape = arc<PieArcGeometry>().cornerRadius((geometry) => geometry.cornerRadius);

export function pieArcPath(geometry: PieArcGeometry): string {
  return sliceShape(geometry) ?? '';
}

export interface ComputedPieArcModel {
  index: number;
  totalCount: number;
  data: PieDatum;
  value: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  sliceOuterRadius: number;
  geometry: PieArcGeometry;
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
  startAngle: number;
  endAngle: number;
  sort: SunburstSortOrder;
  roseType: PieRoseType;
  activeOuterRadiusOffset: number;
  minAngle: number;
  arcLinkLabelsSkipAngle: number;
  arcLinkLabelsDiagonalLength: number;
  arcLinkLabelsStraightLength: number;
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
  startAngle?: number;
  endAngle?: number;
  sort?: SunburstSortOrder;
  roseType?: PieRoseType;
  activeOuterRadiusOffset?: number;
  minAngle?: number;
  arcLinkLabelsSkipAngle?: number;
  arcLinkLabelsDiagonalLength?: number;
  arcLinkLabelsStraightLength?: number;
  enableArcLabels: boolean;
  enableArcLinkLabels: boolean;
  centerLabel?: string;
}

/**
 * Pure Model Layer for `<mc-pie-chart>`.
 * Supports `startAngle` / `endAngle` sweeps, `sort` (`'none' | 'desc' | 'asc'`),
 * `roseType` (`'none' | 'radius' | 'area'` Nightingale Rose diagram),
 * `activeOuterRadiusOffset`, `minAngle`, and `arcLinkLabels*` leader-line geometry.
 */
export function computePieChartModel(
  ctx: ChartRenderContext<PieDatum[]>,
  input: PieModelInput
): PieChartModel {
  const items = Array.isArray(ctx.data) ? ctx.data : [];
  const values = items.map((d) => Math.max(0, Number(d.value ?? 0)));
  const total = values.reduce((acc, v) => acc + v, 0) || 1;
  const maxVal = values.length > 0 ? Math.max(...values, 1) : 1;

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

  const startAngleDeg = Number.isFinite(input.startAngle)
    ? Number(input.startAngle)
    : 0;
  const endAngleDeg = Number.isFinite(input.endAngle)
    ? Number(input.endAngle)
    : 360;
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;

  const sortOrder: SunburstSortOrder = input.sort ?? 'none';
  const roseType: PieRoseType = input.roseType ?? 'none';
  const activeOuterRadiusOffset = Number.isFinite(input.activeOuterRadiusOffset)
    ? Math.max(0, Number(input.activeOuterRadiusOffset))
    : 7;
  const minAngleDeg = Number.isFinite(input.minAngle)
    ? Math.max(0, Number(input.minAngle))
    : 0;
  const minAngleRad = (minAngleDeg * Math.PI) / 180;

  const arcLinkLabelsSkipAngle = Number.isFinite(input.arcLinkLabelsSkipAngle)
    ? Math.max(0, Number(input.arcLinkLabelsSkipAngle))
    : 8;
  const arcLinkLabelsDiagonalLength = Number.isFinite(
    input.arcLinkLabelsDiagonalLength
  )
    ? Math.max(2, Number(input.arcLinkLabelsDiagonalLength))
    : 14;
  const arcLinkLabelsStraightLength = Number.isFinite(
    input.arcLinkLabelsStraightLength
  )
    ? Math.max(2, Number(input.arcLinkLabelsStraightLength))
    : 16;

  ctx.colorScale = createOrdinalColorScale(
    ctx.theme,
    items.map((d) => d.id)
  );

  const pieGen = pie<PieDatum>()
    .value((d) => Math.max(0, Number(d.value ?? 0)))
    .startAngle(startRad)
    .endAngle(endRad)
    .padAngle(padAngle);

  if (sortOrder === 'desc') {
    pieGen.sortValues((a, b) => b - a);
  } else if (sortOrder === 'asc') {
    pieGen.sortValues((a, b) => a - b);
  } else {
    pieGen.sort(null);
  }

  const rawPieArcs = pieGen(items);

  // Enforce minAngle on non-zero slices when configured
  if (minAngleRad > 0 && rawPieArcs.length > 0) {
    const totalSweep = Math.abs(endRad - startRad);
    const dir = endRad >= startRad ? 1 : -1;
    const clampedMin = Math.min(minAngleRad, totalSweep / rawPieArcs.length);
    const spans = rawPieArcs.map((a) => Math.abs(a.endAngle - a.startAngle));
    let deficit = 0;
    let surplusTotal = 0;
    spans.forEach((sp, idx) => {
      const v = Math.max(0, Number(rawPieArcs[idx].data.value ?? 0));
      if (v > 0 && sp < clampedMin) {
        deficit += clampedMin - sp;
        spans[idx] = clampedMin;
      } else if (sp > clampedMin) {
        surplusTotal += sp - clampedMin;
      }
    });
    if (deficit > 0 && surplusTotal > 0) {
      spans.forEach((sp, idx) => {
        if (sp > clampedMin) {
          const share = (sp - clampedMin) / surplusTotal;
          spans[idx] = Math.max(clampedMin, sp - deficit * share);
        }
      });
    }
    let cursor = startRad;
    rawPieArcs.forEach((a, idx) => {
      a.startAngle = cursor;
      a.endAngle = cursor + dir * spans[idx];
      cursor = a.endAngle;
    });
  }

  const arcs: ComputedPieArcModel[] = rawPieArcs.map((a, index) => {
    const val = Math.max(0, Number(a.data.value ?? 0));
    let sliceOuterRadius = outerRadius;
    if (roseType === 'radius') {
      sliceOuterRadius =
        innerRadius +
        (outerRadius - innerRadius) * Math.max(0.18, val / maxVal);
    } else if (roseType === 'area') {
      sliceOuterRadius = Math.sqrt(
        innerRadius * innerRadius +
          (outerRadius * outerRadius - innerRadius * innerRadius) *
            Math.max(0.08, val / maxVal)
      );
    }

    const geometry: PieArcGeometry = {
      startAngle: a.startAngle,
      endAngle: a.endAngle,
      padAngle: a.padAngle,
      innerRadius,
      outerRadius: sliceOuterRadius,
      cornerRadius: input.cornerRadius
    };

    const linkStartArc = arc<PieArcDatum<PieDatum>>()
      .innerRadius(sliceOuterRadius)
      .outerRadius(sliceOuterRadius);

    const linkMidArc = arc<PieArcDatum<PieDatum>>()
      .innerRadius(sliceOuterRadius + arcLinkLabelsDiagonalLength)
      .outerRadius(sliceOuterRadius + arcLinkLabelsDiagonalLength);

    const midAngle = (a.startAngle + a.endAngle) / 2;
    const isRightSide = Math.sin(midAngle) >= -1e-6;
    const p0 = linkStartArc.centroid(a);
    const p1 = linkMidArc.centroid(a);
    const p2: [number, number] = [
      p1[0] +
        (isRightSide
          ? arcLinkLabelsStraightLength
          : -arcLinkLabelsStraightLength),
      p1[1]
    ];

    return {
      index,
      totalCount: rawPieArcs.length,
      data: a.data,
      value: val,
      percentage: (val / total) * 100,
      startAngle: a.startAngle,
      endAngle: a.endAngle,
      midAngle,
      sliceOuterRadius,
      geometry,
      color: a.data.color || ctx.colorScale(a.data.id),
      pathD: pieArcPath(geometry),
      hoverPathD: pieArcPath({ ...geometry, outerRadius: sliceOuterRadius + activeOuterRadiusOffset }),
      centroid: sliceShape.centroid(geometry),
      linkPoints: [p0, p1, p2],
      isRightSide
    };
  });

  return {
    cx,
    cy,
    outerRadius,
    innerRadius,
    startAngle: startAngleDeg,
    endAngle: endAngleDeg,
    sort: sortOrder,
    roseType,
    activeOuterRadiusOffset,
    minAngle: minAngleDeg,
    arcLinkLabelsSkipAngle,
    arcLinkLabelsDiagonalLength,
    arcLinkLabelsStraightLength,
    total,
    arcs,
    enableArcLabels: input.enableArcLabels,
    enableArcLinkLabels: input.enableArcLinkLabels,
    centerLabel: input.centerLabel
  };
}
