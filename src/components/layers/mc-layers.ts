import { createDefaultTheme, resolvePaletteColors } from '../../core/theme';
import type {
  AxisPosition,
  ChartPaletteName,
  ChartRenderContext,
  ChartTheme,
  CustomLayerRenderer,
  ScaleAxisConfig,
  ScaleConfig,
  ScaleType,
  ViewConfig
} from '../../core/types';
import { MCLabelElement } from '../mc-label';
import { MCAnimationLayer } from '../mc-animation';
import { MCAriaLayer } from '../mc-aria';

export { MCAnimationLayer, MCAriaLayer };

const SVG_NS = 'http://www.w3.org/2000/svg';

abstract class MCConfigBaseElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback(): void {
    this.style.display = 'none';
    this.notifyChange();
  }

  connectedMoveCallback(): void {
    this.notifyChange();
  }

  disconnectedCallback(): void {
    this.notifyChange();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.notifyChange();
    }
  }

  protected notifyChange(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: this.tagName.toLowerCase(), element: this }
      })
    );
  }
}

/**
 * `<mc-theme-layer>`
 * Nivo/ECharts-inspired theme component for palettes, light/dark mode, typography,
 * grid/axis styling, and default label render mode.
 */
export class MCThemeLayer extends MCConfigBaseElement {
  static observedAttributes = [
    'mode',
    'palette',
    'colors',
    'background',
    'text-color',
    'muted-text-color',
    'font-family',
    'font-size',
    'axis-color',
    'grid-color',
    'grid-dash',
    'label-mode'
  ];

  #customColors?: string[];

  get colors(): string[] | undefined {
    if (this.#customColors) return this.#customColors;
    const attr = this.getAttribute('colors');
    if (attr) {
      try {
        return attr.startsWith('[')
          ? JSON.parse(attr)
          : attr.split(',').map((s) => s.trim());
      } catch {
        return attr.split(',').map((s) => s.trim());
      }
    }
    return undefined;
  }

  set colors(val: string[] | undefined) {
    this.#customColors = val;
    this.notifyChange();
  }

  public applyFromConfig(
    theme: Partial<Omit<ChartTheme, 'mode'>> & { mode?: 'light' | 'dark' | 'system' }
  ): void {
    if (theme.mode) this.setAttribute('mode', theme.mode);
    if (theme.palette) this.setAttribute('palette', theme.palette);
    this.#customColors = theme.colors;
    if (theme.background) this.setAttribute('background', theme.background);
    else this.removeAttribute('background');
    if (theme.textColor) this.setAttribute('text-color', theme.textColor);
    else this.removeAttribute('text-color');
    if (theme.mutedTextColor)
      this.setAttribute('muted-text-color', theme.mutedTextColor);
    else this.removeAttribute('muted-text-color');
    if (theme.fontFamily) this.setAttribute('font-family', theme.fontFamily);
    if (theme.fontSize !== undefined)
      this.setAttribute('font-size', String(theme.fontSize));
    if (theme.axisColor) this.setAttribute('axis-color', theme.axisColor);
    else this.removeAttribute('axis-color');
    if (theme.gridColor) this.setAttribute('grid-color', theme.gridColor);
    else this.removeAttribute('grid-color');
    if (theme.gridStrokeDasharray)
      this.setAttribute('grid-dash', theme.gridStrokeDasharray);
    if (theme.labelRenderMode)
      this.setAttribute('label-mode', theme.labelRenderMode);
  }

  public getTheme(baseMode?: 'light' | 'dark' | 'system'): ChartTheme {
    const mode =
      (this.getAttribute('mode') as 'light' | 'dark' | 'system') ||
      baseMode ||
      'light';
    const palette =
      (this.getAttribute('palette') as ChartPaletteName) || 'shadcn';
    const base = createDefaultTheme(mode, palette);
    const customColors = this.colors;

    return {
      ...base,
      colors:
        customColors && customColors.length > 0
          ? customColors
          : resolvePaletteColors(palette),
      background: this.getAttribute('background') || base.background,
      textColor: this.getAttribute('text-color') || base.textColor,
      mutedTextColor:
        this.getAttribute('muted-text-color') || base.mutedTextColor,
      fontFamily: this.getAttribute('font-family') || base.fontFamily,
      fontSize: this.hasAttribute('font-size')
        ? Number(this.getAttribute('font-size'))
        : base.fontSize,
      axisColor: this.getAttribute('axis-color') || base.axisColor,
      gridColor: this.getAttribute('grid-color') || base.gridColor,
      gridStrokeDasharray:
        this.getAttribute('grid-dash') || base.gridStrokeDasharray,
      labelRenderMode:
        (this.getAttribute('label-mode') as 'svg' | 'foreignObject') ||
        base.labelRenderMode
    };
  }
}

/**
 * `<mc-scale-layer>`
 * Configurable D3 scale component used by Cartesian/Polar/Matrix charts
 * (Line, Bar, Heatmap, Scatter, Radar).
 */
export class MCScaleLayer extends MCConfigBaseElement {
  static observedAttributes = [
    'target',
    'type',
    'position',
    'title',
    'tick-count',
    'min',
    'max',
    'stacked',
    'reverse',
    'nice',
    'clamp',
    'base',
    'constant',
    'padding',
    'inner-padding',
    'outer-padding',
    'scheme',
    'x-type',
    'x-position',
    'x-title',
    'x-tick-count',
    'x-min',
    'x-max',
    'x-padding',
    'x-reverse',
    'x-nice',
    'x-clamp',
    'x-base',
    'x-constant',
    'y-type',
    'y-position',
    'y-title',
    'y-tick-count',
    'y-min',
    'y-max',
    'y-stacked',
    'y-reverse',
    'y-nice',
    'y-clamp',
    'y-base',
    'y-constant',
    'color-scheme'
  ];

