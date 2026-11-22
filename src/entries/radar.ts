import { MCRadarChart } from '../charts/mc-radar-chart';
import { MCRadarItem } from '../presentation/items/radar.item';
import {
  CORE_COMPONENT_REGISTRY,
  registerChartComponents
} from '../core/registry';

export type * from '../core/types';
export * from '../models/radar.model';
export * from '../presentation/items/radar.item';
export * from '../presentation/layers/radar.layers';
export * from '../charts/mc-radar-chart';

export const RADAR_COMPONENT_REGISTRY: Record<
  string,
  CustomElementConstructor
> = {
  ...CORE_COMPONENT_REGISTRY,
  'mc-radar-item': MCRadarItem,
  'mc-radar-chart': MCRadarChart
};

/**
 * Registers `<mc-radar-chart>`, `<mc-radar-item>`, and shared core capability
 * components idempotently.
 */
export function registerRadarChart(): void {
  registerChartComponents({
    'mc-radar-item': MCRadarItem,
    'mc-radar-chart': MCRadarChart
  });
}

registerRadarChart();
