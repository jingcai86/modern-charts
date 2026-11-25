import { HTMLElementBase } from '../core/dom';
import type {
  LineStrokeStyle,
  MarkerAnnotationConfig,
  MarkerAnnotationPosition,
  MarkerCondition,
  MarkerConfig,
  MarkerLabelPosition,
  MarkerLegendConfig,
  MarkerLegendSwatch,
  MarkerMatchScope,
  MarkerMatchStyle,
  MarkerType,
  ScatterSymbolType
} from '../core/types';

/**
 * `<mc-marker>` Web Component
 * Defines a single marker line (`type="line"`), marker area (`type="area"`),
 * or marker point (`type="point"`, ECharts `markPoint`), supporting statistical
 * presets (`value="min|max|average|median"`), `line-style="solid|dashed|dotted"`,
 * threshold conditions (`condition="below|above|between|outside"`),
 * and conditional item styling (`match-color`, `match-fill`, `match-stroke`, `match-opacity`, `match-class`, `match-icon`).
 */
export class MCMarkerElement extends HTMLElementBase {
  static observedAttributes = [
    'id',
    'type',
    'axis',
    'value',
    'from',
    'to',
    'x',
    'y',
    'symbol',
    'size',
    'line-style',
    'label',
    'label-position',
    'label-padding',
    'label-edge-padding',
    'label-offset-x',
    'label-offset-y',
    'icon',
    'stroke',
    'stroke-width',
    'stroke-dasharray',
    'fill',
    'fill-opacity',
    'condition',
    'match-scope',
    'match-color',
    'match-fill',
    'match-stroke',
    'match-stroke-width',
    'match-opacity',
    'match-radius',
    'match-class',
    'match-icon',
    'annotation',
    'annotation-text',
    'annotation-icon',
    'annotation-position',
    'annotation-padding',
    'annotation-offset-x',
    'annotation-offset-y',
    'annotation-enable-tooltip',
    'annotation-tooltip',
    'legend',
    'legend-label',
    'legend-color',
    'legend-swatch',
    'legend-tooltip'
  ];