  private parseBound(val: string | null): number | 'auto' | undefined {
    if (val === null || val === '') return undefined;
    if (val === 'auto') return 'auto';
    const num = Number(val);
    return Number.isNaN(num) ? 'auto' : num;
  }

  private mergeAxisPosition(
    existing: AxisPosition | undefined,
    incoming: string | null,
    axisKind: 'x' | 'y'
  ): AxisPosition | undefined {
    if (!incoming) return existing;
    const raw = incoming.trim().toLowerCase() as AxisPosition;
    if (
      raw !== 'top' &&
      raw !== 'right' &&
      raw !== 'bottom' &&
      raw !== 'left' &&
      raw !== 'both' &&
      raw !== 'none'
    ) {
      return existing;
    }
    if (raw === 'both' || raw === 'none') return raw;
    if (
      axisKind === 'x' &&
      ((existing === 'bottom' && raw === 'top') ||
        (existing === 'top' && raw === 'bottom'))
    ) {
      return 'both';
    }
    if (
      axisKind === 'y' &&
      ((existing === 'left' && raw === 'right') ||
        (existing === 'right' && raw === 'left'))
    ) {
      return 'both';
    }
    return raw;
  }

  public applyFromConfig(scaleCfg: Partial<ScaleConfig>): void {
    if (scaleCfg.x) {
      if (scaleCfg.x.type) this.setAttribute('x-type', scaleCfg.x.type);
      if (scaleCfg.x.position)
        this.setAttribute('x-position', scaleCfg.x.position);
      if (scaleCfg.x.title !== undefined)
        this.setAttribute('x-title', scaleCfg.x.title);
      if (scaleCfg.x.tickCount !== undefined)
        this.setAttribute('x-tick-count', String(scaleCfg.x.tickCount));
      if (scaleCfg.x.min !== undefined)
        this.setAttribute('x-min', String(scaleCfg.x.min));
      if (scaleCfg.x.max !== undefined)
        this.setAttribute('x-max', String(scaleCfg.x.max));
      if (scaleCfg.x.padding !== undefined)
        this.setAttribute('x-padding', String(scaleCfg.x.padding));
      if (scaleCfg.x.reverse !== undefined)
        this.setAttribute('x-reverse', String(scaleCfg.x.reverse));
      if (scaleCfg.x.nice !== undefined)
        this.setAttribute('x-nice', String(scaleCfg.x.nice));
      if (scaleCfg.x.clamp !== undefined)
        this.setAttribute('x-clamp', String(scaleCfg.x.clamp));
      if (scaleCfg.x.base !== undefined)
        this.setAttribute('x-base', String(scaleCfg.x.base));
      if (scaleCfg.x.constant !== undefined)
        this.setAttribute('x-constant', String(scaleCfg.x.constant));
    }
    if (scaleCfg.y) {
      if (scaleCfg.y.type) this.setAttribute('y-type', scaleCfg.y.type);
      if (scaleCfg.y.position)
        this.setAttribute('y-position', scaleCfg.y.position);
      if (scaleCfg.y.title !== undefined)
        this.setAttribute('y-title', scaleCfg.y.title);
      if (scaleCfg.y.tickCount !== undefined)
        this.setAttribute('y-tick-count', String(scaleCfg.y.tickCount));
      if (scaleCfg.y.min !== undefined)
        this.setAttribute('y-min', String(scaleCfg.y.min));
      if (scaleCfg.y.max !== undefined)
        this.setAttribute('y-max', String(scaleCfg.y.max));
      if (scaleCfg.y.stacked !== undefined)
        this.setAttribute('y-stacked', String(scaleCfg.y.stacked));
      if (scaleCfg.y.reverse !== undefined)
        this.setAttribute('y-reverse', String(scaleCfg.y.reverse));
      if (scaleCfg.y.nice !== undefined)
        this.setAttribute('y-nice', String(scaleCfg.y.nice));
      if (scaleCfg.y.clamp !== undefined)
        this.setAttribute('y-clamp', String(scaleCfg.y.clamp));
      if (scaleCfg.y.base !== undefined)
        this.setAttribute('y-base', String(scaleCfg.y.base));
      if (scaleCfg.y.constant !== undefined)
        this.setAttribute('y-constant', String(scaleCfg.y.constant));
    }
    if (scaleCfg.color?.scheme) {
      this.setAttribute('color-scheme', scaleCfg.color.scheme);
    }
  }

