import type {
  MarkerCondition,
  MarkerConfig,
  MarkerLabelPosition,
  MarkerMatchStyle,
  MarkerType
} from '../core/types';

/**
 * `<mc-marker>` Web Component
 * Defines a single marker line (`type="line"`) or marker area (`type="area"`)
 * with optional threshold condition (`condition="below|above|between|outside"`)
 * and conditional item styling (`match-color`, `match-fill`, `match-stroke`, `match-opacity`, `match-class`, `match-icon`).
 */
export class MCMarkerElement extends HTMLElement {
  static observedAttributes = [
    'id',
    'type',
    'axis',
    'value',
    'from',
    'to',
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
    'match-color',
    'match-fill',
    'match-stroke',
    'match-stroke-width',
    'match-opacity',
    'match-radius',
    'match-class',
    'match-icon'
  ];

  #conditionFn?: (value: number, datum?: any) => boolean;
  #matchStyle?: MarkerMatchStyle;

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
    const typeAttr = this.getAttribute('type') as MarkerType | null;

    return {
      id: this.getAttribute('id') || undefined,
      type: typeAttr || (hasFromTo ? 'area' : 'line'),
      axis: (this.getAttribute('axis') as 'x' | 'y') || 'y',
      value: this.parseValue(this.getAttribute('value')),
      from: this.parseValue(this.getAttribute('from')),
      to: this.parseValue(this.getAttribute('to')),
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
export class MCMarkerLayer extends HTMLElement {
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
