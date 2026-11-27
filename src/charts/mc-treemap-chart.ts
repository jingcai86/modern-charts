import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  HierarchyNode,
  TreemapColorBy,
  TreemapTileMethod
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
    'tile',
    'tile-padding',
    'border-radius',
    'leaves-only',
    'parent-label-height',
    'orient-label',
    'color-by',
    'node-opacity',
    'interactive-drilldown',
    'enable-labels'
  ];

  #focusPath: string[] = [];

  get chartType(): string {
    return 'treemap';
  }

  get defaultLayers(): string[] {
    return ['tiles', 'labels', 'legends'];
  }

  protected override get retainedItemLayer(): string {
    return 'tiles';
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 20, bottom: 58, left: 20 };
  }

  public resetDrilldown(): void {
    this.#focusPath = [];
    this.render();
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
      focusPath: this.#focusPath,
      tile:
        (this.getOption('tile', 'tile', 'squarify') as TreemapTileMethod) ??
        'squarify',
      tilePadding: this.getOption('tilePadding', 'tile-padding', 4) ?? 4,
      borderRadius: this.getOption('borderRadius', 'border-radius', 6) ?? 6,
      leavesOnly: Boolean(this.getOption('leavesOnly', 'leaves-only', false)),
      parentLabelHeight:
        this.getOption('parentLabelHeight', 'parent-label-height', 22) ?? 22,
      orientLabel:
        this.getOption('orientLabel', 'orient-label', true) !== false,
      colorBy:
        (this.getOption('colorBy', 'color-by', 'parent') as TreemapColorBy) ??
        'parent',
      nodeOpacity: this.getOption('nodeOpacity', 'node-opacity', 1) ?? 1,
      interactiveDrilldown:
        this.getOption(
          'interactiveDrilldown',
          'interactive-drilldown',
          true
        ) !== false,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false
    });
    this.#focusPath = model.focusPath;
    ctx.state.model = model;
    ctx.state.leaves = model.leaves;
    ctx.state.parents = model.parents;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<HierarchyNode>) => void
  > {
    return {
      tiles: (ctx) =>
        renderTreemapTilesLayer(
          ctx.state.model as TreemapChartModel,
          ctx,
          (nextPath) => {
            this.#focusPath = nextPath;
            this.render();
          },
          () => {
            this.#focusPath.pop();
            this.render();
          }
        ),
      labels: (ctx) =>
        renderTreemapLabelsLayer(ctx.state.model as TreemapChartModel, ctx),
      legends: (ctx) =>
        renderTreemapLegendsLayer(ctx.state.model as TreemapChartModel, ctx)
    };
  }
}
