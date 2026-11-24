import { MCBaseChart } from '../core/base-chart';
import type {
  ChartMargin,
  ChartRenderContext,
  RadarBlendMode,
  RadarDatum
} from '../core/types';
import {
  computeRadarChartModel,
  type RadarChartModel
} from '../models/radar.model';
import {
  renderRadarAxesLayer,
  renderRadarDotLabelsLayer,
  renderRadarDotsLayer,
  renderRadarGridLayer,
  renderRadarLegendsLayer,
  renderRadarPolygonsLayer
} from '../presentation/layers/radar.layers';

/**
 * `<mc-radar-chart>` Orchestrator Web Component.
 * Wires the pure `computeRadarChartModel` Model Layer with the dumb presentation layers.
 */
export class MCRadarChart extends MCBaseChart<RadarDatum[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'keys',
    'index-by',
    'max-value',
    'grid-levels',
    'grid-shape',
    'start-angle',
    'grid-label-offset',
    'fill-opacity',
    'enable-dots',
    'enable-dot-labels',
    'dot-size',
    'dot-border-width',
    'blend-mode',
    'split-area'
  ];

  #keys: string[] | null = null;

  get chartType(): string {
    return 'radar';
  }

  get defaultLayers(): string[] {
    return ['grid', 'axes', 'layers', 'dots', 'labels', 'legends'];
  }

  protected getDefaultMargin(): ChartMargin {
    return { top: 44, right: 64, bottom: 58, left: 64 };
  }

  protected getDefaultTooltipPosition(): 'item' {
    return 'item';
  }

  get indexBy(): string {
    return this.getOption('indexBy', 'index-by', 'metric') || 'metric';
  }
  set indexBy(val: string) {
    this._config.indexBy = val;
    this.setAttribute('index-by', val);
  }

  get keys(): string[] {
    if (this.#keys) return this.#keys;
    if (this._config.keys && this._config.keys.length > 0) {
      return this._config.keys;
    }
    const attr = this.getAttribute('keys');
    if (attr) {
      return attr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const rows = Array.isArray(this._data) ? this._data : [];
    if (rows.length > 0) {
      const idxKey = this.indexBy;
      return Object.keys(rows[0]).filter(
        (k) => k !== idxKey && typeof rows[0][k] === 'number'
      );
    }
    return [];
  }
  set keys(val: string[]) {
    this.#keys = val;
    this._config.keys = val;
    if (this._isConnected) this.render();
  }

  protected override hasPlottableData(data: RadarDatum[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    const keys = this.keys;
    if (keys.length === 0) return false;
    const idxKey = this.indexBy;
    const isFiniteVal = (v: unknown): boolean =>
      v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
    return data.some(
      (row) =>
        row &&
        (keys.some((k) => isFiniteVal(row[k])) ||
          Object.keys(row).some((k) => k !== idxKey && isFiniteVal(row[k])))
    );
  }

  protected prepareContext(ctx: ChartRenderContext<RadarDatum[]>): void {
    const model = computeRadarChartModel(ctx, {
      indexBy: this.indexBy,
      keys: this.keys,
      maxValue: this.getOption('maxValue', 'max-value'),
      gridLevels: this.getOption('gridLevels', 'grid-levels', 5) ?? 5,
      gridShape:
        (this.getOption('gridShape', 'grid-shape', 'circular') as
          | 'circular'
          | 'linear') || 'circular',
      startAngle: this.getOption('startAngle', 'start-angle', 0) ?? 0,
      gridLabelOffset:
        this.getOption('gridLabelOffset', 'grid-label-offset', 18) ?? 18,
      fillOpacity:
        this.getOption('fillOpacity', 'fill-opacity', 0.24) ?? 0.24,
      enableDots:
        this.getOption('enableDots', 'enable-dots', true) !== false,
      enableDotLabels: Boolean(
        this.getOption('enableDotLabels', 'enable-dot-labels', false)
      ),
      dotSize: this.getOption('dotSize', 'dot-size', 8.4) ?? 8.4,
      dotBorderWidth:
        this.getOption('dotBorderWidth', 'dot-border-width', 1.8) ?? 1.8,
      blendMode:
        (this.getOption('blendMode', 'blend-mode', 'normal') as RadarBlendMode) ??
        'normal',
      splitArea: Boolean(this.getOption('splitArea', 'split-area', false))
    });
    ctx.state.model = model;
    ctx.state.series = model.series;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<RadarDatum[]>) => void
  > {
    return {
      grid: (ctx) =>
        renderRadarGridLayer(ctx.state.model as RadarChartModel, ctx),
      axes: (ctx) =>
        renderRadarAxesLayer(ctx.state.model as RadarChartModel, ctx),
      layers: (ctx) =>
        renderRadarPolygonsLayer(ctx.state.model as RadarChartModel, ctx),
      dots: (ctx) =>
        renderRadarDotsLayer(ctx.state.model as RadarChartModel, ctx),
      labels: (ctx) => {
        const hasOverride = this.resolveLabelOverrides().some(
          (o) => o.target === 'radar-point' || o.target === 'all'
        );
        renderRadarDotLabelsLayer(
          ctx.state.model as RadarChartModel,
          ctx,
          hasOverride
        );
      },
      legends: (ctx) =>
        renderRadarLegendsLayer(ctx.state.model as RadarChartModel, ctx)
    };
  }
}