  public applyToConfig(base: ScaleConfig): ScaleConfig {
    const next: ScaleConfig = {
      x: { ...base.x },
      y: { ...base.y },
      color: base.color ? { ...base.color } : undefined,
      size: base.size ? { ...base.size } : undefined
    };

    const rawTarget = this.getAttribute('target');
    const posAttr = this.getAttribute('position')?.trim().toLowerCase();
    const inferredTarget: 'x' | 'y' | null =
      rawTarget === 'x' || rawTarget === 'y'
        ? rawTarget
        : posAttr === 'top' || posAttr === 'bottom'
        ? 'x'
        : posAttr === 'left' || posAttr === 'right'
        ? 'y'
        : null;

    if (inferredTarget === 'x' || inferredTarget === 'y') {
      const axis: ScaleAxisConfig = next[inferredTarget];
      if (this.hasAttribute('type'))
        axis.type = this.getAttribute('type') as ScaleType;
      if (this.hasAttribute('position')) {
        axis.position = this.mergeAxisPosition(
          axis.position,
          this.getAttribute('position'),
          inferredTarget
        );
      }
      if (this.hasAttribute('title'))
        axis.title = this.getAttribute('title') || undefined;
      if (this.hasAttribute('tick-count'))
        axis.tickCount = Number(this.getAttribute('tick-count'));
      if (this.hasAttribute('min'))
        axis.min = this.parseBound(this.getAttribute('min'));
      if (this.hasAttribute('max'))
        axis.max = this.parseBound(this.getAttribute('max'));
      if (this.hasAttribute('stacked'))
        axis.stacked = this.getAttribute('stacked') !== 'false';
      if (this.hasAttribute('reverse'))
        axis.reverse = this.getAttribute('reverse') !== 'false';
      if (this.hasAttribute('nice'))
        axis.nice = this.getAttribute('nice') !== 'false';
      if (this.hasAttribute('clamp'))
        axis.clamp = this.getAttribute('clamp') !== 'false';
      if (this.hasAttribute('base'))
        axis.base = Number(this.getAttribute('base'));
      if (this.hasAttribute('constant'))
        axis.constant = Number(this.getAttribute('constant'));
      if (this.hasAttribute('padding'))
        axis.padding = Number(this.getAttribute('padding'));
      if (this.hasAttribute('inner-padding'))
        axis.innerPadding = Number(this.getAttribute('inner-padding'));
      if (this.hasAttribute('outer-padding'))
        axis.outerPadding = Number(this.getAttribute('outer-padding'));
    }

    // Combined shorthand attributes on a single <mc-scale-layer>
    if (this.hasAttribute('x-type'))
      next.x.type = this.getAttribute('x-type') as ScaleType;
    if (this.hasAttribute('x-position')) {
      next.x.position = this.mergeAxisPosition(
        next.x.position,
        this.getAttribute('x-position'),
        'x'
      );
    }
    if (this.hasAttribute('x-title'))
      next.x.title = this.getAttribute('x-title') || undefined;
    if (this.hasAttribute('x-tick-count'))
      next.x.tickCount = Number(this.getAttribute('x-tick-count'));
    if (this.hasAttribute('x-min'))
      next.x.min = this.parseBound(this.getAttribute('x-min'));
    if (this.hasAttribute('x-max'))
      next.x.max = this.parseBound(this.getAttribute('x-max'));
    if (this.hasAttribute('x-padding'))
      next.x.padding = Number(this.getAttribute('x-padding'));
    if (this.hasAttribute('x-reverse'))
      next.x.reverse = this.getAttribute('x-reverse') !== 'false';
    if (this.hasAttribute('x-nice'))
      next.x.nice = this.getAttribute('x-nice') !== 'false';
    if (this.hasAttribute('x-clamp'))
      next.x.clamp = this.getAttribute('x-clamp') !== 'false';
    if (this.hasAttribute('x-base'))
      next.x.base = Number(this.getAttribute('x-base'));
    if (this.hasAttribute('x-constant'))
      next.x.constant = Number(this.getAttribute('x-constant'));

    if (this.hasAttribute('y-type'))
      next.y.type = this.getAttribute('y-type') as ScaleType;
    if (this.hasAttribute('y-position')) {
      next.y.position = this.mergeAxisPosition(
        next.y.position,
        this.getAttribute('y-position'),
        'y'
      );
    }
    if (this.hasAttribute('y-title'))
      next.y.title = this.getAttribute('y-title') || undefined;
    if (this.hasAttribute('y-tick-count'))
      next.y.tickCount = Number(this.getAttribute('y-tick-count'));
    if (this.hasAttribute('y-min'))
      next.y.min = this.parseBound(this.getAttribute('y-min'));
    if (this.hasAttribute('y-max'))
      next.y.max = this.parseBound(this.getAttribute('y-max'));
    if (
      this.hasAttribute('y-stacked') ||
      (!inferredTarget && this.hasAttribute('stacked'))
    ) {
      next.y.stacked =
        this.getAttribute('y-stacked') !== 'false' &&
        this.getAttribute('stacked') !== 'false';
    }
    if (this.hasAttribute('y-reverse'))
      next.y.reverse = this.getAttribute('y-reverse') !== 'false';
    if (this.hasAttribute('y-nice'))
      next.y.nice = this.getAttribute('y-nice') !== 'false';
    if (this.hasAttribute('y-clamp'))
      next.y.clamp = this.getAttribute('y-clamp') !== 'false';
    if (this.hasAttribute('y-base'))
      next.y.base = Number(this.getAttribute('y-base'));
    if (this.hasAttribute('y-constant'))
      next.y.constant = Number(this.getAttribute('y-constant'));

    const colorScheme =
      this.getAttribute('color-scheme') || this.getAttribute('scheme');
    if (colorScheme) {
      next.color = {
        ...next.color,
        scheme: colorScheme
      };
    }

    return next;
  }
}

/**
 * `<mc-view-layer>`
 * ECharts-inspired Viewport / Roam / DataZoom layer component enabling pan, zoom,
 * zoom bounds, and optional interactive on-chart zoom controls.
 */
export class MCViewLayer extends MCConfigBaseElement {
  static observedAttributes = [
    'zoomable',
    'pannable',
    'min-zoom',
    'max-zoom',
    'direction',
    'show-controls',
    'initial-zoom',
    'initial-pan-x',
    'initial-pan-y'
  ];

