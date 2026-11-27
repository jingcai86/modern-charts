import { HTMLElementBase } from '../core/dom';
import type {
  LegendConfig,
  LegendItem,
  LegendPadding,
  LegendPosition,
  LegendType,
  TooltipConfig
} from '../core/types';
import type { MCTooltipElement } from './mc-tooltip';

function parseOptionalFiniteNumber(raw: string | null): number | undefined {
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function parseTickFormat(raw: string | null): Intl.NumberFormatOptions | undefined {
  if (!raw) return undefined;
  try {
    const options: unknown = JSON.parse(raw);
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      return options as Intl.NumberFormatOptions;
    }
  } catch {
    // Keep the locale's default format while the declarative options are invalid.
  }
  return undefined;
}

/**
 * `<mc-legend>` Declarative Legend Configuration Web Component.
 *
 * Place inside any `<mc-*-chart>` to declaratively configure legend placement
 * (`top`, `bottom`, `left`, `right`), mode (`categorical`, `continuous`, `piecewise`, `discrete`),
 * visualMap domain/calculable handles, 4-side padding, wrapping, and dedicated
 * legend tooltips (via `enable-tooltip` or a nested `<mc-tooltip>` child).
 */
export class MCLegendElement extends HTMLElementBase {
  static observedAttributes = [
    'enabled',
    'type',
    'position',
    'align',
    'min',
    'max',
    'color-scheme',
    'steps',
    'width',
    'height',
    'border-radius',
    'block-gap',
    'label-placement',
    'min-label',
    'max-label',
    'tick-format',
    'calculable',
    'wrap',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'enable-tooltip',
    'item-gap',
    'row-gap',
    'swatch-size',
    'max-item-width',
    'font-size'
  ];

  #tooltipConfig?: boolean | TooltipConfig<LegendItem>;

  connectedCallback(): void {
    this.style.display = 'none';
    this.#notifyParentChart();
  }

  connectedMoveCallback(): void {
    this.#notifyParentChart();
  }

