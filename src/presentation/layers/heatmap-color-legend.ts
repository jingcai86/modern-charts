import {
  COLOR_LEGEND_LABEL_GAP,
  COLOR_LEGEND_TICK_LENGTH,
  COLOR_LEGEND_TICK_OFFSET,
  getHeatmapLegendMetrics
} from '../../core/heatmap-legend-layout';
import { physicalTextAnchor } from '../../core/i18n';
import { allocateUniqueSvgId } from '../../core/threshold-clip';
import type { ChartRenderContext, HeatmapRow, LegendItem } from '../../core/types';
import type { HeatmapChartModel, HeatmapColorBin } from '../../models/heatmap.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

type HeatmapContext = ChartRenderContext<HeatmapRow[]>;
type Boundary = { value: number; offset: number; text: string };

function svgElement<T extends keyof SVGElementTagNameMap>(
  tag: T,
  attributes: Record<string, string | number | boolean>
): SVGElementTagNameMap[T] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function getValueFormatter(ctx: HeatmapContext): (value: number) => string {
  const { tickFormat } = ctx.legendConfig;
  if (typeof tickFormat === 'function') return tickFormat;
  if (tickFormat) {
    try {
      ctx.i18n.formatNumber(0, tickFormat);
      return (value) => ctx.i18n.formatNumber(value, tickFormat);
    } catch {
      // Invalid options fall back to the default chart number format.
    }
  }
  return (value) => ctx.i18n.formatNumber(value, { useGrouping: false, maximumSignificantDigits: 12 });
}

function getHorizontalGeometry(
  ctx: HeatmapContext,
  minText: string,
  maxText: string,
  clearance: number
) {
  const cfg = ctx.legendConfig;
  const metrics = getHeatmapLegendMetrics(cfg);
  const { padding } = cfg;
  const top = cfg.position === 'top';
  const titleClearance = top && ctx.rootGroup.querySelector('.mc-layer--title')
    ? ctx.margin.top / 2 + (ctx.theme.fontSize + 3) * 0.65
    : 0;
  const depth = Math.max(1, ctx.margin[cfg.position] - padding.top - padding.bottom - clearance - titleClearance);
  const tickDepth = metrics.labelPlacement === 'ticks'
    ? Math.min(Math.max(0, depth - 1), COLOR_LEGEND_TICK_OFFSET + metrics.labelHeight)
    : 0;
  const height = Math.min(metrics.thickness, Math.max(1, depth - tickDepth));
  const availableWidth = Math.max(1, ctx.innerWidth - padding.left - padding.right);
  const defaultWidth = cfg.type === 'discrete'
    ? Math.min(340, Math.max(70, ctx.innerWidth * 0.86))
    : Math.min(140, Math.max(70, ctx.innerWidth * 0.36));
  const labelOptions = { type: 'legend' as const, fontSize: metrics.fontSize };
  const endLimit = availableWidth / 4;
  const sideSpace = (text: string): number => metrics.labelPlacement === 'ends' && text.length > 0
    ? Math.min(endLimit, ctx.measureText(text, labelOptions).boxWidth + COLOR_LEGEND_LABEL_GAP)
    : 0;
  const minSpace = sideSpace(minText);
  const maxSpace = sideSpace(maxText);
  const width = Math.min(cfg.width ?? defaultWidth, Math.max(1, availableWidth - minSpace - maxSpace));
  const spareWidth = Math.max(0, availableWidth - width - minSpace - maxSpace);
  const x = padding.left + minSpace + (top ? spareWidth : spareWidth / 2);
  const y = top
    ? -clearance - padding.bottom - height - tickDepth
    : ctx.innerHeight + clearance + padding.top;
  return { ...metrics, x, y, width, height, minSpace, maxSpace };
}

