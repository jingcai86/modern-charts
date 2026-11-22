import {
  extent,
  format,
  scaleBand,
  scaleLinear,
  scaleLog,
  scalePoint,
  scaleSqrt,
  scaleSymlog,
  scaleTime,
  timeFormat,
  type ScaleContinuousNumeric
} from 'd3';
import { renderUnifiedLegendLayer } from './legend-engine';
import type {
  ChartRenderContext,
  LegendItem,
  LegendPosition,
  ScaleAxisConfig,
  ScaleConfig
} from './types';

export type { LegendItem };

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createDefaultScaleConfig(
  xType: ScaleAxisConfig['type'] = 'point',
  yType: ScaleAxisConfig['type'] = 'linear'
): ScaleConfig {
  return {
    x: {
      type: xType,
      min: 'auto',
      max: 'auto',
      padding: 0.25,
      nice: true
    },
    y: {
      type: yType,
      min: 'auto',
      max: 'auto',
      stacked: false,
      nice: true
    }
  };
}

export function buildAxisScale(
  config: ScaleAxisConfig,
  domainValues: any[],
  range: [number, number]
): any {
  const effectiveRange: [number, number] = config.reverse
    ? [range[1], range[0]]
    : range;

  if (config.type === 'point') {
    const unique = Array.from(new Set(domainValues.map((v) => String(v))));
    return scalePoint<string>()
      .domain(unique)
      .range(effectiveRange)
      .padding(config.padding ?? 0.5);
  }

  if (config.type === 'band') {
    const unique = Array.from(new Set(domainValues.map((v) => String(v))));
    return scaleBand<string>()
      .domain(unique)
      .range(effectiveRange)
      .paddingInner(config.innerPadding ?? config.padding ?? 0.25)
      .paddingOuter(config.outerPadding ?? (config.padding ?? 0.25) / 2);
  }

  if (config.type === 'time') {
    const dates = domainValues.map((d) => (d instanceof Date ? d : new Date(d)));
    const dateExtent = extent(dates) as [Date, Date];
    const scale = scaleTime()
      .domain(
        dateExtent[0] && dateExtent[1] ? dateExtent : [new Date(0), new Date()]
      )
      .range(effectiveRange);
    if (config.nice !== false) scale.nice();
    return scale;
  }

  const nums = domainValues
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  const rawMin = nums.length > 0 ? Math.min(...nums) : 0;
  const rawMax = nums.length > 0 ? Math.max(...nums) : 100;

  const minVal =
    config.min !== undefined && config.min !== 'auto'
      ? Number(config.min)
      : rawMin;
  const maxVal =
    config.max !== undefined && config.max !== 'auto'
      ? Number(config.max)
      : rawMax === minVal
      ? minVal + 10
      : rawMax;

  let scale: ScaleContinuousNumeric<number, number>;
  if (config.type === 'log') {
    const safeMin = minVal <= 0 ? 1 : minVal;
    const safeMax = maxVal <= safeMin ? safeMin * 10 : maxVal;
    scale = scaleLog()
      .base(config.base ?? 10)
      .domain([safeMin, safeMax])
      .range(effectiveRange);
  } else if (config.type === 'symlog') {
    scale = scaleSymlog()
      .constant(config.constant ?? 1)
      .domain([minVal, maxVal])
      .range(effectiveRange);
  } else if (config.type === 'sqrt') {
    scale = scaleSqrt().domain([minVal, maxVal]).range(effectiveRange);
  } else {
    scale = scaleLinear().domain([minVal, maxVal]).range(effectiveRange);
  }

  if (config.nice !== false && typeof scale.nice === 'function') {
    scale.nice();
  }
  if (config.clamp && typeof scale.clamp === 'function') {
    scale.clamp(true);
  }
  return scale;
}

export function getScaleTicks(scale: any, count = 6): any[] {
  if (!scale) return [];
  if (typeof scale.ticks === 'function') {
    return scale.ticks(count);
  }
  if (typeof scale.domain === 'function') {
    return scale.domain();
  }
  return [];
}

