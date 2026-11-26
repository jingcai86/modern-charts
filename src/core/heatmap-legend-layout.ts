import type { LegendPosition, ResolvedLegendConfig, ScaleConfig } from './types';

export const COLOR_LEGEND_LABEL_GAP = 6;
export const COLOR_LEGEND_TICK_LENGTH = 4;
export const COLOR_LEGEND_TICK_OFFSET = COLOR_LEGEND_TICK_LENGTH + 3;

export function isHeatmapColorLegend(legend: ResolvedLegendConfig): boolean {
  return legend.enabled && legend.type !== 'piecewise' && legend.type !== 'categorical';
}

export function getHeatmapLegendMetrics(legend: ResolvedLegendConfig) {
  const vertical = legend.position === 'left' || legend.position === 'right';
  const labelPlacement = legend.labelPlacement ?? 'ends';
  const fontSize = legend.fontSize ?? 10;
  const labelHeight = Math.ceil(fontSize * 1.3);
  const labelWidth = fontSize * 6;
  const thickness = (vertical ? legend.width : legend.height) ?? 10;
  const tickDepth = labelPlacement === 'ticks'
    ? COLOR_LEGEND_TICK_OFFSET + (vertical ? labelWidth : labelHeight)
    : 0;
  const endDepth = labelPlacement === 'ends' ? (vertical ? labelWidth : labelHeight) : 0;
  const depth = Math.max(thickness + tickDepth, endDepth);
  return { vertical, labelPlacement, fontSize, labelHeight, labelWidth, thickness, depth };
}

/** Room needed by the axis sharing a plot edge with the color legend. */
export function getHeatmapLegendAxisClearance(
  position: LegendPosition,
  scales: ScaleConfig,
  hasXTitle: boolean,
  hasYTitle: boolean
): number {
  const xPosition = scales.x.position ?? 'bottom';
  const yPosition = scales.y.position ?? 'left';
  if (position === 'top' || position === 'bottom') {
    return xPosition === position || xPosition === 'both'
      ? (hasXTitle || scales.x.title ? 44 : 26)
      : 0;
  }
  return yPosition === position || yPosition === 'both'
    ? (hasYTitle || scales.y.title ? 68 : 52)
    : 0;
}
