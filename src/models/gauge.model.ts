import { arc } from 'd3';
import { scaleLinear } from '../core/scales';
import type {
  ChartRenderContext,
  GaugeBand,
  GaugeDataInput,
  GaugeDatum,
  GaugePointerType
} from '../core/types';

export interface GaugeArcGeometry {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  cornerRadius: number;
}

const gaugeArc = arc<GaugeArcGeometry>().cornerRadius((geometry) => geometry.cornerRadius);

export function gaugeArcPath(geometry: GaugeArcGeometry): string {
  return gaugeArc(geometry) ?? '';
}

export function gaugeTrianglePoints(cos: number, sin: number, length: number, width: number): string {
  const perpX = -sin * width;
  const perpY = cos * width;
  const tail = Math.min(12, width * 2.4);
  return [
    `${(cos * length).toFixed(2)},${(sin * length).toFixed(2)}`,
    `${perpX.toFixed(2)},${perpY.toFixed(2)}`,
    `${(-cos * tail).toFixed(2)},${(-sin * tail).toFixed(2)}`,
    `${(-perpX).toFixed(2)},${(-perpY).toFixed(2)}`
  ].join(' ');
}

export interface ComputedGaugeBandModel {
  band: GaugeBand;
  pathD: string;
}

export interface ComputedGaugeTickLineModel {
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ComputedGaugeTickModel extends ComputedGaugeTickLineModel {
  value: number;
  x: number;
  y: number;
}

export interface ComputedGaugeSeriesModel {
  index: number;
  totalCount: number;
  datum: GaugeDatum;
  value: number;
  min: number;
  max: number;
  unit: string;
  label?: string;
  color: string;
  ringInnerRadius: number;
  ringOuterRadius: number;
  trackPathD: string;
  valueArcPathD: string;
  angleRad: number;
  needleX2: number;
  needleY2: number;
  trianglePoints: string;
  pinCx: number;
  pinCy: number;
  pinRadius: number;
}

export interface GaugeChartModel {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  cornerRadius: number;
  startAngleDeg: number;
  endAngleDeg: number;
  splitNumber: number;
  minorSplitNumber: number;
  pointerType: GaugePointerType;
  pointerLength: number;
  pointerWidth: number;
  enableLabels: boolean;
  bandOuterRadius: number;
  arcBottomY: number;
  valueY: number;
  subtitleY: number;
  min: number;
  max: number;
  value: number;
  unit: string;
  label?: string;
  trackPathD: string;
  valueArcPathD: string;
  bands: ComputedGaugeBandModel[];
  ticks: ComputedGaugeTickModel[];
  minorTicks: ComputedGaugeTickLineModel[];
  needleX2: number;
  needleY2: number;
  datum: GaugeDatum;
  series: ComputedGaugeSeriesModel[];
}

export interface GaugeModelInput {
  min?: number;
  max?: number;
  unit?: string;
  centerLabel?: string;
  enableLabels?: boolean;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
  cornerRadius?: number;
  splitNumber?: number;
  minorSplitNumber?: number;
  pointerType?: GaugePointerType;
  pointerLength?: number;
  pointerWidth?: number;
}

/**
 * Pure Model Layer for `<mc-gauge-chart>`.
 * Supports custom start/end sweep angles (`startAngle`, `endAngle`), `innerRadius`,
 * `cornerRadius`, major & minor graduation ticks (`splitNumber`, `minorSplitNumber`),
 * pointer styles (`pointerType: 'needle' | 'triangle' | 'pin' | 'none'`, `pointerLength`, `pointerWidth`),
 * and single or multi-series `GaugeDatum | GaugeDatum[]` concentric rings.
 */
export function computeGaugeChartModel(
  ctx: ChartRenderContext<GaugeDataInput>,
  input: GaugeModelInput
): GaugeChartModel {
  const rawData = ctx.data;
  const items: GaugeDatum[] = Array.isArray(rawData)
    ? rawData.length > 0
      ? rawData
      : [{ value: 0, min: 0, max: 100 }]
    : [rawData ?? { value: 0, min: 0, max: 100 }];

  const primaryDatum: GaugeDatum = items[0];
  const min = Number(input.min ?? primaryDatum.min ?? 0);
  const max = Number(input.max ?? primaryDatum.max ?? 100);
  const safeMax = max > min ? max : min + 100;
  const unit = input.unit ?? primaryDatum.unit ?? '';
  const primaryLabel =
    input.centerLabel !== undefined ? input.centerLabel : primaryDatum.label;
  const enableLabels = input.enableLabels !== false;

  const startAngleDeg = Number.isFinite(input.startAngle)
    ? Number(input.startAngle)
    : -135;
  const endAngleDeg = Number.isFinite(input.endAngle)
    ? Number(input.endAngle)
    : 135;
  const startAngle = (startAngleDeg * Math.PI) / 180;
  const endAngle = (endAngleDeg * Math.PI) / 180;

  const angleScale = scaleLinear()
    .domain([min, safeMax])
    .range([startAngle, endAngle])
    .clamp(true);

  const cx = ctx.innerWidth / 2;
  const hasBands = (primaryDatum.bands?.length ?? 0) > 0;
  const bandPad = hasBands ? 8 : 0;
  const hasLabel =
    enableLabels && Boolean(primaryLabel && String(primaryLabel).trim().length > 0);
  const subtitleFontSize = Math.max(10, ctx.theme.fontSize);
  const subtitleGap = hasLabel ? 12 : 0;
  const subtitleReserve = hasLabel ? subtitleGap + subtitleFontSize * 1.35 : 0;

  // Compute vertical extent ratio of the configured angular sweep
  const minSweepA = Math.min(startAngle, endAngle);
  const maxSweepA = Math.max(startAngle, endAngle);
  let maxBottomRatio = Math.max(
    0.25,
    Math.sin(startAngle - Math.PI / 2),
    Math.sin(endAngle - Math.PI / 2)
  );
  // If sweep crosses 6 o'clock (π radians in 12-o'clock-based D3 arc coordinates)
  for (let k = -2; k <= 2; k++) {
    const bottomAngle = Math.PI + k * 2 * Math.PI;
    if (bottomAngle >= minSweepA && bottomAngle <= maxSweepA) {
      maxBottomRatio = 1;
      break;
    }
  }

  const maxOuterByWidth = ctx.innerWidth / 2 - bandPad - 6;
  const maxOuterByHeight =
    (ctx.innerHeight - subtitleReserve - 8) / (1 + maxBottomRatio) - bandPad;
  const outerRadius = Math.max(
    40,
    Math.min(maxOuterByWidth, maxOuterByHeight)
  );

  let innerRadius = outerRadius * 0.76;
  if (input.innerRadius !== undefined && Number.isFinite(input.innerRadius)) {
    const ir = Number(input.innerRadius);
    if (ir > 0 && ir < 1) {
      innerRadius = outerRadius * Math.max(0.2, Math.min(0.95, ir));
    } else if (ir >= 1) {
      innerRadius = Math.max(12, Math.min(outerRadius - 6, ir));
    }
  }

  const cornerRadius = Math.max(
    0,
    Number.isFinite(input.cornerRadius) ? Number(input.cornerRadius) : 8
  );
  const splitNumber = Math.max(
    0,
    Math.round(Number.isFinite(input.splitNumber) ? Number(input.splitNumber) : 5)
  );
  const minorSplitNumber = Math.max(
    0,
    Math.round(
      Number.isFinite(input.minorSplitNumber) ? Number(input.minorSplitNumber) : 4
    )
  );
  const pointerType: GaugePointerType = input.pointerType ?? 'needle';
  const pointerLength = Math.max(
    0.1,
    Math.min(
      1.2,
      Number.isFinite(input.pointerLength) ? Number(input.pointerLength) : 0.88
    )
  );
  const pointerWidth = Math.max(
    1,
    Number.isFinite(input.pointerWidth) ? Number(input.pointerWidth) : 2.5
  );

  const bandOuterRadius = outerRadius + bandPad;
  const arcBottomY = bandOuterRadius * maxBottomRatio;

  const totalHeight = bandOuterRadius + arcBottomY + subtitleReserve;
  const topOffset = Math.max(4, (ctx.innerHeight - totalHeight) / 2);
  const cy = topOffset + bandOuterRadius;

  const valueFontSize = Math.min(
    ctx.theme.fontSize + 8,
    Math.max(14, Math.round(outerRadius * 0.24))
  );
  const valueY = Math.max(20, outerRadius * 0.44);
  const subtitleY = Math.max(
    arcBottomY + subtitleGap + subtitleFontSize * 0.5,
    valueY + valueFontSize * 0.75 + subtitleFontSize * 0.65
  );

  // Build series rings & pointers (supports 1 or multiple concentric GaugeDatum items)
  const ringCount = items.length;
  const totalRingThickness = Math.max(8, outerRadius - innerRadius);
  const ringGap = ringCount > 1 ? Math.min(3, totalRingThickness * 0.12) : 0;
  const singleRingThickness =
    (totalRingThickness - ringGap * (ringCount - 1)) / ringCount;

  const series: ComputedGaugeSeriesModel[] = items.map((d, idx) => {
    const itemMin = Number(d.min ?? min);
    const itemMax = Number(d.max ?? safeMax);
    const itemSafeMax = itemMax > itemMin ? itemMax : itemMin + 100;
    const itemUnit = d.unit ?? unit;
    const itemVal = Math.min(
      itemSafeMax,
      Math.max(itemMin, Number(d.value ?? 0))
    );
    const itemColor =
      d.color || ctx.theme.colors[idx % ctx.theme.colors.length] || '#6366f1';

    const ringOuterRadius =
      outerRadius - idx * (singleRingThickness + ringGap);
    const ringInnerRadius = Math.max(8, ringOuterRadius - singleRingThickness);

    const itemScale =
      itemMin === min && itemSafeMax === safeMax
        ? angleScale
        : scaleLinear()
            .domain([itemMin, itemSafeMax])
            .range([startAngle, endAngle])
            .clamp(true);

    const geometry = { startAngle, endAngle, innerRadius: ringInnerRadius, outerRadius: ringOuterRadius, cornerRadius };
    const valueAngle = itemScale(itemVal);
    const angleRad = valueAngle - Math.PI / 2;
    const needleLen = innerRadius * pointerLength;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // Rim pin coordinates centered on the series ring
    const midR = (ringInnerRadius + ringOuterRadius) / 2;
    const pinRadius = Math.max(4, singleRingThickness * 0.52);

    return {
      index: idx,
      totalCount: ringCount,
      datum: d,
      value: itemVal,
      min: itemMin,
      max: itemSafeMax,
      unit: itemUnit,
      label: idx === 0 ? primaryLabel : d.label,
      color: itemColor,
      ringInnerRadius,
      ringOuterRadius,
      trackPathD: gaugeArcPath(geometry),
      valueArcPathD: gaugeArcPath({ ...geometry, endAngle: valueAngle }),
      angleRad,
      needleX2: cos * needleLen,
      needleY2: sin * needleLen,
      trianglePoints: gaugeTrianglePoints(cos, sin, needleLen, pointerWidth),
      pinCx: cos * midR,
      pinCy: sin * midR,
      pinRadius
    };
  });

  const primarySeries = series[0];

  const bands: ComputedGaugeBandModel[] = (primaryDatum.bands ?? []).map((band) => ({
    band,
    pathD: gaugeArcPath({
      innerRadius: outerRadius + 3,
      outerRadius: outerRadius + 8,
      startAngle: angleScale(band.from),
      endAngle: angleScale(band.to),
      cornerRadius: 3
    })
  }));

  const innermostRadius = series[series.length - 1].ringInnerRadius;
  const tickOuterR = innermostRadius - 2;
  const majorTickInnerR = innermostRadius - 9;
  const minorTickInnerR = innermostRadius - 5.5;
  const labelR = innermostRadius - 20;

  const ticks: ComputedGaugeTickModel[] = [];
  const minorTicks: ComputedGaugeTickLineModel[] = [];

  if (splitNumber > 0) {
    for (let i = 0; i <= splitNumber; i++) {
      const rawTickVal = min + (i / splitNumber) * (safeMax - min);
      const tickVal = Number(rawTickVal.toFixed(2));
      const a = angleScale(tickVal) - Math.PI / 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ticks.push({
        index: i,
        value: tickVal,
        x: cos * labelR,
        y: sin * labelR,
        x1: cos * tickOuterR,
        y1: sin * tickOuterR,
        x2: cos * majorTickInnerR,
        y2: sin * majorTickInnerR
      });

      if (i < splitNumber && minorSplitNumber > 1) {
        const nextTickVal = min + ((i + 1) / splitNumber) * (safeMax - min);
        for (let m = 1; m < minorSplitNumber; m++) {
          const minorVal =
            rawTickVal + (m / minorSplitNumber) * (nextTickVal - rawTickVal);
          const ma = angleScale(minorVal) - Math.PI / 2;
          const mCos = Math.cos(ma);
          const mSin = Math.sin(ma);
          minorTicks.push({
            index: minorTicks.length,
            x1: mCos * tickOuterR,
            y1: mSin * tickOuterR,
            x2: mCos * minorTickInnerR,
            y2: mSin * minorTickInnerR
          });
        }
      }
    }
  }

  return {
    cx,
    cy,
    outerRadius,
    innerRadius,
    cornerRadius,
    startAngleDeg,
    endAngleDeg,
    splitNumber,
    minorSplitNumber,
    pointerType,
    pointerLength,
    pointerWidth,
    enableLabels,
    bandOuterRadius,
    arcBottomY,
    valueY,
    subtitleY,
    min,
    max: safeMax,
    value: primarySeries.value,
    unit,
    label: primaryLabel,
    trackPathD: primarySeries.trackPathD,
    valueArcPathD: primarySeries.valueArcPathD,
    bands,
    ticks,
    minorTicks,
    needleX2: primarySeries.needleX2,
    needleY2: primarySeries.needleY2,
    datum: primaryDatum,
    series
  };
}
