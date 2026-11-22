import type { ChartRenderContext } from '../../core/types';
import type { ComputedBarItemModel } from '../../models/bar.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Bar Item.
 * Receives pre-computed geometry and threshold styles from `BarChartModel`
 * and only performs SVG DOM presentation, ARIA decoration, and animation.
 */
export function renderBarItem(
  b: ComputedBarItemModel,
  ctx: ChartRenderContext<any>
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  const customCls = b.threshold.style.className
    ? ` ${b.threshold.style.className}`
    : '';
  const threshCls = b.threshold.matched
    ? ` mc-bar-rect--threshold-matched${
        b.threshold.isUnderThreshold ? ' mc-bar-rect--under-threshold' : ''
      }`
    : '';

  rect.setAttribute('class', `mc-bar-rect${threshCls}${customCls}`);
  rect.setAttribute('data-item-component', 'mc-bar-item');
  rect.setAttribute('data-key', b.key);
  rect.setAttribute('data-index', b.indexValue);
  rect.setAttribute('x', String(b.x));
  rect.setAttribute('y', String(b.y));
  rect.setAttribute('width', String(b.width));
  rect.setAttribute('height', String(b.height));
  rect.setAttribute('rx', String(b.rx));
  rect.setAttribute('fill', b.color);

  if (b.threshold.matched) {
    rect.setAttribute('data-threshold-matched', 'true');
    rect.setAttribute(
      'data-under-threshold',
      String(b.threshold.isUnderThreshold)
    );
    rect.setAttribute(
      'data-threshold-ids',
      b.threshold.matchedMarkerIds.join(',')
    );
    if (b.threshold.style.stroke) {
      rect.setAttribute('stroke', b.threshold.style.stroke);
      rect.setAttribute(
        'stroke-width',
        String(b.threshold.style.strokeWidth ?? 1.8)
      );
    }
    if (b.threshold.style.strokeDasharray) {
      rect.setAttribute('stroke-dasharray', b.threshold.style.strokeDasharray);
    }
    if (b.threshold.style.opacity !== undefined) {
      rect.setAttribute('fill-opacity', String(b.threshold.style.opacity));
    }
  }

  rect.style.cursor = 'pointer';
  rect.style.transition = 'filter 140ms ease, opacity 140ms ease';

  ctx.decorateAriaItem(rect, {
    type: 'bar',
    index: b.index,
    total: b.total,
    id: b.id,
    label: `${b.key} in ${b.indexValue}`,
    seriesId: b.key,
    category: b.indexValue,
    value: b.value,
    formattedValue: String(b.value),
    color: b.color,
    datum: {
      id: b.key,
      key: b.key,
      indexValue: b.indexValue,
      category: b.indexValue,
      value: b.value,
      formattedValue: String(b.value),
      isUnderThreshold: b.threshold.isUnderThreshold,
      thresholdMatched: b.threshold.matched,
      ...b.datum
    }
  });

  ctx.animateItem(rect, {
    type: b.isHorizontal ? 'bar-horizontal' : 'bar-vertical',
    index: b.index,
    originX: b.isHorizontal ? b.x : b.x + b.width / 2,
    originY: b.isHorizontal ? b.y + b.height / 2 : b.y + b.height
  });

  rect.addEventListener('mouseenter', (e) => {
    rect.style.filter = 'brightness(1.1)';
    ctx.showTooltip(
      {
        title: b.indexValue,
        label: b.key,
        seriesId: b.key,
        category: b.indexValue,
        value: b.value,
        formattedValue: String(b.value),
        color: b.color,
        badge: b.threshold.isUnderThreshold
          ? `⚠ Under Threshold (${b.threshold.matchedMarkerIds.join(', ')})`
          : undefined,
        threshold: b.threshold,
        datum: {
          key: b.key,
          indexValue: b.indexValue,
          value: b.value,
          ...b.datum
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

  return rect;
}

/**
 * `<mc-bar-item>` Dumb Presentation Web Component
 * Can also be used standalone or inspected as the presentation component for a bar item.
 */
export class MCBarItem extends HTMLElement {
  #model: ComputedBarItemModel | null = null;

  constructor() {
    super();
  }

  get model(): ComputedBarItemModel | null {
    return this.#model;
  }
  set model(val: ComputedBarItemModel | null) {
    this.#model = val;
  }

  public renderSvg(ctx: ChartRenderContext<any>): SVGRectElement | null {
    if (!this.#model) return null;
    return renderBarItem(this.#model, ctx);
  }
}
