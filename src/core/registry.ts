import { MCLabelElement } from '../components/mc-label';
import { MCTruncateElement } from '../components/mc-truncate';
import { MCTooltipElement } from '../components/mc-tooltip';
import { MCDefElement } from '../components/mc-def';
import { MCChartStateElement } from '../components/mc-chart-state';
import { MCLegendElement } from '../components/mc-legend';
import { MCAnimationLayer } from '../components/mc-animation';
import { MCAriaLayer } from '../components/mc-aria';
import { MCMarkerElement, MCMarkerLayer } from '../components/mc-marker';
import {
  MCChartLayer,
  MCCustomLayer,
  MCScaleLayer,
  MCThemeLayer,
  MCViewLayer
} from '../components/layers/mc-layers';
import { configureChartFeatures } from './features';
import type { ChartBootstrapOptions, ChartFeaturesConfig } from './types';

export {
  configureChartFeatures,
  getChartFeatures,
  isChartFeatureEnabled,
  subscribeChartFeatures
} from './features';

export class MCAnimationElement extends MCAnimationLayer {}
export class MCAriaElement extends MCAriaLayer {}

/**
 * Shared capability & layer custom elements required by every chart.
 */
export const CORE_COMPONENT_REGISTRY: Record<string, CustomElementConstructor> = {
  'mc-label': MCLabelElement,
  'mc-truncate': MCTruncateElement,
  'mc-tooltip': MCTooltipElement,
  'mc-def': MCDefElement,
  'mc-chart-state': MCChartStateElement,
  'mc-legend': MCLegendElement,
  'mc-theme-layer': MCThemeLayer,
  'mc-scale-layer': MCScaleLayer,
  'mc-view-layer': MCViewLayer,
  'mc-animation-layer': MCAnimationLayer,
  'mc-animation': MCAnimationElement,
  'mc-aria-layer': MCAriaLayer,
  'mc-aria': MCAriaElement,
  'mc-marker-layer': MCMarkerLayer,
  'mc-marker': MCMarkerElement,
  'mc-chart-layer': MCChartLayer,
  'mc-custom-layer': MCCustomLayer
};

/**
 * Registers a single custom element idempotently.
 */
export function defineCustomElement(
  tag: string,
  ctor: CustomElementConstructor
): void {
  if (
    typeof document === 'undefined' ||
    typeof HTMLElement === 'undefined' ||
    typeof customElements === 'undefined'
  ) return;
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

/**
 * Registers only the shared core capability/layer Web Components and optional features.
 * Optional features (`zoom`, `csvExport`) default to `false`.
 */
export function registerCoreComponents(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  for (const [tag, ctor] of Object.entries(CORE_COMPONENT_REGISTRY)) {
    defineCustomElement(tag, ctor);
  }
  return configureChartFeatures(options);
}

/**
 * Registers the shared core components plus a specific chart's custom elements
 * and optional features (`zoom`, `csvExport` — both default to `false`).
 */
export function registerChartComponents(
  chartComponents: Record<string, CustomElementConstructor>,
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  const ready = registerCoreComponents(options);
  for (const [tag, ctor] of Object.entries(chartComponents)) {
    defineCustomElement(tag, ctor);
  }
  return ready;
}
