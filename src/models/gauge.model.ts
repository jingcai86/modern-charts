import { arc, scaleLinear } from 'd3';
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
  const cy = ctx.innerHeight * 0.58;
  const outerRadius = Math.max(
    48,
    Math.min(ctx.innerWidth / 2, ctx.innerHeight * 0.62) - 16
  );
  const innerRadius = outerRadius * 0.76;

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
