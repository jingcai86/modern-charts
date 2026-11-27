import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { physicalTextAnchor } from '../../core/i18n';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, RadarDatum } from '../../core/types';
import type { ComputedRadarPointModel, RadarChartModel } from '../../models/radar.model';
import {
  renderRadarDotItem,
  renderRadarPolygonItem
} from '../items/radar.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Point = { x: number; y: number };
type Dot = Point & { r: number };
const origin: Point = { x: 0, y: 0 };
const drawnPolygons = new WeakMap<SVGGElement, Map<string, Point>>();
const drawnDots = new WeakMap<SVGGElement, Dot>();
const pointMotion = new WeakMap<ComputedRadarPointModel, { from: Point; motion: ItemMotion }>();

function pointKeys(points: ComputedRadarPointModel[]): string[] {
  const counts = new Map<string, number>();
  return points.map(({ axis }) => {
    const count = counts.get(axis) ?? 0;
    counts.set(axis, count + 1);
    return `${axis}\0${count}`;
  });
}

/** Keep removed vertices in the loop until they reach a neighboring spoke. */
function frameOrder(previous: Map<string, Point>, target: Map<string, Point>): string[] {
  const before = new Map<string, string[]>();
  let trailing: string[] = [];
  for (const key of previous.keys()) {
    if (!target.has(key)) trailing.push(key);
    else if (trailing.length) {
      before.set(key, trailing);
      trailing = [];
    }
  }
  return [...target.keys()].flatMap(key => [...before.get(key) ?? [], key]).concat(trailing);
}

function placeMissingVertices(order: string[], points: Map<string, Point>): Map<string, Point> {
  let anchor = [...points.values()].at(-1) ?? origin;
  return new Map(order.map(key => {
    anchor = points.get(key) ?? anchor;
    return [key, anchor];
  }));
}

function interpolatePoint(from: Point, to: Point, progress: number): Point {
  return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
}

function tweenPolygon(
  group: SVGGElement,
  polygon: Element,
  previous: Map<string, Point>,
  target: Map<string, Point>,
  motion: ItemMotion
): Map<string, Point> | undefined {
  const order = frameOrder(previous, target);
  const starts = placeMissingVertices(order, previous);
  const ends = placeMissingVertices(order, target);
  const points = order.map(key => ({ key, start: starts.get(key)!, end: ends.get(key)! }));
  if (points.every(({ start, end }) => start.x === end.x && start.y === end.y)) return;
  const frame = new Map<string, Point>();
  drawnPolygons.set(group, frame);
  const finalPoints = [...target.values()].map(({ x, y }) => `${x},${y}`).join(' ');
  motion(progress => {
    polygon.setAttribute('points', points.map(({ key, start, end }) => {
      const position = interpolatePoint(start, end, progress);
      frame.set(key, position);
      return `${position.x},${position.y}`;
    }).join(' '));
  }, () => {
    drawnPolygons.set(group, target);
    polygon.setAttribute('points', finalPoints);
  });
  return starts;
}

function tweenDot(group: SVGGElement, dot: Element, from: Dot, target: Dot, motion: ItemMotion): void {
  if (from.x === target.x && from.y === target.y && from.r === target.r) return;
  motion(progress => {
    const position = interpolatePoint(from, target, progress);
    const r = from.r + (target.r - from.r) * progress;
    drawnDots.set(group, { ...position, r });
    dot.setAttribute('cx', String(position.x));
    dot.setAttribute('cy', String(position.y));
    dot.setAttribute('r', String(r));
  });
}

function getAxisAngles(model: RadarChartModel): number[] {
  if (model.axisAngles && model.axisAngles.length === model.axes.length) {
    return model.axisAngles;
  }
  const startRad = ((model.startAngle ?? 0) * Math.PI) / 180;
  return model.axes.map(
    (_, i) =>
      (i / Math.max(1, model.axes.length)) * 2 * Math.PI -
      Math.PI / 2 +
      startRad
  );
}

