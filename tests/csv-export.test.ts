import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureI18n,
  downloadCsv,
  escapeCsvCell,
  extractChartCsvRows,
  normalizeCsvFilename,
  registerModernCharts,
  serializeChartCsv,
  type CsvExportPayload,
  type MCBaseChart
} from '../src/index';
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

beforeAll(() => {
  registerModernCharts();
});

afterEach(() => {
  document.body.replaceChildren();
  configureI18n({});
  for (const entry of CHART_CATALOG) {
    resetChartConfig(entry);
  }
  vi.restoreAllMocks();
});

describe('Customizable CSV export across all 10 chart types (Issue #125)', () => {
  it('provides built-in CSV serialization for all 10 chart types via chart.toCsv() and chart.exportCsv()', () => {
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

  it('customizes columns, headers (array and map), value formatting, and filename', () => {
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

  it('supports custom data serializers returning strings, row objects, or 2D arrays, and custom export handlers', () => {
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
  });
});

describe('Customizable CSV Data Export Studio guide', () => {
  it('renders interactive CSV export presets and all 10 chart switchers', () => {
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
    expect(readout1.textContent).toContain('quarter,Cloud,Edge,OnPrem');

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

    ex1.querySelector<HTMLButtonElement>('#ce-btn-export-1')!.click();
    expect(ex1.querySelector('#ce-filename-1')!.textContent).toContain(
      'exported 4 rows'
    );

    // Example 2: Switching across all 10 chart types updates serialized CSV preview
    const ex2 = root.querySelector<HTMLElement>('#ce-chart-types')!;
    const readout2 = ex2.querySelector<HTMLElement>('#ce-readout-2')!;
    const typeBtns = Array.from(
      ex2.querySelectorAll<HTMLButtonElement>('button[data-ce-chart-type]')
    );
    expect(typeBtns).toHaveLength(10);

    for (const btn of typeBtns) {
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(readout2.textContent!.split('\n').length).toBeGreaterThanOrEqual(
        2
      );
    }

    ex2.querySelector<HTMLButtonElement>('#ce-btn-handler-2')!.click();
    expect(ex2.querySelector('#ce-handler-status-2')!.textContent).toContain(
      'Custom handler invoked'
    );
  });
});
