import { getChartD3 } from './d3-context';
import {
  AnimationEngine,
  createDefaultAnimationConfig,
  resolveMotionConfig
} from './animation-engine';
import { AriaEngine, createDefaultAriaConfig } from './aria-engine';
import { EventEngine } from './event-engine';
import { LabelEngine } from './label-engine';
import {
  normalizeOverflowInput,
  normalizeOverflowStrategy
} from './label-truncate';
import { createDefaultLegendConfig } from './legend-engine';
import { MarkerEngine, resolveMarkerAnnotation } from './marker-engine';
import { PatternEngine } from './pattern-engine';
import { createDefaultScaleConfig } from './scale-manager';
import {
  createDefaultTheme,
  createOrdinalColorScale,
  generateGradientPalette,
  resolvePaletteColors
} from './theme';
import { resolveElementAnchor } from './tooltip-anchor';
import type {
  AnimationConfig,
  AriaConfig,
  AriaItemDescriptor,
  ChartConfig,
  ChartDimensions,
  ChartEventHandler,
  ChartEventName,
  ChartEventsConfig,
  ChartEventTargetRegistration,
  ChartGradientConfig,
  ChartMargin,
  ChartPaletteName,
  ChartRenderContext,
  ChartStateChangeDetail,
  ChartStateKind,
  ChartTheme,
  CustomLabelRenderer,
  FillMatchContext,
  FillRule,
  GradientDirection,
  ItemAnimationSpec,
  LabelDescriptor,
  LabelOverflowConfig,
  LabelOverflowStrategy,
  LabelStyleOverride,
  LayerInput,
  LegendConfig,
  LegendItem,
  MarkerConfig,
  MotionPresetName,
  ResolvedLegendConfig,
  ScaleConfig,
  SvgFillDef,
  ThresholdEvaluationResult,
  ThresholdMatchedItem,
  TooltipConfig,
  TooltipInput,
  TooltipPayload,
  TooltipPositionMode,
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
import { MCTruncateElement } from '../components/mc-truncate';
import { MCLegendElement } from '../components/mc-legend';
import {
  MCTooltipElement,
  normalizeTooltipPosition
} from '../components/mc-tooltip';
import { MCDefElement } from '../components/mc-def';
import {
  DEFAULT_EMPTY_TEXT,
  DEFAULT_LOADING_TEXT,
  MCChartStateElement
} from '../components/mc-chart-state';
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
    <mc-chart-state
      class="mc-chart-state"
      part="state-host"
      exportparts="state, state-indicator, state-message"
      hidden
    >
      <slot name="loading" slot="loading"></slot>
      <slot name="empty" slot="empty"></slot>
    </mc-chart-state>
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

        .mc-layer--markers,
        .mc-layer--markers *,
        .mc-marker,
        .mc-marker *,
        .mc-layer--labels,
        .mc-layer--labels *,
        .mc-layer--outerLabels,
        .mc-layer--outerLabels *,
        .mc-layer--pointLabels,
        .mc-layer--pointLabels *,
        .mc-layer--grid,
        .mc-layer--grid * {
          pointer-events: none;
        }

        .mc-layer--markers .mc-marker-annotation,
        .mc-layer--markers .mc-marker-annotation *,
        .mc-label--interactive,
        .mc-label--interactive * {
          pointer-events: auto;
        }

        [data-event-target] {
          cursor: pointer;
        }

        .mc-label--interactive {
          cursor: pointer;
          outline: none;
        }

        [data-event-target]:focus-visible,
        .mc-label--interactive:focus-visible {
          outline: 2px solid var(--_mc-focus-ring);
          outline-offset: 2px;
        }

        .mc-chart-container--static,
        .mc-chart-container--static * {
          cursor: default !important;
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

        .mc-tooltip,
        .mc-legend-tooltip {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 20;
          transition: opacity 120ms ease, transform 90ms ease;
        }

        .mc-legend-tooltip {
          z-index: 21;
        }

        .mc-tooltip[hidden],
        .mc-legend-tooltip[hidden] {
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
      'gradient',
      'chart-title',
      'layers',
      'label-mode',
      'label-overflow',
      'animate',
      'motion-config',
      'aria-label',
      'is-interactive',
      'is-focusable',
      'tooltip-position',
      'loading',
      'loading-text',
      'empty-text'
    ];
  }

  #internals: ElementInternals | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #viewTransform = { k: 1, x: 0, y: 0 };
  #viewController: {
    scaleBy: (factor: number) => void;
    reset: () => void;
    destroy: () => void;
  } | null = null;
  #streamTimer: ReturnType<typeof setTimeout> | null = null;
  #currentChartState: ChartStateKind | null = null;
  #suppressAttributeRender = false;
  #isStreamingLayers = false;
  #tooltipMoveHandler: ((e: MouseEvent) => void) | null = null;

  protected labelEngine = new LabelEngine();
  protected animationEngine = new AnimationEngine();
  protected ariaEngine = new AriaEngine();
  protected markerEngine = new MarkerEngine();
  protected patternEngine = new PatternEngine();

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
  protected eventEngine = new EventEngine();
  protected _lastMargin: ChartMargin = { top: 0, right: 0, bottom: 0, left: 0 };

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
    return { top: 32, right: 28, bottom: 76, left: 56 };
  }

  protected getDefaultScaleConfig(): ScaleConfig {
    return createDefaultScaleConfig('point', 'linear');
  }

  /**
   * Per-chart sensible default tooltip positioning mode.
   * Subclasses representing discrete items (bar, scatter, radar, gauge)
   * override this to `'item'`, while area/radial/matrix/flow charts use `'follow'`.
   */
  protected getDefaultTooltipPosition(): TooltipPositionMode {
    return 'follow';
  }

  get tooltipPosition(): TooltipPositionMode {
    return this.resolveTooltipConfig().position ?? this.getDefaultTooltipPosition();
  }
  set tooltipPosition(val: TooltipPositionMode) {
    const normalized = normalizeTooltipPosition(val);
    if (normalized) {
      this.setAttribute('tooltip-position', normalized);
    } else {
      this.removeAttribute('tooltip-position');
    }
  }

  get loading(): boolean {
    if (this.hasAttribute('loading')) {
      return this.getAttribute('loading') !== 'false';
    }
    return Boolean(this._config.loading);
  }
  set loading(val: boolean) {
    const next = Boolean(val);
    this._config.loading = next;
    if (next) {
      if (
        !this.hasAttribute('loading') ||
        this.getAttribute('loading') === 'false'
      ) {
        this.setAttribute('loading', '');
      } else if (this._isConnected) {
        this.render();
      }
    } else if (this.hasAttribute('loading')) {
      this.removeAttribute('loading');
    } else if (this._isConnected) {
      this.render();
    }
  }

  get loadingText(): string {
    return (
      this._config.loadingText ??
      this.getAttribute('loading-text') ??
      DEFAULT_LOADING_TEXT
    );
  }
  set loadingText(val: string | undefined) {
    this._config.loadingText = val;
    if (this._isConnected) {
      this.render();
    }
  }

  get emptyText(): string {
    return (
      this._config.emptyText ??
      this.getAttribute('empty-text') ??
      DEFAULT_EMPTY_TEXT
    );
  }
  set emptyText(val: string | undefined) {
    this._config.emptyText = val;
    if (this._isConnected) {
      this.render();
    }
  }

  get chartState(): ChartStateKind {
    if (this.#currentChartState) return this.#currentChartState;
    if (this.loading) return 'loading';
    return this.hasPlottableData(this._data) ? 'ready' : 'empty';
  }

  public getStateElement(): MCChartStateElement | null {
    return (
      (this.shadowRoot?.querySelector(
        '.mc-chart-state'
      ) as MCChartStateElement | null) ?? null
    );
  }

  /**
   * Returns `true` when `data` contains at least one plottable value.
   * Individual chart subclasses override this for chart-specific schemas.
   */
  protected hasPlottableData(data: TData | null): boolean {
    if (data === null || data === undefined) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') return Object.keys(data as object).length > 0;
    return true;
  }

  get isInteractive(): boolean {
    return this.resolveIsInteractive();
  }
  set isInteractive(val: boolean) {
    this._config.isInteractive = Boolean(val);
    if (this._isConnected) {
      this.render();
    }
  }

  get isFocusable(): boolean {
    return this.resolveAriaConfig().isFocusable;
  }
  set isFocusable(val: boolean) {
    this._config.isFocusable = Boolean(val);
    if (this._isConnected) {
      this.render();
    }
  }

  connectedCallback(): void {
    this._isConnected = true;
    this.#setupControlsListeners();
    this.#setupStateSlotListeners();
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
    this.eventEngine.detach();
    this.#syncTooltipPointerTracking(false);
    this.#teardownAutoSizeObserver();
    if (this.#viewController) {
      this.#viewController.destroy();
      this.#viewController = null;
    }
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
    } else if (name === 'loading') {
      this._config.loading = newVal !== null && newVal !== 'false';
    } else if (name === 'loading-text') {
      this._config.loadingText = newVal ?? undefined;
    } else if (name === 'empty-text') {
      this._config.emptyText = newVal ?? undefined;
    } else if (name === 'is-interactive') {
      if (newVal === null) {
        delete this._config.isInteractive;
      } else {
        this._config.isInteractive = newVal !== 'false';
      }
    } else if (name === 'is-focusable') {
      if (newVal === null) {
        delete this._config.isFocusable;
      } else {
        this._config.isFocusable = newVal !== 'false';
      }
    }
    if (this._isConnected && !this.#suppressAttributeRender) {
      this.render();
    }
  }

  get config(): ChartConfig<TData> {
    return this._config;
  }
  set config(val: ChartConfig<TData>) {
    this.setConfig(val);
  }

  get events(): ChartEventsConfig | undefined {
    return this._config.events;
  }
  set events(val: ChartEventsConfig | undefined) {
    this._config.events = val;
  }

  /**
   * Subscribes to any unified chart event (`'click'`, `'item:click'`,
   * `'barItem:click'`, `'axis:click'`, `'legend:mouseenter'`, `'canvas:click'`, `'*'`, etc.).
   * Returns an unsubscribe function.
   */
  public on<TEventData = any>(
    eventName: ChartEventName | (string & {}),
    handler: ChartEventHandler<TEventData>
  ): () => void {
    return this.eventEngine.on(eventName, handler);
  }

  /**
   * Unsubscribes a previously registered unified chart event handler.
   */
  public off<TEventData = any>(
    eventName: ChartEventName | (string & {}),
    handler: ChartEventHandler<TEventData>
  ): void {
    this.eventEngine.off(eventName, handler);
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
    const prevSuppress = this.#suppressAttributeRender;
    this.#suppressAttributeRender = true;
    try {
      if (this._config.autoSize !== undefined) {
        if (this._config.autoSize) this.setAttribute('auto-size', '');
        else this.removeAttribute('auto-size');
        this.#syncAutoSizeObserver();
      }
      if (this._config.loading !== undefined) {
        if (this._config.loading) this.setAttribute('loading', '');
        else this.removeAttribute('loading');
      }
    } finally {
      this.#suppressAttributeRender = prevSuppress;
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

  get labelOverflow(): LabelOverflowStrategy | LabelOverflowConfig | undefined {
    return (
      this._config.labelOverflow ??
      normalizeOverflowStrategy(this.getAttribute('label-overflow'))
    );
  }
  set labelOverflow(
    val: LabelOverflowStrategy | LabelOverflowConfig | undefined
  ) {
    this._config.labelOverflow = val;
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

    this.#isStreamingLayers = true;
    this.#setCustomState('streaming', true);
    this.#syncAriaBusy();

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

    this.#isStreamingLayers = false;
    this.#setCustomState('streaming', false);
    this.#syncAriaBusy();
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

    const margin = { ...this.resolveMargin() };
    this.expandMarginForMarkerAnnotations(margin);
    this.expandMarginForLegend(margin);
    const innerWidth = Math.max(40, width - margin.left - margin.right);
    const innerHeight = Math.max(40, height - margin.top - margin.bottom);

    return { width, height, innerWidth, innerHeight, margin };
  }

  /**
   * Automatically reserves enough margin space when any active marker defines
   * an outside `annotation` (`left`, `right`, `top`, or `bottom`) so outside
   * annotation icons/text never clip against the SVG viewport.
   */
  private expandMarginForMarkerAnnotations(margin: ChartMargin): void {
    const markers = this.resolveMarkersConfig();
    if (markers.length === 0) return;

    let theme: ChartTheme | null = null;
    for (const m of markers) {
      const ann = resolveMarkerAnnotation(m);
      if (!ann) continue;

      if (!theme) theme = this.resolveTheme();
      const measured = this.labelEngine.measure(
        ann.text,
        {
          type: 'marker',
          fontSize: ann.fontSize ?? Math.max(10, theme.fontSize - 1),
          fontWeight: ann.fontWeight ?? 600,
          background: ann.background,
          padding: ann.labelPadding,
          icon: ann.icon
        },
        theme
      );

      if (ann.position === 'left') {
        margin.left = Math.max(
          margin.left,
          Math.ceil(measured.boxWidth + ann.padding + 14)
        );
      } else if (ann.position === 'right') {
        margin.right = Math.max(
          margin.right,
          Math.ceil(measured.boxWidth + ann.padding + 14)
        );
      } else if (ann.position === 'top') {
        margin.top = Math.max(
          margin.top,
          Math.ceil(measured.boxHeight + ann.padding + 14)
        );
      } else if (ann.position === 'bottom') {
        margin.bottom = Math.max(
          margin.bottom,
          Math.ceil(measured.boxHeight + ann.padding + 14)
        );
      }
    }
  }

  private expandMarginForLegend(margin: ChartMargin): void {
    const hasCustomLegend =
      this._config.legend !== undefined ||
      this.querySelector(':scope > mc-legend') !== null;
    const hasXTitle = Boolean(this._config.xTitle);
    const usesCategoricalLegend =
      this.defaultLayers.includes('legends') && this.chartType !== 'heatmap';

    if (!hasCustomLegend && !(hasXTitle && usesCategoricalLegend)) return;

    const legend = this.resolveLegendConfig();
    if (!legend.enabled) return;

    const pad = legend.padding;
    const hasTitle = Boolean(this.chartTitle);
    const baseRowH = Math.max(16, (legend.fontSize ?? 11) + 6);

    if (legend.position === 'top') {
      const needed = (hasTitle ? 34 : 8) + baseRowH + pad.top + pad.bottom;
      margin.top = Math.max(margin.top, Math.ceil(needed));
    } else if (legend.position === 'bottom') {
      const topClearance = hasXTitle ? 42 : 34;
      const needed = topClearance + baseRowH + pad.top + pad.bottom + 8;
      margin.bottom = Math.max(margin.bottom, Math.ceil(needed));
    } else if (legend.position === 'left') {
      const needed = 104 + pad.left + pad.right;
      margin.left = Math.max(margin.left, Math.ceil(needed));
    } else if (legend.position === 'right') {
      const needed = 104 + pad.left + pad.right;
      margin.right = Math.max(margin.right, Math.ceil(needed));
    }
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
      'shadcn';
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

    const gradCfg = this.resolveGradientConfig();
    if (gradCfg?.colors) {
      theme.colors = Array.isArray(gradCfg.colors)
        ? gradCfg.colors.length > 0
          ? [...gradCfg.colors]
          : theme.colors
        : resolvePaletteColors(gradCfg.colors, gradCfg.count);
    } else if (
      gradCfg?.count &&
      !(this._config.colors && this._config.colors.length > 0)
    ) {
      theme.colors = resolvePaletteColors(theme.palette, gradCfg.count);
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

  public resolveIsInteractive(): boolean {
    if (this._config.isInteractive !== undefined) {
      return this._config.isInteractive !== false;
    }
    if (this.hasAttribute('is-interactive')) {
      return this.getAttribute('is-interactive') !== 'false';
    }
    return true;
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
    if (!this.resolveIsInteractive()) {
      return config;
    }
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
    if (this._config.isFocusable !== undefined) {
      config.isFocusable = this._config.isFocusable;
    } else if (this.hasAttribute('is-focusable')) {
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

    // Master switch: static charts (isInteractive = false) are never focusable
    if (!this.resolveIsInteractive()) {
      config.isFocusable = false;
    }

    return config;
  }

  public resolveGradientConfig(): ChartGradientConfig | null {
    const raw = this._config.gradient;
    if (raw === false) return null;
    if (raw === true) {
      return { enabled: true, direction: 'auto', reverseOnNegative: true };
    }
    if (typeof raw === 'string') {
      return {
        enabled: true,
        direction: raw as GradientDirection,
        reverseOnNegative: true
      };
    }
    if (raw && typeof raw === 'object') {
      if (raw.enabled === false) return null;
      return {
        enabled: true,
        direction: 'auto',
        reverseOnNegative: true,
        ...raw
      };
    }

    const attr = this.getAttribute('gradient');
    if (attr === null || attr === 'false' || attr === '0') return null;
    const trimmed = attr.trim();
    if (trimmed === '' || trimmed === 'true' || trimmed === '1') {
      return { enabled: true, direction: 'auto', reverseOnNegative: true };
    }
    const asNum = Number(trimmed);
    return {
      enabled: true,
      direction: Number.isFinite(asNum) ? asNum : (trimmed as GradientDirection),
      reverseOnNegative: true
    };
  }

  public resolvePatternDefsAndRules(theme?: ChartTheme): {
    defs: SvgFillDef[];
    fill: FillRule[];
  } {
    const defs: SvgFillDef[] = Array.isArray(this._config.defs)
      ? [...this._config.defs]
      : [];
    const fill: FillRule[] = Array.isArray(this._config.fill)
      ? [...this._config.fill]
      : [];

    const defEls = Array.from(this.children).filter(
      (el) => el.tagName.toLowerCase() === 'mc-def'
    ) as MCDefElement[];

    for (const el of defEls) {
      const def = typeof el.toFillDef === 'function' ? el.toFillDef() : null;
      if (def) defs.push(def);
      const rule = typeof el.toFillRule === 'function' ? el.toFillRule() : null;
      if (rule) fill.push(rule);
    }

    const gradCfg = this.resolveGradientConfig();
    if (gradCfg) {
      const layout: 'vertical' | 'horizontal' =
        this._config.layout === 'horizontal' ||
        this.getAttribute('layout') === 'horizontal'
          ? 'horizontal'
          : 'vertical';
      const activeColors =
        gradCfg.colors ?? (theme ?? this.resolveTheme()).colors;
      const generated = generateGradientPalette(activeColors, {
        ...gradCfg,
        direction: gradCfg.direction ?? 'auto',
        layout,
        idPrefix: gradCfg.idPrefix ?? 'mc-auto-grad'
      });
      defs.push(...generated.defs);
      fill.push(...generated.fill);
    }

    return { defs, fill };
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

    const rawLabelOverflow =
      this._config.labelOverflow ??
      normalizeOverflowStrategy(this.getAttribute('label-overflow'));
    if (rawLabelOverflow !== undefined) {
      const ov = normalizeOverflowInput(rawLabelOverflow);
      if (Object.keys(ov).length > 0) {
        overrides.push({
          target: 'all',
          overflow: ov,
          ...(ov.maxWidth !== undefined ? { maxWidth: ov.maxWidth } : {}),
          ...(ov.maxChars !== undefined ? { maxChars: ov.maxChars } : {}),
          ...(ov.maxLines !== undefined ? { maxLines: ov.maxLines } : {}),
          ...(ov.ellipsis !== undefined ? { ellipsis: ov.ellipsis } : {}),
          ...(ov.maxRotation !== undefined
            ? { maxRotation: ov.maxRotation }
            : {}),
          ...(ov.enableTooltip !== undefined
            ? { enableTooltip: ov.enableTooltip }
            : {}),
          ...(ov.tooltip !== undefined ? { tooltip: ov.tooltip } : {})
        });
      }
    }

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

    const declarativeEls = Array.from(this.children).filter((el) => {
      const tag = el.tagName.toLowerCase();
      return tag === 'mc-label' || tag === 'mc-truncate';
    });

    for (const el of declarativeEls) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'mc-truncate') {
        const truncEl = el as MCTruncateElement;
        if (typeof truncEl.toStyleOverride === 'function') {
          overrides.push(truncEl.toStyleOverride());
        } else {
          const strat = normalizeOverflowStrategy(el.getAttribute('strategy'));
          overrides.push({
            target: (el.getAttribute('for') as any) || 'all',
            overflow: strat ? { strategy: strat } : undefined,
            maxWidth: el.hasAttribute('max-width')
              ? Number(el.getAttribute('max-width'))
              : undefined,
            maxChars: el.hasAttribute('max-chars')
              ? Number(el.getAttribute('max-chars'))
              : undefined,
            maxRotation: el.hasAttribute('max-rotation')
              ? Number(el.getAttribute('max-rotation'))
              : undefined,
            enableTooltip: el.hasAttribute('enable-tooltip')
              ? el.getAttribute('enable-tooltip') !== 'false'
              : undefined
          });
        }
        continue;
      }

      const labelEl = el as MCLabelElement;
      if (typeof labelEl.toStyleOverride === 'function') {
        overrides.push(labelEl.toStyleOverride());
      } else {
        overrides.push({
          target: (el.getAttribute('for') as any) || 'all',
          renderMode: (el.getAttribute('mode') as any) || undefined,
          maxWidth: el.hasAttribute('max-width')
            ? Number(el.getAttribute('max-width'))
            : undefined,
          maxChars: el.hasAttribute('max-chars')
            ? Number(el.getAttribute('max-chars'))
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
    const isInteractive = this.resolveIsInteractive();
    this._lastMargin = dims.margin;
    this.eventEngine.resetHoverState();
    if (isInteractive) {
      this.eventEngine.attach({
        host: this,
        svg,
        getChartType: () => this.chartType,
        getConfig: () => this._config,
        getMargin: () => this._lastMargin
      });
    } else {
      this.eventEngine.detach();
    }
    const theme = this.resolveTheme();
    const scaleConfig = this.resolveScaleConfig();
    const viewConfig = this.resolveViewConfig();
    const animationConfig = this.resolveAnimationConfig();
    const ariaConfig = this.resolveAriaConfig();
    const legendConfig = this.resolveLegendConfig();
    const labelOverrides = this.resolveLabelOverrides();

    const containerEl = this.shadowRoot.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    if (containerEl) {
      containerEl.classList.toggle('mc-chart-container--static', !isInteractive);
    }
    this.#setCustomState('static', !isInteractive);
    this.#syncInteractiveTooltips(isInteractive);
    this.#syncTooltipPointerTracking(isInteractive);

    this.labelEngine.setOverrides(labelOverrides);
    this.labelEngine.setCustomRenderer(this.labelRenderer);
    this.labelEngine.setTooltipHandlers(
      isInteractive
        ? {
            showTooltip: (content, clientX, clientY, overrideConfig) =>
              this.showTooltip(content, clientX, clientY, theme, overrideConfig),
            hideTooltip: () => this.hideTooltip(),
            isFocusable: ariaConfig.isFocusable
          }
        : undefined
    );

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
        (isInteractive
          ? `Interactive ${this.chartType} chart with accessible focusable items`
          : `Static ${this.chartType} chart visualization`);
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

    const defs = this.shadowRoot.querySelector('.mc-chart-defs');
    const isLoading = this.loading;
    const hasData = this.hasPlottableData(this._data);

    if (isLoading) {
      this.hideTooltip();
      this.hideLegendTooltip();
      if (controlsEl) controlsEl.hidden = true;
      if (this._data === null || !hasData) {
        rootGroup.innerHTML = '';
        if (defs) defs.innerHTML = '';
        this._decoratedAriaItems = [];
        if (ariaTableContainer) ariaTableContainer.innerHTML = '';
        this.#setCustomState('rendered', false);
      }
      this.#applyChartState('loading', theme);
      return;
    }

    if (this._data === null || !hasData) {
      this.hideTooltip();
      this.hideLegendTooltip();
      if (controlsEl) controlsEl.hidden = true;
      rootGroup.innerHTML = '';
      if (defs) defs.innerHTML = '';
      this._decoratedAriaItems = [];
      if (ariaTableContainer) ariaTableContainer.innerHTML = '';
      this.#setCustomState('rendered', false);
      this.#applyChartState('empty', theme);
      return;
    }

    rootGroup.innerHTML = '';
    this._decoratedAriaItems = [];
    if (defs) defs.innerHTML = '';

    if (controlsEl) {
      controlsEl.hidden = !(
        isInteractive &&
        viewConfig.enabled &&
        viewConfig.showControls
      );
    }

    this.#syncStateOverlay('ready', theme);

    const { defs: fillDefs, fill: fillRules } =
      this.resolvePatternDefsAndRules(theme);
    this.patternEngine.prepare(defs, fillDefs, fillRules);

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
      isInteractive,
      legendConfig,
      markers: [],
      thresholds: initialThresholdCtrl,
      colorScale,
      svg,
      rootGroup,
      layerGroup: rootGroup,
      d3: getChartD3(),
      renderLabel: (parent: SVGElement, descriptor: LabelDescriptor) =>
        this.labelEngine.renderLabel(parent, descriptor, theme),
      measureText: (text: string, options?: Partial<LabelDescriptor>) => {
        if (options?.type) {
          const { descriptor } = this.labelEngine.resolveDescriptor(
            {
              x: 0,
              y: 0,
              ...options,
              text,
              type: options.type
            },
            theme
          );
          return this.labelEngine.measure(descriptor.text, descriptor, theme);
        }
        return this.labelEngine.measure(text, options, theme);
      },
      decorateAriaItem: (element: SVGElement, item: AriaItemDescriptor) => {
        if (!isInteractive) {
          return element;
        }
        const decorated = this.ariaEngine.decorateItem(
          element,
          item,
          ariaConfig,
          this._config,
          {
            onItemFocus: (focusedItem, label, description, element) =>
              this.#handleAriaItemFocus(focusedItem, label, description, element),
            onItemBlur: () => this.#handleAriaItemBlur(),
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
      registerEventTarget: <TEventData = any>(
        element: Element,
        registration: ChartEventTargetRegistration<TEventData>
      ) =>
        isInteractive
          ? this.eventEngine.registerTarget(element, registration)
          : element,
      evaluateThresholds: initialThresholdCtrl.evaluate,
      showTooltip: (
        content: TooltipInput,
        clientX: number,
        clientY: number,
        overrideConfig?: TooltipConfig<any>
      ) => this.showTooltip(content, clientX, clientY, theme, overrideConfig),
      hideTooltip: () => this.hideTooltip(),
      showLegendTooltip: (
        content: TooltipInput<LegendItem>,
        clientX: number,
        clientY: number
      ) => this.showLegendTooltip(content, clientX, clientY, theme),
      hideLegendTooltip: () => this.hideLegendTooltip(),
      resolveFill: (matchCtx: FillMatchContext) =>
        this.patternEngine.resolveFill(matchCtx),
      resolveDefUrl: (raw: string | undefined, baseColor: string) =>
        this.patternEngine.resolveDefUrl(raw, baseColor),
      state: this._chartState
    };

    this.prepareContext(ctx);
    if (ctx.markers.length === 0 && this.resolveMarkersConfig().length > 0) {
      this.setupMarkersAndThresholds(ctx);
    }

    if (this.chartTitle) {
      const titleG = document.createElementNS(SVG_NS, 'g');
      titleG.setAttribute('class', 'mc-layer mc-layer--title');
      const renderedTitle = this.labelEngine.renderLabel(
        titleG,
        {
          id: 'chart-title',
          text: this.chartTitle,
          x: 0,
          y: -Math.max(12, dims.margin.top * 0.5),
          type: 'title',
          anchor: 'start',
          baseline: 'middle',
          maxWidth: Math.max(80, dims.innerWidth),
          fontSize: theme.fontSize + 3,
          fontWeight: 700,
          color: theme.textColor
        },
        theme
      );
      if (renderedTitle) {
        this.eventEngine.registerTarget(renderedTitle, {
          target: 'title',
          category: 'title',
          id: 'chart-title',
          data: {
            id: 'chart-title',
            text: this.chartTitle
          }
        });
      }
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
        isInteractive && ariaConfig.enabled && ariaConfig.includeDataTable
          ? this.ariaEngine.buildAccessibleDataTableHtml(
              effectiveTitle,
              this._decoratedAriaItems
            )
          : '';
    }

    this.#configureViewZoom(svg, viewportGroup, viewConfig, dims);
    this.#setCustomState('rendered', true);
    this.#commitChartState('ready');
  }

  #handleAriaItemFocus(
    item: AriaItemDescriptor,
    label: string,
    description?: string,
    element?: SVGElement
  ): void {
    if (!this.resolveIsInteractive()) return;
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

    if (element) {
      const anchor = item.anchor ?? resolveElementAnchor(element);
      const container = this.shadowRoot?.querySelector(
        '.mc-chart-container'
      ) as HTMLDivElement | null;
      const containerRect = container?.getBoundingClientRect();
      const clientX = anchor
        ? anchor.relative
          ? (containerRect?.left ?? 0) + anchor.left + anchor.width / 2
          : anchor.left + anchor.width / 2
        : (containerRect?.left ?? 0) + (containerRect?.width ?? 0) / 2;
      const clientY = anchor
        ? anchor.relative
          ? (containerRect?.top ?? 0) + anchor.top
          : anchor.top
        : (containerRect?.top ?? 0) + (containerRect?.height ?? 0) / 2;

      this.showTooltip(
        {
          title: item.category || item.label || item.seriesId || item.id,
          label:
            item.seriesId && item.category
              ? item.seriesId
              : item.source && item.target
              ? `${item.source} → ${item.target}`
              : item.label || 'Value',
          seriesId: item.seriesId,
          category: item.category,
          value: item.value,
          formattedValue:
            item.formattedValue ??
            (item.percentage !== undefined && item.value !== undefined
              ? `${item.value} (${item.percentage.toFixed(1)}%)`
              : item.value !== undefined
              ? String(item.value)
              : undefined),
          color: item.color,
          percentage: item.percentage,
          datum: item.datum,
          anchor,
          source: 'keyboard'
        },
        clientX,
        clientY,
        undefined,
        { position: 'item' }
      );
    }
  }

  #handleAriaItemBlur(): void {
    const tooltip = this.getTooltipElement();
    if (tooltip && tooltip.activeSource === 'keyboard') {
      this.hideTooltip();
    }
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

  /**
   * Resolves unified legend configuration by merging `chart.config.legend`
   * with any declarative `<mc-legend>` child placed inside the chart.
   */
  public resolveLegendConfig(): ResolvedLegendConfig {
    const raw = this._config.legend;
    const declLegend = this.querySelector(
      ':scope > mc-legend'
    ) as MCLegendElement | null;

    if (!declLegend || typeof declLegend.toLegendConfig !== 'function') {
      return createDefaultLegendConfig(raw, 'bottom');
    }

    const declCfg = declLegend.toLegendConfig();
    const baseObj: LegendConfig =
      typeof raw === 'boolean' ? { enabled: raw } : { ...(raw ?? {}) };

    const mergedTooltip =
      declCfg.tooltip !== undefined
        ? typeof declCfg.tooltip === 'object' &&
          typeof baseObj.tooltip === 'object'
          ? { ...baseObj.tooltip, ...declCfg.tooltip }
          : declCfg.tooltip
        : baseObj.tooltip;

    const mergedPadding =
      typeof declCfg.padding === 'object' && typeof baseObj.padding === 'object'
        ? { ...baseObj.padding, ...declCfg.padding }
        : declCfg.padding ?? baseObj.padding;

    return createDefaultLegendConfig(
      {
        ...baseObj,
        ...declCfg,
        padding: mergedPadding,
        tooltip: mergedTooltip
      },
      'bottom'
    );
  }

  /**
   * Returns the dedicated singleton legend `<mc-tooltip>` instance owned by this
   * chart (separate from the chart data item tooltip), or `null` when static (`isInteractive = false`).
   */
  public getLegendTooltipElement(): MCTooltipElement | null {
    if (!this.resolveIsInteractive()) return null;
    this.#syncInteractiveTooltips(true);
    return (
      (this.shadowRoot?.querySelector(
        '.mc-legend-tooltip'
      ) as MCTooltipElement | null) ?? null
    );
  }

  public showLegendTooltip(
    content: TooltipInput<LegendItem>,
    clientX: number,
    clientY: number,
    theme?: ChartTheme
  ): void {
    if (!this.resolveIsInteractive()) return;
    const tooltip = this.getLegendTooltipElement();
    const container = this.shadowRoot?.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    if (!tooltip || !container) return;

    const legendConfig = this.resolveLegendConfig();
    if (!legendConfig.enableTooltip || legendConfig.tooltip.enabled === false) {
      this.hideLegendTooltip();
      return;
    }

    const payload: TooltipPayload<LegendItem> =
      typeof content === 'string'
        ? {
            chartType: this.chartType,
            defaultHtml: content,
            data: this._data,
            clientX,
            clientY
          }
        : {
            ...content,
            chartType: this.chartType,
            data: this._data,
            clientX,
            clientY
          };

    const activeTheme = theme ?? this.resolveTheme();
    const rect = container.getBoundingClientRect();

    if (typeof tooltip.show === 'function') {
      const shown = tooltip.show(payload, activeTheme, rect, {
        offsetX: 10,
        offsetY: -36,
        ...legendConfig.tooltip
      });
      if (shown) {
        this.dispatchEvent(
          new CustomEvent('mc-legend-tooltip-show', {
            bubbles: true,
            composed: true,
            detail: payload
          })
        );
      }
    }
  }

  public hideLegendTooltip(): void {
    const tooltip = this.getLegendTooltipElement();
    if (tooltip) {
      const wasVisible = !tooltip.hidden;
      if (typeof tooltip.hide === 'function') {
        tooltip.hide();
      } else {
        tooltip.hidden = true;
      }
      if (wasVisible) {
        this.dispatchEvent(
          new CustomEvent('mc-legend-tooltip-hide', {
            bubbles: true,
            composed: true
          })
        );
      }
    }
  }

  /**
   * Resolves active unified tooltip configuration by merging `chart.config.tooltip`
   * with any declarative `<mc-tooltip>` child placed inside the chart.
   */
  public resolveTooltipConfig(): TooltipConfig {
    const raw = this._config.tooltip;
    let base: TooltipConfig =
      typeof raw === 'boolean' ? { enabled: raw } : { ...(raw ?? {}) };

    const attrPosition = normalizeTooltipPosition(
      this.getAttribute('tooltip-position')
    );
    const shorthandPosition = normalizeTooltipPosition(
      this._config.tooltipPosition
    );
    const configPosition = normalizeTooltipPosition(base.position);

    const declTooltip = this.querySelector(
      ':scope > mc-tooltip'
    ) as MCTooltipElement | null;
    if (declTooltip && typeof declTooltip.toTooltipConfig === 'function') {
      base = {
        ...base,
        ...declTooltip.toTooltipConfig()
      };
    }

    const declPosition = normalizeTooltipPosition(base.position);
    base.position =
      declPosition ??
      configPosition ??
      shorthandPosition ??
      attrPosition ??
      this.getDefaultTooltipPosition();

    if (base.enabled === undefined) {
      base.enabled = true;
    }
    return base;
  }

  /**
   * Returns the single internal `<mc-tooltip>` Web Component instance owned by
   * this chart (one per chart for performance), or `null` when static (`isInteractive = false`).
   */
  public getTooltipElement(): MCTooltipElement | null {
    if (!this.resolveIsInteractive()) return null;
    this.#syncInteractiveTooltips(true);
    return (
      (this.shadowRoot?.querySelector('.mc-tooltip') as MCTooltipElement | null) ??
      null
    );
  }

  public showTooltip(
    content: TooltipInput,
    clientX: number,
    clientY: number,
    theme?: ChartTheme,
    overrideConfig?: TooltipConfig<any>
  ): void {
    if (!this.resolveIsInteractive()) return;
    const tooltip = this.getTooltipElement();
    const container = this.shadowRoot?.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    if (!tooltip || !container) return;

    const baseConfig = this.resolveTooltipConfig();
    const tooltipConfig: TooltipConfig<any> = overrideConfig
      ? { ...baseConfig, ...overrideConfig }
      : baseConfig;
    if (tooltipConfig.enabled === false) {
      this.hideTooltip();
      return;
    }

    const payload: TooltipPayload =
      typeof content === 'string'
        ? {
            chartType: this.chartType,
            defaultHtml: content,
            data: this._data,
            clientX,
            clientY
          }
        : {
            ...content,
            chartType: this.chartType,
            data: this._data,
            clientX,
            clientY
          };

    const activeTheme = theme ?? this.resolveTheme();
    const rect = container.getBoundingClientRect();

    if (typeof tooltip.show === 'function') {
      const shown = tooltip.show(payload, activeTheme, rect, tooltipConfig);
      if (shown) {
        this.dispatchEvent(
          new CustomEvent('mc-tooltip-show', {
            bubbles: true,
            composed: true,
            detail: payload
          })
        );
      }
    }
  }

  public hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    if (tooltip) {
      const wasVisible = !tooltip.hidden;
      if (typeof tooltip.hide === 'function') {
        tooltip.hide();
      } else {
        tooltip.hidden = true;
      }
      if (wasVisible) {
        this.dispatchEvent(
          new CustomEvent('mc-tooltip-hide', {
            bubbles: true,
            composed: true
          })
        );
      }
    }
  }

  #configureViewZoom(
    svg: SVGSVGElement,
    viewportGroup: SVGGElement,
    viewConfig: ViewConfig,
    dims: ChartDimensions
  ): void {
    if (this.#viewController) {
      this.#viewController.destroy();
      this.#viewController = null;
    }

    if (!viewConfig.enabled) {
      this.#viewTransform = { k: 1, x: 0, y: 0 };
      viewportGroup.removeAttribute('transform');
      this.#setCustomState('zoomed', false);
      return;
    }

    const minK = viewConfig.zoomable ? viewConfig.minZoom : 1;
    const maxK = viewConfig.zoomable ? viewConfig.maxZoom : 1;

    const clamp = (value: number, lo: number, hi: number): number =>
      Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), value));

    const applyTransform = (nextK: number, nextX: number, nextY: number): void => {
      const k = clamp(nextK, minK, maxK);
      const rawX = viewConfig.direction === 'y' ? 0 : nextX;
      const rawY = viewConfig.direction === 'x' ? 0 : nextY;
      const tx =
        viewConfig.direction === 'y'
          ? 0
          : clamp(rawX, dims.width * (1 - 1.5 * k), dims.width * 0.5 * k);
      const ty =
        viewConfig.direction === 'x'
          ? 0
          : clamp(rawY, dims.height * (1 - 1.5 * k), dims.height * 0.5 * k);

      this.#viewTransform = { k, x: tx, y: ty };
      viewportGroup.setAttribute(
        'transform',
        `translate(${tx}, ${ty}) scale(${k})`
      );
      this.#setCustomState('zoomed', k !== 1 || tx !== 0 || ty !== 0);
      this.dispatchEvent(
        new CustomEvent('mc-zoom', {
          bubbles: true,
          composed: true,
          detail: { k, x: tx, y: ty }
        })
      );
    };

    const scaleBy = (
      factor: number,
      cx = dims.width / 2,
      cy = dims.height / 2
    ): void => {
      const prev = this.#viewTransform;
      const nextK = clamp(prev.k * factor, minK, maxK);
      const ratio = nextK / prev.k;
      const nextX = cx - (cx - prev.x) * ratio;
      const nextY = cy - (cy - prev.y) * ratio;
      applyTransform(nextK, nextX, nextY);
    };

    const onWheel = (e: WheelEvent): void => {
      if (!viewConfig.zoomable) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cx = rect.width > 0 ? e.clientX - rect.left : dims.width / 2;
      const cy = rect.height > 0 ? e.clientY - rect.top : dims.height / 2;
      const deltaScale = e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002;
      scaleBy(Math.pow(2, -e.deltaY * deltaScale), cx, cy);
    };

    let pointerDown = false;
    let dragging = false;
    let capturedPointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    const onPointerDown = (e: PointerEvent): void => {
      if (!viewConfig.pannable || e.button !== 0) return;
      pointerDown = true;
      dragging = false;
      capturedPointerId = null;
      startX = e.clientX;
      startY = e.clientY;
      origX = this.#viewTransform.x;
      origY = this.#viewTransform.y;
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (!pointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 4) return;
        dragging = true;
        capturedPointerId = e.pointerId;
        svg.setPointerCapture?.(e.pointerId);
      }
      applyTransform(
        this.#viewTransform.k,
        origX + dx,
        origY + dy
      );
    };

    const onPointerEnd = (_e: PointerEvent): void => {
      if (!pointerDown) return;
      pointerDown = false;
      dragging = false;
      if (capturedPointerId !== null) {
        svg.releasePointerCapture?.(capturedPointerId);
        capturedPointerId = null;
      }
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerEnd);
    svg.addEventListener('pointercancel', onPointerEnd);

    this.#viewController = {
      scaleBy: (factor: number) => scaleBy(factor),
      reset: () => applyTransform(1, 0, 0),
      destroy: () => {
        svg.removeEventListener('wheel', onWheel);
        svg.removeEventListener('pointerdown', onPointerDown);
        svg.removeEventListener('pointermove', onPointerMove);
        svg.removeEventListener('pointerup', onPointerEnd);
        svg.removeEventListener('pointercancel', onPointerEnd);
      }
    };

    if (
      viewConfig.initialZoom !== 1 ||
      viewConfig.initialPanX !== 0 ||
      viewConfig.initialPanY !== 0
    ) {
      applyTransform(
        viewConfig.initialZoom,
        viewConfig.initialPanX,
        viewConfig.initialPanY
      );
    } else {
      this.#viewTransform = { k: 1, x: 0, y: 0 };
      viewportGroup.removeAttribute('transform');
      this.#setCustomState('zoomed', false);
    }
  }

  #syncInteractiveTooltips(isInteractive: boolean): void {
    const container = this.shadowRoot?.querySelector(
      '.mc-chart-container'
    ) as HTMLDivElement | null;
    if (!container) return;

    const existingTip = container.querySelector(
      ':scope > mc-tooltip.mc-tooltip'
    );
    const existingLegendTip = container.querySelector(
      ':scope > mc-tooltip.mc-legend-tooltip'
    );

    if (!isInteractive) {
      existingTip?.remove();
      existingLegendTip?.remove();
      return;
    }

    const insertBefore = container.querySelector('.mc-aria-live');
    if (!existingTip) {
      const tip = document.createElement('mc-tooltip');
      tip.className = 'mc-tooltip';
      tip.setAttribute('part', 'tooltip-host');
      tip.setAttribute(
        'exportparts',
        'tooltip, container: tooltip-container, header: tooltip-header, body: tooltip-body, row: tooltip-row, swatch: tooltip-swatch, label: tooltip-label, value: tooltip-value, badge: tooltip-badge'
      );
      tip.hidden = true;
      container.insertBefore(tip, insertBefore);
    }

    if (!existingLegendTip) {
      const legendTip = document.createElement('mc-tooltip');
      legendTip.className = 'mc-legend-tooltip';
      legendTip.setAttribute('part', 'legend-tooltip-host');
      legendTip.setAttribute(
        'exportparts',
        'tooltip: legend-tooltip, container: legend-tooltip-container, header: legend-tooltip-header, body: legend-tooltip-body, row: legend-tooltip-row, swatch: legend-tooltip-swatch, label: legend-tooltip-label, value: legend-tooltip-value, badge: legend-tooltip-badge'
      );
      legendTip.hidden = true;
      container.insertBefore(legendTip, insertBefore);
    }
  }

  #syncTooltipPointerTracking(isInteractive: boolean): void {
    const svg = this.shadowRoot?.querySelector(
      '.mc-chart-svg'
    ) as SVGSVGElement | null;
    if (!svg) return;

    if (!isInteractive) {
      if (this.#tooltipMoveHandler) {
        svg.removeEventListener('mousemove', this.#tooltipMoveHandler);
        this.#tooltipMoveHandler = null;
      }
      return;
    }

    if (this.#tooltipMoveHandler) return;
    this.#tooltipMoveHandler = (e: MouseEvent) => {
      const tooltip = this.getTooltipElement();
      if (!tooltip || tooltip.hidden) return;
      if (
        tooltip.activePositionMode !== 'follow' ||
        tooltip.activeSource === 'keyboard'
      ) {
        return;
      }
      const container = this.shadowRoot?.querySelector(
        '.mc-chart-container'
      ) as HTMLDivElement | null;
      if (!container || typeof tooltip.moveToPointer !== 'function') return;
      tooltip.moveToPointer(
        e.clientX,
        e.clientY,
        container.getBoundingClientRect()
      );
    };
    svg.addEventListener('mousemove', this.#tooltipMoveHandler);
  }

  #setupControlsListeners(): void {
    const controls = this.shadowRoot?.querySelector('.mc-view-controls');
    if (!controls || (controls as any).__mcBound) return;
    (controls as any).__mcBound = true;

    controls.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest(
        'button[data-zoom]'
      ) as HTMLButtonElement | null;
      if (!btn || !this.#viewController) return;

      const action = btn.getAttribute('data-zoom');
      if (action === 'in') {
        this.#viewController.scaleBy(1.25);
      } else if (action === 'out') {
        this.#viewController.scaleBy(0.8);
      } else if (action === 'reset') {
        this.#viewController.reset();
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

  #setupStateSlotListeners(): void {
    const stateEl = this.getStateElement();
    if (!stateEl || (stateEl as any).__mcStateSlotsBound) return;
    (stateEl as any).__mcStateSlotsBound = true;

    const slots = stateEl.querySelectorAll('slot[name="loading"], slot[name="empty"]');
    slots.forEach((slot) => {
      slot.addEventListener('slotchange', () => {
        if (typeof stateEl.sync === 'function') {
          stateEl.sync();
        }
      });
    });
  }

  #syncAriaBusy(): void {
    const busy = this.loading || this.#isStreamingLayers;
    if (busy) {
      if (this.getAttribute('aria-busy') !== 'true') {
        this.setAttribute('aria-busy', 'true');
      }
    } else if (this.hasAttribute('aria-busy')) {
      this.removeAttribute('aria-busy');
    }
    if (this.#internals) {
      this.#internals.ariaBusy = busy ? 'true' : 'false';
    }
  }

  #syncStateOverlay(nextState: ChartStateKind, theme: ChartTheme): void {
    this.#setCustomState('loading', nextState === 'loading');
    this.#setCustomState('empty', nextState === 'empty');
    this.#syncAriaBusy();

    const stateEl = this.getStateElement();
    if (!stateEl) return;

    const isDark = theme.mode === 'dark';
    stateEl.style.setProperty(
      '--_mc-state-bg',
      isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.84)'
    );
    stateEl.style.setProperty(
      '--_mc-state-color',
      theme.mutedTextColor || (isDark ? '#cbd5e1' : '#475569')
    );
    stateEl.style.setProperty(
      '--_mc-state-spinner-color',
      theme.colors?.[0] || '#6366f1'
    );

    if (nextState === 'ready') {
      stateEl.hidden = true;
      return;
    }

    stateEl.loadingText = this.loadingText;
    stateEl.emptyText = this.emptyText;
    stateEl.state = nextState;
    stateEl.hidden = false;
    if (typeof stateEl.sync === 'function') {
      stateEl.sync();
    }
  }

  #commitChartState(nextState: ChartStateKind): void {
    if (this.#currentChartState === nextState) return;
    const previousState = this.#currentChartState;
    this.#currentChartState = nextState;
    const detail: ChartStateChangeDetail = {
      state: nextState,
      previousState,
      chartType: this.chartType
    };
    this.dispatchEvent(
      new CustomEvent<ChartStateChangeDetail>('mc-state-change', {
        bubbles: true,
        composed: true,
        detail
      })
    );
  }

  #applyChartState(nextState: ChartStateKind, theme: ChartTheme): void {
    this.#syncStateOverlay(nextState, theme);
    this.#commitChartState(nextState);
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
