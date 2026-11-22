import type { ChartRenderContext, TooltipAnchorRect } from './types';

/**
 * Resolves a screen/container anchor rect for an SVG chart item.
 * Uses the live DOM `getBoundingClientRect()` when available (automatically
 * reflecting CSS transforms, viewport scroll, and SVG pan/zoom), and falls back
 * to chart-space model coordinates for headless/test environments.
 */
export function resolveElementAnchor(
  element: Element,
  fallback?: TooltipAnchorRect
): TooltipAnchorRect | undefined {
  if (typeof element.getBoundingClientRect === 'function') {
    const rect = element.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        relative: false
      };
    }
  }
  return fallback;
}

/**
 * Resolves a screen/container anchor rect for a chart-local point `(x, y)`
 * inside `ctx.rootGroup` (useful for arc centroids, line slice points, and
 * curved sankey link midpoints where element bounding boxes are off-center).
 */
export function resolveChartPointAnchor(
  ctx: ChartRenderContext<any>,
  x: number,
  y: number,
  width = 0,
  height = 0
): TooltipAnchorRect {
  const rootGroup = ctx.rootGroup as SVGGraphicsElement | undefined;
  const svg = ctx.svg;
  if (
    rootGroup &&
    svg &&
    typeof rootGroup.getScreenCTM === 'function' &&
    typeof svg.createSVGPoint === 'function'
  ) {
    try {
      const ctm = rootGroup.getScreenCTM();
      if (ctm && (ctm.a !== 0 || ctm.d !== 0)) {
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const screenPt = pt.matrixTransform(ctm);
        if (Number.isFinite(screenPt.x) && Number.isFinite(screenPt.y)) {
          const scaleX = Math.hypot(ctm.a, ctm.b) || 1;
          const scaleY = Math.hypot(ctm.c, ctm.d) || 1;
          const scaledW = width * scaleX;
          const scaledH = height * scaleY;
          return {
            left: screenPt.x - scaledW / 2,
            top: screenPt.y - scaledH / 2,
            width: scaledW,
            height: scaledH,
            relative: false
          };
        }
      }
    } catch {
      // Fallback to container-relative chart coordinates below
    }
  }
  return {
    left: ctx.margin.left + x - width / 2,
    top: ctx.margin.top + y - height / 2,
    width,
    height,
    relative: true
  };
}
