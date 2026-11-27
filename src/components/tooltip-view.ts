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
import type { MCTooltipElement } from './mc-tooltip';

const TOOLTIP_MARKUP = `
  <div class="mc-tooltip-surface" part="tooltip container">
    <div class="mc-tooltip-header" part="header" hidden></div>
    <div class="mc-tooltip-body" part="body"></div>
  </div>
  <slot style="display:none"></slot>
`;

// Keep the lazy renderer independent of the shared chart bundle.
let tooltipTemplate: HTMLTemplateElement | undefined;
function getTooltipTemplate(): HTMLTemplateElement {
  if (!tooltipTemplate) {
    tooltipTemplate = document.createElement('template');
    tooltipTemplate.innerHTML = TOOLTIP_MARKUP;
  }
  return tooltipTemplate;
}

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

function resolveTemplateValue(
  payload: TooltipPayload,
  key: string,
  i18n: ChartI18n
): string {
  if (key === 'chartType') return String(payload.chartType ?? '');
  if (key === 'target') return String(payload.target ?? '');
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
      ? i18n.formatPercent(payload.percentage / 100, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        })
      : '';
  if (key === 'badge') return String(payload.badge ?? '');
  if (
    key.startsWith('datum.') &&
    payload.datum &&
    typeof payload.datum === 'object'
  ) {
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

export function buildDefaultTooltipContent(
  payload: TooltipPayload,
  i18n: ChartI18n
): HTMLElement {
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

function positionTooltip(
  host: MCTooltipElement,
  mode: TooltipPositionMode,
  payload: TooltipPayload,
  containerRect: DOMRect,
  config: TooltipConfig,
  surface: HTMLElement
): void {
  const pad = 8;
  const tipWidth = host.offsetWidth || surface.offsetWidth || 160;
  const tipHeight = host.offsetHeight || surface.offsetHeight || 56;
  const hasRealRect = containerRect.width > 0 || containerRect.height > 0;
  const containerW =
    containerRect.width || host.parentElement?.clientWidth || 600;
  const containerH =
    containerRect.height || host.parentElement?.clientHeight || 360;

  const viewportW =
    typeof window !== 'undefined' && window.innerWidth > 0
      ? window.innerWidth
      : containerW;
  const viewportH =
    typeof window !== 'undefined' && window.innerHeight > 0
      ? window.innerHeight
      : containerH;

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

    host.setAttribute('data-placement', placement);
    host.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    return;
  }

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

  host.setAttribute('data-placement', 'follow');
  host.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

function renderStructured(
  payload: TooltipPayload,
  headerEl: HTMLElement,
  bodyEl: HTMLElement,
  i18n: ChartI18n
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
    bodyEl.replaceChildren(buildDefaultTooltipContent(payload, i18n));
  }
}

export interface TooltipViewController {
  buildDefaultContent: (
    payload: TooltipPayload,
    i18n: ChartI18n
  ) => HTMLElement;
  show: (
    payload: TooltipPayload,
    resolvedMode: TooltipPositionMode,
    theme: ChartTheme,
    containerRect: DOMRect,
    config: TooltipConfig,
    i18n: ChartI18n,
    hostRenderer?: TooltipRenderer,
    hostFormatter?: (payload: TooltipPayload) => string | null | undefined
  ) => boolean;
  moveToPointer: (
    payload: TooltipPayload,
    containerRect: DOMRect,
    config: TooltipConfig
  ) => void;
}

export function createTooltipView(
  host: MCTooltipElement,
  shadow: ShadowRoot
): TooltipViewController {
  const sheet = getTooltipStyleSheet();
  if (sheet && 'adoptedStyleSheets' in shadow) {
    shadow.adoptedStyleSheets = [sheet];
  }
  shadow.append(getTooltipTemplate().content.cloneNode(true));

  const surface = shadow.querySelector<HTMLElement>('.mc-tooltip-surface')!;
  const headerEl = shadow.querySelector<HTMLElement>('.mc-tooltip-header')!;
  const bodyEl = shadow.querySelector<HTMLElement>('.mc-tooltip-body')!;

  return {
    buildDefaultContent(payload: TooltipPayload, i18n: ChartI18n): HTMLElement {
      return buildDefaultTooltipContent(payload, i18n);
    },
    show(
      payload: TooltipPayload,
      resolvedMode: TooltipPositionMode,
      _theme: ChartTheme,
      containerRect: DOMRect,
      config: TooltipConfig,
      i18n: ChartI18n,
      hostRenderer?: TooltipRenderer,
      hostFormatter?: (payload: TooltipPayload) => string | null | undefined
    ): boolean {
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
        container.appendChild(buildDefaultTooltipContent(payload, i18n));
        return container;
      };

      const customRenderer = config.renderer ?? hostRenderer;
      const customFormatter = config.formatter ?? hostFormatter;

      if (customRenderer) {
        const customOut = customRenderer(payload, defaultRender);
        if (customOut === null) {
          host.hide();
          return false;
        }
        headerEl.hidden = true;
        headerEl.textContent = '';
        bodyEl.hidden = false;
        bodyEl.replaceChildren();
        if (customOut === undefined) {
          renderStructured(payload, headerEl, bodyEl, i18n);
        } else if (typeof customOut === 'string') {
          bodyEl.innerHTML = customOut;
        } else {
          bodyEl.replaceChildren(customOut);
        }
      } else if (customFormatter) {
        const formatted = customFormatter(payload);
        if (formatted === null) {
          host.hide();
          return false;
        }
        headerEl.hidden = true;
        headerEl.textContent = '';
        bodyEl.hidden = false;
        if (formatted === undefined) {
          renderStructured(payload, headerEl, bodyEl, i18n);
        } else {
          bodyEl.innerHTML = formatted;
        }
      } else if (config.templateHtml) {
        headerEl.hidden = true;
        headerEl.textContent = '';
        bodyEl.hidden = false;
        bodyEl.innerHTML = interpolateTooltipTemplate(
          config.templateHtml,
          payload,
          i18n
        );
      } else {
        renderStructured(payload, headerEl, bodyEl, i18n);
      }

      host.hidden = false;
      positionTooltip(
        host,
        resolvedMode,
        payload,
        containerRect,
        config,
        surface
      );
      return true;
    },
    moveToPointer(
      payload: TooltipPayload,
      containerRect: DOMRect,
      config: TooltipConfig
    ): void {
      positionTooltip(host, 'follow', payload, containerRect, config, surface);
    }
  };
}
