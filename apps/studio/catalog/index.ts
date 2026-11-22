import type { ChartAttributeSpec, ChartCatalogEntry } from './types';
import {
  COMMON_ATTRIBUTES,
  LEGEND_ATTRIBUTES,
  MARKER_THRESHOLD_ATTRIBUTES,
  VIEW_ZOOM_ATTRIBUTES
} from './shared-attributes';
import { LINE_CHART_ENTRY } from './charts/line';
import { BAR_CHART_ENTRY } from './charts/bar';
import { PIE_CHART_ENTRY } from './charts/pie';
import { HEATMAP_CHART_ENTRY } from './charts/heatmap';
import { RADAR_CHART_ENTRY } from './charts/radar';
import { SUNBURST_CHART_ENTRY } from './charts/sunburst';
import { SANKEY_CHART_ENTRY } from './charts/sankey';
import { SCATTER_CHART_ENTRY } from './charts/scatter';
import { TREEMAP_CHART_ENTRY } from './charts/treemap';
import { GAUGE_CHART_ENTRY } from './charts/gauge';

export * from './types';
export * from './shared-attributes';

export const CHART_CATALOG: ChartCatalogEntry[] = [
  LINE_CHART_ENTRY,
  BAR_CHART_ENTRY,
  PIE_CHART_ENTRY,
  HEATMAP_CHART_ENTRY,
  RADAR_CHART_ENTRY,
  SUNBURST_CHART_ENTRY,
  SANKEY_CHART_ENTRY,
  SCATTER_CHART_ENTRY,
  TREEMAP_CHART_ENTRY,
  GAUGE_CHART_ENTRY
];

export function getAllAttributesForChart(
  entry: ChartCatalogEntry
): ChartAttributeSpec[] {
  const list: ChartAttributeSpec[] = [...entry.specificAttributes];
  if (entry.defaultLayers.includes('legends') && entry.id !== 'heatmap') {
    list.push(...LEGEND_ATTRIBUTES);
  }
  if (entry.supportsMarkers) {
    list.push(...MARKER_THRESHOLD_ATTRIBUTES);
  }
  if (entry.supportsViewZoom) {
    list.push(...VIEW_ZOOM_ATTRIBUTES);
  }
  list.push(...COMMON_ATTRIBUTES);
  return list;
}
