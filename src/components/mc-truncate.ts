import { HTMLElementBase, lazyTemplate } from '../core/dom';
import { needsFullTextTooltip } from '../core/label-overflow';
import {
  DEFAULT_MAX_ROTATION,
  DEFAULT_TRUNCATE_ELLIPSIS,
  normalizeOverflowStrategy,
  resolveLabelOverflowConfig,
  truncateTextWithPretext
} from '../core/label-truncate';
import { createDefaultTheme } from '../core/theme';
import { resolveElementAnchor } from '../core/tooltip-anchor';
import type {
  LabelDescriptor,
  LabelOverflowConfig,
  LabelOverflowStrategy,
  LabelStyleOverride,
  LabelTargetType,
  LabelTruncateResult,
  ThemeModePreference,
  TooltipConfig,
  TooltipPayload
} from '../core/types';
import type { MCTooltipElement } from './mc-tooltip';

const getTruncateTemplate = lazyTemplate(`
  <span class="mc-truncate-host" part="container">
    <span class="mc-truncate-text" part="text"></span>
    <mc-tooltip
      class="mc-truncate-tooltip"
      part="tooltip-host"
      exportparts="tooltip, container: tooltip-container, header: tooltip-header, body: tooltip-body"
      hidden
    ></mc-tooltip>
  </span>
  <slot style="display:none"></slot>
`);

let sharedTruncateSheet: CSSStyleSheet | null = null;
function getTruncateStyleSheet(): CSSStyleSheet | null {
  if (sharedTruncateSheet) return sharedTruncateSheet;
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    sharedTruncateSheet = new CSSStyleSheet();
    sharedTruncateSheet.replaceSync(`
      :host {
        display: inline-block;
        position: relative;
        vertical-align: middle;
        --_mc-truncate-color: var(--mc-truncate-color, inherit);
        --_mc-truncate-font: var(--mc-truncate-font, inherit);
      }
      :host([hidden]),
      :host([data-config-only]) {
        display: none;
      }
      .mc-truncate-host {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--_mc-truncate-color);
        font-family: var(--_mc-truncate-font);
      }
      .mc-truncate-tooltip {
        position: fixed;
        top: 0;
        left: 0;
        width: max-content;
        max-width: 280px;
        z-index: 9999;
      }
      .mc-truncate-text {
        display: inline-block;
        white-space: pre;
        transform-origin: center center;
        outline: none;
      }
      .mc-truncate-text.mc-truncate-text--interactive {
        cursor: pointer;
      }
      .mc-truncate-text.mc-truncate-text--interactive:focus-visible {
        outline: 2px solid var(--mc-focus-color, #38bdf8);
        outline-offset: 2px;
        border-radius: 3px;
      }
    `);
  }
  return sharedTruncateSheet;
}

