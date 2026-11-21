import { LabelEngine } from '../core/label-engine';
import { createDefaultTheme } from '../core/theme';
import type {
  CustomLabelRenderer,
  LabelDescriptor,
  LabelRenderMode,
  LabelStyleOverride,
  LabelTargetType,
  MeasuredLabel
} from '../core/types';

const labelTemplate = document.createElement('template');
labelTemplate.innerHTML = `
  <div class="mc-label-host" part="container">
    <svg class="mc-label-standalone-svg" part="svg" xmlns="http://www.w3.org/2000/svg"></svg>
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
        display: inline-flex;
        align-items: center;
      }
      .mc-label-standalone-svg {
        overflow: visible;
        display: block;
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
    'max-height',
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

    return {
      target: this.target,
      renderMode: (this.getAttribute('mode') as LabelRenderMode) || undefined,
      maxWidth: this.maxWidth,
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
      maxHeight: this.hasAttribute('max-height')
        ? Number(this.getAttribute('max-height'))
        : undefined,
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

    const text = this.text || (this.textContent?.trim() ?? '');
    if (!text && !this.getTemplateHtml() && !this.icon) {
      svg.innerHTML = '';
      return;
    }

    const theme = createDefaultTheme('light', 'modern');
    this.#engine.setCustomRenderer(this.#renderer);
    const desc = this.toDescriptor(0, 0);
    desc.text = text;
    desc.anchor = 'middle';
    desc.baseline = 'middle';

    const measured = this.#engine.measure(desc.text, desc, theme);
    this.#lastMeasured = measured;

    const w = Math.max(40, measured.boxWidth + 24);
    const h = Math.max(24, measured.boxHeight + 12);
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
