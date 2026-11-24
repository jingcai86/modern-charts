import {
  prepareWithSegments,
  clearCache as clearPretextCache,
  type PreparedTextWithSegments
} from '@chenglou/pretext';
import {
  ensureCanvasTextMeasurementSupport,
  normalizeOverflowInput,
  resolveLabelOverflowConfig,
  truncateWithPretext
} from './label-truncate';
import { resolveElementAnchor } from './tooltip-anchor';
import type {
  ChartTheme,
  CustomLabelRenderer,
  LabelDescriptor,
  LabelOverflowConfig,
  LabelPadding,
  LabelStyleOverride,
  MeasuredLabel,
  ResolvedLabelOverflowConfig,
  TooltipConfig,
  TooltipInput
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

ensureCanvasTextMeasurementSupport();

export interface LabelTooltipHandlers {
  showTooltip: (
    content: TooltipInput<LabelDescriptor>,
    clientX: number,
    clientY: number,
    overrideConfig?: TooltipConfig<LabelDescriptor>
  ) => void;
  hideTooltip: () => void;
  /** Controls whether truncated labels receive `tabindex="0"` and keyboard focus tooltips (default `true`). */
  isFocusable?: boolean;
}

export class LabelEngine {
  private direction: 'ltr' | 'rtl' = 'ltr';
  private preparedCache = new Map<string, PreparedTextWithSegments>();
  private overrides: LabelStyleOverride[] = [];
  private customRenderer?: CustomLabelRenderer;
  private tooltipHandlers?: LabelTooltipHandlers;

  /** Sets the writing direction used by logical start/end label anchors. */
  public setDirection(direction: 'ltr' | 'rtl'): void {
    this.direction = direction;
  }

  private physicalAnchor(anchor: LabelDescriptor['anchor'] = 'middle'): 'left' | 'center' | 'right' {
    if (anchor === 'middle') return 'center';
    return (anchor === 'start') === (this.direction === 'ltr') ? 'left' : 'right';
  }

  public setOverrides(overrides: LabelStyleOverride[]): void {
    this.overrides = overrides;
  }

  public getOverrides(): LabelStyleOverride[] {
    return this.overrides;
  }

  public setCustomRenderer(renderer?: CustomLabelRenderer): void {
    this.customRenderer = renderer;
  }

  public setTooltipHandlers(handlers?: LabelTooltipHandlers): void {
    this.tooltipHandlers = handlers;
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
        if (ov.maxWidth !== undefined) {
          if (ov.target === descriptor.type || descriptor.maxWidth === undefined) {
            descriptor.maxWidth = ov.maxWidth;
          } else {
            descriptor.maxWidth = Math.min(descriptor.maxWidth, ov.maxWidth);
          }
        }
        if (ov.maxChars !== undefined) descriptor.maxChars = ov.maxChars;
        if (ov.maxLines !== undefined) descriptor.maxLines = ov.maxLines;
        if (ov.ellipsis !== undefined) descriptor.ellipsis = ov.ellipsis;
        if (ov.maxRotation !== undefined) {
          descriptor.maxRotation = ov.maxRotation;
        }
        if (ov.overflow !== undefined) {
          const prevOverflow = normalizeOverflowInput(descriptor.overflow);
          const nextOverflow = normalizeOverflowInput(ov.overflow);
          const mergedOverflow: LabelOverflowConfig = {
            ...prevOverflow,
            ...nextOverflow
          };
          if (
            nextOverflow.maxWidth !== undefined &&
            descriptor.maxWidth !== undefined &&
            ov.target !== descriptor.type
          ) {
            mergedOverflow.maxWidth = Math.min(
              descriptor.maxWidth,
              nextOverflow.maxWidth
            );
          }
          if (
            descriptor.enableTooltip === false &&
            ov.target !== descriptor.type &&
            nextOverflow.enableTooltip !== false
          ) {
            mergedOverflow.enableTooltip = false;
          }
          descriptor.overflow = mergedOverflow;
          if (
            nextOverflow.maxWidth !== undefined &&
            (ov.target === descriptor.type || descriptor.maxWidth === undefined)
          ) {
            descriptor.maxWidth = nextOverflow.maxWidth;
          } else if (
            nextOverflow.maxWidth !== undefined &&
            descriptor.maxWidth !== undefined
          ) {
            descriptor.maxWidth = Math.min(
              descriptor.maxWidth,
              nextOverflow.maxWidth
            );
          }
        }
        if (ov.enableTooltip !== undefined) {
          if (
            descriptor.enableTooltip === undefined ||
            ov.target === descriptor.type ||
            ov.enableTooltip === false
          ) {
            descriptor.enableTooltip = ov.enableTooltip;
          }
        }
        if (ov.tooltip !== undefined) {
          if (
            descriptor.enableTooltip !== false ||
            ov.target === descriptor.type ||
            ov.tooltip === false
          ) {
            descriptor.tooltip = ov.tooltip;
          }
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

    const overflow = resolveLabelOverflowConfig(options);
    const explicitRotation = options.rotation ?? 0;

    if (text.length === 0 && iconExtraWidth === 0) {
      return {
        text: '',
        originalText: '',
        displayText: '',
        font,
        lines: [],
        lineCount: 0,
        width: 0,
        height: 0,
        naturalWidth: 0,
        lineHeight,
        truncated: false,
        overflowTriggered: false,
        appliedStrategy: overflow.strategy,
        appliedRotation: explicitRotation,
        iconExtraWidth: 0,
        boxWidth: 0,
        boxHeight: 0
      };
    }

    if (text.length === 0) {
      return {
        text: '',
        originalText: '',
        displayText: '',
        font,
        lines: [],
        lineCount: 1,
        width: iconExtraWidth,
        height: minIconHeight,
        naturalWidth: iconExtraWidth,
        lineHeight,
        truncated: false,
        overflowTriggered: false,
        appliedStrategy: overflow.strategy,
        appliedRotation: explicitRotation,
        iconExtraWidth,
        boxWidth: iconExtraWidth + padding.left + padding.right,
        boxHeight: Math.max(lineHeight, minIconHeight) + padding.top + padding.bottom
      };
    }

    const availWidth =
      overflow.maxWidth !== undefined && overflow.maxWidth > 0
        ? Math.max(
            12,
            overflow.maxWidth - padding.left - padding.right - iconExtraWidth
          )
        : undefined;
    const availHeight =
      options.maxHeight && options.maxHeight > 0
        ? Math.max(
            lineHeight,
            options.maxHeight - padding.top - padding.bottom
          )
        : undefined;

    const truncRes = truncateWithPretext(text, {
      font,
      lineHeight,
      availWidth,
      maxHeight: availHeight,
      explicitRotation: options.rotation,
      overflow,
      getPrepared: (t, f) => this.getPrepared(t, f)
    });

    const lines = truncRes.lines;
    const width = truncRes.width;
    const height = Math.max(lines.length * lineHeight, minIconHeight);

    return {
      text: truncRes.text,
      originalText: truncRes.originalText,
      displayText: truncRes.text,
      font,
      lines,
      lineCount: lines.length,
      width,
      height,
      naturalWidth: truncRes.naturalWidth + iconExtraWidth,
      lineHeight,
      truncated: truncRes.truncated,
      overflowTriggered: truncRes.overflowTriggered,
      appliedStrategy: truncRes.appliedStrategy,
      appliedRotation: truncRes.appliedRotation,
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

    const overflow = resolveLabelOverflowConfig(descriptor);
    const measured = this.measure(descriptor.text, descriptor, theme);
    if (
      measured.lineCount === 0 &&
      !descriptor.templateHtml &&
      !descriptor.icon
    ) {
      return null;
    }

    // For auto-rotated hanging X-axis ticks, align anchor so text tilts cleanly away from the axis line
    if (
      measured.appliedRotation !== 0 &&
      measured.overflowTriggered &&
      descriptor.rotation === undefined &&
      descriptor.type === 'axis-tick' &&
      descriptor.baseline === 'hanging' &&
      (descriptor.anchor ?? 'middle') === 'middle'
    ) {
      descriptor.anchor = (measured.appliedRotation > 0) === (this.direction === 'ltr')
        ? 'start'
        : 'end';
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
        const wrapper = this.createGroupWrapper(descriptor, measured);
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
        this.decorateRenderedLabel(wrapper, descriptor, measured, overflow);
        parent.appendChild(wrapper);
        return wrapper;
      }
    }

    const renderedGroup = defaultRender();
    this.decorateRenderedLabel(renderedGroup, descriptor, measured, overflow);
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
    const anchor = this.physicalAnchor(descriptor.anchor);
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
        anchor === 'center' ? -w / 2 : anchor === 'right' ? -w : 0;
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
    fo.setAttribute('direction', this.direction);
    fo.style.direction = this.direction;
    fo.setAttribute('overflow', 'visible');
  }

  private createGroupWrapper(
    descriptor: LabelDescriptor,
    measured?: MeasuredLabel
  ): SVGGElement {
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
    g.setAttribute('direction', this.direction);
    if (descriptor.id) {
      g.setAttribute('data-label-id', descriptor.id);
    }

    const x = Number.isFinite(descriptor.x) ? descriptor.x : 0;
    const y = Number.isFinite(descriptor.y) ? descriptor.y : 0;
    const rotation = measured ? measured.appliedRotation : descriptor.rotation ?? 0;
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

  private decorateRenderedLabel(
    group: SVGGElement,
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    overflow: ResolvedLabelOverflowConfig
  ): void {
    group.setAttribute('data-truncated', measured.truncated ? 'true' : 'false');
    group.setAttribute('data-overflow-strategy', measured.appliedStrategy);
    if (measured.appliedRotation !== 0) {
      group.setAttribute(
        'data-applied-rotation',
        String(measured.appliedRotation)
      );
    }

    if (!measured.truncated) {
      return;
    }

    group.setAttribute('data-full-text', measured.originalText);
    group.setAttribute('aria-label', measured.originalText);

    if (!overflow.enableTooltip || !this.tooltipHandlers) {
      return;
    }

    const handlers = this.tooltipHandlers;
    const isFocusable = handlers.isFocusable !== false;
    group.classList.add('mc-label--interactive');
    if (isFocusable) {
      group.setAttribute('tabindex', '0');
    }

    // Ensure SVG labels without a background pill still have an easy hit box
    if (
      !group.querySelector('foreignObject') &&
      !group.querySelector('.mc-label-bg') &&
      !group.querySelector('.mc-label-hit')
    ) {
      const anchor = this.physicalAnchor(descriptor.anchor);
      const baseline = descriptor.baseline ?? 'middle';
      const padding: LabelPadding = descriptor.padding ?? {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
      const hitW = Math.max(16, measured.boxWidth + 4);
      const hitH = Math.max(14, measured.boxHeight + 4);
      let rectX = -padding.left - 2;
      if (anchor === 'center') {
        rectX = -hitW / 2;
      } else if (anchor === 'right') {
        rectX = -measured.width - measured.iconExtraWidth - padding.left - 2;
      }
      let rectY = -padding.top - 2;
      if (baseline === 'middle' || baseline === 'central') {
        rectY = -hitH / 2;
      } else if (baseline !== 'hanging') {
        rectY = -hitH + padding.bottom + 2;
      }

      const hitRect = document.createElementNS(SVG_NS, 'rect');
      hitRect.setAttribute('class', 'mc-label-hit');
      hitRect.setAttribute('x', String(rectX));
      hitRect.setAttribute('y', String(rectY));
      hitRect.setAttribute('width', String(hitW));
      hitRect.setAttribute('height', String(hitH));
      hitRect.setAttribute('rx', '3');
      hitRect.setAttribute('fill', 'transparent');
      group.insertBefore(hitRect, group.firstChild);
    }

    const foContainer = group.querySelector(
      '.mc-fo-label'
    ) as HTMLElement | null;
    if (foContainer) {
      foContainer.style.pointerEvents = 'auto';
    }

    const customTip = overflow.tooltip;
    const tooltipOverride: TooltipConfig<LabelDescriptor> = {
      enabled: true,
      position: customTip?.position ?? 'item',
      anchorGap: customTip?.anchorGap ?? 8,
      offsetX: customTip?.offsetX,
      offsetY: customTip?.offsetY,
      className: customTip?.className,
      formatter: customTip?.formatter,
      renderer: customTip?.renderer,
      templateHtml: customTip?.templateHtml
    };

    const showLabelTooltip = (
      source: 'pointer' | 'keyboard',
      clientX: number,
      clientY: number
    ): void => {
      const fallbackAnchor = {
        left: descriptor.x - measured.boxWidth / 2,
        top: descriptor.y - measured.boxHeight / 2,
        width: Math.max(16, measured.boxWidth),
        height: Math.max(14, measured.boxHeight),
        relative: true
      };
      handlers.showTooltip(
        {
          title: measured.originalText,
          value: measured.originalText,
          formattedValue: measured.originalText,
          datum: {
            ...descriptor,
            text: measured.originalText,
            meta: {
              ...(descriptor.meta ?? {}),
              truncated: true,
              displayText: measured.displayText,
              appliedStrategy: measured.appliedStrategy,
              appliedRotation: measured.appliedRotation
            }
          },
          source,
          anchor: resolveElementAnchor(group, fallbackAnchor)
        },
        clientX,
        clientY,
        tooltipOverride
      );
    };

    group.addEventListener('mouseenter', (e: MouseEvent) => {
      showLabelTooltip('pointer', e.clientX, e.clientY);
    });
    group.addEventListener('mouseleave', () => {
      handlers.hideTooltip();
    });
    if (isFocusable) {
      group.addEventListener('focus', () => {
        const r = group.getBoundingClientRect();
        showLabelTooltip('keyboard', r.left + r.width / 2, r.top);
      });
      group.addEventListener('blur', () => {
        handlers.hideTooltip();
      });
      group.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handlers.hideTooltip();
        }
      });
    }
  }

  private renderSvgTextLabel(
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    theme: ChartTheme
  ): SVGGElement {
    const g = this.createGroupWrapper(descriptor, measured);
    const { fontSize, fontWeight, fontFamily } = this.buildFontString(
      descriptor,
      theme
    );
    const anchor = descriptor.anchor ?? 'middle';
    const physicalAnchor = this.physicalAnchor(anchor);
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
      if (physicalAnchor === 'center') {
        rectX = -measured.boxWidth / 2;
      } else if (physicalAnchor === 'right') {
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
    textEl.setAttribute('direction', this.direction);
    textEl.setAttribute('unicode-bidi', 'isolate');
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
    const g = this.createGroupWrapper(descriptor, measured);
    const htmlContent = descriptor.templateHtml
      ? this.interpolateTemplate(descriptor.templateHtml, descriptor, measured)
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
    const physicalAnchor = this.physicalAnchor(anchor);
    const baseline = descriptor.baseline ?? 'middle';

    const hasBoxStyle = Boolean(descriptor.background || descriptor.borderColor);
    const extraW = hasBoxStyle ? 18 : 4;
    const extraH = hasBoxStyle ? 8 : 2;
    const boxW = Math.max(hasBoxStyle ? 26 : 16, measured.boxWidth + extraW);
    const boxH = Math.max(hasBoxStyle ? 20 : 16, measured.boxHeight + extraH);

    let offsetX = 0;
    if (physicalAnchor === 'center') offsetX = -boxW / 2;
    else if (physicalAnchor === 'right') offsetX = -boxW;

    let offsetY = 0;
    if (baseline === 'middle' || baseline === 'central') offsetY = -boxH / 2;
    else if (baseline !== 'hanging') offsetY = -boxH;

    fo.setAttribute('x', String(Math.round(offsetX)));
    fo.setAttribute('y', String(Math.round(offsetY)));
    fo.setAttribute('width', String(Math.ceil(boxW)));
    fo.setAttribute('height', String(Math.ceil(boxH)));
    fo.setAttribute('direction', this.direction);
    fo.style.direction = this.direction;
    fo.setAttribute('overflow', 'visible');

    const container = document.createElementNS(
      XHTML_NS,
      'div'
    ) as HTMLDivElement;
    container.setAttribute('xmlns', XHTML_NS);
    container.setAttribute('dir', this.direction);
    container.className = `mc-fo-label mc-fo-label--${descriptor.type}`;
    const justify =
      anchor === 'middle'
        ? 'center'
        : anchor === 'end'
        ? 'flex-end'
        : 'flex-start';
    const textAlign = anchor === 'middle' ? 'center' : anchor;
    const iconGap = descriptor.iconGap ?? 5;

    const styles: string[] = [
      'display: inline-flex',
      'align-items: center',
      `gap: ${iconGap}px`,
      `justify-content: ${justify}`,
      `text-align: ${textAlign}`,
      `direction: ${this.direction}`,
      'width: 100%',
      'height: 100%',
      'box-sizing: border-box',
      `font-family: ${fontFamily}`,
      `font-size: ${fontSize}px`,
      `font-weight: ${fontWeight}`,
      `line-height: ${measured.lineHeight}px`,
      `color: ${descriptor.color ?? theme.textColor}`,
      'overflow-wrap: break-word',
      'pointer-events: none',
      'user-select: none'
    ];
    if (descriptor.background) {
      styles.push(`background: ${descriptor.background}`);
    }
    if (descriptor.borderColor) {
      styles.push(`border: 1px solid ${descriptor.borderColor}`);
    }
    if (descriptor.borderRadius !== undefined || hasBoxStyle) {
      styles.push(`border-radius: ${descriptor.borderRadius ?? 6}px`);
    }
    if (descriptor.padding) {
      styles.push(
        `padding: ${descriptor.padding.top}px ${descriptor.padding.right}px ${descriptor.padding.bottom}px ${descriptor.padding.left}px`
      );
    } else if (hasBoxStyle) {
      styles.push('padding: 2px 6px');
    }

    container.style.cssText = styles.join('; ');

    if (content instanceof HTMLElement) {
      container.replaceChildren(content);
    } else if (typeof content === 'string') {
      container.innerHTML = content;
    } else {
      const iconNode = this.buildIconNode(descriptor, fontSize);
      const hasText = Boolean(descriptor.text);
      const textSpan = hasText
        ? (document.createElementNS(XHTML_NS, 'span') as HTMLSpanElement)
        : null;
      if (textSpan) {
        textSpan.className = 'mc-fo-label-text';
        textSpan.textContent = measured.displayText;
      }

      if (iconNode && textSpan && descriptor.iconPosition === 'end') {
        container.append(textSpan, iconNode);
      } else if (iconNode && textSpan) {
        container.append(iconNode, textSpan);
      } else if (iconNode) {
        container.append(iconNode);
      } else if (textSpan) {
        container.append(textSpan);
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
    descriptor: LabelDescriptor,
    measured?: MeasuredLabel
  ): string {
    const datumObj =
      descriptor.datum && typeof descriptor.datum === 'object'
        ? (descriptor.datum as Record<string, unknown>)
        : {};
    const metaObj = descriptor.meta ?? {};
    const iconStr =
      typeof descriptor.icon === 'string' ? descriptor.icon : '';
    const displayText = measured ? measured.displayText : descriptor.text;
    const originalText = measured ? measured.originalText : descriptor.text;
    return template.replace(/\{\{\s*([\p{ID_Continue}$._\u200c\u200d-]+)\s*\}\}/gu, (_, key: string) => {
      if (key === 'text') return displayText;
      if (key === 'originalText' || key === 'fullText') return originalText;
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
