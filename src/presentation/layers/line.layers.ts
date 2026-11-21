import { renderLegendLayer } from '../../core/scale-manager';
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
  if (!model.enableArea && !forceEnable && !ctx.scaleConfig.y.stacked) {
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
      if (pt.radius <= 0) return;
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
  if (!model.enableSlices) return;
  if (model.series.length === 0 || model.series[0].points.length === 0) return;

  const firstPoints = model.series[0].points;
  const stepW =
    firstPoints.length > 1
      ? ctx.innerWidth / firstPoints.length
      : ctx.innerWidth;

  const crosshair = document.createElementNS(SVG_NS, 'line');
  crosshair.setAttribute('class', 'mc-crosshair');
  crosshair.setAttribute('y1', '0');
  crosshair.setAttribute('y2', String(ctx.innerHeight));
  crosshair.setAttribute('stroke', ctx.theme.mutedTextColor);
  crosshair.setAttribute('stroke-width', '1');
  crosshair.setAttribute('stroke-dasharray', '3 3');
  crosshair.style.opacity = '0';
  crosshair.style.pointerEvents = 'none';
  ctx.layerGroup.appendChild(crosshair);

  firstPoints.forEach((pt, idx) => {
    const sliceRect = document.createElementNS(SVG_NS, 'rect');
    sliceRect.setAttribute('class', 'mc-slice-hit');
    sliceRect.setAttribute('x', String(Math.max(0, pt.px - stepW / 2)));
    sliceRect.setAttribute('y', '0');
    sliceRect.setAttribute('width', String(stepW));
    sliceRect.setAttribute('height', String(ctx.innerHeight));
    sliceRect.setAttribute('fill', 'transparent');
    sliceRect.style.cursor = 'crosshair';

    sliceRect.addEventListener('mousemove', (e) => {
      crosshair.setAttribute('x1', String(pt.px));
      crosshair.setAttribute('x2', String(pt.px));
      crosshair.style.opacity = '0.75';

      const rows = model.series
        .map((s) => {
          const p = s.points[idx];
          if (!p) return '';
          const warn = p.threshold.isUnderThreshold ? ' ⚠' : '';
          return `<div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;"></span><span>${s.id}:</span><b>${p.yValue}${warn}</b></div>`;
        })
        .join('');
      ctx.showTooltip(
        `<div style="font-weight:700;margin-bottom:4px;">${pt.xValue}</div>${rows}`,
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });

    sliceRect.addEventListener('mouseleave', () => {
      crosshair.style.opacity = '0';
      ctx.hideTooltip();
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
    model.series.map((s) => ({ id: s.id, label: s.id, color: s.color }))
  );
}
