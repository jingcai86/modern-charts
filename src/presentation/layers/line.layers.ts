import { renderLegendLayer } from '../../core/scale-manager';
import { resolveChartPointAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext, LineSeries } from '../../core/types';
import type { LineChartModel } from '../../models/line.model';
import {
  renderLineAreaItem,
  renderLinePathItem,
  renderLinePointItem
} from '../items/line.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Layer for Line Areas (`areas` layer).
 */
export function renderLineAreasLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>,
  defs?: Element | null,
  forceEnable?: boolean
): void {
  if (
    !model.enableArea &&
    !forceEnable &&
    !model.stacked &&
    !ctx.scaleConfig.y.stacked
  ) {
    return;
  }
  model.series.forEach((s) => {
    const areaPath = renderLineAreaItem(s, ctx, defs);
    if (areaPath) ctx.layerGroup.appendChild(areaPath);
  });
}

/**
 * Dumb Presentation Layer for Line Paths (`lines` layer).
 */
export function renderLinesLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>,
  defs?: Element | null
): void {
  model.series.forEach((s) => {
    const linePath = renderLinePathItem(s, ctx, defs);
    if (linePath) ctx.layerGroup.appendChild(linePath);
  });
}

/**
 * Dumb Presentation Layer for Line Data Points (`points` layer).
 */
export function renderLinePointsLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>
): void {
  model.series.forEach((s) => {
    s.points.forEach((pt) => {
      if (pt.defined === false || pt.radius <= 0) return;
      const circle = renderLinePointItem(pt, ctx);
      ctx.layerGroup.appendChild(circle);
    });
  });
}

/**
 * Dumb Presentation Layer for Line Point Labels (`pointLabels` layer).
 */
export function renderLinePointLabelsLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>,
  forceEnable?: boolean
): void {
  if (!model.enablePointLabels && !forceEnable) return;

  model.series.forEach((s) => {
    s.points.forEach((pt) => {
      if (pt.defined === false) return;
      ctx.renderLabel(ctx.layerGroup, {
        id: `point-label-${s.id}-${pt.pointIndex}`,
        text: pt.label,
        x: pt.px,
        y: pt.py - 14,
        type: 'data',
        anchor: 'middle',
        baseline: 'middle',
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        fontWeight: 600,
        color: pt.threshold.style.labelColor ?? pt.color,
        icon: pt.threshold.style.icon,
        datum: {
          id: s.id,
          x: pt.xValue,
          y: pt.yValue,
          value: pt.yValue,
          isUnderThreshold: pt.threshold.isUnderThreshold
        }
      });
    });
  });
}

/**
 * Dumb Presentation Layer for Line Crosshair & Hover Slices (`slices` layer).
 */