function parseOptionalNumber(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * `<mc-truncate>` Shared Pretext Truncation & Overflow Web Component.
 *
 * Powered by `@chenglou/pretext` (zero DOM layout reflow), supporting:
 * - Width (`max-width`) and/or character-count (`max-chars`) overflow triggers
 * - Overflow strategies: `'truncate'` (default), `'rotate'`, `'both'`, `'wrap'`, `'wrap-truncate'`, `'rotate-wrap-truncate'`, and `'none'`
 * - Full-text tooltips for truncation or automatic overflow rotation on hover and keyboard focus. Use `enable-tooltip="false"` or `.tooltip = false` to disable them.
 *
 * Dual role:
 * 1. **Declarative config element** inside any `<mc-*-chart>` or `<mc-label>` (with optional `for="axis-tick|data|title|..."` targeting and nested `<mc-tooltip>`).
 * 2. **Standalone reusable `<mc-truncate>` component** for rendering truncated/rotated text anywhere in an app.
 */
export class MCTruncateElement extends HTMLElementBase {
  static observedAttributes = [
    'for',
    'text',
    'max-width',
    'max-chars',
    'max-lines',
    'ellipsis',
    'strategy',
    'max-rotation',
    'rotation',
    'enable-tooltip',
    'font-size',
    'font-weight',
    'font-family',
    'color',
    'theme-mode',
    'standalone'
  ];

  #tooltipConfig?: boolean | TooltipConfig<LabelDescriptor>;
  #lastResult: LabelTruncateResult | null = null;
  #eventsBound = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getTruncateStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(getTruncateTemplate().content.cloneNode(true));
  }

  connectedCallback(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    slot?.addEventListener('slotchange', () => {
      this.#syncModeAndRender();
      this.#notifyParent();
    });
    this.#bindStandaloneEvents();
    this.#syncModeAndRender();
    this.#notifyParent();
  }

  connectedMoveCallback(): void {
    this.#syncModeAndRender();
    this.#notifyParent();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#syncModeAndRender();
      this.#notifyParent();
    }
  }

  get target(): LabelTargetType {
    return (this.getAttribute('for') as LabelTargetType) || 'all';
  }
  set target(val: LabelTargetType) {
    this.setAttribute('for', val);
  }

  get text(): string {
    return this.getAttribute('text') ?? '';
  }
  set text(val: string) {
    if (val) this.setAttribute('text', val);
    else this.removeAttribute('text');
  }

  get maxWidth(): number | undefined {
    return parseOptionalNumber(this.getAttribute('max-width'));
  }
  set maxWidth(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-width', String(val));
    else this.removeAttribute('max-width');
  }

  get maxChars(): number | undefined {
    return parseOptionalNumber(this.getAttribute('max-chars'));
  }
  set maxChars(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-chars', String(val));
    else this.removeAttribute('max-chars');
  }

  get maxLines(): number | undefined {
    return parseOptionalNumber(this.getAttribute('max-lines'));
  }
  set maxLines(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-lines', String(val));
    else this.removeAttribute('max-lines');
  }

  get ellipsis(): string {
    return this.getAttribute('ellipsis') ?? DEFAULT_TRUNCATE_ELLIPSIS;
  }
  set ellipsis(val: string) {
    this.setAttribute('ellipsis', val);
  }

  get strategy(): LabelOverflowStrategy {
    return normalizeOverflowStrategy(this.getAttribute('strategy')) ?? 'truncate';
  }
  set strategy(val: LabelOverflowStrategy) {
    this.setAttribute('strategy', val);
  }

  get maxRotation(): number {
    return (
      parseOptionalNumber(this.getAttribute('max-rotation')) ??
      DEFAULT_MAX_ROTATION
    );
  }
  set maxRotation(val: number) {
    this.setAttribute('max-rotation', String(val));
  }

  get rotation(): number | undefined {
    return parseOptionalNumber(this.getAttribute('rotation'));
  }
  set rotation(val: number | undefined) {
    if (val !== undefined) this.setAttribute('rotation', String(val));
    else this.removeAttribute('rotation');
  }

  get enableTooltip(): boolean {
    if (this.#tooltipConfig === false) return false;
    if (
      this.#tooltipConfig &&
      typeof this.#tooltipConfig === 'object' &&
      this.#tooltipConfig.enabled === false
    ) {
      return false;
    }
    const attr = this.getAttribute('enable-tooltip');
    if (attr !== null) return attr !== 'false';
    const nestedTip = this.#getNestedTooltipConfig();
    if (nestedTip?.enabled === false) return false;
    return true;
  }
  set enableTooltip(val: boolean) {
    this.setAttribute('enable-tooltip', String(Boolean(val)));
  }

  get tooltip(): boolean | TooltipConfig<LabelDescriptor> | undefined {
    if (this.#tooltipConfig !== undefined) return this.#tooltipConfig;
    return this.#getNestedTooltipConfig();
  }
  set tooltip(val: boolean | TooltipConfig<LabelDescriptor> | undefined) {
    this.#tooltipConfig = val;
    this.#syncModeAndRender();
    this.#notifyParent();
  }

  get lastResult(): LabelTruncateResult | null {
    return this.#lastResult;
  }

  public getTooltipElement(): MCTooltipElement | null {
    return (
      (this.shadowRoot?.querySelector(
        '.mc-truncate-tooltip'
      ) as MCTooltipElement | null) ?? null
    );
  }

  /**
   * Returns a normalized `LabelOverflowConfig` describing this element's truncation/rotation rules.
   */
  public toOverflowConfig(): LabelOverflowConfig {
    const strategy = normalizeOverflowStrategy(this.getAttribute('strategy'));
    const attrEnable = this.hasAttribute('enable-tooltip')
      ? this.getAttribute('enable-tooltip') !== 'false'
      : undefined;
    const nestedTooltip = this.#getNestedTooltipConfig();

    let resolvedTooltip: boolean | TooltipConfig<LabelDescriptor> | undefined;
    if (this.#tooltipConfig === false) {
      resolvedTooltip = false;
    } else if (
      this.#tooltipConfig &&
      typeof this.#tooltipConfig === 'object'
    ) {
      resolvedTooltip = nestedTooltip
        ? { ...nestedTooltip, ...this.#tooltipConfig }
        : { ...this.#tooltipConfig };
    } else if (nestedTooltip) {
      resolvedTooltip = nestedTooltip;
    }

    const enableTooltip =
      attrEnable !== undefined
        ? attrEnable
        : resolvedTooltip === false
        ? false
        : typeof resolvedTooltip === 'object' &&
          resolvedTooltip.enabled === false
        ? false
        : undefined;

    return {
      ...(strategy ? { strategy } : {}),
      ...(this.maxWidth !== undefined ? { maxWidth: this.maxWidth } : {}),
      ...(this.maxChars !== undefined ? { maxChars: this.maxChars } : {}),
      ...(this.maxLines !== undefined ? { maxLines: this.maxLines } : {}),
      ...(this.hasAttribute('ellipsis') ? { ellipsis: this.ellipsis } : {}),
      ...(this.hasAttribute('max-rotation')
        ? { maxRotation: this.maxRotation }
        : {}),
      ...(enableTooltip !== undefined ? { enableTooltip } : {}),
      ...(resolvedTooltip !== undefined ? { tooltip: resolvedTooltip } : {})
    };
  }

  /**
   * Converts this declarative `<mc-truncate>` into a `LabelStyleOverride`
   * consumable directly by `LabelEngine`.
   */
  public toStyleOverride(): LabelStyleOverride {
    const overflow = this.toOverflowConfig();
    return {
      target: this.target,
      overflow,
      ...(overflow.maxWidth !== undefined
        ? { maxWidth: overflow.maxWidth }
        : {}),
      ...(overflow.maxChars !== undefined
        ? { maxChars: overflow.maxChars }
        : {}),
      ...(overflow.maxLines !== undefined
        ? { maxLines: overflow.maxLines }
        : {}),
      ...(overflow.ellipsis !== undefined
        ? { ellipsis: overflow.ellipsis }
        : {}),
      ...(overflow.maxRotation !== undefined
        ? { maxRotation: overflow.maxRotation }
        : {}),
      ...(overflow.enableTooltip !== undefined
        ? { enableTooltip: overflow.enableTooltip }
        : {}),
      ...(overflow.tooltip !== undefined ? { tooltip: overflow.tooltip } : {}),
      ...(this.rotation !== undefined ? { rotation: this.rotation } : {})
    };
  }

  public renderStandalone(): void {
    const textEl = this.shadowRoot?.querySelector(
      '.mc-truncate-text'
    ) as HTMLSpanElement | null;
    if (!textEl) return;

    if (this.#isConfigOnly()) {
      textEl.textContent = '';
      this.#lastResult = null;
      this.#hideTooltip();
      return;
    }

    const sourceText = this.#extractStandaloneText();
    const fontSize = parseOptionalNumber(this.getAttribute('font-size')) ?? 12;
    const fontWeight = this.getAttribute('font-weight') || 500;
    const fontFamily =
      this.getAttribute('font-family') ||
      'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    const color = this.getAttribute('color');

    const overflow = resolveLabelOverflowConfig(this.toStyleOverride());
    const result = truncateTextWithPretext(sourceText, {
      fontSize,
      fontWeight,
      fontFamily,
      maxWidth: overflow.maxWidth,
      maxChars: overflow.maxChars,
      maxLines: overflow.maxLines,
      ellipsis: overflow.ellipsis,
      strategy: overflow.strategy,
      maxRotation: overflow.maxRotation,
      rotation: this.rotation
    });
    this.#lastResult = result;

    textEl.textContent = result.text;
    textEl.style.fontSize = `${fontSize}px`;
    textEl.style.fontWeight = String(fontWeight);
    textEl.style.fontFamily = fontFamily;
    if (color) {
      textEl.style.color = color;
    } else {
      textEl.style.removeProperty('color');
    }

    const hostEl = this.shadowRoot?.querySelector(
      '.mc-truncate-host'
    ) as HTMLElement | null;
    if (result.appliedRotation !== 0) {
      textEl.style.transform = `rotate(${result.appliedRotation}deg)`;
      if (hostEl) {
        const rad = (result.appliedRotation * Math.PI) / 180;
        const height = result.lines.length * Math.round(fontSize * 1.35);
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const rotW = Math.ceil(result.width * cos + height * sin);
        const rotH = Math.ceil(result.width * sin + height * cos);
        hostEl.style.minWidth = `${rotW}px`;
        hostEl.style.minHeight = `${rotH}px`;
      }
    } else {
      textEl.style.removeProperty('transform');
      if (hostEl) {
        hostEl.style.removeProperty('min-width');
        hostEl.style.removeProperty('min-height');
      }
    }

    this.setAttribute('data-truncated', result.truncated ? 'true' : 'false');
    this.setAttribute('data-overflow-strategy', result.appliedStrategy);
    if (result.appliedRotation !== 0) {
      this.setAttribute('data-applied-rotation', String(result.appliedRotation));
    } else {
      this.removeAttribute('data-applied-rotation');
    }

    const canShowFullText = needsFullTextTooltip(result);
    if (canShowFullText) {
      this.setAttribute('data-full-text', result.originalText);
      textEl.setAttribute('aria-label', result.originalText);
    } else {
      this.removeAttribute('data-full-text');
      textEl.removeAttribute('aria-label');
    }

    const interactive = canShowFullText && overflow.enableTooltip;
    textEl.classList.toggle('mc-truncate-text--interactive', interactive);
    if (interactive) {
      textEl.setAttribute('tabindex', '0');
    } else {
      textEl.removeAttribute('tabindex');
      this.#hideTooltip();
    }
  }

  #isConfigOnly(): boolean {
    if (this.hasAttribute('standalone')) return false;
    if (this.hasAttribute('for')) return true;
    const parentTag = this.parentElement?.tagName.toLowerCase() ?? '';
    return parentTag.startsWith('mc-');
  }

  #syncModeAndRender(): void {
    if (this.#isConfigOnly()) {
      this.setAttribute('data-config-only', '');
    } else {
      this.removeAttribute('data-config-only');
    }
    this.renderStandalone();
  }

  #extractStandaloneText(): string {
    const attrText = this.getAttribute('text');
    if (attrText !== null) return attrText;
    // Collect direct text nodes so nested <mc-tooltip> template text is excluded
    let raw = '';
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        raw += node.textContent ?? '';
      }
    }
    return raw.trim();
  }

  #getNestedTooltipConfig(): TooltipConfig<LabelDescriptor> | undefined {
    const tipEl = Array.from(this.children).find(
      (el) => el.tagName.toLowerCase() === 'mc-tooltip'
    ) as MCTooltipElement | undefined;
    if (tipEl && typeof tipEl.toTooltipConfig === 'function') {
      return tipEl.toTooltipConfig() as TooltipConfig<LabelDescriptor>;
    }
    return undefined;
  }

  #bindStandaloneEvents(): void {
    if (this.#eventsBound) return;
    const textEl = this.shadowRoot?.querySelector(
      '.mc-truncate-text'
    ) as HTMLSpanElement | null;
    if (!textEl) return;
    this.#eventsBound = true;

    const show = (
      source: 'pointer' | 'keyboard',
      clientX: number,
      clientY: number
    ) => {
      const result = this.#lastResult;
      const overflow = resolveLabelOverflowConfig(this.toStyleOverride());
      if (!result || !needsFullTextTooltip(result) || !overflow.enableTooltip) return;
      const tooltip = this.getTooltipElement();
      const hostEl = this.shadowRoot?.querySelector(
        '.mc-truncate-host'
      ) as HTMLElement | null;
      if (!tooltip || !hostEl || typeof tooltip.show !== 'function') return;

      const themeMode =
        (this.getAttribute('theme-mode') as ThemeModePreference) || 'light';
      const theme = createDefaultTheme(themeMode, 'shadcn');
      const customTip = overflow.tooltip;
      const anchor = resolveElementAnchor(textEl, {
        left: 0,
        top: 0,
        width: Math.max(20, result.width),
        height: 20,
        relative: true
      });
      const payload: TooltipPayload<LabelDescriptor> = {
        chartType: 'truncate',
        title: result.originalText,
        value: result.originalText,
        formattedValue: result.originalText,
        datum: {
          text: result.originalText,
          x: 0,
          y: 0,
          type: 'custom',
          meta: {
            truncated: result.truncated,
            displayText: result.text,
            appliedStrategy: result.appliedStrategy,
            appliedRotation: result.appliedRotation
          }
        },
        clientX,
        clientY,
        source,
        anchor
      };

      const viewportRect = {
        left: 0,
        top: 0,
        right: typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 800,
        bottom: typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600,
        width: typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 800,
        height: typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRect;

      tooltip.show(payload, theme, viewportRect, {
        enabled: true,
        position: customTip?.position ?? 'item',
        anchorGap: customTip?.anchorGap ?? 8,
        offsetX: customTip?.offsetX,
        offsetY: customTip?.offsetY,
        className: customTip?.className,
        formatter: customTip?.formatter,
        renderer: customTip?.renderer,
        templateHtml: customTip?.templateHtml
      });
    };

    textEl.addEventListener('mouseenter', (e: MouseEvent) => {
      show('pointer', e.clientX, e.clientY);
    });
    textEl.addEventListener('mouseleave', () => {
      this.#hideTooltip();
    });
    textEl.addEventListener('focus', () => {
      const r = textEl.getBoundingClientRect();
      show('keyboard', r.left + r.width / 2, r.top);
    });
    textEl.addEventListener('blur', () => {
      this.#hideTooltip();
    });
    textEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.#hideTooltip();
      }
    });
  }

  #hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    if (!tooltip) return;
    if (typeof tooltip.hide === 'function') {
      tooltip.hide();
    } else {
      tooltip.hidden = true;
    }
  }

  #notifyParent(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-truncate', element: this }
      })
    );
  }
}
