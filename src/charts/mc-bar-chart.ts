import { MCBaseChart } from '../core/base-chart';
import {
  createDefaultScaleConfig,
  renderCartesianAxes,
  renderCartesianGrid
} from '../core/scale-manager';
import type { BarDatum, ChartRenderContext, ScaleConfig } from '../core/types';
import { computeBarChartModel, type BarChartModel } from '../models/bar.model';
import {
  renderBarLabelsLayer,
  renderBarLegendsLayer,
  renderBarsLayer
} from '../presentation/layers/bar.layers';

/**
 * `<mc-bar-chart>` Orchestrator Web Component.
 * Wires the pure `computeBarChartModel` Model Layer with the dumb presentation layers
 * (`renderBarsLayer`, `renderBarLabelsLayer`, `renderBarLegendsLayer`, `renderCartesianGrid`, `renderCartesianAxes`).
 */
export class MCBarChart extends MCBaseChart<BarDatum[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'keys',
    'index-by',
    'group-mode',
    'layout',
    'border-radius',
    'enable-labels',
    'x-title',
    'y-title'
  ];

  #keys: string[] | null = null;

  get chartType(): string {
    return 'bar';
  }

  get defaultLayers(): string[] {
    return ['grid', 'axes', 'bars', 'markers', 'labels', 'legends'];
  }

  protected getDefaultScaleConfig(): ScaleConfig {
    return createDefaultScaleConfig('band', 'linear');
  }

  get indexBy(): string {
    return this.getOption('indexBy', 'index-by', 'category') || 'category';
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
    return ['value'];
  }
  set keys(val: string[]) {
    this.#keys = val;
    this._config.keys = val;
    if (this._isConnected) this.render();
  }

  get groupMode(): 'grouped' | 'stacked' {
    if (this._config.groupMode) return this._config.groupMode;
    const attr = this.getAttribute('group-mode');
    if (attr === 'stacked' || attr === 'grouped') return attr;
    return this.resolveScaleConfig().y.stacked ? 'stacked' : 'grouped';
  }
  set groupMode(val: 'grouped' | 'stacked') {
    this._config.groupMode = val;
    this.setAttribute('group-mode', val);
  }

  get layout(): 'vertical' | 'horizontal' {
    return this.getOption('layout', 'layout', 'vertical') || 'vertical';
  }
  set layout(val: 'vertical' | 'horizontal') {
    this._config.layout = val;
    this.setAttribute('layout', val);
  }

  protected prepareContext(ctx: ChartRenderContext<BarDatum[]>): void {
    const model = computeBarChartModel(ctx, {
      indexBy: this.indexBy,
      keys: this.keys,
      groupMode: this.groupMode,
      layout: this.layout,
      borderRadius: this.getOption('borderRadius', 'border-radius', 5) ?? 5,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false,
      xTitle: this.getOption('xTitle', 'x-title'),
      yTitle: this.getOption('yTitle', 'y-title'),
      setupThresholds: (c) => this.setupMarkersAndThresholds(c),
      recordThresholdItem: (item, evalRes) =>
        this._recordMatchedThresholdItem!(item, evalRes)
    });
    ctx.state.model = model;
    ctx.state.computedBars = model.bars;
    ctx.state.activeKeys = model.activeKeys;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<BarDatum[]>) => void
  > {
    return {
      grid: (ctx) =>
        renderCartesianGrid(ctx, {
          enableX: this.layout === 'horizontal',
          enableY: this.layout === 'vertical'
        }),
      axes: (ctx) => {
        const model = ctx.state.model as BarChartModel;
        renderCartesianAxes(ctx, {
          xTitle: model.xTitle,
          yTitle: model.yTitle
        });
      },
      bars: (ctx) => renderBarsLayer(ctx.state.model as BarChartModel, ctx),
      labels: (ctx) =>
        renderBarLabelsLayer(ctx.state.model as BarChartModel, ctx),
      legends: (ctx) =>
        renderBarLegendsLayer(ctx.state.model as BarChartModel, ctx)
    };
  }
}