function getVerticalGeometry(ctx: HeatmapContext, minText: string, maxText: string, clearance: number) {
  const cfg = ctx.legendConfig;
  const metrics = getHeatmapLegendMetrics(cfg);
  const { padding } = cfg;
  const leftSide = cfg.position === 'left';
  const depth = Math.max(1, ctx.margin[cfg.position] - padding.left - padding.right - clearance);
  const labelWidth = metrics.labelPlacement === 'ticks'
    ? Math.min(metrics.labelWidth, Math.max(1, depth - metrics.thickness - COLOR_LEGEND_TICK_OFFSET))
    : Math.min(metrics.labelWidth, depth);
  const tickDepth = metrics.labelPlacement === 'ticks' ? COLOR_LEGEND_TICK_OFFSET + labelWidth : 0;
  const width = Math.min(metrics.thickness, Math.max(1, depth - tickDepth));
  const labelOptions = { type: 'legend' as const, fontSize: metrics.fontSize, maxWidth: labelWidth };
  const endWidth = metrics.labelPlacement === 'ends'
    ? Math.max(ctx.measureText(minText, labelOptions).boxWidth, ctx.measureText(maxText, labelOptions).boxWidth)
    : 0;
  const endInset = Math.max(0, (endWidth - width) / 2);
  const x = leftSide
    ? -ctx.margin.left + padding.left + tickDepth + endInset
    : ctx.innerWidth + ctx.margin.right - padding.right - tickDepth - endInset - width;
  const endSpace = metrics.labelPlacement === 'ends' ? metrics.labelHeight + COLOR_LEGEND_LABEL_GAP : 0;
  const availableHeight = Math.max(1, ctx.innerHeight - padding.top - padding.bottom - 2 * endSpace);
  const defaultHeight = cfg.type === 'discrete'
    ? Math.min(220, Math.max(60, ctx.innerHeight * 0.84))
    : Math.min(130, Math.max(60, ctx.innerHeight * 0.45));
  const height = Math.min(cfg.height ?? defaultHeight, availableHeight);
  const y = padding.top + endSpace + (availableHeight - height) / 2;
  return { ...metrics, x, y, width, height, labelWidth, minSpace: labelWidth, maxSpace: labelWidth };
}

type LegendGeometry = ReturnType<typeof getHorizontalGeometry>;

function addRangeInteractions(
  group: SVGGElement,
  swatch: SVGRectElement,
  ctx: HeatmapContext,
  range: HeatmapColorBin,
  index: number,
  total: number,
  format: (value: number) => string
): void {
  if (!ctx.isInteractive) return;
  const { min, max, color } = range;
  const maxInclusive = index === total - 1;
  const label = min === max ? format(min) : `${format(min)} – ${format(max)}`;
  const id = `heatmap-range-${index}`;
  const item: LegendItem = { id, label, value: label, color, index, total, meta: { min, max, maxInclusive } };
  group.setAttribute('data-legend-id', id);
  group.setAttribute('role', 'listitem');
  group.setAttribute('aria-label', ctx.i18n.message('legendItem', { label }));
  ctx.registerEventTarget(group, {
    target: 'legend',
    category: 'legend',
    id,
    data: { ...item, min, max, maxInclusive, count: total, position: ctx.legendConfig.position, datum: item }
  });
  const enabled = ctx.legendConfig.enableTooltip && ctx.legendConfig.tooltip.enabled !== false;
  const payload = {
    label: ctx.i18n.messages.value,
    seriesId: id,
    value: label,
    formattedValue: label,
    color,
    datum: item
  };
  if (enabled) {
    group.addEventListener('mouseenter', (event) => {
      const { clientX, clientY } = event as MouseEvent;
      ctx.showLegendTooltip(payload, clientX, clientY);
    });
    group.addEventListener('mouseleave', ctx.hideLegendTooltip);
  }

  if (!ctx.ariaConfig.isFocusable) return;
  group.setAttribute('tabindex', '0');
  group.addEventListener('focus', () => {
    swatch.setAttribute('stroke', ctx.theme.textColor);
    swatch.setAttribute('stroke-width', '2');
    if (!enabled) return;
    const rect = swatch.getBoundingClientRect();
    ctx.showLegendTooltip({ ...payload, source: 'keyboard', anchor: rect }, rect.left + rect.width / 2, rect.top);
  });
  group.addEventListener('blur', () => {
    swatch.removeAttribute('stroke');
    swatch.removeAttribute('stroke-width');
    if (enabled) ctx.hideLegendTooltip();
  });
  group.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && enabled) ctx.hideLegendTooltip();
  });
}

function getBinSpacing(length: number, count: number, requestedGap: number) {
  const gap = Math.min(requestedGap, length / count / 2);
  const size = (length - (count - 1) * gap) / count;
  return { size, gap, step: size + gap };
}

