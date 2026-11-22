import { MCLineChart } from '../charts/mc-line-chart';
import { MCLineItem, MCPointItem } from '../presentation/items/line.item';
import {
  CORE_COMPONENT_REGISTRY,
  registerChartComponents
} from '../core/registry';

export type * from '../core/types';
export * from '../models/line.model';
export * from '../presentation/items/line.item';
export * from '../presentation/layers/line.layers';
export * from '../charts/mc-line-chart';

export const LINE_COMPONENT_REGISTRY: Record<string, CustomElementConstructor> =
  {
    ...CORE_COMPONENT_REGISTRY,
    'mc-line-item': MCLineItem,
    'mc-point-item': MCPointItem,
    'mc-line-chart': MCLineChart
  };

/**
 * Registers `<mc-line-chart>`, `<mc-line-item>`, `<mc-point-item>`, and shared
 * core capability components idempotently.
 */
export function registerLineChart(): void {
  registerChartComponents({
    'mc-line-item': MCLineItem,
    'mc-point-item': MCPointItem,
    'mc-line-chart': MCLineChart
  });
}

registerLineChart();
