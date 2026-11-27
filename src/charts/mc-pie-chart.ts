import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  PieDatum,
  PieRoseType,
  SunburstSortOrder
} from '../core/types';
import { computePieChartModel, type PieChartModel } from '../models/pie.model';
import {
  renderPieArcLabelsLayer,
  renderPieArcLinkLabelsLayer,
  renderPieArcsLayer,
  renderPieCenterLayer,
  renderPieLegendsLayer
} from '../presentation/layers/pie.layers';

/**
 * `<mc-pie-chart>` Orchestrator Web Component.
 * Wires the pure `computePieChartModel` Model Layer with the dumb presentation layers.
 */
export class MCPieChart extends MCBaseChart<PieDatum[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'inner-radius',
    'pad-angle',
    'corner-radius',
    'start-angle',
    'end-angle',
    'sort',
    'rose-type',
    'active-outer-radius-offset',
    'min-angle',
    'enable-arc-labels',
    'enable-arc-link-labels',
    'arc-link-labels-skip-angle',
    'arc-link-labels-diagonal-length',
    'arc-link-labels-straight-length',
    'center-label'
  ];

  get chartType(): string {
    return 'pie';
  }

  get defaultLayers(): string[] {
    return ['arcs', 'arcLabels', 'arcLinkLabels', 'center', 'legends'];
  }

  protected override get retainedItemLayer(): string {
    return 'arcs';
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 80, bottom: 58, left: 80 };
  }

  get innerRadiusRatio(): number {
    const val = this.getOption('innerRadius', 'inner-radius', 0.52) ?? 0.52;
    return Math.min(0.9, Math.max(0, Number(val)));
  }
  set innerRadiusRatio(val: number) {
    this._config.innerRadius = val;
    this.setAttribute('inner-radius', String(val));
  }

  protected override hasPlottableData(data: PieDatum[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.some(
      (d) => d != null && Number.isFinite(Number(d.value)) && Number(d.value) > 0
    );
  }

  protected prepareContext(ctx: ChartRenderContext<PieDatum[]>): void {
    const model = computePieChartModel(ctx, {
      innerRadiusRatio: this.innerRadiusRatio,
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', 5) ?? 5,
      padAngleDeg: this.getOption('padAngle', 'pad-angle'),
      startAngle: this.getOption('startAngle', 'start-angle', 0) ?? 0,
      endAngle: this.getOption('endAngle', 'end-angle', 360) ?? 360,
      sort:
        (this.getOption('sort', 'sort', 'none') as SunburstSortOrder) ?? 'none',
      roseType:
        (this.getOption('roseType', 'rose-type', 'none') as PieRoseType) ??
        'none',
      activeOuterRadiusOffset:
        this.getOption(
          'activeOuterRadiusOffset',
          'active-outer-radius-offset',
          7
        ) ?? 7,
      minAngle: this.getOption('minAngle', 'min-angle', 0) ?? 0,
      arcLinkLabelsSkipAngle:
        this.getOption(
          'arcLinkLabelsSkipAngle',
          'arc-link-labels-skip-angle',
          8
        ) ?? 8,
      arcLinkLabelsDiagonalLength:
        this.getOption(
          'arcLinkLabelsDiagonalLength',
          'arc-link-labels-diagonal-length',
          14
        ) ?? 14,
      arcLinkLabelsStraightLength:
        this.getOption(
          'arcLinkLabelsStraightLength',
          'arc-link-labels-straight-length',
          16
        ) ?? 16,
      enableArcLabels:
        this.getOption('enableArcLabels', 'enable-arc-labels', true) !== false,
      enableArcLinkLabels:
        this.getOption(
          'enableArcLinkLabels',
          'enable-arc-link-labels',
          true
        ) !== false,
      centerLabel: this.getOption('centerLabel', 'center-label')
    });
    ctx.state.model = model;
    ctx.state.computedArcs = model.arcs;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<PieDatum[]>) => void
  > {
    return {
      arcs: (ctx) => renderPieArcsLayer(ctx.state.model as PieChartModel, ctx),
      arcLabels: (ctx) =>
        renderPieArcLabelsLayer(ctx.state.model as PieChartModel, ctx),
      arcLinkLabels: (ctx) =>
        renderPieArcLinkLabelsLayer(ctx.state.model as PieChartModel, ctx),
      center: (ctx) =>
        renderPieCenterLayer(ctx.state.model as PieChartModel, ctx),
      legends: (ctx) =>
        renderPieLegendsLayer(ctx.state.model as PieChartModel, ctx)
    };
  }
}