function renderBlocks(
  legend: SVGGElement,
  model: HeatmapChartModel,
  ctx: HeatmapContext,
  geometry: LegendGeometry,
  boundaries: ReturnType<typeof getBinSpacing>,
  format: (value: number) => string
): void {
  const { vertical, width, height } = geometry;
  const { size, step } = boundaries;
  const radius = Math.min((ctx.legendConfig.borderRadius ?? 4), Math.min(vertical ? width : height, size) / 2);
  model.bins.forEach((bin, index) => {
    const item = svgElement('g', { class: 'mc-legend-item', 'data-legend-index': index });
    const block = svgElement('rect', {
      class: 'mc-legend-swatch mc-legend-discrete-block',
      'data-min': bin.min,
      'data-max': bin.max,
      'data-max-inclusive': index === model.bins.length - 1,
      x: vertical ? 0 : index * step,
      y: vertical ? Math.max(0, height - index * step - size) : 0,
      width: vertical ? width : size,
      height: vertical ? size : height,
      rx: radius,
      fill: bin.color
    });
    item.appendChild(block);
    addRangeInteractions(item, block, ctx, bin, index, model.bins.length, format);
    legend.appendChild(item);
  });
}

function renderGradient(
  legend: SVGGElement,
  model: HeatmapChartModel,
  ctx: HeatmapContext,
  geometry: LegendGeometry,
  defs: Element | null,
  format: (value: number) => string
): void {
  const { minVal: min, maxVal: max, seqScale } = model;
  const { vertical, width, height } = geometry;
  const gradId = allocateUniqueSvgId('mc-legend-continuous-grad');
  if (defs) {
    const gradient = svgElement('linearGradient', {
      id: gradId,
      x1: '0%', y1: vertical ? '100%' : '0%',
      x2: vertical ? '0%' : '100%', y2: '0%'
    });
    for (let index = 0; index <= 10; index++) {
      const t = index / 10;
      const value = min * (1 - t) + max * t;
      gradient.appendChild(svgElement('stop', {
        offset: `${index * 10}%`, 'stop-color': seqScale(value)
      }));
    }
    defs.appendChild(gradient);
  }
  const swatch = svgElement('rect', {
    class: 'mc-legend-gradient-bar',
    x: 0, y: 0, width, height,
    rx: Math.min(ctx.legendConfig.borderRadius ?? 4, Math.min(width, height) / 2),
    fill: defs ? `url(#${gradId})` : seqScale(max)
  });
  const item = svgElement('g', { class: 'mc-legend-gradient-range' });
  item.appendChild(swatch);
  addRangeInteractions(item, swatch, ctx, { min, max, color: seqScale(min / 2 + max / 2) }, 0, 1, format);
  legend.appendChild(item);
  if (ctx.legendConfig.calculable) {
    legend.setAttribute('data-calculable', 'true');
    for (const end of ['min', 'max'] as const) {
      const minimum = end === 'min';
      legend.appendChild(svgElement('circle', {
        class: `mc-legend-handle mc-legend-handle--${end}`,
        'data-handle': end,
        cx: vertical ? width / 2 : minimum ? 0 : width,
        cy: vertical ? (minimum ? height : 0) : height / 2,
        r: 6,
        fill: seqScale(minimum ? min : max),
        stroke: '#ffffff',
        'stroke-width': 2
      }));
    }
  }
}

function renderEndLabels(
  legend: SVGGElement,
  ctx: HeatmapContext,
  geometry: LegendGeometry,
  idPrefix: string,
  minText: string,
  maxText: string
): void {
  const { vertical, width, height, fontSize, labelHeight, minSpace, maxSpace } = geometry;
  const gap = COLOR_LEGEND_LABEL_GAP;
  const label = (end: 'min' | 'max', text: string, x: number, y: number, maxWidth: number) => {
    if (!text) return;
    const anchor = vertical ? 'middle' : end === 'min' ? 'end' : 'start';
    ctx.renderLabel(legend, {
      id: `${idPrefix}-${end}`, text, x, y, type: 'legend',
      anchor: physicalTextAnchor(anchor, ctx.i18n.direction),
      baseline: 'middle',
      maxWidth: Math.max(1, maxWidth),
      fontSize, color: ctx.theme.mutedTextColor
    });
  };
  label('min', minText, vertical ? width / 2 : -gap, vertical ? height + gap + labelHeight / 2 : height / 2,
    vertical ? minSpace : minSpace - gap);
  label('max', maxText, vertical ? width / 2 : width + gap, vertical ? -gap - labelHeight / 2 : height / 2,
    vertical ? maxSpace : maxSpace - gap);
}

