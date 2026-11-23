import {
  computePartialClipPlan,
  createAxisClipPath
} from '../../core/threshold-clip';
import { resolveElementAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext, MarkerMatchStyle } from '../../core/types';
import type { ComputedBarItemModel } from '../../models/bar.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyBarGeometry(rect: SVGRectElement, b: ComputedBarItemModel): void {
  rect.setAttribute('x', String(b.x));
  rect.setAttribute('y', String(b.y));
  rect.setAttribute('width', String(b.width));
  rect.setAttribute('height', String(b.height));
  rect.setAttribute('rx', String(b.rx));
}

function applyMatchStyleToRect(
  rect: SVGRectElement,
  style: MarkerMatchStyle,
  fallbackColor: string,
  ctx: ChartRenderContext<any>
): void {
  const resolvedFill =
    ctx.resolveDefUrl?.(style.fill, fallbackColor) ||
    style.fill ||
    style.color ||
    fallbackColor;
  rect.setAttribute('fill', resolvedFill);
  if (style.stroke) {
    rect.setAttribute('stroke', style.stroke);
    rect.setAttribute('stroke-width', String(style.strokeWidth ?? 1.8));
  }
  if (style.strokeDasharray) {
    rect.setAttribute('stroke-dasharray', style.strokeDasharray);
  }
  if (style.opacity !== undefined) {
    rect.setAttribute('fill-opacity', String(style.opacity));
  }
}

/**
 * Dumb Presentation Renderer for a single Bar Item.
 * Receives pre-computed geometry and threshold styles from `BarChartModel`
 * and performs SVG DOM presentation, partial threshold `<clipPath>` splitting
 * (Option B: single semantic `<g>` ARIA host + `aria-hidden="true"` clipped
 * visual segments), ARIA decoration, and animation.
 */
