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
import {
  CHART_CATALOG,
  getAllAttributesForChart
} from '../apps/studio/catalog';
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
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';

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
});

describe('Dedicated Zoom on/off button and zoom support across all 10 chart types (Issue #125)', () => {
  it('enables zoom support in Studio catalog and renders a keyboard-accessible Zoom on/off toggle button for all 10 charts', () => {
    expect(CHART_CATALOG).toHaveLength(10);

    for (const entry of CHART_CATALOG) {
      expect(entry.supportsViewZoom, entry.id).toBe(true);
      expect(entry.subComponents, entry.id).toContain('mc-view-layer');
      const attrs = getAllAttributesForChart(entry).map((a) => a.configPath);
      expect(attrs, entry.id).toContain('view.zoomable');
      expect(attrs, entry.id).toContain('view.pannable');
      expect(attrs, entry.id).toContain('view.showControls');
      expect(attrs, entry.id).toContain('view.maxZoom');

      const root = document.createElement('div');
      document.body.appendChild(root);
      const chart = renderChartDetailPage(root, entry);

      // Studio toolbar has both Zoom on/off button and Export CSV button
      const studioZoomBtn = root.querySelector<HTMLButtonElement>(
        '#btn-detail-zoom-toggle'
      )!;
      const studioExportBtn = root.querySelector<HTMLButtonElement>(
        '#btn-detail-export-csv'
      )!;
      expect(studioZoomBtn, entry.id).not.toBeNull();
      expect(studioExportBtn, entry.id).not.toBeNull();
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(studioZoomBtn.getAttribute('data-zoom-state'), entry.id).toBe(
        'on'
      );

      // On-chart shared view controls have [data-zoom="toggle"], [data-zoom="in"], [data-zoom="out"], [data-zoom="reset"]
      const controls = chart.shadowRoot!.querySelector<HTMLElement>(
        '.mc-view-controls'
      )!;
      expect(controls.hidden, entry.id).toBe(false);
      const onChartToggle = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="toggle"]'
      )!;
      const zoomInBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="in"]'
      )!;
      const zoomOutBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="out"]'
      )!;
      const resetBtn = controls.querySelector<HTMLButtonElement>(
        'button[data-zoom="reset"]'
      )!;
      expect(onChartToggle, entry.id).not.toBeNull();
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(onChartToggle.textContent, entry.id).toBe('Zoom: On');

      // 1. Zoom in while zoom is enabled
      const viewport = chart.shadowRoot!.querySelector<SVGGElement>(
        '.mc-chart-viewport'
      )!;
      zoomInBtn.click();
      const zoomedTransform = viewport.getAttribute('transform');
      expect(zoomedTransform, entry.id).toContain('scale(1.25)');

      // 2. Toggle zoom OFF via keyboard (Enter key) on the on-chart toggle button
      onChartToggle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      expect(chart.zoomable, entry.id).toBe(false);
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe(
        'false'
      );
      expect(onChartToggle.getAttribute('data-zoom-state'), entry.id).toBe(
        'off'
      );
      expect(onChartToggle.textContent, entry.id).toBe('Zoom: Off');
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe(
        'false'
      );
      expect(zoomInBtn.disabled, entry.id).toBe(true);
      expect(zoomOutBtn.disabled, entry.id).toBe(true);
      expect(resetBtn.disabled, entry.id).toBe(true);

      // 3. Disabling zoom prevents zoom controls (+, −, Reset) and wheel gestures from changing the view
      zoomInBtn.click();
      zoomOutBtn.click();
      resetBtn.click();
      chart.zoomIn();
      chart.zoomOut();
      chart.resetZoom();
      const svg = chart.shadowRoot!.querySelector<SVGSVGElement>(
        '.mc-chart-svg'
      )!;
      const wheelEvent = Object.assign(
        new MouseEvent('wheel', {
          clientX: 120,
          clientY: 120,
          cancelable: true
        }),
        { deltaY: -20, deltaMode: WheelEvent.DOM_DELTA_LINE }
      );
      expect(svg.dispatchEvent(wheelEvent), entry.id).toBe(true);
      expect(viewport.getAttribute('transform'), entry.id).toBe(
        zoomedTransform
      );

      // 4. Re-enable zoom via keyboard (Space key) on Studio's dedicated Zoom on/off button
      studioZoomBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
      studioZoomBtn.dispatchEvent(
        new KeyboardEvent('keyup', { key: ' ', bubbles: true })
      );
      expect(chart.zoomable, entry.id).toBe(true);
      expect(studioZoomBtn.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(onChartToggle.getAttribute('aria-pressed'), entry.id).toBe('true');
      expect(zoomInBtn.disabled, entry.id).toBe(false);

      // 5. Reset button works again once zoom is re-enabled
      resetBtn.click();
      expect(viewport.getAttribute('transform'), entry.id).toBe(
        'translate(0, 0) scale(1)'
      );

      // 6. Clicking Export CSV in Studio logs the mc-export event in Live Unified Event Inspector
      const createUrlSpy = vi.spyOn(URL, 'createObjectURL');
      studioExportBtn.click();
      expect(createUrlSpy, entry.id).toHaveBeenCalled();
      const readout = root.querySelector('#detail-aria-readout')!;
      expect(readout.textContent, entry.id).toContain('mc-export → filename=');

      root.remove();
    }
  });

  it('prevents brush and slider zoom gestures from changing the view when zoom is disabled', () => {
    const line = document.createElement('mc-line-chart') as MCBaseChart<any>;
    line.config = {
      width: 500,
      height: 300,
      animate: false,
      data: SAMPLE_LINE_DATA,
      view: {
        zoomable: true,
        pannable: false,
        brush: true,
        slider: true,
        showControls: true
      }
    };
    document.body.appendChild(line);

    const svg = line.shadowRoot!.querySelector<SVGSVGElement>('.mc-chart-svg')!;
    const viewport = line.shadowRoot!.querySelector<SVGGElement>(
      '.mc-chart-viewport'
    )!;
    const slider = line.shadowRoot!.querySelector<HTMLElement>(
      '.mc-view-slider'
    )!;
    const sliderWindow = slider.querySelector<HTMLElement>(
      '.mc-view-slider-window'
    )!;

    // Disable zoom via toggleZoom(false)
    line.toggleZoom(false);
    expect(line.zoomable).toBe(false);
    expect(slider.getAttribute('aria-disabled')).toBe('true');

    // Attempt brush drag while zoom is disabled
    svg.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 80, clientY: 80 })
    );
    svg.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 240, clientY: 180 })
    );
    expect(svg.querySelector('.mc-view-brush')).toBeNull();
    svg.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 240, clientY: 180 })
    );
    expect(viewport.hasAttribute('transform')).toBe(false);

    // Attempt slider drag while zoom is disabled
    sliderWindow.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100 })
    );
    slider.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 220 })
    );
    slider.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 220 })
    );
    expect(viewport.hasAttribute('transform')).toBe(false);
  });
});

