import { HTMLElementBase } from '../core/dom';
import type { ChartDisplayState } from '../core/types';
import { getChartStateViewFactory, loadChartStateView } from './chart-state-loader';

export const DEFAULT_LOADING_TEXT = 'Loading…';
export const DEFAULT_EMPTY_TEXT = 'No data';

function normalizeDisplayState(
  raw: string | null | undefined
): ChartDisplayState | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'loading' || lower === 'empty') return lower;
  return null;
}

/**
 * Shared `<mc-chart-state>` Web Component for loading and empty states.
 * The overlay supports custom slots, CSS parts, and CSS custom properties.
 */
export class MCChartStateElement extends HTMLElementBase {
  static observedAttributes = ['state', 'loading-text', 'empty-text', 'hidden'];

  #shadow: ShadowRoot;
  #syncView: (() => void) | undefined;
  #viewRequested = false;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
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

  /** Synchronizes the overlay once its renderer is available. */
  public sync(): void {
    if (this.#syncView) {
      this.#syncView();
      return;
    }
    if (!this.#shouldMountView()) return;

    const createView = getChartStateViewFactory();
    if (createView) {
      this.#syncView = createView(this, this.#shadow);
      this.#syncView();
      return;
    }
    if (this.#viewRequested) return;

    this.#viewRequested = true;
    // Side-effect imports can upgrade charts before the caller passes bootstrap options.
    setTimeout(() => {
      if (!this.#shouldMountView()) {
        this.#viewRequested = false;
        return;
      }
      void Promise.resolve(loadChartStateView())
        .then(() => {
          this.#viewRequested = false;
          this.sync();
        })
        .catch(() => {
          this.#viewRequested = false;
        });
    }, 0);
  }

  #shouldMountView(): boolean {
    return this.isConnected && !this.hidden && this.state !== null;
  }
}