  public applyFromConfig(viewCfg: Partial<ViewConfig>): void {
    if (viewCfg.zoomable !== undefined)
      this.setAttribute('zoomable', String(viewCfg.zoomable));
    if (viewCfg.pannable !== undefined)
      this.setAttribute('pannable', String(viewCfg.pannable));
    if (viewCfg.minZoom !== undefined)
      this.setAttribute('min-zoom', String(viewCfg.minZoom));
    if (viewCfg.maxZoom !== undefined)
      this.setAttribute('max-zoom', String(viewCfg.maxZoom));
    if (viewCfg.direction) this.setAttribute('direction', viewCfg.direction);
    if (viewCfg.showControls !== undefined)
      this.setAttribute('show-controls', String(viewCfg.showControls));
    if (viewCfg.initialZoom !== undefined)
      this.setAttribute('initial-zoom', String(viewCfg.initialZoom));
    if (viewCfg.initialPanX !== undefined)
      this.setAttribute('initial-pan-x', String(viewCfg.initialPanX));
    if (viewCfg.initialPanY !== undefined)
      this.setAttribute('initial-pan-y', String(viewCfg.initialPanY));
  }

  public getViewConfig(): ViewConfig {
    const zoomable =
      !this.hasAttribute('zoomable') ||
      this.getAttribute('zoomable') !== 'false';
    const pannable =
      !this.hasAttribute('pannable') ||
      this.getAttribute('pannable') !== 'false';
    return {
      enabled: zoomable || pannable,
      zoomable,
      pannable,
      minZoom: this.hasAttribute('min-zoom')
        ? Number(this.getAttribute('min-zoom'))
        : 0.5,
      maxZoom: this.hasAttribute('max-zoom')
        ? Number(this.getAttribute('max-zoom'))
        : 8,
      direction:
        (this.getAttribute('direction') as 'xy' | 'x' | 'y') || 'xy',
      showControls:
        !this.hasAttribute('show-controls') ||
        this.getAttribute('show-controls') !== 'false',
      initialZoom: this.hasAttribute('initial-zoom')
        ? Number(this.getAttribute('initial-zoom'))
        : 1,
      initialPanX: this.hasAttribute('initial-pan-x')
        ? Number(this.getAttribute('initial-pan-x'))
        : 0,
      initialPanY: this.hasAttribute('initial-pan-y')
        ? Number(this.getAttribute('initial-pan-y'))
        : 0
    };
  }
}

/**
 * `<mc-chart-layer>`
 * Represents a single named visual layer in a chart's layer stack.
 */
export class MCChartLayer extends MCConfigBaseElement {
  static observedAttributes = ['name', 'enabled', 'opacity'];

