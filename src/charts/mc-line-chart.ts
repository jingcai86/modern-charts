import { MCBaseChart } from '../core/base-chart';
import {
  renderCartesianAxes,
  renderCartesianGrid
} from '../core/scale-manager';
import type { ChartRenderContext, LineSeries } from '../core/types';
import {
  computeLineChartModel,
  type LineChartModel
} from '../models/line.model';
import {
  renderLineAreasLayer,
  renderLineLegendsLayer,
  renderLinePointLabelsLayer,
  renderLinePointsLayer,
  renderLinesLayer,
  renderLineSlicesLayer
} from '../presentation/layers/line.layers';

/**
 * `<mc-line-chart>` Orchestrator Web Component.
 * Wires the pure `computeLineChartModel` Model Layer with the dumb presentation layers
 * (`renderLineAreasLayer`, `renderLinesLayer`, `renderLinePointsLayer`, `renderLinePointLabelsLayer`, `renderLineSlicesLayer`, `renderLineLegendsLayer`).
 */
export class MCLineChart extends MCBaseChart<LineSeries[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'curve',
    'enable-area',
    'area-opacity',
    'line-width',
    'point-size',
    'enable-point-labels',
    'enable-slices',
    'x-title',
    'y-title'
  ];

  get chartType(): string {
    return 'line';
  }

  get defaultLayers(): string[] {
    return [
      'grid',
      'markers',
      'axes',
      'areas',
      'lines',
      'points',
      'pointLabels',
      'slices',
      'legends'
    ];
  }

  get curve(): string {
    return this.getOption('curve', 'curve', 'monotoneX') || 'monotoneX';
  }
  set curve(val: string) {
    this._config.curve = val;
    this.setAttribute('curve', val);
  }

  get enableArea(): boolean {
    return Boolean(this.getOption('enableArea', 'enable-area', false));
  }
  set enableArea(val: boolean) {
    this._config.enableArea = val;
    if (val) this.setAttribute('enable-area', 'true');
    else this.removeAttribute('enable-area');
  }

  get enablePointLabels(): boolean {
    return Boolean(
      this.getOption('enablePointLabels', 'enable-point-labels', false)
    );
  }
  set enablePointLabels(val: boolean) {
    this._config.enablePointLabels = val;
    if (val) this.setAttribute('enable-point-labels', 'true');
    else this.removeAttribute('enable-point-labels');
  }

  protected prepareContext(ctx: ChartRenderContext<LineSeries[]>): void {
    const model = computeLineChartModel(ctx, {
      curve: this.curve,
      enableArea: this.enableArea,
      areaOpacity: this.getOption('areaOpacity', 'area-opacity', 0.22) ?? 0.22,
      lineWidth: this.getOption('lineWidth', 'line-width', 2.5) ?? 2.5,
      pointSize: this.getOption('pointSize', 'point-size', 9) ?? 9,
      enablePointLabels: this.enablePointLabels,
      enableSlices:
        this.getOption('enableSlices', 'enable-slices', true) !== false,
      xTitle: this.getOption('xTitle', 'x-title'),
      yTitle: this.getOption('yTitle', 'y-title'),
      setupThresholds: (c) => this.setupMarkersAndThresholds(c),
      recordThresholdItem: (item, evalRes) =>
        this._recordMatchedThresholdItem!(item, evalRes)
    });
    ctx.state.model = model;
    ctx.state.computedSeries = model.series;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<LineSeries[]>) => void
  > {
    const defs = () => this.shadowRoot?.querySelector('.mc-chart-defs');
    return {
      grid: (ctx) => renderCartesianGrid(ctx),
      axes: (ctx) => {
        const model = ctx.state.model as LineChartModel;
        renderCartesianAxes(ctx, {
          xTitle: model.xTitle,
          yTitle: model.yTitle
        });
      },
      areas: (ctx) => {
        const explicitAreaLayer = Array.from(this.children).some(
          (el) =>
            el.tagName.toLowerCase() === 'mc-chart-layer' &&
            el.getAttribute('name') === 'areas'
        );
        renderLineAreasLayer(
          ctx.state.model as LineChartModel,
          ctx,
          defs(),
          explicitAreaLayer
        );
      },
      lines: (ctx) =>
        renderLinesLayer(ctx.state.model as LineChartModel, ctx, defs()),
      points: (ctx) =>
        renderLinePointsLayer(ctx.state.model as LineChartModel, ctx),
      pointLabels: (ctx) => {
        const explicitLayer = Array.from(this.children).some(
          (el) =>
            el.tagName.toLowerCase() === 'mc-chart-layer' &&
            el.getAttribute('name') === 'pointLabels'
        );
        const hasOverride = this.resolveLabelOverrides().some(
          (o) => o.target === 'data' || o.target === 'all'
        );
        renderLinePointLabelsLayer(
          ctx.state.model as LineChartModel,
          ctx,
          explicitLayer || hasOverride
        );
      },
      slices: (ctx) =>
        renderLineSlicesLayer(ctx.state.model as LineChartModel, ctx),
      legends: (ctx) =>
        renderLineLegendsLayer(ctx.state.model as LineChartModel, ctx)
    };
  }
}
