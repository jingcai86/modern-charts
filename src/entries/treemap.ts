import { MCTreemapChart } from '../charts/mc-treemap-chart';
import { MCCellItem } from '../presentation/items/cell.item';
import {
  CORE_COMPONENT_REGISTRY,
  configureChartFeatures,
  getChartFeatures,
  isChartFeatureEnabled,
  registerChartComponents
} from '../core/registry';
import { registerComponentDefinitions } from '../core/dom';
import type { ChartBootstrapOptions, ChartFeaturesConfig } from '../core/types';

export { configureChartFeatures, getChartFeatures, isChartFeatureEnabled };
export type * from '../core/types';
export * from '../models/treemap.model';
export {
  MCCellItem,
  renderTreemapTileItem
} from '../presentation/items/cell.item';
export * from '../presentation/layers/treemap.layers';
export * from '../charts/mc-treemap-chart';

export const TREEMAP_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-cell-item': MCCellItem,
  'mc-treemap-chart': MCTreemapChart
};

/**
 * Registers `<mc-treemap-chart>`, `<mc-cell-item>`, and shared core capability
 * components idempotently.
 */
export function registerTreemapChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-cell-item': MCCellItem,
      'mc-treemap-chart': MCTreemapChart
    },
    options
  );
}

registerComponentDefinitions(TREEMAP_COMPONENT_REGISTRY);
