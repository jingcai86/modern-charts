import { HTMLElementBase } from '../../core/dom';
import { formatGroupedNumber } from '../../core/format';
import {
  resolveChartPointAnchor,
  resolveElementAnchor
} from '../../core/tooltip-anchor';
import type { ChartRenderContext } from '../../core/types';
import {
  computeSankeyFocusSet,
  type ComputedSankeyLinkModel,
  type ComputedSankeyNodeModel,
  type SankeyChartModel
} from '../../models/sankey.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

function applySankeyFocusHighlight(
  ctx: ChartRenderContext<any>,
  target: { kind: 'node' | 'link'; id: string }
): void {
  const model = ctx.state?.model as SankeyChartModel | undefined;
  if (!model) return;
  const focusSet = computeSankeyFocusSet(model, target, model.focusMode);
  if (!focusSet) return;

  const { activeNodeIds, activeLinkIds } = focusSet;
  const root = ctx.rootGroup;

  root.querySelectorAll<SVGRectElement>('.mc-sankey-node').forEach((nodeEl) => {
    const nodeId = nodeEl.getAttribute('data-node-id') ?? '';
    const isActive = activeNodeIds.has(nodeId);
    nodeEl.setAttribute('data-focus-state', isActive ? 'active' : 'dimmed');
    nodeEl.style.opacity = isActive ? '1' : '0.22';
  });

  root.querySelectorAll<SVGPathElement>('.mc-sankey-link').forEach((linkEl) => {
    const linkId = linkEl.getAttribute('data-link-id') ?? '';
    const baseOpacity = Number(
      linkEl.getAttribute('data-base-opacity') ?? model.links[0]?.opacity ?? 0.42
    );
    const isActive = activeLinkIds.has(linkId);
    const nextOpacity = String(
      isActive
        ? Math.min(0.92, baseOpacity + 0.35)
        : Math.max(0.06, baseOpacity * 0.18)
    );
    linkEl.setAttribute('data-focus-state', isActive ? 'active' : 'dimmed');
    linkEl.setAttribute('fill-opacity', nextOpacity);
    linkEl.setAttribute('stroke-opacity', nextOpacity);
  });
}

function clearSankeyFocusHighlight(ctx: ChartRenderContext<any>): void {
  const root = ctx.rootGroup;
  root.querySelectorAll<SVGRectElement>('.mc-sankey-node').forEach((nodeEl) => {
    nodeEl.removeAttribute('data-focus-state');
    nodeEl.style.opacity = '';
  });
  root.querySelectorAll<SVGPathElement>('.mc-sankey-link').forEach((linkEl) => {
    const baseOpacity = linkEl.getAttribute('data-base-opacity') ?? '0.42';
    linkEl.removeAttribute('data-focus-state');
    linkEl.setAttribute('fill-opacity', baseOpacity);
    linkEl.setAttribute('stroke-opacity', baseOpacity);
  });
}

/**
 * Dumb Presentation Renderer for a single Sankey Flow Link Item.
 */
