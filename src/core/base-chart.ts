import * as d3 from 'd3';
import {
  AnimationEngine,
  createDefaultAnimationConfig,
  resolveMotionConfig
} from './animation-engine';
import { AriaEngine, createDefaultAriaConfig } from './aria-engine';
import { LabelEngine } from './label-engine';
import { MarkerEngine } from './marker-engine';
import { createDefaultScaleConfig } from './scale-manager';
import { createDefaultTheme, createOrdinalColorScale } from './theme';
import type {
  AnimationConfig,
  AriaConfig,
  AriaItemDescriptor,
  ChartConfig,
  ChartDimensions,
  ChartMargin,
  ChartPaletteName,
  ChartRenderContext,
  ChartTheme,
  CustomLabelRenderer,
  ItemAnimationSpec,
  LabelDescriptor,
  LabelStyleOverride,
  LayerInput,
  MarkerConfig,
  MotionPresetName,
  ScaleConfig,
  ThresholdEvaluationResult,
  ThresholdMatchedItem,
  ViewConfig
} from './types';
import {
  MCAnimationLayer,
  MCAriaLayer,
  MCChartLayer,
  MCCustomLayer,
  MCScaleLayer,
  MCThemeLayer,
  MCViewLayer
} from '../components/layers/mc-layers';
import { MCLabelElement } from '../components/mc-label';
import { MCMarkerElement, MCMarkerLayer } from '../components/mc-marker';

const SVG_NS = 'http://www.w3.org/2000/svg';

const baseChartTemplate = document.createElement('template');
baseChartTemplate.innerHTML = `
  <div class="mc-chart-container" part="container">
    <svg class="mc-chart-svg" part="svg" role="img" xmlns="http://www.w3.org/2000/svg" aria-labelledby="mc-svg-title" aria-describedby="mc-svg-desc">
      <title id="mc-svg-title">Interactive Chart</title>
      <desc id="mc-svg-desc">Data visualization rendered by modern-charts web component</desc>
      <defs class="mc-chart-defs"></defs>
      <g class="mc-chart-viewport">
        <g class="mc-chart-root"></g>
      </g>
    </svg>
    <div class="mc-view-controls" part="controls" hidden>
      <button type="button" class="mc-view-btn" data-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" class="mc-view-btn" data-zoom="out" aria-label="Zoom out">−</button>
      <button type="button" class="mc-view-btn" data-zoom="reset" aria-label="Reset zoom">Reset</button>
    </div>
    <div class="mc-tooltip" part="tooltip" hidden></div>
    <div class="mc-aria-live visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="mc-aria-table-container visually-hidden"></div>
    <div class="mc-internal-subcomponents" hidden>
      <mc-theme-layer data-internal></mc-theme-layer>
      <mc-scale-layer data-internal></mc-scale-layer>
      <mc-view-layer data-internal zoomable="false" pannable="false"></mc-view-layer>
      <mc-animation-layer data-internal></mc-animation-layer>
      <mc-aria-layer data-internal></mc-aria-layer>
      <mc-marker-layer data-internal></mc-marker-layer>
    </div>
    <slot class="mc-config-slot" style="display:none"></slot>
  </div>
`;

let sharedChartSheet: CSSStyleSheet | null = null;
function getBaseChartStyleSheet(): CSSStyleSheet | null {
  if (sharedChartSheet) return sharedChartSheet;
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    sharedChartSheet = new CSSStyleSheet();
    sharedChartSheet.replaceSync(`
      @layer base, theme, state;

      @layer base {
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          box-sizing: border-box;
          container-type: inline-size;
          --_mc-bg: var(--mc-bg, transparent);
          --_mc-text: var(--mc-text-color, #1e293b);
          --_mc-font: var(--mc-font-family, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          --_mc-radius: var(--mc-border-radius, 12px);
          --_mc-focus-ring: var(--mc-focus-color, #38bdf8);
          font-family: var(--_mc-font);
          color: var(--_mc-text);
        }

        :host([hidden]) {
          display: none;
        }

        .mc-chart-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: inherit;
          background: var(--_mc-bg);
          border-radius: var(--_mc-radius);
          overflow: hidden;
          box-sizing: border-box;
        }

        .mc-chart-svg {
          display: block;
          width: 100%;
          height: 100%;
          user-select: none;
          overflow: hidden;
        }

        .mc-aria-item {
          outline: none;
        }

        .mc-aria-item:focus-visible {
          outline: 2.5px solid var(--_mc-focus-ring);
          outline-offset: 2px;
          filter: brightness(1.16) drop-shadow(0 0 5px var(--_mc-focus-ring));
        }

        .visually-hidden:where(:not(:focus-within, :active)) {
          position: absolute !important;
          clip-path: inset(50%) !important;
          overflow: hidden !important;
          width: 1px !important;
          height: 1px !important;
          margin: -1px !important;
          padding: 0 !important;
          border: 0 !important;
          white-space: nowrap !important;
        }

        .mc-layer {
          transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes mc-layer-reveal {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .mc-layer--entering {
            animation: mc-layer-reveal 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }

        .mc-view-controls {
          position: absolute;
          bottom: 10px;
          right: 12px;
          display: inline-flex;
          gap: 4px;
          background: rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(6px);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          z-index: 5;
        }

        .mc-view-controls[hidden] {
          display: none;
        }

        .mc-view-btn {
          font: inherit;
          color: inherit;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          padding: 4px 7px;
          border: none;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.82);
          color: #1e293b;
          cursor: pointer;
          transition: background 150ms ease, transform 100ms ease;
        }

        .mc-view-btn:hover {
          background: #ffffff;
        }

        .mc-view-btn:focus-visible {
          outline: 2px solid var(--_mc-focus-ring);
          outline-offset: 2px;
        }

        .mc-view-btn:active {
          transform: scale(0.96);
        }

        .mc-tooltip {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 20;
          padding: 8px 11px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.4;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 4px 10px -4px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.28);
          transition: opacity 120ms ease, transform 90ms ease;
          white-space: nowrap;
        }

        .mc-tooltip[hidden] {
          display: none;
        }
      }
    `);
  }
  return sharedChartSheet;
}

export abstract class MCBaseChart<TData = any> extends HTMLElement {
  static get baseObservedAttributes(): string[] {
    return [
      'config',
      'data',
      'width',
      'height',
      'auto-size',
      'margin',
      'theme-mode',
      'palette',
      'chart-title',
      'layers',
      'label-mode',
      'animate',
      'motion-config',
      'aria-label',
      'is-focusable'
    ];
  }

  #internals: ElementInternals | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  #streamTimer: ReturnType<typeof setTimeout> | null = null;

  protected labelEngine = new LabelEngine();
  protected animationEngine = new AnimationEngine();
  protected ariaEngine = new AriaEngine();
  protected markerEngine = new MarkerEngine();

