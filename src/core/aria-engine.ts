import { createChartI18n, type ChartI18n, type ChartMessages } from './i18n';
import { replaceTemplatePlaceholders } from './template';
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

const ROLE_MESSAGE_KEYS: Record<AriaItemDescriptor['type'], keyof ChartMessages> = {
  bar: 'ariaRoleBar',
  point: 'ariaRolePoint',
  series: 'ariaRoleSeries',
  arc: 'ariaRoleArc',
  cell: 'ariaRoleCell',
  'radar-point': 'ariaRoleRadarPoint',
  'radar-polygon': 'ariaRoleRadarPolygon',
  'sunburst-arc': 'ariaRoleSunburstArc',
  'sankey-node': 'ariaRoleSankeyNode',
  'sankey-link': 'ariaRoleSankeyLink',
  'scatter-node': 'ariaRoleScatterNode',
  'treemap-tile': 'ariaRoleTreemapTile',
  'gauge-arc': 'ariaRoleGaugeArc'
};

function formatItemValue(value: unknown, i18n: ChartI18n): string {
  return typeof value === 'number'
    ? i18n.formatNumber(value, { useGrouping: false })
    : String(value ?? '');
}

function formatItemPercentage(value: number, i18n: ChartI18n): string {
  return i18n.formatPercent(value / 100, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false
  });
}

export class AriaEngine {
  public interpolateAriaTemplate(
    template: string,
    item: AriaItemDescriptor,
    i18n: ChartI18n = createChartI18n()
  ): string {
    const datumObj = item.datum ?? {};
    return replaceTemplatePlaceholders(template, (key) => {
      if (key === 'id') return String(item.id ?? '');
      if (key === 'type') return String(item.type ?? '');
      if (key === 'index') return formatItemValue(item.index ?? 0, i18n);
      if (key === 'number') return formatItemValue((item.index ?? 0) + 1, i18n);
      if (key === 'total') return formatItemValue(item.total, i18n);
      if (key === 'label') return String(item.label ?? item.id ?? '');
      if (key === 'value') return formatItemValue(item.value, i18n);
      if (key === 'formattedValue')
        return item.formattedValue ?? formatItemValue(item.value, i18n);
      if (key === 'category' || key === 'indexValue')
        return String(item.category ?? datumObj.indexValue ?? '');
      if (key === 'seriesId' || key === 'key')
        return String(item.seriesId ?? datumObj.key ?? item.id ?? '');
      if (key === 'percentage')
        return item.percentage !== undefined
          ? formatItemPercentage(item.percentage, i18n)
          : '';
      if (key === 'source') return String(item.source ?? '');
      if (key === 'target') return String(item.target ?? '');
      if (key in datumObj) return String(datumObj[key] ?? '');
      return '';
    });
  }

  public resolveAccessor(
    accessor: AriaItemLabelAccessor | undefined,
    item: AriaItemDescriptor,
    i18n: ChartI18n = createChartI18n()
  ): string | undefined {
    if (!accessor) return undefined;
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    if (typeof accessor === 'string') {
      return this.interpolateAriaTemplate(accessor, item, i18n);
    }
    return undefined;
  }

  public buildDefaultItemLabel(
    item: AriaItemDescriptor,
    i18n: ChartI18n = createChartI18n()
  ): string {
    const value = item.formattedValue ?? formatItemValue(item.value, i18n);
    const label = item.label || item.id;
    const category = item.category;
    const values = { label, value, category };
    switch (item.type) {
      case 'bar':
        return i18n.message(category ? 'ariaBarCategory' : 'ariaLabelValue', {
          ...values, label: item.seriesId || item.id
        });
      case 'point':
      case 'scatter-node':
        return i18n.message(category ? 'ariaPointCategory' : 'ariaLabelValue', {
          ...values, label: item.seriesId || item.id
        });
      case 'arc':
      case 'sunburst-arc':
        return i18n.message(item.percentage !== undefined ? 'ariaArcPercentage' : 'ariaLabelValue', {
          ...values,
          percentage: item.percentage !== undefined ? formatItemPercentage(item.percentage, i18n) : ''
        });
      case 'cell':
      case 'treemap-tile':
        return i18n.message(category ? 'ariaCellCategory' : 'ariaLabelValue', values);
      case 'radar-point':
        return i18n.message('ariaPointCategory', {
          ...values, label: item.seriesId || item.id, category: category || item.label
        });
      case 'sankey-node':
        return i18n.message('ariaSankeyNode', values);
      case 'sankey-link':
        return i18n.message('ariaSankeyLink', { ...values, source: item.source, target: item.target });
      case 'gauge-arc':
        return i18n.message('ariaLabelValue', { ...values, label: item.label || i18n.message('gauge') });
      default:
        return value ? i18n.message('ariaLabelValue', values) : label;
    }
  }

  public resolveItemLabel(
    item: AriaItemDescriptor,
    ariaConfig: AriaConfig,
    chartConfig: ChartConfig<any>,
    i18n: ChartI18n = createChartI18n(chartConfig.i18n)
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

    const fromTypeSpecific = this.resolveAccessor(typeSpecificAccessor, item, i18n);
    if (fromTypeSpecific) return fromTypeSpecific;

    // 2. Check universal ariaConfig.itemLabel
    const fromUniversal = this.resolveAccessor(ariaConfig.itemLabel, item, i18n);
    if (fromUniversal) return fromUniversal;

    // 3. Fallback to accessible default
    return this.buildDefaultItemLabel(item, i18n);
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
    } = {},
    i18n: ChartI18n = createChartI18n(chartConfig.i18n)
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
          i18n.message(ROLE_MESSAGE_KEYS[item.type] || 'ariaRoleItem');
    element.setAttribute('aria-roledescription', roleDesc);

    const label = this.resolveItemLabel(item, ariaConfig, chartConfig, i18n);
    element.setAttribute('aria-label', label);

    const description = this.resolveAccessor(ariaConfig.itemDescription, item, i18n);
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
    items: { item: AriaItemDescriptor; label: string }[],
    i18n: ChartI18n = createChartI18n()
  ): string {
    if (items.length === 0) return '';
    const rowsHtml = items
      .slice(0, 100)
      .map(
        ({ item, label }) =>
          `<tr><th scope="row">${this.escapeHtml(
            item.seriesId || item.label || item.id
          )}</th><td>${this.escapeHtml(
            item.category || i18n.message(ROLE_MESSAGE_KEYS[item.type])
          )}</td><td>${this.escapeHtml(
            item.formattedValue ?? formatItemValue(item.value, i18n)
          )}</td><td>${this.escapeHtml(label)}</td></tr>`
      )
      .join('');

    return `<table class="mc-aria-table"><caption>${this.escapeHtml(
      chartTitle || i18n.message('tableCaption')
    )}</caption><thead><tr><th scope="col">${this.escapeHtml(i18n.message('tableSeries'))}</th><th scope="col">${this.escapeHtml(i18n.message('tableCategory'))}</th><th scope="col">${this.escapeHtml(i18n.message('tableValue'))}</th><th scope="col">${this.escapeHtml(i18n.message('tableSummary'))}</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
