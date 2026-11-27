import { MCPieChart } from '../charts/mc-pie-chart';
import { MCArcItem } from '../presentation/items/arc.item';
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
export * from '../models/pie.model';
export { MCArcItem, renderPieArcItem } from '../presentation/items/arc.item';
export * from '../presentation/layers/pie.layers';
export * from '../charts/mc-pie-chart';

export const PIE_COMPONENT_REGISTRY: Record<string, CustomElementConstructor> =
  {
    ...CORE_COMPONENT_REGISTRY,
    'mc-arc-item': MCArcItem,
    'mc-pie-chart': MCPieChart
  };

/**
 * Registers `<mc-pie-chart>`, `<mc-arc-item>`, and shared core capability
 * components idempotently.
 */
export function registerPieChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-arc-item': MCArcItem,
      'mc-pie-chart': MCPieChart
    },
    options
  );
}

registerComponentDefinitions(PIE_COMPONENT_REGISTRY);
