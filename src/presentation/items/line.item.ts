import {
  allocateUniqueSvgId,
  computePartialClipPlan,
  createAxisClipPath,
  type PartialClipPlan
} from '../../core/threshold-clip';
import { resolveElementAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext } from '../../core/types';
import type {
  ComputedLinePointModel,
  ComputedLineSeriesModel
} from '../../models/line.model';
import { buildScatterSymbolPath } from './scatter.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createAreaGradient(
  defs: Element,
  color: string,
  areaOpacity: number
): string {
  const gradId = allocateUniqueSvgId('mc-line-area-grad');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0');
  grad.setAttribute('y2', '1');

  const stop1 = document.createElementNS(SVG_NS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', color);
  stop1.setAttribute('stop-opacity', String(Math.min(0.65, areaOpacity * 1.9)));

  const stop2 = document.createElementNS(SVG_NS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', color);
  stop2.setAttribute('stop-opacity', '0.02');

  grad.append(stop1, stop2);
  defs.appendChild(grad);
  return gradId;
}

function resolveSeriesPartialPlan(
  series: ComputedLineSeriesModel,
  ctx: ChartRenderContext<any>,
  includeBaseline: boolean
): PartialClipPlan {
  const ys: number[] = [];
  const xs: number[] = [];
  for (const pt of series.points) {
    ys.push(pt.py);
    if (includeBaseline) ys.push(pt.py0);
    xs.push(pt.px);
  }

  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : ctx.innerHeight;
  const yPlan = computePartialClipPlan('y', minY, maxY, ctx);
  if (yPlan.isPartial || yPlan.isFullMatch) {
    return yPlan;
  }

  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : ctx.innerWidth;
  return computePartialClipPlan('x', minX, maxX, ctx);
}

/**
 * Dumb Presentation Renderer for a single Line Area fill item.
 * Supports partial/split threshold fills via unique `<clipPath>` regions
 * (Option B: single `<g>` wrapper + `aria-hidden="true"` clipped `<path>`s).
 */
export function renderLineAreaItem(
  series: ComputedLineSeriesModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGElement | null {
  if (!series.areaPathD) return null;

  const activeDefs = defs ?? ctx.svg.querySelector('.mc-chart-defs');
  const plan = resolveSeriesPartialPlan(series, ctx, true);
  const customAreaFill =
    ctx.resolveFill?.({
      id: series.id,
      seriesId: series.id,
      key: series.id,
      index: series.index,
      color: series.color,
      chartType: 'line',
      target: 'area',
      datum: series
    }) ?? series.color;
  const hasCustomAreaFill = customAreaFill !== series.color;

  if (plan.isPartial && activeDefs) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute(
      'class',
      'mc-line-area mc-line-area--partial-threshold'
    );
    group.setAttribute('data-item-component', 'mc-line-area-item');
    group.setAttribute('data-series-id', series.id);
    group.setAttribute('data-threshold-split', 'partial');
    group.setAttribute('data-threshold-ids', plan.matchedMarkerIds.join(','));

    const bounds = {
      x: 0,
      y: 0,
      width: ctx.innerWidth,
      height: ctx.innerHeight
    };

    if (plan.baseIntervals.length > 0) {
      const baseClipId = createAxisClipPath(
        activeDefs,
        plan.axis,
        plan.baseIntervals,
        bounds
      );
      const basePath = document.createElementNS(SVG_NS, 'path');
      basePath.setAttribute(
        'class',
        'mc-line-area-segment mc-line-area-segment--base'
      );
      basePath.setAttribute('aria-hidden', 'true');
      basePath.setAttribute('role', 'presentation');
      basePath.setAttribute('d', series.areaPathD);
      if (hasCustomAreaFill) {
        basePath.setAttribute('fill', customAreaFill);
        basePath.setAttribute('fill-opacity', String(Math.min(1, series.areaOpacity * 2.2)));
      } else {
        const baseGradId = createAreaGradient(
          activeDefs,
          series.color,
          series.areaOpacity
        );
        basePath.setAttribute('fill', `url(#${baseGradId})`);
      }
      basePath.setAttribute('clip-path', `url(#${baseClipId})`);
      group.appendChild(basePath);
    }

    for (const overlay of plan.overlays) {
      const overlayClipId = createAxisClipPath(
        activeDefs,
        plan.axis,
        overlay.intervals,
        bounds
      );
      const resolvedDefFill = ctx.resolveDefUrl?.(
        overlay.style.fill,
        series.color
      );
      const ovColor =
        resolvedDefFill || overlay.style.fill || overlay.style.color || series.color;
      const ovOpacity = overlay.style.opacity ?? series.areaOpacity;
      const ovPath = document.createElementNS(SVG_NS, 'path');
      ovPath.setAttribute(
        'class',
        'mc-line-area-segment mc-line-area-segment--threshold'
      );
      ovPath.setAttribute('aria-hidden', 'true');
      ovPath.setAttribute('role', 'presentation');
      ovPath.setAttribute('data-threshold-marker-id', overlay.marker.id);
      ovPath.setAttribute('d', series.areaPathD);
      if (ovColor.startsWith('url(')) {
        ovPath.setAttribute('fill', ovColor);
        ovPath.setAttribute('fill-opacity', String(Math.min(1, ovOpacity * 2.2)));
      } else {
        const ovGradId = createAreaGradient(activeDefs, ovColor, ovOpacity);
        ovPath.setAttribute('fill', `url(#${ovGradId})`);
      }
      ovPath.setAttribute('clip-path', `url(#${overlayClipId})`);
      group.appendChild(ovPath);
    }

    if (ctx.state?.lineTransitions?.has(series.id)) {
      group.setAttribute('data-animated', 'true');
      group.setAttribute('data-transition-mode', 'morph');
    } else {
      ctx.animateItem(group, { type: 'area-fade', index: series.index });
    }
    return group;
  }

  const fullMatchOverlay = plan.isFullMatch
    ? plan.overlays[plan.overlays.length - 1]
    : undefined;
  const fullMatchDef = fullMatchOverlay
    ? ctx.resolveDefUrl?.(fullMatchOverlay.style.fill, series.color)
    : undefined;
  const effectiveColor = fullMatchOverlay
    ? fullMatchDef ||
      fullMatchOverlay.style.fill ||
      fullMatchOverlay.style.color ||
      series.color
    : customAreaFill;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-line-area');
  path.setAttribute('data-item-component', 'mc-line-area-item');
  path.setAttribute('data-series-id', series.id);
  path.setAttribute('d', series.areaPathD);
  if (effectiveColor.startsWith('url(')) {
    path.setAttribute('fill', effectiveColor);
    if (series.areaOpacity < 1) {
      path.setAttribute('fill-opacity', String(Math.min(1, series.areaOpacity * 2.5)));
    }
  } else {
    const gradId = activeDefs
      ? createAreaGradient(activeDefs, effectiveColor, series.areaOpacity)
      : null;
    path.setAttribute('fill', gradId ? `url(#${gradId})` : effectiveColor);
    if (!gradId) path.setAttribute('fill-opacity', String(series.areaOpacity));
  }
  if (ctx.state?.lineTransitions?.has(series.id)) {
    path.setAttribute('data-animated', 'true');
    path.setAttribute('data-transition-mode', 'morph');
  } else {
    ctx.animateItem(path, { type: 'area-fade', index: series.index });
  }
  return path;
}

/**
 * Dumb Presentation Renderer for a single Line Path item.
 * Supports partial/split threshold stroke styling via unique `<clipPath>`
 * regions across `below`, `above`, `between`, and `outside` on both `y` and `x` axes.
 */
export function renderLinePathItem(
  series: ComputedLineSeriesModel,
  ctx: ChartRenderContext<any>,
  defs?: Element | null
): SVGElement | null {
  if (!series.linePathD) return null;

  const activeDefs = defs ?? ctx.svg.querySelector('.mc-chart-defs');
  const plan = resolveSeriesPartialPlan(series, ctx, false);

  if (plan.isPartial && activeDefs) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute(
      'class',
      'mc-line-path mc-line-group mc-line-path--partial-threshold'
    );
    group.setAttribute('data-item-component', 'mc-line-item');
    group.setAttribute('data-series-id', series.id);
    group.setAttribute('data-has-threshold-matches', 'true');
    group.setAttribute('data-threshold-split', 'partial');
    group.setAttribute('data-threshold-ids', plan.matchedMarkerIds.join(','));

    const bounds = {
      x: 0,
      y: 0,
      width: ctx.innerWidth,
      height: ctx.innerHeight
    };

    if (plan.baseIntervals.length > 0) {
      const baseClipId = createAxisClipPath(
        activeDefs,
        plan.axis,
        plan.baseIntervals,
        bounds
      );
      const basePath = document.createElementNS(SVG_NS, 'path');
      basePath.setAttribute(
        'class',
        'mc-line-segment mc-line-segment--base'
      );
      basePath.setAttribute('aria-hidden', 'true');
      basePath.setAttribute('role', 'presentation');
      basePath.setAttribute('d', series.linePathD);
      basePath.setAttribute('fill', 'none');
      basePath.setAttribute('stroke', series.color);
      basePath.setAttribute('stroke-width', String(series.strokeWidth));
      if (series.strokeDasharray) {
        basePath.setAttribute('stroke-dasharray', series.strokeDasharray);
      }
      basePath.setAttribute('stroke-linecap', 'round');
      basePath.setAttribute('stroke-linejoin', 'round');
      basePath.setAttribute('clip-path', `url(#${baseClipId})`);
      group.appendChild(basePath);
    }

    for (const overlay of plan.overlays) {
      const overlayClipId = createAxisClipPath(
        activeDefs,
        plan.axis,
        overlay.intervals,
        bounds
      );
      const ovPath = document.createElementNS(SVG_NS, 'path');
      ovPath.setAttribute(
        'class',
        'mc-line-segment mc-line-segment--threshold'
      );
      ovPath.setAttribute('aria-hidden', 'true');
      ovPath.setAttribute('role', 'presentation');
      ovPath.setAttribute('data-threshold-marker-id', overlay.marker.id);
      ovPath.setAttribute('d', series.linePathD);
      ovPath.setAttribute('fill', 'none');
      ovPath.setAttribute(
        'stroke',
        overlay.style.stroke || overlay.style.color || series.color
      );
      ovPath.setAttribute(
        'stroke-width',
        String(overlay.style.strokeWidth ?? series.strokeWidth)
      );
      if (overlay.style.strokeDasharray) {
        ovPath.setAttribute('stroke-dasharray', overlay.style.strokeDasharray);
      }
      if (overlay.style.opacity !== undefined) {
        ovPath.setAttribute('stroke-opacity', String(overlay.style.opacity));
      }
      ovPath.setAttribute('stroke-linecap', 'round');
      ovPath.setAttribute('stroke-linejoin', 'round');
      ovPath.setAttribute('clip-path', `url(#${overlayClipId})`);
      group.appendChild(ovPath);
    }

    if (ctx.state?.lineTransitions?.has(series.id)) {
      group.setAttribute('data-animated', 'true');
      group.setAttribute('data-transition-mode', 'morph');
    } else {
      ctx.animateItem(group, { type: 'line-draw', index: series.index });
    }
    ctx.registerEventTarget(group, {
      target: 'lineSeries',
      category: 'item',
      id: series.id,
      data: {
        id: series.id,
        seriesId: series.id,
        index: series.index,
        count: series.points.length,
        color: series.color,
        points: series.points.map((p) => ({
          x: p.xValue,
          y: p.yValue,
          raw: p.raw
        }))
      }
    });
    return group;
  }

  // Whole-path rendering (no overlap, 100% full overlap, or explicit matchScope: 'item')
  const itemScopeMarker = ctx.markers.find(
    (m) =>
      m.condition &&
      (m.matchScope === 'item' || typeof m.condition === 'function')
  );
  const fullOverlay = plan.isFullMatch
    ? plan.overlays[plan.overlays.length - 1]
    : undefined;

  let strokeValue = series.color;
  let strokeWidth = series.strokeWidth;
  let strokeDasharray: string | undefined = series.strokeDasharray;

  if (fullOverlay) {
    strokeValue =
      fullOverlay.style.stroke || fullOverlay.style.color || series.color;
    strokeWidth = fullOverlay.style.strokeWidth ?? series.strokeWidth;
    strokeDasharray =
      fullOverlay.style.strokeDasharray ?? series.strokeDasharray;
  } else if (series.hasThresholdMatches && itemScopeMarker) {
    strokeValue =
      itemScopeMarker.matchStyle?.stroke ||
      itemScopeMarker.matchStyle?.color ||
      itemScopeMarker.stroke ||
      '#ef4444';
    strokeWidth =
      itemScopeMarker.matchStyle?.strokeWidth ?? series.strokeWidth;
    strokeDasharray =
      itemScopeMarker.matchStyle?.strokeDasharray ?? series.strokeDasharray;
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-line-path');
  path.setAttribute('data-item-component', 'mc-line-item');
  path.setAttribute('data-series-id', series.id);
  if (series.hasThresholdMatches || plan.isFullMatch) {
    path.setAttribute('data-has-threshold-matches', 'true');
  }
  path.setAttribute('d', series.linePathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', strokeValue);
  path.setAttribute('stroke-width', String(strokeWidth));
  if (strokeDasharray) {
    path.setAttribute('stroke-dasharray', strokeDasharray);
  }
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  if (ctx.state?.lineTransitions?.has(series.id)) {
    path.setAttribute('data-animated', 'true');
    path.setAttribute('data-transition-mode', 'morph');
  } else {
    ctx.animateItem(path, { type: 'line-draw', index: series.index });
  }
  ctx.registerEventTarget(path, {
    target: 'lineSeries',
    category: 'item',
    id: series.id,
    data: {
      id: series.id,
      seriesId: series.id,
      index: series.index,
      count: series.points.length,
      color: series.color,
      points: series.points.map((p) => ({
        x: p.xValue,
        y: p.yValue,
        raw: p.raw
      }))
    }
  });
  return path;
}

/**
 * Dumb Presentation Renderer for a single Line Point item.
 */
export function renderLinePointItem(
  pt: ComputedLinePointModel,
  ctx: ChartRenderContext<any>
): SVGElement {
  const symbol = pt.symbol ?? 'circle';
  const isCircle = symbol === 'circle';
  const node: SVGElement = isCircle
    ? document.createElementNS(SVG_NS, 'circle')
    : document.createElementNS(SVG_NS, 'path');
  const radius = pt.radius;
  const customCls = pt.threshold.style.className
    ? ` ${pt.threshold.style.className}`
    : '';
  const threshCls = pt.threshold.matched
    ? ` mc-line-point--threshold-matched${
        pt.threshold.isUnderThreshold ? ' mc-line-point--under-threshold' : ''
      }`
    : '';

  node.setAttribute('class', `mc-line-point${threshCls}${customCls}`);
  node.setAttribute('data-item-component', 'mc-point-item');
  node.setAttribute('data-series-id', pt.seriesId);
  node.setAttribute('data-point-index', String(pt.pointIndex));
  node.setAttribute('data-symbol', symbol);
  if (isCircle) {
    node.setAttribute('cx', String(pt.px));
    node.setAttribute('cy', String(pt.py));
    node.setAttribute('r', String(radius));
  } else {
    node.setAttribute(
      'd',
      buildScatterSymbolPath(symbol, pt.px, pt.py, radius)
    );
  }
  node.setAttribute(
    'fill',
    pt.threshold.matched ? pt.color : ctx.theme.background
  );
  node.setAttribute('stroke', pt.threshold.style.stroke || pt.color);
  node.setAttribute(
    'stroke-width',
    String(pt.threshold.style.strokeWidth ?? pt.borderWidth ?? 2.2)
  );

  if (pt.threshold.matched) {
    node.setAttribute('data-threshold-matched', 'true');
    node.setAttribute(
      'data-under-threshold',
      String(pt.threshold.isUnderThreshold)
    );
    node.setAttribute(
      'data-threshold-ids',
      pt.threshold.matchedMarkerIds.join(',')
    );
    if (pt.threshold.style.strokeDasharray) {
      node.setAttribute(
        'stroke-dasharray',
        pt.threshold.style.strokeDasharray
      );
    }
    if (pt.threshold.style.opacity !== undefined) {
      node.setAttribute('opacity', String(pt.threshold.style.opacity));
    }
  }

  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    node.style.cursor = 'pointer';
  }

  const fallbackAnchor = {
    left: ctx.margin.left + pt.px - radius,
    top: ctx.margin.top + pt.py - radius,
    width: radius * 2,
    height: radius * 2,
    relative: true
  };

  ctx.decorateAriaItem(node, {
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
    anchor: fallbackAnchor,
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

  if (ctx.state?.lineTransitions?.has(pt.seriesId)) {
    node.setAttribute('data-animated', 'true');
    node.setAttribute('data-transition-mode', 'morph');
  } else {
    ctx.animateItem(node, {
      type: 'point-pop',
      index: pt.globalIndex,
      originX: pt.px,
      originY: pt.py
    });
  }

  ctx.registerEventTarget(node, {
    target: 'linePoint',
    category: 'item',
    id: pt.id,
    data: {
      id: pt.id,
      seriesId: pt.seriesId,
      x: pt.xValue,
      y: pt.yValue,
      value: pt.yValue,
      index: pt.globalIndex,
      pointIndex: pt.pointIndex,
      count: pt.totalPoints,
      total: pt.totalPoints,
      color: pt.color,
      position: { x: pt.px, y: pt.py },
      threshold: pt.threshold,
      datum: pt.raw
    }
  });

  if (interactive) {
    node.addEventListener('mouseenter', (e) => {
      if (isCircle) {
        node.setAttribute('r', String(radius + 2));
      } else {
        node.setAttribute(
          'd',
          buildScatterSymbolPath(symbol, pt.px, pt.py, radius + 2)
        );
      }
      node.setAttribute('fill', pt.color);
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
          anchor: resolveElementAnchor(node, fallbackAnchor),
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
    node.addEventListener('mouseleave', () => {
      if (isCircle) {
        node.setAttribute('r', String(radius));
      } else {
        node.setAttribute(
          'd',
          buildScatterSymbolPath(symbol, pt.px, pt.py, radius)
        );
      }
      node.setAttribute(
        'fill',
        pt.threshold.matched ? pt.color : ctx.theme.background
      );
      ctx.hideTooltip();
    });
  }

  return node;
}

export class MCLineItem extends HTMLElement {}
export class MCPointItem extends HTMLElement {}
