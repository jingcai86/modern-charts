import { MCSunburstChart } from '../charts/mc-sunburst-chart';
import { MCArcItem } from '../presentation/items/arc.item';
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
export * from '../models/sunburst.model';
export {
  MCArcItem,
  renderSunburstArcItem
} from '../presentation/items/arc.item';
export * from '../presentation/layers/sunburst.layers';
export * from '../charts/mc-sunburst-chart';

export const SUNBURST_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-arc-item': MCArcItem,
  'mc-sunburst-chart': MCSunburstChart
};

/**
 * Registers `<mc-sunburst-chart>`, `<mc-arc-item>`, and shared core capability
 * components idempotently.
 */
export function registerSunburstChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-arc-item': MCArcItem,
      'mc-sunburst-chart': MCSunburstChart
    },
    options
  );
}

void registerSunburstChart();
