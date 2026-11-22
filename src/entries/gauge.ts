import { MCGaugeChart } from '../charts/mc-gauge-chart';
import { MCArcItem } from '../presentation/items/arc.item';
import {
  CORE_COMPONENT_REGISTRY,
  registerChartComponents
} from '../core/registry';

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
export function registerGaugeChart(): void {
  registerChartComponents({
    'mc-arc-item': MCArcItem,
    'mc-gauge-chart': MCGaugeChart
  });
}

registerGaugeChart();
