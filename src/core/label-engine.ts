import {
  prepareWithSegments,
  layoutWithLines,
  measureLineStats,
  measureNaturalWidth,
  clearCache as clearPretextCache,
  type PreparedTextWithSegments
} from '@chenglou/pretext';
import type {
  ChartTheme,
  CustomLabelRenderer,
  LabelDescriptor,
  LabelPadding,
  LabelStyleOverride,
  MeasuredLabel
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

function ensureCanvasTextMeasurementSupport(): void {
  if (typeof HTMLCanvasElement === 'undefined') return;
  try {
    const probe = document.createElement('canvas');
    const ctx = probe.getContext?.('2d');
    if (ctx && typeof ctx.measureText === 'function') {
      const m = ctx.measureText('M');
      if (m && m.width > 0) return;
    }
  } catch {
    // Fallback below
  }

  const estimateWidth = (text: string, font: string): number => {
    const sizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
    const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 12;
    let total = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (ch === ' ') total += fontSize * 0.32;
      else if ("ilI1|.,:;!'".includes(ch)) total += fontSize * 0.34;
      else if ('mwMW@%'.includes(ch)) total += fontSize * 0.82;
      else if (code > 0x2e80) total += fontSize * 1.0;
      else total += fontSize * 0.58;
    }
    return total;
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function (
    contextId: string,
    options?: any
  ) {
    const existing = origGetContext
      ? origGetContext.call(this, contextId as any, options)
      : null;
    if (contextId === '2d') {
      const ctx2d = existing as CanvasRenderingContext2D | null;
      if (ctx2d && typeof ctx2d.measureText === 'function') {
        const test = ctx2d.measureText('M');
        if (test && test.width > 0) return ctx2d;
      }
      const mockCtx: any = existing ?? { font: '12px sans-serif' };
      if (!mockCtx.font) mockCtx.font = '12px sans-serif';
      mockCtx.measureText = (str: string) => ({
        width: estimateWidth(
          String(str ?? ''),
          mockCtx.font || '12px sans-serif'
        )
      });
      return mockCtx;
    }
    return existing;
  };
}

ensureCanvasTextMeasurementSupport();

export class LabelEngine {
  private preparedCache = new Map<string, PreparedTextWithSegments>();
  private overrides: LabelStyleOverride[] = [];
  private customRenderer?: CustomLabelRenderer;

  public setOverrides(overrides: LabelStyleOverride[]): void {
    this.overrides = overrides;
  }

  public getOverrides(): LabelStyleOverride[] {
    return this.overrides;
  }

  public setCustomRenderer(renderer?: CustomLabelRenderer): void {
    this.customRenderer = renderer;
  }

  public clearCache(): void {
    this.preparedCache.clear();
    clearPretextCache();
  }

  public buildFontString(
    descriptor: Partial<LabelDescriptor>,
    theme: ChartTheme
  ): {
    font: string;
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
  } {
    const fontSize = descriptor.fontSize ?? theme.fontSize ?? 12;
    const fontWeight = descriptor.fontWeight ?? 500;
    const fontFamily =
      descriptor.fontFamily ?? theme.fontFamily ?? 'Inter, sans-serif';
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return { font, fontSize, fontWeight, fontFamily };
  }

  public getPrepared(text: string, font: string): PreparedTextWithSegments {
    const key = `${font}::${text}`;
    let prepared = this.preparedCache.get(key);
    if (!prepared) {
      prepared = prepareWithSegments(text, font);
      if (this.preparedCache.size > 2000) {
        const oldestKey = this.preparedCache.keys().next().value;
        if (oldestKey !== undefined) {
          this.preparedCache.delete(oldestKey);
        }
      }
      this.preparedCache.set(key, prepared);
    }
    return prepared;
  }

  public resolveDescriptor(
    raw: LabelDescriptor,
    theme: ChartTheme
  ): { descriptor: LabelDescriptor; override?: LabelStyleOverride } {
    const descriptor: LabelDescriptor = { ...raw };
    let matchedOverride: LabelStyleOverride | undefined;

    for (const ov of this.overrides) {
      if (ov.target === 'all' || ov.target === descriptor.type) {
        matchedOverride = ov;
        if (ov.renderMode) descriptor.renderMode = ov.renderMode;
        if (ov.maxWidth !== undefined && descriptor.maxWidth === undefined) {
          descriptor.maxWidth = ov.maxWidth;
        } else if (ov.maxWidth !== undefined && ov.target === descriptor.type) {
          descriptor.maxWidth = ov.maxWidth;
        }
        if (ov.lineHeight !== undefined) descriptor.lineHeight = ov.lineHeight;
        if (ov.fontSize !== undefined) descriptor.fontSize = ov.fontSize;
        if (ov.fontWeight !== undefined) descriptor.fontWeight = ov.fontWeight;
        if (ov.fontFamily !== undefined) descriptor.fontFamily = ov.fontFamily;
        if (ov.color !== undefined) descriptor.color = ov.color;
        if (ov.background !== undefined) descriptor.background = ov.background;
        if (ov.borderColor !== undefined)
          descriptor.borderColor = ov.borderColor;
        if (ov.borderRadius !== undefined)
          descriptor.borderRadius = ov.borderRadius;
        if (ov.padding !== undefined) descriptor.padding = ov.padding;
        if (ov.rotation !== undefined) descriptor.rotation = ov.rotation;
        if (ov.templateHtml !== undefined)
          descriptor.templateHtml = ov.templateHtml;
        if (ov.icon !== undefined && descriptor.icon === undefined)
          descriptor.icon = ov.icon;
        if (ov.iconPosition !== undefined)
          descriptor.iconPosition = ov.iconPosition;
        if (ov.iconSize !== undefined) descriptor.iconSize = ov.iconSize;
        if (ov.iconGap !== undefined) descriptor.iconGap = ov.iconGap;
        if (ov.formatter) {
          if (typeof ov.formatter === 'function') {
            descriptor.text = ov.formatter(descriptor.text, descriptor);
          } else if (typeof ov.formatter === 'string') {
            descriptor.text = this.interpolateTemplate(
              ov.formatter,
              descriptor
            );
          }
        }
      }
    }

    if (!descriptor.renderMode) {
      // If an HTML/SVG icon or templateHtml is attached, default to foreignObject unless explicitly 'svg'
      if (descriptor.templateHtml || descriptor.icon instanceof HTMLElement || descriptor.icon instanceof SVGElement || (typeof descriptor.icon === 'string' && descriptor.icon.trim().startsWith('<'))) {
        descriptor.renderMode = 'foreignObject';
      } else {
        descriptor.renderMode = theme.labelRenderMode ?? 'svg';
      }
    }
    if (!descriptor.color) {
      descriptor.color = theme.textColor;
    }

    return { descriptor, override: matchedOverride };
  }

  /**
   * Computes extra horizontal & vertical space required by embedded icons
   * (either via `descriptor.icon` or inline `<svg>`, `<img>`, `[data-icon]` inside `templateHtml`).
   */
  public computeIconMetrics(
    options: Partial<LabelDescriptor>,
    fontSize: number
  ): { iconExtraWidth: number; minIconHeight: number } {
    const iconSize = options.iconSize ?? Math.round(fontSize * 1.15);
    const iconGap = options.iconGap ?? 5;
    let iconCount = 0;

    if (options.icon) {
      iconCount += 1;
    }
    if (options.templateHtml) {
      let templateIconCount = 0;
      const tokenRegex = /<(?:svg|img)\b|\bdata-icon\b|class=(?:"([^"]*)"|'([^']*)')/gi;
      for (const match of options.templateHtml.matchAll(tokenRegex)) {
        if (match[1] !== undefined || match[2] !== undefined) {
          const classVal = match[1] ?? match[2] ?? '';
          if (classVal.toLowerCase().includes('icon')) {
            templateIconCount += 1;
          }
        } else {
          templateIconCount += 1;
        }
      }
      if (templateIconCount > 0) {
        iconCount = Math.max(iconCount, templateIconCount);
      }
    }

    if (iconCount === 0) {
      return { iconExtraWidth: 0, minIconHeight: 0 };
    }

    return {
      iconExtraWidth: iconCount * (iconSize + iconGap),
      minIconHeight: iconSize
    };
  }

  /**
   * Measures text (plus any embedded `<foreignObject>` icons) using `@chenglou/pretext`
   * without triggering any DOM layout or reflow.
   */
  public measure(
    rawText: string,
    options: Partial<LabelDescriptor> = {},
    theme: ChartTheme
  ): MeasuredLabel {
    const text = String(rawText ?? '');
    const { font, fontSize } = this.buildFontString(options, theme);
    const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.35);
    const padding: LabelPadding = options.padding ?? {
      top: options.background ? 3 : 0,
      right: options.background ? 6 : 0,
      bottom: options.background ? 3 : 0,
      left: options.background ? 6 : 0
    };

    const { iconExtraWidth, minIconHeight } = this.computeIconMetrics(
      options,
      fontSize
    );

    if (text.length === 0 && iconExtraWidth === 0) {
      return {
        text: '',
        font,
        lines: [],
        lineCount: 0,
        width: 0,
        height: 0,
        naturalWidth: 0,
        lineHeight,
        truncated: false,
        iconExtraWidth: 0,
        boxWidth: 0,
        boxHeight: 0
      };
    }

    if (text.length === 0) {
      return {
        text: '',
        font,
        lines: [],
        lineCount: 1,
        width: iconExtraWidth,
        height: minIconHeight,
        naturalWidth: iconExtraWidth,
        lineHeight,
        truncated: false,
        iconExtraWidth,
        boxWidth: iconExtraWidth + padding.left + padding.right,
        boxHeight: Math.max(lineHeight, minIconHeight) + padding.top + padding.bottom
      };
    }

    const prepared = this.getPrepared(text, font);
    const naturalWidth = Math.ceil(measureNaturalWidth(prepared));
    const maxWidth =
      options.maxWidth && options.maxWidth > 0
        ? Math.max(
            24,
            options.maxWidth - padding.left - padding.right - iconExtraWidth
          )
        : Math.max(naturalWidth + 4, 1000);

    const layoutRes = layoutWithLines(prepared, maxWidth, lineHeight);
    const stats = measureLineStats(prepared, maxWidth);

    let lines = layoutRes.lines.map((l) => ({
      text: l.text,
      width: Math.ceil(l.width)
    }));
    let truncated = false;

    if (options.maxHeight && options.maxHeight > 0) {
      const availHeight = Math.max(
        lineHeight,
        options.maxHeight - padding.top - padding.bottom
      );
      const maxLines = Math.max(1, Math.floor(availHeight / lineHeight));
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        const last = lines[lines.length - 1];
        last.text = last.text.replace(/\s*\S+$/, '') + '…';
        truncated = true;
      }
    }

    const width = Math.min(
      maxWidth,
      Math.ceil(
        lines.length > 0
          ? Math.max(
              ...lines.map((l) => l.width),
              Math.min(stats.maxLineWidth, maxWidth)
            )
          : 0
      )
    );
    const height = Math.max(lines.length * lineHeight, minIconHeight);

    return {
      text,
      font,
      lines,
      lineCount: lines.length,
      width,
      height,
      naturalWidth: naturalWidth + iconExtraWidth,
      lineHeight,
      truncated,
      iconExtraWidth,
      boxWidth: width + iconExtraWidth + padding.left + padding.right,
      boxHeight: height + padding.top + padding.bottom
    };
  }

  /**
   * Renders a label into an SVG container using the universal label system.
   * Supports:
   * - 'svg' mode: `<g class="mc-label"><rect (optional)/><text><tspan.../></text></g>`
   * - 'foreignObject' mode: `<g class="mc-label mc-label-fo"><foreignObject ...>HTML + Icons</foreignObject></g>`
   * - 'custom' renderer callback (which can return a raw `<foreignObject>`, an `SVGElement`, an `HTMLElement` with icons, or an HTML/SVG string!)
   */
  public renderLabel(
    parent: SVGElement,
    rawDescriptor: LabelDescriptor,
    theme: ChartTheme
  ): SVGGElement | null {
    const { descriptor, override } = this.resolveDescriptor(
      rawDescriptor,
      theme
    );
    if (!descriptor.text && !descriptor.templateHtml && !descriptor.icon) {
      return null;
    }

    const measured = this.measure(descriptor.text, descriptor, theme);
    if (
      measured.lineCount === 0 &&
      !descriptor.templateHtml &&
      !descriptor.icon
    ) {
      return null;
    }

    const defaultRender = (): SVGGElement => {
      if (
        descriptor.renderMode === 'foreignObject' ||
        descriptor.templateHtml ||
        descriptor.icon instanceof HTMLElement ||
        descriptor.icon instanceof SVGElement ||
        (typeof descriptor.icon === 'string' &&
          descriptor.icon.trim().startsWith('<'))
      ) {
        return this.renderForeignObjectLabel(descriptor, measured, theme);
      }
      return this.renderSvgTextLabel(descriptor, measured, theme);
    };

    const activeCustomRenderer =
      override?.renderer ?? descriptor.renderer ?? this.customRenderer;
    if (activeCustomRenderer) {
      const customNode = activeCustomRenderer(
        descriptor,
        measured,
        defaultRender
      );
      if (customNode === null) return null;
      if (customNode !== undefined) {
        const wrapper = this.createGroupWrapper(descriptor);
        if (typeof customNode === 'string') {
          const trimmed = customNode.trim();
          if (trimmed.toLowerCase().startsWith('<foreignobject')) {
            wrapper.innerHTML = trimmed;
            const foEl = wrapper.querySelector('foreignObject');
            if (foEl) this.ensureForeignObjectDimensions(foEl, descriptor, measured);
          } else if (
            trimmed.startsWith('<text') ||
            trimmed.startsWith('<g') ||
            trimmed.startsWith('<rect')
          ) {
            wrapper.innerHTML = trimmed;
          } else {
            const fo = this.createForeignObjectNode(
              descriptor,
              measured,
              customNode,
              theme
            );
            wrapper.appendChild(fo);
          }
        } else if (
          customNode instanceof SVGElement &&
          customNode.tagName.toLowerCase() === 'foreignobject'
        ) {
          this.ensureForeignObjectDimensions(
            customNode as SVGForeignObjectElement,
            descriptor,
            measured
          );
          wrapper.appendChild(customNode);
        } else if (customNode instanceof SVGElement) {
          wrapper.appendChild(customNode);
        } else if (customNode instanceof HTMLElement) {
          const fo = this.createForeignObjectNode(
            descriptor,
            measured,
            customNode,
            theme
          );
          wrapper.appendChild(fo);
        }
        parent.appendChild(wrapper);
        return wrapper;
      }
    }

    const renderedGroup = defaultRender();
    parent.appendChild(renderedGroup);
    return renderedGroup;
  }

  private ensureForeignObjectDimensions(
    fo: SVGForeignObjectElement,
    descriptor: LabelDescriptor,
    measured: MeasuredLabel
  ): void {
    const boxW = Math.max(28, measured.boxWidth + 16);
    const boxH = Math.max(20, measured.boxHeight + 8);
    const anchor = descriptor.anchor ?? 'middle';
    const baseline = descriptor.baseline ?? 'middle';

    if (!fo.hasAttribute('width')) {
      fo.setAttribute('width', String(Math.ceil(boxW)));
    }
    if (!fo.hasAttribute('height')) {
      fo.setAttribute('height', String(Math.ceil(boxH)));
    }
    if (!fo.hasAttribute('x')) {
      const w = Number(fo.getAttribute('width')) || boxW;
      const offsetX =
        anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w : 0;
      fo.setAttribute('x', String(Math.round(offsetX)));
    }
    if (!fo.hasAttribute('y')) {
      const h = Number(fo.getAttribute('height')) || boxH;
      const offsetY =
        baseline === 'middle' || baseline === 'central'
          ? -h / 2
          : baseline !== 'hanging'
          ? -h
          : 0;
      fo.setAttribute('y', String(Math.round(offsetY)));
    }
    fo.setAttribute('overflow', 'visible');
  }

  private createGroupWrapper(descriptor: LabelDescriptor): SVGGElement {
    const g = document.createElementNS(SVG_NS, 'g');
    const modeClass =
      descriptor.renderMode === 'foreignObject' ? 'mc-label-fo' : 'mc-label-svg';
    g.setAttribute(
      'class',
      `mc-label ${modeClass} mc-label--${descriptor.type}${
        descriptor.className ? ` ${descriptor.className}` : ''
      }`
    );
    g.setAttribute('part', `label label-${descriptor.type}`);
    g.setAttribute('data-label-type', descriptor.type);
    g.setAttribute('data-label-mode', descriptor.renderMode ?? 'svg');
    if (descriptor.id) {
      g.setAttribute('data-label-id', descriptor.id);
    }

    const x = Number.isFinite(descriptor.x) ? descriptor.x : 0;
    const y = Number.isFinite(descriptor.y) ? descriptor.y : 0;
    const rotation = descriptor.rotation ?? 0;
    if (rotation !== 0) {
      g.setAttribute(
        'transform',
        `translate(${x}, ${y}) rotate(${rotation})`
      );
    } else {
      g.setAttribute('transform', `translate(${x}, ${y})`);
    }
    return g;
  }

  private renderSvgTextLabel(
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    theme: ChartTheme
  ): SVGGElement {
    const g = this.createGroupWrapper(descriptor);
    const { fontSize, fontWeight, fontFamily } = this.buildFontString(
      descriptor,
      theme
    );
    const anchor = descriptor.anchor ?? 'middle';
    const baseline = descriptor.baseline ?? 'middle';
    const padding: LabelPadding = descriptor.padding ?? {
      top: descriptor.background ? 3 : 0,
      right: descriptor.background ? 6 : 0,
      bottom: descriptor.background ? 3 : 0,
      left: descriptor.background ? 6 : 0
    };

    const totalHeight = measured.height;
    let startY = 0;
    if (baseline === 'middle' || baseline === 'central') {
      startY = -totalHeight / 2 + measured.lineHeight * 0.78;
    } else if (baseline === 'hanging') {
      startY = measured.lineHeight * 0.82;
    } else {
      startY = -totalHeight + measured.lineHeight * 0.88;
    }

    if (descriptor.background) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', 'mc-label-bg');
      let rectX = -padding.left;
      if (anchor === 'middle') {
        rectX = -measured.boxWidth / 2;
      } else if (anchor === 'end') {
        rectX = -measured.width - measured.iconExtraWidth - padding.left;
      }
      let rectY = -padding.top;
      if (baseline === 'middle' || baseline === 'central') {
        rectY = -measured.boxHeight / 2;
      } else if (baseline !== 'hanging') {
        rectY = -measured.boxHeight + padding.bottom;
      }
      rect.setAttribute('x', String(rectX));
      rect.setAttribute('y', String(rectY));
      rect.setAttribute('width', String(Math.max(12, measured.boxWidth)));
      rect.setAttribute('height', String(Math.max(12, measured.boxHeight)));
      rect.setAttribute('rx', String(descriptor.borderRadius ?? 4));
      rect.setAttribute('fill', descriptor.background);
      if (descriptor.borderColor) {
        rect.setAttribute('stroke', descriptor.borderColor);
        rect.setAttribute('stroke-width', '1');
      }
      g.appendChild(rect);
    }

    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('class', 'mc-label-text');
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('fill', descriptor.color ?? theme.textColor);
    textEl.setAttribute('font-size', `${fontSize}px`);
    textEl.setAttribute('font-weight', String(fontWeight));
    textEl.setAttribute('font-family', fontFamily);

    const iconPrefix =
      typeof descriptor.icon === 'string' &&
      !descriptor.icon.trim().startsWith('<')
        ? descriptor.iconPosition === 'end'
          ? ''
          : descriptor.text
          ? `${descriptor.icon} `
          : descriptor.icon
        : '';
    const iconSuffix =
      typeof descriptor.icon === 'string' &&
      !descriptor.icon.trim().startsWith('<') &&
      descriptor.iconPosition === 'end'
        ? descriptor.text
          ? ` ${descriptor.icon}`
          : descriptor.icon
        : '';

    if (measured.lines.length <= 1) {
      textEl.setAttribute('x', '0');
      textEl.setAttribute('y', String(startY));
      textEl.textContent = `${iconPrefix}${
        measured.lines[0]?.text ?? descriptor.text
      }${iconSuffix}`;
    } else {
      measured.lines.forEach((line, idx) => {
        const tspan = document.createElementNS(SVG_NS, 'tspan');
        tspan.setAttribute('x', '0');
        tspan.setAttribute('y', String(startY + idx * measured.lineHeight));
        tspan.textContent =
          idx === 0
            ? `${iconPrefix}${line.text}`
            : idx === measured.lines.length - 1
            ? `${line.text}${iconSuffix}`
            : line.text;
        textEl.appendChild(tspan);
      });
    }

    g.appendChild(textEl);
    return g;
  }

  private renderForeignObjectLabel(
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    theme: ChartTheme
  ): SVGGElement {
    const g = this.createGroupWrapper(descriptor);
    const htmlContent = descriptor.templateHtml
      ? this.interpolateTemplate(descriptor.templateHtml, descriptor)
      : undefined;

    // Support raw <foreignObject> inside <template> directly!
    if (
      htmlContent &&
      htmlContent.trim().toLowerCase().startsWith('<foreignobject')
    ) {
      g.innerHTML = htmlContent.trim();
      const rawFo = g.querySelector('foreignObject');
      if (rawFo) {
        this.ensureForeignObjectDimensions(rawFo, descriptor, measured);
      }
      return g;
    }

    const fo = this.createForeignObjectNode(
      descriptor,
      measured,
      htmlContent,
      theme
    );
    g.appendChild(fo);
    return g;
  }

  private createForeignObjectNode(
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    content: string | HTMLElement | undefined,
    theme: ChartTheme
  ): SVGForeignObjectElement {
    const fo = document.createElementNS(SVG_NS, 'foreignObject');
    const { fontSize, fontWeight, fontFamily } = this.buildFontString(
      descriptor,
      theme
    );
    const anchor = descriptor.anchor ?? 'middle';
    const baseline = descriptor.baseline ?? 'middle';

    const extraW = descriptor.background || content || descriptor.icon ? 18 : 8;
    const extraH = descriptor.background || content || descriptor.icon ? 8 : 4;
    const boxW = Math.max(26, measured.boxWidth + extraW);
    const boxH = Math.max(20, measured.boxHeight + extraH);

    let offsetX = 0;
    if (anchor === 'middle') offsetX = -boxW / 2;
    else if (anchor === 'end') offsetX = -boxW;

    let offsetY = 0;
    if (baseline === 'middle' || baseline === 'central') offsetY = -boxH / 2;
    else if (baseline !== 'hanging') offsetY = -boxH;

    fo.setAttribute('x', String(Math.round(offsetX)));
    fo.setAttribute('y', String(Math.round(offsetY)));
    fo.setAttribute('width', String(Math.ceil(boxW)));
    fo.setAttribute('height', String(Math.ceil(boxH)));
    fo.setAttribute('overflow', 'visible');

    const container = document.createElementNS(
      XHTML_NS,
      'div'
    ) as HTMLDivElement;
    container.setAttribute('xmlns', XHTML_NS);
    container.className = `mc-fo-label mc-fo-label--${descriptor.type}`;
    const justify =
      anchor === 'middle'
        ? 'center'
        : anchor === 'end'
        ? 'flex-end'
        : 'flex-start';
    const textAlign =
      anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
    const bg =
      descriptor.background ??
      (theme.mode === 'dark'
        ? 'rgba(30, 41, 59, 0.88)'
        : 'rgba(241, 245, 249, 0.92)');
    const border =
      descriptor.borderColor ??
      (theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.3)'
        : 'rgba(148, 163, 184, 0.45)');
    const iconGap = descriptor.iconGap ?? 5;

    container.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      `gap: ${iconGap}px`,
      `justify-content: ${justify}`,
      `text-align: ${textAlign}`,
      'width: 100%',
      'height: 100%',
      'box-sizing: border-box',
      `font-family: ${fontFamily}`,
      `font-size: ${fontSize}px`,
      `font-weight: ${fontWeight}`,
      `line-height: ${measured.lineHeight}px`,
      `color: ${descriptor.color ?? theme.textColor}`,
      `background: ${bg}`,
      `border: 1px solid ${border}`,
      `border-radius: ${descriptor.borderRadius ?? 6}px`,
      'padding: 2px 6px',
      'overflow-wrap: break-word',
      'pointer-events: none',
      'user-select: none'
    ].join('; ');

    if (content instanceof HTMLElement) {
      container.innerHTML = '';
      container.appendChild(content);
    } else if (typeof content === 'string') {
      container.innerHTML = content;
    } else {
      const iconNode = this.buildIconNode(descriptor, fontSize);
      const textSpan = document.createElementNS(XHTML_NS, 'span');
      textSpan.className = 'mc-fo-label-text';
      textSpan.textContent = descriptor.text;

      if (iconNode && descriptor.iconPosition === 'end') {
        container.append(textSpan, iconNode);
      } else if (iconNode) {
        container.append(iconNode, textSpan);
      } else {
        container.appendChild(textSpan);
      }
    }

    fo.appendChild(container);
    return fo;
  }

  private buildIconNode(
    descriptor: LabelDescriptor,
    fontSize: number
  ): HTMLElement | null {
    if (!descriptor.icon) return null;
    const iconSize = descriptor.iconSize ?? Math.round(fontSize * 1.15);
    const wrap = document.createElementNS(XHTML_NS, 'span') as HTMLSpanElement;
    wrap.className = 'mc-fo-label-icon';
    wrap.setAttribute('data-icon', 'true');
    wrap.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:${iconSize}px;height:${iconSize}px;flex-shrink:0;`;

    if (
      descriptor.icon instanceof HTMLElement ||
      descriptor.icon instanceof SVGElement
    ) {
      wrap.appendChild(descriptor.icon.cloneNode(true));
    } else if (typeof descriptor.icon === 'string') {
      if (descriptor.icon.trim().startsWith('<')) {
        wrap.innerHTML = descriptor.icon;
      } else {
        wrap.textContent = descriptor.icon;
      }
    }
    return wrap;
  }

  public interpolateTemplate(
    template: string,
    descriptor: LabelDescriptor
  ): string {
    const datumObj =
      descriptor.datum && typeof descriptor.datum === 'object'
        ? (descriptor.datum as Record<string, unknown>)
        : {};
    const metaObj = descriptor.meta ?? {};
    const iconStr =
      typeof descriptor.icon === 'string' ? descriptor.icon : '';
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
      if (key === 'text') return descriptor.text;
      if (key === 'type') return descriptor.type;
      if (key === 'icon') return iconStr;
      if (key === 'id') return String(descriptor.id ?? datumObj.id ?? '');
      if (key === 'color') return String(descriptor.color ?? '');
      if (key in metaObj) return String(metaObj[key] ?? '');
      if (key in datumObj) return String(datumObj[key] ?? '');
      return '';
    });
  }
}
