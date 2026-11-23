import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, RadarDatum } from '../../core/types';
import type { RadarChartModel } from '../../models/radar.model';
import {
  renderRadarDotItem,
  renderRadarPolygonItem
} from '../items/radar.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderRadarGridLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  for (let lvl = 1; lvl <= model.gridLevels; lvl++) {
    const r = (model.radius / model.gridLevels) * lvl;
    if (model.gridShape === 'linear' && model.axes.length >= 3) {
      const pts = model.axes
        .map((_, i) => {
          const angle =
            (i / model.axes.length) * 2 * Math.PI - Math.PI / 2;
          return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
        })
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

  model.axes.forEach((axisName, i) => {
    const angle =
      (i / Math.max(1, model.axes.length)) * 2 * Math.PI - Math.PI / 2;
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

    const labelR = model.radius + 18;
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
      anchor,
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
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.series.forEach((s) => {
    if (s.points.length === 0) return;
    g.appendChild(renderRadarPolygonItem(s, ctx));
  });

  ctx.layerGroup.appendChild(g);
}

export function renderRadarDotsLayer(
  model: RadarChartModel,
  ctx: ChartRenderContext<RadarDatum[]>
): void {
  if (!model.enableDots) return;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  model.series.forEach((s) => {
    s.points.forEach((pt) => {
      g.appendChild(renderRadarDotItem(pt, ctx));
    });
  });

  ctx.layerGroup.appendChild(g);
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
      ctx.renderLabel(g, {
        id: `radar-pt-${s.key}-${idx}`,
        text: String(pt.value),
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
