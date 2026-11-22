import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  HierarchyNode
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

  protected prepareContext(ctx: ChartRenderContext<HierarchyNode>): void {
    const model = computeSunburstChartModel(ctx, {
      focusPath: this.#focusPath,
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', 3) ?? 3,
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
