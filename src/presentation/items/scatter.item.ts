import { resolveElementAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext, ScatterSymbolType } from '../../core/types';
import type { ComputedScatterNodeModel } from '../../models/scatter.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Generates an SVG `<path d="...">` centered at `(cx, cy)` with radius `r`
 * for ECharts / Nivo scatter symbol shapes.
 */
export function buildScatterSymbolPath(
  symbol: ScatterSymbolType,
  cx: number,
  cy: number,
  r: number
): string {
  switch (symbol) {
    case 'rect': {
      const s = r * 0.88;
      return `M${cx - s},${cy - s} H${cx + s} V${cy + s} H${cx - s} Z`;
    }
    case 'roundRect': {
      const s = r * 0.9;
      const cr = Math.min(s * 0.42, 4);
      const x0 = cx - s;
      const y0 = cy - s;
      const x1 = cx + s;
      const y1 = cy + s;
      return `M${x0 + cr},${y0} H${x1 - cr} Q${x1},${y0} ${x1},${y0 + cr} V${y1 - cr} Q${x1},${y1} ${x1 - cr},${y1} H${x0 + cr} Q${x0},${y1} ${x0},${y1 - cr} V${y0 + cr} Q${x0},${y0} ${x0 + cr},${y0} Z`;
    }
    case 'triangle': {
      const w = r * 0.98;
      return `M${cx},${cy - r} L${cx + w},${cy + r * 0.84} L${cx - w},${cy + r * 0.84} Z`;
    }
    case 'diamond': {
      const d = r * 1.1;
      return `M${cx},${cy - d} L${cx + d},${cy} L${cx},${cy + d} L${cx - d},${cy} Z`;
    }
    case 'pin': {
      return `M${cx},${cy + r} C${cx - r * 0.88},${cy + r * 0.15} ${cx - r},${cy - r * 0.96} ${cx},${cy - r} C${cx + r},${cy - r * 0.96} ${cx + r * 0.88},${cy + r * 0.15} ${cx},${cy + r} Z`;
    }
    case 'arrow': {
      return `M${cx},${cy - r} L${cx + r * 0.9},${cy + r * 0.92} L${cx},${cy + r * 0.4} L${cx - r * 0.9},${cy + r * 0.92} Z`;
    }
    case 'cross': {
      const t = r * 0.34;
      return `M${cx - t},${cy - r} H${cx + t} V${cy - t} H${cx + r} V${cy + t} H${cx + t} V${cy + r} H${cx - t} V${cy + t} H${cx - r} V${cy - t} H${cx - t} Z`;
    }
    case 'star': {
      const outer = r * 1.12;
      const inner = r * 0.46;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? outer : inner;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = Math.round((cx + Math.cos(ang) * rad) * 100) / 100;
        const py = Math.round((cy + Math.sin(ang) * rad) * 100) / 100;
        pts.push(`${i === 0 ? 'M' : 'L'}${px},${py}`);
      }
      return `${pts.join(' ')} Z`;
    }
    case 'circle':
    default:
      return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`;
  }
}

export function showScatterNodeTooltip(
  node: ComputedScatterNodeModel,
  el: SVGElement,
  ctx: ChartRenderContext<any>,
  clientX: number,
  clientY: number
): void {
  const fallbackAnchor = {
    left: ctx.margin.left + node.px - node.radius,
    top: ctx.margin.top + node.py - node.radius,
    width: node.radius * 2,
    height: node.radius * 2,
    relative: true
  };
  const items = [
    { label: 'X', value: node.xValue, color: node.color },
    { label: 'Y', value: node.yValue, color: node.color }
  ];
  if (node.sizeValue !== 1) {
    items.push({ label: 'Size', value: node.sizeValue, color: node.color });
  }
  ctx.showTooltip(
    {
      title: node.label || node.seriesId,
      seriesId: node.seriesId,
      value: node.yValue,
      formattedValue: `(${node.xValue}, ${node.yValue})`,
      color: node.color,
      items,
      threshold: node.threshold,
      anchor: resolveElementAnchor(el, fallbackAnchor),
      datum: {
        seriesId: node.seriesId,
        label: node.label,
        x: node.xValue,
        y: node.yValue,
        size: node.sizeValue,
        isUnderThreshold: node.threshold.isUnderThreshold
      }
    },
    clientX,
    clientY
  );
}

/**
 * Dumb Presentation Renderer for a single Scatter / Bubble Node Item.
 */
export function renderScatterNodeItem(
  node: ComputedScatterNodeModel,
  ctx: ChartRenderContext<any>
): SVGElement {
  const isCircle = node.symbol === 'circle';
  const el: SVGElement = isCircle
    ? document.createElementNS(SVG_NS, 'circle')
    : document.createElementNS(SVG_NS, 'path');

  el.setAttribute('class', 'mc-scatter-node');
  el.setAttribute('data-item-component', 'mc-scatter-item');
  el.setAttribute('data-series', node.seriesId);
  el.setAttribute('data-node-index', String(node.index));
  el.setAttribute('data-symbol', node.symbol);
  el.setAttribute('cx', String(node.px));
  el.setAttribute('cy', String(node.py));
  el.setAttribute('r', String(node.radius));

  if (!isCircle) {
    el.setAttribute(
      'd',
      buildScatterSymbolPath(node.symbol, node.px, node.py, node.radius)
    );
  }
  if (node.symbolRotate !== 0) {
    el.setAttribute('data-symbol-rotate', String(node.symbolRotate));
    el.setAttribute(
      'transform',
      `rotate(${node.symbolRotate} ${node.px} ${node.py})`
    );
  }
  if (node.blendMode && node.blendMode !== 'normal') {
    el.setAttribute('data-blend-mode', node.blendMode);
    el.style.mixBlendMode = node.blendMode;
  }

  const scatterFill =
    (node.threshold.matched && node.threshold.style.fill
      ? ctx.resolveDefUrl?.(node.threshold.style.fill, node.color)
      : undefined) ??
    ctx.resolveFill?.({
      id: node.label || `${node.seriesId}-${node.index}`,
      seriesId: node.seriesId,
      key: node.seriesId,
      index: node.index,
      value: node.yValue,
      color: node.color,
      chartType: 'scatter',
      target: 'item',
      datum: {
        seriesId: node.seriesId,
        label: node.label,
        x: node.xValue,
        y: node.yValue,
        size: node.sizeValue
      }
    }) ??
    node.color;
  const baseOpacity = String(node.threshold.style.opacity ?? 0.74);
  el.setAttribute('fill', scatterFill);
  el.setAttribute('fill-opacity', baseOpacity);
  el.setAttribute('data-base-opacity', baseOpacity);
  el.setAttribute('stroke', node.threshold.style.stroke || node.color);
  el.setAttribute('stroke-width', '1.8');
  if (node.threshold.matched) {
    el.setAttribute('data-threshold-matched', 'true');
    el.setAttribute(
      'data-under-threshold',
      String(node.threshold.isUnderThreshold)
    );
  }
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    el.style.cursor = 'pointer';
  }

  const fallbackAnchor = {
    left: ctx.margin.left + node.px - node.radius,
    top: ctx.margin.top + node.py - node.radius,
    width: node.radius * 2,
    height: node.radius * 2,
    relative: true
  };

  ctx.decorateAriaItem(el, {
    type: 'scatter-node',
    index: node.index,
    total: node.totalNodes,
    id: node.label || `${node.seriesId}-${node.index}`,
    label: node.label || node.seriesId,
    seriesId: node.seriesId,
    category: `x=${node.xValue}`,
    value: node.yValue,
    formattedValue: `(${node.xValue}, ${node.yValue})`,
    color: node.color,
    anchor: fallbackAnchor,
    datum: {
      seriesId: node.seriesId,
      label: node.label,
      x: node.xValue,
      y: node.yValue,
      size: node.sizeValue,
      symbol: node.symbol,
      symbolRotate: node.symbolRotate,
      isUnderThreshold: node.threshold.isUnderThreshold
    }
  });

  ctx.animateItem(el, {
    type: 'point-pop',
    index: node.index,
    originX: node.px,
    originY: node.py
  });

  if (interactive) {
    el.addEventListener('mouseenter', (e) => {
      el.setAttribute('fill-opacity', '0.96');
      showScatterNodeTooltip(
        node,
        el,
        ctx,
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    el.addEventListener('mouseleave', () => {
      el.setAttribute('fill-opacity', baseOpacity);
      ctx.hideTooltip();
    });
  }

  ctx.registerEventTarget(el, {
    target: 'scatterPoint',
    category: 'item',
    id: node.label || `${node.seriesId}-${node.index}`,
    data: {
      id: node.label || `${node.seriesId}-${node.index}`,
      seriesId: node.seriesId,
      label: node.label,
      x: node.xValue,
      y: node.yValue,
      value: node.yValue,
      size: node.sizeValue,
      radius: node.radius,
      symbol: node.symbol,
      symbolRotate: node.symbolRotate,
      index: node.index,
      count: node.totalNodes,
      color: node.color,
      threshold: node.threshold
    }
  });

  return el;
}

export class MCScatterItem extends HTMLElement {}
