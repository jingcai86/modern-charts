import type { ChartDisplayState } from '../core/types';

export const DEFAULT_LOADING_TEXT = 'Loading…';
export const DEFAULT_EMPTY_TEXT = 'No data';

const EMPTY_ICON_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19h18"/><rect x="5" y="12" width="3" height="7" rx="1"/><rect x="10.5" y="8" width="3" height="11" rx="1"/><rect x="16" y="14" width="3" height="5" rx="1"/></svg>`;

const chartStateTemplate = document.createElement('template');
chartStateTemplate.innerHTML = `
  <div class="mc-state-overlay" part="state" role="status" aria-live="polite" aria-atomic="true">
    <slot name="loading" class="mc-state-slot" hidden></slot>
    <slot name="empty" class="mc-state-slot" hidden></slot>
    <div class="mc-state-default">
      <span class="mc-state-indicator" part="state-indicator" aria-hidden="true"></span>
      <span class="mc-state-message" part="state-message"></span>
    </div>
  </div>
`;

let sharedChartStateSheet: CSSStyleSheet | null = null;
function getChartStateStyleSheet(): CSSStyleSheet | null {
  if (sharedChartStateSheet) return sharedChartStateSheet;
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    sharedChartStateSheet = new CSSStyleSheet();
    sharedChartStateSheet.replaceSync(`
      :host {
        position: absolute;
        inset: 0;
        z-index: 15;
        display: block;
        box-sizing: border-box;
      }

      :host([hidden]) {
        display: none !important;
      }

      .mc-state-overlay {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 16px;
        box-sizing: border-box;
        text-align: center;
        background: var(--mc-state-bg, var(--_mc-state-bg, rgba(255, 255, 255, 0.85)));
        color: var(--mc-state-color, var(--_mc-state-color, #475569));
        font: var(
          --mc-state-font,
          500 13px/1.4 var(--_mc-font, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
        );
      }

      .mc-state-slot[hidden],
      .mc-state-default[hidden] {
        display: none !important;
      }

      .mc-state-default {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .mc-state-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: var(--mc-state-spinner-size, 24px);
        height: var(--mc-state-spinner-size, 24px);
        box-sizing: border-box;
      }

      .mc-state-indicator--loading {
        border-radius: 50%;
        border: 2.5px solid color-mix(
          in srgb,
          var(--mc-state-spinner-color, var(--_mc-state-spinner-color, #6366f1)) 22%,
          transparent
        );
        border-top-color: var(--mc-state-spinner-color, var(--_mc-state-spinner-color, #6366f1));
        animation: mc-state-spin 0.75s linear infinite;
      }

      :host([hidden]) .mc-state-indicator--loading {
        animation: none;
      }

      .mc-state-indicator--empty {
        opacity: 0.72;
      }

      .mc-state-indicator--empty svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .mc-state-message {
        margin: 0;
        max-width: 280px;
      }

      @keyframes mc-state-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .mc-state-indicator--loading {
          animation: none;
          border-style: dashed;
          opacity: 0.85;
        }
      }
    `);
  }
  return sharedChartStateSheet;
}

function normalizeDisplayState(
  raw: string | null | undefined
): ChartDisplayState | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'loading' || lower === 'empty') return lower;
  return null;
}

