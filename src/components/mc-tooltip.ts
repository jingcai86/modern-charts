import { HTMLElementBase, lazyTemplate } from '../core/dom';
import { createChartI18n } from '../core/i18n';
import type { ChartI18n } from '../core/i18n';
import { replaceTemplatePlaceholders } from '../core/template';
import type {
  ChartTheme,
  TooltipAnchorRect,
  TooltipConfig,
  TooltipPayload,
  TooltipPositionMode,
  TooltipRenderer
} from '../core/types';

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

const getTooltipTemplate = lazyTemplate(`
  <div class="mc-tooltip-surface" part="tooltip container">
    <div class="mc-tooltip-header" part="header" hidden></div>
    <div class="mc-tooltip-body" part="body"></div>
  </div>
  <slot style="display:none"></slot>
`);

let sharedTooltipSheet: CSSStyleSheet | null = null;
function getTooltipStyleSheet(): CSSStyleSheet | null {
  if (sharedTooltipSheet) return sharedTooltipSheet;
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    sharedTooltipSheet = new CSSStyleSheet();
    sharedTooltipSheet.replaceSync(`
      :host {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 20;
        display: block;
        max-width: 280px;
        will-change: transform;
      }

      :host([hidden]),
      :host([data-config-only]) {
        display: none;
      }

      .mc-tooltip-surface {
        background: var(--_mc-tooltip-bg, rgba(15, 23, 42, 0.95));
        color: var(--_mc-tooltip-color, #f8fafc);
        border: 1px solid var(--_mc-tooltip-border, #334155);
        border-radius: 8px;
        padding: 8px 11px;
        font-size: 12px;
        line-height: 1.45;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(8px);
        box-sizing: border-box;
      }

      .mc-tooltip-header {
        font-weight: 700;
        margin-bottom: 4px;
        word-break: break-word;
      }

      .mc-tooltip-header[hidden] {
        display: none;
      }

      .mc-tooltip-header.mc-tooltip-header--solo {
        margin-bottom: 0;
        font-weight: 600;
      }

      .mc-tooltip-body {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .mc-tooltip-body[hidden] {
        display: none;
      }

      .mc-tooltip-row {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: space-between;
      }

      .mc-tooltip-row-left {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .mc-tooltip-swatch {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        flex-shrink: 0;
        display: inline-block;
      }

      .mc-tooltip-label {
        opacity: 0.88;
      }

      .mc-tooltip-value {
        font-weight: 700;
        margin-inline-start: 6px;
        font-variant-numeric: tabular-nums;
      }

      .mc-tooltip-badge {
        margin-top: 3px;
        font-size: 11px;
        font-weight: 600;
        color: #fda4af;
      }
    `);
  }
  return sharedTooltipSheet;
}

