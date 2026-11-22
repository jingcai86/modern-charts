import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  SankeyData
} from '../core/types';
import {
  computeSankeyChartModel,
  type SankeyChartModel
} from '../models/sankey.model';
import {
  renderSankeyLabelsLayer,
  renderSankeyLegendsLayer,
  renderSankeyLinksLayer,
  renderSankeyNodesLayer
} from '../presentation/layers/sankey.layers';

/**
 * `<mc-sankey-chart>` Orchestrator Web Component.
 * Wires the pure `computeSankeyChartModel` Model Layer with the dumb presentation layers.
 */
export class MCSankeyChart extends MCBaseChart<SankeyData> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'node-width',
    'node-padding',
    'link-opacity',
    'enable-labels'
  ];

  get chartType(): string {
    return 'sankey';
  }

  get defaultLayers(): string[] {
    return ['links', 'nodes', 'labels', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 36, bottom: 58, left: 36 };
  }

  protected prepareContext(ctx: ChartRenderContext<SankeyData>): void {
    const model = computeSankeyChartModel(ctx, {
      nodeWidth: this.getOption('nodeWidth', 'node-width', 18) ?? 18,
      nodePadding: this.getOption('nodePadding', 'node-padding', 16) ?? 16,
      linkOpacity: this.getOption('linkOpacity', 'link-opacity', 0.42) ?? 0.42,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false
    });
    ctx.state.model = model;
    ctx.state.nodes = model.nodes;
    ctx.state.links = model.links;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<SankeyData>) => void
  > {
    return {
      links: (ctx) =>
        renderSankeyLinksLayer(
          ctx.state.model as SankeyChartModel,
          ctx,
          this.shadowRoot?.querySelector('.mc-chart-defs')
        ),
      nodes: (ctx) =>
        renderSankeyNodesLayer(ctx.state.model as SankeyChartModel, ctx),
      labels: (ctx) =>
        renderSankeyLabelsLayer(ctx.state.model as SankeyChartModel, ctx),
      legends: (ctx) =>
        renderSankeyLegendsLayer(ctx.state.model as SankeyChartModel, ctx)
    };
  }
}
