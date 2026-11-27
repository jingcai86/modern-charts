import { joinChartItems } from '../../core/chart-item-join';
import { physicalTextAnchor } from '../../core/i18n';
import { formatGroupedNumber } from '../../core/format';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, PieDatum } from '../../core/types';
import { pieArcPath, type PieArcGeometry, type PieChartModel } from '../../models/pie.model';
import { renderPieArcItem } from '../items/arc.item';

const SVG_NS = 'http://www.w3.org/2000/svg';
const drawnArcs = new WeakMap<SVGGElement, PieArcGeometry>();

export function renderPieArcsLayer(
  model: PieChartModel,
  ctx: ChartRenderContext<PieDatum[]>
): void {
  const center = `translate(${model.cx}, ${model.cy})`;
  joinChartItems(
    ctx.layerGroup,
    model.arcs,
    (slice) => slice.data.id,
    ctx.animationConfig,
    (group, slice, { initial, entered, structureChanged, motion }) => {
      group.setAttribute('transform', center);
      const path = renderPieArcItem(slice, ctx, initial);
      group.replaceChildren(path);

      const target = slice.geometry;
      const from = entered
        ? { ...target, endAngle: target.startAngle, padAngle: 0 }
        : drawnArcs.get(group);
      if (initial || !motion || !from || (!entered && structureChanged) || pieArcPath(from) === slice.pathD) {
        drawnArcs.set(group, target);
        return;
      }

      const geometry = { ...from };
      const fields = Object.keys(target) as Array<keyof PieArcGeometry>;
      const transition = path.style.transition;
      path.style.transition = '';
      path.setAttribute('data-animated', 'true');
      path.setAttribute('data-item-transition', entered ? 'enter' : 'update');
      drawnArcs.set(group, geometry);
      motion((progress) => {
        for (const field of fields) geometry[field] = from[field] + (target[field] - from[field]) * progress;
        path.setAttribute('d', pieArcPath(geometry));
      }, () => {
        drawnArcs.set(group, target);
        path.style.transition = transition;
        path.removeAttribute('data-item-transition');
        const hovered = ctx.isInteractive !== false && path.matches(':hover');
        path.setAttribute('d', hovered ? slice.hoverPathD : slice.pathD);
      });
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
    if (arc.endAngle - arc.startAngle < 0.25) return;
    ctx.renderLabel(g, {
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
    const [p0, p1, p2] = arc.linkPoints;
    const polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('class', 'mc-pie-link-line');
    polyline.setAttribute(
      'points',
      `${p0[0]},${p0[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`
    );
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
