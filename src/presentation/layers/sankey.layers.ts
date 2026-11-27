import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { physicalTextAnchor } from '../../core/i18n';
import { renderLegendLayer } from '../../core/scale-manager';
import { allocateUniqueSvgId } from '../../core/threshold-clip';
import type { ChartRenderContext, SankeyData } from '../../core/types';
import {
  sankeyLinkPath,
  type ComputedSankeyNodeModel,
  type SankeyChartModel,
  type SankeyLinkGeometry
} from '../../models/sankey.model';
import {
  renderSankeyLinkItem,
  renderSankeyNodeItem
} from '../items/sankey.item';

interface NodeFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  isVertical: boolean;
}

const nodeFrames = new WeakMap<SVGGElement, NodeFrame>();
const previousNodes = new WeakMap<SVGSVGElement, Map<string, NodeFrame>>();
const movingNodes = new WeakMap<ComputedSankeyNodeModel, { frame: NodeFrame; motion: ItemMotion }>();
const linkFrames = new WeakMap<SVGGElement, { frame: SankeyLinkGeometry; gradient?: Element }>();
const nodeAttributes = ['x', 'y', 'width', 'height'] as const;
const linkFields = ['sx', 'sy', 'tx', 'ty', 'width', 'curveness'] as const;

function nodeFrame(node: ComputedSankeyNodeModel): NodeFrame {
  return {
    x: node.x0, y: node.y0,
    width: Math.max(4, node.x1 - node.x0),
    height: Math.max(4, node.y1 - node.y0),
    isVertical: node.isVertical
  };
}

function collapseNode(frame: NodeFrame): NodeFrame {
  return frame.isVertical
    ? { ...frame, x: frame.x + frame.width / 2, width: 0 }
    : { ...frame, y: frame.y + frame.height / 2, height: 0 };
}

function tweenNode(rect: Element, frame: NodeFrame, target: NodeFrame, motion: ItemMotion): void {
  const from = { ...frame };
  motion(t => {
    for (const attribute of nodeAttributes) {
      frame[attribute] = from[attribute] + (target[attribute] - from[attribute]) * t;
      rect.setAttribute(attribute, String(frame[attribute]));
    }
  });
}

function collapseLink(frame: SankeyLinkGeometry, source?: NodeFrame, target?: NodeFrame): SankeyLinkGeometry {
  const next = { ...frame, width: 0 };
  if (source?.isVertical === frame.isVertical) {
    next.sx = source.x + source.width / (frame.isVertical ? 2 : 1);
    next.sy = source.y + source.height / (frame.isVertical ? 1 : 2);
  }
  if (target?.isVertical === frame.isVertical) {
    next.tx = target.x + (frame.isVertical ? target.width / 2 : 0);
    next.ty = target.y + (frame.isVertical ? 0 : target.height / 2);
  }
  return next;
}

function tweenLink(
  path: Element,
  frame: SankeyLinkGeometry,
  target: SankeyLinkGeometry,
  motion: ItemMotion,
  gradient?: Element
): void {
  const from = { ...frame };
  const axis = frame.isVertical ? 'y' : 'x';
  motion(t => {
    for (const key of linkFields) frame[key] = from[key] + (target[key] - from[key]) * t;
    path.setAttribute('d', sankeyLinkPath(frame));
    gradient?.setAttribute(`${axis}1`, String(frame.isVertical ? frame.sy : frame.sx));
    gradient?.setAttribute(`${axis}2`, String(frame.isVertical ? frame.ty : frame.tx));
  });
}

function retainSankeyGradient(group: SVGGElement, path: Element, gradient?: Element): void {
  if (!gradient || gradient.isConnected) return;
  // A link's old index may have been reassigned to a different ribbon.
  gradient.id = allocateUniqueSvgId('mc-sankey-exit-gradient');
  const defs = group.ownerDocument.createElementNS(group.namespaceURI, 'defs');
  defs.append(gradient);
  group.prepend(defs);
  const paint = `url(#${gradient.id})`;
  path.setAttribute('fill', paint);
  path.setAttribute('stroke', paint);
}

