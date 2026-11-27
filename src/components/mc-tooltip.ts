import { HTMLElementBase } from '../core/dom';
import { isChartFeatureEnabled } from '../core/features';
import { createChartI18n } from '../core/i18n';
import type { ChartI18n } from '../core/i18n';
import type {
  ChartTheme,
  TooltipConfig,
  TooltipPayload,
  TooltipPositionMode,
  TooltipRenderer
} from '../core/types';
import { getTooltipViewFactory, loadTooltipView } from './tooltip-loader';
import type { TooltipViewController } from './tooltip-view';

/**
 * Normalizes a tooltip position mode string (`'item' | 'anchor'` -> `'item'`,
 * `'follow' | 'pointer'` -> `'follow'`).
 */
export function normalizeTooltipPosition(
  raw?: string | null
): TooltipPositionMode | undefined {
  if (!raw) return undefined;
  const lower = raw.trim().toLowerCase();
  if (lower === 'item' || lower === 'anchor') return 'item';
  if (lower === 'follow' || lower === 'pointer') return 'follow';
  return undefined;
}

interface PendingTooltipShow {
  payload: TooltipPayload;
  resolvedMode: TooltipPositionMode;
  theme: ChartTheme;
  containerRect: DOMRect;
  config: TooltipConfig;
  i18n: ChartI18n;
}

/**
 * `<mc-tooltip>` Unified Tooltip Web Component.
 *
 * Dual role:
 * 1. **Internal singleton renderer** inside `MCBaseChart`'s Shadow DOM (strictly
 *    one `<mc-tooltip>` per chart for optimal performance, reused in-place on
 *    every pointer move, with full CSS `::part()` hooks re-exported via `exportparts`).
 * 2. **Declarative light-DOM configuration element** inside any `<mc-*-chart>`
 *    (supporting `enabled`, `offset-x`, `offset-y`, `class-name`, `.formatter`,
 *    `.renderer`, and `<template>` interpolation).
 */
export class MCTooltipElement extends HTMLElementBase {
  static observedAttributes = [
    'enabled',
    'position',
    'anchor-gap',
    'offset-x',
    'offset-y',
    'class-name'
  ];

