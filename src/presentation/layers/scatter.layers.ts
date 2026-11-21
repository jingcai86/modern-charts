import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, ScatterSeries } from '../../core/types';
import type { ScatterChartModel } from '../../models/scatter.model';
import { renderScatterNodeItem } from '../items/scatter.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderScatterTrendlineLayer(
  model: ScatterChartModel,
  ctx: ChartRenderContext<ScatterSeries[]>
): void {
  if (!model.enableTrendline || !model.trendline) return;

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('class', 'mc-scatter-trendline');
  line.setAttribute('x1', String(model.trendline.x1));
  line.setAttribute('y1', String(model.trendline.y1));
  line.setAttribute('x2', String(model.trendline.x2));
  line.setAttribute('y2', String(model.trendline.y2));
  line.setAttribute('stroke', ctx.theme.mutedTextColor);
  line.setAttribute('stroke-width', '1.8');
  line.setAttribute('stroke-dasharray', '6 4');
  ctx.layerGroup.appendChild(line);
}

export function renderScatterNodesLayer(
  model: ScatterChartModel,
  ctx: ChartRenderContext<ScatterSeries[]>
): void {
  model.nodes.forEach((node) => {
    ctx.layerGroup.appendChild(renderScatterNodeItem(node, ctx));
  });
}

export function renderScatterLabelsLayer(
  model: ScatterChartModel,
  ctx: ChartRenderContext<ScatterSeries[]>
): void {
  if (!model.enableLabels) return;

  model.nodes.forEach((node, idx) => {
    if (!node.label) return;
    ctx.renderLabel(ctx.layerGroup, {
      id: `scatter-label-${idx}`,
      text: node.label,
      x: node.px,
      y: node.py - node.radius - 8,
      type: 'data',
      anchor: 'middle',
      baseline: 'middle',
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color: node.threshold.style.labelColor ?? ctx.theme.textColor,
      icon: node.threshold.style.icon,
      datum: {
        id: node.seriesId,
        label: node.label,
        x: node.xValue,
        y: node.yValue,
        value: node.yValue
      }
    });
  });
}

export function renderScatterLegendsLayer(
  model: ScatterChartModel,
  ctx: ChartRenderContext<ScatterSeries[]>
): void {
  renderLegendLayer(
    ctx,
    model.seriesList.map((s) => ({
      id: s.id,
      label: s.id,
      color: s.color || ctx.colorScale(s.id)
    }))
  );
}
