import { formatGroupedNumber } from '../../core/format';
import { resolveElementAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext } from '../../core/types';
import type { ComputedHeatmapCellModel } from '../../models/heatmap.model';
import type { ComputedTreemapLeafModel } from '../../models/treemap.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Heatmap Matrix Cell Item.
 */
export function renderHeatmapCellItem(
  cell: ComputedHeatmapCellModel,
  ctx: ChartRenderContext<any>
): SVGElement {
  let node: SVGElement;
  if (cell.shape === 'circle') {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(cell.x + cell.width / 2));
    circle.setAttribute('cy', String(cell.y + cell.height / 2));
    circle.setAttribute(
      'r',
      String(Math.max(4, Math.min(cell.width, cell.height) / 2))
    );
    node = circle;
  } else {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(cell.x));
    rect.setAttribute('y', String(cell.y));
    rect.setAttribute('width', String(cell.width));
    rect.setAttribute('height', String(cell.height));
    rect.setAttribute('rx', String(cell.rx));
    node = rect;
  }

  node.setAttribute('class', 'mc-heatmap-cell');
  node.setAttribute('data-item-component', 'mc-cell-item');
  node.setAttribute('data-row', cell.rowId);
  node.setAttribute('data-col', cell.colId);
  node.setAttribute('fill', cell.color);
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    node.style.cursor = 'pointer';
    node.style.transition = 'transform 140ms ease, filter 140ms ease';
  }

  const fallbackAnchor = {
    left: ctx.margin.left + cell.x,
    top: ctx.margin.top + cell.y,
    width: cell.width,
    height: cell.height,
    relative: true
  };

  ctx.decorateAriaItem(node, {
    type: 'cell',
    index: cell.index,
    total: cell.totalCount,
    id: `${cell.rowId}-${cell.colId}`,
    label: `${cell.rowId} × ${cell.colId}`,
    seriesId: cell.rowId,
    category: cell.colId,
    value: cell.value,
    formattedValue: String(cell.value),
    color: cell.color,
    anchor: fallbackAnchor,
    datum: {
      rowId: cell.rowId,
      colId: cell.colId,
      x: cell.colId,
      y: cell.value,
      value: cell.value
    }
  });

  ctx.animateItem(node, {
    type: 'cell-pop',
    index: cell.index,
    originX: cell.x + cell.width / 2,
    originY: cell.y + cell.height / 2
  });

  if (interactive) {
    node.addEventListener('mouseenter', (e) => {
      node.style.filter = 'brightness(1.12)';
      ctx.showTooltip(
        {
          title: `${cell.rowId} × ${cell.colId}`,
          label: 'Value',
          seriesId: cell.rowId,
          category: cell.colId,
          value: cell.value,
          formattedValue: String(cell.value),
          color: cell.color,
          anchor: resolveElementAnchor(node, fallbackAnchor),
          datum: {
            rowId: cell.rowId,
            colId: cell.colId,
            x: cell.colId,
            y: cell.value,
            value: cell.value
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    node.addEventListener('mouseleave', () => {
      node.style.filter = 'none';
      ctx.hideTooltip();
    });
  }

  return node;
}

/**
 * Dumb Presentation Renderer for a single Treemap Tile Item.
 */
export function renderTreemapTileItem(
  leaf: ComputedTreemapLeafModel,
  ctx: ChartRenderContext<any>
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', 'mc-treemap-tile');
  rect.setAttribute('data-item-component', 'mc-cell-item');
  rect.setAttribute('data-name', leaf.name);
  rect.setAttribute('x', String(leaf.x0));
  rect.setAttribute('y', String(leaf.y0));
  rect.setAttribute('width', String(leaf.width));
  rect.setAttribute('height', String(leaf.height));
  rect.setAttribute('rx', String(leaf.rx));
  rect.setAttribute('fill', leaf.color);
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    rect.style.cursor = 'pointer';
    rect.style.transition = 'filter 140ms ease';
  }

  const fallbackAnchor = {
    left: ctx.margin.left + leaf.x0,
    top: ctx.margin.top + leaf.y0,
    width: leaf.width,
    height: leaf.height,
    relative: true
  };

  ctx.decorateAriaItem(rect, {
    type: 'treemap-tile',
    index: leaf.index,
    total: leaf.totalLeaves,
    id: leaf.name,
    label: leaf.name,
    category: leaf.category,
    value: leaf.value,
    formattedValue: String(leaf.value),
    color: leaf.color,
    anchor: fallbackAnchor,
    datum: {
      name: leaf.name,
      category: leaf.category,
      value: leaf.value
    }
  });

  ctx.animateItem(rect, {
    type: 'cell-pop',
    index: leaf.index,
    originX: leaf.x0 + leaf.width / 2,
    originY: leaf.y0 + leaf.height / 2
  });

  if (interactive) {
    rect.addEventListener('mouseenter', (e) => {
      rect.style.filter = 'brightness(1.1)';
      ctx.showTooltip(
        {
          title: `${leaf.category} › ${leaf.name}`,
          label: 'Value',
          category: leaf.category,
          value: leaf.value,
          formattedValue: formatGroupedNumber(leaf.value),
          color: leaf.color,
          anchor: resolveElementAnchor(rect, fallbackAnchor),
          datum: {
            name: leaf.name,
            category: leaf.category,
            value: leaf.value
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    rect.addEventListener('mouseleave', () => {
      rect.style.filter = 'none';
      ctx.hideTooltip();
    });
  }

  return rect;
}

export class MCCellItem extends HTMLElement {}
