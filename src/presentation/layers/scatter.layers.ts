import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { renderLegendLayer } from '../../core/scale-manager';
import { allocateUniqueSvgId } from '../../core/threshold-clip';
import type { ChartRenderContext, ScatterSeries, ScatterSymbolType } from '../../core/types';
import type {
  ComputedScatterNodeModel,
  ScatterChartModel
} from '../../models/scatter.model';
import {
  buildScatterSymbolPath,
  renderScatterNodeItem,
  showScatterNodeTooltip
} from '../items/scatter.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

type ScatterGeometry = Pick<ComputedScatterNodeModel, 'px' | 'py' | 'radius' | 'symbolRotate'>;
const positions = new WeakMap<SVGGElement, ScatterGeometry>();
const movingNodes = new WeakMap<ComputedScatterNodeModel, { frame: ScatterGeometry; motion: ItemMotion }>();

function tweenScatterNode(
  mark: SVGElement,
  symbol: ScatterSymbolType,
  frame: ScatterGeometry,
  target: ScatterGeometry,
  motion: ItemMotion
): void {
  const from = { ...frame };
  motion((t) => {
    frame.px = from.px + (target.px - from.px) * t;
    frame.py = from.py + (target.py - from.py) * t;
    frame.radius = from.radius + (target.radius - from.radius) * t;
    frame.symbolRotate = from.symbolRotate + (target.symbolRotate - from.symbolRotate) * t;
    const { px, py, radius, symbolRotate } = frame;
    mark.setAttribute('cx', String(px));
    mark.setAttribute('cy', String(py));
    mark.setAttribute('r', String(radius));
    if (symbol !== 'circle') mark.setAttribute('d', buildScatterSymbolPath(symbol, px, py, radius));
    if (symbolRotate) mark.setAttribute('transform', `rotate(${symbolRotate} ${px} ${py})`);
    else mark.removeAttribute('transform');
  });
}

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
  const priorMesh = ctx.layerGroup.firstElementChild;
  if (priorMesh?.classList.contains('mc-scatter-mesh')) priorMesh.remove();
  ctx.layerGroup.removeAttribute('clip-path');
  ctx.layerGroup.removeAttribute('data-clipped');
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
  }

  const renderedNodes: Array<{ mark: SVGElement; frame: ScatterGeometry }> = [];
  joinChartItems(
    ctx.layerGroup,
    model.nodes,
    node => node.itemKey ?? JSON.stringify([node.seriesId, node.label ?? node.index]),
    ctx.animationConfig,
    (group, node, { initial, motion }) => {
      const mark = renderScatterNodeItem(node, ctx, initial);
      group.replaceChildren(mark);
      const { px, py, radius, symbolRotate } = node;
      const target = { px, py, radius, symbolRotate };
      const rendered = { mark, frame: target };
      renderedNodes.push(rendered);
      const from = positions.get(group) ?? { ...target, radius: 0 };
      positions.set(group, target);
      if (!motion || (from.px === px && from.py === py && from.radius === radius && from.symbolRotate === symbolRotate)) return;
      if (!Object.values(target).every(Number.isFinite) || !Object.values(from).every(Number.isFinite)) return;

      const frame = { ...from };
      rendered.frame = frame;
      positions.set(group, frame);
      movingNodes.set(node, { frame, motion });
      mark.setAttribute('data-animated', 'true');
      tweenScatterNode(mark, node.symbol, frame, target, motion);
    },
    (group, motion) => {
      const mark = group.querySelector<SVGElement>('.mc-scatter-node');
      const frame = positions.get(group);
      if (!mark || !frame || !Object.values(frame).every(Number.isFinite)) return;
      const symbol = mark.getAttribute('data-symbol') as ScatterSymbolType;
      tweenScatterNode(mark, symbol, frame, { ...frame, radius: 0 }, motion);
    }
  );

  if (meshRect) {
    ctx.layerGroup.prepend(meshRect);
    let activeMeshIdx = -1;

    const clearMeshActive = () => {
      const previous = renderedNodes[activeMeshIdx];
      if (previous) {
        const prevEl = previous.mark;
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
      renderedNodes.forEach(({ frame }, idx) => {
        const dx = frame.px - lx;
        const dy = frame.py - ly;
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
      const targetEl = renderedNodes[nearestIdx]?.mark;
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
    const label = ctx.renderLabel(ctx.layerGroup, {
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
    const moving = movingNodes.get(node);
    if (!label || !moving) return;
    const transform = label.getAttribute('transform') ?? '';
    moving.motion(() => {
      const { px, py, radius } = moving.frame;
      label.setAttribute('transform', `translate(${px - node.px}, ${py - node.py - radius + node.radius}) ${transform}`);
      label.style.visibility = radius > 0 ? '' : 'hidden';
    }, () => {
      label.setAttribute('transform', transform);
      label.style.visibility = '';
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
