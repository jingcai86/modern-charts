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
    return items.some((item) => {
      const value: unknown = item?.value;
      return typeof item === 'object' && value != null && value !== '' && Number.isFinite(Number(value));
    });
  }

  protected prepareContext(ctx: ChartRenderContext<GaugeDataInput>): void {
    const model = computeGaugeChartModel(ctx, {
      min: this.getOption('min', 'min'),
      max: this.getOption('max', 'max'),
      unit: this.getOption('unit', 'unit'),
      centerLabel: this.getOption('centerLabel', 'center-label'),
      enableLabels: this.getOption('enableLabels', 'enable-labels', true),
      // Use the numeric attribute parser and let the model resolve defaults.
      startAngle: this.getOption('startAngle', 'start-angle', Number.NaN),
      endAngle: this.getOption('endAngle', 'end-angle', Number.NaN),
      innerRadius: this.getOption('innerRadius', 'inner-radius', Number.NaN),
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', Number.NaN),
      splitNumber: this.getOption('splitNumber', 'split-number', Number.NaN),
      minorSplitNumber: this.getOption('minorSplitNumber', 'minor-split-number', Number.NaN),
      pointerType: this.getOption('pointerType', 'pointer-type') as GaugePointerType | undefined,
      pointerLength: this.getOption('pointerLength', 'pointer-length', Number.NaN),
      pointerWidth: this.getOption('pointerWidth', 'pointer-width', Number.NaN)
    });
    ctx.state.model = model;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<GaugeDataInput>) => void
  > {
    const bindModel = (render: typeof renderGaugeTrackLayer) => (ctx: ChartRenderContext<GaugeDataInput>) =>
      render(ctx.state.model as GaugeChartModel, ctx);
    return {
      track: bindModel(renderGaugeTrackLayer),
      bands: bindModel(renderGaugeBandsLayer),
      valueArc: bindModel(renderGaugeValueArcLayer),
      ticks: bindModel(renderGaugeTicksLayer),
      needle: bindModel(renderGaugeNeedleLayer),
      center: bindModel(renderGaugeCenterLayer),
      legends: bindModel(renderGaugeLegendsLayer)
    };
  }
}
