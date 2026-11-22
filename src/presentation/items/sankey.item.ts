import { format } from 'd3';
import type { ChartRenderContext } from '../../core/types';
import type {
  ComputedSankeyLinkModel,
  ComputedSankeyNodeModel
} from '../../models/sankey.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Sankey Flow Link Item.
 */
export function renderSankeyLinkItem(
  link: ComputedSankeyLinkModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGPathElement {
  if (defs) {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', link.gradientId);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', String(link.source.x1));
    grad.setAttribute('x2', String(link.target.x0));

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
  path.setAttribute('data-source', link.source.id);
  path.setAttribute('data-target', link.target.id);
  path.setAttribute('d', link.pathD);
  path.setAttribute('fill', 'none');
  path.setAttribute(
    'stroke',
    defs ? `url(#${link.gradientId})` : link.source.color
  );
  path.setAttribute('stroke-width', String(link.width));
  path.setAttribute('stroke-opacity', String(link.opacity));
  path.style.cursor = 'pointer';
  path.style.transition = 'stroke-opacity 150ms ease';

  ctx.decorateAriaItem(path, {
    type: 'sankey-link',
    index: link.index,
    total: link.totalLinks,
    id: link.id,
    label: `${link.source.name} → ${link.target.name}`,
    source: link.source.name,
    target: link.target.name,
    value: link.value,
    formattedValue: String(link.value),
    color: link.source.color,
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

  path.addEventListener('mouseenter', (e) => {
    path.setAttribute(
      'stroke-opacity',
      String(Math.min(0.9, link.opacity + 0.35))
    );
    ctx.showTooltip(
      `<strong>${link.source.name} → ${
        link.target.name
      }</strong><br/>Flow: <b>${format(',')(link.value)}</b>`,
      (e as MouseEvent).clientX,
      (e as MouseEvent).clientY
    );
  });
  path.addEventListener('mouseleave', () => {
    path.setAttribute('stroke-opacity', String(link.opacity));
    ctx.hideTooltip();
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
  rect.setAttribute('x', String(node.x0));
  rect.setAttribute('y', String(node.y0));
  rect.setAttribute('width', String(Math.max(4, node.x1 - node.x0)));
  rect.setAttribute('height', String(Math.max(4, node.y1 - node.y0)));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', node.color);
  rect.style.cursor = 'pointer';

  ctx.decorateAriaItem(rect, {
    type: 'sankey-node',
    index: node.index,
    total: node.totalNodes,
    id: node.id,
    label: node.name,
    value: node.value,
    formattedValue: String(node.value),
    color: node.color,
    datum: {
      id: node.id,
      name: node.name,
      column: node.column,
      value: node.value
    }
  });

  ctx.animateItem(rect, {
    type: 'bar-vertical',
    index: node.index,
    originX: (node.x0 + node.x1) / 2,
    originY: node.y1
  });

  rect.addEventListener('mouseenter', (e) => {
    ctx.showTooltip(
      `<strong>${node.name}</strong><br/>Total Flow: <b>${format(',')(
        node.value
      )}</b>`,
      (e as MouseEvent).clientX,
      (e as MouseEvent).clientY
    );
  });
  rect.addEventListener('mouseleave', () => {
    ctx.hideTooltip();
  });

  return rect;
}

export class MCSankeyNodeItem extends HTMLElement {}
export class MCSankeyLinkItem extends HTMLElement {}
