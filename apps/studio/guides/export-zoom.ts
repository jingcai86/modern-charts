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
import { createCodeBlock, createLiveConfigEditor } from './shared';

function wireKeyboardToggle(btn: HTMLButtonElement): void {
  let spaceDown = false;
  btn.addEventListener('keydown', (e: KeyboardEvent) => {
    if (btn.disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      spaceDown = true;
      btn.click();
    }
  });
  btn.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (spaceDown) {
        spaceDown = false;
        e.preventDefault();
        return;
      }
      spaceDown = false;
      if (!btn.disabled) {
        e.preventDefault();
        btn.click();
      }
    }
  });
}

export function renderExportZoomGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & API Reference Table
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Customizable CSV Data Export &amp; Universal Zoom Controls</h2>
    <p class="guide-prose">
      Every chart component includes built-in CSV serialization tailored to its data model
      (<code>chart.toCsv()</code> and <code>chart.exportCsv()</code>) alongside shared viewport zoom controls
      (<code>&lt;mc-view-layer&gt;</code>, <code>config.view</code>, and <code>chart.toggleZoom()</code>).
      Customize columns, headers, cell value formatting, filenames, custom serializers, or export handlers,
      and toggle zoom on or off via pointer or keyboard across all 10 chart types.
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
            <td><strong>Serializer &amp; Handler</strong></td>
            <td><code>csvExport.serializer</code>, <code>csvExport.handler</code> (or <code>onExport</code>)</td>
            <td>Supply a custom data serializer returning a CSV string or row list, or intercept export payloads with a custom handler.</td>
          </tr>
          <tr>
            <td><strong>Zoom Toggle Button</strong></td>
            <td><code>[data-zoom="toggle"]</code>, <code>chart.toggleZoom(force?)</code>, <code>view.zoomable</code></td>
            <td>Accessible toggle button (<code>aria-pressed="true|false"</code>, keyboard <kbd>Enter</kbd>/<kbd>Space</kbd>) that locks/unlocks zoom gestures and controls.</td>
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
  ex1.id = 'ez-custom-csv';
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
        <button type="button" id="ez-btn-export-1">⬇ Export CSV</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="ez-chart-1"></div>
      <div id="ez-editor-1"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Live Serialized CSV Preview (<span id="ez-filename-1">quarterly-spend-k.csv</span>)</div>
      <div class="inspector-readout" id="ez-readout-1" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre;font-family:var(--font-mono, monospace);"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#ez-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const filenameEl1 = ex1.querySelector<HTMLElement>('#ez-filename-1')!;
  const readoutEl1 = ex1.querySelector<HTMLElement>('#ez-readout-1')!;

  const currencyFormatter = (value: unknown, ctx: { key: string }) =>
    ctx.key !== 'quarter' && typeof value === 'number'
      ? `$${value.toFixed(1)}K`
      : value;

  const summarySerializer = ({ rows }: { rows: Record<string, any>[] }) =>
    rows.map((r) => ({
      Quarter: r.quarter,
      Cloud: r.Cloud,
      Edge: r.Edge,
      Total: Number(r.Cloud ?? 0) + Number(r.Edge ?? 0) + Number(r.OnPrem ?? 0)
    }));

  type CsvPresetKey = 'default' | 'columns' | 'formatted' | 'serializer';
  let activePreset1: CsvPresetKey = 'default';

  const buildEx1Config = (preset: CsvPresetKey): Record<string, any> => {
    const base: Record<string, any> = {
      title: 'Quarterly Spend ($K)',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      data: structuredClone(SAMPLE_BAR_DATA),
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
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

  const syncEx1Preview = (cfg: Record<string, any>) => {
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
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

  const editor1 = createLiveConfigEditor({
    title: 'CSV Export Configuration (Live)',
    initialConfig: initialCfg1,
    hint: 'Edit csvExport.columns, csvExport.headers, csvExport.filename, or data to update the live CSV output.',
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
  ex1.querySelector('#ez-editor-1')!.appendChild(editor1.element);

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

  const exportBtn1 = ex1.querySelector<HTMLButtonElement>('#ez-btn-export-1')!;
  wireKeyboardToggle(exportBtn1);
  exportBtn1.addEventListener('click', () => {
    const payload = bar1.exportCsv({
      handler: (result) => {
        filenameEl1.textContent = `${result.filename} (exported ${result.rows.length} rows)`;
        readoutEl1.textContent = result.csv;
      }
    });
    filenameEl1.textContent = `${payload.filename} (exported ${payload.rows.length} rows)`;
  });

  // ============================================================================
  // Example 2: Built-In Serialization & Custom Export Handler Across All 10 Charts
  // ============================================================================
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.id = 'ez-chart-types';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Built-In CSV Serialization Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Select any chart type to preview its built-in tabular serialization and test a custom export handler.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Chart type CSV presets" id="ez-type-buttons"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="ez-chart-2"></div>
      <div id="ez-editor-2"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div class="inspector-title" id="ez-handler-status-2">Built-in CSV rows &amp; headers</div>
        <button type="button" id="ez-btn-handler-2">⚡ Run Custom Export Handler</button>
      </div>
      <div class="inspector-readout" id="ez-readout-2" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre;font-family:var(--font-mono, monospace);margin-top:6px;"></div>
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

  const stage2 = ex2.querySelector<HTMLElement>('#ez-chart-2')!;
  const typeBtnsWrap = ex2.querySelector<HTMLElement>('#ez-type-buttons')!;
  const statusEl2 = ex2.querySelector<HTMLElement>('#ez-handler-status-2')!;
  const readoutEl2 = ex2.querySelector<HTMLElement>('#ez-readout-2')!;
  let activeSpec2 = chartSpecs[2]; // default to Pie
  let activeChart2: MCBaseChart<any> = document.createElement(
    activeSpec2.tag
  ) as MCBaseChart<any>;
  stage2.appendChild(activeChart2);
  mounted.push(activeChart2);

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
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      ...cfg
    });
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

  const editor2 = createLiveConfigEditor({
    title: 'Multi-Chart CSV Config (Live)',
    initialConfig: structuredClone(activeSpec2.config),
    hint: 'Edit data or add csvExport: { columns, headers, filename } to customize the active chart CSV.',
    onConfigChange: (nextCfg) => {
      updateEx2Chart(activeSpec2, nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(activeSpec2.config);
      updateEx2Chart(activeSpec2, fresh);
      editor2.syncConfig(fresh);
    }
  });
  ex2.querySelector('#ez-editor-2')!.appendChild(editor2.element);

  chartSpecs.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ezChartType = spec.id;
    btn.textContent = spec.label;
    const isSelected = spec.id === activeSpec2.id;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.classList.toggle('btn-primary', isSelected);
    btn.addEventListener('click', () => {
      activeSpec2 = spec;
      typeBtnsWrap
        .querySelectorAll<HTMLButtonElement>('button[data-ez-chart-type]')
        .forEach((b) => {
          const active = b.dataset.ezChartType === spec.id;
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

  const handlerBtn2 = ex2.querySelector<HTMLButtonElement>('#ez-btn-handler-2')!;
  wireKeyboardToggle(handlerBtn2);
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

  // ============================================================================
  // Example 3: Interactive Zoom On/Off Button & View Controls
  // ============================================================================
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.id = 'ez-zoom-toggle';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Keyboard-Accessible Zoom On/Off Toggle &amp; View Lock</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Toggle zoom on or off using the toolbar button, the on-chart <code>Zoom: On / Off</code> control, or keyboard <kbd>Enter</kbd> / <kbd>Space</kbd>. Disabling zoom locks the view against wheel, brush, slider, and zoom buttons.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Zoom controls">
        <button type="button" id="ez-zoom-toggle-btn" class="btn-primary" aria-pressed="true" data-zoom-state="on">Zoom: On</button>
        <button type="button" id="ez-zoom-in-btn">+ Zoom In</button>
        <button type="button" id="ez-zoom-out-btn">− Zoom Out</button>
        <button type="button" id="ez-zoom-reset-btn">↺ Reset</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="ez-chart-3"></div>
      <div id="ez-editor-3"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Live Zoom &amp; Viewport State</div>
      <div class="inspector-readout" id="ez-readout-3" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;
  container.appendChild(ex3);

  const radar3 = document.createElement('mc-radar-chart') as MCBaseChart<any>;
  ex3.querySelector('#ez-chart-3')!.appendChild(radar3);
  mounted.push(radar3);

  const zoomToggleBtn3 = ex3.querySelector<HTMLButtonElement>(
    '#ez-zoom-toggle-btn'
  )!;
  const zoomInBtn3 = ex3.querySelector<HTMLButtonElement>('#ez-zoom-in-btn')!;
  const zoomOutBtn3 = ex3.querySelector<HTMLButtonElement>('#ez-zoom-out-btn')!;
  const zoomResetBtn3 = ex3.querySelector<HTMLButtonElement>(
    '#ez-zoom-reset-btn'
  )!;
  const readoutEl3 = ex3.querySelector<HTMLElement>('#ez-readout-3')!;

  wireKeyboardToggle(zoomToggleBtn3);
  wireKeyboardToggle(zoomInBtn3);
  wireKeyboardToggle(zoomOutBtn3);
  wireKeyboardToggle(zoomResetBtn3);

  const initialCfg3: Record<string, any> = {
    title: 'Benchmark Score (Zoomable Radar)',
    indexBy: 'metric',
    keys: ['ModernCharts', 'TraditionalChart'],
    data: structuredClone(SAMPLE_RADAR_DATA),
    view: {
      zoomable: true,
      pannable: true,
      showControls: true,
      minZoom: 0.5,
      maxZoom: 6
    }
  };

  const syncEx3Readout = () => {
    const viewCfg = radar3.resolveViewConfig();
    const viewport = radar3.shadowRoot?.querySelector('.mc-chart-viewport');
    const transform =
      viewport?.getAttribute('transform') || 'translate(0, 0) scale(1)';
    zoomToggleBtn3.setAttribute('aria-pressed', String(viewCfg.zoomable));
    zoomToggleBtn3.setAttribute(
      'data-zoom-state',
      viewCfg.zoomable ? 'on' : 'off'
    );
    zoomToggleBtn3.textContent = viewCfg.zoomable ? 'Zoom: On' : 'Zoom: Off';
    zoomToggleBtn3.classList.toggle('btn-primary', viewCfg.zoomable);
    zoomInBtn3.disabled = !viewCfg.zoomable;
    zoomOutBtn3.disabled = !viewCfg.zoomable;
    zoomResetBtn3.disabled = !viewCfg.zoomable;
    readoutEl3.textContent = `zoomable: ${viewCfg.zoomable} | transform: ${transform}`;
  };

  const applyEx3Config = (cfg: Record<string, any>) => {
    radar3.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx3Readout();
  };

  applyEx3Config(initialCfg3);

  const editor3 = createLiveConfigEditor({
    title: 'View & Zoom Toggle Config (Live)',
    initialConfig: initialCfg3,
    hint: 'Toggle view.zoomable between true and false or adjust view.maxZoom.',
    onConfigChange: (nextCfg) => {
      applyEx3Config(nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(initialCfg3);
      applyEx3Config(fresh);
      editor3.syncConfig(fresh);
    }
  });
  ex3.querySelector('#ez-editor-3')!.appendChild(editor3.element);

  let isUpdatingEx3 = false;
  zoomToggleBtn3.addEventListener('click', () => {
    isUpdatingEx3 = true;
    try {
      const nextZoomable = radar3.toggleZoom();
      const nextCfg = {
        ...radar3.config,
        view: {
          ...(radar3.config.view ?? {}),
          zoomable: nextZoomable
        }
      };
      syncEx3Readout();
      editor3.syncConfig(nextCfg);
    } finally {
      isUpdatingEx3 = false;
    }
  });

  radar3.addEventListener('mc-zoom-toggle', () => {
    if (isUpdatingEx3) return;
    syncEx3Readout();
    editor3.syncConfig({
      ...radar3.config,
      view: {
        ...(radar3.config.view ?? {}),
        zoomable: radar3.zoomable
      }
    });
  });

  radar3.addEventListener('mc-zoom', () => {
    syncEx3Readout();
  });

  zoomInBtn3.addEventListener('click', () => {
    radar3.zoomIn();
    syncEx3Readout();
  });
  zoomOutBtn3.addEventListener('click', () => {
    radar3.zoomOut();
    syncEx3Readout();
  });
  zoomResetBtn3.addEventListener('click', () => {
    radar3.resetZoom();
    syncEx3Readout();
  });

  // Reference Code Snippet
  const reference = document.createElement('section');
  reference.className = 'panel-card guide-section';
  reference.innerHTML = `
    <h2 class="panel-title">Programmatic CSV Export &amp; Zoom Toggle API</h2>
    <p class="guide-prose">
      Use <code>chart.exportCsv()</code>, <code>chart.toCsv()</code>, and <code>chart.toggleZoom()</code> on any
      <code>&lt;mc-*-chart&gt;</code> element, or call <code>serializeChartCsv()</code> directly from
      <code>modern-charts</code> or <code>modern-charts/core</code>.
    </p>
  `;
  reference.appendChild(
    createCodeBlock(
      `import { serializeChartCsv } from 'modern-charts/core';
import 'modern-charts/bar';

const chart = document.querySelector('mc-bar-chart');
chart.config = {
  title: 'Quarterly Spend ($K)',
  indexBy: 'quarter',
  keys: ['Cloud', 'Edge'],
  data: [
    { quarter: 'Q1', Cloud: 142, Edge: 94 },
    { quarter: 'Q2', Cloud: 168, Edge: 118 }
  ],
  view: { zoomable: true, pannable: true, showControls: true },
  csvExport: {
    filename: 'quarterly-spend.csv',
    columns: ['quarter', 'Cloud', 'Edge'],
    headers: { quarter: 'Quarter', Cloud: 'Cloud ($K)', Edge: 'Edge ($K)' },
    formatValue: (value, { key }) =>
      key !== 'quarter' && typeof value === 'number' ? \`$\${value}K\` : value
  }
};

// 1. Get serialized CSV string or trigger export with a custom handler
const csvText = chart.toCsv();
chart.exportCsv({
  handler: ({ csv, filename, rows }) => {
    console.log('Exported', filename, rows.length, csv);
  }
});

// 2. Toggle zoom programmatically (preserves current viewport transform)
chart.toggleZoom(false); // disables zoom gestures & controls
chart.toggleZoom(true);  // re-enables zoom`,
      'CSV Export & Zoom Toggle Usage'
    )
  );
  container.appendChild(reference);

  return mounted;
}
