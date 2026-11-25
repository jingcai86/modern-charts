/** Shared chart UI messages. Placeholders use `{{name}}` syntax. */
export interface ChartMessages {
  chartTitle: string;
  chartDescription: string;
  chartDescriptionStatic: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  resetZoomLabel: string;
  loading: string;
  empty: string;
  total: string;
  value: string;
  flow: string;
  totalFlow: string;
  gaugeMetric: string;
  x: string;
  y: string;
  size: string;
  gauge: string;
  tableCaption: string;
  tableSeries: string;
  tableCategory: string;
  tableValue: string;
  tableSummary: string;
  ariaLabelValue: string;
  ariaBarCategory: string;
  ariaPointCategory: string;
  ariaArcPercentage: string;
  ariaCellCategory: string;
  ariaSankeyNode: string;
  ariaSankeyLink: string;
  ariaRoleBar: string;
  ariaRolePoint: string;
  ariaRoleSeries: string;
  ariaRoleArc: string;
  ariaRoleCell: string;
  ariaRoleRadarPoint: string;
  ariaRoleRadarPolygon: string;
  ariaRoleSunburstArc: string;
  ariaRoleSankeyNode: string;
  ariaRoleSankeyLink: string;
  ariaRoleScatterNode: string;
  ariaRoleTreemapTile: string;
  ariaRoleGaugeArc: string;
  ariaRoleItem: string;
  legend: string;
  legendItem: string;
  areaMarker: string;
  lineMarker: string;
  condition: string;
  series: string;
  markerAnnotation: string;
  underThreshold: string;
  crossesThreshold: string;
  root: string;
}

export interface ChartI18nConfig {
  /** BCP 47 locale, such as `de-DE` or `ar-EG`. Defaults to `en-US`. */
  locale?: string;
  /** IANA time zone. Defaults to the runtime's local time zone. */
  timeZone?: string;
  /** Text and UI direction; does not reverse chart scales or data. */
  direction?: 'ltr' | 'rtl';
  /** Partial message overrides; omitted keys inherit global messages and English defaults. */
  messages?: Partial<ChartMessages>;
}

export interface ChartI18n {
  readonly locale: string;
  readonly timeZone: string;
  readonly direction: 'ltr' | 'rtl';
  readonly messages: Readonly<ChartMessages>;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string;
  /** Percent values are ratios: `0.25` formats as `25%`. */
  formatPercent(value: number, options?: Intl.NumberFormatOptions): string;
  message(key: keyof ChartMessages, values?: Record<string, unknown>): string;
}

export const DEFAULT_CHART_MESSAGES: Readonly<ChartMessages> = Object.freeze({
  chartTitle: 'Modern Charts {{chartType}} visualization',
  chartDescription: 'Interactive {{chartType}} chart with accessible focusable items',
  chartDescriptionStatic: 'Static {{chartType}} chart visualization',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
  resetZoomLabel: 'Reset',
  loading: 'Loading…',
  empty: 'No data',
  total: 'Total',
  value: 'Value',
  flow: 'Flow',
  totalFlow: 'Total Flow',
  gaugeMetric: 'Gauge Metric',
  x: 'X',
  y: 'Y',
  size: 'Size',
  gauge: 'Gauge',
  tableCaption: 'Chart Data Summary',
  tableSeries: 'Series / Item',
  tableCategory: 'Category',
  tableValue: 'Value',
  tableSummary: 'Summary',
  ariaLabelValue: '{{label}}: {{value}}',
  ariaBarCategory: '{{label}} in {{category}}: {{value}}',
  ariaPointCategory: '{{label}}, {{category}}: {{value}}',
  ariaArcPercentage: '{{label}}: {{value}} ({{percentage}})',
  ariaCellCategory: '{{label}} ({{category}}): {{value}}',
  ariaSankeyNode: '{{label}}: total flow {{value}}',
  ariaSankeyLink: '{{source}} to {{target}}: flow {{value}}',
  ariaRoleBar: 'bar',
  ariaRolePoint: 'data point',
  ariaRoleSeries: 'data series',
  ariaRoleArc: 'pie slice',
  ariaRoleCell: 'heatmap cell',
  ariaRoleRadarPoint: 'radar point',
  ariaRoleRadarPolygon: 'radar series',
  ariaRoleSunburstArc: 'hierarchy arc',
  ariaRoleSankeyNode: 'flow node',
  ariaRoleSankeyLink: 'flow link',
  ariaRoleScatterNode: 'scatter point',
  ariaRoleTreemapTile: 'treemap tile',
  ariaRoleGaugeArc: 'gauge metric',
  ariaRoleItem: 'chart item',
  legend: 'Chart legend',
  legendItem: 'Legend: {{label}}',
  areaMarker: 'Area Marker',
  lineMarker: 'Line Marker',
  condition: 'Condition: {{condition}}',
  series: 'Series',
  markerAnnotation: 'Marker annotation: {{label}}',
  underThreshold: 'Under Threshold',
  crossesThreshold: 'Crosses Threshold',
  root: 'Root'
});