export function getScalePosition(scale: any, value: any): number {
  if (!scale) return 0;
  const raw = scale(value);
  if (raw === undefined) return 0;
  if (typeof scale.bandwidth === 'function') {
    return Number(raw) + scale.bandwidth() / 2;
  }
  return Number(raw);
}

export interface CartesianAxisOptions {
  xTitle?: string;
  yTitle?: string;
  xTickCount?: number;
  yTickCount?: number;
  xFormat?: (v: any) => string;
  yFormat?: (v: any) => string;
  enableXAxis?: boolean;
  enableYAxis?: boolean;
}

export function renderCartesianGrid(
  ctx: ChartRenderContext<any>,
  options: { enableX?: boolean; enableY?: boolean; tickCount?: number } = {}
): void {
  const enableX = options.enableX ?? true;
  const enableY = options.enableY ?? true;
  const count = options.tickCount ?? 5;

  if (enableY && ctx.yScale) {
    const yTicks = getScaleTicks(ctx.yScale, count);
    for (const tick of yTicks) {
      const y = getScalePosition(ctx.yScale, tick);
      if (!Number.isFinite(y)) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', 'mc-grid-line mc-grid-line--y');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', String(ctx.innerWidth));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', ctx.theme.gridColor);
      line.setAttribute('stroke-dasharray', ctx.theme.gridStrokeDasharray);
      ctx.layerGroup.appendChild(line);
    }
  }

  if (enableX && ctx.xScale) {
    const xTicks = getScaleTicks(ctx.xScale, count);
    for (const tick of xTicks) {
      const x = getScalePosition(ctx.xScale, tick);
      if (!Number.isFinite(x)) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', 'mc-grid-line mc-grid-line--x');
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('y1', '0');
      line.setAttribute('y2', String(ctx.innerHeight));
      line.setAttribute('stroke', ctx.theme.gridColor);
      line.setAttribute('stroke-dasharray', ctx.theme.gridStrokeDasharray);
      ctx.layerGroup.appendChild(line);
    }
  }
}

/**
 * Renders X and Y axes using `<mc-label>` / `LabelEngine` (powered by `@chenglou/pretext`)
 * for EVERY tick label and axis title so clients can customize every label across the chart.
 */
