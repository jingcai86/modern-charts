import { MCBaseChart } from '../core/base-chart';
import {
  createDefaultScaleConfig,
  renderCartesianAxes,
  renderCartesianGrid
} from '../core/scale-manager';
import type {
  BarDatum,
  BarNegativeLabelPosition,
  BarOuterLabelConfig,
  BarOuterLabelPosition,
  BarOuterLabelScope,
  ChartMargin,
  ChartRenderContext,
  ScaleConfig
} from '../core/types';
import {
  computeBarChartModel,
  createDefaultBarOuterLabelConfig,
  type BarChartModel,
  type ResolvedBarOuterLabelConfig
} from '../models/bar.model';
import {
  renderBarLabelsLayer,
  renderBarLegendsLayer,
  renderBarOuterLabelsLayer,
  renderBarsLayer
} from '../presentation/layers/bar.layers';

/**
 * `<mc-bar-chart>` Orchestrator Web Component.
 * Wires the pure `computeBarChartModel` Model Layer with the dumb presentation layers
 * (`renderBarsLayer`, `renderBarLabelsLayer`, `renderBarOuterLabelsLayer`,
 * `renderBarLegendsLayer`, `renderCartesianGrid`, `renderCartesianAxes`).
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
    'enable-outer-labels',
    'outer-label-scope',
    'outer-label-position',
    'negative-label-position',
    'outer-label-padding',
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

  protected getDefaultTooltipPosition(): 'item' {
    return 'item';
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

  public resolveOuterLabelsConfig(): ResolvedBarOuterLabelConfig {
    const raw = this._config.outerLabels;
    const base = createDefaultBarOuterLabelConfig(raw);

    const enabledAttr = this.getAttribute('enable-outer-labels');
    if (raw === undefined && enabledAttr !== null) {
      base.enabled = enabledAttr !== 'false';
    } else if (
      typeof raw === 'object' &&
      raw !== null &&
      raw.enabled === undefined &&
      enabledAttr !== null
    ) {
      base.enabled = enabledAttr !== 'false';
    }

    const scopeAttr = this.getAttribute(
      'outer-label-scope'
    ) as BarOuterLabelScope | null;
    if (
      (typeof raw !== 'object' || raw?.scope === undefined) &&
      (scopeAttr === 'auto' || scopeAttr === 'bar' || scopeAttr === 'stack')
    ) {
      base.scope = scopeAttr;
    }

    const posAttr = this.getAttribute(
      'outer-label-position'
    ) as BarOuterLabelPosition | null;
    if (
      (typeof raw !== 'object' || raw?.position === undefined) &&
      (posAttr === 'auto' || posAttr === 'top' || posAttr === 'bottom')
    ) {
      base.position = posAttr;
    }

    const negPosAttr = this.getAttribute(
      'negative-label-position'
    ) as BarNegativeLabelPosition | null;
    if (
      (typeof raw !== 'object' || raw?.negativePosition === undefined) &&
      (negPosAttr === 'outside-bottom' ||
        negPosAttr === 'chart-bottom' ||
        negPosAttr === 'above-zero')
    ) {
      base.negativePosition = negPosAttr;
    }

    const padAttr = this.getAttribute('outer-label-padding');
    if (
      (typeof raw !== 'object' || raw?.padding === undefined) &&
      padAttr !== null &&
      !Number.isNaN(Number(padAttr))
    ) {
      base.padding = Math.max(0, Number(padAttr));
    }

    return base;
  }

  public override resolveMargin(): ChartMargin {
    const margin = { ...super.resolveMargin() };
    const outer = this.resolveOuterLabelsConfig();
    if (!outer.enabled) return margin;

    const fontSize = outer.fontSize ?? 12;
    const boxExtra = outer.background ? 10 : 4;
    const vertHeadroom = Math.ceil(fontSize * 1.4 + boxExtra + outer.padding);
    const horizHeadroom = Math.ceil(44 + boxExtra + outer.padding);

    if (this.layout === 'horizontal') {
      margin.right = Math.max(margin.right, horizHeadroom);
    } else {
      const hasTitle = Boolean(this._config.title || this.getAttribute('chart-title'));
      const minTop = (hasTitle ? 32 : 12) + vertHeadroom;
      margin.top = Math.max(margin.top, minTop);
    }

    return margin;
  }

  protected override hasPlottableData(data: BarDatum[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    const keys = this.keys;
    if (keys.length === 0) return false;
    return data.some((row) =>
      row &&
      keys.some((k) => {
        const v = row[k];
        return (
          v !== null &&
          v !== undefined &&
          v !== '' &&
          Number.isFinite(Number(v))
        );
      })
    );
  }

  protected prepareContext(ctx: ChartRenderContext<BarDatum[]>): void {
    const outerLabels = this.resolveOuterLabelsConfig();
    const model = computeBarChartModel(ctx, {
      indexBy: this.indexBy,
      keys: this.keys,
      groupMode: this.groupMode,
      layout: this.layout,
      borderRadius: this.getOption('borderRadius', 'border-radius', 5) ?? 5,
      enableLabels:
        this.getOption('enableLabels', 'enable-labels', true) !== false,
      outerLabels,
      xTitle: this.getOption('xTitle', 'x-title'),
      yTitle: this.getOption('yTitle', 'y-title'),
      setupThresholds: (c) => this.setupMarkersAndThresholds(c),
      recordThresholdItem: (item, evalRes) =>
        this._recordMatchedThresholdItem!(item, evalRes)
    });
    ctx.state.model = model;
    ctx.state.computedBars = model.bars;
    ctx.state.outerLabelItems = model.outerLabelItems;
    ctx.state.activeKeys = model.activeKeys;
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<BarDatum[]>) => void
  > {
    const hasExplicitOuterLayer = this.layers.some((l) => l === 'outerLabels');
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
        renderBarLabelsLayer(ctx.state.model as BarChartModel, ctx, {
          includeOuterLabels: !hasExplicitOuterLayer
        }),
      outerLabels: (ctx) =>
        renderBarOuterLabelsLayer(ctx.state.model as BarChartModel, ctx),
      legends: (ctx) =>
        renderBarLegendsLayer(ctx.state.model as BarChartModel, ctx)
    };
  }
}
