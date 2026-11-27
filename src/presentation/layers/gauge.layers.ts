import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { renderLegendLayer } from '../../core/scale-manager';
import type {
  ChartRenderContext,
  GaugeDataInput,
  LegendItem
} from '../../core/types';
import {
  gaugeArcPath,
  gaugeTrianglePoints,
  type ComputedGaugeSeriesModel,
  type ComputedGaugeTickLineModel,
  type GaugeArcGeometry,
  type GaugeChartModel
} from '../../models/gauge.model';
import {
  renderGaugeNeedleItem,
  renderGaugeValueArcItem
} from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';
interface GaugeFrame extends GaugeArcGeometry {
  needleLength: number;
  pointerWidth: number;
  pinRadius: number;
}

const displayed = new WeakMap<SVGGElement, GaugeFrame>();

function gaugeSeriesKey(item: ComputedGaugeSeriesModel): string {
  return item.datum.label ? `label:${item.datum.label}` : `index:${item.index}`;
}

function gaugeFrame(model: GaugeChartModel, item: ComputedGaugeSeriesModel): GaugeFrame {
  return {
    startAngle: model.startAngleDeg * Math.PI / 180,
    endAngle: item.angleRad + Math.PI / 2,
    innerRadius: item.ringInnerRadius,
    outerRadius: item.ringOuterRadius,
    cornerRadius: model.cornerRadius,
    needleLength: model.innerRadius * model.pointerLength,
    pointerWidth: model.pointerWidth,
    pinRadius: item.pinRadius
  };
}

function withoutEntrance(ctx: ChartRenderContext<GaugeDataInput>): ChartRenderContext<GaugeDataInput> {
  return { ...ctx, animateItem: () => {} };
}

function drawGaugeItem(mark: SVGElement, frame: GaugeFrame): void {
  if (mark.localName === 'path') {
    mark.setAttribute('d', gaugeArcPath(frame));
    return;
  }
  const angle = frame.endAngle - Math.PI / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  if (mark.localName === 'polygon') {
    mark.setAttribute('points', gaugeTrianglePoints(cos, sin, frame.needleLength, frame.pointerWidth));
    return;
  }
  const pin = mark.localName === 'circle';
  const radius = pin ? (frame.innerRadius + frame.outerRadius) / 2 : frame.needleLength;
  mark.setAttribute(pin ? 'cx' : 'x2', String(cos * radius));
  mark.setAttribute(pin ? 'cy' : 'y2', String(sin * radius));
  mark.setAttribute(pin ? 'r' : 'stroke-width', String(pin ? frame.pinRadius : frame.pointerWidth));
}

function collapse(frame: GaugeFrame): GaugeFrame {
  return { ...frame, endAngle: frame.startAngle, needleLength: 0, pointerWidth: 0, pinRadius: 0 };
}

function tweenGaugeItem(
  group: SVGGElement,
  mark: SVGElement,
  target: GaugeFrame,
  motion?: ItemMotion
): void {
  const source = displayed.get(group) ?? collapse(target);
  const fields = Object.keys(target) as Array<keyof GaugeFrame>;
  if (!motion || fields.every(field => source[field] === target[field])) {
    displayed.set(group, target);
    return;
  }

  const frame = { ...source };
  displayed.set(group, frame);
  motion((t) => {
    for (const field of fields) frame[field] = source[field] + (target[field] - source[field]) * t;
    drawGaugeItem(mark, frame);
  }, () => displayed.set(group, target));
}

function joinGaugeSeries(
  layer: SVGGElement,
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>,
  render: (group: SVGGElement, item: ComputedGaugeSeriesModel, initial: boolean) => SVGElement
): void {
  joinChartItems(layer, model.series, gaugeSeriesKey, ctx.animationConfig,
    (group, item, { initial, motion }) => {
      const mark = render(group, item, initial);
      group.replaceChildren(mark);
      tweenGaugeItem(group, mark, gaugeFrame(model, item), motion);
    },
    (group, motion) => {
      const mark = group.lastElementChild as SVGElement | null;
      const frame = displayed.get(group);
      if (mark && frame) tweenGaugeItem(group, mark, collapse(frame), motion);
    }
  );
}

export function renderGaugeTrackLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.series.forEach((item, idx) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'mc-gauge-track');
    path.setAttribute('data-series-index', String(idx));
    path.setAttribute('d', item.trackPathD);
    path.setAttribute('fill', ctx.theme.gridColor);
    g.appendChild(path);
  });

  ctx.layerGroup.appendChild(g);
}

export function renderGaugeBandsLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  if (model.bands.length === 0) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.bands.forEach((b) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'mc-gauge-band');
    path.setAttribute('d', b.pathD);
    path.setAttribute('fill', b.band.color);
    g.appendChild(path);
  });

  ctx.layerGroup.appendChild(g);
}

export function renderGaugeValueArcLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  const center = `translate(${model.cx}, ${model.cy})`;
  const staticCtx = withoutEntrance(ctx);
  joinGaugeSeries(ctx.layerGroup, model, ctx, (group, item, initial) => {
    group.setAttribute('transform', center);
    return renderGaugeValueArcItem(model, initial ? ctx : staticCtx, item);
  });
}

