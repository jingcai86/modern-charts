import type { ChartRenderContext } from '../../core/types';
import type {
  ComputedLinePointModel,
  ComputedLineSeriesModel
} from '../../models/line.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Line Area fill item.
 */
export function renderLineAreaItem(
  series: ComputedLineSeriesModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGPathElement | null {
  if (!series.areaPathD) return null;

  const gradId = `mc-line-area-grad-${series.index}`;
  if (defs) {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');

    const stop1 = document.createElementNS(SVG_NS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', series.color);
    stop1.setAttribute(
      'stop-opacity',
      String(Math.min(0.65, series.areaOpacity * 1.9))
    );

    const stop2 = document.createElementNS(SVG_NS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', series.color);
    stop2.setAttribute('stop-opacity', '0.02');

    grad.append(stop1, stop2);
    defs.appendChild(grad);
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-line-area');
  path.setAttribute('data-item-component', 'mc-line-area-item');
  path.setAttribute('d', series.areaPathD);
  path.setAttribute('fill', defs ? `url(#${gradId})` : series.color);
  if (!defs) path.setAttribute('fill-opacity', String(series.areaOpacity));
  ctx.animateItem(path, { type: 'area-fade', index: series.index });
  return path;
}

/**
 * Dumb Presentation Renderer for a single Line Path item.
 */
export function renderLinePathItem(
  series: ComputedLineSeriesModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGPathElement | null {
  if (!series.linePathD) return null;

  const yThresholdMarker = ctx.markers.find(
    (m) =>
      m.axis === 'y' &&
      (m.condition === 'below' ||
        m.condition === 'under' ||
        m.condition === 'lte' ||
        m.condition === 'between')
  );

  let strokeValue = series.color;
  if (defs && yThresholdMarker && series.hasThresholdMatches) {
    const threshY =
      yThresholdMarker.pixelPos ??
      Math.min(
        yThresholdMarker.pixelFrom ?? 0,
        yThresholdMarker.pixelTo ?? 0
      );
    const pct = Math.max(
      0,
      Math.min(100, (threshY / Math.max(1, ctx.innerHeight)) * 100)
    );
    const underColor =
      yThresholdMarker.matchStyle?.stroke ||
      yThresholdMarker.matchStyle?.color ||
      yThresholdMarker.stroke ||
      '#ef4444';
    const gradId = `mc-line-thresh-grad-${series.index}`;

    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', String(ctx.innerHeight));

    const sTop = document.createElementNS(SVG_NS, 'stop');
    sTop.setAttribute('offset', `${pct}%`);
    sTop.setAttribute('stop-color', series.color);

    const sBot = document.createElementNS(SVG_NS, 'stop');
    sBot.setAttribute('offset', `${pct}%`);
    sBot.setAttribute('stop-color', underColor);

    grad.append(sTop, sBot);
    defs.appendChild(grad);
    strokeValue = `url(#${gradId})`;
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-line-path');
  path.setAttribute('data-item-component', 'mc-line-item');
  path.setAttribute('data-series-id', series.id);
  if (series.hasThresholdMatches) {
    path.setAttribute('data-has-threshold-matches', 'true');
  }
  path.setAttribute('d', series.linePathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', strokeValue);
  path.setAttribute('stroke-width', String(series.strokeWidth));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  ctx.animateItem(path, { type: 'line-draw', index: series.index });
  return path;
}

/**
 * Dumb Presentation Renderer for a single Line Point item.
 */
export function renderLinePointItem(
  pt: ComputedLinePointModel,
  ctx: ChartRenderContext<any>
): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, 'circle');
  const radius = pt.radius;
  const customCls = pt.threshold.style.className
    ? ` ${pt.threshold.style.className}`
    : '';
  const threshCls = pt.threshold.matched
    ? ` mc-line-point--threshold-matched${
        pt.threshold.isUnderThreshold ? ' mc-line-point--under-threshold' : ''
      }`
    : '';

  circle.setAttribute('class', `mc-line-point${threshCls}${customCls}`);
  circle.setAttribute('data-item-component', 'mc-point-item');
  circle.setAttribute('data-series-id', pt.seriesId);
  circle.setAttribute('data-point-index', String(pt.pointIndex));
  circle.setAttribute('cx', String(pt.px));
  circle.setAttribute('cy', String(pt.py));
  circle.setAttribute('r', String(radius));
  circle.setAttribute(
    'fill',
    pt.threshold.matched ? pt.color : ctx.theme.background
  );
  circle.setAttribute('stroke', pt.threshold.style.stroke || pt.color);
  circle.setAttribute(
    'stroke-width',
    String(pt.threshold.style.strokeWidth ?? 2.2)
  );

  if (pt.threshold.matched) {
    circle.setAttribute('data-threshold-matched', 'true');
    circle.setAttribute(
      'data-under-threshold',
      String(pt.threshold.isUnderThreshold)
    );
    circle.setAttribute(
      'data-threshold-ids',
      pt.threshold.matchedMarkerIds.join(',')
    );
    if (pt.threshold.style.strokeDasharray) {
      circle.setAttribute(
        'stroke-dasharray',
        pt.threshold.style.strokeDasharray
      );
    }
    if (pt.threshold.style.opacity !== undefined) {
      circle.setAttribute('opacity', String(pt.threshold.style.opacity));
    }
  }

  circle.style.cursor = 'pointer';

  ctx.decorateAriaItem(circle, {
    type: 'point',
    index: pt.globalIndex,
    total: pt.totalPoints,
    id: pt.id,
    label: `${pt.seriesId} ${pt.xValue}`,
    seriesId: pt.seriesId,
    category: String(pt.xValue),
    value: pt.yValue,
    formattedValue: String(pt.yValue),
    color: pt.color,
    datum: {
      id: pt.seriesId,
      seriesId: pt.seriesId,
      x: pt.xValue,
      y: pt.yValue,
      value: pt.yValue,
      isUnderThreshold: pt.threshold.isUnderThreshold,
      thresholdMatched: pt.threshold.matched,
      ...pt.raw
    }
  });

  ctx.animateItem(circle, {
    type: 'point-pop',
    index: pt.globalIndex,
    originX: pt.px,
    originY: pt.py
  });

  circle.addEventListener('mouseenter', (e) => {
    circle.setAttribute('r', String(radius + 2));
    circle.setAttribute('fill', pt.color);
    ctx.showTooltip(
      {
        title: pt.seriesId,
        label: String(pt.xValue),
        seriesId: pt.seriesId,
        category: String(pt.xValue),
        value: pt.yValue,
        formattedValue: String(pt.yValue),
        color: pt.color,
        badge: pt.threshold.isUnderThreshold
          ? `⚠ Under Threshold (${pt.threshold.matchedMarkerIds.join(', ')})`
          : undefined,
        threshold: pt.threshold,
        datum: {
          seriesId: pt.seriesId,
          x: pt.xValue,
          y: pt.yValue,
          ...pt.raw
        }
      },
      (e as MouseEvent).clientX,
      (e as MouseEvent).clientY
    );
  });
  circle.addEventListener('mouseleave', () => {
    circle.setAttribute('r', String(radius));
    circle.setAttribute(
      'fill',
      pt.threshold.matched ? pt.color : ctx.theme.background
    );
    ctx.hideTooltip();
  });

  return circle;
}

export class MCLineItem extends HTMLElement {}
export class MCPointItem extends HTMLElement {}
