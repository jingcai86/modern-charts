import { createChartI18n, type ChartI18n } from './i18n';
import { registerCsvExporter } from './features';
import type {
  ChartConfig,
  CsvCellContext,
  CsvColumnConfig,
  CsvColumnInput,
  CsvExportOptions,
  CsvExportPayload,
  CsvSerializerContext,
  GaugeDataInput,
  GaugeDatum,
  HeatmapRow,
  HierarchyNode,
  LineSeries,
  PieDatum,
  ResolvedCsvColumn,
  SankeyData,
  ScatterSeries
} from './types';

export type {
  CsvCellContext,
  CsvColumnConfig,
  CsvColumnInput,
  CsvExportHandler,
  CsvExportOptions,
  CsvExportPayload,
  CsvSerializer,
  CsvSerializerContext,
  CsvValueFormatter,
  ResolvedCsvColumn
} from './types';

const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';

export function escapeCsvCell(value: unknown, delimiter = ','): string {
  if (value === null || value === undefined) return '';
  const str =
    value instanceof Date
      ? Number.isNaN(value.getTime())
        ? ''
        : value.toISOString()
      : typeof value === 'number'
      ? Number.isFinite(value)
        ? String(value === 0 ? 0 : value)
        : ''
      : typeof value === 'object'
      ? JSON.stringify(value) ?? ''
      : String(value);

  return str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function normalizeCsvFilename(
  rawFilename: string | undefined,
  chartType: string,
  title?: string
): string {
  const trimmed = rawFilename?.trim();
  if (trimmed) return /\.csv$/i.test(trimmed) ? trimmed : `${trimmed}.csv`;
  const fallback = `${chartType || 'chart'}-chart`;
  const words = (title?.trim() || fallback).toLowerCase().match(/[a-z0-9]+/g);
  return `${words ? words.join('-') : fallback}.csv`;
}

function readRowValue(row: Record<string, unknown>, key: string): unknown {
  if (!row || typeof row !== 'object') return undefined;
  if (key in row) return row[key];
  return key.includes('.')
    ? key.split('.').reduce<any>((acc, k) => acc?.[k], row)
    : undefined;
}

function nodeTotal(node: HierarchyNode): number {
  const own = Number(node?.value);
  if (Number.isFinite(own) && own > 0) return own;
  return (node?.children ?? []).reduce((s, c) => s + nodeTotal(c), 0);
}

export function extractChartCsvData(
  chartType: string,
  data: unknown,
  config?: ChartConfig<any>
): { rows: Record<string, unknown>[]; defaultColumns: string[] } {
  const type = (chartType || '').toLowerCase().replace(/^mc-|-chart$/g, '');

  if (type === 'bar' || type === 'radar') {
    const defIdx = type === 'radar' ? 'metric' : 'category';
    const rows = (Array.isArray(data) ? data : [])
      .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
      .map((r) => ({ ...r }));
    let indexBy = config?.indexBy || defIdx;
    if (rows[0] && !(indexBy in rows[0]) && !config?.indexBy) {
      indexBy =
        Object.keys(rows[0]).find((k) => typeof rows[0][k] !== 'number') ??
        Object.keys(rows[0])[0] ??
        defIdx;
    }
    const seen = new Set<string>([indexBy]);
    const keys: string[] = [];
    const addKey = (k: string) => {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    };
    if (config?.keys?.length) config.keys.forEach(addKey);
    else rows.forEach((r) => Object.keys(r).forEach(addKey));
    return {
      rows,
      defaultColumns: [indexBy, ...(keys.length ? keys : config?.keys ?? ['value'])]
    };
  }

  if (type === 'line' || type === 'scatter') {
    const list = Array.isArray(data)
      ? (data as Array<LineSeries | ScatterSeries>)
      : [];
    const rows: Record<string, unknown>[] = [];
    let hasSize = false;
    let hasLabel = false;
    for (const s of list) {
      for (const pt of s?.data ?? []) {
        if (!pt || typeof pt !== 'object') continue;
        const x =
          pt.x instanceof Date
            ? Number.isNaN(pt.x.getTime())
              ? ''
              : pt.x.toISOString()
            : pt.x;
        if ('size' in pt && pt.size !== undefined) hasSize = true;
        if (pt.label !== undefined && pt.label !== '') hasLabel = true;
        rows.push({ ...pt, series: s.id, seriesId: s.id, x });
      }
    }
    const defaultColumns = ['series', 'x', 'y'];
    if (type === 'scatter' && hasSize) defaultColumns.push('size');
    if (hasLabel) defaultColumns.push('label');
    return { rows, defaultColumns };
  }

  if (type === 'pie') {
    const slices = (Array.isArray(data) ? data : []) as PieDatum[];
    const total = slices.reduce((acc, s) => {
      const v = Number(s?.value);
      return acc + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    let hasLabel = false;
    const rows = slices
      .filter((s): s is PieDatum => Boolean(s && typeof s === 'object'))
      .map((s) => {
        const v = Number(s.value ?? 0);
        if (s.label !== undefined && s.label !== s.id) hasLabel = true;
        return {
          ...s,
          label: s.label ?? s.id,
          percentage:
            total > 0 && Number.isFinite(v) && v > 0
              ? Number(((v / total) * 100).toFixed(2))
              : 0
        };
      });
    return {
      rows,
      defaultColumns: hasLabel
        ? ['id', 'label', 'value', 'percentage']
        : ['id', 'value', 'percentage']
    };
  }

  if (type === 'heatmap') {
    const rows: Record<string, unknown>[] = [];
    for (const r of (Array.isArray(data) ? data : []) as HeatmapRow[]) {
      for (const c of r?.data ?? []) {
        if (c && typeof c === 'object') {
          rows.push({ ...c, row: r.id, id: r.id, column: c.x, value: c.y });
        }
      }
    }
    return { rows, defaultColumns: ['row', 'x', 'y'] };
  }

  if (type === 'sunburst' || type === 'treemap') {
    const leavesOnly = type === 'treemap' && Boolean(config?.leavesOnly);
    const roots = Array.isArray(data)
      ? (data as HierarchyNode[])
      : data && typeof data === 'object'
      ? [data as HierarchyNode]
      : [];
    const rows: Record<string, unknown>[] = [];
    const visit = (n: HierarchyNode, parent: string, depth: number, path: string[]) => {
      if (!n || typeof n !== 'object') return;
      const name = String(n.name ?? '');
      const nextPath = name ? [...path, name] : path;
      const kids = n.children ?? [];
      if (!leavesOnly || !kids.length) {
        rows.push({ name, parent, depth, value: nodeTotal(n), path: nextPath.join(' / ') });
      }
      kids.forEach((c) => visit(c, name, depth + 1, nextPath));
    };
    roots.forEach((r) => visit(r, '', 0, []));
    return { rows, defaultColumns: ['name', 'parent', 'depth', 'value', 'path'] };
  }

  if (type === 'sankey') {
    const s = (data && typeof data === 'object' ? data : {}) as SankeyData;
    const nodes = Array.isArray(s.nodes) ? s.nodes : [];
    const links = Array.isArray(s.links) ? s.links : [];
    const names = new Map(nodes.map((n) => [String(n.id), String(n.name ?? n.id)]));
    return links.length
      ? {
          rows: links.map((l) => ({
            ...l,
            sourceName: names.get(String(l.source)) ?? l.source,
            targetName: names.get(String(l.target)) ?? l.target
          })),
          defaultColumns: ['source', 'target', 'value']
        }
      : {
          rows: nodes.map((n) => ({ ...n, name: n.name ?? n.id })),
          defaultColumns: nodes.length ? ['id', 'name'] : ['source', 'target', 'value']
        };
  }

  if (type === 'gauge') {
    const raw = data as GaugeDataInput | null | undefined;
    const items: GaugeDatum[] = Array.isArray(raw)
      ? raw.filter((d): d is GaugeDatum => Boolean(d && typeof d === 'object'))
      : raw && typeof raw === 'object'
      ? [raw]
      : [];
    let hasTarget = false;
    const rows = items.map((d) => {
      if (d.target !== undefined) hasTarget = true;
      return {
        ...d,
        label: d.label ?? config?.centerLabel ?? config?.title ?? 'Gauge',
        min: d.min ?? config?.min ?? 0,
        max: d.max ?? config?.max ?? 100,
        unit: d.unit ?? config?.unit ?? ''
      };
    });
    return {
      rows,
      defaultColumns: hasTarget
        ? ['label', 'value', 'min', 'max', 'unit', 'target']
        : ['label', 'value', 'min', 'max', 'unit']
    };
  }

  const rows = (Array.isArray(data) ? data : [])
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
    .map((r) => ({ ...r }));
  return { rows, defaultColumns: rows[0] ? Object.keys(rows[0]) : [] };
}

export function extractChartCsvRows(
  chartType: string,
  data: unknown,
  config?: ChartConfig<any>
): Record<string, unknown>[] {
  return extractChartCsvData(chartType, data, config).rows;
}

function resolveColumns<TRow extends Record<string, unknown>>(
  inputs: CsvColumnInput<TRow>[] | undefined,
  defaults: string[],
  headers: string[] | Record<string, string> | undefined,
  rows: TRow[]
): ResolvedCsvColumn<TRow>[] {
  const list: CsvColumnInput<TRow>[] = inputs?.length
    ? inputs
    : defaults.length
    ? defaults
    : rows[0]
    ? Object.keys(rows[0])
    : [];
  const isArr = Array.isArray(headers);
  const map = !isArr && headers && typeof headers === 'object' ? headers : undefined;
  return list.map((col, idx) => {
    const desc: CsvColumnConfig<TRow> = typeof col === 'string' ? { key: col } : col;
    const h = isArr ? headers[idx] : map?.[desc.key];
    return {
      key: desc.key,
      header: String(h ?? desc.header ?? desc.key),
      format: desc.format ?? desc.formatter,
      value: desc.value
    };
  });
}

export function serializeChartCsv<
  TData = any,
  TRow extends Record<string, unknown> = Record<string, unknown>
>(
  chartType: string,
  data: TData,
  options: CsvExportOptions<TData, TRow> = {},
  config?: ChartConfig<TData>,
  i18nInput?: ChartI18n
): CsvExportPayload<TData, TRow> {
  const i18n = i18nInput ?? createChartI18n(config?.i18n);
  const delimiter = options.delimiter ?? ',';
  const lineEnding = options.lineEnding ?? '\n';
  const includeHeaders = options.includeHeaders !== false;
  const bom = Boolean(options.bom);
  const useLocaleFormat = Boolean(options.useLocaleFormat);
  const formatValue = options.formatValue ?? options.formatter;

  const extracted = extractChartCsvData(chartType, data, config);
  let rows = extracted.rows as TRow[];
  let cols = resolveColumns<TRow>(
    options.columns,
    extracted.defaultColumns,
    options.headers,
    rows
  );

  const rawName =
    typeof options.filename === 'function'
      ? options.filename({ chartType, title: config?.title, data })
      : options.filename;
  const filename = normalizeCsvFilename(rawName, chartType, config?.title);

  const buildCsv = (targetRows: TRow[], targetCols: ResolvedCsvColumn<TRow>[]): string => {
    const lines: string[] = [];
    if (includeHeaders && targetCols.length > 0) {
      lines.push(
        targetCols.map((c) => escapeCsvCell(c.header, delimiter)).join(delimiter)
      );
    }
    targetRows.forEach((row, rowIndex) => {
      lines.push(
        targetCols
          .map((col, columnIndex) => {
            const ctx: CsvCellContext<TRow> = {
              key: col.key,
              column: col.key,
              header: col.header,
              row,
              rowIndex,
              columnIndex,
              chartType,
              i18n
            };
            let v =
              typeof col.value === 'function'
                ? col.value(row, rowIndex, ctx)
                : readRowValue(row, col.key);
            if (typeof col.format === 'function') v = col.format(v, row, ctx);
            else if (typeof formatValue === 'function') v = formatValue(v, ctx, row);
            else if (useLocaleFormat) {
              if (typeof v === 'number' && Number.isFinite(v)) v = i18n.formatNumber(v);
              else if (v instanceof Date && !Number.isNaN(v.getTime())) v = i18n.formatDate(v);
            }
            return escapeCsvCell(v, delimiter);
          })
          .join(delimiter)
      );
    });
    const out = lines.join(lineEnding);
    return bom ? `\uFEFF${out}` : out;
  };

  const defaultSerialize = () => buildCsv(rows, cols);
  const customSerializer = options.serializer ?? options.serialize;
  let csv: string;

  if (typeof customSerializer === 'function') {
    const ctx: CsvSerializerContext<TData, TRow> = {
      chartType,
      data,
      rows,
      columns: cols,
      headers: cols.map((c) => c.header),
      filename,
      delimiter,
      lineEnding,
      includeHeaders,
      i18n,
      config,
      defaultSerialize
    };
    const res = customSerializer(ctx, defaultSerialize);
    if (typeof res === 'string') {
      csv = bom && !res.startsWith('\uFEFF') ? `\uFEFF${res}` : res;
    } else if (Array.isArray(res)) {
      if (res.length > 0 && Array.isArray(res[0])) {
        const lines: string[] = [];
        if (includeHeaders && Array.isArray(options.headers)) {
          lines.push(
            options.headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter)
          );
        }
        for (const r of res as unknown[][]) {
          lines.push(r.map((c) => escapeCsvCell(c, delimiter)).join(delimiter));
        }
        const out = lines.join(lineEnding);
        csv = bom ? `\uFEFF${out}` : out;
      } else {
        rows = (res as TRow[]).map((r) => ({ ...r }));
        cols = resolveColumns<TRow>(
          options.columns,
          options.columns ? [] : rows[0] ? Object.keys(rows[0]) : extracted.defaultColumns,
          options.headers,
          rows
        );
        csv = buildCsv(rows, cols);
      }
    } else {
      csv = defaultSerialize();
    }
  } else {
    csv = defaultSerialize();
  }

  return {
    csv,
    filename,
    chartType,
    rows,
    columns: cols.map((c) => c.key),
    headers: cols.map((c) => c.header),
    data,
    mimeType: CSV_MIME_TYPE
  };
}

export function downloadCsv(
  csv: string,
  filename: string,
  mimeType = CSV_MIME_TYPE
): boolean {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL?.createObjectURL !== 'function'
  ) {
    return false;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: mimeType }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body?.appendChild(a);
    a.click();
    a.remove();
    return true;
  } finally {
    URL.revokeObjectURL?.(url);
  }
}

registerCsvExporter({
  serialize: serializeChartCsv,
  download: downloadCsv
});