function renderBoundaryTicks(
  legend: SVGGElement,
  ctx: HeatmapContext,
  geometry: LegendGeometry,
  boundaries: Boundary[]
): void {
  const { vertical, width, height, fontSize, labelHeight } = geometry;
  const left = ctx.legendConfig.position === 'left';
  const tickStart = left ? 0 : width;
  const sign = left ? -1 : 1;
  const maxWidth = vertical ? geometry.labelWidth : Math.max(1, width / 2 - 3);
  const labelOptions = { type: 'legend' as const, fontSize, maxWidth };
  const labelSizes = boundaries.map(({ text }) => ctx.measureText(text, labelOptions));
  const lastIndex = boundaries.length - 1;
  let previousEnd = -Infinity;
  const finalLabelRoom = vertical ? labelHeight / 2 : labelSizes[lastIndex].boxWidth;
  const finalLabelStart = boundaries[lastIndex].offset - finalLabelRoom;
  boundaries.forEach(({ value, offset, text }, index) => {
    const pos = vertical ? height - offset : offset;
    const first = index === 0;
    const last = index === lastIndex;
    legend.appendChild(svgElement('line', {
      class: 'mc-legend-tick',
      'data-value': value,
      x1: vertical ? tickStart : pos,
      x2: vertical ? tickStart + sign * COLOR_LEGEND_TICK_LENGTH : pos,
      y1: vertical ? pos : height,
      y2: vertical ? pos : height + COLOR_LEGEND_TICK_LENGTH,
      stroke: ctx.theme.axisColor
    }));

    const extent = vertical ? labelHeight : labelSizes[index].boxWidth;
    const inward = vertical || lastIndex === 0 ? extent / 2 : first ? 0 : last ? extent : extent / 2;
    const start = offset - inward;
    const end = start + extent;
    if (!first && !last && (start < previousEnd + 3 || end + 3 > finalLabelStart)) return;
    previousEnd = end;
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (vertical) anchor = left ? 'end' : 'start';
    else if (lastIndex > 0 && (first || last)) anchor = first ? 'start' : 'end';
    ctx.renderLabel(legend, {
      ...labelOptions,
      id: `legend-discrete-tick-${index}`,
      text,
      x: vertical ? tickStart + sign * COLOR_LEGEND_TICK_OFFSET : pos,
      y: vertical ? pos : height + COLOR_LEGEND_TICK_OFFSET,
      anchor: physicalTextAnchor(anchor, ctx.i18n.direction),
      baseline: vertical ? 'middle' : 'hanging',
      color: ctx.theme.mutedTextColor
    });
  });
}

export function renderHeatmapColorLegend(
  model: HeatmapChartModel,
  ctx: HeatmapContext,
  defs: Element | null | undefined,
  clearance: number
): void {
  const cfg = ctx.legendConfig;
  const discrete = cfg.type === 'discrete';
  const type = discrete ? 'discrete' : 'continuous';
  const { minVal: min, maxVal: max, bins } = model;
  if (discrete && bins.length === 0) return;

  const format = getValueFormatter(ctx);
  const minText = cfg.minLabel ?? format(min);
  const maxText = cfg.maxLabel ?? format(max);
  const geometry = cfg.position === 'left' || cfg.position === 'right'
    ? getVerticalGeometry(ctx, minText, maxText, clearance)
    : getHorizontalGeometry(ctx, minText, maxText, clearance);

  const legend = svgElement('g', {
    class: `mc-legend mc-legend--${type} mc-legend--${cfg.position}`,
    'data-legend-type': type, 'data-legend-position': cfg.position,
    'data-min': min, 'data-max': max,
    transform: `translate(${geometry.x}, ${geometry.y})`,
    direction: ctx.i18n.direction
  });
  if (ctx.isInteractive) {
    legend.setAttribute('role', 'list');
    legend.setAttribute('aria-label', ctx.i18n.messages.legend);
  }
  if (discrete) {
    const length = geometry.vertical ? geometry.height : geometry.width;
    const spacing = getBinSpacing(length, bins.length, cfg.blockGap ?? 2);
    renderBlocks(legend, model, ctx, geometry, spacing, format);
    if (geometry.labelPlacement === 'ticks') {
      const boundaries = min === max
        ? [{ value: min, offset: length / 2, text: minText }]
        : [
            { value: min, offset: 0, text: minText },
            ...bins.slice(0, -1).map((bin, index) => ({
              value: bin.max,
              offset: (index + 1) * spacing.step - spacing.gap / 2,
              text: format(bin.max)
            })),
            { value: max, offset: length, text: maxText }
          ];
      renderBoundaryTicks(legend, ctx, geometry, boundaries);
    }
  } else {
    renderGradient(legend, model, ctx, geometry, defs ?? ctx.svg.querySelector('.mc-chart-defs'), format);
  }
  if (geometry.labelPlacement === 'ends') {
    renderEndLabels(legend, ctx, geometry, `legend-${type}`, minText, maxText);
  }
  ctx.layerGroup.appendChild(legend);
}
