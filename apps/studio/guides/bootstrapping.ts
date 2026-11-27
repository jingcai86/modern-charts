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
  configureChartFeatures,
  getChartFeatures,
  isChartFeatureEnabled,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createCodeBlock, createLiveConfigEditor } from './shared';

export function renderBootstrappingGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & Bootstrap Features Catalog Table with Links
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Opt-In Feature Bootstrapping &amp; Lazy Browser Downloads</h2>
    <p class="guide-prose">
      To keep initial browser downloads minimal when lazy-loading standalone charts
      (<code>modern-charts/bar</code>, <code>modern-charts/line</code>, etc.), optional features like
      <strong>CSV Data Export</strong> and <strong>Zoom Controls</strong> are decoupled from core chart rendering
      and default to <code>false</code>. When left at their default <code>false</code>, the browser never downloads
      those feature chunks. Pass <code>{ features: { csvExport: true, zoom: true } }</code> to
      <code>registerModernCharts()</code> or any per-chart <code>register&lt;Chart&gt;()</code> bootstrap function
      to lazy-load and activate them.
    </p>
    <div class="guide-table-wrap" style="max-width:100%;overflow-x:auto;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Bootstrap Feature</th>
            <th>Option Key</th>
            <th>Default</th>
            <th>Lazy Chunk &amp; Guide Link</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Customizable CSV Data Export</strong></td>
            <td><code>features.csvExport</code></td>
            <td><code>false</code></td>
            <td>
              Lazy-loads the RFC 4180 CSV serializer &amp; downloader (<code>chart.toCsv()</code>, <code>chart.exportCsv()</code>, custom columns/headers/serializers).
              See <a href="#/guide/csv-export" data-guide-link="csv-export">📥 Customizable CSV Data Export</a>.
            </td>
          </tr>
          <tr>
            <td><strong>Viewport Zoom &amp; Pan Controls</strong></td>
            <td><code>features.zoom</code></td>
            <td><code>false</code></td>
            <td>
              Lazy-loads the viewport zoom controller (<code>[data-zoom="toggle"]</code>, wheel, brush, range slider, <code>chart.toggleZoom()</code>).
              See <a href="#/guide/view-zoom" data-guide-link="view-zoom">🔍 Zoom Controls &amp; Viewport Lock</a>.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // ============================================================================
  // Example 1: Default (false) vs. Explicitly Enabled (true) Feature Bootstrap
  // ============================================================================
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.id = 'bs-default-vs-enabled';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Default Bootstrap (<code>false</code>) vs. Explicit Enable (<code>true</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Compare how a chart behaves when bootstrapped with the default <code>features: { csvExport: false }</code> (zero CSV chunk overhead) versus explicitly enabling <code>features: { csvExport: true }</code>.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Bootstrap mode presets">
        <button type="button" id="bs-mode-enabled" data-bs-mode="enabled" aria-pressed="true" class="btn-primary">
          Explicitly Enabled (csvExport: true)
        </button>
        <button type="button" id="bs-mode-default" data-bs-mode="default" aria-pressed="false">
          Default Bootstrap (csvExport: false)
        </button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="bs-chart-1"></div>
      <div id="bs-editor-1"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Active Bootstrap Feature State &amp; <code>chart.toCsv()</code> Output</div>
      <div class="inspector-readout" id="bs-readout-1" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre-wrap;font-family:var(--font-mono, monospace);"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#bs-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const btnEnabled1 = ex1.querySelector<HTMLButtonElement>('#bs-mode-enabled')!;
  const btnDefault1 = ex1.querySelector<HTMLButtonElement>('#bs-mode-default')!;
  const readoutEl1 = ex1.querySelector<HTMLElement>('#bs-readout-1')!;

  const initialCfg1: Record<string, any> = {
    title: 'Quarterly Spend ($K)',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'OnPrem'],
    data: structuredClone(SAMPLE_BAR_DATA),
    csvExport: {
      filename: 'quarterly-spend.csv'
    }
  };

  const syncEx1Readout = () => {
    const features = getChartFeatures();
    const csvEnabled = isChartFeatureEnabled('csvExport');
    const csvOutput = bar1.toCsv();
    btnEnabled1.setAttribute('aria-pressed', String(csvEnabled));
    btnEnabled1.classList.toggle('btn-primary', csvEnabled);
    btnDefault1.setAttribute('aria-pressed', String(!csvEnabled));
    btnDefault1.classList.toggle('btn-primary', !csvEnabled);
    readoutEl1.textContent = csvEnabled
      ? `Bootstrap: registerModernCharts({ features: { csvExport: true } }) | features.csvExport: ${features.csvExport}\n${csvOutput}`
      : `Bootstrap: registerModernCharts() [Default] | features.csvExport: ${features.csvExport} (CSV chunk skipped on lazy load) | chart.toCsv(): ""`;
  };

  const applyEx1Config = (cfg: Record<string, any>) => {
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx1Readout();
  };

  applyEx1Config(initialCfg1);

  const editor1 = createLiveConfigEditor({
    title: 'Chart Configuration (Live)',
    initialConfig: initialCfg1,
    hint: 'Note: In Studio live editors, chart.config is shown directly without bootstrap boilerplate.',
    onConfigChange: (nextCfg) => {
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      void configureChartFeatures({ features: { csvExport: true } });
      const fresh = structuredClone(initialCfg1);
      applyEx1Config(fresh);
      editor1.syncConfig(fresh);
    }
  });
  ex1.querySelector('#bs-editor-1')!.appendChild(editor1.element);

  btnEnabled1.addEventListener('click', () => {
    void configureChartFeatures({ features: { csvExport: true } });
    syncEx1Readout();
  });

  btnDefault1.addEventListener('click', () => {
    void configureChartFeatures({ features: { csvExport: false } });
    syncEx1Readout();
  });

  // ============================================================================
  // Example 2: Per-Chart Subpath Bootstrapping Across All 10 Chart Types
  // ============================================================================
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.id = 'bs-per-chart';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Per-Chart Subpath Bootstrapping Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Select any chart type to preview its standalone subpath bootstrap call with default (<code>false</code>) vs. explicit (<code>true</code>) feature flags.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Per-chart bootstrap switcher" id="bs-type-buttons"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="bs-chart-2"></div>
      <div id="bs-editor-2"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Standalone Subpath Bootstrap Snippet</div>
      <div class="inspector-readout" id="bs-readout-2" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre;font-family:var(--font-mono, monospace);"></div>
    </div>
  `;
  container.appendChild(ex2);

  interface ChartBootstrapSpec {
    id: string;
    label: string;
    tag: string;
    registerFn: string;
    config: Record<string, any>;
  }

  const chartSpecs: ChartBootstrapSpec[] = [
    {
      id: 'bar',
      label: 'Bar',
      tag: 'mc-bar-chart',
      registerFn: 'registerBarChart',
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
      registerFn: 'registerLineChart',
      config: {
        title: 'Throughput',
        data: SAMPLE_LINE_DATA.slice(0, 2)
      }
    },
    {
      id: 'pie',
      label: 'Pie',
      tag: 'mc-pie-chart',
      registerFn: 'registerPieChart',
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
      registerFn: 'registerHeatmapChart',
      config: {
        title: 'CPU Load (%)',
        data: SAMPLE_HEATMAP_DATA.slice(0, 3)
      }
    },
    {
      id: 'radar',
      label: 'Radar',
      tag: 'mc-radar-chart',
      registerFn: 'registerRadarChart',
      config: {
        title: 'Benchmark Score',
        indexBy: 'metric',
        keys: ['ModernCharts', 'TraditionalChart'],
        data: SAMPLE_RADAR_DATA.slice(0, 5)
      }
    },
    {
      id: 'sunburst',
      label: 'Sunburst',
      tag: 'mc-sunburst-chart',
      registerFn: 'registerSunburstChart',
      config: {
        title: 'Module Hierarchy',
        data: SAMPLE_SUNBURST_DATA
      }
    },
    {
      id: 'sankey',
      label: 'Sankey',
      tag: 'mc-sankey-chart',
      registerFn: 'registerSankeyChart',
      config: {
        title: 'Pipeline Flow',
        data: SAMPLE_SANKEY_DATA
      }
    },
    {
      id: 'scatter',
      label: 'Scatter',
      tag: 'mc-scatter-chart',
      registerFn: 'registerScatterChart',
      config: {
        title: 'FPS vs Size',
        data: SAMPLE_SCATTER_DATA
      }
    },
    {
      id: 'treemap',
      label: 'Treemap',
      tag: 'mc-treemap-chart',
      registerFn: 'registerTreemapChart',
      config: {
        title: 'Package Footprint',
        data: SAMPLE_SUNBURST_DATA
      }
    },
    {
      id: 'gauge',
      label: 'Gauge',
      tag: 'mc-gauge-chart',
      registerFn: 'registerGaugeChart',
      config: {
        title: 'Layout Efficiency',
        data: { ...SAMPLE_GAUGE_DATA }
      }
    }
  ];

  const stage2 = ex2.querySelector<HTMLElement>('#bs-chart-2')!;
  const typeBtnsWrap = ex2.querySelector<HTMLElement>('#bs-type-buttons')!;
  const readoutEl2 = ex2.querySelector<HTMLElement>('#bs-readout-2')!;
  let activeSpec2 = chartSpecs[0];
  let activeChart2: MCBaseChart<any> = document.createElement(
    activeSpec2.tag
  ) as MCBaseChart<any>;
  stage2.appendChild(activeChart2);
  mounted.push(activeChart2);

  const updateEx2Chart = (spec: ChartBootstrapSpec, cfg: Record<string, any>) => {
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
    readoutEl2.textContent = [
      `// 1. Default bootstrap (csvExport: false, zoom: false — feature chunks are NOT downloaded):`,
      `import { ${spec.registerFn} } from 'modern-charts/${spec.id}';`,
      `await ${spec.registerFn}();`,
      ``,
      `// 2. Explicitly enable features on bootstrap (lazy-loads only requested feature chunks):`,
      `await ${spec.registerFn}({ features: { csvExport: true, zoom: true } });`
    ].join('\n');
  };

  const editor2 = createLiveConfigEditor({
    title: 'Selected Chart Config (Live)',
    initialConfig: structuredClone(activeSpec2.config),
    hint: 'Live chart.config editor (Studio enables bootstrap features automatically for all interactive previews).',
    onConfigChange: (nextCfg) => {
      updateEx2Chart(activeSpec2, nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(activeSpec2.config);
      updateEx2Chart(activeSpec2, fresh);
      editor2.syncConfig(fresh);
    }
  });
  ex2.querySelector('#bs-editor-2')!.appendChild(editor2.element);

  chartSpecs.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.bsChartType = spec.id;
    btn.textContent = spec.label;
    const isSelected = spec.id === activeSpec2.id;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.classList.toggle('btn-primary', isSelected);
    btn.addEventListener('click', () => {
      activeSpec2 = spec;
      typeBtnsWrap
        .querySelectorAll<HTMLButtonElement>('button[data-bs-chart-type]')
        .forEach((b) => {
          const active = b.dataset.bsChartType === spec.id;
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

  // Reference Code Snippets (Default false vs Explicitly true)
  const reference = document.createElement('section');
  reference.className = 'panel-card guide-section';
  reference.innerHTML = `
    <h2 class="panel-title">Bootstrapping Reference: Default (<code>false</code>) vs. Explicit (<code>true</code>)</h2>
    <p class="guide-prose">
      Use <code>registerModernCharts()</code> for full-library registration or
      <code>registerBarChart()</code> / <code>registerLineChart()</code> / etc. for single-chart lazy loading.
      Explore the individual feature guides for
      <a href="#/guide/csv-export">📥 CSV Data Export</a> and
      <a href="#/guide/view-zoom">🔍 Zoom Controls</a>.
    </p>
  `;
  reference.appendChild(
    createCodeBlock(
      `// ============================================================================
// A. Default Bootstrap (csvExport: false, zoom: false)
// Browser only downloads the chart component — feature chunks are NOT fetched.
// ============================================================================
import { registerBarChart } from 'modern-charts/bar';

await registerBarChart(); // equivalent to registerBarChart({ features: { csvExport: false, zoom: false } })

// ============================================================================
// B. Explicit Feature Bootstrap (csvExport: true, zoom: true)
// Dynamically downloads only the enabled feature chunks on demand.
// ============================================================================
import { registerModernCharts } from 'modern-charts';

await registerModernCharts({
  features: {
    csvExport: true, // enables chart.toCsv(), chart.exportCsv(), custom CSV serializers
    zoom: true       // enables <mc-view-layer>, [data-zoom="toggle"], chart.toggleZoom()
  }
});`,
      'Default vs. Explicit Feature Bootstrapping'
    )
  );
  container.appendChild(reference);

  return mounted;
}
