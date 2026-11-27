import { MCBaseChart } from '../core/base-chart';
import {
  createDefaultScaleConfig,
  renderCartesianAxes,
  renderCartesianGrid
} from '../core/scale-manager';
import type {
  ChartRenderContext,
  ScaleConfig,
  ScatterSeries,
  ScatterSymbolType
} from '../core/types';
import {
  computeScatterChartModel,
  type ScatterChartModel
} from '../models/scatter.model';
import {
  renderScatterLabelsLayer,
  renderScatterLegendsLayer,
  renderScatterNodesLayer,
  renderScatterTrendlineLayer
} from '../presentation/layers/scatter.layers';

/**
 * `<mc-scatter-chart>` Orchestrator Web Component.
 * Wires the pure `computeScatterChartModel` Model Layer with the dumb presentation layers.
 */
export class MCScatterChart extends MCBaseChart<ScatterSeries[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'min-node-size',
    'max-node-size',
    'symbol',
    'symbol-rotate',
    'blend-mode',
    'use-mesh',
    'clip',
    'jitter',
    'enable-labels',
    'enable-trendline',
    'x-title',
    'y-title'
  ];

  get chartType(): string {
    return 'scatter';
  }

  get defaultLayers(): string[] {
    return [
      'grid',
      'markers',
      'axes',
      'trendline',
      'nodes',
      'labels',
      'legends'
    ];
  }

  protected override get retainedItemLayer(): string {
    return 'nodes';
  }

  protected getDefaultScaleConfig(): ScaleConfig {
    return createDefaultScaleConfig('linear', 'linear');
  }

  protected getDefaultTooltipPosition(): 'item' {
    return 'item';
  }

  protected override hasPlottableData(data: ScatterSeries[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.some(
      (s) =>
        Array.isArray(s?.data) &&
        s.data.some(
          (pt) =>
            pt != null &&
            pt.x !== null &&
            pt.x !== undefined &&
            pt.y !== null &&
            pt.y !== undefined &&
            (pt.x as unknown) !== '' &&
            (pt.y as unknown) !== '' &&
            Number.isFinite(Number(pt.x)) &&
            Number.isFinite(Number(pt.y))
        )
    );
  }

  protected prepareContext(ctx: ChartRenderContext<ScatterSeries[]>): void {
    const model = computeScatterChartModel(ctx, {
      minNodeSize: this.getOption('minNodeSize', 'min-node-size', 6) ?? 6,
      maxNodeSize: this.getOption('maxNodeSize', 'max-node-size', 18) ?? 18,
      symbol:
        (this.getOption('symbol', 'symbol', 'circle') as ScatterSymbolType) ||
        'circle',
      symbolRotate:
        this.getOption('symbolRotate', 'symbol-rotate', 0) ?? 0,
      blendMode: this.getOption('blendMode', 'blend-mode', 'normal') || 'normal',
      useMesh: Boolean(this.getOption('useMesh', 'use-mesh', false)),
      clip: Boolean(this.getOption('clip', 'clip', false)),
      jitter: this.getOption('jitter', 'jitter', 0) ?? 0,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false,
      enableTrendline: Boolean(
        this.getOption('enableTrendline', 'enable-trendline', false)
      ),
      xTitle: this.getOption('xTitle', 'x-title'),
      yTitle: this.getOption('yTitle', 'y-title'),
      setupThresholds: (c) => this.setupMarkersAndThresholds(c),
      recordThresholdItem: (item, evalRes) =>
        this._recordMatchedThresholdItem!(item, evalRes)
    });
    ctx.state.model = model;
    ctx.state.nodes = model.nodes;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<ScatterSeries[]>) => void
  > {
    return {
      grid: (ctx) => renderCartesianGrid(ctx),
      axes: (ctx) => {
        const model = ctx.state.model as ScatterChartModel;
        renderCartesianAxes(ctx, {
          xTitle: model.xTitle,
          yTitle: model.yTitle
        });
      },
      trendline: (ctx) =>
        renderScatterTrendlineLayer(ctx.state.model as ScatterChartModel, ctx),
      nodes: (ctx) =>
        renderScatterNodesLayer(ctx.state.model as ScatterChartModel, ctx),
      labels: (ctx) =>
        renderScatterLabelsLayer(ctx.state.model as ScatterChartModel, ctx),
      legends: (ctx) =>
        renderScatterLegendsLayer(ctx.state.model as ScatterChartModel, ctx)
    };
  }
}
