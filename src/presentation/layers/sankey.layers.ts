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
  const isVertical = model.layout === 'vertical';

  model.nodes.forEach((node) => {
    let lx: number;
    let ly: number;
    let anchor: 'start' | 'middle' | 'end';
    let maxWidth = 145;

    if (isVertical) {
      lx = (node.x0 + node.x1) / 2;
      ly = (node.y0 + node.y1) / 2;
      anchor = 'middle';
      maxWidth = Math.max(76, Math.min(180, node.x1 - node.x0 + 28));
    } else {
      const isLeftHalf = node.x0 < ctx.innerWidth / 2;
      lx = isLeftHalf ? node.x1 + 8 : node.x0 - 8;
      ly = (node.y0 + node.y1) / 2;
      anchor = isLeftHalf ? 'start' : 'end';
    }

    ctx.renderLabel(ctx.layerGroup, {
      id: `sankey-label-${node.id}`,
      text: `${node.name} (${node.value})`,
      x: lx,
      y: ly,
      type: 'node',
      anchor,
      baseline: 'middle',
      maxWidth,
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
