import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  SankeyAlign,
  SankeyData,
  SankeyFocusMode
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
    'layout',
    'align',
    'node-width',
    'node-padding',
    'border-radius',
    'curveness',
    'focus-mode',
    'link-opacity',
    'enable-labels'
  ];

  get chartType(): string {
    return 'sankey';
  }

  get defaultLayers(): string[] {
    return ['links', 'nodes', 'labels', 'legends'];
  }

  protected override get retainedItemLayers(): readonly string[] {
    return ['links', 'nodes'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 36, bottom: 58, left: 36 };
  }

  get layout(): 'horizontal' | 'vertical' {
    const val = this.getOption('layout', 'layout', 'horizontal');
    return val === 'vertical' ? 'vertical' : 'horizontal';
  }
  set layout(val: 'horizontal' | 'vertical') {
    this._config.layout = val;
    this.setAttribute('layout', val);
  }

  get align(): SankeyAlign {
    return (
      (this.getOption('align', 'align', 'justify') as SankeyAlign) || 'justify'
    );
  }
  set align(val: SankeyAlign) {
    this._config.align = val;
    this.setAttribute('align', val);
  }

  protected override hasPlottableData(data: SankeyData | null): boolean {
    if (!data || typeof data !== 'object') return false;
    const hasNodes = Array.isArray(data.nodes) && data.nodes.length > 0;
    const hasLinks = Array.isArray(data.links) && data.links.length > 0;
    return hasNodes || hasLinks;
  }

  protected prepareContext(ctx: ChartRenderContext<SankeyData>): void {
    const model = computeSankeyChartModel(ctx, {
      layout: this.layout,
      align: this.align,
      nodeWidth: this.getOption('nodeWidth', 'node-width', 18) ?? 18,
      nodePadding: this.getOption('nodePadding', 'node-padding', 16) ?? 16,
      borderRadius: this.getOption('borderRadius', 'border-radius', 4) ?? 4,
      curveness: this.getOption('curveness', 'curveness', 0.5) ?? 0.5,
      focusMode:
        (this.getOption(
          'focusMode',
          'focus-mode',
          'adjacency'
        ) as SankeyFocusMode) ?? 'adjacency',
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
