import { MCBaseChart } from '../core/base-chart';
import type { ChartMargin, ChartRenderContext, PieDatum } from '../core/types';
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
    'enable-arc-labels',
    'enable-arc-link-labels',
    'center-label'
  ];

  get chartType(): string {
    return 'pie';
  }

  get defaultLayers(): string[] {
    return ['arcs', 'arcLabels', 'arcLinkLabels', 'center', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 36, right: 80, bottom: 44, left: 80 };
  }

  get innerRadiusRatio(): number {
    const val = this.getOption('innerRadius', 'inner-radius', 0.52) ?? 0.52;
    return Math.min(0.9, Math.max(0, Number(val)));
  }
  set innerRadiusRatio(val: number) {
    this._config.innerRadius = val;
    this.setAttribute('inner-radius', String(val));
  }

  protected prepareContext(ctx: ChartRenderContext<PieDatum[]>): void {
    const model = computePieChartModel(ctx, {
      innerRadiusRatio: this.innerRadiusRatio,
      cornerRadius: this.getOption('cornerRadius', 'corner-radius', 5) ?? 5,
      padAngleDeg: this.getOption('padAngle', 'pad-angle'),
      enableArcLabels: this.getAttribute('enable-arc-labels') !== 'false',
      enableArcLinkLabels:
        this.getAttribute('enable-arc-link-labels') !== 'false',
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