describe('CSV Data Export & Zoom Controls Studio guide', () => {
  it('renders interactive CSV export presets, all 10 chart switchers, and zoom toggle controls', () => {
    expect(
      GUIDES_CATALOG.find((g) => g.id === 'export-zoom')?.title
    ).toContain('CSV Data Export & Zoom Controls');

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'export-zoom', 'dark');
    expect(charts).toHaveLength(3);

    // Example 1: Preset switching updates CSV readout and live editor
    const ex1 = root.querySelector<HTMLElement>('#ez-custom-csv')!;
    const readout1 = ex1.querySelector<HTMLElement>('#ez-readout-1')!;
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

    ex1.querySelector<HTMLButtonElement>('#ez-btn-export-1')!.click();
    expect(ex1.querySelector('#ez-filename-1')!.textContent).toContain(
      'exported 4 rows'
    );

    // Example 2: Switching across all 10 chart types updates serialized CSV preview
    const ex2 = root.querySelector<HTMLElement>('#ez-chart-types')!;
    const readout2 = ex2.querySelector<HTMLElement>('#ez-readout-2')!;
    const typeBtns = Array.from(
      ex2.querySelectorAll<HTMLButtonElement>('button[data-ez-chart-type]')
    );
    expect(typeBtns).toHaveLength(10);

    for (const btn of typeBtns) {
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(readout2.textContent!.split('\n').length).toBeGreaterThanOrEqual(
        2
      );
    }

    ex2.querySelector<HTMLButtonElement>('#ez-btn-handler-2')!.click();
    expect(ex2.querySelector('#ez-handler-status-2')!.textContent).toContain(
      'Custom handler invoked'
    );

    // Example 3: Zoom toggle and live config editor synchronization
    const ex3 = root.querySelector<HTMLElement>('#ez-zoom-toggle')!;
    const toggleBtn3 = ex3.querySelector<HTMLButtonElement>(
      '#ez-zoom-toggle-btn'
    )!;
    const zoomInBtn3 = ex3.querySelector<HTMLButtonElement>('#ez-zoom-in-btn')!;
    const editor3 = ex3.querySelector<HTMLTextAreaElement>('textarea')!;

    zoomInBtn3.click();
    expect(ex3.querySelector('#ez-readout-3')!.textContent).toContain(
      'scale(1.25)'
    );

    toggleBtn3.click();
    expect(toggleBtn3.getAttribute('aria-pressed')).toBe('false');
    expect(zoomInBtn3.disabled).toBe(true);
    expect(parseConfigObjectLiteral(editor3.value).view.zoomable).toBe(false);

    // Re-enable from live config editor
    const cfg = parseConfigObjectLiteral(editor3.value);
    cfg.view.zoomable = true;
    editor3.value = formatConfigAssignment(cfg);
    editor3.dispatchEvent(new Event('input', { bubbles: true }));
    expect(toggleBtn3.getAttribute('aria-pressed')).toBe('true');
    expect(zoomInBtn3.disabled).toBe(false);
  });
});
