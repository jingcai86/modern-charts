import type { ChartRenderContext } from '../../core/types';
import type { ComputedScatterNodeModel } from '../../models/scatter.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Scatter / Bubble Node Item.
 */
export function renderScatterNodeItem(
  node: ComputedScatterNodeModel,
  ctx: ChartRenderContext<any>
): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('class', 'mc-scatter-node');
  circle.setAttribute('data-item-component', 'mc-scatter-item');
  circle.setAttribute('data-series', node.seriesId);
  circle.setAttribute('cx', String(node.px));
  circle.setAttribute('cy', String(node.py));
  circle.setAttribute('r', String(node.radius));
  circle.setAttribute('fill', node.color);
  circle.setAttribute(
    'fill-opacity',
    String(node.threshold.style.opacity ?? 0.74)
  );
  circle.setAttribute('stroke', node.threshold.style.stroke || node.color);
  circle.setAttribute('stroke-width', '1.8');
  if (node.threshold.matched) {
    circle.setAttribute('data-threshold-matched', 'true');
    circle.setAttribute(
      'data-under-threshold',
      String(node.threshold.isUnderThreshold)
    );
  }
  circle.style.cursor = 'pointer';

  ctx.decorateAriaItem(circle, {
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
    datum: {
      seriesId: node.seriesId,
      label: node.label,
      x: node.xValue,
      y: node.yValue,
      size: node.sizeValue,
      isUnderThreshold: node.threshold.isUnderThreshold
    }
  });

  ctx.animateItem(circle, {
    type: 'point-pop',
    index: node.index,
    originX: node.px,
    originY: node.py
  });

  circle.addEventListener('mouseenter', (e) => {
    circle.setAttribute('fill-opacity', '0.96');
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
        datum: {
          seriesId: node.seriesId,
          label: node.label,
          x: node.xValue,
          y: node.yValue,
          size: node.sizeValue,
          isUnderThreshold: node.threshold.isUnderThreshold
        }
      },
      (e as MouseEvent).clientX,
      (e as MouseEvent).clientY
    );
  });
  circle.addEventListener('mouseleave', () => {
    circle.setAttribute('fill-opacity', '0.74');
    ctx.hideTooltip();
  });

  return circle;
}

export class MCScatterItem extends HTMLElement {}
