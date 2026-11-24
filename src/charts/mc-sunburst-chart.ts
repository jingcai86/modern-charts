import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  HierarchyNode,
  SunburstFocusMode,
  SunburstLabelOrientation,
  SunburstSortOrder
} from '../core/types';
import {
  computeSunburstChartModel,
  type SunburstChartModel
} from '../models/sunburst.model';
import {
  renderSunburstArcsLayer,
  renderSunburstCenterLayer,
  renderSunburstLabelsLayer,
  renderSunburstLegendsLayer
} from '../presentation/layers/sunburst.layers';

/**
 * `<mc-sunburst-chart>` Orchestrator Web Component.
 * Wires the pure `computeSunburstChartModel` Model Layer with the dumb presentation layers.
 */
export class MCSunburstChart extends MCBaseChart<HierarchyNode> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'corner-radius',
    'inner-radius',
    'pad-angle',
    'start-angle',
    'end-angle',
    'sort',
    'inherit-color-from-parent',
    'focus-mode',
    'label-orientation',
    'min-arc-angle-for-label',
    'enable-labels',
    'interactive-drilldown'
  ];

  #focusPath: string[] = [];

  get chartType(): string {
    return 'sunburst';
  }

  get defaultLayers(): string[] {
    return ['arcs', 'labels', 'center', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 32, bottom: 58, left: 32 };
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
    const model = computeSunburstChartModel(ctx, {
      focusPath: this.#focusPath,
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', 3) ?? 3,
      innerRadius:
        this.getOption('innerRadius', 'inner-radius', 0.22) ?? 0.22,
      padAngle: this.getOption('padAngle', 'pad-angle', 0.46) ?? 0.46,
      startAngle: this.getOption('startAngle', 'start-angle', 0) ?? 0,
      endAngle: this.getOption('endAngle', 'end-angle', 360) ?? 360,
      sort:
        (this.getOption('sort', 'sort', 'desc') as SunburstSortOrder) ?? 'desc',
      inheritColorFromParent:
        this.getOption(
          'inheritColorFromParent',
          'inherit-color-from-parent',
          true
        ) !== false,
      focusMode:
        (this.getOption(
          'focusMode',
          'focus-mode',
          'none'
        ) as SunburstFocusMode) ?? 'none',
      labelOrientation:
        (this.getOption(
          'labelOrientation',
          'label-orientation',
          'horizontal'
        ) as SunburstLabelOrientation) ?? 'horizontal',
      minArcAngleForLabel:
        this.getOption(
          'minArcAngleForLabel',
          'min-arc-angle-for-label',
          8
        ) ?? 8,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false,
      interactiveDrilldown:
        this.getOption(
          'interactiveDrilldown',
          'interactive-drilldown',
          true
        ) !== false
    });
    ctx.state.model = model;
    ctx.state.computedArcs = model.arcs;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<HierarchyNode>) => void
  > {
    return {
      arcs: (ctx) =>
        renderSunburstArcsLayer(
          ctx.state.model as SunburstChartModel,
          ctx,
          (nextPath) => {
            this.#focusPath = nextPath;
            this.render();
          }
        ),
      labels: (ctx) =>
        renderSunburstLabelsLayer(ctx.state.model as SunburstChartModel, ctx),
      center: (ctx) =>
        renderSunburstCenterLayer(
          ctx.state.model as SunburstChartModel,
          ctx,
          () => {
            this.#focusPath.pop();
            this.render();
          }
        ),
      legends: (ctx) =>
        renderSunburstLegendsLayer(ctx.state.model as SunburstChartModel, ctx)
    };
  }
}
