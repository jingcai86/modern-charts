import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, SankeyData } from '../../core/types';
import type { SankeyChartModel } from '../../models/sankey.model';
import {
  renderSankeyLinkItem,
  renderSankeyNodeItem
} from '../items/sankey.item';

export function renderSankeyLinksLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>,
  defs?: Element | null
): void {
  model.links.forEach((link) => {
    ctx.layerGroup.appendChild(renderSankeyLinkItem(link, ctx, defs));
  });
}

export function renderSankeyNodesLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>
): void {
  model.nodes.forEach((node) => {
    ctx.layerGroup.appendChild(renderSankeyNodeItem(node, ctx));
  });
}

export function renderSankeyLabelsLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>
): void {
  if (!model.enableLabels) return;

  model.nodes.forEach((node) => {
    const isLeftHalf = node.x0 < ctx.innerWidth / 2;
    const lx = isLeftHalf ? node.x1 + 8 : node.x0 - 8;
    const ly = (node.y0 + node.y1) / 2;

    ctx.renderLabel(ctx.layerGroup, {
      id: `sankey-label-${node.id}`,
      text: `${node.name} (${node.value})`,
      x: lx,
      y: ly,
      type: 'node',
      anchor: isLeftHalf ? 'start' : 'end',
      baseline: 'middle',
      maxWidth: 145,
      fontSize: ctx.theme.fontSize,
      fontWeight: 600,
      color: ctx.theme.textColor,
      background:
        ctx.theme.mode === 'dark'
          ? 'rgba(15, 23, 42, 0.78)'
          : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 5,
      datum: {
        id: node.id,
        name: node.name,
        value: node.value
      }
    });
  });
}

export function renderSankeyLegendsLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>
): void {
  renderLegendLayer(
    ctx,
    model.nodes.slice(0, 6).map((n) => ({
      id: n.id,
      label: n.name,
      color: n.color
    })),
    'bottom'
  );
}
