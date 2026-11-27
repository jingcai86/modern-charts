import { MCHeatmapChart } from '../charts/mc-heatmap-chart';
import { MCCellItem } from '../presentation/items/cell.item';
import {
  CORE_COMPONENT_REGISTRY,
  configureChartFeatures,
  getChartFeatures,
  isChartFeatureEnabled,
  registerChartComponents
} from '../core/registry';
import type { ChartBootstrapOptions, ChartFeaturesConfig } from '../core/types';

export { configureChartFeatures, getChartFeatures, isChartFeatureEnabled };
export type * from '../core/types';
export * from '../models/heatmap.model';
export {
  MCCellItem,
  renderHeatmapCellItem
} from '../presentation/items/cell.item';
export * from '../presentation/layers/heatmap.layers';
export * from '../charts/mc-heatmap-chart';

export const HEATMAP_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-cell-item': MCCellItem,
  'mc-heatmap-chart': MCHeatmapChart
};

/**
 * Registers `<mc-heatmap-chart>`, `<mc-cell-item>`, and shared core capability
 * components idempotently.
 */
export function registerHeatmapChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-cell-item': MCCellItem,
      'mc-heatmap-chart': MCHeatmapChart
    },
    options
  );
}

void registerHeatmapChart();
