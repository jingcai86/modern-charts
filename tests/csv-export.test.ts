import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureChartFeatures,
  configureI18n,
  downloadCsv,
  escapeCsvCell,
  extractChartCsvRows,
  getChartFeatures,
  isChartFeatureEnabled,
  normalizeCsvFilename,
  registerModernCharts,
  serializeChartCsv,
  type CsvExportPayload,
  type MCBaseChart
} from '../src/index';
import { registerBarChart } from '../src/entries/bar';
import { registerLineChart } from '../src/entries/line';
import { registerPieChart } from '../src/entries/pie';
import { registerHeatmapChart } from '../src/entries/heatmap';
import { registerRadarChart } from '../src/entries/radar';
import { registerSunburstChart } from '../src/entries/sunburst';
import { registerSankeyChart } from '../src/entries/sankey';
import { registerScatterChart } from '../src/entries/scatter';
import { registerTreemapChart } from '../src/entries/treemap';
import { registerGaugeChart } from '../src/entries/gauge';
import { CHART_CATALOG } from '../apps/studio/catalog';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_GAUGE_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_LINE_DATA,
  SAMPLE_PIE_DATA,
  SAMPLE_RADAR_DATA,
  SAMPLE_SANKEY_DATA,
  SAMPLE_SCATTER_DATA,
  SAMPLE_SUNBURST_DATA
} from '../apps/studio/sample-data';
import { renderChartDetailPage } from '../apps/studio/pages/chart-detail';
import { resetChartConfig } from '../apps/studio/state/config-store';
import { GUIDES_CATALOG, renderGuidePage } from '../apps/studio/guides';
import {
  extractChartConfigBlock,
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';

beforeAll(async () => {
  await registerModernCharts();
});

afterEach(async () => {
  document.body.replaceChildren();
  configureI18n({});
  await configureChartFeatures({ features: { csvExport: false, zoom: false } });
  for (const entry of CHART_CATALOG) {
    resetChartConfig(entry);
  }
  vi.restoreAllMocks();
});

describe('Opt-in csvExport feature bootstrapping (default false across all charts)', () => {
  it('defaults csvExport feature to false on registerModernCharts() and all 10 register<Chart>() entrypoints, and enables when features.csvExport is true', async () => {
    await configureChartFeatures({ features: { csvExport: false } });
    expect(isChartFeatureEnabled('csvExport')).toBe(false);
    expect(getChartFeatures().csvExport).toBe(false);

    // Calling registerModernCharts() and all 10 per-chart registrars without options keeps csvExport: false
    await registerModernCharts();
    const registrars = [
      registerBarChart,
      registerLineChart,
      registerPieChart,
      registerHeatmapChart,
      registerRadarChart,
      registerSunburstChart,
      registerSankeyChart,
      registerScatterChart,
      registerTreemapChart,
      registerGaugeChart
    ];
    for (const registerFn of registrars) {
      await registerFn();
      expect(isChartFeatureEnabled('csvExport')).toBe(false);
    }

    // Mount a chart while csvExport feature is false (default)
    const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
    bar.config = {
      width: 480,
      height: 280,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud'],
      data: SAMPLE_BAR_DATA
    };
    document.body.appendChild(bar);

    expect(bar.isFeatureEnabled('csvExport')).toBe(false);
    expect(bar.toCsv()).toBe('');
    const disabledPayload = bar.exportCsv();
    expect(disabledPayload.csv).toBe('');
    expect(disabledPayload.rows).toEqual([]);

    // Enable csvExport via per-chart bootstrap function
    await registerBarChart({ features: { csvExport: true } });
    expect(isChartFeatureEnabled('csvExport')).toBe(true);
    expect(bar.isFeatureEnabled('csvExport')).toBe(true);
    expect(bar.toCsv()).toContain('quarter,Cloud');

    // Disabling csvExport feature at runtime turns off CSV serialization
    await registerBarChart({ features: { csvExport: false } });
    expect(bar.isFeatureEnabled('csvExport')).toBe(false);
    expect(bar.toCsv()).toBe('');
  });
});

describe('Customizable CSV export across all 10 chart types (Issue #125)', () => {
  it('provides built-in CSV serialization for all 10 chart types via chart.toCsv() and chart.exportCsv()', async () => {
    await registerModernCharts({ features: { csvExport: true } });
    const cases: Array<{
      id: string;
      tag: string;
      config: Record<string, any>;
      expectedHeader: string;
      expectedSubstring: string;
      minRows: number;
    }> = [
      {
        id: 'bar',
        tag: 'mc-bar-chart',
        config: {
          title: 'Quarterly Spend ($K)',
          indexBy: 'quarter',
          keys: ['Cloud', 'Edge', 'OnPrem'],
          data: SAMPLE_BAR_DATA
        },
        expectedHeader: 'quarter,Cloud,Edge,OnPrem',
        expectedSubstring: 'Q1,142,94,58',
        minRows: 4
      },
      {
        id: 'line',
        tag: 'mc-line-chart',
        config: {
          title: 'Throughput',
          data: SAMPLE_LINE_DATA
        },
        expectedHeader: 'series,x,y',
        expectedSubstring: 'Inference,Jan,120',
        minRows: 21
      },
      {
        id: 'pie',
        tag: 'mc-pie-chart',
        config: {
          title: 'Runtime Footprint',
          data: SAMPLE_PIE_DATA
        },
        expectedHeader: 'id,value,percentage',
        expectedSubstring: 'D3 Scales & Layout,420,32.31',
        minRows: 5
      },
      {
        id: 'heatmap',
        tag: 'mc-heatmap-chart',
        config: {
          title: 'CPU Load (%)',
          data: SAMPLE_HEATMAP_DATA
        },
        expectedHeader: 'row,x,y',
        expectedSubstring: 'Mon,00:00,18',
        minRows: 20
      },
      {
        id: 'radar',
        tag: 'mc-radar-chart',
        config: {
          title: 'Benchmark Score',
          indexBy: 'metric',
          keys: ['ModernCharts', 'TraditionalChart'],
          data: SAMPLE_RADAR_DATA
        },
        expectedHeader: 'metric,ModernCharts,TraditionalChart',
        expectedSubstring: 'Zero Reflow Text,98,52',
        minRows: 6
      },
      {
        id: 'sunburst',
        tag: 'mc-sunburst-chart',
        config: {
          title: 'Module Hierarchy',
          data: SAMPLE_SUNBURST_DATA
        },
        expectedHeader: 'name,parent,depth,value,path',
        expectedSubstring:
          'Pretext LabelEngine,Core Engine,2,320,modern-charts / Core Engine / Pretext LabelEngine',
        minRows: 10
      },
      {
        id: 'sankey',
        tag: 'mc-sankey-chart',
        config: {
          title: 'Pipeline Flow',
          data: SAMPLE_SANKEY_DATA
        },
        expectedHeader: 'source,target,value',
        expectedSubstring: 'AI Prompt,DOM Stream,460',
        minRows: 8
      },
      {
        id: 'scatter',
        tag: 'mc-scatter-chart',
        config: {
          title: 'FPS vs Size',
          data: SAMPLE_SCATTER_DATA
        },
        expectedHeader: 'series,x,y,size,label',
        expectedSubstring: 'Modern,12,88,22,mc-line',
        minRows: 7
      },
      {
        id: 'treemap',
        tag: 'mc-treemap-chart',
        config: {
          title: 'Package Footprint',
          data: SAMPLE_SUNBURST_DATA
        },
        expectedHeader: 'name,parent,depth,value,path',
        expectedSubstring:
          'D3 ScaleManager,Core Engine,2,240,modern-charts / Core Engine / D3 ScaleManager',
        minRows: 10
      },
      {
        id: 'gauge',
        tag: 'mc-gauge-chart',
        config: {
          title: 'Layout Efficiency',
          data: { ...SAMPLE_GAUGE_DATA }
        },
        expectedHeader: 'label,value,min,max,unit',
        expectedSubstring: 'Zero-Reflow Layout Score,94,0,100,%',
        minRows: 1
      }
    ];

    for (const c of cases) {
      const chart = document.createElement(c.tag) as MCBaseChart<any>;
      chart.config = { width: 480, height: 280, animate: false, ...c.config };
      document.body.appendChild(chart);

      const csv = chart.toCsv();
      const lines = csv.split('\n');
      expect(lines[0], c.id).toBe(c.expectedHeader);
      expect(csv, c.id).toContain(c.expectedSubstring);

      let exported: CsvExportPayload | null = null;
      const payload = chart.exportCsv({
        handler: (p) => {
          exported = p;
        }
      });
      expect(exported, c.id).not.toBeNull();
      expect(payload.csv, c.id).toBe(csv);
      expect(payload.rows.length, c.id).toBeGreaterThanOrEqual(c.minRows);
      expect(payload.filename, c.id).toMatch(/\.csv$/);
      chart.remove();
    }
  });

  it('customizes columns, headers (array and map), value formatting, and filename', async () => {
    await registerModernCharts({ features: { csvExport: true } });
    const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
    bar.config = {
      width: 480,
      height: 280,
      animate: false,
      title: 'Quarterly Spend ($K)',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      data: [
        { quarter: 'Q1, 2026', Cloud: 142.5, Edge: 94.25, OnPrem: 58 },
        { quarter: 'Q2 "Peak"', Cloud: 168, Edge: 118.75, OnPrem: 52 }
      ],
      csvExport: {
        filename: 'custom-spend-export',
        columns: [
          'quarter',
          'Cloud',
          {
            key: 'total',
            header: 'Combined ($K)',
            value: (row: any) => Number(row.Cloud) + Number(row.Edge),
            format: (val) => `$${Number(val).toFixed(2)}K`
          }
        ],
        headers: {
          quarter: 'Fiscal Period',
          Cloud: 'Cloud Spend'
        },
        formatValue: (value, { key }) =>
          key === 'Cloud' && typeof value === 'number'
            ? `$${value.toFixed(1)}K`
            : value
      }
    };
    document.body.appendChild(bar);

    const payload = bar.exportCsv({ download: false });
    expect(payload.filename).toBe('custom-spend-export.csv');
    expect(payload.columns).toEqual(['quarter', 'Cloud', 'total']);
    expect(payload.headers).toEqual([
      'Fiscal Period',
      'Cloud Spend',
      'Combined ($K)'
    ]);
    expect(payload.csv).toBe(
      [
        'Fiscal Period,Cloud Spend,Combined ($K)',
        '"Q1, 2026",$142.5K,$236.75K',
        '"Q2 ""Peak""",$168.0K,$286.75K'
      ].join('\n')
    );

    // Override headers with an array and filename with a generator callback
    const overridePayload = bar.exportCsv({
      download: false,
      columns: ['quarter', 'Edge'],
      headers: ['Period', 'Edge ($K)'],
      filename: ({ chartType }) => `${chartType}-edge-only.csv`
    });
    expect(overridePayload.filename).toBe('bar-edge-only.csv');
    expect(overridePayload.csv).toBe(
      ['Period,Edge ($K)', '"Q1, 2026",94.25', '"Q2 ""Peak""",118.75'].join('\n')
    );
  });

  it('supports custom data serializers returning strings, row objects, or 2D arrays, and custom export handlers', async () => {
    await registerModernCharts({ features: { csvExport: true } });
    const pie = document.createElement('mc-pie-chart') as MCBaseChart<any>;
    pie.config = {
      width: 400,
      height: 280,
      animate: false,
      data: [
        { id: 'Compute', label: 'Compute Nodes', value: 60 },
        { id: 'Storage', label: 'Object Storage', value: 40 }
      ]
    };
    document.body.appendChild(pie);

    // 1. Custom serializer returning row objects
    const fromObjects = pie.toCsv({
      serializer: ({ rows }) =>
        rows.map((r) => ({
          slice: r.label,
          share: `${r.percentage}%`
        }))
    });
    expect(fromObjects).toBe(
      ['slice,share', 'Compute Nodes,60%', 'Object Storage,40%'].join('\n')
    );

    // 2. Custom serializer returning a raw CSV string + BOM
    const fromString = pie.toCsv({
      bom: true,
      serializer: ({ defaultSerialize }) => `${defaultSerialize()}\nTotal,,100,100`
    });
    expect(fromString.startsWith('\uFEFFid,label,value,percentage\n')).toBe(
      true
    );
    expect(fromString).toContain('Total,,100,100');

    // 3. Custom serializer returning a 2D array
    const fromMatrix = pie.toCsv({
      headers: ['Slice', 'Value'],
      serializer: () => [
        ['Compute', 60],
        ['Storage', 40]
      ]
    });
    expect(fromMatrix).toBe('Slice,Value\nCompute,60\nStorage,40');

    // 4. Custom export handler & mc-export event
    const handlerSpy = vi.fn();
    const eventSpy = vi.fn();
    pie.addEventListener('mc-export', eventSpy);

    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL');
    const result = pie.exportCsv({
      filename: 'pie-slices',
      handler: handlerSpy
    });

    expect(handlerSpy).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledWith(result);
    expect(eventSpy).toHaveBeenCalledOnce();
    expect(createObjectUrlSpy).not.toHaveBeenCalled();

    // 5. Default browser download when no custom handler is passed
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    pie.exportCsv({ filename: 'browser-download.csv' });
    expect(createObjectUrlSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).toHaveBeenCalledOnce();
  });

  it('handles edge cases in CSV helpers (dates, locale formatting, treemap leavesOnly, sankey nodes fallback)', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(new Date('2026-01-05T00:00:00.000Z'))).toBe(
      '2026-01-05T00:00:00.000Z'
    );
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(normalizeCsvFilename('report.CSV', 'bar')).toBe('report.CSV');
    expect(normalizeCsvFilename('', 'line', 'Monthly Revenue ($M)')).toBe(
      'monthly-revenue-m.csv'
    );

    // Treemap leavesOnly
    const treemapLeaves = extractChartCsvRows('treemap', SAMPLE_SUNBURST_DATA, {
      leavesOnly: true
    });
    expect(treemapLeaves.every((r) => Number(r.depth) > 0)).toBe(true);

    // Sankey nodes-only fallback
    const sankeyNodesPayload = serializeChartCsv('sankey', {
      nodes: [{ id: 'n1', name: 'Node 1' }],
      links: []
    });
    expect(sankeyNodesPayload.columns).toEqual(['id', 'name']);
    expect(sankeyNodesPayload.csv).toBe('id,name\nn1,Node 1');

    // Locale formatting option
    const localePayload = serializeChartCsv(
      'bar',
      [{ category: 'A', val: 1234.5 }],
      { useLocaleFormat: true },
      { i18n: { locale: 'de-DE' } }
    );
    expect(localePayload.csv).toBe('category,val\nA,"1.234,5"');

    expect(downloadCsv('a,b\n1,2', 'test.csv')).toBe(true);
  });

  it('renders Export CSV action button in Studio Chart Detail page for all 10 charts', () => {
    for (const entry of CHART_CATALOG) {
      const root = document.createElement('div');
      document.body.appendChild(root);
      renderChartDetailPage(root, entry);

      const studioExportBtn = root.querySelector<HTMLButtonElement>(
        '#btn-detail-export-csv'
      )!;
      expect(studioExportBtn, entry.id).not.toBeNull();

      const createUrlSpy = vi.spyOn(URL, 'createObjectURL');
      studioExportBtn.click();
      expect(createUrlSpy, entry.id).toHaveBeenCalled();
      const readout = root.querySelector('#detail-aria-readout')!;
      expect(readout.textContent, entry.id).toContain('mc-export → filename=');

      root.remove();
    }
  }, 20000);
});

