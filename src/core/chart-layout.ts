import type { MCBaseChart } from './base-chart';
import {
  getHeatmapLegendAxisClearance,
  getHeatmapLegendMetrics,
  isHeatmapColorLegend
} from './heatmap-legend-layout';
import type { LabelEngine } from './label-engine';
import { resolveMarkerAnnotation } from './marker-engine';
import type { ChartConfig, ChartDimensions, ChartMargin, ChartTheme, ResolvedLegendConfig } from './types';

type LayoutChart = Pick<MCBaseChart,
  | 'autoSize'
  | 'chartTitle'
  | 'chartType'
  | 'clientHeight'
  | 'clientWidth'
  | 'defaultLayers'
  | 'getAttribute'
  | 'getActiveLayers'
  | 'getBoundingClientRect'
  | 'parentElement'
  | 'querySelector'
  | 'resolveLegendConfig'
  | 'resolveMargin'
  | 'resolveMarkersConfig'
  | 'resolveScaleConfig'
  | 'resolveTheme'
>;

type LayoutConfig = Pick<ChartConfig, 'width' | 'height' | 'xTitle' | 'yTitle' | 'legend'>;

export function resolveChartDimensions(
  chart: LayoutChart,
  config: LayoutConfig,
  labelEngine: Pick<LabelEngine, 'measure'>
): ChartDimensions {
  const cfgW = config.width;
  const cfgH = config.height;
  const attrW = chart.getAttribute('width');
  const attrH = chart.getAttribute('height');

  const hostRect = chart.getBoundingClientRect?.() ?? { width: 0, height: 0 };
  const parent = chart.parentElement;
  const parentRect = parent?.getBoundingClientRect?.() ?? {
    width: 0,
    height: 0
  };

  const parentW =
    (parent?.clientWidth || Math.round(parentRect.width)) ?? 0;
  const parentH =
    (parent?.clientHeight || Math.round(parentRect.height)) ?? 0;
  const hostW = chart.clientWidth || Math.round(hostRect.width) || 0;
  const hostH = chart.clientHeight || Math.round(hostRect.height) || 0;

  let width =
    cfgW && cfgW > 0
      ? cfgW
      : attrW !== null && Number(attrW) > 0
      ? Number(attrW)
      : hostW > 0
      ? hostW
      : parentW > 0
      ? parentW
      : 640;

  let height =
    cfgH && cfgH > 0
      ? cfgH
      : attrH !== null && Number(attrH) > 0
      ? Number(attrH)
      : hostH > 0
      ? hostH
      : parentH > 0
      ? parentH
      : chart.autoSize
      ? Math.max(280, Math.round(width * 0.56))
      : 380;

  width = Math.max(160, Math.round(width));
  height = Math.max(140, Math.round(height));

  const margin = { ...chart.resolveMargin() };
  expandMarginForAxes(chart, config, margin);
  expandMarginForMarkerAnnotations(chart, labelEngine, margin);
  expandMarginForLegend(chart, config, margin, width, height);
  const innerWidth = Math.max(40, width - margin.left - margin.right);
  const innerHeight = Math.max(40, height - margin.top - margin.bottom);

  return { width, height, innerWidth, innerHeight, margin };
}

function expandMarginForAxes(chart: LayoutChart, config: LayoutConfig, margin: ChartMargin): void {
  if (!chart.defaultLayers.includes('axes')) return;
  const scaleCfg = chart.resolveScaleConfig();
  const xPos = scaleCfg.x?.position ?? 'bottom';
  const yPos = scaleCfg.y?.position ?? 'left';
  const hasXTitle = Boolean(
    scaleCfg.x?.title ||
      config.xTitle ||
      chart.getAttribute('x-title')
  );
  const hasYTitle = Boolean(
    scaleCfg.y?.title ||
      config.yTitle ||
      chart.getAttribute('y-title')
  );
  const hasChartTitle = Boolean(chart.chartTitle);

  if (xPos === 'top' || xPos === 'both') {
    const topNeeded =
      (hasChartTitle ? 28 : 8) + (hasXTitle ? 44 : 28);
    margin.top = Math.max(margin.top, topNeeded);
  }
  if (yPos === 'right' || yPos === 'both') {
    const rightNeeded = hasYTitle ? 68 : 52;
    margin.right = Math.max(margin.right, rightNeeded);
  }
}

/**
 * Automatically reserves enough margin space when any active marker defines
 * an outside `annotation` (`left`, `right`, `top`, or `bottom`) so outside
 * annotation icons/text never clip against the SVG viewport.
 */