  get layerName(): string {
    return this.getAttribute('name') ?? '';
  }
  set layerName(val: string) {
    this.setAttribute('name', val);
  }

  get enabled(): boolean {
    return (
      !this.hasAttribute('enabled') ||
      this.getAttribute('enabled') !== 'false'
    );
  }
  set enabled(val: boolean) {
    this.setAttribute('enabled', String(val));
  }

  get opacity(): number {
    return this.hasAttribute('opacity')
      ? Number(this.getAttribute('opacity'))
      : 1;
  }
}

/**
 * `<mc-custom-layer>`
 * Nivo-style custom layer component.
 */
export class MCCustomLayer extends MCConfigBaseElement {
  static observedAttributes = ['name', 'enabled', 'order'];

  #renderer?: CustomLayerRenderer<any>;

  get layerName(): string {
    return this.getAttribute('name') || 'custom-layer';
  }
  set layerName(val: string) {
    this.setAttribute('name', val);
  }

  get enabled(): boolean {
    return (
      !this.hasAttribute('enabled') ||
      this.getAttribute('enabled') !== 'false'
    );
  }
  set enabled(val: boolean) {
    this.setAttribute('enabled', String(val));
  }

  get renderer(): CustomLayerRenderer<any> | undefined {
    return this.#renderer;
  }
  set renderer(fn: CustomLayerRenderer<any> | undefined) {
    this.#renderer = fn;
    this.notifyChange();
  }