let globalConfig: ChartI18nConfig = {};
const listeners = new Set<() => void>();

function copyConfig(config: ChartI18nConfig): ChartI18nConfig {
  return { ...config, ...(config.messages ? { messages: { ...config.messages } } : {}) };
}

/** Returns a defensive copy of the current global overrides. */
export function getI18nConfig(): ChartI18nConfig {
  return copyConfig(globalConfig);
}

/** Replaces global overrides and notifies subscribed charts. Pass `{}` to reset. */
export function configureI18n(config: ChartI18nConfig): void {
  // Validate before replacing a working configuration or notifying subscribers.
  resolveChartI18n(config, {});
  globalConfig = copyConfig(config);
  for (const listener of [...listeners]) listener();
}

export function subscribeI18n(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const MAX_FORMATTERS_PER_CONTEXT = 32;
function formatterKey(options: object): string {
  // Cache keys need a stable order, which does not require initializing locale collation.
  return JSON.stringify(Object.entries(options).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}
function cachedFormatter<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const existing = cache.get(key);
  if (existing) return existing;
  const value = create();
  if (cache.size >= MAX_FORMATTERS_PER_CONTEXT) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

/** Resolves English defaults, global overrides, then per-chart overrides. */
export function createChartI18n(config: ChartI18nConfig = {}): ChartI18n {
  return resolveChartI18n(config, globalConfig);
}

function resolveChartI18n(config: ChartI18nConfig, global: ChartI18nConfig): ChartI18n {
  const locale = config.locale ?? global.locale ?? 'en-US';
  let timeZone = config.timeZone ?? global.timeZone;
  const direction = config.direction ?? global.direction ?? 'ltr';
  if (direction !== 'ltr' && direction !== 'rtl') throw new RangeError('Chart direction must be ltr or rtl.');
  const mergedMessages = { ...DEFAULT_CHART_MESSAGES };
  for (const overrides of [global.messages, config.messages]) {
    for (const [key, value] of Object.entries(overrides ?? {})) {
      if (typeof value === 'string' && key in DEFAULT_CHART_MESSAGES) {
        mergedMessages[key as keyof ChartMessages] = value;
      }
    }
  }
  const messages: Readonly<ChartMessages> = Object.freeze(mergedMessages);
  // Validate explicit overrides immediately and resolve the runtime zone only when a date needs it.
  if (timeZone !== undefined) {
    new Intl.DateTimeFormat(locale, { timeZone });
  } else if (locale !== 'en-US') {
    Intl.getCanonicalLocales(locale);
  }
  const getTimeZone = (): string =>
    timeZone ??= new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const numberFormatters = new Map<string, Intl.NumberFormat>();
  const dateFormatters = new Map<string, Intl.DateTimeFormat>();
  const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}): string => {
    const hasPrecision = options.minimumFractionDigits !== undefined ||
      options.maximumFractionDigits !== undefined || options.minimumSignificantDigits !== undefined ||
      options.maximumSignificantDigits !== undefined;
    const preservePrecision = !hasPrecision && (!options.style || options.style === 'decimal' || options.style === 'percent');
    const resolved = { ...(preservePrecision ? { maximumSignificantDigits: 21 } : {}), ...options };
    return cachedFormatter(numberFormatters, formatterKey(resolved), () => new Intl.NumberFormat(locale, resolved)).format(value === 0 ? 0 : value);
  };
  return {
    locale,
    get timeZone() { return getTimeZone(); },
    direction,
    messages,
    formatNumber,
    formatDate(value, options = {}) {
      const resolved = { timeZone: getTimeZone(), ...options };
      return cachedFormatter(dateFormatters, formatterKey(resolved), () => new Intl.DateTimeFormat(locale, resolved)).format(value);
    },
    formatPercent(value, options = {}) {
      return formatNumber(value, { style: 'percent', ...options });
    },
    message(key, values = {}) {
      return messages[key].replace(/\{\{\s*([\p{ID_Continue}$._\u200c\u200d-]+)\s*\}\}/gu, (_, name: string) => String(values[name] ?? ''));
    }
  };
}

/** Converts a physical SVG text alignment into the logical anchor for a text direction.
 * Use for geometric left/right extents; ordinary text alignment should remain logical.
 */
export function physicalTextAnchor(
  anchor: 'start' | 'middle' | 'end',
  direction: 'ltr' | 'rtl'
): 'start' | 'middle' | 'end' {
  if (direction !== 'rtl' || anchor === 'middle') return anchor;
  return anchor === 'start' ? 'end' : 'start';
}
