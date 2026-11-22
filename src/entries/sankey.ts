import { MCSankeyChart } from '../charts/mc-sankey-chart';
import {
  MCSankeyLinkItem,
  MCSankeyNodeItem
} from '../presentation/items/sankey.item';
import {
  CORE_COMPONENT_REGISTRY,
  registerChartComponents
} from '../core/registry';

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
export function registerSankeyChart(): void {
  registerChartComponents({
    'mc-sankey-node-item': MCSankeyNodeItem,
    'mc-sankey-link-item': MCSankeyLinkItem,
    'mc-sankey-chart': MCSankeyChart
  });
}

registerSankeyChart();
