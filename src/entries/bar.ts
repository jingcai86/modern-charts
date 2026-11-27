import { MCBarChart } from '../charts/mc-bar-chart';
import { MCBarItem } from '../presentation/items/bar.item';
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
export * from '../models/bar.model';
export * from '../presentation/items/bar.item';
export * from '../presentation/layers/bar.layers';
export * from '../charts/mc-bar-chart';

export const BAR_COMPONENT_REGISTRY: Record<string, CustomElementConstructor> =
  {
    ...CORE_COMPONENT_REGISTRY,
    'mc-bar-item': MCBarItem,
    'mc-bar-chart': MCBarChart
  };

/**
 * Registers `<mc-bar-chart>`, `<mc-bar-item>`, and shared core capability
 * components idempotently.
 */
export function registerBarChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-bar-item': MCBarItem,
      'mc-bar-chart': MCBarChart
    },
    options
  );
}

registerComponentDefinitions(BAR_COMPONENT_REGISTRY);