describe('Customizable CSV Data Export Studio guide', () => {
  it('renders interactive CSV export presets and all 10 chart switchers in csv-export guide', () => {
    expect(
      GUIDES_CATALOG.find((g) => g.id === 'csv-export')?.title
    ).toContain('Customizable CSV Data Export');

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'csv-export', 'dark');
    expect(charts).toHaveLength(2);

    // Example 1: Preset switching updates CSV readout and live editor
    const ex1 = root.querySelector<HTMLElement>('#ce-custom-csv')!;
    const readout1 = ex1.querySelector<HTMLElement>('#ce-readout-1')!;
    const editor1 = ex1.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(readout1.textContent).toContain('quarter,Cloud,Edge,OnPrem');
    expect(editor1.value).toContain("import { registerBarChart } from 'modern-charts/bar';");
    expect(editor1.value).toContain('await registerBarChart(');
    expect(editor1.value).toContain("document.createElement('mc-bar-chart')");
    expect(editor1.value).toContain('chart.toCsv()');

    ex1
      .querySelector<HTMLButtonElement>('[data-csv-preset="columns"]')!
      .click();
    expect(readout1.textContent).toContain(
      'Fiscal Quarter,Cloud Spend ($K),Edge Spend ($K)'
    );

    ex1
      .querySelector<HTMLButtonElement>('[data-csv-preset="formatted"]')!
      .click();
    expect(readout1.textContent).toContain('$142.0K');
    expect(editor1.value).not.toContain('[Function]');
    editor1.value = editor1.value.replace("'formatted-quarterly-spend'", "'reviewed-spend'");
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ex1.querySelector('#ce-filename-1')!.textContent).toBe('reviewed-spend.csv');
    expect(readout1.textContent).toContain('$142.0K');

    ex1
      .querySelector<HTMLButtonElement>('[data-csv-preset="serializer"]')!
      .click();
    expect(readout1.textContent).toContain('Quarter,Cloud,Edge,Total');

    ex1.querySelector<HTMLButtonElement>('#ce-btn-export-1')!.click();
    expect(ex1.querySelector('#ce-filename-1')!.textContent).toContain(
      'exported 4 rows'
    );

    // Edit and reset live config editor 1
    ex1.querySelector<HTMLButtonElement>('[data-csv-preset="default"]')!.click();
    const configBlock1 = extractChartConfigBlock(editor1.value)!;
    const cfg1 = parseConfigObjectLiteral(configBlock1);
    cfg1.csvExport = { filename: 'edited-spend.csv' };
    editor1.value = editor1.value.replace(configBlock1, formatConfigAssignment(cfg1, ''));
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ex1.querySelector('#ce-filename-1')!.textContent).toBe(
      'edited-spend.csv'
    );
    ex1.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(ex1.querySelector('#ce-filename-1')!.textContent).toBe(
      'quarterly-spend-k.csv'
    );

    // Example 2: Switching across all 10 chart types updates serialized CSV preview
    const ex2 = root.querySelector<HTMLElement>('#ce-chart-types')!;
    const readout2 = ex2.querySelector<HTMLElement>('#ce-readout-2')!;
    const editor2 = ex2.querySelector<HTMLTextAreaElement>('textarea')!;
    const typeBtns = Array.from(
      ex2.querySelectorAll<HTMLButtonElement>('button[data-ce-chart-type]')
    );
    expect(typeBtns).toHaveLength(10);

    for (const btn of typeBtns) {
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(editor2.value).toContain(`from 'modern-charts/${btn.dataset.ceChartType}'`);
      expect(readout2.textContent!.split('\n').length).toBeGreaterThanOrEqual(
        2
      );
    }

    ex2.querySelector<HTMLButtonElement>('#ce-btn-handler-2')!.click();
    expect(ex2.querySelector('#ce-handler-status-2')!.textContent).toContain(
      'Custom handler invoked'
    );

    // Edit and reset live config editor 2
    expect(editor2.value).toContain('chart.exportCsv({');
    const configBlock2 = extractChartConfigBlock(editor2.value)!;
    const cfg2 = parseConfigObjectLiteral(configBlock2);
    cfg2.title = 'Updated Efficiency';
    editor2.value = editor2.value.replace(configBlock2, formatConfigAssignment(cfg2, ''));
    editor2.dispatchEvent(new Event('input', { bubbles: true }));
    expect(charts[1].config.title).toBe('Updated Efficiency');
    ex2.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(charts[1].config.title).toBe('Layout Efficiency');
  }, 20000);

  it('shares bootstrap flags across the two CSV examples and preserves their independent configs', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'csv-export', 'dark');
    const editor1 = root.querySelector<HTMLTextAreaElement>('#ce-editor-1 textarea')!;
    const editor2 = root.querySelector<HTMLTextAreaElement>('#ce-editor-2 textarea')!;
    const preview1 = root.querySelector<HTMLElement>('#ce-readout-1')!;
    const preview2 = root.querySelector<HTMLElement>('#ce-readout-2')!;
    const exportButton = root.querySelector<HTMLButtonElement>('#ce-btn-export-1')!;
    const handlerButton = root.querySelector<HTMLButtonElement>('#ce-btn-handler-2')!;
    const [bar, pie] = charts;

    expect(charts).toHaveLength(2);
    expect(root.querySelector('#bs-chart')).toBeNull();
    const originalBarConfig = extractChartConfigBlock(editor1.value)!;
    const originalPieConfig = extractChartConfigBlock(editor2.value);
    const customBarConfig = originalBarConfig.replace(
      'Quarterly Spend ($K)',
      'Revised Quarterly Spend'
    );
    editor1.value = editor1.value.replace(originalBarConfig, customBarConfig);
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    expect(bar.config.title).toBe('Revised Quarterly Spend');
    expect(extractChartConfigBlock(editor2.value)).toBe(originalPieConfig);

    editor2.value = editor2.value.replace('csvExport: true', 'csvExport: false');
    editor2.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => {
      expect(editor2.getAttribute('aria-invalid')).toBe('false');
      expect(editor1.value).toContain('csvExport: false');
      expect(preview1.textContent).toBe('');
      expect(preview2.textContent).toBe('');
      expect(bar.toCsv()).toBe('');
      expect(pie.toCsv()).toBe('');
      expect(exportButton.disabled).toBe(true);
      expect(handlerButton.disabled).toBe(true);
    });

    editor1.value = editor1.value.replace('csvExport: false', 'csvExport: true');
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => {
      expect(editor2.value).toContain('csvExport: true');
      expect(extractChartConfigBlock(editor1.value)).toContain('Revised Quarterly Spend');
      expect(extractChartConfigBlock(editor2.value)).toBe(originalPieConfig);
      expect(exportButton.disabled).toBe(false);
      expect(handlerButton.disabled).toBe(false);
      expect(bar.toCsv()).toContain('quarter,Cloud,Edge,OnPrem');
      expect(pie.toCsv()).toContain('id,value,percentage');
      expect(preview1.textContent).toBe(bar.toCsv());
      expect(preview2.textContent).toBe(pie.toCsv());
    });
  });
});
