import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
import { physicalTextAnchor } from '../../core/i18n';
import { formatGroupedNumber } from '../../core/format';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, PieDatum } from '../../core/types';
import {
  pieArcCentroid,
  pieArcLinkPoints,
  pieArcPath,
  type ComputedPieArcModel,
  type PieArcGeometry,
  type PieChartModel
} from '../../models/pie.model';
import { renderPieArcItem } from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';
interface DrawnArc {
  key: string;
  geometry: PieArcGeometry;
}

const drawnArcs = new WeakMap<SVGGElement, DrawnArc>();
const movingArcs = new WeakMap<ComputedPieArcModel, { current: DrawnArc; motion: ItemMotion }>();

function formatLinkPoints(points: ComputedPieArcModel['linkPoints']): string {
  return points.map(point => point.join(',')).join(' ');
}

function inAngularOrder(arcs: ReadonlyMap<string, PieArcGeometry>) {
  const ordered = [...arcs];
  const sweep = ordered.reduce((sum, [, arc]) => sum + arc.endAngle - arc.startAngle, 0);
  const direction = sweep < 0 ? -1 : 1;
  return ordered.sort(([, a], [, b]) => direction * (a.startAngle - b.startAngle || a.endAngle - b.endAngle));
}

function collapseBoundaries(
  ordered: Array<[string, PieArcGeometry]>,
  other: ReadonlyMap<string, PieArcGeometry>,
  edge: 'startAngle' | 'endAngle',
  boundary?: number
) {
  const result = new Map<string, number>();
  for (const [key, arc] of ordered) {
    const neighbor = other.get(key);
    if (neighbor) boundary = neighbor[edge];
    else result.set(key, boundary ?? arc.startAngle);
  }
  return result;
}

function collapseArc(arc: PieArcGeometry, angle: number): PieArcGeometry {
  return { ...arc, startAngle: angle, endAngle: angle, padAngle: 0 };
}

function tweenArc(
  path: SVGPathElement,
  current: DrawnArc,
  target: PieArcGeometry,
  motion: ItemMotion,
  onFinish?: () => void
): void {
  const from = current.geometry;
  const frame = { ...from };
  const fields = Object.keys(target) as Array<keyof PieArcGeometry>;
  const transition = path.style.transition;
  path.style.transition = '';
  current.geometry = frame;
  motion((t) => {
    for (const field of fields) frame[field] = from[field] + (target[field] - from[field]) * t;
    path.setAttribute('d', pieArcPath(frame));
  }, () => {
    current.geometry = target;
    path.style.transition = transition;
    onFinish?.();
  });
}

export function renderPieArcsLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  const center = `translate(${model.cx}, ${model.cy})`;
  const occurrences = new Map<string, number>();
  const slices = model.arcs.map((slice) => {
    const id = slice.data.id;
    const occurrence = occurrences.get(id) ?? 0;
    occurrences.set(id, occurrence + 1);
    return { key: `${id}\0${occurrence}`, slice };
  });
  const targets = new Map(slices.map(({ key, slice }) => [key, slice.geometry]));
  const previous = new Map<string, PieArcGeometry>();
  for (const group of ctx.layerGroup.children) {
    const arc = drawnArcs.get(group as SVGGElement);
    if (arc) previous.set(arc.key, arc.geometry);
  }
  const oldOrder = inAngularOrder(previous);
  const newOrder = inAngularOrder(targets);
  // Keep outgoing slices ahead of incoming slices in angular order so their edges meet.
  const exiting = collapseBoundaries(oldOrder, targets, 'endAngle', newOrder[0]?.[1].startAngle);
  const entering = collapseBoundaries(newOrder.reverse(), previous, 'startAngle', oldOrder.at(-1)?.[1].endAngle);

  joinChartItems(
    ctx.layerGroup,
    slices,
    ({ key }) => key,
    ctx.animationConfig,
    (group, { key, slice }, { initial, entered, motion }) => {
      group.setAttribute('transform', center);
      const path = renderPieArcItem(slice, ctx, initial);
      group.replaceChildren(path);

      const target = slice.geometry;
      const from = drawnArcs.get(group)?.geometry ?? collapseArc(target, entering.get(key) ?? target.startAngle);
      const current = { key, geometry: target };
      drawnArcs.set(group, current);
      if (!motion || pieArcPath(from) === slice.pathD) {
        return;
      }

      path.setAttribute('data-animated', 'true');
      path.setAttribute('data-item-transition', entered ? 'enter' : 'update');
      current.geometry = from;
      movingArcs.set(slice, { current, motion });
      tweenArc(path, current, target, motion, () => {
        path.removeAttribute('data-item-transition');
        const hovered = ctx.isInteractive !== false && path.matches(':hover');
        path.setAttribute('d', hovered ? slice.hoverPathD : slice.pathD);
      });
    },
    (group, motion) => {
      const state = drawnArcs.get(group);
      const path = group.querySelector<SVGPathElement>('.mc-pie-arc');
      if (!state || !path) return;
      const target = collapseArc(state.geometry, exiting.get(state.key) ?? state.geometry.startAngle);
      tweenArc(path, state, target, motion);
    }
  );
}

