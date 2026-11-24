import type { ChartRenderContext, GaugeDatum } from '../../core/types';
import type { GaugeChartModel } from '../../models/gauge.model';
import {
  renderGaugeNeedleItem,
  renderGaugeValueArcItem
} from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderGaugeTrackLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDatum>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-gauge-track');
  path.setAttribute('d', model.trackPathD);
  path.setAttribute('fill', ctx.theme.gridColor);
  g.appendChild(path);
  ctx.layerGroup.appendChild(g);
}

export function renderGaugeBandsLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDatum>
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
  ctx: ChartRenderContext<GaugeDatum>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);
  g.appendChild(renderGaugeValueArcItem(model, ctx));
  ctx.layerGroup.appendChild(g);
}

export function renderGaugeTicksLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDatum>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.ticks.forEach((tick) => {
    const tickG = ctx.renderLabel(g, {
      id: `gauge-tick-${tick.index}`,
      text: String(tick.value),
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
          label: String(tick.value),
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
  ctx: ChartRenderContext<GaugeDatum>
): void {
  ctx.layerGroup.appendChild(renderGaugeNeedleItem(model, ctx));
}

export function renderGaugeCenterLayer(
  model: GaugeChartModel,
  ctx: ChartRenderContext<GaugeDatum>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const valueFontSize = Math.min(
    ctx.theme.fontSize + 8,
    Math.max(14, Math.round(model.outerRadius * 0.24))
  );

  ctx.renderLabel(g, {
    id: 'gauge-value-label',
    text: `${model.value}${model.unit}`,
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
