import { MCLabelElement } from './components/mc-label';
import { MCAnimationLayer } from './components/mc-animation';
import { MCAriaLayer } from './components/mc-aria';
import { MCMarkerElement, MCMarkerLayer } from './components/mc-marker';
import {
  MCChartLayer,
  MCCustomLayer,
  MCScaleLayer,
  MCThemeLayer,
  MCViewLayer
} from './components/layers/mc-layers';
import { MCBarItem } from './presentation/items/bar.item';
import { MCLineItem, MCPointItem } from './presentation/items/line.item';
import { MCArcItem } from './presentation/items/arc.item';
import { MCCellItem } from './presentation/items/cell.item';
import { MCRadarItem } from './presentation/items/radar.item';
import {
  MCSankeyLinkItem,
  MCSankeyNodeItem
} from './presentation/items/sankey.item';
import { MCScatterItem } from './presentation/items/scatter.item';
import { MCLineChart } from './charts/mc-line-chart';
import { MCBarChart } from './charts/mc-bar-chart';
import { MCPieChart } from './charts/mc-pie-chart';
import { MCHeatmapChart } from './charts/mc-heatmap-chart';
import { MCRadarChart } from './charts/mc-radar-chart';
import { MCSunburstChart } from './charts/mc-sunburst-chart';
import { MCSankeyChart } from './charts/mc-sankey-chart';
import { MCScatterChart } from './charts/mc-scatter-chart';
import { MCTreemapChart } from './charts/mc-treemap-chart';
import { MCGaugeChart } from './charts/mc-gauge-chart';

// Core Engine
export * from './core/types';
export * from './core/theme';
export * from './core/label-engine';
export * from './core/animation-engine';
export * from './core/aria-engine';
export * from './core/marker-engine';
export * from './core/scale-manager';
export * from './core/base-chart';

// Model Layer (Pure Data, Scale & Geometry Computation)
export * from './models/bar.model';
export * from './models/line.model';
export * from './models/pie.model';
export * from './models/heatmap.model';
export * from './models/radar.model';
export * from './models/sunburst.model';
export * from './models/sankey.model';
export * from './models/scatter.model';
export * from './models/treemap.model';
export * from './models/gauge.model';

// Presentation Layer — Dumb Item Components & Renderers
export * from './presentation/items/bar.item';
export * from './presentation/items/line.item';
export * from './presentation/items/arc.item';
export * from './presentation/items/cell.item';
export * from './presentation/items/radar.item';
export * from './presentation/items/sankey.item';
export * from './presentation/items/scatter.item';

// Presentation Layer — Dumb Layer Renderers
export * from './presentation/layers/bar.layers';
export * from './presentation/layers/line.layers';
export * from './presentation/layers/pie.layers';
export * from './presentation/layers/heatmap.layers';
export * from './presentation/layers/radar.layers';
export * from './presentation/layers/sunburst.layers';
export * from './presentation/layers/sankey.layers';
export * from './presentation/layers/scatter.layers';
export * from './presentation/layers/treemap.layers';
export * from './presentation/layers/gauge.layers';

// Capability Layer Web Components
export * from './components/mc-label';
export * from './components/mc-animation';
export * from './components/mc-aria';
export * from './components/mc-marker';
export * from './components/layers/mc-layers';

// Chart Orchestrator Web Components
export * from './charts/mc-line-chart';
export * from './charts/mc-bar-chart';
export * from './charts/mc-pie-chart';
export * from './charts/mc-heatmap-chart';
export * from './charts/mc-radar-chart';
export * from './charts/mc-sunburst-chart';
export * from './charts/mc-sankey-chart';
export * from './charts/mc-scatter-chart';
export * from './charts/mc-treemap-chart';
export * from './charts/mc-gauge-chart';

export class MCAnimationElement extends MCAnimationLayer {}
export class MCAriaElement extends MCAriaLayer {}

export const COMPONENT_REGISTRY: Record<string, CustomElementConstructor> = {
  // Capability & Layer Components
  'mc-label': MCLabelElement,
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
  'mc-custom-layer': MCCustomLayer,

  // Dumb Presentation Item Components
  'mc-bar-item': MCBarItem,
  'mc-line-item': MCLineItem,
  'mc-point-item': MCPointItem,
  'mc-arc-item': MCArcItem,
  'mc-cell-item': MCCellItem,
  'mc-radar-item': MCRadarItem,
  'mc-sankey-node-item': MCSankeyNodeItem,
  'mc-sankey-link-item': MCSankeyLinkItem,
  'mc-scatter-item': MCScatterItem,

  // Chart Orchestrator Components
  'mc-line-chart': MCLineChart,
  'mc-bar-chart': MCBarChart,
  'mc-pie-chart': MCPieChart,
  'mc-heatmap-chart': MCHeatmapChart,
  'mc-radar-chart': MCRadarChart,
  'mc-sunburst-chart': MCSunburstChart,
  'mc-sankey-chart': MCSankeyChart,
  'mc-scatter-chart': MCScatterChart,
  'mc-treemap-chart': MCTreemapChart,
  'mc-gauge-chart': MCGaugeChart
};

/**
 * Registers all `modern-charts` custom elements idempotently.
 */
export function registerModernCharts(): void {
  if (typeof customElements === 'undefined') return;
  for (const [tag, ctor] of Object.entries(COMPONENT_REGISTRY)) {
    if (!customElements.get(tag)) {
      customElements.define(tag, ctor);
    }
  }
}

registerModernCharts();
