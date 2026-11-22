import type {
  AriaConfig,
  AriaItemDescriptor,
  AriaItemLabelAccessor,
  ChartConfig
} from './types';

export function createDefaultAriaConfig(): AriaConfig {
  return {
    enabled: true,
    role: 'figure',
    isFocusable: true,
    announceOnFocus: true,
    includeDataTable: true,
    itemRole: 'graphics-symbol'
  };
}

const DEFAULT_ROLE_DESCRIPTIONS: Record<AriaItemDescriptor['type'], string> = {
  bar: 'bar',
  point: 'data point',
  series: 'data series',
  arc: 'pie slice',
  cell: 'heatmap cell',
  'radar-point': 'radar point',
  'radar-polygon': 'radar series',
  'sunburst-arc': 'hierarchy arc',
  'sankey-node': 'flow node',
  'sankey-link': 'flow link',
  'scatter-node': 'scatter point',
  'treemap-tile': 'treemap tile',
  'gauge-arc': 'gauge metric'
};

export class AriaEngine {
  public interpolateAriaTemplate(
    template: string,
    item: AriaItemDescriptor
  ): string {
    const datumObj = item.datum ?? {};
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
      if (key === 'id') return String(item.id ?? '');
      if (key === 'type') return String(item.type ?? '');
      if (key === 'index') return String(item.index ?? 0);
      if (key === 'number') return String((item.index ?? 0) + 1);
      if (key === 'total') return String(item.total ?? '');
      if (key === 'label') return String(item.label ?? item.id ?? '');
      if (key === 'value') return String(item.value ?? '');
      if (key === 'formattedValue')
        return String(item.formattedValue ?? item.value ?? '');
      if (key === 'category' || key === 'indexValue')
        return String(item.category ?? datumObj.indexValue ?? '');
      if (key === 'seriesId' || key === 'key')
        return String(item.seriesId ?? datumObj.key ?? item.id ?? '');
      if (key === 'percentage')
        return item.percentage !== undefined
          ? `${item.percentage.toFixed(1)}%`
          : '';
      if (key === 'source') return String(item.source ?? '');
      if (key === 'target') return String(item.target ?? '');
      if (key in datumObj) return String(datumObj[key] ?? '');
      return '';
    });
  }

  public resolveAccessor(
    accessor: AriaItemLabelAccessor | undefined,
    item: AriaItemDescriptor
  ): string | undefined {
    if (!accessor) return undefined;
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    if (typeof accessor === 'string') {
      return this.interpolateAriaTemplate(accessor, item);
    }
    return undefined;
  }

  public buildDefaultItemLabel(item: AriaItemDescriptor): string {
    const valStr =
      item.formattedValue !== undefined
        ? item.formattedValue
        : item.value !== undefined
        ? String(item.value)
        : '';

    switch (item.type) {
      case 'bar':
        return `${item.seriesId || item.id}${
          item.category ? ` in ${item.category}` : ''
        }: ${valStr}`;
      case 'point':
      case 'scatter-node':
        return `${item.seriesId || item.id}${
          item.category ? `, ${item.category}` : ''
        }: ${valStr}`;
      case 'arc':
      case 'sunburst-arc':
        return `${item.label || item.id}: ${valStr}${
          item.percentage !== undefined
            ? ` (${item.percentage.toFixed(1)}%)`
            : ''
        }`;
      case 'cell':
      case 'treemap-tile':
        return `${item.label || item.id}${
          item.category ? ` (${item.category})` : ''
        }: ${valStr}`;
      case 'radar-point':
        return `${item.seriesId || item.id}, ${item.category || item.label}: ${valStr}`;
      case 'sankey-node':
        return `${item.label || item.id}: total flow ${valStr}`;
      case 'sankey-link':
        return `${item.source} to ${item.target}: flow ${valStr}`;
      case 'gauge-arc':
        return `${item.label || 'Gauge'}: ${valStr}`;
      default:
        return `${item.label || item.id}${valStr ? `: ${valStr}` : ''}`;
    }
  }

  public resolveItemLabel(
    item: AriaItemDescriptor,
    ariaConfig: AriaConfig,
    chartConfig: ChartConfig<any>
  ): string {
    // 1. Check Nivo-style type-specific shorthand callbacks in chartConfig
    let typeSpecificAccessor: AriaItemLabelAccessor | undefined;
    if (item.type === 'bar' && chartConfig.barAriaLabel) {
      typeSpecificAccessor = chartConfig.barAriaLabel;
    } else if (
      (item.type === 'point' ||
        item.type === 'scatter-node' ||
        item.type === 'radar-point') &&
      chartConfig.pointAriaLabel
    ) {
      typeSpecificAccessor = chartConfig.pointAriaLabel;
    } else if (
      (item.type === 'arc' ||
        item.type === 'sunburst-arc' ||
        item.type === 'gauge-arc') &&
      chartConfig.arcAriaLabel
    ) {
      typeSpecificAccessor = chartConfig.arcAriaLabel;
    } else if (
      (item.type === 'cell' || item.type === 'treemap-tile') &&
      chartConfig.cellAriaLabel
    ) {
      typeSpecificAccessor = chartConfig.cellAriaLabel;
    } else if (item.type === 'sankey-node' && chartConfig.nodeAriaLabel) {
      typeSpecificAccessor = chartConfig.nodeAriaLabel;
    } else if (item.type === 'sankey-link' && chartConfig.linkAriaLabel) {
      typeSpecificAccessor = chartConfig.linkAriaLabel;
    }

    const fromTypeSpecific = this.resolveAccessor(typeSpecificAccessor, item);
    if (fromTypeSpecific) return fromTypeSpecific;

    // 2. Check universal ariaConfig.itemLabel
    const fromUniversal = this.resolveAccessor(ariaConfig.itemLabel, item);
    if (fromUniversal) return fromUniversal;

    // 3. Fallback to accessible default
    return this.buildDefaultItemLabel(item);
  }

  /**
   * Decorates a visual SVG chart element as an accessible ARIA item with
   * customized `aria-label`, `role`, `aria-roledescription`, keyboard navigation,
   * and live screen reader focus announcement.
   */
  public decorateItem(
    element: SVGElement,
    item: AriaItemDescriptor,
    ariaConfig: AriaConfig,
    chartConfig: ChartConfig<any>,
    hooks: {
      onItemFocus?: (
        item: AriaItemDescriptor,
        label: string,
        description?: string,
        element?: SVGElement
      ) => void;
      onItemBlur?: (item: AriaItemDescriptor, element: SVGElement) => void;
      onItemActivate?: (
        item: AriaItemDescriptor,
        label: string,
        element: SVGElement
      ) => void;
      navigateRelative?: (currentEl: SVGElement, delta: number | 'first' | 'last') => void;
    } = {}
  ): SVGElement {
    if (!ariaConfig.enabled) return element;

    const existingClass = element.getAttribute('class') || '';
    if (!existingClass.includes('mc-aria-item')) {
      element.setAttribute('class', `${existingClass} mc-aria-item`.trim());
    }
    element.setAttribute('data-aria-item-type', item.type);
    element.setAttribute('data-aria-index', String(item.index));
    element.setAttribute('data-aria-id', item.id);

    const isHidden =
      typeof ariaConfig.itemHidden === 'function'
        ? ariaConfig.itemHidden(item)
        : ariaConfig.itemHidden === true;

    if (isHidden) {
      // Per accessibility guide: never make an aria-hidden element focusable
      element.setAttribute('aria-hidden', 'true');
      element.removeAttribute('tabindex');
      return element;
    }

    const role =
      typeof ariaConfig.itemRole === 'function'
        ? ariaConfig.itemRole(item)
        : ariaConfig.itemRole || 'graphics-symbol';
    element.setAttribute('role', role);

    const roleDesc =
      typeof ariaConfig.itemRoleDescription === 'function'
        ? ariaConfig.itemRoleDescription(item)
        : ariaConfig.itemRoleDescription ||
          DEFAULT_ROLE_DESCRIPTIONS[item.type] ||
          'chart item';
    element.setAttribute('aria-roledescription', roleDesc);

    const label = this.resolveItemLabel(item, ariaConfig, chartConfig);
    element.setAttribute('aria-label', label);

    const description = this.resolveAccessor(ariaConfig.itemDescription, item);
    if (description) {
      element.setAttribute('aria-description', description);
    }

    if (ariaConfig.itemLabelledBy) {
      const val =
        typeof ariaConfig.itemLabelledBy === 'function'
          ? ariaConfig.itemLabelledBy(item)
          : ariaConfig.itemLabelledBy;
      if (val) element.setAttribute('aria-labelledby', val);
    }

    if (ariaConfig.itemDescribedBy) {
      const val =
        typeof ariaConfig.itemDescribedBy === 'function'
          ? ariaConfig.itemDescribedBy(item)
          : ariaConfig.itemDescribedBy;
      if (val) element.setAttribute('aria-describedby', val);
    }

    if (typeof item.value === 'number' && Number.isFinite(item.value)) {
      element.setAttribute('aria-valuenow', String(item.value));
    }

    if (ariaConfig.itemAttributes) {
      const extra = ariaConfig.itemAttributes(item);
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== null) {
          element.setAttribute(k, String(v));
        }
      }
    }

    if (ariaConfig.isFocusable) {
      element.setAttribute('tabindex', '0');

      element.addEventListener('focus', () => {
        hooks.onItemFocus?.(item, label, description, element);
      });

      element.addEventListener('blur', () => {
        hooks.onItemBlur?.(item, element);
      });

      // Native button-like keyboard activation: Enter on keydown, Space on keyup
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          hooks.onItemBlur?.(item, element);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          hooks.onItemActivate?.(item, label, element);
        } else if (e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on Spacebar
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          hooks.navigateRelative?.(element, 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          hooks.navigateRelative?.(element, -1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          hooks.navigateRelative?.(element, 'first');
        } else if (e.key === 'End') {
          e.preventDefault();
          hooks.navigateRelative?.(element, 'last');
        }
      });

      element.addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault();
          hooks.onItemActivate?.(item, label, element);
        }
      });
    }

    return element;
  }

  /**
   * Builds a semantic HTML `<table>` representation of the chart's ARIA items
   * as an accessible alternative for screen readers.
   */
  public buildAccessibleDataTableHtml(
    chartTitle: string,
    items: { item: AriaItemDescriptor; label: string }[]
  ): string {
    if (items.length === 0) return '';
    const rowsHtml = items
      .slice(0, 100)
      .map(
        ({ item, label }) =>
          `<tr><th scope="row">${this.escapeHtml(
            item.seriesId || item.label || item.id
          )}</th><td>${this.escapeHtml(
            item.category || item.type
          )}</td><td>${this.escapeHtml(
            String(item.formattedValue ?? item.value ?? '')
          )}</td><td>${this.escapeHtml(label)}</td></tr>`
      )
      .join('');

    return `<table class="mc-aria-table"><caption>${this.escapeHtml(
      chartTitle || 'Chart Data Summary'
    )}</caption><thead><tr><th scope="col">Series / Item</th><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Summary</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