function formatValue(value: unknown, i18n: ChartI18n): string {
  return typeof value === 'number'
    ? i18n.formatNumber(value, { useGrouping: false })
    : String(value ?? '');
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveTemplateValue(payload: TooltipPayload, key: string, i18n: ChartI18n): string {
  if (key === 'chartType') return String(payload.chartType ?? '');
  if (key === 'title') return String(payload.title ?? '');
  if (key === 'label') return String(payload.label ?? '');
  if (key === 'seriesId') return String(payload.seriesId ?? '');
  if (key === 'category') return String(payload.category ?? '');
  if (key === 'value') return String(payload.value ?? '');
  if (key === 'formattedValue')
    return payload.formattedValue ?? formatValue(payload.value, i18n);
  if (key === 'color') return String(payload.color ?? '');
  if (key === 'percentage')
    return payload.percentage !== undefined
      ? i18n.formatPercent(payload.percentage / 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : '';
  if (key === 'badge') return String(payload.badge ?? '');
  if (key.startsWith('datum.') && payload.datum && typeof payload.datum === 'object') {
    const field = key.slice(6);
    if (
      field !== '__proto__' &&
      field !== 'constructor' &&
      field !== 'prototype' &&
      Object.prototype.hasOwnProperty.call(payload.datum, field)
    ) {
      return String((payload.datum as Record<string, unknown>)[field] ?? '');
    }
  }
  return '';
}

function interpolateTooltipTemplate(
  template: string,
  payload: TooltipPayload,
  i18n: ChartI18n
): string {
  return replaceTemplatePlaceholders(template, (key) =>
    escapeHtml(resolveTemplateValue(payload, key, i18n))
  );
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
    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getTooltipStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(getTooltipTemplate().content.cloneNode(true));
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
    const surface = this.shadowRoot?.querySelector('.mc-tooltip-surface');
    return surface ? surface.innerHTML : '';
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
    const wrapper = document.createElement('div');
    wrapper.className = 'mc-tooltip-default-content';
    const i18n = this.#i18n ?? createChartI18n();

    if (payload.items && payload.items.length > 0) {
      for (const item of payload.items) {
        const row = document.createElement('div');
        row.className = 'mc-tooltip-row';
        row.setAttribute('part', 'row');

        const left = document.createElement('span');
        left.className = 'mc-tooltip-row-left';

        if (item.color) {
          const swatch = document.createElement('span');
          swatch.className = 'mc-tooltip-swatch';
          swatch.setAttribute('part', 'swatch');
          swatch.style.background = item.color;
          left.appendChild(swatch);
        }

        const lbl = document.createElement('span');
        lbl.className = 'mc-tooltip-label';
        lbl.setAttribute('part', 'label');
        lbl.textContent = `${item.label}:`;
        left.appendChild(lbl);

        const val = document.createElement('strong');
        val.className = 'mc-tooltip-value';
        val.setAttribute('part', 'value');
        const valText =
          item.formattedValue !== undefined
            ? item.formattedValue
            : formatValue(item.value, i18n);
        val.textContent = item.badge ? `${valText} ${item.badge}` : valText;

        row.append(left, val);
        wrapper.appendChild(row);
      }
    } else if (
      payload.label !== undefined ||
      payload.value !== undefined ||
      payload.formattedValue !== undefined
    ) {
      const row = document.createElement('div');
      row.className = 'mc-tooltip-row';
      row.setAttribute('part', 'row');

      const left = document.createElement('span');
      left.className = 'mc-tooltip-row-left';

      if (payload.color) {
        const swatch = document.createElement('span');
        swatch.className = 'mc-tooltip-swatch';
        swatch.setAttribute('part', 'swatch');
        swatch.style.background = payload.color;
        left.appendChild(swatch);
      }

      if (payload.label) {
        const lbl = document.createElement('span');
        lbl.className = 'mc-tooltip-label';
        lbl.setAttribute('part', 'label');
        lbl.textContent = `${payload.label}:`;
        left.appendChild(lbl);
      }

      const val = document.createElement('strong');
      val.className = 'mc-tooltip-value';
      val.setAttribute('part', 'value');
      val.textContent =
        payload.formattedValue !== undefined
          ? payload.formattedValue
          : formatValue(payload.value, i18n);

      row.append(left, val);
      wrapper.appendChild(row);
    } else if (payload.defaultHtml) {
      wrapper.innerHTML = payload.defaultHtml;
    }

    if (payload.badge) {
      const badgeEl = document.createElement('div');
      badgeEl.className = 'mc-tooltip-badge';
      badgeEl.setAttribute('part', 'badge');
      badgeEl.textContent = payload.badge;
      wrapper.appendChild(badgeEl);
    }

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
    if (config.enabled === false) {
      this.hide();
      return false;
    }

    const surface = this.shadowRoot?.querySelector(
      '.mc-tooltip-surface'
    ) as HTMLElement | null;
    const headerEl = this.shadowRoot?.querySelector(
      '.mc-tooltip-header'
    ) as HTMLElement | null;
    const bodyEl = this.shadowRoot?.querySelector(
      '.mc-tooltip-body'
    ) as HTMLElement | null;
    if (!surface || !headerEl || !bodyEl) return false;

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
    this.#lastPayload = payload;
    this.#activePositionMode = resolvedMode;
    this.#activeSource = source;
    this.#activeConfig = config;
    this.setAttribute('data-chart-type', payload.chartType);
    this.setAttribute('data-position-mode', resolvedMode);
    this.setAttribute('data-trigger-source', source);

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

    const defaultRender = (): HTMLElement => {
      const container = document.createElement('div');
      container.className = 'mc-tooltip-default-wrapper';
      if (payload.title) {
        const hdr = document.createElement('div');
        hdr.className = 'mc-tooltip-header';
        hdr.setAttribute('part', 'header');
        hdr.textContent = payload.title;
        container.appendChild(hdr);
      }
      container.appendChild(this.buildDefaultContent(payload));
      return container;
    };

    const customRenderer = config.renderer ?? this.#renderer;
    const customFormatter = config.formatter ?? this.#formatter;

    if (customRenderer) {
      const customOut = customRenderer(payload, defaultRender);
      if (customOut === null) {
        this.hide();
        return false;
      }
      headerEl.hidden = true;
      headerEl.textContent = '';
      bodyEl.hidden = false;
      bodyEl.replaceChildren();
      if (customOut === undefined) {
        this.#renderStructured(payload, headerEl, bodyEl);
      } else if (typeof customOut === 'string') {
        bodyEl.innerHTML = customOut;
      } else {
        bodyEl.replaceChildren(customOut);
      }
    } else if (customFormatter) {
      const formatted = customFormatter(payload);
      if (formatted === null) {
        this.hide();
        return false;
      }
      headerEl.hidden = true;
      headerEl.textContent = '';
      bodyEl.hidden = false;
      if (formatted === undefined) {
        this.#renderStructured(payload, headerEl, bodyEl);
      } else {
        bodyEl.innerHTML = formatted;
      }
    } else if (config.templateHtml) {
      headerEl.hidden = true;
      headerEl.textContent = '';
      bodyEl.hidden = false;
      bodyEl.innerHTML = interpolateTooltipTemplate(config.templateHtml, payload, i18n);
    } else {
      this.#renderStructured(payload, headerEl, bodyEl);
    }

    this.hidden = false;
    this.#positionTooltip(resolvedMode, payload, containerRect, config, surface);
    return true;
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
    const surface = this.shadowRoot?.querySelector(
      '.mc-tooltip-surface'
    ) as HTMLElement | null;
    if (!surface) return;
    this.#lastPayload.clientX = clientX;
    this.#lastPayload.clientY = clientY;
    this.#positionTooltip(
      'follow',
      this.#lastPayload,
      containerRect,
      this.#activeConfig,
      surface
    );
  }

  public hide(): void {
    this.hidden = true;
    this.#activeSource = 'pointer';
  }

  #positionTooltip(
    mode: TooltipPositionMode,
    payload: TooltipPayload,
    containerRect: DOMRect,
    config: TooltipConfig,
    surface: HTMLElement
  ): void {
    const pad = 8;
    const tipWidth = this.offsetWidth || surface.offsetWidth || 160;
    const tipHeight = this.offsetHeight || surface.offsetHeight || 56;
    const hasRealRect = containerRect.width > 0 || containerRect.height > 0;
    const containerW =
      containerRect.width || this.parentElement?.clientWidth || 600;
    const containerH =
      containerRect.height || this.parentElement?.clientHeight || 360;

    const viewportW =
      typeof window !== 'undefined' && window.innerWidth > 0
        ? window.innerWidth
        : containerW;
    const viewportH =
      typeof window !== 'undefined' && window.innerHeight > 0
        ? window.innerHeight
        : containerH;

    // Container bounds intersected with browser viewport bounds (when rendered in a live viewport)
    const minX = hasRealRect ? Math.max(pad, pad - containerRect.left) : pad;
    const maxX = Math.max(
      minX,
      hasRealRect
        ? Math.min(
            containerW - tipWidth - pad,
            viewportW - containerRect.left - tipWidth - pad
          )
        : containerW - tipWidth - pad
    );
    const minY = hasRealRect ? Math.max(pad, pad - containerRect.top) : pad;
    const maxY = Math.max(
      minY,
      hasRealRect
        ? Math.min(
            containerH - tipHeight - pad,
            viewportH - containerRect.top - tipHeight - pad
          )
        : containerH - tipHeight - pad
    );

    if (mode === 'item' && payload.anchor) {
      const anchor: TooltipAnchorRect = payload.anchor;
      const ax = anchor.relative
        ? anchor.left
        : anchor.left - containerRect.left;
      const ay = anchor.relative
        ? anchor.top
        : anchor.top - containerRect.top;
      const aw = Math.max(0, anchor.width);
      const ah = Math.max(0, anchor.height);
      const gap = config.anchorGap ?? 10;

      const centeredX = ax + aw / 2 - tipWidth / 2;
      const x = Math.max(minX, Math.min(centeredX, maxX));

      const aboveY = ay - tipHeight - gap;
      const belowY = ay + ah + gap;
      let y: number;
      let placement: 'top' | 'bottom';

      if (aboveY >= minY) {
        y = Math.min(aboveY, maxY);
        placement = 'top';
      } else if (belowY <= maxY) {
        y = Math.max(minY, belowY);
        placement = 'bottom';
      } else {
        // Neither side fits completely: pick whichever side has more room and clamp
        const roomAbove = ay - minY;
        const roomBelow = maxY + tipHeight - (ay + ah);
        if (roomAbove >= roomBelow) {
          y = minY;
          placement = 'top';
        } else {
          y = maxY;
          placement = 'bottom';
        }
      }

      this.setAttribute('data-placement', placement);
      this.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      return;
    }

    // 'follow' mode: track pointer with automatic edge flip & clamping
    const offsetX = config.offsetX ?? 14;
    const offsetY = config.offsetY ?? 14;
    const localX = payload.clientX - containerRect.left;
    const localY = payload.clientY - containerRect.top;

    let rawX = localX + offsetX;
    if (rawX > maxX && localX - tipWidth - offsetX >= minX) {
      rawX = localX - tipWidth - offsetX;
    }
    let rawY = localY + offsetY;
    if (rawY > maxY && localY - tipHeight - offsetY >= minY) {
      rawY = localY - tipHeight - offsetY;
    }

    const x = Math.max(minX, Math.min(rawX, maxX));
    const y = Math.max(minY, Math.min(rawY, maxY));

    this.setAttribute('data-placement', 'follow');
    this.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  #renderStructured(
    payload: TooltipPayload,
    headerEl: HTMLElement,
    bodyEl: HTMLElement
  ): void {
    const isSoloTitleText =
      Boolean(payload.title) &&
      !payload.label &&
      !payload.color &&
      !payload.badge &&
      !payload.defaultHtml &&
      (!payload.items || payload.items.length === 0) &&
      (payload.value === undefined ||
        String(payload.formattedValue ?? payload.value) === payload.title);

    headerEl.classList.toggle('mc-tooltip-header--solo', isSoloTitleText);

    if (payload.title) {
      headerEl.hidden = false;
      headerEl.textContent = payload.title;
    } else {
      headerEl.hidden = true;
      headerEl.textContent = '';
    }

    bodyEl.replaceChildren();
    if (isSoloTitleText) {
      bodyEl.hidden = true;
    } else {
      bodyEl.hidden = false;
      bodyEl.replaceChildren(this.buildDefaultContent(payload));
    }
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
