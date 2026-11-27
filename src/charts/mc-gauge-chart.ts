import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  GaugeDataInput,
  GaugePointerType
} from '../core/types';
import {
  computeGaugeChartModel,
  type GaugeChartModel
} from '../models/gauge.model';
import {
  renderGaugeBandsLayer,
  renderGaugeCenterLayer,
  renderGaugeLegendsLayer,
  renderGaugeNeedleLayer,
  renderGaugeTicksLayer,
  renderGaugeTrackLayer,
  renderGaugeValueArcLayer
} from '../presentation/layers/gauge.layers';

/**
 * `<mc-gauge-chart>` Orchestrator Web Component.
 * Wires the pure `computeGaugeChartModel` Model Layer with the dumb presentation layers.
 */
export class MCGaugeChart extends MCBaseChart<GaugeDataInput> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'min',
    'max',
    'unit',
    'center-label',
    'enable-labels',
    'start-angle',
    'end-angle',
    'inner-radius',
    'corner-radius',
    'split-number',
    'minor-split-number',
    'pointer-type',
    'pointer-length',
    'pointer-width'
  ];

  get chartType(): string {
    return 'gauge';
  }

  get defaultLayers(): string[] {
    return ['track', 'bands', 'valueArc', 'ticks', 'needle', 'center', 'legends'];
  }

  protected override get retainedItemLayers(): readonly string[] {
    return ['valueArc', 'needle'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 32, right: 32, bottom: 32, left: 32 };
  }

  protected getDefaultTooltipPosition(): 'item' {
    return 'item';
  }

  protected override hasPlottableData(data: GaugeDataInput | null): boolean {
    if (!data) return false;
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return false;
    return items.some((d) => {
      if (!d || typeof d !== 'object') return false;
      const v = d.value;
      return (
        v !== null &&
        v !== undefined &&
        (v as unknown) !== '' &&
        Number.isFinite(Number(v))
      );
    });
  }

  protected prepareContext(ctx: ChartRenderContext<GaugeDataInput>): void {
    const model = computeGaugeChartModel(ctx, {
      min: this.getOption('min', 'min'),
      max: this.getOption('max', 'max'),
      unit: this.getOption('unit', 'unit'),
      centerLabel: this.getOption('centerLabel', 'center-label'),
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false,
      startAngle: this.getOption('startAngle', 'start-angle', -135) ?? -135,
      endAngle: this.getOption('endAngle', 'end-angle', 135) ?? 135,
      innerRadius: this.getOption('innerRadius', 'inner-radius', 0.76) ?? 0.76,
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', 8) ?? 8,
      splitNumber: this.getOption('splitNumber', 'split-number', 5) ?? 5,
      minorSplitNumber:
        this.getOption('minorSplitNumber', 'minor-split-number', 4) ?? 4,
      pointerType:
        (this.getOption(
          'pointerType',
          'pointer-type',
          'needle'
        ) as GaugePointerType) ?? 'needle',
      pointerLength:
        this.getOption('pointerLength', 'pointer-length', 0.88) ?? 0.88,
      pointerWidth:
        this.getOption('pointerWidth', 'pointer-width', 2.5) ?? 2.5
    });
    ctx.state.model = model;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<GaugeDataInput>) => void
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
        renderGaugeCenterLayer(ctx.state.model as GaugeChartModel, ctx),
      legends: (ctx) =>
        renderGaugeLegendsLayer(ctx.state.model as GaugeChartModel, ctx)
    };
  }
}
