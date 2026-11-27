import { MCGaugeChart } from '../charts/mc-gauge-chart';
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
export * from '../models/gauge.model';
export {
  MCArcItem,
  renderGaugeNeedleItem,
  renderGaugeValueArcItem
} from '../presentation/items/arc.item';
export * from '../presentation/layers/gauge.layers';
export * from '../charts/mc-gauge-chart';

export const GAUGE_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-arc-item': MCArcItem,
  'mc-gauge-chart': MCGaugeChart
};

/**
 * Registers `<mc-gauge-chart>`, `<mc-arc-item>`, and shared core capability
 * components idempotently.
 */
export function registerGaugeChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-arc-item': MCArcItem,
      'mc-gauge-chart': MCGaugeChart
    },
    options
  );
}

void registerGaugeChart();
