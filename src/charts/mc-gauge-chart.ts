import { MCBaseChart } from '../core/base-chart';
import type { ChartMargin, ChartRenderContext, GaugeDatum } from '../core/types';
import {
  computeGaugeChartModel,
  type GaugeChartModel
} from '../models/gauge.model';
import {
  renderGaugeBandsLayer,
  renderGaugeCenterLayer,
  renderGaugeNeedleLayer,
  renderGaugeTicksLayer,
  renderGaugeTrackLayer,
  renderGaugeValueArcLayer
} from '../presentation/layers/gauge.layers';

/**
 * `<mc-gauge-chart>` Orchestrator Web Component.
 * Wires the pure `computeGaugeChartModel` Model Layer with the dumb presentation layers.
 */
export class MCGaugeChart extends MCBaseChart<GaugeDatum> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'min',
    'max',
    'unit'
  ];

  get chartType(): string {
    return 'gauge';
  }

  get defaultLayers(): string[] {
    return ['track', 'bands', 'valueArc', 'ticks', 'needle', 'center'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 32, right: 32, bottom: 32, left: 32 };
  }

  protected getDefaultTooltipPosition(): 'item' {
    return 'item';
  }

  protected override hasPlottableData(data: GaugeDatum | null): boolean {
    if (!data || typeof data !== 'object') return false;
    const v = data.value;
    return (
      v !== null &&
      v !== undefined &&
      (v as unknown) !== '' &&
      Number.isFinite(Number(v))
    );
  }

  protected prepareContext(ctx: ChartRenderContext<GaugeDatum>): void {
    const model = computeGaugeChartModel(ctx, {
      min: this.getOption('min', 'min'),
      max: this.getOption('max', 'max'),
      unit: this.getOption('unit', 'unit')
    });
    ctx.state.model = model;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<GaugeDatum>) => void
  > {
    return {
      track: (ctx) =>
        renderGaugeTrackLayer(ctx.state.model as GaugeChartModel, ctx),
      bands: (ctx) =>
        renderGaugeBandsLayer(ctx.state.model as GaugeChartModel, ctx),
      valueArc: (ctx) =>
        renderGaugeValueArcLayer(ctx.state.model as GaugeChartModel, ctx),
      ticks: (ctx) =>
        renderGaugeTicksLayer(ctx.state.model as GaugeChartModel, ctx),
      needle: (ctx) =>
        renderGaugeNeedleLayer(ctx.state.model as GaugeChartModel, ctx),
      center: (ctx) =>
        renderGaugeCenterLayer(ctx.state.model as GaugeChartModel, ctx)
    };
  }
}
