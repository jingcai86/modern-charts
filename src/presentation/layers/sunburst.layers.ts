import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { formatGroupedNumber } from '../../core/format';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, HierarchyNode } from '../../core/types';
import {
  sunburstArcCentroid,
  sunburstArcPath,
  type ComputedSunburstArcModel,
  type SunburstArcGeometry,
  type SunburstChartModel
} from '../../models/sunburst.model';
import { renderSunburstArcItem } from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';
const displayed = new WeakMap<SVGGElement, SunburstArcGeometry>();
const moving = new WeakMap<ComputedSunburstArcModel, { frame: SunburstArcGeometry; motion: ItemMotion }>();

function collapseSlice(geometry: SunburstArcGeometry): SunburstArcGeometry {
  const angle = (geometry.startAngle + geometry.endAngle) / 2;
  return { ...geometry, startAngle: angle, endAngle: angle, padAngle: 0 };
}

function morphSlice(
  group: SVGGElement,
  path: SVGPathElement,
  from: SunburstArcGeometry,
  to: SunburstArcGeometry,
  motion: ItemMotion,
  opacity: number
): SunburstArcGeometry {
  const frame = { ...from };
  const fields = Object.keys(to) as Array<keyof SunburstArcGeometry>;
  const fromOpacity = Number(group.style.opacity || 1);
  displayed.set(group, frame);
  motion((t) => {
    for (const field of fields) frame[field] = from[field] + (to[field] - from[field]) * t;
    path.setAttribute('d', sunburstArcPath(frame));
    group.style.opacity = String(fromOpacity + (opacity - fromOpacity) * t);
  }, () => {
    displayed.set(group, to);
    path.removeAttribute('data-item-transition');
    group.style.removeProperty('opacity');
  });
  return frame;
}

export function renderSunburstArcsLayer(
  model: SunburstChartModel,
  ctx: ChartRenderContext<HierarchyNode>,
  onDrilldown?: (pathNames: string[]) => void
): void {
  const center = `translate(${model.cx}, ${model.cy})`;
  const withoutEntrance = {
    ...ctx,
    animateItem: (element: SVGElement) => element.setAttribute('data-animated', 'false')
  };
  joinChartItems(
    ctx.layerGroup,
    model.arcs,
    (slice) => JSON.stringify(slice.pathNames),
    ctx.animationConfig,
    (group, slice, { initial, entered, motion }) => {
      group.setAttribute('transform', center);
      const path = renderSunburstArcItem(slice, initial ? ctx : withoutEntrance, model.interactiveDrilldown, onDrilldown);
      group.replaceChildren(path);
      const from = displayed.get(group) ?? collapseSlice(slice.geometry);
      if (!motion || (sunburstArcPath(from) === slice.pathD && !group.style.opacity)) {
        displayed.set(group, slice.geometry);
        group.style.removeProperty('opacity');
        return;
      }
      if (entered) group.style.opacity = '0';
      path.setAttribute('data-animated', 'true');
      path.setAttribute('data-item-transition', entered ? 'enter' : 'update');
      const frame = morphSlice(group, path, from, slice.geometry, motion, 1);
      moving.set(slice, { frame, motion });
    },
    (group, motion) => {
      const from = displayed.get(group);
      const path = group.querySelector<SVGPathElement>('.mc-sunburst-arc');
      if (from && path) morphSlice(group, path, from, collapseSlice(from), motion, 0);
    }
  );
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
    const label = ctx.renderLabel(g, {
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
    const transition = moving.get(arc);
    if (!label || !transition) return;
    const transform = label.getAttribute('transform') ?? '';
    transition.motion(() => {
      const [x, y] = sunburstArcCentroid(transition.frame);
      label.setAttribute('transform', `translate(${x - arc.centroid[0]}, ${y - arc.centroid[1]}) ${transform}`);
      const sweep = Math.abs(transition.frame.endAngle - transition.frame.startAngle) * 180 / Math.PI;
      label.style.visibility = sweep < minAngle ? 'hidden' : '';
    }, () => {
      label.setAttribute('transform', transform);
      label.style.visibility = '';
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
    : `${model.activeRootName}\n${formatGroupedNumber(model.total, ctx.i18n)}`;

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