  #conditionFn?: (value: number, datum?: any) => boolean;
  #matchStyle?: MarkerMatchStyle;
  #annotation?: string | MarkerAnnotationConfig;
  #legend?: boolean | MarkerLegendConfig;

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.style.display = 'none';
    this.#notifyChange();
  }

  connectedMoveCallback(): void {
    this.#notifyChange();
  }

  disconnectedCallback(): void {
    this.#notifyChange();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyChange();
    }
  }

  get condition(): MarkerCondition | undefined {
    if (this.#conditionFn) return this.#conditionFn;
    return (this.getAttribute('condition') as MarkerCondition) || undefined;
  }
  set condition(val: MarkerCondition | undefined) {
    if (typeof val === 'function') {
      this.#conditionFn = val;
    } else if (val) {
      this.#conditionFn = undefined;
      this.setAttribute('condition', val);
    } else {
      this.#conditionFn = undefined;
      this.removeAttribute('condition');
    }
    this.#notifyChange();
  }

  get matchStyle(): MarkerMatchStyle | undefined {
    return this.#matchStyle;
  }
  set matchStyle(val: MarkerMatchStyle | undefined) {
    this.#matchStyle = val;
    this.#notifyChange();
  }

  get annotation(): string | MarkerAnnotationConfig | undefined {
    return this.#annotation;
  }
  set annotation(val: string | MarkerAnnotationConfig | undefined) {
    this.#annotation = val;
    this.#notifyChange();
  }

  get legend(): boolean | MarkerLegendConfig | undefined {
    return this.#legend;
  }
  set legend(val: boolean | MarkerLegendConfig | undefined) {
    this.#legend = val;
    this.#notifyChange();
  }

  private parseValue(raw: string | null): number | string | undefined {
    if (raw === null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }

  public toMarkerConfig(): MarkerConfig {
    const matchColor = this.getAttribute('match-color') || undefined;
    const matchFill = this.getAttribute('match-fill') || matchColor;
    const matchStroke = this.getAttribute('match-stroke') || matchColor;
    const matchStrokeWidth = this.hasAttribute('match-stroke-width')
      ? Number(this.getAttribute('match-stroke-width'))
      : undefined;
    const matchOpacity = this.hasAttribute('match-opacity')
      ? Number(this.getAttribute('match-opacity'))
      : undefined;
    const matchRadius = this.hasAttribute('match-radius')
      ? Number(this.getAttribute('match-radius'))
      : undefined;
    const matchClass = this.getAttribute('match-class') || undefined;
    const matchIcon = this.getAttribute('match-icon') || undefined;

    const attrMatchStyle: MarkerMatchStyle = {
      ...(matchColor ? { color: matchColor } : {}),
      ...(matchFill ? { fill: matchFill } : {}),
      ...(matchStroke ? { stroke: matchStroke } : {}),
      ...(matchStrokeWidth !== undefined
        ? { strokeWidth: matchStrokeWidth }
        : {}),
      ...(matchOpacity !== undefined ? { opacity: matchOpacity } : {}),
      ...(matchRadius !== undefined ? { radius: matchRadius } : {}),
      ...(matchClass ? { className: matchClass } : {}),
      ...(matchIcon ? { icon: matchIcon } : {}),
      ...(this.#matchStyle ?? {})
    };

    const hasFromTo = this.hasAttribute('from') && this.hasAttribute('to');
    const hasPointXY = this.hasAttribute('x') && this.hasAttribute('y');
    const typeAttr = this.getAttribute('type') as MarkerType | null;
    const lineStyleAttr = this.getAttribute(
      'line-style'
    ) as LineStrokeStyle | null;
    const symbolAttr = this.getAttribute('symbol') as ScatterSymbolType | null;
    const sizeAttr = this.hasAttribute('size')
      ? Number(this.getAttribute('size'))
      : undefined;

    // Resolve declarative outside annotation attributes + JS property
    const annTextAttr =
      this.getAttribute('annotation-text') ?? this.getAttribute('annotation');
    const annIconAttr = this.getAttribute('annotation-icon') || undefined;
    const annPosAttr = this.getAttribute(
      'annotation-position'
    ) as MarkerAnnotationPosition | null;
    const annPadAttr = this.hasAttribute('annotation-padding')
      ? Number(this.getAttribute('annotation-padding'))
      : undefined;
    const annOffXAttr = this.hasAttribute('annotation-offset-x')
      ? Number(this.getAttribute('annotation-offset-x'))
      : undefined;
    const annOffYAttr = this.hasAttribute('annotation-offset-y')
      ? Number(this.getAttribute('annotation-offset-y'))
      : undefined;
    const annEnableTipAttr = this.hasAttribute('annotation-enable-tooltip')
      ? this.getAttribute('annotation-enable-tooltip') !== 'false'
      : undefined;
    const annTipAttr = this.getAttribute('annotation-tooltip') || undefined;

    let resolvedAnnotation: string | MarkerAnnotationConfig | undefined =
      this.#annotation;
    if (
      annTextAttr !== null ||
      annIconAttr !== undefined ||
      annPosAttr !== null ||
      annPadAttr !== undefined ||
      annEnableTipAttr !== undefined ||
      annTipAttr !== undefined
    ) {
      const baseAnn: MarkerAnnotationConfig =
        typeof this.#annotation === 'string'
          ? { text: this.#annotation }
          : { ...(this.#annotation ?? {}) };
      resolvedAnnotation = {
        ...baseAnn,
        ...(annTextAttr !== null ? { text: annTextAttr } : {}),
        ...(annIconAttr !== undefined ? { icon: annIconAttr } : {}),
        ...(annPosAttr === 'left' ||
        annPosAttr === 'right' ||
        annPosAttr === 'top' ||
        annPosAttr === 'bottom'
          ? { position: annPosAttr }
          : {}),
        ...(annPadAttr !== undefined && !Number.isNaN(annPadAttr)
          ? { padding: annPadAttr }
          : {}),
        ...(annOffXAttr !== undefined && !Number.isNaN(annOffXAttr)
          ? { offsetX: annOffXAttr }
          : {}),
        ...(annOffYAttr !== undefined && !Number.isNaN(annOffYAttr)
          ? { offsetY: annOffYAttr }
          : {}),
        ...(annEnableTipAttr !== undefined
          ? { enableTooltip: annEnableTipAttr }
          : {}),
        ...(annTipAttr !== undefined ? { tooltip: annTipAttr } : {})
      };
    }

    // Resolve declarative marker legend attributes + JS property
    const legAttr = this.getAttribute('legend');
    const legLabelAttr = this.getAttribute('legend-label') || undefined;
    const legColorAttr = this.getAttribute('legend-color') || undefined;
    const legSwatchAttr = this.getAttribute(
      'legend-swatch'
    ) as MarkerLegendSwatch | null;
    const legTipAttr = this.getAttribute('legend-tooltip') || undefined;

    let resolvedLegend: boolean | MarkerLegendConfig | undefined = this.#legend;
    if (
      legAttr !== null ||
      legLabelAttr !== undefined ||
      legColorAttr !== undefined ||
      legSwatchAttr !== null ||
      legTipAttr !== undefined
    ) {
      if (
        legAttr === 'false' &&
        !legLabelAttr &&
        !legColorAttr &&
        !legSwatchAttr &&
        !legTipAttr
      ) {
        resolvedLegend = false;
      } else {
        const baseLeg: MarkerLegendConfig =
          typeof this.#legend === 'object' && this.#legend !== null
            ? { ...this.#legend }
            : {};
        resolvedLegend = {
          ...baseLeg,
          ...(legAttr !== null ? { enabled: legAttr !== 'false' } : {}),
          ...(legLabelAttr !== undefined ? { label: legLabelAttr } : {}),
          ...(legColorAttr !== undefined ? { color: legColorAttr } : {}),
          ...(legSwatchAttr === 'auto' ||
          legSwatchAttr === 'line' ||
          legSwatchAttr === 'area' ||
          legSwatchAttr === 'square'
            ? { swatch: legSwatchAttr }
            : {}),
          ...(legTipAttr !== undefined ? { tooltip: legTipAttr } : {})
        };
      }
    }

    return {
      id: this.getAttribute('id') || undefined,
      type:
        typeAttr ||
        (hasPointXY ? 'point' : hasFromTo ? 'area' : 'line'),
      axis: (this.getAttribute('axis') as 'x' | 'y') || 'y',
      value: this.parseValue(this.getAttribute('value')),
      from: this.parseValue(this.getAttribute('from')),
      to: this.parseValue(this.getAttribute('to')),
      x: this.parseValue(this.getAttribute('x')),
      y: this.parseValue(this.getAttribute('y')),
      symbol: symbolAttr || undefined,
      size: sizeAttr !== undefined && !Number.isNaN(sizeAttr) ? sizeAttr : undefined,
      lineStyle:
        lineStyleAttr === 'solid' ||
        lineStyleAttr === 'dashed' ||
        lineStyleAttr === 'dotted'
          ? lineStyleAttr
          : undefined,
      label: this.getAttribute('label') || undefined,
      labelPosition:
        (this.getAttribute('label-position') as MarkerLabelPosition) ||
        undefined,
      labelPadding: this.hasAttribute('label-padding')
        ? Number(this.getAttribute('label-padding'))
        : undefined,
      labelEdgePadding: this.hasAttribute('label-edge-padding')
        ? Number(this.getAttribute('label-edge-padding'))
        : undefined,
      labelOffsetX: this.hasAttribute('label-offset-x')
        ? Number(this.getAttribute('label-offset-x'))
        : undefined,
      labelOffsetY: this.hasAttribute('label-offset-y')
        ? Number(this.getAttribute('label-offset-y'))
        : undefined,
      icon: this.getAttribute('icon') || undefined,
      annotation: resolvedAnnotation,
      legend: resolvedLegend,
      stroke: this.getAttribute('stroke') || undefined,
      strokeWidth: this.hasAttribute('stroke-width')
        ? Number(this.getAttribute('stroke-width'))
        : undefined,
      strokeDasharray: this.getAttribute('stroke-dasharray') || undefined,
      fill: this.getAttribute('fill') || undefined,
      fillOpacity: this.hasAttribute('fill-opacity')
        ? Number(this.getAttribute('fill-opacity'))
        : undefined,
      condition: this.condition,
      matchScope:
        (this.getAttribute('match-scope') as MarkerMatchScope) || undefined,
      matchStyle:
        Object.keys(attrMatchStyle).length > 0 ? attrMatchStyle : undefined
    };
  }

  #notifyChange(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-marker', element: this }
      })
    );
  }
}

/**
 * `<mc-marker-layer>` Web Component
 * Container component for `<mc-marker>` definitions (or configured via `chart.config.markers`).
 */
export class MCMarkerLayer extends HTMLElementBase {
  static observedAttributes = ['enabled'];

  #markers: MarkerConfig[] = [];

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.style.display = 'none';
    this.#notifyChange();
  }

  connectedMoveCallback(): void {
    this.#notifyChange();
  }

  disconnectedCallback(): void {
    this.#notifyChange();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyChange();
    }
  }

  get markers(): MarkerConfig[] {
    return this.getMarkers();
  }
  set markers(val: MarkerConfig[]) {
    this.#markers = val ? [...val] : [];
    this.#notifyChange();
  }

  public applyFromConfig(markers: MarkerConfig[]): void {
    this.#markers = markers ? [...markers] : [];
  }

  public getMarkers(): MarkerConfig[] {
    if (this.getAttribute('enabled') === 'false') return [];
    const childMarkers = Array.from(
      this.querySelectorAll('mc-marker')
    ) as MCMarkerElement[];
    const fromChildren = childMarkers.map((el) =>
      typeof el.toMarkerConfig === 'function' ? el.toMarkerConfig() : {}
    );
    return [...this.#markers, ...fromChildren];
  }

  #notifyChange(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-marker-layer', element: this }
      })
    );
  }
}