  protected _config: ChartConfig<TData> = {};
  protected _data: TData | null = null;
  protected _customLayers: LayerInput<TData>[] | null = null;
  protected _customTheme: Partial<ChartTheme> | null = null;
  protected _customScaleConfig: Partial<ScaleConfig> | null = null;
  protected _customViewConfig: Partial<ViewConfig> | null = null;
  protected _customAnimationConfig: Partial<AnimationConfig> | null = null;
  protected _customAriaConfig: Partial<AriaConfig> | null = null;
  protected _customMarkers: MarkerConfig[] | null = null;
  protected _labelRenderer?: CustomLabelRenderer;
  protected _chartState: Record<string, any> = {};
  protected _renderedLayerSet = new Set<string>();
  protected _decoratedAriaItems: { item: AriaItemDescriptor; label: string }[] = [];
  protected _recordMatchedThresholdItem?: (
    item: Omit<
      ThresholdMatchedItem,
      | 'effectiveColor'
      | 'isUnderThreshold'
      | 'isAboveThreshold'
      | 'matchedMarkerIds'
      | 'style'
    >,
    evalResult: ThresholdEvaluationResult
  ) => ThresholdMatchedItem;
  protected _isConnected = false;

  constructor() {
    super();
    if (typeof this.attachInternals === 'function') {
      try {
        this.#internals = this.attachInternals();
        this.#internals.role = 'figure';
      } catch {
        this.#internals = null;
      }
    } else {
      this.setAttribute('role', 'figure');
    }

    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getBaseChartStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(baseChartTemplate.content.cloneNode(true));
  }