function appendTick(
  group: SVGGElement,
  tick: ComputedGaugeTickLineModel,
  stroke: string,
  minor = false
): void {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('class', minor ? 'mc-gauge-minor-tick-line' : 'mc-gauge-tick-line');
  for (const coord of ['x1', 'y1', 'x2', 'y2'] as const) {
    line.setAttribute(coord, String(tick[coord]));
  }
  line.setAttribute('stroke', stroke);
  line.setAttribute('stroke-width', minor ? '1' : '1.5');
  group.appendChild(line);
}

export function renderGaugeTicksLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  (model.minorTicks ?? []).forEach((tick) => appendTick(g, tick, ctx.theme.gridColor, true));

  model.ticks.forEach((tick) => {
    if ([tick.x1, tick.y1, tick.x2, tick.y2].every(Number.isFinite)) {
      appendTick(g, tick, ctx.theme.axisColor);
    }

    if (model.enableLabels === false) return;

    const tickG = ctx.renderLabel(g, {
      id: `gauge-tick-${tick.index}`,
      text: ctx.i18n.formatNumber(tick.value, { useGrouping: false }),
      x: tick.x,
      y: tick.y,
      type: 'axis-tick',
      anchor: 'middle',
      baseline: 'middle',
      fontSize: Math.max(10, ctx.theme.fontSize - 2),
      color: ctx.theme.mutedTextColor,
      datum: { value: tick.value }
    });
    if (tickG) {
      if (ctx.isInteractive !== false && ctx.ariaConfig.isFocusable) {
        tickG.setAttribute('tabindex', '0');
      }
      ctx.registerEventTarget(tickG, {
        target: 'axis',
        category: 'axis',
        id: `gauge-tick-${tick.index}`,
        data: {
          axis: 'radial',
          part: 'tick',
          value: tick.value,
          label: ctx.i18n.formatNumber(tick.value, { useGrouping: false }),
          index: tick.index,
          count: model.ticks.length
        }
      });
    }
  });

  ctx.layerGroup.appendChild(g);
}

export function renderGaugeNeedleLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  const layer = ctx.layerGroup;
  if (model.pointerType === 'none') {
    layer.replaceChildren();
    return;
  }
  const previous = layer.querySelector<SVGGElement>(':scope > g > g');
  const rendered = renderGaugeNeedleItem(model, previous ? withoutEntrance(ctx) : ctx);
  const holder = previous ?? document.createElementNS(SVG_NS, 'g');
  const marks = rendered.querySelectorAll<SVGElement>('.mc-gauge-needle');
  rendered.prepend(holder);
  layer.replaceChildren(rendered);
  joinGaugeSeries(holder, model, ctx, (_group, item) => marks[item.index]);
}

export function renderGaugeCenterLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  if (model.enableLabels === false) return;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const valueFontSize = Math.min(
    ctx.theme.fontSize + 8,
    Math.max(14, Math.round(model.outerRadius * 0.24))
  );

  const valueText =
    model.series.length > 1
      ? model.series
          .map(
            (s) =>
              `${ctx.i18n.formatNumber(s.value, { useGrouping: false })}${s.unit}`
          )
          .join(' / ')
      : `${ctx.i18n.formatNumber(model.value, { useGrouping: false })}${model.unit}`;

  ctx.renderLabel(g, {
    id: 'gauge-value-label',
    text: valueText,
    x: 0,
    y: model.valueY,
    type: 'center',
    anchor: 'middle',
    baseline: 'middle',
    fontSize: valueFontSize,
    fontWeight: 800,
    color: ctx.theme.textColor,
    datum: { value: model.value, label: model.label }
  });

  if (model.label) {
    ctx.renderLabel(g, {
      id: 'gauge-subtitle-label',
      text: model.label,
      x: 0,
      y: model.subtitleY,
      type: 'title',
      anchor: 'middle',
      baseline: 'middle',
      maxWidth: Math.max(80, ctx.innerWidth - 8),
      fontSize: ctx.theme.fontSize,
      fontWeight: 500,
      color: ctx.theme.mutedTextColor,
      datum: { value: model.value, label: model.label }
    });
  }

  ctx.layerGroup.appendChild(g);
}

export function renderGaugeLegendsLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDataInput>
): void {
  const hasExplicitLegend =
    ctx.config.legend !== undefined ||
    (ctx.svg.getRootNode() instanceof ShadowRoot &&
      (ctx.svg.getRootNode() as ShadowRoot).host?.querySelector(
        ':scope > mc-legend'
      ) !== null);
  const seriesItems: LegendItem[] =
    model.series.length > 1
      ? model.series.map((s, idx) => ({
          id: s.label || `gauge-series-${idx}`,
          label: s.label || `Series ${idx + 1}`,
          color: s.color,
          value: `${s.value}${s.unit}`
        }))
      : hasExplicitLegend
      ? [
          {
            id: 'gauge-value',
            label: model.label || 'Value',
            color: model.series[0]?.color || ctx.theme.colors[0] || '#6366f1',
            value: `${model.value}${model.unit}`
          }
        ]
      : [];
  renderLegendLayer(ctx, seriesItems, 'bottom');
}