  #shadow: ShadowRoot;
  #view: TooltipViewController | undefined;
  #viewRequested = false;
  #pendingShow: PendingTooltipShow | undefined;
  #i18n?: ChartI18n;
  #formatter?: (payload: TooltipPayload) => string | null | undefined;
  #renderer?: TooltipRenderer;
  #lastPayload: TooltipPayload | null = null;
  #configOverride?: TooltipConfig;
  #activePositionMode: TooltipPositionMode = 'follow';
  #activeSource: 'pointer' | 'keyboard' = 'pointer';
  #activeConfig: TooltipConfig = {};
  #appliedExtraClasses: string[] = [];

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // When placed as a declarative light-DOM child inside any <mc-*-chart>,
    // hide visually and act as a configuration provider for the chart's
    // internal singleton <mc-tooltip>.
    if (
      this.parentElement &&
      this.parentElement.tagName.toLowerCase().startsWith('mc-') &&
      !this.hasAttribute('part')
    ) {
      this.setAttribute('data-config-only', '');
      this.#notifyParentChart();
    } else if (!this.#lastPayload && !this.hasAttribute('hidden')) {
      this.hidden = true;
    }
    if (this.#pendingShow && !this.hidden) {
      this.sync();
    }
  }

  connectedMoveCallback(): void {
    this.#notifyParentChart();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyParentChart();
    }
  }

  get formatter():
    | ((payload: TooltipPayload) => string | null | undefined)
    | undefined {
    return this.#formatter;
  }
  set formatter(
    fn: ((payload: TooltipPayload) => string | null | undefined) | undefined
  ) {
    this.#formatter = fn;
    this.#notifyParentChart();
  }

  get renderer(): TooltipRenderer | undefined {
    return this.#renderer;
  }
  set renderer(fn: TooltipRenderer | undefined) {
    this.#renderer = fn;
    this.#notifyParentChart();
  }

  get config(): TooltipConfig | undefined {
    return this.#configOverride;
  }
  set config(val: TooltipConfig | undefined) {
    this.#configOverride = val;
    this.#notifyParentChart();
  }

  get position(): TooltipPositionMode | undefined {
    return (
      normalizeTooltipPosition(this.getAttribute('position')) ??
      normalizeTooltipPosition(this.#configOverride?.position)
    );
  }
  set position(val: TooltipPositionMode | undefined) {
    if (val) {
      this.setAttribute('position', val);
    } else {
      this.removeAttribute('position');
    }
  }

  get anchorGap(): number | undefined {
    const attr = this.getAttribute('anchor-gap');
    if (attr !== null && !Number.isNaN(Number(attr))) return Number(attr);
    return this.#configOverride?.anchorGap;
  }
  set anchorGap(val: number | undefined) {
    if (val !== undefined && Number.isFinite(val)) {
      this.setAttribute('anchor-gap', String(val));
    } else {
      this.removeAttribute('anchor-gap');
    }
  }

  get activePositionMode(): TooltipPositionMode {
    return this.#activePositionMode;
  }

  get activeSource(): 'pointer' | 'keyboard' {
    return this.#activeSource;
  }

  get lastPayload(): TooltipPayload | null {
    return this.#lastPayload;
  }

  /** Returns the currently rendered HTML inside the tooltip surface (useful for inspection & tests). */
  get renderedHtml(): string {
    return this.#shadow.firstElementChild?.innerHTML ?? '';
  }

  public getTemplateHtml(): string | undefined {
    const tpl = this.querySelector('template');
    return tpl ? tpl.innerHTML.trim() : undefined;
  }

  public toTooltipConfig(): TooltipConfig {
    const enabledAttr = this.getAttribute('enabled');
    const positionAttr = normalizeTooltipPosition(this.getAttribute('position'));
    const anchorGapAttr = this.getAttribute('anchor-gap');
    const offsetXAttr = this.getAttribute('offset-x');
    const offsetYAttr = this.getAttribute('offset-y');
    const classNameAttr = this.getAttribute('class-name') || undefined;

    return {
      ...(this.#configOverride ?? {}),
      ...(enabledAttr !== null ? { enabled: enabledAttr !== 'false' } : {}),
      ...(positionAttr ? { position: positionAttr } : {}),
      ...(anchorGapAttr !== null && !Number.isNaN(Number(anchorGapAttr))
        ? { anchorGap: Number(anchorGapAttr) }
        : {}),
      ...(offsetXAttr !== null && !Number.isNaN(Number(offsetXAttr))
        ? { offsetX: Number(offsetXAttr) }
        : {}),
      ...(offsetYAttr !== null && !Number.isNaN(Number(offsetYAttr))
        ? { offsetY: Number(offsetYAttr) }
        : {}),
      ...(classNameAttr ? { className: classNameAttr } : {}),
      ...(this.#formatter ? { formatter: this.#formatter } : {}),
      ...(this.#renderer ? { renderer: this.#renderer } : {}),
      ...(this.getTemplateHtml() ? { templateHtml: this.getTemplateHtml() } : {})
    };
  }

  /**
   * Builds the default structured tooltip body DOM (using CSS `part` attributes
   * on every region so clients can style any piece via `::part()`).
   */
  public buildDefaultContent(payload: TooltipPayload): HTMLElement {
    const i18n = this.#i18n ?? createChartI18n();
    const view = this.#ensureView();
    if (view) {
      return view.buildDefaultContent(payload, i18n);
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'mc-tooltip-default-content';
    return wrapper;
  }

  /**
   * Updates this singleton `<mc-tooltip>` in-place with structured data,
   * theme colors, custom `renderer` / `formatter` / `<template>`, and clamped position.
   */
  public show(
    payload: TooltipPayload,
    theme: ChartTheme,
    containerRect: DOMRect,
    config: TooltipConfig = {},
    i18n: ChartI18n = createChartI18n()
  ): boolean {
    this.#i18n = i18n;
    this.lang = i18n.locale;
    this.dir = i18n.direction;
    if (
      config.enabled === false ||
      this.hasAttribute('data-config-only') ||
      (this.#isChartOwned() && !isChartFeatureEnabled('tooltip'))
    ) {
      this.hide();
      return false;
    }

    const source = payload.source ?? 'pointer';
    const requestedMode =
      source === 'keyboard'
        ? 'item'
        : normalizeTooltipPosition(config.position) ??
          payload.positionMode ??
          'follow';
    const resolvedMode: TooltipPositionMode =
      requestedMode === 'item' && payload.anchor ? 'item' : 'follow';

    payload.positionMode = resolvedMode;
    payload.source = source;
    this.#lastPayload = payload;
    this.#activePositionMode = resolvedMode;
    this.#activeSource = source;
    this.#activeConfig = config;
    this.setAttribute('data-chart-type', payload.chartType);
    this.setAttribute('data-position-mode', resolvedMode);
    this.setAttribute('data-trigger-source', source);
    if (payload.target) {
      this.setAttribute('data-tooltip-target', payload.target);
    }

    if (this.#appliedExtraClasses.length > 0) {
      this.classList.remove(...this.#appliedExtraClasses);
      this.#appliedExtraClasses = [];
    }
    if (config.className) {
      const nextClasses = config.className.split(/\s+/).filter(Boolean);
      if (nextClasses.length > 0) {
        this.classList.add(...nextClasses);
        this.#appliedExtraClasses = nextClasses;
      }
    }

    // Apply active chart theme via internal CSS custom properties so client ::part() rules still win cleanly
    this.style.setProperty('--_mc-tooltip-bg', theme.tooltipBackground);
    this.style.setProperty('--_mc-tooltip-color', theme.tooltipTextColor);
    this.style.setProperty('--_mc-tooltip-border', theme.tooltipBorderColor);

    const view = this.#ensureView();
    if (view) {
      this.#pendingShow = undefined;
      return view.show(
        payload,
        resolvedMode,
        theme,
        containerRect,
        config,
        i18n,
        this.#renderer,
        this.#formatter
      );
    }

    const customRenderer = config.renderer ?? this.#renderer;
    const customFormatter = config.formatter ?? this.#formatter;
    if (!customRenderer && customFormatter) {
      const formatted = customFormatter(payload);
      if (formatted === null) {
        this.hide();
        return false;
      }
    }

    this.#pendingShow = {
      payload,
      resolvedMode,
      theme,
      containerRect,
      config,
      i18n
    };
    this.hidden = false;
    this.sync();
    return true;
  }

  /** Synchronizes the tooltip surface once its lazy renderer is available. */
  public sync(): void {
    const view = this.#ensureView();
    if (view) {
      if (this.#pendingShow && !this.hidden) {
        const pending = this.#pendingShow;
        this.#pendingShow = undefined;
        view.show(
          pending.payload,
          pending.resolvedMode,
          pending.theme,
          pending.containerRect,
          pending.config,
          pending.i18n,
          this.#renderer,
          this.#formatter
        );
      }
      return;
    }
    if (!this.#shouldMountView() || this.#viewRequested) return;

    this.#viewRequested = true;
    // Side-effect imports can upgrade charts before the caller passes bootstrap options.
    setTimeout(() => {
      if (!this.#shouldMountView()) {
        this.#viewRequested = false;
        return;
      }
      void Promise.resolve(loadTooltipView())
        .then(() => {
          this.#viewRequested = false;
          if (this.#shouldMountView()) {
            this.sync();
          }
        })
        .catch(() => {
          this.#viewRequested = false;
        });
    }, 0);
  }

  /**
   * Fast-path pointer tracking update: repositions an already-visible tooltip
   * in `'follow'` mode without rebuilding DOM or re-firing events.
   */
  public moveToPointer(
    clientX: number,
    clientY: number,
    containerRect: DOMRect
  ): void {
    if (
      this.hidden ||
      this.#activePositionMode !== 'follow' ||
      this.#activeSource === 'keyboard' ||
      !this.#lastPayload
    ) {
      return;
    }
    this.#lastPayload.clientX = clientX;
    this.#lastPayload.clientY = clientY;
    if (this.#pendingShow) {
      this.#pendingShow.containerRect = containerRect;
    }
    this.#view?.moveToPointer(
      this.#lastPayload,
      containerRect,
      this.#activeConfig
    );
  }

  public hide(): void {
    this.#pendingShow = undefined;
    this.hidden = true;
    this.#activeSource = 'pointer';
  }

  #isChartOwned(): boolean {
    return (
      this.classList.contains('mc-tooltip') ||
      this.classList.contains('mc-legend-tooltip')
    );
  }

  #ensureView(): TooltipViewController | undefined {
    if (this.#view) return this.#view;
    if (this.hasAttribute('data-config-only')) return undefined;
    if (this.#isChartOwned() && !isChartFeatureEnabled('tooltip')) {
      return undefined;
    }
    const createView = getTooltipViewFactory();
    if (!createView) return undefined;
    this.#view = createView(this, this.#shadow);
    return this.#view;
  }

  #shouldMountView(): boolean {
    return (
      this.isConnected &&
      !this.hidden &&
      !this.hasAttribute('data-config-only') &&
      this.#pendingShow !== undefined &&
      (!this.#isChartOwned() || isChartFeatureEnabled('tooltip'))
    );
  }

  #notifyParentChart(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-tooltip', element: this }
      })
    );
  }
}
