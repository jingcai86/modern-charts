import { MCScatterChart } from '../charts/mc-scatter-chart';
import { MCScatterItem } from '../presentation/items/scatter.item';
import {
  CORE_COMPONENT_REGISTRY,
  registerChartComponents
} from '../core/registry';

export type * from '../core/types';
export * from '../models/scatter.model';
export * from '../presentation/items/scatter.item';
export * from '../presentation/layers/scatter.layers';
export * from '../charts/mc-scatter-chart';

export const SCATTER_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-scatter-item': MCScatterItem,
  'mc-scatter-chart': MCScatterChart
};

/**
 * Registers `<mc-scatter-chart>`, `<mc-scatter-item>`, and shared core
 * capability components idempotently.
 */
export function registerScatterChart(): void {
  registerChartComponents({
    'mc-scatter-item': MCScatterItem,
    'mc-scatter-chart': MCScatterChart
  });
}

registerScatterChart();