export function renderPieArcLabelsLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  if (!model.enableArcLabels) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.arcs.forEach((arc, idx) => {
    if (Math.abs(arc.endAngle - arc.startAngle) < 0.25) return;
    const label = ctx.renderLabel(g, {
      id: `arc-label-${idx}`,
      text: ctx.i18n.formatPercent(Math.round(arc.percentage) / 100, { maximumFractionDigits: 0 }),
      x: arc.centroid[0],
      y: arc.centroid[1],
      type: 'arc',
      anchor: 'middle',
      baseline: 'middle',
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 700,
      color: '#ffffff',
      datum: {
        id: arc.data.id,
        label: arc.data.label || arc.data.id,
        value: arc.value,
        percentage: Math.round(arc.percentage)
      }
    });
    const moving = movingArcs.get(arc);
    if (!label || !moving) return;
    const transform = label.getAttribute('transform') ?? '';
    moving.motion(() => {
      const geometry = moving.current.geometry;
      const [x, y] = pieArcCentroid(geometry);
      label.setAttribute('transform', `translate(${x - arc.centroid[0]}, ${y - arc.centroid[1]}) ${transform}`);
      label.style.visibility = Math.abs(geometry.endAngle - geometry.startAngle) < 0.25 ? 'hidden' : '';
    }, () => {
      label.setAttribute('transform', transform);
      label.style.visibility = '';
    });
  });

  ctx.layerGroup.appendChild(g);
}

export function renderPieArcLinkLabelsLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  if (!model.enableArcLinkLabels) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);
  const skipAngleRad =
    ((model.arcLinkLabelsSkipAngle ?? 8) * Math.PI) / 180;

  model.arcs.forEach((arc, idx) => {
    if (Math.abs(arc.endAngle - arc.startAngle) < skipAngleRad) return;
    const p2 = arc.linkPoints[2];
    const polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('class', 'mc-pie-link-line');
    polyline.setAttribute('points', formatLinkPoints(arc.linkPoints));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', arc.color);
    polyline.setAttribute('stroke-width', '1.5');
    g.appendChild(polyline);

    const linkLabelG = ctx.renderLabel(g, {
      id: `arc-link-label-${idx}`,
      text: `${arc.data.label || arc.data.id} (${ctx.i18n.formatNumber(arc.value, { useGrouping: false })})`,
      x: p2[0] + (arc.isRightSide ? 6 : -6),
      y: p2[1],
      type: 'arc-link',
      anchor: physicalTextAnchor(arc.isRightSide ? 'start' : 'end', ctx.i18n.direction),
      baseline: 'middle',
      maxWidth: 115,
      fontSize: Math.max(11, ctx.theme.fontSize - 1),
      fontWeight: 500,
      color: ctx.theme.textColor,
      datum: {
        id: arc.data.id,
        label: arc.data.label || arc.data.id,
        value: arc.value
      }
    });
    if (linkLabelG) {
      ctx.registerEventTarget(linkLabelG, {
        target: 'label',
        category: 'label',
        id: `arc-link-label-${idx}`,
        data: {
          id: arc.data.id,
          labelType: 'arc-link',
          text: `${arc.data.label || arc.data.id} (${ctx.i18n.formatNumber(arc.value, { useGrouping: false })})`,
          datum: arc.data,
          index: idx,
          count: model.arcs.length
        }
      });
    }
    const moving = movingArcs.get(arc);
    if (moving) {
      const transform = linkLabelG?.getAttribute('transform') ?? '';
      moving.motion(() => {
        const geometry = moving.current.geometry;
        const rightSide = Math.sin((geometry.startAngle + geometry.endAngle) / 2) >= -1e-6;
        const visible = Math.abs(geometry.endAngle - geometry.startAngle) >= skipAngleRad && rightSide === arc.isRightSide;
        const points = pieArcLinkPoints(geometry, model.arcLinkLabelsDiagonalLength, model.arcLinkLabelsStraightLength, rightSide);
        const tail = points[2];
        polyline.setAttribute('points', formatLinkPoints(points));
        polyline.style.visibility = visible ? '' : 'hidden';
        if (linkLabelG) {
          linkLabelG.setAttribute('transform', `translate(${tail[0] - p2[0]}, ${tail[1] - p2[1]}) ${transform}`);
          linkLabelG.style.visibility = polyline.style.visibility;
        }
      }, () => {
        linkLabelG?.setAttribute('transform', transform);
      });
    }
  });

  ctx.layerGroup.appendChild(g);
}

export function renderPieCenterLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  if (model.innerRadius < 25) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const text = model.centerLabel || `${ctx.i18n.messages.total}\n${formatGroupedNumber(model.total, ctx.i18n)}`;
  ctx.renderLabel(g, {
    id: 'pie-center-label',
    text,
    x: 0,
    y: 0,
    type: 'center',
    anchor: 'middle',
    baseline: 'middle',
    maxWidth: model.innerRadius * 1.7,
    fontSize: ctx.theme.fontSize + 2,
    fontWeight: 700,
    color: ctx.theme.textColor,
    datum: { total: model.total }
  });

  ctx.layerGroup.appendChild(g);
}

export function renderPieLegendsLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  renderLegendLayer(
    ctx,
    model.arcs.map((a) => ({
      id: a.data.id,
      label: a.data.label || a.data.id,
      color: a.color
    })),
    'bottom'
  );
}
