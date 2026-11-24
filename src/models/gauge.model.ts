import { arc } from 'd3';
import { scaleLinear } from '../core/scales';
import type { ChartRenderContext, GaugeBand, GaugeDatum } from '../core/types';

export interface ComputedGaugeBandModel {
  band: GaugeBand;
  pathD: string;
}

export interface ComputedGaugeTickModel {
  index: number;
  value: number;
  x: number;
  y: number;
}

export interface GaugeChartModel {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
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
  needleX2: number;
  needleY2: number;
  datum: GaugeDatum;
}

export interface GaugeModelInput {
  min?: number;
  max?: number;
  unit?: string;
}

/**
 * Pure Model Layer for `<mc-gauge-chart>`.
 */
export function computeGaugeChartModel(
  ctx: ChartRenderContext<GaugeDatum>,
  input: GaugeModelInput
): GaugeChartModel {
  const datum: GaugeDatum = ctx.data ?? { value: 0, min: 0, max: 100 };
  const min = input.min ?? datum.min ?? 0;
  const max = input.max ?? datum.max ?? 100;
  const unit = input.unit ?? datum.unit ?? '';
  const value = Math.min(max, Math.max(min, Number(datum.value ?? 0)));

  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  const angleScale = scaleLinear()
    .domain([min, max])
    .range([startAngle, endAngle])
    .clamp(true);

  const cx = ctx.innerWidth / 2;
  const hasBands = (datum.bands?.length ?? 0) > 0;
  const bandPad = hasBands ? 8 : 0;
  const hasLabel = Boolean(datum.label && String(datum.label).trim().length > 0);
  const subtitleFontSize = Math.max(10, ctx.theme.fontSize);
  const subtitleGap = hasLabel ? 12 : 0;
  const subtitleReserve = hasLabel ? subtitleGap + subtitleFontSize * 1.35 : 0;

  const maxOuterByWidth = ctx.innerWidth / 2 - bandPad - 6;
  const maxOuterByHeight =
    (ctx.innerHeight - subtitleReserve - 8) / (1 + Math.SQRT1_2) - bandPad;
  const outerRadius = Math.max(
    40,
    Math.min(maxOuterByWidth, maxOuterByHeight)
  );
  const innerRadius = outerRadius * 0.76;
  const bandOuterRadius = outerRadius + bandPad;
  const arcBottomY = bandOuterRadius * Math.SQRT1_2;

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

  const trackArcGen = arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(startAngle)
    .endAngle(endAngle)
    .cornerRadius(8);

  const valueArcGen = arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(startAngle)
    .endAngle(angleScale(value))
    .cornerRadius(8);

  const bands: ComputedGaugeBandModel[] = (datum.bands ?? []).map((band) => {
    const bandArcGen = arc()
      .innerRadius(outerRadius + 3)
      .outerRadius(outerRadius + 8)
      .startAngle(angleScale(band.from))
      .endAngle(angleScale(band.to))
      .cornerRadius(3);
    return {
      band,
      pathD: bandArcGen({} as any) || ''
    };
  });

  const labelR = innerRadius - 16;
  const ticks: ComputedGaugeTickModel[] = angleScale
    .ticks(5)
    .map((tick: number, index: number) => {
      const a = angleScale(tick) - Math.PI / 2;
      return {
        index,
        value: tick,
        x: Math.cos(a) * labelR,
        y: Math.sin(a) * labelR
      };
    });

  const angleRad = angleScale(value) - Math.PI / 2;
  const needleLen = innerRadius - 6;

  return {
    cx,
    cy,
    outerRadius,
    innerRadius,
    bandOuterRadius,
    arcBottomY,
    valueY,
    subtitleY,
    min,
    max,
    value,
    unit,
    label: datum.label,
    trackPathD: trackArcGen({} as any) || '',
    valueArcPathD: valueArcGen({} as any) || '',
    bands,
    ticks,
    needleX2: Math.cos(angleRad) * needleLen,
    needleY2: Math.sin(angleRad) * needleLen,
    datum
  };
}
