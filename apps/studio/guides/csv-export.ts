import { getGlobalPalette } from '../state/theme';
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
} from '../sample-data';
import {
  serializeChartCsv,
  type CsvExportOptions,
  type CsvExportPayload,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createFeatureGuideBootstrap } from './bootstrapping';
import { guideCallback } from './callback-source';

function csvActionSnippet(label: string, onClick: string): string {
  return `const exportButton = document.createElement('button');
exportButton.type = 'button';
exportButton.textContent = ${JSON.stringify(label)};
exportButton.disabled = !chart.isFeatureEnabled('csvExport');
exportButton.addEventListener('click', ${onClick});
document.body.appendChild(exportButton);`;
}

export function renderCsvExportGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];
  const bootstrap = createFeatureGuideBootstrap({ zoom: false, csvExport: true });

  // Intro & API Reference Table
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Customizable CSV Data Export Across All 10 Chart Types</h2>
    <p class="guide-prose">
      Every chart component includes built-in RFC 4180 CSV serialization tailored to its data model
      (<code>chart.toCsv()</code>, <code>chart.exportCsv()</code>, and standalone <code>serializeChartCsv()</code>).
      To keep standalone chart downloads small, the CSV export feature defaults to <code>false</code> at bootstrap
      and is enabled via <code>registerModernCharts({ features: { csvExport: true } })</code> or per-chart
      <code>registerBarChart({ features: { csvExport: true } })</code> (see the
      <a href="#/guide/bootstrapping">🚀 Feature Bootstrapping &amp; Lazy Loading guide</a>).
      Both examples start with CSV export enabled. Edit the registration call in either example to change the feature for this page.
    </p>
    <div class="guide-table-wrap" style="max-width:100%;overflow-x:auto;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Surface</th>
            <th>API / Option</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CSV Export Methods</strong></td>
            <td><code>chart.exportCsv(options?)</code>, <code>chart.toCsv(options?)</code>, <code>serializeChartCsv()</code></td>
            <td>Serializes chart data to RFC 4180 CSV, emits cancelable composed <code>mc-export</code>, and downloads or delegates to a custom handler.</td>
          </tr>
          <tr>
            <td><strong>Columns &amp; Headers</strong></td>
            <td><code>csvExport.columns</code>, <code>csvExport.headers</code></td>
            <td>Select or reorder column keys/descriptors (<code>['quarter', 'Cloud']</code>) and rename headers via array or <code>{ key: 'Header' }</code> map.</td>
          </tr>
          <tr>
            <td><strong>Formatting &amp; Filename</strong></td>
            <td><code>csvExport.formatValue</code>, <code>csvExport.filename</code></td>
            <td>Format cell values with <code>(value, ctx, row) =&gt; ...</code> and customize the <code>.csv</code> filename string or callback.</td>
          </tr>
          <tr>
            <td><strong>Custom Serializer</strong></td>
            <td><code>csvExport.serializer</code> (or <code>serialize</code>)</td>
            <td>Supply a custom data serializer returning a full CSV string, an array of row objects, or a 2D cell array.</td>
          </tr>
          <tr>
            <td><strong>Custom Export Handler</strong></td>
            <td><code>csvExport.handler</code> (or <code>exportHandler</code> / <code>onExport</code>)</td>
            <td>Intercept the <code>CsvExportPayload</code> (<code>{ csv, filename, rows, columns, headers }</code>) for custom downloads, clipboard copy, or API uploads.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // ============================================================================
  // Example 1: Customizable CSV Export (columns, headers, formatValue, filename)
  // ============================================================================
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.id = 'ce-custom-csv';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Custom Columns, Headers, Value Formatting &amp; Filename</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch presets or edit <code>csvExport</code> in <code>chart.config</code> to customize exported columns, headers, cell formatting, and filename.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="CSV customization presets">
        <button type="button" data-csv-preset="default" aria-pressed="true" class="btn-primary">Default CSV</button>
        <button type="button" data-csv-preset="columns" aria-pressed="false">Custom Columns &amp; Headers</button>
        <button type="button" data-csv-preset="formatted" aria-pressed="false">Formatted Values</button>
        <button type="button" data-csv-preset="serializer" aria-pressed="false">Custom Serializer</button>
        <button type="button" id="ce-btn-export-1" disabled>⬇ Export CSV</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="ce-chart-1"></div>
      <div id="ce-editor-1"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Live Serialized CSV Preview (<span id="ce-filename-1">quarterly-spend-k.csv</span>)</div>
      <div class="inspector-readout" id="ce-readout-1" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre;font-family:var(--font-mono, monospace);"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#ce-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const filenameEl1 = ex1.querySelector<HTMLElement>('#ce-filename-1')!;
  const readoutEl1 = ex1.querySelector<HTMLElement>('#ce-readout-1')!;

  const currencyFormatter = guideCallback((value: unknown, ctx: { key: string }) =>
    ctx.key !== 'quarter' && typeof value === 'number'
      ? `$${value.toFixed(1)}K`
      : value
  );

  const summarySerializer = guideCallback(({ rows }: { rows: Record<string, any>[] }) =>
    rows.map((r) => ({
      Quarter: r.quarter,
      Cloud: r.Cloud,
      Edge: r.Edge,
      Total: Number(r.Cloud ?? 0) + Number(r.Edge ?? 0) + Number(r.OnPrem ?? 0)
    }))
  );

  type CsvPresetKey = 'default' | 'columns' | 'formatted' | 'serializer';
  let activePreset1: CsvPresetKey = 'default';

  const buildEx1Config = (preset: CsvPresetKey): Record<string, any> => {
    const base: Record<string, any> = {
      title: 'Quarterly Spend ($K)',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      data: structuredClone(SAMPLE_BAR_DATA)
    };

    if (preset === 'columns') {
      base.csvExport = {
        filename: 'cloud-vs-edge-report.csv',
        columns: ['quarter', 'Cloud', 'Edge'],
        headers: {
          quarter: 'Fiscal Quarter',
          Cloud: 'Cloud Spend ($K)',
          Edge: 'Edge Spend ($K)'
        }
      };
    } else if (preset === 'formatted') {
      base.csvExport = {
        filename: 'formatted-quarterly-spend',
        headers: ['Quarter', 'Cloud', 'Edge', 'On-Prem'],
        formatValue: currencyFormatter
      };
    } else if (preset === 'serializer') {
      base.csvExport = {
        filename: 'quarterly-totals.csv',
        serializer: summarySerializer
      };
    } else {
      base.csvExport = {
        filename: 'quarterly-spend-k.csv'
      };
    }
    return base;
  };

  const syncEx1Csv = () => {
    if (!bar1.isFeatureEnabled('csvExport')) {
      filenameEl1.textContent = 'CSV export disabled';
      readoutEl1.textContent = '';
      return;
    }
    const payload = serializeChartCsv(
      'bar',
      bar1.data,
      bar1.config.csvExport ?? bar1.config.export ?? {},
      bar1.config,
      bar1.resolveI18n()
    );
    filenameEl1.textContent = payload.filename;
    readoutEl1.textContent = payload.csv;
  };

  const syncEx1Preview = (cfg: Record<string, any>) => {
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx1Csv();
  };

  const syncEx1Buttons = (preset: CsvPresetKey | null) => {
    ex1
      .querySelectorAll<HTMLButtonElement>('[data-csv-preset]')
      .forEach((btn) => {
        const isCurrent = btn.dataset.csvPreset === preset;
        btn.setAttribute('aria-pressed', String(isCurrent));
        btn.classList.toggle('btn-primary', isCurrent);
      });
  };

  const initialCfg1 = buildEx1Config('default');
  syncEx1Preview(initialCfg1);

  const editor1 = bootstrap.createEditor({
    title: 'Bootstrap and Export CSV',
    initialConfig: initialCfg1,
    chartId: () => 'bar',
    usage: `const csv = chart.toCsv();\n\n${csvActionSnippet('Export CSV', '() => chart.exportCsv()')}`,
    hint: 'Edit the registration flags or chart.config to update the CSV output.',
    onConfigChange: (nextCfg) => {
      syncEx1Preview(nextCfg);
    },
    onReset: () => {
      activePreset1 = 'default';
      syncEx1Buttons('default');
      const fresh = buildEx1Config('default');
      syncEx1Preview(fresh);
      editor1.syncConfig(fresh);
    }
  });
  ex1.querySelector('#ce-editor-1')!.appendChild(editor1.element);

  ex1
    .querySelectorAll<HTMLButtonElement>('[data-csv-preset]')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.csvPreset as CsvPresetKey;
        activePreset1 = preset;
        syncEx1Buttons(preset);
        const nextCfg = buildEx1Config(preset);
        syncEx1Preview(nextCfg);
        editor1.syncConfig(nextCfg);
      });
    });

  const exportBtn1 = ex1.querySelector<HTMLButtonElement>('#ce-btn-export-1')!;
  exportBtn1.addEventListener('click', () => {
    const payload = bar1.exportCsv();
    filenameEl1.textContent = `${payload.filename} (exported ${payload.rows.length} rows)`;
    readoutEl1.textContent = payload.csv;
  });

  // ============================================================================
  // Example 2: Built-In Serialization & Custom Export Handler Across All 10 Charts
  // ============================================================================
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.id = 'ce-chart-types';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Built-In CSV Serialization Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Select any chart type to preview its built-in tabular serialization and test a custom export handler.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Chart type CSV presets" id="ce-type-buttons"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="ce-chart-2"></div>
      <div id="ce-editor-2"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div class="inspector-title" id="ce-handler-status-2">Built-in CSV rows &amp; headers</div>
        <button type="button" id="ce-btn-handler-2" disabled>⚡ Run Custom Export Handler</button>
      </div>
      <div class="inspector-readout" id="ce-readout-2" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre;font-family:var(--font-mono, monospace);margin-top:6px;"></div>
    </div>
  `;
  container.appendChild(ex2);

  interface ChartDemoSpec {
    id: string;
    label: string;
    tag: string;
    config: Record<string, any>;
  }

  const chartSpecs: ChartDemoSpec[] = [
    {
      id: 'bar',
      label: 'Bar',
      tag: 'mc-bar-chart',
      config: {
        title: 'Quarterly Spend',
        indexBy: 'quarter',
        keys: ['Cloud', 'Edge'],
        data: SAMPLE_BAR_DATA.slice(0, 3)
      }
    },
    {
      id: 'line',
      label: 'Line',
      tag: 'mc-line-chart',
      config: {
        title: 'Throughput',
        data: SAMPLE_LINE_DATA.slice(0, 2).map((s) => ({
          ...s,
          data: s.data.slice(0, 3)
        }))
      }
    },
    {
      id: 'pie',
      label: 'Pie',
      tag: 'mc-pie-chart',
      config: {
        title: 'Runtime Footprint',
        innerRadius: 0.52,
        data: SAMPLE_PIE_DATA.slice(0, 4)
      }
    },
    {
      id: 'heatmap',
      label: 'Heatmap',
      tag: 'mc-heatmap-chart',
      config: {
        title: 'CPU Load (%)',
        data: SAMPLE_HEATMAP_DATA.slice(0, 2)
      }
    },
    {
      id: 'radar',
      label: 'Radar',
      tag: 'mc-radar-chart',
      config: {
        title: 'Benchmark Score',
        indexBy: 'metric',
        keys: ['ModernCharts', 'TraditionalChart'],
        data: SAMPLE_RADAR_DATA.slice(0, 4)
      }
    },
    {
      id: 'sunburst',
      label: 'Sunburst',
      tag: 'mc-sunburst-chart',
      config: {
        title: 'Module Hierarchy',
        data: SAMPLE_SUNBURST_DATA
      }
    },
    {
      id: 'sankey',
      label: 'Sankey',
      tag: 'mc-sankey-chart',
      config: {
        title: 'Pipeline Flow',
        data: SAMPLE_SANKEY_DATA
      }
    },
    {
      id: 'scatter',
      label: 'Scatter',
      tag: 'mc-scatter-chart',
      config: {
        title: 'FPS vs Size',
        data: SAMPLE_SCATTER_DATA
      }
    },
    {
      id: 'treemap',
      label: 'Treemap',
      tag: 'mc-treemap-chart',
      config: {
        title: 'Package Footprint',
        data: SAMPLE_SUNBURST_DATA
      }
    },
    {
      id: 'gauge',
      label: 'Gauge',
      tag: 'mc-gauge-chart',
      config: {
        title: 'Layout Efficiency',
        data: { ...SAMPLE_GAUGE_DATA }
      }
    }
  ];

  const stage2 = ex2.querySelector<HTMLElement>('#ce-chart-2')!;
  const typeBtnsWrap = ex2.querySelector<HTMLElement>('#ce-type-buttons')!;
  const statusEl2 = ex2.querySelector<HTMLElement>('#ce-handler-status-2')!;
  const readoutEl2 = ex2.querySelector<HTMLElement>('#ce-readout-2')!;
  let activeSpec2 = chartSpecs[2]; // default to Pie
  let activeChart2: MCBaseChart<any> = document.createElement(
    activeSpec2.tag
  ) as MCBaseChart<any>;
  stage2.appendChild(activeChart2);
  mounted.push(activeChart2);

  const syncEx2Csv = (spec: ChartDemoSpec) => {
    if (!activeChart2.isFeatureEnabled('csvExport')) {
      statusEl2.textContent = 'CSV export disabled';
      readoutEl2.textContent = '';
      return;
    }
    const payload = serializeChartCsv(
      spec.id,
      activeChart2.data,
      activeChart2.config.csvExport ?? activeChart2.config.export ?? {},
      activeChart2.config,
      activeChart2.resolveI18n()
    );
    statusEl2.textContent = `${spec.label} (${payload.filename}) · ${payload.rows.length} rows · columns: [${payload.columns.join(', ')}]`;
    readoutEl2.textContent = payload.csv;
  };

  const updateEx2Chart = (spec: ChartDemoSpec, cfg: Record<string, any>) => {
    if (activeChart2.tagName.toLowerCase() !== spec.tag) {
      const nextEl = document.createElement(spec.tag) as MCBaseChart<any>;
      stage2.replaceChildren(nextEl);
      const idx = mounted.indexOf(activeChart2);
      if (idx !== -1) mounted[idx] = nextEl;
      else mounted.push(nextEl);
      activeChart2 = nextEl;
    }
    activeChart2.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx2Csv(spec);
  };

  const editor2 = bootstrap.createEditor({
    title: 'Bootstrap and Use a CSV Handler',
    initialConfig: structuredClone(activeSpec2.config),
    chartId: () => activeSpec2.id,
    usage: csvActionSnippet('Run Custom Export Handler', `() => chart.exportCsv({
  handler: ({ filename, rows }) => {
    console.log(filename, rows.length);
  }
})`),
    hint: 'Edit the registration flags or add csvExport to chart.config to update this chart’s CSV output.',
    onConfigChange: (nextCfg) => {
      updateEx2Chart(activeSpec2, nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(activeSpec2.config);
      updateEx2Chart(activeSpec2, fresh);
      editor2.syncConfig(fresh);
    }
  });
  ex2.querySelector('#ce-editor-2')!.appendChild(editor2.element);

  chartSpecs.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ceChartType = spec.id;
    btn.textContent = spec.label;
    const isSelected = spec.id === activeSpec2.id;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.classList.toggle('btn-primary', isSelected);
    btn.addEventListener('click', () => {
      activeSpec2 = spec;
      typeBtnsWrap
        .querySelectorAll<HTMLButtonElement>('button[data-ce-chart-type]')
        .forEach((b) => {
          const active = b.dataset.ceChartType === spec.id;
          b.setAttribute('aria-pressed', String(active));
          b.classList.toggle('btn-primary', active);
        });
      const fresh = structuredClone(spec.config);
      updateEx2Chart(spec, fresh);
      editor2.syncConfig(fresh);
    });
    typeBtnsWrap.appendChild(btn);
  });

  updateEx2Chart(activeSpec2, structuredClone(activeSpec2.config));

  const handlerBtn2 = ex2.querySelector<HTMLButtonElement>('#ce-btn-handler-2')!;
  handlerBtn2.addEventListener('click', () => {
    let captured: CsvExportPayload | null = null;
    const options: CsvExportOptions = {
      ...(activeChart2.config.csvExport ?? {}),
      handler: (payload) => {
        captured = payload;
      }
    };
    activeChart2.exportCsv(options);
    if (captured) {
      const p = captured as CsvExportPayload;
      statusEl2.textContent = `Custom handler invoked for <${activeSpec2.tag}> → ${p.filename} (${p.rows.length} rows, ${p.csv.length} bytes)`;
      readoutEl2.textContent = p.csv;
    }
  });

  bootstrap.onFeaturesChanged(() => {
    const enabled = bar1.isFeatureEnabled('csvExport');
    exportBtn1.disabled = !enabled;
    handlerBtn2.disabled = !enabled;
    syncEx1Csv();
    syncEx2Csv(activeSpec2);
  });

  return mounted;
}
