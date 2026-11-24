import { renderLegendLayer } from '../../core/scale-manager';
import { allocateUniqueSvgId } from '../../core/threshold-clip';
import type { ChartRenderContext, ScatterSeries } from '../../core/types';
import type {
  ComputedScatterNodeModel,
  ScatterChartModel
} from '../../models/scatter.model';
import {
  renderScatterNodeItem,
  showScatterNodeTooltip
} from '../items/scatter.item';

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
  if (model.clip) {
    const defs = ctx.svg.querySelector('.mc-chart-defs');
    if (defs) {
      const clipId = allocateUniqueSvgId('mc-scatter-plot-clip');
      const clipPath = document.createElementNS(SVG_NS, 'clipPath');
      clipPath.setAttribute('id', clipId);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', String(Math.max(0, ctx.innerWidth)));
      rect.setAttribute('height', String(Math.max(0, ctx.innerHeight)));
      clipPath.appendChild(rect);
      defs.appendChild(clipPath);
      ctx.layerGroup.setAttribute('clip-path', `url(#${clipId})`);
      ctx.layerGroup.setAttribute('data-clipped', 'true');
    }
  }

  let meshRect: SVGRectElement | null = null;
  if (model.useMesh && ctx.isInteractive !== false && model.nodes.length > 0) {
    meshRect = document.createElementNS(SVG_NS, 'rect');
    meshRect.setAttribute('class', 'mc-scatter-mesh');
    meshRect.setAttribute('x', '0');
    meshRect.setAttribute('y', '0');
    meshRect.setAttribute('width', String(Math.max(0, ctx.innerWidth)));
    meshRect.setAttribute('height', String(Math.max(0, ctx.innerHeight)));
    meshRect.setAttribute('fill', 'transparent');
    meshRect.style.cursor = 'crosshair';
    ctx.layerGroup.appendChild(meshRect);
  }

  const nodeElements: SVGElement[] = [];
  model.nodes.forEach((node) => {
    const el = renderScatterNodeItem(node, ctx);
    nodeElements.push(el);
    ctx.layerGroup.appendChild(el);
  });

  if (meshRect) {
    let activeMeshIdx = -1;

    const clearMeshActive = () => {
      if (activeMeshIdx >= 0 && nodeElements[activeMeshIdx]) {
        const prevEl = nodeElements[activeMeshIdx];
        prevEl.removeAttribute('data-mesh-active');
        prevEl.setAttribute(
          'fill-opacity',
          prevEl.getAttribute('data-base-opacity') ?? '0.74'
        );
      }
      activeMeshIdx = -1;
    };

    const resolveLocalCoords = (e: MouseEvent): { x: number; y: number } => {
      const svgRect = ctx.svg.getBoundingClientRect?.();
      if (svgRect && svgRect.width > 0 && svgRect.height > 0) {
        return {
          x: e.clientX - svgRect.left - ctx.margin.left,
          y: e.clientY - svgRect.top - ctx.margin.top
        };
      }
      return {
        x: e.clientX - ctx.margin.left,
        y: e.clientY - ctx.margin.top
      };
    };

    const findNearestIndex = (lx: number, ly: number): number => {
      let bestIdx = 0;
      let bestDistSq = Infinity;
      model.nodes.forEach((n: ComputedScatterNodeModel, idx: number) => {
        const dx = n.px - lx;
        const dy = n.py - ly;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      });
      return bestIdx;
    };

    meshRect.addEventListener('mousemove', (e) => {
      const { x, y } = resolveLocalCoords(e as MouseEvent);
      const nearestIdx = findNearestIndex(x, y);
      if (nearestIdx !== activeMeshIdx) {
        clearMeshActive();
        activeMeshIdx = nearestIdx;
      }
      const targetNode = model.nodes[nearestIdx];
      const targetEl = nodeElements[nearestIdx];
      if (targetNode && targetEl) {
        targetEl.setAttribute('data-mesh-active', 'true');
        targetEl.setAttribute('fill-opacity', '0.96');
        showScatterNodeTooltip(
          targetNode,
          targetEl,
          ctx,
          (e as MouseEvent).clientX,
          (e as MouseEvent).clientY
        );
      }
    });

    meshRect.addEventListener('mouseleave', () => {
      clearMeshActive();
      ctx.hideTooltip();
    });
  }
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
    })),
    'bottom'
  );
}
