import { MCSankeyChart } from '../charts/mc-sankey-chart';
import {
  MCSankeyLinkItem,
  MCSankeyNodeItem
} from '../presentation/items/sankey.item';
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
export * from '../models/sankey.model';
export * from '../presentation/items/sankey.item';
export * from '../presentation/layers/sankey.layers';
export * from '../charts/mc-sankey-chart';

export const SANKEY_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-sankey-node-item': MCSankeyNodeItem,
  'mc-sankey-link-item': MCSankeyLinkItem,
  'mc-sankey-chart': MCSankeyChart
};

/**
 * Registers `<mc-sankey-chart>`, `<mc-sankey-node-item>`, `<mc-sankey-link-item>`,
 * and shared core capability components idempotently.
 */
export function registerSankeyChart(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  return registerChartComponents(
    {
      'mc-sankey-node-item': MCSankeyNodeItem,
      'mc-sankey-link-item': MCSankeyLinkItem,
      'mc-sankey-chart': MCSankeyChart
    },
    options
  );
}

registerComponentDefinitions(SANKEY_COMPONENT_REGISTRY);