export function renderRadarGridLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);
  const angles = getAxisAngles(model);
  const isLinear = model.gridShape === 'linear' && model.axes.length >= 3;

  // Render alternating splitArea bands when enabled (from outer to inner with evenodd ring paths)
  if (model.splitArea) {
    for (let lvl = 1; lvl <= model.gridLevels; lvl++) {
      if (lvl % 2 === 0) continue; // alternate bands (1, 3, 5...)
      const rInner = (model.radius / model.gridLevels) * (lvl - 1);
      const rOuter = (model.radius / model.gridLevels) * lvl;
      const bandPath = document.createElementNS(SVG_NS, 'path');
      bandPath.setAttribute('class', 'mc-radar-split-area');
      bandPath.setAttribute('data-level', String(lvl));
      bandPath.setAttribute('fill', ctx.theme.gridColor);
      bandPath.setAttribute('fill-opacity', '0.24');
      bandPath.setAttribute('fill-rule', 'evenodd');

      if (isLinear) {
        const outerLoop =
          angles
            .map(
              (a, idx) =>
                `${idx === 0 ? 'M' : 'L'}${Math.cos(a) * rOuter},${Math.sin(a) * rOuter}`
            )
            .join(' ') + ' Z';
        const innerLoop =
          rInner > 0
            ? ' ' +
              angles
                .map(
                  (a, idx) =>
                    `${idx === 0 ? 'M' : 'L'}${Math.cos(a) * rInner},${Math.sin(a) * rInner}`
                )
                .join(' ') +
              ' Z'
            : '';
        bandPath.setAttribute('d', outerLoop + innerLoop);
      } else {
        const outerCircle = `M 0,${-rOuter} A ${rOuter},${rOuter} 0 1,0 0,${rOuter} A ${rOuter},${rOuter} 0 1,0 0,${-rOuter} Z`;
        const innerCircle =
          rInner > 0
            ? ` M 0,${-rInner} A ${rInner},${rInner} 0 1,0 0,${rInner} A ${rInner},${rInner} 0 1,0 0,${-rInner} Z`
            : '';
        bandPath.setAttribute('d', outerCircle + innerCircle);
      }
      g.appendChild(bandPath);
    }
  }

  for (let lvl = 1; lvl <= model.gridLevels; lvl++) {
    const r = (model.radius / model.gridLevels) * lvl;
    if (isLinear) {
      const pts = angles
        .map((angle) => `${Math.cos(angle) * r},${Math.sin(angle) * r}`)
        .join(' ');
      const poly = document.createElementNS(SVG_NS, 'polygon');
      poly.setAttribute('class', 'mc-radar-grid-level');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', ctx.theme.gridColor);
      g.appendChild(poly);
    } else {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', 'mc-radar-grid-level');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('r', String(r));
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', ctx.theme.gridColor);
      g.appendChild(circle);
    }
  }

  ctx.layerGroup.appendChild(g);
}

export function renderRadarAxesLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);
  const angles = getAxisAngles(model);
  const labelOffset = model.gridLabelOffset ?? 18;

  model.axes.forEach((axisName, i) => {
    const angle = angles[i];
    const x = Math.cos(angle) * model.radius;
    const y = Math.sin(angle) * model.radius;

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', 'mc-radar-spoke');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', ctx.theme.axisColor);
    g.appendChild(line);

    const labelR = model.radius + labelOffset;
    const lx = Math.cos(angle) * labelR;
    const ly = Math.sin(angle) * labelR;
    const cos = Math.cos(angle);
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';

    const axisLabelG = ctx.renderLabel(g, {
      id: `radar-axis-${i}`,
      text: axisName,
      x: lx,
      y: ly,
      type: 'radar-axis',
      anchor: physicalTextAnchor(anchor, ctx.i18n.direction),
      baseline: 'middle',
      maxWidth: 96,
      fontSize: ctx.theme.fontSize,
      fontWeight: 600,
      color: ctx.theme.textColor,
      datum: { axis: axisName }
    });
    if (axisLabelG) {
      if (ctx.isInteractive !== false && ctx.ariaConfig.isFocusable) {
        axisLabelG.setAttribute('tabindex', '0');
      }
      ctx.registerEventTarget(axisLabelG, {
        target: 'axis',
        category: 'axis',
        id: `radar-axis-${i}`,
        data: {
          axis: 'radial',
          part: 'tick',
          value: axisName,
          label: axisName,
          index: i,
          count: model.axes.length
        }
      });
    }
  });

  ctx.layerGroup.appendChild(g);
}