  disconnectedCallback(): void {
    this.#notifyParentChart();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyParentChart();
    }
  }

  get tooltip(): boolean | TooltipConfig<LegendItem> | undefined {
    return this.#tooltipConfig;
  }
  set tooltip(val: boolean | TooltipConfig<LegendItem> | undefined) {
    this.#tooltipConfig = val;
    this.#notifyParentChart();
  }

  private parsePaddingAttr(): Partial<LegendPadding> | undefined {
    const raw = this.getAttribute('padding');
    let pad: Partial<LegendPadding> = {};

    if (raw) {
      const parts = raw
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      if (parts.length === 1) {
        pad = { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
      } else if (parts.length === 2) {
        pad = { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
      } else if (parts.length === 4) {
        pad = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
      }
    }

    const pt = this.getAttribute('padding-top');
    const pr = this.getAttribute('padding-right');
    const pb = this.getAttribute('padding-bottom');
    const pl = this.getAttribute('padding-left');
    if (pt !== null && !Number.isNaN(Number(pt))) pad.top = Number(pt);
    if (pr !== null && !Number.isNaN(Number(pr))) pad.right = Number(pr);
    if (pb !== null && !Number.isNaN(Number(pb))) pad.bottom = Number(pb);
    if (pl !== null && !Number.isNaN(Number(pl))) pad.left = Number(pl);

    return Object.keys(pad).length > 0 ? pad : undefined;
  }

  public toLegendConfig(): LegendConfig {
    const enabledAttr = this.getAttribute('enabled');
    const typeAttr = this.getAttribute('type') as LegendType | null;
    const posAttr = this.getAttribute('position') as LegendPosition | null;
    const align = this.getAttribute('align');
    const min = parseOptionalFiniteNumber(this.getAttribute('min'));
    const max = parseOptionalFiniteNumber(this.getAttribute('max'));
    const schemeAttr = this.getAttribute('color-scheme');
    const steps = parseOptionalFiniteNumber(this.getAttribute('steps'));
    const width = parseOptionalFiniteNumber(this.getAttribute('width'));
    const height = parseOptionalFiniteNumber(this.getAttribute('height'));
    const borderRadius = parseOptionalFiniteNumber(this.getAttribute('border-radius'));
    const blockGap = parseOptionalFiniteNumber(this.getAttribute('block-gap'));
    const labelPlacement = this.getAttribute('label-placement');
    const minLabel = this.getAttribute('min-label');
    const maxLabel = this.getAttribute('max-label');
    const tickFormat = parseTickFormat(this.getAttribute('tick-format'));
    const calculableAttr = this.getAttribute('calculable');
    const wrapAttr = this.getAttribute('wrap');
    const enableTooltipAttr = this.getAttribute('enable-tooltip');
    const itemGapAttr = this.getAttribute('item-gap');
    const rowGapAttr = this.getAttribute('row-gap');
    const swatchAttr = this.getAttribute('swatch-size');
    const maxItemWidthAttr = this.getAttribute('max-item-width');
    const fontSizeAttr = this.getAttribute('font-size');

    let nestedTooltip: boolean | TooltipConfig<LegendItem> | undefined =
      this.#tooltipConfig;
    const childTooltip = this.querySelector(
      ':scope > mc-tooltip'
    ) as MCTooltipElement | null;
    if (childTooltip && typeof childTooltip.toTooltipConfig === 'function') {
      const childCfg = childTooltip.toTooltipConfig() as TooltipConfig<LegendItem>;
      nestedTooltip =
        typeof nestedTooltip === 'object' && nestedTooltip !== null
          ? { ...nestedTooltip, ...childCfg }
          : childCfg;
    }

    const padding = this.parsePaddingAttr();

    return {
      ...(enabledAttr !== null ? { enabled: enabledAttr !== 'false' } : {}),
      ...(typeAttr === 'categorical' ||
      typeAttr === 'continuous' ||
      typeAttr === 'piecewise' ||
      typeAttr === 'discrete'
        ? { type: typeAttr }
        : {}),
      ...(posAttr === 'top' ||
      posAttr === 'bottom' ||
      posAttr === 'left' ||
      posAttr === 'right'
        ? { position: posAttr }
        : {}),
      ...(align === 'start' || align === 'middle' || align === 'end' ? { align } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(schemeAttr ? { colorScheme: schemeAttr } : {}),
      ...(steps !== undefined ? { steps } : {}),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(borderRadius !== undefined ? { borderRadius } : {}),
      ...(blockGap !== undefined ? { blockGap } : {}),
      ...(labelPlacement === 'ends' || labelPlacement === 'ticks' || labelPlacement === 'none'
        ? { labelPlacement }
        : {}),
      ...(minLabel !== null ? { minLabel } : {}),
      ...(maxLabel !== null ? { maxLabel } : {}),
      ...(tickFormat !== undefined ? { tickFormat } : {}),
      ...(calculableAttr !== null
        ? { calculable: calculableAttr !== 'false' }
        : {}),
      ...(wrapAttr !== null ? { wrap: wrapAttr !== 'false' } : {}),
      ...(padding ? { padding } : {}),
      ...(enableTooltipAttr !== null
        ? { enableTooltip: enableTooltipAttr !== 'false' }
        : {}),
      ...(nestedTooltip !== undefined ? { tooltip: nestedTooltip } : {}),
      ...(itemGapAttr !== null && !Number.isNaN(Number(itemGapAttr))
        ? { itemGap: Number(itemGapAttr) }
        : {}),
      ...(rowGapAttr !== null && !Number.isNaN(Number(rowGapAttr))
        ? { rowGap: Number(rowGapAttr) }
        : {}),
      ...(swatchAttr !== null && !Number.isNaN(Number(swatchAttr))
        ? { swatchSize: Number(swatchAttr) }
        : {}),
      ...(maxItemWidthAttr !== null && !Number.isNaN(Number(maxItemWidthAttr))
        ? { maxItemWidth: Number(maxItemWidthAttr) }
        : {}),
      ...(fontSizeAttr !== null && !Number.isNaN(Number(fontSizeAttr))
        ? { fontSize: Number(fontSizeAttr) }
        : {})
    };
  }

  #notifyParentChart(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-legend', element: this }
      })
    );
  }
}
