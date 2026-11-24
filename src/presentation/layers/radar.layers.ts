import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, RadarDatum } from '../../core/types';
import type { RadarChartModel } from '../../models/radar.model';
import {
  renderRadarDotItem,
  renderRadarPolygonItem
} from '../items/radar.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  if (!model.enableDots || (model.dotSize ?? 8.4) <= 0) return;
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