export function renderRadarPolygonsLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  const center = `translate(${model.cx}, ${model.cy})`;
  joinChartItems(ctx.layerGroup, model.series, series => series.key, ctx.animationConfig,
    (group, series, { initial, motion }) => {
      const polygon = renderRadarPolygonItem(series, ctx, initial);
      group.setAttribute('transform', center);
      group.replaceChildren(polygon);
      const keys = pointKeys(series.points);
      const target = new Map(keys.map((key, index) => [key, series.points[index]]));
      const previous = drawnPolygons.get(group);
      drawnPolygons.set(group, target);
      if (!motion) return;

      const starts = tweenPolygon(group, polygon, previous ?? new Map(), target, motion);
      if (starts) series.points.forEach((point, index) => {
        pointMotion.set(point, { from: starts.get(keys[index]) ?? origin, motion });
      });
    },
    (group, motion) => {
      const polygon = group.lastElementChild;
      const previous = drawnPolygons.get(group);
      if (polygon && previous) tweenPolygon(group, polygon, previous, new Map(), motion);
    }
  );
}

export function renderRadarDotsLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  const enabled = model.enableDots && model.dotSize > 0;
  const center = `translate(${model.cx}, ${model.cy})`;
  const points = enabled ? model.series.flatMap(series => series.points) : [];
  const animation = enabled ? ctx.animationConfig : { ...ctx.animationConfig, enabled: false };
  joinChartItems(ctx.layerGroup, points, pt => JSON.stringify([pt.seriesKey, pt.axis]), animation,
    (group, pt, { initial, motion }) => {
      const dot = renderRadarDotItem(pt, ctx, initial);
      group.setAttribute('transform', center);
      group.replaceChildren(dot);
      const target = { x: pt.x, y: pt.y, r: pt.dotRadius };
      const previous = drawnDots.get(group) ?? { ...(pointMotion.get(pt)?.from ?? origin), r: 0 };
      drawnDots.set(group, target);
      if (motion) tweenDot(group, dot, previous, target, motion);
    },
    (group, motion) => {
      const dot = group.lastElementChild;
      const previous = drawnDots.get(group);
      if (dot && previous) tweenDot(group, dot, previous, { ...origin, r: 0 }, motion);
    }
  );
}

export function renderRadarDotLabelsLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>,
  forceEnable?: boolean
): void {
  if (!model.enableDotLabels && !forceEnable) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.series.forEach((s) => {
    s.points.forEach((pt, idx) => {
      const label = ctx.renderLabel(g, {
        id: `radar-pt-${s.key}-${idx}`,
        text: ctx.i18n.formatNumber(pt.value, { useGrouping: false }),
        x: pt.x,
        y: pt.y - 11,
        type: 'radar-point',
        anchor: 'middle',
        baseline: 'middle',
        fontSize: 10,
        fontWeight: 600,
        color: s.color,
        datum: { id: s.key, axis: pt.axis, value: pt.value }
      });
      const transition = pointMotion.get(pt);
      if (label && transition) {
        const transform = label.getAttribute('transform') ?? '';
        transition.motion(progress => {
          const dx = (transition.from.x - pt.x) * (1 - progress);
          const dy = (transition.from.y - pt.y) * (1 - progress);
          label.setAttribute('transform', `translate(${dx},${dy}) ${transform}`);
        }, () => label.setAttribute('transform', transform));
      }
    });
  });

  ctx.layerGroup.appendChild(g);
}

export function renderRadarLegendsLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  renderLegendLayer(
    ctx,
    model.series.map((s) => ({ id: s.key, label: s.key, color: s.color })),
    'bottom'
  );
}