  abstract get chartType(): string;
  abstract get defaultLayers(): string[];
  protected abstract getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<TData>) => void
  >;

  protected getDefaultMargin(): ChartMargin {
    return { top: 32, right: 28, bottom: 48, left: 56 };
  }

  protected getDefaultScaleConfig(): ScaleConfig {
    return createDefaultScaleConfig('point', 'linear');
  }

  connectedCallback(): void {
    this._isConnected = true;
    this.#setupControlsListeners();
    this.#setupChildObservers();
    this.#syncAutoSizeObserver();

    if (this.hasAttribute('config') && Object.keys(this._config).length === 0) {
      this.#parseConfigAttribute(this.getAttribute('config'));
    }
    if (this.hasAttribute('data') && !this._data) {
      this.#parseDataAttribute(this.getAttribute('data'));
    }

    this.render();
  }

  connectedMoveCallback(): void {
    this.render();
  }

  disconnectedCallback(): void {
    this._isConnected = false;
    this.#teardownAutoSizeObserver();
    if (this.#mutationObserver) {
      this.#mutationObserver.disconnect();
      this.#mutationObserver = null;
    }
    if (this.#streamTimer) {
      clearTimeout(this.#streamTimer);
      this.#streamTimer = null;
    }
  }

  attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal === newVal) return;
    if (name === 'config') {
      this.#parseConfigAttribute(newVal);
    } else if (name === 'data') {
      this.#parseDataAttribute(newVal);
    } else if (name === 'auto-size') {
      this.#syncAutoSizeObserver();
    }
    if (this._isConnected) {
      this.render();
    }
  }

  get config(): ChartConfig<TData> {
    return this._config;
  }
  set config(val: ChartConfig<TData>) {
    this.setConfig(val);
  }

  public setConfig(nextConfig: ChartConfig<TData>): void {
    this._config = nextConfig ? { ...nextConfig } : {};
    if (this._config.data !== undefined) {
      this._data = this._config.data;
    }
    if (this._config.layers !== undefined) {
      this._customLayers = this._config.layers;
    }
    if (this._config.markers !== undefined) {
      this._customMarkers = this._config.markers;
    }
    if (this._config.labelRenderer !== undefined) {
      this._labelRenderer = this._config.labelRenderer;
    }
    if (this._config.autoSize !== undefined) {
      if (this._config.autoSize) this.setAttribute('auto-size', '');
      else this.removeAttribute('auto-size');
      this.#syncAutoSizeObserver();
    }
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  /**
   * Returns the underlying Web Component sub-components managed by this chart:
   * `{ themeLayer, scaleLayer, viewLayer, animationLayer, ariaLayer, markerLayer }`.
   */
  public getSubComponents(): {
    themeLayer: MCThemeLayer | null;
    scaleLayer: MCScaleLayer | null;
    viewLayer: MCViewLayer | null;
    animationLayer: MCAnimationLayer | null;
    ariaLayer: MCAriaLayer | null;
    markerLayer: MCMarkerLayer | null;
  } {
    const internalRoot = this.shadowRoot?.querySelector(
      '.mc-internal-subcomponents'
    );
    return {
      themeLayer:
        (this.querySelector('mc-theme-layer') as MCThemeLayer | null) ??
        (internalRoot?.querySelector('mc-theme-layer') as MCThemeLayer | null) ??
        null,
      scaleLayer:
        (this.querySelector('mc-scale-layer') as MCScaleLayer | null) ??
        (internalRoot?.querySelector('mc-scale-layer') as MCScaleLayer | null) ??
        null,
      viewLayer:
        (this.querySelector('mc-view-layer') as MCViewLayer | null) ??
        (internalRoot?.querySelector('mc-view-layer') as MCViewLayer | null) ??
        null,
      animationLayer:
        (this.querySelector(
          'mc-animation-layer, mc-animation'
        ) as MCAnimationLayer | null) ??
        (internalRoot?.querySelector(
          'mc-animation-layer'
        ) as MCAnimationLayer | null) ??
        null,
      ariaLayer:
        (this.querySelector('mc-aria-layer, mc-aria') as MCAriaLayer | null) ??
        (internalRoot?.querySelector('mc-aria-layer') as MCAriaLayer | null) ??
        null,
      markerLayer:
        (this.querySelector('mc-marker-layer') as MCMarkerLayer | null) ??
        (internalRoot?.querySelector(
          'mc-marker-layer'
        ) as MCMarkerLayer | null) ??
        null
    };
  }

  #syncInternalSubComponentsFromConfig(): void {
    const subs = this.getSubComponents();
    const cfg = this._config;

    if (
      subs.themeLayer &&
      typeof subs.themeLayer.applyFromConfig === 'function'
    ) {
      subs.themeLayer.applyFromConfig({
        ...(cfg.theme ?? {}),
        ...(cfg.themeMode ? { mode: cfg.themeMode } : {}),
        ...(cfg.palette ? { palette: cfg.palette } : {}),
        ...(cfg.colors ? { colors: cfg.colors } : {}),
        ...(cfg.labelMode === 'svg' || cfg.labelMode === 'foreignObject'
          ? { labelRenderMode: cfg.labelMode }
          : {})
      });
    }

    if (
      subs.scaleLayer &&
      typeof subs.scaleLayer.applyFromConfig === 'function'
    ) {
      const def = this.getDefaultScaleConfig();
      subs.scaleLayer.applyFromConfig({
        x: { ...def.x, ...(cfg.scales?.x ?? {}), ...(cfg.xScale ?? {}) },
        y: { ...def.y, ...(cfg.scales?.y ?? {}), ...(cfg.yScale ?? {}) },
        color: {
          ...(cfg.scales?.color ?? {}),
          ...(cfg.colorScheme ? { scheme: cfg.colorScheme } : {})
        }
      });
    }

    if (
      subs.viewLayer &&
      cfg.view &&
      typeof subs.viewLayer.applyFromConfig === 'function'
    ) {
      subs.viewLayer.applyFromConfig(cfg.view);
    }

    if (
      subs.animationLayer &&
      typeof subs.animationLayer.applyFromConfig === 'function' &&
      (cfg.animate !== undefined ||
        cfg.motionConfig !== undefined ||
        cfg.animation !== undefined)
    ) {
      const resolvedAnim = resolveMotionConfig(
        cfg.animate,
        cfg.motionConfig,
        cfg.animation
      );
      subs.animationLayer.applyFromConfig(resolvedAnim);
    }

    if (
      subs.ariaLayer &&
      typeof subs.ariaLayer.applyFromConfig === 'function' &&
      (cfg.aria !== undefined ||
        cfg.role !== undefined ||
        cfg.ariaLabel !== undefined ||
        cfg.ariaLabelledBy !== undefined ||
        cfg.ariaDescribedBy !== undefined ||
        cfg.isFocusable !== undefined)
    ) {
      subs.ariaLayer.applyFromConfig({
        ...(cfg.aria ?? {}),
        ...(cfg.role ? { role: cfg.role } : {}),
        ...(cfg.ariaLabel ? { label: cfg.ariaLabel } : {}),
        ...(cfg.ariaLabelledBy ? { labelledBy: cfg.ariaLabelledBy } : {}),
        ...(cfg.ariaDescribedBy ? { describedBy: cfg.ariaDescribedBy } : {}),
        ...(cfg.isFocusable !== undefined
          ? { isFocusable: cfg.isFocusable }
          : {})
      });
    }

    if (
      subs.markerLayer &&
      typeof subs.markerLayer.applyFromConfig === 'function' &&
      cfg.markers !== undefined
    ) {
      subs.markerLayer.applyFromConfig(cfg.markers);
    }
  }

  protected getOption<K extends keyof ChartConfig<TData>>(
    propKey: K,
    attrName?: string,
    defaultValue?: ChartConfig<TData>[K]
  ): ChartConfig<TData>[K] {
    if (this._config && this._config[propKey] !== undefined) {
      return this._config[propKey];
    }
    if (attrName && this.hasAttribute(attrName)) {
      const raw = this.getAttribute(attrName)!;
      if (typeof defaultValue === 'boolean') {
        return (raw !== 'false') as any;
      }
      if (typeof defaultValue === 'number') {
        const n = Number(raw);
        return (Number.isNaN(n) ? defaultValue : n) as any;
      }
      return raw as any;
    }
    return defaultValue as any;
  }

  // Public Properties & Reflection

  get data(): TData | null {
    return this._data;
  }
  set data(val: TData | null) {
    this._data = val;
    this._config.data = val ?? undefined;
    if (this._isConnected) {
      this.render();
    }
  }

  get markers(): MarkerConfig[] {
    return this.resolveMarkersConfig();
  }
  set markers(val: MarkerConfig[]) {
    this._customMarkers = val ? [...val] : [];
    this._config.markers = this._customMarkers;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  get autoSize(): boolean {
    if (this._config.autoSize !== undefined) return this._config.autoSize;
    if (!this.hasAttribute('auto-size')) return false;
    return this.getAttribute('auto-size') !== 'false';
  }
  set autoSize(val: boolean) {
    this._config.autoSize = val;
    if (val) {
      this.setAttribute('auto-size', '');
    } else {
      this.removeAttribute('auto-size');
    }
    this.#syncAutoSizeObserver();
    if (this._isConnected) {
      this.render();
    }
  }

  get chartTitle(): string {
    return this._config.title ?? this.getAttribute('chart-title') ?? '';
  }
  set chartTitle(val: string) {
    this._config.title = val;
    if (val) this.setAttribute('chart-title', val);
    else this.removeAttribute('chart-title');
  }

  get layers(): LayerInput<TData>[] {
    if (this._customLayers) return this._customLayers;
    if (this._config.layers) return this._config.layers;
    const attr = this.getAttribute('layers');
    if (attr) {
      return attr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return this.defaultLayers;
  }
  set layers(val: LayerInput<TData>[]) {
    this._customLayers = val;
    this._config.layers = val;
    if (this._isConnected) {
      this.render();
    }
  }

  get labelRenderer(): CustomLabelRenderer | undefined {
    return this._labelRenderer ?? this._config.labelRenderer;
  }
  set labelRenderer(fn: CustomLabelRenderer | undefined) {
    this._labelRenderer = fn;
    this._config.labelRenderer = fn;
    this.labelEngine.setCustomRenderer(fn);
    if (this._isConnected) {
      this.render();
    }
  }

  get theme(): Partial<ChartTheme> | null {
    return this._customTheme ?? this._config.theme ?? null;
  }
  set theme(val: Partial<ChartTheme> | null) {
    this._customTheme = val;
    this._config.theme = val ?? undefined;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  get scaleConfig(): Partial<ScaleConfig> | null {
    return this._customScaleConfig ?? this._config.scales ?? null;
  }
  set scaleConfig(val: Partial<ScaleConfig> | null) {
    this._customScaleConfig = val;
    this._config.scales = val ?? undefined;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  get viewConfig(): Partial<ViewConfig> | null {
    return this._customViewConfig ?? this._config.view ?? null;
  }
  set viewConfig(val: Partial<ViewConfig> | null) {
    this._customViewConfig = val;
    this._config.view = val ?? undefined;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  get animationConfig(): Partial<AnimationConfig> | null {
    return this._customAnimationConfig ?? this._config.animation ?? null;
  }
  set animationConfig(val: Partial<AnimationConfig> | null) {
    this._customAnimationConfig = val;
    this._config.animation = val ?? undefined;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  get ariaConfig(): Partial<AriaConfig> | null {
    return this._customAriaConfig ?? this._config.aria ?? null;
  }
  set ariaConfig(val: Partial<AriaConfig> | null) {
    this._customAriaConfig = val;
    this._config.aria = val ?? undefined;
    this.#syncInternalSubComponentsFromConfig();
    if (this._isConnected) {
      this.render();
    }
  }

  public replayAnimation(): void {
    this._renderedLayerSet.clear();
    this.render();
  }

  public resize(width?: number, height?: number): void {
    if (width !== undefined) {
      this._config.width = width;
      this.setAttribute('width', String(width));
    }
    if (height !== undefined) {
      this._config.height = height;
      this.setAttribute('height', String(height));
    }
    this.render();
  }

  public appendLayer(layer: LayerInput<TData>): void {
    const current = [...this.getResolvedLayerSequence().map((l) => l.input)];
    current.push(layer);
    this._customLayers = current;
    this._config.layers = current;
    this.render();
  }

  public removeLayer(layerName: string): void {
    const childLayer = Array.from(this.children).find(
      (el) =>
        (el.tagName.toLowerCase() === 'mc-chart-layer' ||
          el.tagName.toLowerCase() === 'mc-custom-layer') &&
        el.getAttribute('name') === layerName
    );
    if (childLayer) {
      childLayer.remove();
    }
    const base = this._customLayers ?? [...this.defaultLayers];
    this._customLayers = base.filter((item) => {
      if (typeof item === 'string') return item !== layerName;
      if (typeof item === 'object' && item !== null && 'name' in item)
        return item.name !== layerName;
      return true;
    });
    this._config.layers = this._customLayers;
    this._renderedLayerSet.delete(layerName);
    this.render();
  }

  public async streamLayers(
    layersToStream?: LayerInput<TData>[],
    intervalMs?: number
  ): Promise<void> {
    if (this.#streamTimer) {
      clearTimeout(this.#streamTimer);
      this.#streamTimer = null;
    }

    const anim = this.resolveAnimationConfig();
    const stepDelay = intervalMs ?? anim.streamDelay ?? 180;
    const targetLayers =
      layersToStream ??
      (this._customLayers ? [...this._customLayers] : [...this.defaultLayers]);

    this.#setCustomState('streaming', true);
    if (this.#internals) this.#internals.ariaBusy = 'true';

    this._renderedLayerSet.clear();
    this._customLayers = [];
    this.render();

    for (let i = 0; i < targetLayers.length; i++) {
      await new Promise<void>((resolve) => {
        this.#streamTimer = setTimeout(() => {
          this._customLayers = targetLayers.slice(0, i + 1);
          this.render();
          resolve();
        }, stepDelay);
      });
    }

    this.#setCustomState('streaming', false);
    if (this.#internals) this.#internals.ariaBusy = 'false';
  }

  public getActiveLayers(): string[] {
    return this.getResolvedLayerSequence().map((l) => l.name);
  }

  public resolveDimensions(): ChartDimensions {
    const cfgW = this._config.width;
    const cfgH = this._config.height;
    const attrW = this.getAttribute('width');
    const attrH = this.getAttribute('height');

    const hostRect = this.getBoundingClientRect?.() ?? { width: 0, height: 0 };
    const parent = this.parentElement;
    const parentRect = parent?.getBoundingClientRect?.() ?? {
      width: 0,
      height: 0
    };

    const parentW =
      (parent?.clientWidth || Math.round(parentRect.width)) ?? 0;
    const parentH =
      (parent?.clientHeight || Math.round(parentRect.height)) ?? 0;
    const hostW = this.clientWidth || Math.round(hostRect.width) || 0;
    const hostH = this.clientHeight || Math.round(hostRect.height) || 0;

    let width =
      cfgW && cfgW > 0
        ? cfgW
        : attrW !== null && Number(attrW) > 0
        ? Number(attrW)
        : hostW > 0
        ? hostW
        : parentW > 0
        ? parentW
        : 640;

    let height =
      cfgH && cfgH > 0
        ? cfgH
        : attrH !== null && Number(attrH) > 0
        ? Number(attrH)
        : hostH > 0
        ? hostH
        : parentH > 0
        ? parentH
        : this.autoSize
        ? Math.max(280, Math.round(width * 0.56))
        : 380;

    width = Math.max(160, Math.round(width));
    height = Math.max(140, Math.round(height));

    const margin = this.resolveMargin();
    const innerWidth = Math.max(40, width - margin.left - margin.right);
    const innerHeight = Math.max(40, height - margin.top - margin.bottom);

    return { width, height, innerWidth, innerHeight, margin };
  }

  public resolveMargin(): ChartMargin {
    const base = {
      ...this.getDefaultMargin(),
      ...(this._config.margin ?? {})
    };
    const attr = this.getAttribute('margin');
    if (!attr) return base;
    try {
      if (attr.trim().startsWith('{')) {
        return { ...base, ...JSON.parse(attr) };
      }
      const parts = attr.split(/[\s,]+/).map(Number);
      if (parts.length === 1 && !Number.isNaN(parts[0])) {
        return {
          top: parts[0],
          right: parts[0],
          bottom: parts[0],
          left: parts[0]
        };
      }
      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        return {
          top: parts[0],
          right: parts[1],
          bottom: parts[2],
          left: parts[3]
        };
      }
    } catch {
      // use base
    }
    return base;
  }

  public resolveTheme(): ChartTheme {
    const modeAttr =
      this._config.themeMode ||
      this._config.theme?.mode ||
      (this.getAttribute('theme-mode') as 'light' | 'dark' | 'system') ||
      'light';
    const paletteAttr =
      this._config.palette ||
      this._config.theme?.palette ||
      (this.getAttribute('palette') as ChartPaletteName) ||
      'modern';
    let theme = createDefaultTheme(modeAttr, paletteAttr);

    const { themeLayer } = this.getSubComponents();
    const lightDomThemeLayer = this.querySelector(
      'mc-theme-layer'
    ) as MCThemeLayer | null;

    if (lightDomThemeLayer && typeof lightDomThemeLayer.getTheme === 'function') {
      theme = lightDomThemeLayer.getTheme(modeAttr);
    } else if (themeLayer && typeof themeLayer.getTheme === 'function') {
      theme = themeLayer.getTheme(modeAttr);
    }

    if (
      (this._config.palette || this.hasAttribute('palette')) &&
      !lightDomThemeLayer?.hasAttribute('palette')
    ) {
      const p =
        this._config.palette ||
        (this.getAttribute('palette') as ChartPaletteName);
      const pTheme = createDefaultTheme(theme.mode, p);
      theme.palette = p;
      theme.colors = pTheme.colors;
    }

    if (this._config.colors && this._config.colors.length > 0) {
      theme.colors = this._config.colors;
    }

    if (this._config.labelMode) {
      theme.labelRenderMode = this._config.labelMode as 'svg' | 'foreignObject';
    } else if (this.hasAttribute('label-mode')) {
      theme.labelRenderMode = this.getAttribute('label-mode') as
        | 'svg'
        | 'foreignObject';
    }

    if (this._config.theme) {
      theme = { ...theme, ...this._config.theme };
    }
    if (this._customTheme) {
      theme = { ...theme, ...this._customTheme };
    }

    return theme;
  }

  public resolveScaleConfig(): ScaleConfig {
    let config = this.getDefaultScaleConfig();

    if (this._config.xScale) {
      config.x = { ...config.x, ...this._config.xScale };
    }
    if (this._config.yScale) {
      config.y = { ...config.y, ...this._config.yScale };
    }
    if (this._config.scales) {
      config = {
        ...config,
        ...this._config.scales,
        x: { ...config.x, ...(this._config.scales.x ?? {}) },
        y: { ...config.y, ...(this._config.scales.y ?? {}) }
      };
    }
    if (this._config.colorScheme) {
      config.color = {
        ...(config.color ?? {}),
        scheme: this._config.colorScheme
      };
    }

    const scaleLayers = Array.from(
      this.querySelectorAll('mc-scale-layer')
    ) as MCScaleLayer[];
    for (const layerEl of scaleLayers) {
      if (typeof layerEl.applyToConfig === 'function') {
        config = layerEl.applyToConfig(config);
      }
    }
    if (this._customScaleConfig) {
      config = {
        ...config,
        ...this._customScaleConfig,
        x: { ...config.x, ...(this._customScaleConfig.x ?? {}) },
        y: { ...config.y, ...(this._customScaleConfig.y ?? {}) }
      };
    }
    return config;
  }

  public resolveViewConfig(): ViewConfig {
    let config: ViewConfig = {
      enabled: false,
      zoomable: false,
      pannable: false,
      minZoom: 0.5,
      maxZoom: 8,
      direction: 'xy',
      showControls: false,
      initialZoom: 1,
      initialPanX: 0,
      initialPanY: 0
    };
    if (this._config.view) {
      const zoomable = this._config.view.zoomable ?? true;
      const pannable = this._config.view.pannable ?? true;
      config = {
        ...config,
        enabled: this._config.view.enabled ?? (zoomable || pannable),
        zoomable,
        pannable,
        showControls: this._config.view.showControls ?? true,
        ...this._config.view
      };
    }
    const viewLayerEl = this.querySelector(
      'mc-view-layer'
    ) as MCViewLayer | null;
    if (viewLayerEl && typeof viewLayerEl.getViewConfig === 'function') {
      config = viewLayerEl.getViewConfig();
    }
    if (this._customViewConfig) {
      config = { ...config, ...this._customViewConfig };
    }
    return config;
  }

  public resolveAnimationConfig(): AnimationConfig {
    const attrAnimate = this.hasAttribute('animate')
      ? this.getAttribute('animate') !== 'false'
      : undefined;
    const attrMotion = this.getAttribute('motion-config') as
      | MotionPresetName
      | null;

    let config = resolveMotionConfig(
      this._config.animate ?? attrAnimate,
      this._config.motionConfig ?? attrMotion ?? createDefaultAnimationConfig(),
      this._config.animation
    );

    const animLayerEl = this.querySelector(
      'mc-animation-layer, mc-animation'
    ) as MCAnimationLayer | null;
    if (animLayerEl && typeof animLayerEl.getAnimationConfig === 'function') {
      config = animLayerEl.getAnimationConfig();
    }
    if (this._customAnimationConfig) {
      config = { ...config, ...this._customAnimationConfig };
    }
    return config;
  }

  public resolveAriaConfig(): AriaConfig {
    let config = createDefaultAriaConfig();

    if (this._config.role) config.role = this._config.role;
    if (this._config.ariaLabel) config.label = this._config.ariaLabel;
    if (this._config.ariaLabelledBy)
      config.labelledBy = this._config.ariaLabelledBy;
    if (this._config.ariaDescribedBy)
      config.describedBy = this._config.ariaDescribedBy;
    if (this._config.isFocusable !== undefined)
      config.isFocusable = this._config.isFocusable;
    if (this.hasAttribute('is-focusable')) {
      config.isFocusable = this.getAttribute('is-focusable') !== 'false';
    }
    if (this.hasAttribute('aria-label')) {
      config.label = this.getAttribute('aria-label') || config.label;
    }

    if (this._config.aria) {
      config = { ...config, ...this._config.aria };
    }

    const ariaLayerEl = this.querySelector(
      'mc-aria-layer, mc-aria'
    ) as MCAriaLayer | null;
    if (ariaLayerEl && typeof ariaLayerEl.getAriaConfig === 'function') {
      const fromEl = ariaLayerEl.getAriaConfig();
      config = {
        ...config,
        ...fromEl,
        label: fromEl.label ?? config.label,
        itemLabel: fromEl.itemLabel ?? config.itemLabel,
        itemDescription: fromEl.itemDescription ?? config.itemDescription
      };
    }

    if (this._customAriaConfig) {
      config = { ...config, ...this._customAriaConfig };
    }

    return config;
  }

  public resolveMarkersConfig(): MarkerConfig[] {
    const markers: MarkerConfig[] = [];

    if (this._customMarkers) {
      markers.push(...this._customMarkers);
    } else if (this._config.markers) {
      markers.push(...this._config.markers);
    }

    // Collect from <mc-marker-layer> child elements
    const markerLayers = Array.from(
      this.querySelectorAll('mc-marker-layer')
    ) as MCMarkerLayer[];
    for (const layerEl of markerLayers) {
      if (typeof layerEl.getMarkers === 'function') {
        markers.push(...layerEl.getMarkers());
      }
    }

    // Also collect any direct <mc-marker> children not nested inside an <mc-marker-layer>
    const directMarkers = Array.from(this.children).filter(
      (el) => el.tagName.toLowerCase() === 'mc-marker'
    ) as MCMarkerElement[];
    for (const markerEl of directMarkers) {
      if (typeof markerEl.toMarkerConfig === 'function') {
        markers.push(markerEl.toMarkerConfig());
      }
    }

    return markers;
  }

  /**
   * Initializes `ctx.markers`, `ctx.thresholds`, and `ctx.evaluateThresholds`
   * once `ctx.xScale` and `ctx.yScale` are constructed.
   */
  protected setupMarkersAndThresholds(ctx: ChartRenderContext<TData>): void {
    const rawMarkers = this.resolveMarkersConfig();
    const resolvedMarkers = this.markerEngine.resolveMarkers(
      rawMarkers,
      ctx.xScale,
      ctx.yScale,
      ctx.innerWidth,
      ctx.innerHeight
    );
    const thresholdCtrl =
      this.markerEngine.createThresholdContext(resolvedMarkers);

    ctx.markers = resolvedMarkers;
    ctx.thresholds = {
      markers: thresholdCtrl.markers,
      matchedItems: thresholdCtrl.matchedItems,
      underThresholdItems: thresholdCtrl.underThresholdItems,
      aboveThresholdItems: thresholdCtrl.aboveThresholdItems,
      evaluate: thresholdCtrl.evaluate
    };
    ctx.evaluateThresholds = thresholdCtrl.evaluate;
    this._recordMatchedThresholdItem = thresholdCtrl.recordMatchedItem;
  }

  public resolveLabelOverrides(): LabelStyleOverride[] {
    const overrides: LabelStyleOverride[] = [];

    if (this._config.label) {
      const list = Array.isArray(this._config.label)
        ? this._config.label
        : [this._config.label];
      for (const item of list) {
        overrides.push({
          target: item.target ?? 'all',
          ...item
        });
      }
    }

    const labelEls = Array.from(this.children).filter(
      (el) => el.tagName.toLowerCase() === 'mc-label'
    ) as MCLabelElement[];

    for (const el of labelEls) {
      if (typeof el.toStyleOverride === 'function') {
        overrides.push(el.toStyleOverride());
      } else {
        overrides.push({
          target: (el.getAttribute('for') as any) || 'all',
          renderMode: (el.getAttribute('mode') as any) || undefined,
          maxWidth: el.hasAttribute('max-width')
            ? Number(el.getAttribute('max-width'))
            : undefined,
          color: el.getAttribute('color') || undefined,
          background: el.getAttribute('bg-color') || undefined
        });
      }
    }

    return overrides;
  }

  protected getResolvedLayerSequence(): {
    name: string;
    input: LayerInput<TData>;
    render: (ctx: ChartRenderContext<TData>) => void;
  }[] {
    const builtInRenderers: Record<
      string,
      (ctx: ChartRenderContext<TData>) => void
    > = {
      markers: (ctx) => this.markerEngine.renderMarkersLayer(ctx),
      ...this.getLayerRenderers()
    };
    const sequence: {
      name: string;
      input: LayerInput<TData>;
      render: (ctx: ChartRenderContext<TData>) => void;
    }[] = [];

    const directLayerChildren = Array.from(this.children).filter((el) => {
      const t = el.tagName.toLowerCase();
      return t === 'mc-chart-layer' || t === 'mc-custom-layer';
    });

    const hasDeclarativeChartLayers = directLayerChildren.some(
      (el) => el.tagName.toLowerCase() === 'mc-chart-layer'
    );

    if (
      hasDeclarativeChartLayers &&
      !this._customLayers &&
      !this._config.layers
    ) {
      for (const el of directLayerChildren) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'mc-chart-layer') {
          const chartLayer = el as MCChartLayer;
          const name = chartLayer.layerName || el.getAttribute('name') || '';
          const enabled =
            !el.hasAttribute('enabled') ||
            el.getAttribute('enabled') !== 'false';
          if (enabled && name && builtInRenderers[name]) {
            sequence.push({
              name,
              input: name,
              render: builtInRenderers[name]
            });
          }
        } else if (tag === 'mc-custom-layer') {
          const customEl = el as MCCustomLayer;
          const name =
            customEl.layerName || el.getAttribute('name') || 'custom-layer';
          const enabled =
            !el.hasAttribute('enabled') ||
            el.getAttribute('enabled') !== 'false';
          if (enabled) {
            sequence.push({
              name,
              input: name,
              render: (ctx) => customEl.renderIntoContext(ctx)
            });
          }
        }
      }
      return sequence;
    }

    const rawLayers = this.layers;
    rawLayers.forEach((item, idx) => {
      if (typeof item === 'string') {
        if (builtInRenderers[item]) {
          sequence.push({
            name: item,
            input: item,
            render: builtInRenderers[item]
          });
        } else {
          const matchingCustomEl = directLayerChildren.find(
            (el) =>
              el.tagName.toLowerCase() === 'mc-custom-layer' &&
              el.getAttribute('name') === item
          ) as MCCustomLayer | undefined;
          if (matchingCustomEl) {
            sequence.push({
              name: item,
              input: item,
              render: (ctx) => matchingCustomEl.renderIntoContext(ctx)
            });
          }
        }
      } else if (typeof item === 'function') {
        const fnName = item.name || `custom-fn-${idx}`;
        sequence.push({
          name: fnName,
          input: item,
          render: (ctx) => {
            const res = item(ctx);
            if (typeof res === 'string') {
              ctx.layerGroup.innerHTML = res;
            } else if (res instanceof SVGElement) {
              ctx.layerGroup.appendChild(res);
            }
          }
        });
      } else if (item && typeof item === 'object' && 'render' in item) {
        sequence.push({
          name: item.name || `custom-obj-${idx}`,
          input: item,
          render: (ctx) => {
            const res = item.render(ctx);
            if (typeof res === 'string') {
              ctx.layerGroup.innerHTML = res;
            } else if (res instanceof SVGElement) {
              ctx.layerGroup.appendChild(res);
            }
          }
        });
      }
    });

    // If markers are configured but 'markers' wasn't in a custom layer list, ensure 'markers' layer runs
    if (
      this.resolveMarkersConfig().length > 0 &&
      !sequence.some((s) => s.name === 'markers')
    ) {
      const axesIdx = sequence.findIndex((s) => s.name === 'axes');
      const markerEntry = {
        name: 'markers',
        input: 'markers',
        render: builtInRenderers.markers
      };
      if (axesIdx >= 0) {
        sequence.splice(axesIdx + 1, 0, markerEntry);
      } else {
        sequence.push(markerEntry);
      }
    }

    for (const el of directLayerChildren) {
      if (el.tagName.toLowerCase() !== 'mc-custom-layer') continue;
      const customEl = el as MCCustomLayer;
      const name =
        customEl.layerName || el.getAttribute('name') || 'custom-layer';
      if (sequence.some((s) => s.name === name)) continue;
      const enabled =
        !el.hasAttribute('enabled') || el.getAttribute('enabled') !== 'false';
      if (!enabled) continue;

      const orderAttr = el.getAttribute('order');
      const entry = {
        name,
        input: name,
        render: (ctx: ChartRenderContext<TData>) =>
          customEl.renderIntoContext(ctx)
      };

      if (orderAttr?.startsWith('before:')) {
        const target = orderAttr.slice('before:'.length);
        const targetIdx = sequence.findIndex((s) => s.name === target);
        if (targetIdx >= 0) {
          sequence.splice(targetIdx, 0, entry);
          continue;
        }
      } else if (orderAttr?.startsWith('after:')) {
        const target = orderAttr.slice('after:'.length);
        const targetIdx = sequence.findIndex((s) => s.name === target);
        if (targetIdx >= 0) {
          sequence.splice(targetIdx + 1, 0, entry);
          continue;
        }
      }
      sequence.push(entry);
    }

    return sequence;
  }

  protected prepareContext(_ctx: ChartRenderContext<TData>): void {}

  public render(): void {
    if (!this.shadowRoot) return;

    const svg = this.shadowRoot.querySelector(
      '.mc-chart-svg'
    ) as SVGSVGElement | null;
    const rootGroup = this.shadowRoot.querySelector(
      '.mc-chart-root'
    ) as SVGGElement | null;
    const viewportGroup = this.shadowRoot.querySelector(
      '.mc-chart-viewport'
    ) as SVGGElement | null;
    const controlsEl = this.shadowRoot.querySelector(
      '.mc-view-controls'
    ) as HTMLDivElement | null;
    const titleEl = this.shadowRoot.querySelector('#mc-svg-title');
    const descEl = this.shadowRoot.querySelector('#mc-svg-desc');
    const ariaTableContainer = this.shadowRoot.querySelector(
      '.mc-aria-table-container'
    ) as HTMLDivElement | null;

    if (!svg || !rootGroup || !viewportGroup) return;

    const dims = this.resolveDimensions();
    const theme = this.resolveTheme();
    const scaleConfig = this.resolveScaleConfig();
    const viewConfig = this.resolveViewConfig();
    const animationConfig = this.resolveAnimationConfig();
    const ariaConfig = this.resolveAriaConfig();
    const labelOverrides = this.resolveLabelOverrides();

    this.labelEngine.setOverrides(labelOverrides);
    this.labelEngine.setCustomRenderer(this.labelRenderer);

    svg.setAttribute('width', String(dims.width));
    svg.setAttribute('height', String(dims.height));
    svg.setAttribute('viewBox', `0 0 ${dims.width} ${dims.height}`);
    svg.style.background = theme.background;

    const effectiveTitle =
      ariaConfig.label ||
      this.chartTitle ||
      `Modern Charts ${this.chartType} visualization`;
    if (titleEl) {
      titleEl.textContent = effectiveTitle;
    }
    if (descEl) {
      descEl.textContent =
        ariaConfig.description ||
        `Interactive ${this.chartType} chart with accessible focusable items`;
    }
    if (ariaConfig.label) {
      svg.setAttribute('aria-label', ariaConfig.label);
    } else {
      svg.removeAttribute('aria-label');
    }

    rootGroup.setAttribute(
      'transform',
      `translate(${dims.margin.left}, ${dims.margin.top})`
    );
    rootGroup.innerHTML = '';
    this._decoratedAriaItems = [];

    const defs = this.shadowRoot.querySelector('.mc-chart-defs');
    if (defs) defs.innerHTML = '';

    if (controlsEl) {
      controlsEl.hidden = !(viewConfig.enabled && viewConfig.showControls);
    }

    if (!this._data) {
      this.#setCustomState('empty', true);
      this.#setCustomState('rendered', false);
      return;
    }

    this.#setCustomState('empty', false);

    const colorScale = createOrdinalColorScale(theme);
    const initialThresholdCtrl = this.markerEngine.createThresholdContext([]);

    const ctx: ChartRenderContext<TData> = {
      chartType: this.chartType,
      config: this._config,
      data: this._data,
      width: dims.width,
      height: dims.height,
      innerWidth: dims.innerWidth,
      innerHeight: dims.innerHeight,
      margin: dims.margin,
      theme,
      scaleConfig,
      viewConfig,
      animationConfig,
      ariaConfig,
      markers: [],
      thresholds: initialThresholdCtrl,
      colorScale,
      svg,
      rootGroup,
      layerGroup: rootGroup,
      d3,
      renderLabel: (parent: SVGElement, descriptor: LabelDescriptor) =>
        this.labelEngine.renderLabel(parent, descriptor, theme),
      measureText: (text: string, options?: Partial<LabelDescriptor>) =>
        this.labelEngine.measure(text, options, theme),
      decorateAriaItem: (element: SVGElement, item: AriaItemDescriptor) => {
        const decorated = this.ariaEngine.decorateItem(
          element,
          item,
          ariaConfig,
          this._config,
          {
            onItemFocus: (focusedItem, label, description) =>
              this.#handleAriaItemFocus(focusedItem, label, description),
            onItemActivate: (activatedItem, label, el) =>
              this.#handleAriaItemActivate(activatedItem, label, el),
            navigateRelative: (currentEl, delta) =>
              this.#navigateAriaItems(currentEl, delta)
          }
        );
        this._decoratedAriaItems.push({
          item,
          label: decorated.getAttribute('aria-label') || item.id
        });
        return decorated;
      },
      animateItem: (element: SVGElement, spec: ItemAnimationSpec) =>
        this.animationEngine.animateItem(element, spec, animationConfig),
      evaluateThresholds: initialThresholdCtrl.evaluate,
      showTooltip: (html: string, clientX: number, clientY: number) =>
        this.showTooltip(html, clientX, clientY, theme),
      hideTooltip: () => this.hideTooltip(),
      state: this._chartState
    };

    this.prepareContext(ctx);
    if (ctx.markers.length === 0 && this.resolveMarkersConfig().length > 0) {
      this.setupMarkersAndThresholds(ctx);
    }

    if (this.chartTitle) {
      const titleG = document.createElementNS(SVG_NS, 'g');
      titleG.setAttribute('class', 'mc-layer mc-layer--title');
      this.labelEngine.renderLabel(
        titleG,
        {
          id: 'chart-title',
          text: this.chartTitle,
          x: 0,
          y: -Math.max(12, dims.margin.top * 0.5),
          type: 'title',
          anchor: 'start',
          baseline: 'middle',
          fontSize: theme.fontSize + 3,
          fontWeight: 700,
          color: theme.textColor
        },
        theme
      );
      rootGroup.appendChild(titleG);
    }

    const layers = this.getResolvedLayerSequence();
    layers.forEach((layerDef, index) => {
      const layerG = document.createElementNS(SVG_NS, 'g');
      const isNewLayer = !this._renderedLayerSet.has(layerDef.name);
      layerG.setAttribute(
        'class',
        `mc-layer mc-layer--${layerDef.name}${
          isNewLayer && animationConfig.enabled ? ' mc-layer--entering' : ''
        }`
      );
      layerG.setAttribute('data-layer-name', layerDef.name);
      layerG.setAttribute('part', `layer layer-${layerDef.name}`);

      rootGroup.appendChild(layerG);
      ctx.layerGroup = layerG;
      layerDef.render(ctx);

      this._renderedLayerSet.add(layerDef.name);

      if (isNewLayer) {
        this.dispatchEvent(
          new CustomEvent('mc-layer-rendered', {
            bubbles: true,
            composed: true,
            detail: {
              layerName: layerDef.name,
              index,
              total: layers.length,
              chartType: this.chartType
            }
          })
        );
      }
    });

    if (ariaTableContainer) {
      ariaTableContainer.innerHTML =
        ariaConfig.enabled && ariaConfig.includeDataTable
          ? this.ariaEngine.buildAccessibleDataTableHtml(
              effectiveTitle,
              this._decoratedAriaItems
            )
          : '';
    }

    this.#configureViewZoom(svg, viewportGroup, viewConfig, dims);
    this.#setCustomState('rendered', true);
  }

  #handleAriaItemFocus(
    item: AriaItemDescriptor,
    label: string,
    description?: string
  ): void {
    const ariaConfig = this.resolveAriaConfig();
    if (ariaConfig.announceOnFocus) {
      const liveEl = this.shadowRoot?.querySelector(
        '.mc-aria-live'
      ) as HTMLDivElement | null;
      if (liveEl) {
        liveEl.textContent = description ? `${label}. ${description}` : label;
      }
    }
    this.dispatchEvent(
      new CustomEvent('mc-aria-focus', {
        bubbles: true,
        composed: true,
        detail: { item, label, description, chartType: this.chartType }
      })
    );
  }

  #handleAriaItemActivate(
    item: AriaItemDescriptor,
    label: string,
    element: SVGElement
  ): void {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    this.dispatchEvent(
      new CustomEvent('mc-item-activate', {
        bubbles: true,
        composed: true,
        detail: { item, label, chartType: this.chartType }
      })
    );
  }

  #navigateAriaItems(
    currentEl: SVGElement,
    delta: number | 'first' | 'last'
  ): void {
    const allItems = Array.from(
      this.shadowRoot?.querySelectorAll('.mc-aria-item[tabindex="0"]') ?? []
    ) as SVGElement[];
    if (allItems.length === 0) return;

    if (delta === 'first') {
      allItems[0].focus();
      return;
    }
    if (delta === 'last') {
      allItems[allItems.length - 1].focus();
      return;
    }

    const currIdx = allItems.indexOf(currentEl);
    if (currIdx === -1) return;
    const nextIdx = (currIdx + delta + allItems.length) % allItems.length;
    allItems[nextIdx]?.focus();
  }

  public showTooltip(
    html: string,
    clientX: number,
    clientY: number,
    theme?: ChartTheme
  ): void {
    const tooltip = this.shadowRoot?.querySelector(
      '.mc-tooltip'
    ) as HTMLDivElement | null;
    const container = this.shadowRoot?.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    if (!tooltip || !container) return;

    const activeTheme = theme ?? this.resolveTheme();
    tooltip.style.background = activeTheme.tooltipBackground;
    tooltip.style.color = activeTheme.tooltipTextColor;
    tooltip.style.borderColor = activeTheme.tooltipBorderColor;
    tooltip.innerHTML = html;
    tooltip.hidden = false;

    const rect = container.getBoundingClientRect();
    let relX = clientX - rect.left + 14;
    let relY = clientY - rect.top - 12;

    if (relX + 160 > rect.width) {
      relX = Math.max(8, clientX - rect.left - 150);
    }
    if (relY < 8) {
      relY = 8;
    }

    tooltip.style.transform = `translate(${Math.round(relX)}px, ${Math.round(
      relY
    )}px)`;
  }

  public hideTooltip(): void {
    const tooltip = this.shadowRoot?.querySelector(
      '.mc-tooltip'
    ) as HTMLDivElement | null;
    if (tooltip) {
      tooltip.hidden = true;
    }
  }

  #configureViewZoom(
    svg: SVGSVGElement,
    viewportGroup: SVGGElement,
    viewConfig: ViewConfig,
    dims: ChartDimensions
  ): void {
    const d3Svg = d3.select(svg);
    if (!viewConfig.enabled) {
      d3Svg.on('.zoom', null);
      viewportGroup.removeAttribute('transform');
      this.#setCustomState('zoomed', false);
      return;
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(
        viewConfig.zoomable ? [viewConfig.minZoom, viewConfig.maxZoom] : [1, 1]
      )
      .translateExtent([
        [-dims.width * 0.5, -dims.height * 0.5],
        [dims.width * 1.5, dims.height * 1.5]
      ])
      .on('zoom', (event) => {
        const t = event.transform;
        const tx = viewConfig.direction === 'y' ? 0 : t.x;
        const ty = viewConfig.direction === 'x' ? 0 : t.y;
        viewportGroup.setAttribute(
          'transform',
          `translate(${tx}, ${ty}) scale(${t.k})`
        );
        this.#setCustomState('zoomed', t.k !== 1 || tx !== 0 || ty !== 0);
        this.dispatchEvent(
          new CustomEvent('mc-zoom', {
            bubbles: true,
            composed: true,
            detail: { k: t.k, x: tx, y: ty }
          })
        );
      });

    this.#zoomBehavior = zoom;
    d3Svg.call(zoom);

    if (
      viewConfig.initialZoom !== 1 ||
      viewConfig.initialPanX !== 0 ||
      viewConfig.initialPanY !== 0
    ) {
      const initialTransform = d3.zoomIdentity
        .translate(viewConfig.initialPanX, viewConfig.initialPanY)
        .scale(viewConfig.initialZoom);
      d3Svg.call(zoom.transform, initialTransform);
    }
  }

  #setupControlsListeners(): void {
    const controls = this.shadowRoot?.querySelector('.mc-view-controls');
    if (!controls || (controls as any).__mcBound) return;
    (controls as any).__mcBound = true;

    controls.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest(
        'button[data-zoom]'
      ) as HTMLButtonElement | null;
      if (!btn || !this.#zoomBehavior) return;
      const svg = this.shadowRoot?.querySelector(
        '.mc-chart-svg'
      ) as SVGSVGElement | null;
      if (!svg) return;

      const action = btn.getAttribute('data-zoom');
      const d3Svg = d3.select(svg);
      if (action === 'in') {
        this.#zoomBehavior.scaleBy(d3Svg, 1.25);
      } else if (action === 'out') {
        this.#zoomBehavior.scaleBy(d3Svg, 0.8);
      } else if (action === 'reset') {
        this.#zoomBehavior.transform(d3Svg, d3.zoomIdentity);
      }
    });
  }

  #setupChildObservers(): void {
    if (!this.#mutationObserver) {
      this.#mutationObserver = new MutationObserver(() => {
        if (this._isConnected) {
          this.render();
        }
      });
      this.#mutationObserver.observe(this, {
        childList: true,
        subtree: true
      });
    }

    this.addEventListener('mc-layer-change', (e) => {
      e.stopPropagation();
      if (this._isConnected) {
        this.render();
      }
    });
  }

  #syncAutoSizeObserver(): void {
    this.#teardownAutoSizeObserver();
    this.#setCustomState('auto-size', this.autoSize);
    if (!this.autoSize || typeof ResizeObserver === 'undefined') return;

    this.#resizeObserver = new ResizeObserver(() => {
      if (this._isConnected) {
        this.render();
      }
    });

    this.#resizeObserver.observe(this);
    if (this.parentElement) {
      this.#resizeObserver.observe(this.parentElement);
    }
  }

  #teardownAutoSizeObserver(): void {
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
  }

  #parseDataAttribute(raw: string | null): void {
    if (!raw) {
      this._data = null;
      return;
    }
    try {
      this._data = JSON.parse(raw);
    } catch {
      // Ignore malformed partial JSON while streaming
    }
  }

  #parseConfigAttribute(raw: string | null): void {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.setConfig(parsed);
      }
    } catch {
      // Ignore malformed partial JSON while streaming
    }
  }

  #setCustomState(stateName: string, active: boolean): void {
    if (this.#internals && this.#internals.states) {
      try {
        if (active) this.#internals.states.add(stateName);
        else this.#internals.states.delete(stateName);
      } catch {
        // Ignore if CustomStateSet isn't supported
      }
    }
  }
}
