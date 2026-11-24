import { formatGroupedNumber } from '../../core/format';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, HierarchyNode } from '../../core/types';
import type { SunburstChartModel } from '../../models/sunburst.model';
import { renderSunburstArcItem } from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderSunburstArcsLayer(
  model: SunburstChartModel,
  ctx: ChartRenderContext<HierarchyNode>,
  onDrilldown?: (pathNames: string[]) => void
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.arcs.forEach((arc) => {
    g.appendChild(
      renderSunburstArcItem(arc, ctx, model.interactiveDrilldown, onDrilldown)
    );
  });

  ctx.layerGroup.appendChild(g);
}

export function renderSunburstLabelsLayer(
  model: SunburstChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  if (!model.enableLabels) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);
  const minAngle = model.minArcAngleForLabel ?? 8;
  const isTangential = model.labelOrientation === 'tangential';

  model.arcs.forEach((arc, idx) => {
    if (
      (arc.sweepAngleDeg ?? 360) < minAngle ||
      arc.arcLength < 24 ||
      arc.ringThickness < 16
    ) {
      return;
    }
    ctx.renderLabel(g, {
      id: `sunburst-label-${idx}`,
      text: arc.name,
      x: arc.centroid[0],
      y: arc.centroid[1],
      type: 'arc',
      anchor: 'middle',
      baseline: 'middle',
      rotation: arc.labelRotation ?? 0,
      maxWidth: isTangential
        ? Math.max(28, arc.arcLength - 6)
        : Math.max(32, arc.ringThickness - 6),
      maxHeight: isTangential
        ? Math.max(14, arc.ringThickness - 4)
        : Math.max(16, arc.arcLength - 4),
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color: '#ffffff',
      datum: {
        id: arc.name,
        name: arc.name,
        value: arc.value,
        depth: arc.depth,
        percentage: Math.round(arc.percentage)
      }
    });
  });

  ctx.layerGroup.appendChild(g);
}

export function renderSunburstCenterLayer(
  model: SunburstChartModel,
  ctx: ChartRenderContext<HierarchyNode>,
  onDrillUp?: () => void
): void {
  if (model.innerHole < 14) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('class', 'mc-sunburst-center');
  circle.setAttribute('r', String(Math.max(12, model.innerHole - 3)));
  circle.setAttribute(
    'fill',
    ctx.theme.mode === 'dark' ? '#1e293b' : '#f8fafc'
  );
  circle.setAttribute('stroke', ctx.theme.axisColor);
  circle.setAttribute('stroke-width', '1.5');

  if (ctx.isInteractive !== false && model.isDrilledDown && onDrillUp) {
    circle.style.cursor = 'pointer';
    circle.addEventListener('click', onDrillUp);
  }
  ctx.registerEventTarget(circle, {
    target: 'sunburstCenter',
    category: 'item',
    id: 'sunburst-center',
    data: {
      name: model.activeRootName,
      total: model.total,
      isDrilledDown: model.isDrilledDown
    }
  });
  g.appendChild(circle);

  const title = model.isDrilledDown
    ? `↩ ${model.activeRootName}`
    : `${model.activeRootName}\n${formatGroupedNumber(model.total)}`;

  ctx.renderLabel(g, {
    id: 'sunburst-center-label',
    text: title,
    x: 0,
    y: 0,
    type: 'center',
    anchor: 'middle',
    baseline: 'middle',
    maxWidth: model.innerHole * 1.75,
    fontSize: Math.max(11, ctx.theme.fontSize),
    fontWeight: 700,
    color: ctx.theme.textColor,
    datum: {
      name: model.activeRootName,
      total: model.total
    }
  });

  ctx.layerGroup.appendChild(g);
}

export function renderSunburstLegendsLayer(
  model: SunburstChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  renderLegendLayer(ctx, model.topCategories, 'bottom');
}
