import { MCBaseChart } from '../core/base-chart';
import {
  createDefaultScaleConfig,
  renderCartesianAxes
} from '../core/scale-manager';
import type {
  ChartMargin,
  ChartRenderContext,
  HeatmapRow,
  ScaleConfig
} from '../core/types';
import {
  computeHeatmapChartModel,
  type HeatmapChartModel
} from '../models/heatmap.model';
import {
  renderHeatmapCellLabelsLayer,
  renderHeatmapCellsLayer,
  renderHeatmapLegendLayer
} from '../presentation/layers/heatmap.layers';

/**
 * `<mc-heatmap-chart>` Orchestrator Web Component.
 * Wires the pure `computeHeatmapChartModel` Model Layer with the dumb presentation layers.
 */
export class MCHeatmapChart extends MCBaseChart<HeatmapRow[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'cell-shape',
    'color-scheme',
    'cell-padding',
    'x-inner-padding',
    'y-inner-padding',
    'size-variation',
    'empty-color',
    'force-square',
    'min',
    'max',
    'border-radius',
    'enable-labels'
  ];

  get chartType(): string {
    return 'heatmap';
  }

  get defaultLayers(): string[] {
    return ['axes', 'cells', 'labels', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 32, bottom: 52, left: 76 };
  }

  protected getDefaultScaleConfig(): ScaleConfig {
    return createDefaultScaleConfig('band', 'band');
  }

  protected override hasPlottableData(data: HeatmapRow[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.some(
      (r) =>
        Array.isArray(r?.data) &&
        r.data.some(
          (c) =>
            c != null &&
            c.y !== null &&
            c.y !== undefined &&
            (c.y as unknown) !== '' &&
            Number.isFinite(Number(c.y))
        )
    );
  }

  protected prepareContext(ctx: ChartRenderContext<HeatmapRow[]>): void {
    const model = computeHeatmapChartModel(ctx, {
      cellPadding: this.getOption('cellPadding', 'cell-padding', 0.1) ?? 0.1,
      xInnerPadding: this.getOption('xInnerPadding', 'x-inner-padding'),
      yInnerPadding: this.getOption('yInnerPadding', 'y-inner-padding'),
      sizeVariation:
        this.getOption('sizeVariation', 'size-variation', 0) ?? 0,
      emptyColor:
        this.getOption(
          'emptyColor',
          'empty-color',
          'rgba(148, 163, 184, 0.16)'
        ) ?? 'rgba(148, 163, 184, 0.16)',
      forceSquare: Boolean(
        this.getOption('forceSquare', 'force-square', false)
      ),
      min: this.getOption('min', 'min'),
      max: this.getOption('max', 'max'),
      colorScheme:
        this.getOption('colorScheme', 'color-scheme') ||
        ctx.scaleConfig.color?.scheme ||
        'viridis',
      cellShape:
        (this.getOption('cellShape', 'cell-shape', 'rect') as
          | 'rect'
          | 'circle') || 'rect',
      borderRadius: this.getOption('borderRadius', 'border-radius', 6) ?? 6,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false
    });
    ctx.state.model = model;
    ctx.state.cells = model.cells;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<HeatmapRow[]>) => void
  > {
    return {
      axes: (ctx) => renderCartesianAxes(ctx),
      cells: (ctx) =>
        renderHeatmapCellsLayer(ctx.state.model as HeatmapChartModel, ctx),
      labels: (ctx) =>
        renderHeatmapCellLabelsLayer(ctx.state.model as HeatmapChartModel, ctx),
      legends: (ctx) =>
        renderHeatmapLegendLayer(
          ctx.state.model as HeatmapChartModel,
          ctx,
          this.shadowRoot?.querySelector('.mc-chart-defs')
        )
    };
  }
}
