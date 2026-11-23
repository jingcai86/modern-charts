import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  HierarchyNode
} from '../core/types';
import {
  computeTreemapChartModel,
  type TreemapChartModel
} from '../models/treemap.model';
import {
  renderTreemapLabelsLayer,
  renderTreemapLegendsLayer,
  renderTreemapTilesLayer
} from '../presentation/layers/treemap.layers';

/**
 * `<mc-treemap-chart>` Orchestrator Web Component.
 * Wires the pure `computeTreemapChartModel` Model Layer with the dumb presentation layers.
 */
export class MCTreemapChart extends MCBaseChart<HierarchyNode> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'tile-padding',
    'border-radius',
    'enable-labels'
  ];

  get chartType(): string {
    return 'treemap';
  }

  get defaultLayers(): string[] {
    return ['tiles', 'labels', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 20, bottom: 58, left: 20 };
  }

  protected override hasPlottableData(data: HierarchyNode | null): boolean {
    if (!data || typeof data !== 'object') return false;
    const hasPositiveLeaf = (node: HierarchyNode): boolean => {
      if (Array.isArray(node.children) && node.children.length > 0) {
        return node.children.some((c) => c && hasPositiveLeaf(c));
      }
      return Number.isFinite(Number(node.value)) && Number(node.value) > 0;
    };
    return hasPositiveLeaf(data);
  }

  protected prepareContext(ctx: ChartRenderContext<HierarchyNode>): void {
    const model = computeTreemapChartModel(ctx, {
      tilePadding: this.getOption('tilePadding', 'tile-padding', 4) ?? 4,
      borderRadius: this.getOption('borderRadius', 'border-radius', 6) ?? 6,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false
    });
    ctx.state.model = model;
    ctx.state.leaves = model.leaves;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<HierarchyNode>) => void
  > {
    return {
      tiles: (ctx) =>
        renderTreemapTilesLayer(ctx.state.model as TreemapChartModel, ctx),
      labels: (ctx) =>
        renderTreemapLabelsLayer(ctx.state.model as TreemapChartModel, ctx),
      legends: (ctx) =>
        renderTreemapLegendsLayer(ctx.state.model as TreemapChartModel, ctx)
    };
  }
}