function hasAssignedSlotContent(slot: HTMLSlotElement | null): boolean {
  if (!slot) return false;
  const nodes =
    typeof slot.assignedNodes === 'function'
      ? slot.assignedNodes({ flatten: true })
      : [];
  for (const node of nodes) {
    if (node.nodeType === 1) {
      if ((node as Element).tagName?.toLowerCase() === 'slot') {
        if (hasAssignedSlotContent(node as HTMLSlotElement)) return true;
        continue;
      }
      return true;
    }
    if (node.nodeType === 3 && (node.textContent ?? '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Minimal shared `<mc-chart-state>` Web Component rendered once per chart
 * for loading and empty states. Supports custom `loading` / `empty` slots,
 * CSS `::part(state | state-indicator | state-message)`, and `--mc-state-*`
 * CSS custom properties.
 */
export class MCChartStateElement extends HTMLElement {
  static observedAttributes = ['state', 'loading-text', 'empty-text'];

  #loadingSlot: HTMLSlotElement | null = null;
  #emptySlot: HTMLSlotElement | null = null;
  #defaultWrap: HTMLDivElement | null = null;
  #indicatorEl: HTMLSpanElement | null = null;
  #messageEl: HTMLSpanElement | null = null;
  #renderedMode: ChartDisplayState | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getChartStateStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(chartStateTemplate.content.cloneNode(true));

    this.#loadingSlot = shadow.querySelector('slot[name="loading"]');
    this.#emptySlot = shadow.querySelector('slot[name="empty"]');
    this.#defaultWrap = shadow.querySelector('.mc-state-default');
    this.#indicatorEl = shadow.querySelector('.mc-state-indicator');
    this.#messageEl = shadow.querySelector('.mc-state-message');

    const onSlotChange = () => this.sync();
    this.#loadingSlot?.addEventListener('slotchange', onSlotChange);
    this.#emptySlot?.addEventListener('slotchange', onSlotChange);
  }

  connectedCallback(): void {
    this.sync();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal === newVal) return;
    this.sync();
  }

  get state(): ChartDisplayState | null {
    return normalizeDisplayState(this.getAttribute('state'));
  }

  set state(val: ChartDisplayState | null) {
    const normalized = normalizeDisplayState(val);
    if (normalized) {
      if (this.getAttribute('state') !== normalized) {
        this.setAttribute('state', normalized);
      } else {
        this.sync();
      }
    } else if (this.hasAttribute('state')) {
      this.removeAttribute('state');
    } else {
      this.sync();
    }
  }

  get loadingText(): string {
    return this.getAttribute('loading-text') ?? DEFAULT_LOADING_TEXT;
  }

  set loadingText(val: string | undefined) {
    if (val === undefined) {
      this.removeAttribute('loading-text');
    } else if (this.getAttribute('loading-text') !== val) {
      this.setAttribute('loading-text', val);
    }
  }

  get emptyText(): string {
    return this.getAttribute('empty-text') ?? DEFAULT_EMPTY_TEXT;
  }

  set emptyText(val: string | undefined) {
    if (val === undefined) {
      this.removeAttribute('empty-text');
    } else if (this.getAttribute('empty-text') !== val) {
      this.setAttribute('empty-text', val);
    }
  }

  /**
   * Synchronizes active slot visibility and default indicator/message content.
   * Called automatically on attribute/slot changes and by `MCBaseChart`.
   */
  public sync(): void {
    const mode = this.state;
    const loadingSlot = this.#loadingSlot;
    const emptySlot = this.#emptySlot;
    const defaultWrap = this.#defaultWrap;
    const indicator = this.#indicatorEl;
    const message = this.#messageEl;

    if (!mode) {
      if (loadingSlot) loadingSlot.hidden = true;
      if (emptySlot) emptySlot.hidden = true;
      if (defaultWrap) defaultWrap.hidden = true;
      return;
    }

    const activeSlot = mode === 'loading' ? loadingSlot : emptySlot;
    const inactiveSlot = mode === 'loading' ? emptySlot : loadingSlot;
    const hasCustom = hasAssignedSlotContent(activeSlot);

    if (inactiveSlot) inactiveSlot.hidden = true;
    if (activeSlot) activeSlot.hidden = !hasCustom;
    if (defaultWrap) defaultWrap.hidden = hasCustom;

    if (!hasCustom && indicator && message) {
      if (this.#renderedMode !== mode) {
        this.#renderedMode = mode;
        indicator.className = `mc-state-indicator mc-state-indicator--${mode}`;
        indicator.innerHTML = mode === 'empty' ? EMPTY_ICON_SVG : '';
      }
      const nextText =
        mode === 'loading' ? this.loadingText : this.emptyText;
      if (message.textContent !== nextText) {
        message.textContent = nextText;
      }
    }
  }
}