export function renderBarItem(
  b: ComputedBarItemModel,
  ctx: ChartRenderContext<any>
): SVGElement {
  const axis: 'x' | 'y' = b.isHorizontal ? 'x' : 'y';
  const itemStart = b.isHorizontal ? b.x : b.y;
  const itemEnd = b.isHorizontal ? b.x + b.width : b.y + b.height;
  const defs = ctx.svg.querySelector('.mc-chart-defs');
  const plan = computePartialClipPlan(axis, itemStart, itemEnd, ctx);

  // Determine whether any matched marker uses whole-item scope ('item' or predicate fn)
  const hasItemScopeMatch = b.threshold.matchedMarkers.some(
    (m) => m.matchScope === 'item' || typeof m.condition === 'function'
  );

  const customCls = b.threshold.style.className
    ? ` ${b.threshold.style.className}`
    : '';
  const threshCls = b.threshold.matched
    ? ` mc-bar-rect--threshold-matched${
        b.threshold.isUnderThreshold ? ' mc-bar-rect--under-threshold' : ''
      }`
    : '';

  const baseFill =
    ctx.resolveFill?.({
      id: b.id,
      seriesId: b.key,
      key: b.key,
      category: b.indexValue,
      index: b.index,
      value: b.value,
      color: b.originalColor,
      chartType: 'bar',
      target: 'item',
      datum: {
        id: b.key,
        key: b.key,
        indexValue: b.indexValue,
        category: b.indexValue,
        value: b.value,
        ...b.datum
      }
    }) ?? b.originalColor;

  let hostEl: SVGElement;
  let ariaThresholdCoverage: 'none' | 'partial' | 'full' = 'none';

  if (plan.isPartial && defs && !hasItemScopeMatch) {
    // Option B: Single semantic <g> ARIA / event / animation host containing
    // decorative aria-hidden="true" clipped <rect> shapes so screen readers
    // and keyboard roving always see ONE logical bar item while preserving
    // rounded corners and supporting partial fill, stroke, dasharray & patterns.
    ariaThresholdCoverage = 'partial';
    const group = document.createElementNS(SVG_NS, 'g');
    const overlayCustomClasses = plan.overlays
      .map((ov) => ov.style.className)
      .filter(Boolean)
      .join(' ');
    const extraCls = overlayCustomClasses
      ? ` ${overlayCustomClasses}`
      : customCls;

    group.setAttribute(
      'class',
      `mc-bar-rect mc-bar-group mc-bar-rect--partial-threshold${threshCls}${extraCls}`
    );
    group.setAttribute('data-item-component', 'mc-bar-item');
    group.setAttribute('data-key', b.key);
    group.setAttribute('data-index', b.indexValue);
    group.setAttribute('data-threshold-matched', 'true');
    group.setAttribute('data-threshold-split', 'partial');
    group.setAttribute(
      'data-threshold-ids',
      plan.matchedMarkerIds.join(',')
    );
    if (b.threshold.isUnderThreshold) {
      group.setAttribute('data-under-threshold', 'true');
    }

    const bounds = { x: b.x, y: b.y, width: b.width, height: b.height };

    // 1. Base (unmatched portion) <rect> clipped to complement intervals
    if (plan.baseIntervals.length > 0) {
      const baseClipId = createAxisClipPath(
        defs,
        axis,
        plan.baseIntervals,
        bounds
      );
      const baseRect = document.createElementNS(SVG_NS, 'rect');
      baseRect.setAttribute('class', 'mc-bar-segment mc-bar-segment--base');
      baseRect.setAttribute('aria-hidden', 'true');
      baseRect.setAttribute('role', 'presentation');
      applyBarGeometry(baseRect, b);
      baseRect.setAttribute('fill', baseFill);
      baseRect.setAttribute('clip-path', `url(#${baseClipId})`);
      group.appendChild(baseRect);
    }

    // 2. Clipped threshold overlay <rect>(s) for each intersecting marker region
    for (const overlay of plan.overlays) {
      const overlayClipId = createAxisClipPath(
        defs,
        axis,
        overlay.intervals,
        bounds
      );
      const ovRect = document.createElementNS(SVG_NS, 'rect');
      const ovCls = overlay.style.className ? ` ${overlay.style.className}` : '';
      ovRect.setAttribute(
        'class',
        `mc-bar-segment mc-bar-segment--threshold${ovCls}`
      );
      ovRect.setAttribute('aria-hidden', 'true');
      ovRect.setAttribute('role', 'presentation');
      ovRect.setAttribute('data-threshold-marker-id', overlay.marker.id);
      applyBarGeometry(ovRect, b);
      applyMatchStyleToRect(ovRect, overlay.style, b.color, ctx);
      ovRect.setAttribute('clip-path', `url(#${overlayClipId})`);
      group.appendChild(ovRect);
    }

    hostEl = group;
  } else {
    // Single <rect> item (no overlap, 100% full overlap, or explicit matchScope: 'item')
    const rect = document.createElementNS(SVG_NS, 'rect');
    const applyFullMatch =
      plan.isFullMatch || (b.threshold.matched && hasItemScopeMatch);

    if (applyFullMatch) {
      ariaThresholdCoverage = 'full';
    }

    const effectiveFullStyle: MarkerMatchStyle = plan.isFullMatch
      ? plan.overlays[plan.overlays.length - 1]?.style ?? b.threshold.style
      : b.threshold.style;

    rect.setAttribute(
      'class',
      `mc-bar-rect${applyFullMatch ? threshCls + customCls : ''}`
    );
    rect.setAttribute('data-item-component', 'mc-bar-item');
    rect.setAttribute('data-key', b.key);
    rect.setAttribute('data-index', b.indexValue);
    applyBarGeometry(rect, b);

    if (applyFullMatch) {
      applyMatchStyleToRect(rect, effectiveFullStyle, b.color, ctx);
      rect.setAttribute('data-threshold-matched', 'true');
      rect.setAttribute(
        'data-threshold-split',
        hasItemScopeMatch ? 'item' : 'full'
      );
      rect.setAttribute(
        'data-under-threshold',
        String(b.threshold.isUnderThreshold)
      );
      const ids =
        plan.matchedMarkerIds.length > 0
          ? plan.matchedMarkerIds
          : b.threshold.matchedMarkerIds;
      rect.setAttribute('data-threshold-ids', ids.join(','));
    } else {
      rect.setAttribute('fill', baseFill);
    }

    hostEl = rect;
  }

  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    hostEl.style.cursor = 'pointer';
    hostEl.style.transition = 'filter 140ms ease, opacity 140ms ease';
  }

  const thresholdIds =
    plan.matchedMarkerIds.length > 0
      ? plan.matchedMarkerIds
      : b.threshold.matchedMarkerIds;

  const fallbackAnchor = {
    left: ctx.margin.left + b.x,
    top: ctx.margin.top + b.y,
    width: b.width,
    height: b.height,
    relative: true
  };

  ctx.decorateAriaItem(hostEl, {
    type: 'bar',
    index: b.index,
    total: b.total,
    id: b.id,
    label: `${b.key} in ${b.indexValue}`,
    seriesId: b.key,
    category: b.indexValue,
    value: b.value,
    formattedValue: String(b.value),
    color: ariaThresholdCoverage === 'full' ? b.color : b.originalColor,
    anchor: fallbackAnchor,
    datum: {
      id: b.key,
      key: b.key,
      indexValue: b.indexValue,
      category: b.indexValue,
      value: b.value,
      formattedValue: String(b.value),
      isUnderThreshold: b.threshold.isUnderThreshold,
      thresholdMatched: ariaThresholdCoverage !== 'none',
      thresholdCoverage: ariaThresholdCoverage,
      matchedMarkerIds: thresholdIds,
      ...b.datum
    }
  });

  if (
    interactive &&
    ariaThresholdCoverage === 'partial' &&
    !hostEl.hasAttribute('aria-description')
  ) {
    const markerNames = plan.overlays
      .map((ov) => ov.marker.label || ov.marker.id)
      .join(', ');
    hostEl.setAttribute(
      'aria-description',
      `Partially crosses threshold (${markerNames})`
    );
  }

  ctx.animateItem(hostEl, {
    type: b.isHorizontal ? 'bar-horizontal' : 'bar-vertical',
    index: b.index,
    originX: b.isHorizontal ? b.x : b.x + b.width / 2,
    originY: b.isHorizontal ? b.y + b.height / 2 : b.y + b.height
  });

  if (interactive) {
    hostEl.addEventListener('mouseenter', (e) => {
      hostEl.style.filter = 'brightness(1.1)';
      const badge =
        ariaThresholdCoverage === 'partial'
          ? `⚡ Crosses Threshold (${thresholdIds.join(', ')})`
          : b.threshold.isUnderThreshold
          ? `⚠ Under Threshold (${thresholdIds.join(', ')})`
          : undefined;
      ctx.showTooltip(
        {
          title: b.indexValue,
          label: b.key,
          seriesId: b.key,
          category: b.indexValue,
          value: b.value,
          formattedValue: String(b.value),
          color: ariaThresholdCoverage === 'full' ? b.color : b.originalColor,
          badge,
          threshold: b.threshold,
          anchor: resolveElementAnchor(hostEl, fallbackAnchor),
          datum: {
            key: b.key,
            indexValue: b.indexValue,
            value: b.value,
            thresholdCoverage: ariaThresholdCoverage,
            matchedMarkerIds: thresholdIds,
            ...b.datum
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    hostEl.addEventListener('mouseleave', () => {
      hostEl.style.filter = 'none';
      ctx.hideTooltip();
    });
  }

  return hostEl;
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

  public renderSvg(ctx: ChartRenderContext<any>): SVGElement | null {
    if (!this.#model) return null;
    return renderBarItem(this.#model, ctx);
  }
}
