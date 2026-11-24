import { LabelEngine } from '../core/label-engine';
import {
  normalizeOverflowInput,
  normalizeOverflowStrategy
} from '../core/label-truncate';
import { createDefaultTheme } from '../core/theme';
import type {
  CustomLabelRenderer,
  LabelDescriptor,
  LabelOverflowConfig,
  LabelOverflowStrategy,
  LabelRenderMode,
  LabelStyleOverride,
  LabelTargetType,
  MeasuredLabel,
  TooltipConfig,
  TooltipInput,
  TooltipPayload
} from '../core/types';
import { MCTooltipElement } from './mc-tooltip';
import { MCTruncateElement } from './mc-truncate';

const labelTemplate = document.createElement('template');
labelTemplate.innerHTML = `
  <div class="mc-label-host" part="container">
    <svg class="mc-label-standalone-svg" part="svg" xmlns="http://www.w3.org/2000/svg"></svg>
    <mc-tooltip
      class="mc-label-tooltip"
      part="tooltip-host"
      exportparts="tooltip, container: tooltip-container, header: tooltip-header, body: tooltip-body"
      hidden
    ></mc-tooltip>
    <slot style="display:none"></slot>
  </div>
`;

let sharedLabelSheet: CSSStyleSheet | null = null;
function getLabelStyleSheet(): CSSStyleSheet | null {
  if (sharedLabelSheet) return sharedLabelSheet;
  if (
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    sharedLabelSheet = new CSSStyleSheet();
    sharedLabelSheet.replaceSync(`
      :host {
        display: inline-block;
        vertical-align: middle;
        --_mc-label-color: var(--mc-label-color, #1e293b);
        --_mc-label-font: var(--mc-label-font, Inter, -apple-system, BlinkMacSystemFont, sans-serif);
      }
      :host([hidden]) {
        display: none;
      }
      :host([for]) {
        display: none;
      }
      .mc-label-host {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .mc-label-tooltip {
        position: fixed;
        top: 0;
        left: 0;
        width: max-content;
        max-width: 280px;
        z-index: 9999;
      }
      .mc-label-standalone-svg {
        overflow: visible;
        display: block;
      }
      .mc-label--interactive,
      .mc-label--interactive * {
        pointer-events: auto;
        cursor: pointer;
      }
      .mc-label--interactive:focus-visible {
        outline: 2px solid var(--mc-focus-color, #38bdf8);
        outline-offset: 2px;
      }
    `);
  }
  return sharedLabelSheet;
}

/**
 * `<mc-label>` Web Component
 *
 * Supports:
 * - Standard SVG `<text>` / `<tspan>` wrapped via `@chenglou/pretext`
 * - SVG `<foreignObject>` containing arbitrary HTML, inline `<svg>` icons, `<img>` badges,
 *   or a raw `<foreignObject>` inside `<template>`, with `@chenglou/pretext` computing
 *   exact icon + text bounding boxes without DOM reflow.
 */
export class MCLabelElement extends HTMLElement {
  static observedAttributes = [
    'for',
    'text',
    'mode',
    'icon',
    'icon-position',
    'icon-size',
    'icon-gap',
    'x',
    'y',
    'data-x',
    'data-y',
    'max-width',
    'max-chars',
    'max-height',
    'max-lines',
    'ellipsis',
    'overflow',
    'strategy',
    'max-rotation',
    'enable-tooltip',
    'line-height',
    'font-size',
    'font-weight',
    'font-family',
    'color',
    'bg-color',
    'border-color',
    'border-radius',
    'padding',
    'anchor',
    'baseline',
    'rotation',
    'format'
  ];

