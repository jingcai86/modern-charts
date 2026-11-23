import { resolveChartPointAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext } from '../../core/types';
import type { GaugeChartModel } from '../../models/gauge.model';
import type { ComputedPieArcModel } from '../../models/pie.model';
import type { ComputedSunburstArcModel } from '../../models/sunburst.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Pie / Donut Slice Arc Item.
 */
export function renderPieArcItem(
  arc: ComputedPieArcModel,
  ctx: ChartRenderContext<any>
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-pie-arc');
  path.setAttribute('data-item-component', 'mc-arc-item');
  path.setAttribute('data-id', arc.data.id);
  path.setAttribute('d', arc.pathD);
  const pieFill =
    ctx.resolveFill?.({
      id: arc.data.id,
      seriesId: arc.data.id,
      category: arc.data.label || arc.data.id,
      index: arc.index,
      value: arc.value,
      color: arc.color,
      chartType: 'pie',
      target: 'arc',
      datum: arc.data
    }) ?? arc.color;
  path.setAttribute('fill', pieFill);
  path.setAttribute('stroke', ctx.theme.background);
  path.setAttribute('stroke-width', '1.5');
  const isInteractive = ctx.isInteractive !== false;
  if (isInteractive) {
    path.style.cursor = 'pointer';
    path.style.transition = 'd 160ms ease, filter 160ms ease';
  }

  const pieCx =
    (ctx.state?.model as { cx?: number } | undefined)?.cx ?? ctx.innerWidth / 2;
  const pieCy =
    (ctx.state?.model as { cy?: number } | undefined)?.cy ?? ctx.innerHeight / 2;
  const getPieAnchor = () =>
    resolveChartPointAnchor(
      ctx,
      pieCx + arc.centroid[0],
      pieCy + arc.centroid[1],
      16,
      16
    );

  ctx.decorateAriaItem(path, {
    type: 'arc',
    index: arc.index,
    total: arc.totalCount,
    id: arc.data.id,
    label: arc.data.label || arc.data.id,
    value: arc.value,
    formattedValue: String(arc.value),
    percentage: arc.percentage,
    color: arc.color,
    anchor: {
      left: ctx.margin.left + pieCx + arc.centroid[0] - 8,
      top: ctx.margin.top + pieCy + arc.centroid[1] - 8,
      width: 16,
      height: 16,
      relative: true
    },
    datum: {
      ...arc.data,
      percentage: arc.percentage
    }
  });

  ctx.animateItem(path, {
    type: 'arc-sweep',
    index: arc.index,
    originX: 0,
    originY: 0
  });

  const pieTotal =
    (ctx.state?.model as { total?: number } | undefined)?.total ?? undefined;
  ctx.registerEventTarget(path, {
    target: 'pieSlice',
    category: 'item',
    id: arc.data.id,
    data: {
      id: arc.data.id,
      label: arc.data.label || arc.data.id,
      value: arc.value,
      percentage: arc.percentage,
      total: pieTotal,
      index: arc.index,
      count: arc.totalCount,
      color: arc.color,
      startAngle: arc.startAngle,
      endAngle: arc.endAngle,
      datum: arc.data
    }
  });

  if (isInteractive) {
    path.addEventListener('mouseenter', (e) => {
      path.setAttribute('d', arc.hoverPathD);
      path.style.filter = 'brightness(1.08)';
      ctx.showTooltip(
        {
          title: arc.data.label || arc.data.id,
          label: 'Value',
          seriesId: arc.data.id,
          value: arc.value,
          formattedValue: `${arc.value} (${arc.percentage.toFixed(1)}%)`,
          color: arc.color,
          percentage: arc.percentage,
          anchor: getPieAnchor(),
          datum: { ...arc.data, percentage: arc.percentage }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    path.addEventListener('mouseleave', () => {
      path.setAttribute('d', arc.pathD);
      path.style.filter = 'none';
      ctx.hideTooltip();
    });
  }

  return path;
}

/**
 * Dumb Presentation Renderer for a single Sunburst Hierarchy Arc Item.
 */
export function renderSunburstArcItem(
  arc: ComputedSunburstArcModel,
  ctx: ChartRenderContext<any>,
  interactive: boolean,
  onDrilldown?: (pathNames: string[]) => void
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-sunburst-arc');
  path.setAttribute('data-item-component', 'mc-arc-item');
  path.setAttribute('data-name', arc.name);
  path.setAttribute('data-depth', String(arc.depth));
  path.setAttribute('d', arc.pathD);
  const sunburstFill =
    ctx.resolveFill?.({
      id: arc.name,
      seriesId: arc.pathNames[0] || arc.name,
      category: arc.pathNames[0] || arc.name,
      index: arc.index,
      value: arc.value,
      color: arc.color,
      chartType: 'sunburst',
      target: 'arc',
      datum: {
        id: arc.name,
        name: arc.name,
        breadcrumb: arc.breadcrumb,
        pathNames: arc.pathNames,
        depth: arc.depth,
        value: arc.value
      }
    }) ?? arc.color;
  path.setAttribute('fill', sunburstFill);
  const chartInteractive = ctx.isInteractive !== false;
  path.style.cursor =
    chartInteractive && interactive && arc.hasChildren ? 'pointer' : 'default';
  if (chartInteractive) {
    path.style.transition = 'opacity 150ms ease, filter 150ms ease';
  }

  const sunCx =
    (ctx.state?.model as { cx?: number } | undefined)?.cx ?? ctx.innerWidth / 2;
  const sunCy =
    (ctx.state?.model as { cy?: number } | undefined)?.cy ?? ctx.innerHeight / 2;
  const getSunburstAnchor = () =>
    resolveChartPointAnchor(
      ctx,
      sunCx + arc.centroid[0],
      sunCy + arc.centroid[1],
      16,
      16
    );

  ctx.decorateAriaItem(path, {
    type: 'sunburst-arc',
    index: arc.index,
    total: arc.totalCount,
    id: arc.name,
    label: arc.breadcrumb,
    category: arc.pathNames[0] || arc.name,
    value: arc.value,
    formattedValue: String(arc.value),
    percentage: arc.percentage,
    color: arc.color,
    anchor: {
      left: ctx.margin.left + sunCx + arc.centroid[0] - 8,
      top: ctx.margin.top + sunCy + arc.centroid[1] - 8,
      width: 16,
      height: 16,
      relative: true
    },
    datum: {
      name: arc.name,
      breadcrumb: arc.breadcrumb,
      depth: arc.depth,
      value: arc.value,
      percentage: arc.percentage
    }
  });

  ctx.animateItem(path, {
    type: 'arc-sweep',
    index: arc.index,
    originX: 0,
    originY: 0
  });

  if (chartInteractive) {
    path.addEventListener('mouseenter', (e) => {
      path.style.filter = 'brightness(1.12)';
      ctx.showTooltip(
        {
          title: arc.breadcrumb,
          label: arc.name,
          category: arc.pathNames[0] || arc.name,
          value: arc.value,
          formattedValue: `${arc.value} (${arc.percentage.toFixed(1)}%)`,
          color: arc.color,
          percentage: arc.percentage,
          anchor: getSunburstAnchor(),
          datum: {
            name: arc.name,
            breadcrumb: arc.breadcrumb,
            pathNames: arc.pathNames,
            depth: arc.depth,
            value: arc.value,
            percentage: arc.percentage
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    path.addEventListener('mouseleave', () => {
      path.style.filter = 'none';
      ctx.hideTooltip();
    });

    if (interactive && arc.hasChildren && onDrilldown) {
      path.addEventListener('click', () => {
        ctx.hideTooltip();
        onDrilldown(arc.pathNames);
      });
    }
  }

  ctx.registerEventTarget(path, {
    target: 'sunburstArc',
    category: 'item',
    id: arc.name,
    data: {
      id: arc.name,
      name: arc.name,
      breadcrumb: arc.breadcrumb,
      pathNames: arc.pathNames,
      depth: arc.depth,
      value: arc.value,
      percentage: arc.percentage,
      index: arc.index,
      count: arc.totalCount,
      hasChildren: arc.hasChildren,
      color: arc.color
    }
  });

  return path;
}

/**
 * Dumb Presentation Renderer for the Gauge Value Arc Item.
 */
export function renderGaugeValueArcItem(
  model: GaugeChartModel,
  ctx: ChartRenderContext<any>
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'mc-gauge-value-arc');
  path.setAttribute('data-item-component', 'mc-arc-item');
  path.setAttribute('d', model.valueArcPathD);
  const gaugeFill =
    ctx.resolveFill?.({
      id: model.label || 'gauge',
      seriesId: model.label || 'gauge',
      index: 0,
      value: model.value,
      color: ctx.theme.colors[0],
      chartType: 'gauge',
      target: 'arc',
      datum: model.datum
    }) ?? ctx.theme.colors[0];
  path.setAttribute('fill', gaugeFill);

  const getGaugeAnchor = () =>
    resolveChartPointAnchor(
      ctx,
      model.cx,
      model.cy - model.outerRadius,
      20,
      12
    );

  ctx.decorateAriaItem(path, {
    type: 'gauge-arc',
    index: 0,
    total: 1,
    id: model.label || 'gauge-metric',
    label: model.label || 'Gauge Metric',
    value: model.value,
    formattedValue: `${model.value}${model.unit}`,
    color: ctx.theme.colors[0],
    anchor: {
      left: ctx.margin.left + model.cx - 10,
      top: ctx.margin.top + model.cy - model.outerRadius - 6,
      width: 20,
      height: 12,
      relative: true
    },
    datum: {
      value: model.value,
      min: model.min,
      max: model.max,
      unit: model.unit,
      label: model.label
    }
  });

  ctx.animateItem(path, {
    type: 'arc-sweep',
    index: 0,
    originX: 0,
    originY: 0
  });

  if (ctx.isInteractive !== false) {
    path.style.cursor = 'pointer';
    path.addEventListener('mouseenter', (e) => {
      path.style.filter = 'brightness(1.08)';
      ctx.showTooltip(
        {
          title: model.label || 'Gauge Metric',
          label: 'Value',
          value: model.value,
          formattedValue: `${model.value}${model.unit}`,
          color: ctx.theme.colors[0],
          anchor: getGaugeAnchor(),
          datum: {
            ...model.datum,
            value: model.value,
            min: model.min,
            max: model.max,
            unit: model.unit,
            label: model.label
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    path.addEventListener('mouseleave', () => {
      path.style.filter = 'none';
      ctx.hideTooltip();
    });
  }

  const gaugeRange = model.max - model.min;
  const gaugePct =
    gaugeRange !== 0 ? ((model.value - model.min) / gaugeRange) * 100 : 0;
  ctx.registerEventTarget(path, {
    target: 'gaugeArc',
    category: 'item',
    id: model.label || 'gauge-metric',
    data: {
      label: model.label || 'Gauge Metric',
      value: model.value,
      min: model.min,
      max: model.max,
      unit: model.unit,
      percentage: gaugePct,
      count: 1,
      datum: model.datum
    }
  });

  return path;
}

/**
 * Dumb Presentation Renderer for the Gauge Needle & Pivot Item.
 */
export function renderGaugeNeedleItem(
  model: GaugeChartModel,
  ctx: ChartRenderContext<any>
): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${model.cx}, ${model.cy})`);

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('class', 'mc-gauge-needle');
  line.setAttribute('data-item-component', 'mc-gauge-needle-item');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', String(model.needleX2));
  line.setAttribute('y2', String(model.needleY2));
  line.setAttribute('stroke', ctx.theme.textColor);
  line.setAttribute('stroke-width', '2.5');
  line.setAttribute('stroke-linecap', 'round');

  ctx.animateItem(line, {
    type: 'needle-sweep',
    index: 0,
    originX: 0,
    originY: 0
  });

  g.appendChild(line);

  const pivot = document.createElementNS(SVG_NS, 'circle');
  pivot.setAttribute('r', '5');
  pivot.setAttribute('fill', ctx.theme.colors[0]);
  pivot.setAttribute('stroke', ctx.theme.background);
  pivot.setAttribute('stroke-width', '2');
  g.appendChild(pivot);

  ctx.registerEventTarget(g, {
    target: 'gaugeNeedle',
    category: 'item',
    id: 'gauge-needle',
    data: {
      label: model.label || 'Gauge Metric',
      value: model.value,
      min: model.min,
      max: model.max,
      unit: model.unit,
      datum: model.datum
    }
  });

  return g;
}

export class MCArcItem extends HTMLElement {}
