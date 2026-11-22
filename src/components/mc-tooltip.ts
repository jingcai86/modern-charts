import type {
  ChartTheme,
  TooltipConfig,
  TooltipPayload,
  TooltipRenderer
} from '../core/types';

const tooltipTemplate = document.createElement('template');
tooltipTemplate.innerHTML = `
  <div class="mc-tooltip-surface" part="tooltip container">
    <div class="mc-tooltip-header" part="header" hidden></div>
    <div class="mc-tooltip-body" part="body"></div>
  </div>
  <slot style="display:none"></slot>
`;

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

      .mc-tooltip-body {
        display: flex;
        flex-direction: column;
        gap: 3px;
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
        margin-left: 6px;
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

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveTemplateValue(payload: TooltipPayload, key: string): string {
  if (key === 'chartType') return String(payload.chartType ?? '');
  if (key === 'title') return String(payload.title ?? '');
  if (key === 'label') return String(payload.label ?? '');
  if (key === 'seriesId') return String(payload.seriesId ?? '');
  if (key === 'category') return String(payload.category ?? '');
  if (key === 'value') return String(payload.value ?? '');
  if (key === 'formattedValue')
    return String(payload.formattedValue ?? payload.value ?? '');
  if (key === 'color') return String(payload.color ?? '');
  if (key === 'percentage')
    return payload.percentage !== undefined
      ? `${payload.percentage.toFixed(1)}%`
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
  payload: TooltipPayload
): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) =>
    escapeHtml(resolveTemplateValue(payload, key))
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
export class MCTooltipElement extends HTMLElement {
  static observedAttributes = [
    'enabled',
    'offset-x',
    'offset-y',
    'class-name'
  ];

  #formatter?: (payload: TooltipPayload) => string | null | undefined;
  #renderer?: TooltipRenderer;
  #lastPayload: TooltipPayload | null = null;
  #configOverride?: TooltipConfig;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getTooltipStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(tooltipTemplate.content.cloneNode(true));
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
    const offsetXAttr = this.getAttribute('offset-x');
    const offsetYAttr = this.getAttribute('offset-y');
    const classNameAttr = this.getAttribute('class-name') || undefined;

    return {
      ...(this.#configOverride ?? {}),
      ...(enabledAttr !== null ? { enabled: enabledAttr !== 'false' } : {}),
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
            : String(item.value ?? '');
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
          : String(payload.value ?? '');

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
    config: TooltipConfig = {}
  ): boolean {
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

    this.#lastPayload = payload;
    this.setAttribute('data-chart-type', payload.chartType);

    const baseClass = this.classList.contains('mc-legend-tooltip')
      ? 'mc-legend-tooltip'
      : 'mc-tooltip';
    if (config.className) {
      this.className = `${baseClass} ${config.className}`;
    } else {
      this.className = baseClass;
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
      bodyEl.innerHTML = '';
      if (customOut === undefined) {
        this.#renderStructured(payload, headerEl, bodyEl);
      } else if (typeof customOut === 'string') {
        bodyEl.innerHTML = customOut;
      } else {
        bodyEl.appendChild(customOut);
      }
    } else if (customFormatter) {
      const formatted = customFormatter(payload);
      if (formatted === null) {
        this.hide();
        return false;
      }
      headerEl.hidden = true;
      headerEl.textContent = '';
      if (formatted === undefined) {
        this.#renderStructured(payload, headerEl, bodyEl);
      } else {
        bodyEl.innerHTML = formatted;
      }
    } else if (config.templateHtml) {
      headerEl.hidden = true;
      headerEl.textContent = '';
      bodyEl.innerHTML = interpolateTooltipTemplate(config.templateHtml, payload);
    } else {
      this.#renderStructured(payload, headerEl, bodyEl);
    }

    this.hidden = false;

    const offsetX = config.offsetX ?? 14;
    const offsetY = config.offsetY ?? 14;
    const tipWidth = this.offsetWidth || surface.offsetWidth || 160;
    const tipHeight = this.offsetHeight || surface.offsetHeight || 56;
    const rawX = payload.clientX - containerRect.left + offsetX;
    const rawY = payload.clientY - containerRect.top + offsetY;
    const maxX = Math.max(8, containerRect.width - tipWidth - 10);
    const maxY = Math.max(8, containerRect.height - tipHeight - 10);
    const x = Math.max(8, Math.min(rawX, maxX));
    const y = Math.max(8, Math.min(rawY, maxY));

    this.style.transform = `translate(${x}px, ${y}px)`;
    return true;
  }

  public hide(): void {
    this.hidden = true;
  }

  #renderStructured(
    payload: TooltipPayload,
    headerEl: HTMLElement,
    bodyEl: HTMLElement
  ): void {
    if (payload.title) {
      headerEl.hidden = false;
      headerEl.textContent = payload.title;
    } else {
      headerEl.hidden = true;
      headerEl.textContent = '';
    }
    bodyEl.innerHTML = '';
    bodyEl.appendChild(this.buildDefaultContent(payload));
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