  #engine = new LabelEngine();
  #renderer?: CustomLabelRenderer;
  #formatter?: ((text: string, descriptor: LabelDescriptor) => string) | string;
  #iconNode?: string | SVGElement | HTMLElement;
  #overflowConfig?: LabelOverflowStrategy | LabelOverflowConfig;
  #tooltipConfig?: boolean | TooltipConfig<LabelDescriptor>;
  #lastMeasured: MeasuredLabel | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const sheet = getLabelStyleSheet();
    if (sheet && 'adoptedStyleSheets' in shadow) {
      shadow.adoptedStyleSheets = [sheet];
    }
    shadow.append(labelTemplate.content.cloneNode(true));
  }

  connectedCallback(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    slot?.addEventListener('slotchange', () => {
      this.#notifyParentChart();
      this.renderStandalone();
    });
    this.renderStandalone();
    this.#notifyParentChart();
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
      this.renderStandalone();
      this.#notifyParentChart();
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

  get mode(): LabelRenderMode {
    return (this.getAttribute('mode') as LabelRenderMode) || 'svg';
  }
  set mode(val: LabelRenderMode) {
    this.setAttribute('mode', val);
  }

  get icon(): string | SVGElement | HTMLElement | undefined {
    if (this.#iconNode !== undefined) return this.#iconNode;
    const slotIcon = this.querySelector('[slot="icon"]');
    if (slotIcon instanceof HTMLElement || slotIcon instanceof SVGElement) {
      return slotIcon;
    }
    return this.getAttribute('icon') || undefined;
  }
  set icon(val: string | SVGElement | HTMLElement | undefined) {
    this.#iconNode = val;
    this.renderStandalone();
    this.#notifyParentChart();
  }

  get maxWidth(): number | undefined {
    const raw = this.getAttribute('max-width');
    return raw !== null ? Number(raw) : undefined;
  }
  set maxWidth(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-width', String(val));
    else this.removeAttribute('max-width');
  }

  get maxChars(): number | undefined {
    const raw = this.getAttribute('max-chars');
    return raw !== null ? Number(raw) : undefined;
  }
  set maxChars(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-chars', String(val));
    else this.removeAttribute('max-chars');
  }

  get maxLines(): number | undefined {
    const raw = this.getAttribute('max-lines');
    return raw !== null ? Number(raw) : undefined;
  }
  set maxLines(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-lines', String(val));
    else this.removeAttribute('max-lines');
  }

  get ellipsis(): string | undefined {
    return this.getAttribute('ellipsis') ?? undefined;
  }
  set ellipsis(val: string | undefined) {
    if (val !== undefined) this.setAttribute('ellipsis', val);
    else this.removeAttribute('ellipsis');
  }

  get overflow(): LabelOverflowStrategy | LabelOverflowConfig | undefined {
    if (this.#overflowConfig !== undefined) return this.#overflowConfig;
    const raw =
      this.getAttribute('overflow') ?? this.getAttribute('strategy') ?? null;
    return normalizeOverflowStrategy(raw);
  }
  set overflow(val: LabelOverflowStrategy | LabelOverflowConfig | undefined) {
    this.#overflowConfig = val;
    this.renderStandalone();
    this.#notifyParentChart();
  }

  get maxRotation(): number | undefined {
    const raw = this.getAttribute('max-rotation');
    return raw !== null ? Number(raw) : undefined;
  }
  set maxRotation(val: number | undefined) {
    if (val !== undefined) this.setAttribute('max-rotation', String(val));
    else this.removeAttribute('max-rotation');
  }

  get enableTooltip(): boolean | undefined {
    if (this.#tooltipConfig === false) return false;
    const raw = this.getAttribute('enable-tooltip');
    if (raw !== null) return raw !== 'false';
    return undefined;
  }
  set enableTooltip(val: boolean | undefined) {
    if (val !== undefined) this.setAttribute('enable-tooltip', String(val));
    else this.removeAttribute('enable-tooltip');
  }

  get tooltip(): boolean | TooltipConfig<LabelDescriptor> | undefined {
    return this.#tooltipConfig;
  }
  set tooltip(val: boolean | TooltipConfig<LabelDescriptor> | undefined) {
    this.#tooltipConfig = val;
    this.renderStandalone();
    this.#notifyParentChart();
  }

  public getTooltipElement(): MCTooltipElement | null {
    return (
      (this.shadowRoot?.querySelector(
        '.mc-label-tooltip'
      ) as MCTooltipElement | null) ?? null
    );
  }

  get fontSize(): number | undefined {
    const raw = this.getAttribute('font-size');
    return raw !== null ? Number(raw) : undefined;
  }
  set fontSize(val: number | undefined) {
    if (val !== undefined) this.setAttribute('font-size', String(val));
    else this.removeAttribute('font-size');
  }

  get renderer(): CustomLabelRenderer | undefined {
    return this.#renderer;
  }
  set renderer(fn: CustomLabelRenderer | undefined) {
    this.#renderer = fn;
    this.renderStandalone();
    this.#notifyParentChart();
  }

  get formatter():
    | ((text: string, descriptor: LabelDescriptor) => string)
    | string
    | undefined {
    return this.#formatter ?? (this.getAttribute('format') || undefined);
  }
  set formatter(
    fn:
      | ((text: string, descriptor: LabelDescriptor) => string)
      | string
      | undefined
  ) {
    this.#formatter = fn;
    this.renderStandalone();
    this.#notifyParentChart();
  }

  get lastMeasured(): MeasuredLabel | null {
    return this.#lastMeasured;
  }

  public getTemplateHtml(): string | undefined {
    const tpl = this.querySelector('template');
    if (tpl) {
      return tpl.innerHTML.trim();
    }
    const rawFo = this.querySelector('foreignObject');
    if (rawFo) {
      return rawFo.outerHTML;
    }
    return undefined;
  }

  public toStyleOverride(): LabelStyleOverride {
    const padAttr = this.getAttribute('padding');
    const padNum = padAttr !== null ? Number(padAttr) : undefined;
    const padding =
      padNum !== undefined && !Number.isNaN(padNum)
        ? {
            top: padNum,
            right: padNum * 1.5,
            bottom: padNum,
            left: padNum * 1.5
          }
        : undefined;

    // Merge optional nested <mc-truncate> and <mc-tooltip> light-DOM children
    const nestedTruncate = Array.from(this.children).find(
      (el) => el.tagName.toLowerCase() === 'mc-truncate'
    ) as MCTruncateElement | undefined;
    const nestedTruncCfg =
      nestedTruncate && typeof nestedTruncate.toOverflowConfig === 'function'
        ? nestedTruncate.toOverflowConfig()
        : undefined;

    const nestedTooltipEl = Array.from(this.children).find(
      (el) => el.tagName.toLowerCase() === 'mc-tooltip'
    ) as MCTooltipElement | undefined;
    const nestedTipCfg =
      nestedTooltipEl && typeof nestedTooltipEl.toTooltipConfig === 'function'
        ? (nestedTooltipEl.toTooltipConfig() as TooltipConfig<LabelDescriptor>)
        : undefined;

    const ownOverflow = normalizeOverflowInput(this.overflow);
    const mergedOverflowObj: LabelOverflowConfig = {
      ...(nestedTruncCfg ?? {}),
      ...ownOverflow
    };
    const hasMergedOverflow = Object.keys(mergedOverflowObj).length > 0;

    const resolvedMaxWidth = this.maxWidth ?? nestedTruncCfg?.maxWidth;
    const resolvedMaxChars = this.maxChars ?? nestedTruncCfg?.maxChars;
    const resolvedMaxLines = this.maxLines ?? nestedTruncCfg?.maxLines;
    const resolvedEllipsis = this.ellipsis ?? nestedTruncCfg?.ellipsis;
    const resolvedMaxRotation = this.maxRotation ?? nestedTruncCfg?.maxRotation;

    let resolvedTooltip: boolean | TooltipConfig<LabelDescriptor> | undefined =
      this.#tooltipConfig;
    if (resolvedTooltip === undefined) {
      resolvedTooltip = nestedTipCfg ?? nestedTruncCfg?.tooltip;
    } else if (
      resolvedTooltip &&
      typeof resolvedTooltip === 'object' &&
      (nestedTipCfg ||
        (nestedTruncCfg?.tooltip &&
          typeof nestedTruncCfg.tooltip === 'object'))
    ) {
      resolvedTooltip = {
        ...(typeof nestedTruncCfg?.tooltip === 'object'
          ? nestedTruncCfg.tooltip
          : {}),
        ...(nestedTipCfg ?? {}),
        ...resolvedTooltip
      };
    }

    const resolvedEnableTooltip =
      this.enableTooltip ??
      nestedTruncCfg?.enableTooltip ??
      (resolvedTooltip === false
        ? false
        : typeof resolvedTooltip === 'object' &&
          resolvedTooltip.enabled === false
        ? false
        : undefined);

    return {
      target: this.target,
      renderMode: (this.getAttribute('mode') as LabelRenderMode) || undefined,
      maxWidth: resolvedMaxWidth,
      maxChars: resolvedMaxChars,
      maxLines: resolvedMaxLines,
      ellipsis: resolvedEllipsis,
      overflow: hasMergedOverflow ? mergedOverflowObj : undefined,
      maxRotation: resolvedMaxRotation,
      enableTooltip: resolvedEnableTooltip,
      tooltip: resolvedTooltip,
      lineHeight: this.hasAttribute('line-height')
        ? Number(this.getAttribute('line-height'))
        : undefined,
      fontSize: this.fontSize,
      fontWeight: this.getAttribute('font-weight') || undefined,
      fontFamily: this.getAttribute('font-family') || undefined,
      color: this.getAttribute('color') || undefined,
      background: this.getAttribute('bg-color') || undefined,
      borderColor: this.getAttribute('border-color') || undefined,
      borderRadius: this.hasAttribute('border-radius')
        ? Number(this.getAttribute('border-radius'))
        : undefined,
      padding,
      rotation: this.hasAttribute('rotation')
        ? Number(this.getAttribute('rotation'))
        : undefined,
      templateHtml: this.getTemplateHtml(),
      icon: this.icon,
      iconPosition:
        (this.getAttribute('icon-position') as 'start' | 'end') || undefined,
      iconSize: this.hasAttribute('icon-size')
        ? Number(this.getAttribute('icon-size'))
        : undefined,
      iconGap: this.hasAttribute('icon-gap')
        ? Number(this.getAttribute('icon-gap'))
        : undefined,
      formatter: this.formatter,
      renderer: this.#renderer
    };
  }

  public toDescriptor(defaultX = 0, defaultY = 0): LabelDescriptor {
    const ov = this.toStyleOverride();
    return {
      text: this.text,
      x: this.hasAttribute('x') ? Number(this.getAttribute('x')) : defaultX,
      y: this.hasAttribute('y') ? Number(this.getAttribute('y')) : defaultY,
      type: ov.target === 'all' ? 'custom' : ov.target,
      anchor:
        (this.getAttribute('anchor') as 'start' | 'middle' | 'end') ||
        'middle',
      baseline:
        (this.getAttribute('baseline') as
          | 'auto'
          | 'middle'
          | 'hanging'
          | 'central'
          | 'alphabetic') || 'middle',
      rotation: ov.rotation,
      maxWidth: ov.maxWidth,
      maxChars: ov.maxChars,
      maxHeight: this.hasAttribute('max-height')
        ? Number(this.getAttribute('max-height'))
        : undefined,
      maxLines: ov.maxLines,
      ellipsis: ov.ellipsis,
      overflow: ov.overflow,
      maxRotation: ov.maxRotation,
      enableTooltip: ov.enableTooltip,
      tooltip: ov.tooltip,
      lineHeight: ov.lineHeight,
      fontSize: ov.fontSize,
      fontWeight: ov.fontWeight,
      fontFamily: ov.fontFamily,
      color: ov.color,
      background: ov.background,
      borderColor: ov.borderColor,
      borderRadius: ov.borderRadius,
      padding: ov.padding,
      renderMode: ov.renderMode ?? 'svg',
      templateHtml: ov.templateHtml,
      icon: ov.icon,
      iconPosition: ov.iconPosition,
      iconSize: ov.iconSize,
      iconGap: ov.iconGap
    };
  }

  public renderStandalone(): void {
    const isChartConfig =
      this.hasAttribute('for') ||
      (this.parentElement &&
        this.parentElement.tagName.toLowerCase().startsWith('mc-'));

    const svg = this.shadowRoot?.querySelector(
      '.mc-label-standalone-svg'
    ) as SVGSVGElement | null;
    if (!svg) return;

    if (isChartConfig && !this.hasAttribute('standalone')) {
      svg.innerHTML = '';
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      return;
    }

    let directText = '';
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent ?? '';
      }
    }
    const text = this.text || directText.trim();
    if (!text && !this.getTemplateHtml() && !this.icon) {
      svg.innerHTML = '';
      return;
    }

    const theme = createDefaultTheme('light', 'shadcn');
    this.#engine.setCustomRenderer(this.#renderer);
    this.#engine.setTooltipHandlers({
      showTooltip: (
        content: TooltipInput<LabelDescriptor>,
        clientX: number,
        clientY: number,
        overrideConfig?: TooltipConfig<LabelDescriptor>
      ) => {
        const tip = this.getTooltipElement();
        const host = this.shadowRoot?.querySelector(
          '.mc-label-host'
        ) as HTMLElement | null;
        if (!tip || !host || typeof tip.show !== 'function') return;
        const payload: TooltipPayload<LabelDescriptor> =
          typeof content === 'string'
            ? {
                chartType: 'label',
                defaultHtml: content,
                clientX,
                clientY
              }
            : {
                ...content,
                chartType: 'label',
                clientX,
                clientY
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
        tip.show(payload, theme, viewportRect, overrideConfig);
      },
      hideTooltip: () => {
        const tip = this.getTooltipElement();
        if (!tip) return;
        if (typeof tip.hide === 'function') tip.hide();
        else tip.hidden = true;
      }
    });

    const desc = this.toDescriptor(0, 0);
    desc.text = text;
    desc.anchor = 'middle';
    desc.baseline = 'middle';

    const measured = this.#engine.measure(desc.text, desc, theme);
    this.#lastMeasured = measured;

    const rad = Math.abs((measured.appliedRotation * Math.PI) / 180);
    const rotatedW =
      measured.appliedRotation !== 0
        ? measured.boxWidth * Math.cos(rad) + measured.boxHeight * Math.sin(rad)
        : measured.boxWidth;
    const rotatedH =
      measured.appliedRotation !== 0
        ? measured.boxWidth * Math.sin(rad) + measured.boxHeight * Math.cos(rad)
        : measured.boxHeight;

    const w = Math.max(40, Math.ceil(rotatedW) + 24);
    const h = Math.max(24, Math.ceil(rotatedH) + 12);
    desc.x = w / 2;
    desc.y = h / 2;

    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = '';
    this.#engine.renderLabel(svg, desc, theme);
  }

  #notifyParentChart(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-label', element: this }
      })
    );
  }
}