export function renderLineSlicesLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>
): void {
  if (!model.enableSlices || ctx.isInteractive === false) return;
  if (model.series.length === 0 || model.series[0].points.length === 0) return;

  const firstPoints = model.series[0].points;
  const stepW =
    firstPoints.length > 1
      ? ctx.innerWidth / firstPoints.length
      : ctx.innerWidth;

  const crosshairType = model.crosshairType ?? 'x';
  const showX = crosshairType === 'x' || crosshairType === 'cross';
  const showY = crosshairType === 'y' || crosshairType === 'cross';

  let crosshairX: SVGLineElement | null = null;
  if (showX) {
    crosshairX = document.createElementNS(SVG_NS, 'line');
    crosshairX.setAttribute('class', 'mc-crosshair mc-crosshair--x');
    crosshairX.setAttribute('y1', '0');
    crosshairX.setAttribute('y2', String(ctx.innerHeight));
    crosshairX.setAttribute('stroke', ctx.theme.mutedTextColor);
    crosshairX.setAttribute('stroke-width', '1');
    crosshairX.setAttribute('stroke-dasharray', '3 3');
    crosshairX.style.opacity = '0';
    crosshairX.style.pointerEvents = 'none';
    ctx.layerGroup.appendChild(crosshairX);
  }

  let crosshairY: SVGLineElement | null = null;
  if (showY) {
    crosshairY = document.createElementNS(SVG_NS, 'line');
    crosshairY.setAttribute('class', 'mc-crosshair mc-crosshair--y');
    crosshairY.setAttribute('x1', '0');
    crosshairY.setAttribute('x2', String(ctx.innerWidth));
    crosshairY.setAttribute('stroke', ctx.theme.mutedTextColor);
    crosshairY.setAttribute('stroke-width', '1');
    crosshairY.setAttribute('stroke-dasharray', '3 3');
    crosshairY.style.opacity = '0';
    crosshairY.style.pointerEvents = 'none';
    ctx.layerGroup.appendChild(crosshairY);
  }

  firstPoints.forEach((pt, idx) => {
    const sliceLeft = Math.max(0, pt.px - stepW / 2);
    const sliceRight = Math.min(ctx.innerWidth, pt.px + stepW / 2);
    const sliceWidth = Math.max(1, sliceRight - sliceLeft);
    const sliceRect = document.createElementNS(SVG_NS, 'rect');
    sliceRect.setAttribute('class', 'mc-slice-hit');
    sliceRect.setAttribute('x', String(sliceLeft));
    sliceRect.setAttribute('y', '0');
    sliceRect.setAttribute('width', String(sliceWidth));
    sliceRect.setAttribute('height', String(ctx.innerHeight));
    sliceRect.setAttribute('fill', 'transparent');
    sliceRect.style.cursor = 'crosshair';

    sliceRect.addEventListener('mousemove', (e) => {
      if (crosshairX) {
        crosshairX.setAttribute('x1', String(pt.px));
        crosshairX.setAttribute('x2', String(pt.px));
        crosshairX.style.opacity = '0.75';
      }

      const items = model.series
        .map((s) => {
          const p = s.points[idx];
          if (!p || p.defined === false) return null;
          return {
            id: s.id,
            label: s.id,
            value: p.yValue,
            formattedValue: String(p.yValue),
            color: p.color,
            badge: p.threshold.isUnderThreshold ? '⚠' : undefined,
            datum: {
              seriesId: s.id,
              x: p.xValue,
              y: p.yValue,
              isUnderThreshold: p.threshold.isUnderThreshold,
              ...p.raw
            }
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      let topPy = pt.py;
      for (const s of model.series) {
        const p = s.points[idx];
        if (p && p.defined !== false && p.py < topPy) topPy = p.py;
      }

      if (crosshairY) {
        crosshairY.setAttribute('y1', String(topPy));
        crosshairY.setAttribute('y2', String(topPy));
        crosshairY.style.opacity = '0.75';
      }

      ctx.showTooltip(
        {
          title: String(pt.xValue),
          category: String(pt.xValue),
          items,
          anchor: resolveChartPointAnchor(ctx, pt.px, topPy, 12, 12),
          datum: {
            x: pt.xValue,
            points: items.map((it) => it.datum)
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });

    sliceRect.addEventListener('mouseleave', () => {
      if (crosshairX) crosshairX.style.opacity = '0';
      if (crosshairY) crosshairY.style.opacity = '0';
      ctx.hideTooltip();
    });

    const slicePoints = model.series
      .map((s) => {
        const p = s.points[idx];
        if (!p) return null;
        return {
          seriesId: s.id,
          x: p.xValue,
          y: p.yValue,
          value: p.yValue,
          color: p.color,
          datum: p.raw
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    ctx.registerEventTarget(sliceRect, {
      target: 'lineSlice',
      category: 'item',
      id: String(pt.xValue),
      data: {
        x: pt.xValue,
        index: idx,
        count: firstPoints.length,
        seriesCount: model.series.length,
        points: slicePoints
      }
    });

    ctx.layerGroup.appendChild(sliceRect);
  });
}

/**
 * Dumb Presentation Layer for Line Legends (`legends` layer).
 */
export function renderLineLegendsLayer(
  model: LineChartModel,
  ctx: ChartRenderContext<LineSeries[]>
): void {
  renderLegendLayer(
    ctx,
    model.series.map((s) => ({ id: s.id, label: s.id, color: s.color })),
    'bottom'
  );
}