export function renderCartesianAxes(
  ctx: ChartRenderContext<any>,
  options: CartesianAxisOptions = {}
): void {
  const enableX = options.enableXAxis ?? true;
  const enableY = options.enableYAxis ?? true;
  const formatVal = (v: any, fmt?: (val: any) => string): string => {
    if (fmt) return fmt(v);
    if (v instanceof Date) return timeFormat('%b %d')(v);
    if (typeof v === 'number') {
      return Math.abs(v) >= 1000 && v % 1000 === 0
        ? format('~s')(v)
        : Number.isInteger(v)
        ? String(v)
        : format('.2~f')(v);
    }
    return String(v);
  };

  if (enableX && ctx.xScale) {
    const xAxisG = document.createElementNS(SVG_NS, 'g');
    xAxisG.setAttribute('class', 'mc-axis mc-axis--x');

    const domainLine = document.createElementNS(SVG_NS, 'line');
    domainLine.setAttribute('x1', '0');
    domainLine.setAttribute('x2', String(ctx.innerWidth));
    domainLine.setAttribute('y1', String(ctx.innerHeight));
    domainLine.setAttribute('y2', String(ctx.innerHeight));
    domainLine.setAttribute('stroke', ctx.theme.axisColor);
    domainLine.setAttribute('stroke-width', '1');
    xAxisG.appendChild(domainLine);

    const xTicks = getScaleTicks(ctx.xScale, options.xTickCount ?? 6);
    const maxTickWidth =
      xTicks.length > 1
        ? Math.max(40, Math.floor(ctx.innerWidth / xTicks.length) - 6)
        : 100;

    xTicks.forEach((tick, idx) => {
      const x = getScalePosition(ctx.xScale, tick);
      if (!Number.isFinite(x)) return;

      const tickLine = document.createElementNS(SVG_NS, 'line');
      tickLine.setAttribute('x1', String(x));
      tickLine.setAttribute('x2', String(x));
      tickLine.setAttribute('y1', String(ctx.innerHeight));
      tickLine.setAttribute('y2', String(ctx.innerHeight + 5));
      tickLine.setAttribute('stroke', ctx.theme.axisColor);
      xAxisG.appendChild(tickLine);

      ctx.renderLabel(xAxisG, {
        id: `x-tick-${idx}`,
        text: formatVal(tick, options.xFormat),
        x,
        y: ctx.innerHeight + 10,
        type: 'axis-tick',
        anchor: 'middle',
        baseline: 'hanging',
        maxWidth: maxTickWidth,
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        color: ctx.theme.mutedTextColor,
        datum: { axis: 'x', value: tick }
      });
    });

    if (options.xTitle) {
      ctx.renderLabel(xAxisG, {
        id: 'x-axis-title',
        text: options.xTitle,
        x: ctx.innerWidth / 2,
        y: ctx.innerHeight + 34,
        type: 'axis-title',
        anchor: 'middle',
        baseline: 'middle',
        fontSize: ctx.theme.fontSize,
        fontWeight: 600,
        color: ctx.theme.textColor
      });
    }

    ctx.layerGroup.appendChild(xAxisG);
  }

  if (enableY && ctx.yScale) {
    const yAxisG = document.createElementNS(SVG_NS, 'g');
    yAxisG.setAttribute('class', 'mc-axis mc-axis--y');

    const domainLine = document.createElementNS(SVG_NS, 'line');
    domainLine.setAttribute('x1', '0');
    domainLine.setAttribute('x2', '0');
    domainLine.setAttribute('y1', '0');
    domainLine.setAttribute('y2', String(ctx.innerHeight));
    domainLine.setAttribute('stroke', ctx.theme.axisColor);
    domainLine.setAttribute('stroke-width', '1');
    yAxisG.appendChild(domainLine);

    const yTicks = getScaleTicks(ctx.yScale, options.yTickCount ?? 5);
    yTicks.forEach((tick, idx) => {
      const y = getScalePosition(ctx.yScale, tick);
      if (!Number.isFinite(y)) return;

      const tickLine = document.createElementNS(SVG_NS, 'line');
      tickLine.setAttribute('x1', '-5');
      tickLine.setAttribute('x2', '0');
      tickLine.setAttribute('y1', String(y));
      tickLine.setAttribute('y2', String(y));
      tickLine.setAttribute('stroke', ctx.theme.axisColor);
      yAxisG.appendChild(tickLine);

      ctx.renderLabel(yAxisG, {
        id: `y-tick-${idx}`,
        text: formatVal(tick, options.yFormat),
        x: -10,
        y,
        type: 'axis-tick',
        anchor: 'end',
        baseline: 'middle',
        maxWidth: Math.max(40, ctx.margin.left - 14),
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        color: ctx.theme.mutedTextColor,
        datum: { axis: 'y', value: tick }
      });
    });

    if (options.yTitle) {
      ctx.renderLabel(yAxisG, {
        id: 'y-axis-title',
        text: options.yTitle,
        x: -Math.max(36, ctx.margin.left - 14),
        y: ctx.innerHeight / 2,
        type: 'axis-title',
        anchor: 'middle',
        baseline: 'middle',
        rotation: -90,
        fontSize: ctx.theme.fontSize,
        fontWeight: 600,
        color: ctx.theme.textColor
      });
    }

    ctx.layerGroup.appendChild(yAxisG);
  }
}

/**
 * Renders chart legends via the unified SVG `LegendEngine`, measuring every item
 * with `@chenglou/pretext` for exact centering & wrapping, supporting all 4
 * positions (`top`, `bottom`, `left`, `right`), 4-side padding, keyboard focus,
 * and dedicated customizable legend tooltips.
 */
export function renderLegendLayer(
  ctx: ChartRenderContext<any>,
  items: LegendItem[],
  position: LegendPosition | 'top-right' = 'bottom'
): void {
  const normalizedPos: LegendPosition =
    position === 'top-right' ? 'top' : position;
  renderUnifiedLegendLayer(ctx, items, normalizedPos);
}