export function renderSankeyLinkItem(
  link: ComputedSankeyLinkModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGPathElement {
  const customLinkStroke =
    ctx.resolveFill?.({
      id: link.id,
      seriesId: link.source.id,
      category: link.target.id,
      index: link.index,
      value: link.value,
      color: link.source.color,
      chartType: 'sankey',
      target: 'link',
      datum: {
        id: link.id,
        source: link.source.id,
        target: link.target.id,
        value: link.value
      }
    }) ?? link.source.color;
  const hasCustomLinkStroke = customLinkStroke !== link.source.color;

  if (defs && !hasCustomLinkStroke) {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', link.gradientId);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    if (link.isVertical) {
      grad.setAttribute('x1', '0');
      grad.setAttribute('y1', String(link.sy));
      grad.setAttribute('x2', '0');
      grad.setAttribute('y2', String(link.ty));
    } else {
      grad.setAttribute('x1', String(link.sx));
      grad.setAttribute('y1', '0');
      grad.setAttribute('x2', String(link.tx));
      grad.setAttribute('y2', '0');
    }

    const s1 = document.createElementNS(SVG_NS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', link.source.color);

    const s2 = document.createElementNS(SVG_NS, 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', link.target.color);

    grad.append(s1, s2);
    defs.appendChild(grad);
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-sankey-link');
  path.setAttribute('data-item-component', 'mc-sankey-link-item');
  path.setAttribute('data-link-id', link.id);
  path.setAttribute('data-source', link.source.id);
  path.setAttribute('data-target', link.target.id);
  path.setAttribute('data-base-opacity', String(link.opacity));
  const linkPaint = hasCustomLinkStroke
    ? customLinkStroke
    : defs
      ? `url(#${link.gradientId})`
      : link.source.color;
  path.setAttribute('d', link.pathD);
  path.setAttribute('fill', linkPaint);
  path.setAttribute('fill-opacity', String(link.opacity));
  path.setAttribute('stroke', linkPaint);
  path.setAttribute('stroke-width', '0');
  path.setAttribute('stroke-opacity', String(link.opacity));
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    path.style.cursor = 'pointer';
    path.style.transition = 'fill-opacity 150ms ease, stroke-opacity 150ms ease';
  }

  const midX = (link.sx + link.tx) / 2;
  const midY = (link.sy + link.ty) / 2;
  const anchorW = link.isVertical ? Math.max(8, link.width) : 16;
  const anchorH = link.isVertical ? 16 : Math.max(8, link.width);
  const getLinkAnchor = () =>
    resolveChartPointAnchor(ctx, midX, midY, anchorW, anchorH);

  ctx.decorateAriaItem(path, {
    type: 'sankey-link',
    index: link.index,
    total: link.totalLinks,
    id: link.id,
    label: `${link.source.name} → ${link.target.name}`,
    source: link.source.name,
    target: link.target.name,
    value: link.value,
    formattedValue: ctx.i18n.formatNumber(link.value, { useGrouping: false }),
    color: link.source.color,
    anchor: {
      left: ctx.margin.left + midX - anchorW / 2,
      top: ctx.margin.top + midY - anchorH / 2,
      width: anchorW,
      height: anchorH,
      relative: true
    },
    datum: {
      source: link.source.id,
      sourceName: link.source.name,
      target: link.target.id,
      targetName: link.target.name,
      value: link.value
    }
  });

  ctx.animateItem(path, {
    type: 'sankey-flow',
    index: link.index
  });

  if (interactive) {
    path.addEventListener('mouseenter', (e) => {
      const hoverOpacity = String(Math.min(0.92, link.opacity + 0.35));
      path.setAttribute('fill-opacity', hoverOpacity);
      path.setAttribute('stroke-opacity', hoverOpacity);
      applySankeyFocusHighlight(ctx, { kind: 'link', id: link.id });
      ctx.showTooltip(
        {
          title: `${link.source.name} → ${link.target.name}`,
          label: ctx.i18n.messages.flow,
          value: link.value,
          formattedValue: formatGroupedNumber(link.value, ctx.i18n),
          color: link.source.color,
          anchor: getLinkAnchor(),
          datum: {
            source: link.source.id,
            sourceName: link.source.name,
            target: link.target.id,
            targetName: link.target.name,
            value: link.value
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    path.addEventListener('mouseleave', () => {
      clearSankeyFocusHighlight(ctx);
      path.setAttribute('fill-opacity', String(link.opacity));
      path.setAttribute('stroke-opacity', String(link.opacity));
      ctx.hideTooltip();
    });
    path.addEventListener('focus', () => {
      applySankeyFocusHighlight(ctx, { kind: 'link', id: link.id });
    });
    path.addEventListener('blur', () => {
      clearSankeyFocusHighlight(ctx);
    });
  }

  ctx.registerEventTarget(path, {
    target: 'sankeyLink',
    category: 'item',
    id: link.id,
    data: {
      id: link.id,
      source: link.source.id,
      sourceName: link.source.name,
      target: link.target.id,
      targetName: link.target.name,
      value: link.value,
      index: link.index,
      count: link.totalLinks,
      width: link.width,
      color: link.source.color
    }
  });

  return path;
}

/**
 * Dumb Presentation Renderer for a single Sankey Node Item.
 */
export function renderSankeyNodeItem(
  node: ComputedSankeyNodeModel,
  ctx: ChartRenderContext<any>
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', 'mc-sankey-node');
  rect.setAttribute('data-item-component', 'mc-sankey-node-item');
  rect.setAttribute('data-node-id', node.id);
  rect.setAttribute('data-column', String(node.column));
  rect.setAttribute('x', String(node.x0));
  rect.setAttribute('y', String(node.y0));
  rect.setAttribute('width', String(Math.max(4, node.x1 - node.x0)));
  rect.setAttribute('height', String(Math.max(4, node.y1 - node.y0)));
  rect.setAttribute('rx', String(node.borderRadius));
  const nodeFill =
    ctx.resolveFill?.({
      id: node.id,
      seriesId: node.id,
      category: node.name,
      index: node.index,
      value: node.value,
      color: node.color,
      chartType: 'sankey',
      target: 'node',
      datum: node
    }) ?? node.color;
  rect.setAttribute('fill', nodeFill);
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    rect.style.cursor = 'pointer';
    rect.style.transition = 'opacity 150ms ease';
  }

  const fallbackAnchor = {
    left: ctx.margin.left + node.x0,
    top: ctx.margin.top + node.y0,
    width: Math.max(4, node.x1 - node.x0),
    height: Math.max(4, node.y1 - node.y0),
    relative: true
  };

  ctx.decorateAriaItem(rect, {
    type: 'sankey-node',
    index: node.index,
    total: node.totalNodes,
    id: node.id,
    label: node.name,
    value: node.value,
    formattedValue: ctx.i18n.formatNumber(node.value, { useGrouping: false }),
    color: node.color,
    anchor: fallbackAnchor,
    datum: {
      id: node.id,
      name: node.name,
      column: node.column,
      value: node.value
    }
  });

  ctx.animateItem(rect, {
    type: node.isVertical ? 'bar-horizontal' : 'bar-vertical',
    index: node.index,
    originX: node.isVertical ? node.x0 : (node.x0 + node.x1) / 2,
    originY: node.isVertical ? (node.y0 + node.y1) / 2 : node.y1
  });

  if (interactive) {
    rect.addEventListener('mouseenter', (e) => {
      applySankeyFocusHighlight(ctx, { kind: 'node', id: node.id });
      ctx.showTooltip(
        {
          title: node.name,
          label: ctx.i18n.messages.totalFlow,
          value: node.value,
          formattedValue: formatGroupedNumber(node.value, ctx.i18n),
          color: node.color,
          anchor: resolveElementAnchor(rect, fallbackAnchor),
          datum: {
            id: node.id,
            name: node.name,
            column: node.column,
            value: node.value
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    rect.addEventListener('mouseleave', () => {
      clearSankeyFocusHighlight(ctx);
      ctx.hideTooltip();
    });
    rect.addEventListener('focus', () => {
      applySankeyFocusHighlight(ctx, { kind: 'node', id: node.id });
    });
    rect.addEventListener('blur', () => {
      clearSankeyFocusHighlight(ctx);
    });
  }

  ctx.registerEventTarget(rect, {
    target: 'sankeyNode',
    category: 'item',
    id: node.id,
    data: {
      id: node.id,
      name: node.name,
      column: node.column,
      value: node.value,
      index: node.index,
      count: node.totalNodes,
      color: node.color,
      bounds: {
        x: node.x0,
        y: node.y0,
        width: Math.max(4, node.x1 - node.x0),
        height: Math.max(4, node.y1 - node.y0)
      }
    }
  });

  return rect;
}

export class MCSankeyNodeItem extends HTMLElementBase {}
export class MCSankeyLinkItem extends HTMLElementBase {}
