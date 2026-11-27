import {
  scaleBand,
  scaleLinear,
  scaleLog,
  scalePoint,
  scaleSqrt,
  scaleSymlog,
  type ContinuousNumericScale
} from './scales';
import { formatAxisDate, formatAxisNumber } from './format';
import { physicalTextAnchor } from './i18n';
import { renderUnifiedLegendLayer } from './legend-engine';
import type {
  AxisPosition,
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
    const timestamps = domainValues
      .map((d) => (d instanceof Date ? d.getTime() : new Date(d).getTime()))
      .filter((t) => Number.isFinite(t));
    const minMs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const maxMs =
      timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const safeMaxMs = maxMs === minMs ? minMs + 86_400_000 : maxMs;

    const inner = scaleLinear().domain([minMs, safeMaxMs]).range(effectiveRange);
    if (config.nice !== false) inner.nice();
    if (config.clamp) inner.clamp(true);

    const toMs = (v: Date | number | string): number =>
      v instanceof Date ? v.getTime() : typeof v === 'number' ? v : new Date(v).getTime();

    const makeTimeScale = (linear: ContinuousNumericScale): any => {
      const fn: any = (v: Date | number | string) => linear(toMs(v));
      fn.domain = (d?: Array<Date | number | string>) => {
        if (!d) return linear.domain().map((ms) => new Date(ms));
        linear.domain(d.map(toMs));
        return fn;
      };
      fn.range = (r?: [number, number]) => {
        if (!r) return linear.range();
        linear.range(r);
        return fn;
      };
      fn.ticks = (count = 6) => linear.ticks(count).map((ms) => new Date(ms));
      fn.invert = (px: number) => new Date(linear.invert(px));
      fn.nice = (count?: number) => {
        linear.nice(count);
        return fn;
      };
      fn.clamp = (c?: boolean) => {
        if (c === undefined) return linear.clamp();
        linear.clamp(c);
        return fn;
      };
      fn.copy = () => makeTimeScale(linear.copy());
      return fn;
    };

    return makeTimeScale(inner);
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

  let scale: ContinuousNumericScale;
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
  xPosition?: AxisPosition;
  yPosition?: AxisPosition;
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
 * Renders X and Y axes across all 4 positions (`top`, `right`, `bottom`, `left`, plus `both` and `none`)
 * using `<mc-label>` / `LabelEngine` (powered by `@chenglou/pretext`) for every tick label and axis title.
 */
export function renderCartesianAxes(
  ctx: ChartRenderContext<any>,
  options: CartesianAxisOptions = {},
  onTick?: (axis: 'x' | 'y', value: unknown, coordinate: number, line: SVGLineElement, label: SVGElement | null) => void
): void {
  const rawXPos =
    options.xPosition ?? ctx.scaleConfig?.x?.position ?? 'bottom';
  const rawYPos =
    options.yPosition ?? ctx.scaleConfig?.y?.position ?? 'left';

  const enableX = (options.enableXAxis ?? true) && rawXPos !== 'none';
  const enableY = (options.enableYAxis ?? true) && rawYPos !== 'none';

  const xTitle =
    options.xTitle ?? ctx.scaleConfig?.x?.title ?? ctx.config?.xTitle;
  const yTitle =
    options.yTitle ?? ctx.scaleConfig?.y?.title ?? ctx.config?.yTitle;
  const xTickCount =
    options.xTickCount ?? ctx.scaleConfig?.x?.tickCount ?? 6;
  const yTickCount =
    options.yTickCount ?? ctx.scaleConfig?.y?.tickCount ?? 5;

  const formatVal = (v: any, fmt?: (val: any) => string): string => {
    if (fmt) return fmt(v);
    if (v instanceof Date) return formatAxisDate(v, ctx.i18n);
    if (typeof v === 'number') {
      return formatAxisNumber(v, ctx.i18n);
    }
    return String(v);
  };

  if (enableX && ctx.xScale) {
    const xSides: ('bottom' | 'top')[] =
      rawXPos === 'both'
        ? ['bottom', 'top']
        : rawXPos === 'top'
        ? ['top']
        : ['bottom'];

    const xTicks = getScaleTicks(ctx.xScale, xTickCount);
    const maxTickWidth =
      xTicks.length > 1
        ? Math.max(40, Math.floor(ctx.innerWidth / xTicks.length) - 6)
        : 100;

    xSides.forEach((side) => {
      const isSecondary = xSides.length > 1 && side === 'top';
      const idPrefix = isSecondary ? 'x-top' : 'x';
      const isTop = side === 'top';
      const domainY = isTop ? 0 : ctx.innerHeight;
      const tickEndY = isTop ? -5 : ctx.innerHeight + 5;
      const labelY = isTop ? -10 : ctx.innerHeight + 10;
      const labelBaseline = isTop ? 'alphabetic' : 'hanging';

      const xAxisG = document.createElementNS(SVG_NS, 'g');
      xAxisG.setAttribute('class', `mc-axis mc-axis--x mc-axis--${side}`);
      xAxisG.setAttribute('data-axis', 'x');
      xAxisG.setAttribute('data-axis-position', side);

      const domainLine = document.createElementNS(SVG_NS, 'line');
      domainLine.setAttribute('x1', '0');
      domainLine.setAttribute('x2', String(ctx.innerWidth));
      domainLine.setAttribute('y1', String(domainY));
      domainLine.setAttribute('y2', String(domainY));
      domainLine.setAttribute('stroke', ctx.theme.axisColor);
      domainLine.setAttribute('stroke-width', '1');
      ctx.registerEventTarget(domainLine, {
        target: 'axis',
        category: 'axis',
        id: `${idPrefix}-axis-line`,
        data: { axis: 'x', position: side, part: 'line', count: xTicks.length }
      });
      xAxisG.appendChild(domainLine);

      let maxTickDrop = 16;

      xTicks.forEach((tick, idx) => {
        const x = getScalePosition(ctx.xScale, tick);
        if (!Number.isFinite(x)) return;

        const formatted = formatVal(tick, options.xFormat);
        const tickData = {
          axis: 'x' as const,
          position: side,
          part: 'tick' as const,
          value: tick,
          label: formatted,
          index: idx,
          count: xTicks.length
        };

        const tickLine = document.createElementNS(SVG_NS, 'line');
        tickLine.setAttribute('x1', String(x));
        tickLine.setAttribute('x2', String(x));
        tickLine.setAttribute('y1', String(domainY));
        tickLine.setAttribute('y2', String(tickEndY));
        tickLine.setAttribute('stroke', ctx.theme.axisColor);
        ctx.registerEventTarget(tickLine, {
          target: 'axis',
          category: 'axis',
          id: `${idPrefix}-tick-line-${idx}`,
          data: tickData
        });
        xAxisG.appendChild(tickLine);

        const xTickLabel = ctx.renderLabel(xAxisG, {
          id: `${idPrefix}-tick-${idx}`,
          text: formatted,
          x,
          y: labelY,
          type: 'axis-tick',
          anchor: 'middle',
          baseline: labelBaseline,
          maxWidth: maxTickWidth,
          fontSize: Math.max(10, ctx.theme.fontSize - 1),
          color: ctx.theme.mutedTextColor,
          datum: { axis: 'x', position: side, value: tick }
        });
        if (xTickLabel) {
          const suppressTruncatedFocus =
            xTickLabel.getAttribute('data-truncated') === 'true' &&
            !xTickLabel.classList.contains('mc-label--interactive');
          if (
            ctx.isInteractive !== false &&
            ctx.ariaConfig.isFocusable &&
            !suppressTruncatedFocus
          ) {
            xTickLabel.setAttribute('tabindex', '0');
          }
          ctx.registerEventTarget(xTickLabel, {
            target: 'axis',
            category: 'axis',
            id: `${idPrefix}-tick-${idx}`,
            data: tickData
          });
        }
        onTick?.('x', tick, x, tickLine, xTickLabel);

        const rotDeg = Number(
          xTickLabel?.getAttribute('data-applied-rotation') || 0
        );
        if (rotDeg !== 0) {
          const rad = Math.abs((rotDeg * Math.PI) / 180);
          const estDrop = Math.ceil(
            maxTickWidth * Math.sin(rad) + 14 * Math.cos(rad)
          );
          if (estDrop > maxTickDrop) maxTickDrop = estDrop;
        }
      });

      if (xTitle) {
        const xTitleOffset = isTop
          ? Math.max(26, Math.min(ctx.margin.top - 10, maxTickDrop + 14))
          : Math.max(34, Math.min(ctx.margin.bottom - 10, maxTickDrop + 18));
        const titleY = isTop ? -xTitleOffset : ctx.innerHeight + xTitleOffset;
        const xTitleLabel = ctx.renderLabel(xAxisG, {
          id: `${idPrefix}-axis-title`,
          text: xTitle,
          x: ctx.innerWidth / 2,
          y: titleY,
          type: 'axis-title',
          anchor: 'middle',
          baseline: 'middle',
          maxWidth: Math.max(80, ctx.innerWidth),
          fontSize: ctx.theme.fontSize,
          fontWeight: 600,
          color: ctx.theme.textColor
        });
        if (xTitleLabel) {
          if (ctx.isInteractive !== false && ctx.ariaConfig.isFocusable) {
            xTitleLabel.setAttribute('tabindex', '0');
          }
          ctx.registerEventTarget(xTitleLabel, {
            target: 'axis',
            category: 'axis',
            id: `${idPrefix}-axis-title`,
            data: {
              axis: 'x',
              position: side,
              part: 'title',
              value: xTitle,
              label: xTitle
            }
          });
        }
      }

      ctx.layerGroup.appendChild(xAxisG);
    });
  }

  if (enableY && ctx.yScale) {
    const ySides: ('left' | 'right')[] =
      rawYPos === 'both'
        ? ['left', 'right']
        : rawYPos === 'right'
        ? ['right']
        : ['left'];

    const yTicks = getScaleTicks(ctx.yScale, yTickCount);

    ySides.forEach((side) => {
      const isSecondary = ySides.length > 1 && side === 'right';
      const idPrefix = isSecondary ? 'y-right' : 'y';
      const isRight = side === 'right';
      const domainX = isRight ? ctx.innerWidth : 0;
      const tickX1 = isRight ? ctx.innerWidth : -5;
      const tickX2 = isRight ? ctx.innerWidth + 5 : 0;
      const labelX = isRight ? ctx.innerWidth + 10 : -10;
      const labelAnchor = isRight ? 'start' : 'end';
      const maxTickW = isRight
        ? Math.max(40, ctx.margin.right - 14)
        : Math.max(40, ctx.margin.left - 14);

      const yAxisG = document.createElementNS(SVG_NS, 'g');
      yAxisG.setAttribute('class', `mc-axis mc-axis--y mc-axis--${side}`);
      yAxisG.setAttribute('data-axis', 'y');
      yAxisG.setAttribute('data-axis-position', side);

      const domainLine = document.createElementNS(SVG_NS, 'line');
      domainLine.setAttribute('x1', String(domainX));
      domainLine.setAttribute('x2', String(domainX));
      domainLine.setAttribute('y1', '0');
      domainLine.setAttribute('y2', String(ctx.innerHeight));
      domainLine.setAttribute('stroke', ctx.theme.axisColor);
      domainLine.setAttribute('stroke-width', '1');
      ctx.registerEventTarget(domainLine, {
        target: 'axis',
        category: 'axis',
        id: `${idPrefix}-axis-line`,
        data: { axis: 'y', position: side, part: 'line', count: yTicks.length }
      });
      yAxisG.appendChild(domainLine);

      yTicks.forEach((tick, idx) => {
        const y = getScalePosition(ctx.yScale, tick);
        if (!Number.isFinite(y)) return;

        const formatted = formatVal(tick, options.yFormat);
        const tickData = {
          axis: 'y' as const,
          position: side,
          part: 'tick' as const,
          value: tick,
          label: formatted,
          index: idx,
          count: yTicks.length
        };

        const tickLine = document.createElementNS(SVG_NS, 'line');
        tickLine.setAttribute('x1', String(tickX1));
        tickLine.setAttribute('x2', String(tickX2));
        tickLine.setAttribute('y1', String(y));
        tickLine.setAttribute('y2', String(y));
        tickLine.setAttribute('stroke', ctx.theme.axisColor);
        ctx.registerEventTarget(tickLine, {
          target: 'axis',
          category: 'axis',
          id: `${idPrefix}-tick-line-${idx}`,
          data: tickData
        });
        yAxisG.appendChild(tickLine);

        const yTickLabel = ctx.renderLabel(yAxisG, {
          id: `${idPrefix}-tick-${idx}`,
          text: formatted,
          x: labelX,
          y,
          type: 'axis-tick',
          anchor: physicalTextAnchor(labelAnchor, ctx.i18n?.direction ?? 'ltr'),
          baseline: 'middle',
          maxWidth: maxTickW,
          fontSize: Math.max(10, ctx.theme.fontSize - 1),
          color: ctx.theme.mutedTextColor,
          datum: { axis: 'y', position: side, value: tick }
        });
        if (yTickLabel) {
          const suppressTruncatedFocus =
            yTickLabel.getAttribute('data-truncated') === 'true' &&
            !yTickLabel.classList.contains('mc-label--interactive');
          if (
            ctx.isInteractive !== false &&
            ctx.ariaConfig.isFocusable &&
            !suppressTruncatedFocus
          ) {
            yTickLabel.setAttribute('tabindex', '0');
          }
          ctx.registerEventTarget(yTickLabel, {
            target: 'axis',
            category: 'axis',
            id: `${idPrefix}-tick-${idx}`,
            data: tickData
          });
        }
        onTick?.('y', tick, y, tickLine, yTickLabel);
      });

      if (yTitle) {
        const titleX = isRight
          ? ctx.innerWidth + Math.max(36, ctx.margin.right - 14)
          : -Math.max(36, ctx.margin.left - 14);
        const yTitleLabel = ctx.renderLabel(yAxisG, {
          id: `${idPrefix}-axis-title`,
          text: yTitle,
          x: titleX,
          y: ctx.innerHeight / 2,
          type: 'axis-title',
          anchor: 'middle',
          baseline: 'middle',
          rotation: isRight ? 90 : -90,
          maxWidth: Math.max(80, ctx.innerHeight),
          fontSize: ctx.theme.fontSize,
          fontWeight: 600,
          color: ctx.theme.textColor
        });
        if (yTitleLabel) {
          if (ctx.isInteractive !== false && ctx.ariaConfig.isFocusable) {
            yTitleLabel.setAttribute('tabindex', '0');
          }
          ctx.registerEventTarget(yTitleLabel, {
            target: 'axis',
            category: 'axis',
            id: `${idPrefix}-axis-title`,
            data: {
              axis: 'y',
              position: side,
              part: 'title',
              value: yTitle,
              label: yTitle
            }
          });
        }
      }

      ctx.layerGroup.appendChild(yAxisG);
    });
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