export function renderSankeyLinksLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>,
  defs?: Element | null
): void {
  const priorNodes = previousNodes.get(ctx.svg);
  const nextNodes = new Map(model.nodes.map(node => [node.id, nodeFrame(node)]));
  joinChartItems(
    ctx.layerGroup,
    model.links,
    link => JSON.stringify([link.source.id, link.target.id]),
    ctx.animationConfig,
    (group, link, { initial, motion }) => {
      const path = renderSankeyLinkItem(link, ctx, defs, initial);
      group.replaceChildren(path);
      const candidate = defs?.lastElementChild;
      const gradient = candidate?.id === link.gradientId ? candidate : undefined;
      const { sx, sy, tx, ty, width, curveness, isVertical } = link;
      const target = { sx, sy, tx, ty, width, curveness, isVertical };
      const old = linkFrames.get(group)?.frame;
      const state = { frame: target, gradient };
      linkFrames.set(group, state);
      if (!motion || (old && old.isVertical !== isVertical)) return;
      const from = old ?? collapseLink(target, priorNodes?.get(link.source.id), priorNodes?.get(link.target.id));
      if (linkFields.every(field => from[field] === target[field])) return;
      state.frame = { ...from };
      path.setAttribute('data-animated', 'true');
      tweenLink(path, state.frame, target, motion, gradient);
    },
    (group, motion) => {
      const state = linkFrames.get(group);
      const path = group.querySelector('.mc-sankey-link');
      if (!state || !path) return;
      retainSankeyGradient(group, path, state.gradient);
      const source = path.getAttribute('data-source') ?? '';
      const target = path.getAttribute('data-target') ?? '';
      const collapsed = collapseLink(state.frame, nextNodes.get(source), nextNodes.get(target));
      tweenLink(path, state.frame, collapsed, motion, state.gradient);
    }
  );
}

export function renderSankeyNodesLayer(
  model: SankeyChartModel,
  ctx: ChartRenderContext<SankeyData>
): void {
  const renderedNodes = new Map<string, NodeFrame>();
  joinChartItems(
    ctx.layerGroup,
    model.nodes,
    node => node.id,
    ctx.animationConfig,
    (group, node, { initial, motion }) => {
      const mark = renderSankeyNodeItem(node, ctx, initial);
      group.replaceChildren(mark);
      const target = nodeFrame(node);
      const prior = nodeFrames.get(group);
      nodeFrames.set(group, target);
      renderedNodes.set(node.id, target);
      if (!motion || (prior && prior.isVertical !== target.isVertical)) return;
      const from = prior ?? collapseNode(target);
      if (nodeAttributes.every(attribute => from[attribute] === target[attribute])) return;
      const frame = { ...from };
      nodeFrames.set(group, frame);
      renderedNodes.set(node.id, frame);
      movingNodes.set(node, { frame, motion });
      mark.setAttribute('data-animated', 'true');
      tweenNode(mark, frame, target, motion);
    },
    (group, motion) => {
      const frame = nodeFrames.get(group);
      const mark = group.querySelector('.mc-sankey-node');
      if (frame && mark) tweenNode(mark, frame, collapseNode(frame), motion);
    }
  );
  previousNodes.set(ctx.svg, renderedNodes);
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

    const label = ctx.renderLabel(ctx.layerGroup, {
      id: `sankey-label-${node.id}`,
      text: `${node.name} (${ctx.i18n.formatNumber(node.value, { useGrouping: false })})`,
      x: lx,
      y: ly,
      type: 'node',
      anchor: physicalTextAnchor(anchor, ctx.i18n.direction),
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
    const moving = movingNodes.get(node);
    if (!label || !moving) return;
    const transform = label.getAttribute('transform') ?? '';
    const target = nodeFrame(node);
    moving.motion(() => {
      const { x, y, width, height } = moving.frame;
      const dx = x - target.x + (width - target.width) / 2;
      const dy = y - target.y + (height - target.height) / 2;
      label.setAttribute('transform', `translate(${dx}, ${dy}) ${transform}`);
      label.style.visibility = width > 0 && height > 0 ? '' : 'hidden';
    }, () => {
      label.setAttribute('transform', transform);
      label.style.visibility = '';
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