  public renderIntoContext(ctx: ChartRenderContext<any>): void {
    if (!this.enabled) return;

    if (this.#renderer) {
      const result = this.#renderer(ctx);
      if (typeof result === 'string') {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', `mc-custom-layer-content`);
        g.innerHTML = result;
        ctx.layerGroup.appendChild(g);
      } else if (result instanceof SVGElement) {
        ctx.layerGroup.appendChild(result);
      }
      return;
    }

    const resolveX = (raw: string | null, fallback = 0): number => {
      if (raw === null) return fallback;
      if (raw.endsWith('%')) {
        return (parseFloat(raw) / 100) * ctx.innerWidth;
      }
      if (ctx.xScale) {
        const num = Number(raw);
        const mapped = ctx.xScale(Number.isNaN(num) ? raw : num);
        if (mapped !== undefined) {
          const bw =
            typeof ctx.xScale.bandwidth === 'function'
              ? ctx.xScale.bandwidth() / 2
              : 0;
          return Number(mapped) + bw;
        }
      }
      const num = Number(raw);
      return Number.isNaN(num) ? fallback : num;
    };

    const resolveY = (raw: string | null, fallback = 0): number => {
      if (raw === null) return fallback;
      if (raw.endsWith('%')) {
        return (parseFloat(raw) / 100) * ctx.innerHeight;
      }
      if (ctx.yScale) {
        const num = Number(raw);
        const mapped = ctx.yScale(Number.isNaN(num) ? raw : num);
        if (mapped !== undefined) {
          const bw =
            typeof ctx.yScale.bandwidth === 'function'
              ? ctx.yScale.bandwidth() / 2
              : 0;
          return Number(mapped) + bw;
        }
      }
      const num = Number(raw);
      return Number.isNaN(num) ? fallback : num;
    };

    const tpl = this.querySelector('template');
    const sourceRoot: Element | DocumentFragment = tpl
      ? (tpl.content.cloneNode(true) as DocumentFragment)
      : this;

    Array.from(sourceRoot.children).forEach((child) => {
      if (child.tagName.toLowerCase() === 'template') return;

      if (child.tagName.toLowerCase() === 'mc-label') {
        const labelEl = child as MCLabelElement;
        const x = child.hasAttribute('data-x')
          ? resolveX(child.getAttribute('data-x'), ctx.innerWidth - 8)
          : child.hasAttribute('x')
          ? resolveX(child.getAttribute('x'), ctx.innerWidth - 8)
          : ctx.innerWidth - 8;
        const y = child.hasAttribute('data-y')
          ? resolveY(child.getAttribute('data-y'), 16)
          : child.hasAttribute('y')
          ? resolveY(child.getAttribute('y'), 16)
          : 16;

        const desc =
          typeof labelEl.toDescriptor === 'function'
            ? labelEl.toDescriptor(x, y)
            : {
                text: child.getAttribute('text') || child.textContent || '',
                x,
                y,
                type: 'custom' as const,
                color: child.getAttribute('color') || ctx.theme.textColor,
                background: child.getAttribute('bg-color') || undefined,
                anchor:
                  (child.getAttribute('anchor') as
                    | 'start'
                    | 'middle'
                    | 'end') || 'end',
                renderMode:
                  (child.getAttribute('mode') as 'svg' | 'foreignObject') ||
                  undefined
              };
        desc.x = x;
        desc.y = y;
        ctx.renderLabel(ctx.layerGroup, desc);
        return;
      }

      const svgNode = this.cloneToSvgNamespace(child, resolveX, resolveY, ctx);
      if (svgNode) {
        ctx.layerGroup.appendChild(svgNode);
      }
    });
  }

