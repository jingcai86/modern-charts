import type { ChartDisplayState } from '../core/types';
import type { MCChartStateElement } from './mc-chart-state';

const EMPTY_ICON_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19h18"/><rect x="5" y="12" width="3" height="7" rx="1"/><rect x="10.5" y="8" width="3" height="11" rx="1"/><rect x="16" y="14" width="3" height="5" rx="1"/></svg>`;

const CHART_STATE_MARKUP = `
  <div class="mc-state-overlay" part="state" role="status" aria-live="polite" aria-atomic="true">
    <slot name="loading" class="mc-state-slot" hidden></slot>
    <slot name="empty" class="mc-state-slot" hidden></slot>
    <div class="mc-state-default">
      <span class="mc-state-indicator" part="state-indicator" aria-hidden="true"></span>
      <span class="mc-state-message" part="state-message"></span>
    </div>
  </div>
`;

// Keep the lazy renderer independent of the shared chart bundle.
let chartStateTemplate: HTMLTemplateElement | undefined;
function getChartStateTemplate(): HTMLTemplateElement {
  if (!chartStateTemplate) {
    chartStateTemplate = document.createElement('template');
    chartStateTemplate.innerHTML = CHART_STATE_MARKUP;
  }
  return chartStateTemplate;
}

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
        opacity: 1;
        translate: 0 0;
        transition:
          display var(--mc-state-transition-duration, 220ms),
          opacity var(--mc-state-transition-duration, 220ms) cubic-bezier(0.22, 1, 0.36, 1),
          translate var(--mc-state-transition-duration, 220ms) cubic-bezier(0.22, 1, 0.36, 1);
        transition-behavior: allow-discrete;
      }

      @starting-style {
        :host {
          opacity: 0;
          translate: 0 6px;
        }
      }

      :host([hidden]) {
        display: none;
        opacity: 0;
        translate: 0 6px;
        pointer-events: none;
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
        transition:
          background-color var(--mc-state-transition-duration, 220ms) ease,
          color var(--mc-state-transition-duration, 220ms) ease;
      }

      .mc-state-slot,
      .mc-state-default {
        opacity: 1;
        translate: 0 0;
        transition:
          display var(--mc-state-transition-duration, 200ms),
          opacity var(--mc-state-transition-duration, 200ms) cubic-bezier(0.22, 1, 0.36, 1),
          translate var(--mc-state-transition-duration, 200ms) cubic-bezier(0.22, 1, 0.36, 1);
        transition-behavior: allow-discrete;
      }

      @starting-style {
        .mc-state-slot,
        .mc-state-default {
          opacity: 0;
          translate: 0 4px;
        }
      }

      .mc-state-slot[hidden],
      .mc-state-default[hidden] {
        display: none;
        opacity: 0;
        translate: 0 4px;
      }

      .mc-state-default {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .mc-state-overlay[data-state="loading"],
      .mc-state-default[data-state="loading"] .mc-state-indicator,
      .mc-state-default[data-state="loading"] .mc-state-message {
        animation: mc-state-enter-loading var(--mc-state-transition-duration, 220ms) cubic-bezier(0.22, 1, 0.36, 1);
      }

      .mc-state-overlay[data-state="empty"],
      .mc-state-default[data-state="empty"] .mc-state-indicator,
      .mc-state-default[data-state="empty"] .mc-state-message {
        animation: mc-state-enter-empty var(--mc-state-transition-duration, 220ms) cubic-bezier(0.22, 1, 0.36, 1);
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

      @keyframes mc-state-enter-loading {
        from {
          opacity: 0;
          translate: 0 4px;
        }
        to {
          opacity: 1;
          translate: 0 0;
        }
      }

      @keyframes mc-state-enter-empty {
        from {
          opacity: 0;
          translate: 0 4px;
        }
        to {
          opacity: 1;
          translate: 0 0;
        }
      }

      @keyframes mc-state-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host,
        .mc-state-slot,
        .mc-state-default {
          translate: none;
          transition-duration: 0.1s;
        }

        @starting-style {
          :host,
          .mc-state-slot,
          .mc-state-default {
            translate: none;
          }
        }

        :host([hidden]),
        .mc-state-slot[hidden],
        .mc-state-default[hidden] {
          translate: none;
        }

        .mc-state-overlay[data-state="loading"],
        .mc-state-overlay[data-state="empty"],
        .mc-state-default[data-state="loading"] .mc-state-indicator,
        .mc-state-default[data-state="loading"] .mc-state-message,
        .mc-state-default[data-state="empty"] .mc-state-indicator,
        .mc-state-default[data-state="empty"] .mc-state-message {
          animation: none;
        }

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

export function createChartStateView(
  host: MCChartStateElement,
  shadow: ShadowRoot
): () => void {
  const sheet = getChartStateStyleSheet();
  if (sheet && 'adoptedStyleSheets' in shadow) {
    shadow.adoptedStyleSheets = [sheet];
  }
  shadow.append(getChartStateTemplate().content.cloneNode(true));

  const overlay = shadow.querySelector<HTMLDivElement>('.mc-state-overlay')!;
  const loadingSlot = shadow.querySelector<HTMLSlotElement>('slot[name="loading"]')!;
  const emptySlot = shadow.querySelector<HTMLSlotElement>('slot[name="empty"]')!;
  const defaultContent = shadow.querySelector<HTMLDivElement>('.mc-state-default')!;
  const indicator = shadow.querySelector<HTMLSpanElement>('.mc-state-indicator')!;
  const message = shadow.querySelector<HTMLSpanElement>('.mc-state-message')!;
  let renderedMode: ChartDisplayState | null = null;

  const sync = () => {
    const mode = host.state;
    if (!mode) {
      delete overlay.dataset.state;
      delete defaultContent.dataset.state;
      loadingSlot.hidden = true;
      emptySlot.hidden = true;
      defaultContent.hidden = true;
      return;
    }

    overlay.dataset.state = mode;
    defaultContent.dataset.state = mode;
    const activeSlot = mode === 'loading' ? loadingSlot : emptySlot;
    const inactiveSlot = mode === 'loading' ? emptySlot : loadingSlot;
    const hasCustom = hasAssignedSlotContent(activeSlot);

    inactiveSlot.hidden = true;
    activeSlot.hidden = !hasCustom;
    defaultContent.hidden = hasCustom;

    if (!hasCustom) {
      if (renderedMode !== mode) {
        renderedMode = mode;
        indicator.className = `mc-state-indicator mc-state-indicator--${mode}`;
        indicator.innerHTML = mode === 'empty' ? EMPTY_ICON_SVG : '';
      }
      const nextText = mode === 'loading' ? host.loadingText : host.emptyText;
      if (message.textContent !== nextText) {
        message.textContent = nextText;
      }
    }
  };

  loadingSlot.addEventListener('slotchange', sync);
  emptySlot.addEventListener('slotchange', sync);
  return sync;
}