function expandMarginForMarkerAnnotations(
  chart: LayoutChart,
  labelEngine: Pick<LabelEngine, 'measure'>,
  margin: ChartMargin
): void {
  const markers = chart.resolveMarkersConfig();
  if (markers.length === 0) return;

  let theme: ChartTheme | null = null;
  for (const m of markers) {
    const ann = resolveMarkerAnnotation(m);
    if (!ann) continue;

    if (!theme) theme = chart.resolveTheme();
    const measured = labelEngine.measure(
      ann.text,
      {
        type: 'marker',
        fontSize: ann.fontSize ?? Math.max(10, theme.fontSize - 1),
        fontWeight: ann.fontWeight ?? 600,
        background: ann.background,
        padding: ann.labelPadding,
        icon: ann.icon
      },
      theme
    );

    if (ann.position === 'left') {
      margin.left = Math.max(
        margin.left,
        Math.ceil(measured.boxWidth + ann.padding + 14)
      );
    } else if (ann.position === 'right') {
      margin.right = Math.max(
        margin.right,
        Math.ceil(measured.boxWidth + ann.padding + 14)
      );
    } else if (ann.position === 'top') {
      margin.top = Math.max(
        margin.top,
        Math.ceil(measured.boxHeight + ann.padding + 14)
      );
    } else if (ann.position === 'bottom') {
      margin.bottom = Math.max(
        margin.bottom,
        Math.ceil(measured.boxHeight + ann.padding + 14)
      );
    }
  }
}

function expandMarginForHeatmapColorLegend(
  chart: LayoutChart,
  config: LayoutConfig,
  margin: ChartMargin,
  legend: ResolvedLegendConfig,
  layers: string[],
  width: number,
  height: number
): void {
  const { vertical, depth } = getHeatmapLegendMetrics(legend);
  const { padding, position } = legend;
  const axisClearance = layers.includes('axes')
    ? getHeatmapLegendAxisClearance(
        position,
        chart.resolveScaleConfig(),
        Boolean(config.xTitle || chart.getAttribute('x-title')),
        Boolean(config.yTitle || chart.getAttribute('y-title'))
      )
    : 0;
  const space = vertical ? width - margin.left - margin.right : height - margin.top - margin.bottom;
  const maxMargin = margin[position] + space - 40;
  const crossPadding = vertical ? padding.left + padding.right : padding.top + padding.bottom;
  let needed = axisClearance + depth + crossPadding;
  if (position === 'top' && chart.chartTitle) {
    // The title is centered in the top margin, with the legend below it.
    const titleHalfHeight = Math.ceil((chart.resolveTheme().fontSize + 3) * 0.65);
    needed = Math.max(needed, 2 * (axisClearance + depth + padding.bottom + titleHalfHeight + 4));
  }
  margin[position] = Math.max(margin[position], Math.min(Math.ceil(needed), maxMargin));
}

function expandMarginForLegend(
  chart: LayoutChart,
  config: LayoutConfig,
  margin: ChartMargin,
  width: number,
  height: number
): void {
  if (chart.chartType === 'heatmap') {
    const legend = chart.resolveLegendConfig();
    if (!legend.enabled) return;
    const layers = chart.getActiveLayers();
    if (!layers.includes('legends')) return;
    if (isHeatmapColorLegend(legend)) {
      expandMarginForHeatmapColorLegend(chart, config, margin, legend, layers, width, height);
      return;
    }
  }
  const hasCustomLegend =
    config.legend !== undefined ||
    chart.querySelector(':scope > mc-legend') !== null;
  const hasXTitle = Boolean(config.xTitle);
  const usesCategoricalLegend =
    chart.defaultLayers.includes('legends') && chart.chartType !== 'heatmap';

  if (!hasCustomLegend && !(hasXTitle && usesCategoricalLegend)) return;

  const legend = chart.resolveLegendConfig();
  if (!legend.enabled) return;

  const pad = legend.padding;
  const hasTitle = Boolean(chart.chartTitle);
  const baseRowH = Math.max(16, (legend.fontSize ?? 11) + 6);

  if (legend.position === 'top') {
    const needed = (hasTitle ? 34 : 8) + baseRowH + pad.top + pad.bottom;
    margin.top = Math.max(margin.top, Math.ceil(needed));
  } else if (legend.position === 'bottom') {
    const topClearance = hasXTitle ? 42 : 34;
    const needed = topClearance + baseRowH + pad.top + pad.bottom + 8;
    margin.bottom = Math.max(margin.bottom, Math.ceil(needed));
  } else if (legend.position === 'left') {
    const needed = 104 + pad.left + pad.right;
    margin.left = Math.max(margin.left, Math.ceil(needed));
  } else if (legend.position === 'right') {
    const needed = 104 + pad.left + pad.right;
    margin.right = Math.max(margin.right, Math.ceil(needed));
  }
}

export function resolveChartMargin(
  defaults: ChartMargin,
  margin: Partial<ChartMargin> | undefined,
  attr: string | null
): ChartMargin {
  const base = { ...defaults, ...margin };
  if (!attr) return base;
  try {
    if (attr.trim().startsWith('{')) {
      return { ...base, ...JSON.parse(attr) };
    }
    const parts = attr.split(/[\s,]+/).map(Number);
    if (parts.length === 1 && !Number.isNaN(parts[0])) {
      return {
        top: parts[0],
        right: parts[0],
        bottom: parts[0],
        left: parts[0]
      };
    }
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[2],
        left: parts[3]
      };
    }
  } catch {
    // use base
  }
  return base;
}