  private cloneToSvgNamespace(
    el: Element,
    resolveX: (v: string | null, fb?: number) => number,
    resolveY: (v: string | null, fb?: number) => number,
    ctx: ChartRenderContext<any>
  ): SVGElement | null {
    const tag = el.tagName.toLowerCase();
    if (tag === 'mc-label') {
      return null;
    }

    const svgEl = document.createElementNS(SVG_NS, tag);
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'data-x') {
        svgEl.setAttribute('x', String(resolveX(attr.value, 0)));
        if (tag === 'circle')
          svgEl.setAttribute('cx', String(resolveX(attr.value, 0)));
      } else if (attr.name === 'data-y') {
        const y = resolveY(attr.value, 0);
        svgEl.setAttribute('y', String(y));
        if (tag === 'line') {
          svgEl.setAttribute('y1', String(y));
          svgEl.setAttribute('y2', String(y));
          if (!el.hasAttribute('x1') && !el.hasAttribute('data-x1'))
            svgEl.setAttribute('x1', '0');
          if (!el.hasAttribute('x2') && !el.hasAttribute('data-x2'))
            svgEl.setAttribute('x2', String(ctx.innerWidth));
        }
        if (tag === 'circle') svgEl.setAttribute('cy', String(y));
      } else if (attr.name === 'data-x1') {
        svgEl.setAttribute('x1', String(resolveX(attr.value, 0)));
      } else if (attr.name === 'data-x2') {
        svgEl.setAttribute('x2', String(resolveX(attr.value, ctx.innerWidth)));
      } else if (attr.name === 'data-y1') {
        svgEl.setAttribute('y1', String(resolveY(attr.value, 0)));
      } else if (attr.name === 'data-y2') {
        svgEl.setAttribute('y2', String(resolveY(attr.value, ctx.innerHeight)));
      } else {
        svgEl.setAttribute(attr.name, attr.value);
      }
    }

    Array.from(el.children).forEach((child) => {
      if (child.tagName.toLowerCase() === 'mc-label') {
        const x = child.hasAttribute('data-x')
          ? resolveX(child.getAttribute('data-x'), ctx.innerWidth - 10)
          : resolveX(child.getAttribute('x'), ctx.innerWidth - 10);
        const y = child.hasAttribute('data-y')
          ? resolveY(child.getAttribute('data-y'), 0) - 8
          : resolveY(child.getAttribute('y'), 0);
        ctx.renderLabel(svgEl, {
          text: child.getAttribute('text') || child.textContent || '',
          x,
          y,
          type: 'custom',
          anchor:
            (child.getAttribute('anchor') as 'start' | 'middle' | 'end') ||
            'end',
          color: child.getAttribute('color') || ctx.theme.textColor,
          background: child.getAttribute('bg-color') || undefined,
          renderMode:
            (child.getAttribute('mode') as 'svg' | 'foreignObject') || undefined
        });
      } else {
        const clonedChild = this.cloneToSvgNamespace(
          child,
          resolveX,
          resolveY,
          ctx
        );
        if (clonedChild) svgEl.appendChild(clonedChild);
      }
    });

    if (el.children.length === 0 && el.textContent) {
      svgEl.textContent = el.textContent;
    }

    return svgEl;
  }
}
