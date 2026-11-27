import { CHART_CATALOG, type ChartCatalogEntry } from '../catalog';
import { getGlobalPalette } from '../state/theme';
import { SAMPLE_BAR_DATA } from '../sample-data';
import {
  configureChartFeatures,
  getChartFeatures,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createCodeBlock, createLiveConfigEditor } from './shared';

const REGISTER_FN_BY_ID: Record<string, string> = {
  bar: 'registerBarChart',
  line: 'registerLineChart',
  pie: 'registerPieChart',
  heatmap: 'registerHeatmapChart',
  radar: 'registerRadarChart',
  sunburst: 'registerSunburstChart',
  sankey: 'registerSankeyChart',
  scatter: 'registerScatterChart',
  treemap: 'registerTreemapChart',
  gauge: 'registerGaugeChart'
};

interface BootstrapFeatureRow {
  label: string;
  optionKey: string;
  defaultValue: string;
  description: string;
  guideHref: string;
  guideKey: string;
  guideTitle: string;
}

const BOOTSTRAP_FEATURES: readonly BootstrapFeatureRow[] = [
  {
    label: 'Viewport Zoom & Pan Controls',
    optionKey: 'features.zoom',
    defaultValue: 'false',
    description:
      'Lazy-loads the viewport zoom controller ([data-zoom="toggle"], wheel, brush, range slider, chart.toggleZoom()).',
    guideHref: '#/guide/view-zoom',
    guideKey: 'view-zoom',
    guideTitle: '🔍 Zoom Controls & Viewport Lock'
  },
  {
    label: 'Customizable CSV Data Export',
    optionKey: 'features.csvExport',
    defaultValue: 'false',
    description:
      'Lazy-loads the RFC 4180 CSV serializer & downloader (chart.toCsv(), chart.exportCsv(), custom columns/headers/serializers).',
    guideHref: '#/guide/csv-export',
    guideKey: 'csv-export',
    guideTitle: '📥 Customizable CSV Data Export'
  }
];

function createFeatureMatrixSection(): HTMLElement {
  const rowsHtml = BOOTSTRAP_FEATURES.map(
    (item) => `
      <tr>
        <td><strong>${item.label}</strong></td>
        <td><code>${item.optionKey}</code></td>
        <td><code>${item.defaultValue}</code></td>
        <td>
          ${item.description}
          See <a href="${item.guideHref}" data-guide-link="${item.guideKey}">${item.guideTitle}</a>.
        </td>
      </tr>`
  ).join('');

  const card = document.createElement('section');
  card.className = 'panel-card guide-section';
  card.innerHTML = `
    <h2 class="panel-title">Opt-In Feature Bootstrapping &amp; Lazy Browser Downloads</h2>
    <p class="guide-prose">
      To keep initial browser downloads minimal when lazy-loading standalone charts
      (<code>modern-charts/bar</code>, <code>modern-charts/line</code>, etc.), optional features like
      <strong>Zoom Controls</strong> and <strong>CSV Data Export</strong> are decoupled from core chart rendering
      and default to <code>false</code>. When left at their default <code>false</code>, the browser never downloads
      those feature chunks. Pass <code>{ features: { zoom: true, csvExport: true } }</code> to
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
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
  return card;
}

function mountDefaultVsEnabledDemo(
  themeMode: ThemeModePreference,
  mounted: MCBaseChart<any>[]
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'panel-card guide-section';
  section.id = 'bs-default-vs-enabled';
  section.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Default Bootstrap (<code>false</code>) vs. Explicit Enable (<code>true</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Compare how a chart behaves when bootstrapped with the default <code>features: { zoom: false, csvExport: false }</code> (zero feature chunk overhead) versus explicitly enabling <code>features: { zoom: true, csvExport: true }</code>.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Bootstrap mode presets">
        <button type="button" id="bs-mode-enabled" data-bs-mode="enabled" aria-pressed="true" class="btn-primary">
          Explicitly Enabled (zoom: true, csvExport: true)
        </button>
        <button type="button" id="bs-mode-default" data-bs-mode="default" aria-pressed="false">
          Default Bootstrap (zoom: false, csvExport: false)
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

  const chartHost = section.querySelector<HTMLElement>('#bs-chart-1')!;
  const editorHost = section.querySelector<HTMLElement>('#bs-editor-1')!;
  const btnEnabled = section.querySelector<HTMLButtonElement>('#bs-mode-enabled')!;
  const btnDefault = section.querySelector<HTMLButtonElement>('#bs-mode-default')!;
  const readoutEl = section.querySelector<HTMLElement>('#bs-readout-1')!;

  const chart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  chartHost.appendChild(chart);
  mounted.push(chart);

  const baselineConfig: Record<string, any> = {
    title: 'Quarterly Spend ($K)',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'OnPrem'],
    data: structuredClone(SAMPLE_BAR_DATA),
    view: {
      zoomable: true,
      pannable: true,
      showControls: true,
      maxZoom: 6
    },
    csvExport: {
      filename: 'quarterly-spend.csv'
    }
  };

  const refreshStatus = () => {
    const flags = getChartFeatures();
    const isEnabled = flags.zoom || flags.csvExport;
    const ctrlEl = chart.shadowRoot?.querySelector<HTMLElement>('.mc-view-controls');
    const isCtrlShown = Boolean(ctrlEl && !ctrlEl.hidden);
    const csvOutput = chart.toCsv();
    btnEnabled.setAttribute('aria-pressed', String(isEnabled));
    btnEnabled.classList.toggle('btn-primary', isEnabled);
    btnDefault.setAttribute('aria-pressed', String(!isEnabled));
    btnDefault.classList.toggle('btn-primary', !isEnabled);
    readoutEl.textContent = isEnabled
      ? `Bootstrap: registerModernCharts({ features: { zoom: true, csvExport: true } }) | features.zoom: ${flags.zoom} | features.csvExport: ${flags.csvExport} | On-chart zoom controls visible: ${isCtrlShown}\n${csvOutput}`
      : `Bootstrap: registerModernCharts() [Default] | features.zoom: ${flags.zoom} | features.csvExport: ${flags.csvExport} (feature chunks skipped on lazy load) | chart.toCsv(): ""`;
  };

  const applyConfig = (cfg: Record<string, any>) => {
    chart.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    refreshStatus();
  };

  applyConfig(baselineConfig);

  const liveEditor = createLiveConfigEditor({
    title: 'Chart Configuration (Live)',
    initialConfig: baselineConfig,
    hint: 'Note: In Studio live editors, chart.config is shown directly without bootstrap boilerplate.',
    onConfigChange: (nextCfg) => {
      applyConfig(nextCfg);
    },
    onReset: () => {
      void configureChartFeatures({ features: { zoom: true, csvExport: true } });
      const fresh = structuredClone(baselineConfig);
      applyConfig(fresh);
      liveEditor.syncConfig(fresh);
    }
  });
  editorHost.appendChild(liveEditor.element);

  btnEnabled.addEventListener('click', () => {
    void configureChartFeatures({ features: { zoom: true, csvExport: true } });
    refreshStatus();
  });

  btnDefault.addEventListener('click', () => {
    void configureChartFeatures({ features: { zoom: false, csvExport: false } });
    refreshStatus();
  });

  return section;
}

function mountPerChartSubpathExplorer(
  themeMode: ThemeModePreference,
  mounted: MCBaseChart<any>[]
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'panel-card guide-section';
  section.id = 'bs-per-chart';
  section.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Per-Chart Subpath Bootstrapping Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Select any chart from the catalog to preview its standalone subpath bootstrap call with default (<code>false</code>) vs. explicit (<code>true</code>) feature flags.
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

  const stageEl = section.querySelector<HTMLElement>('#bs-chart-2')!;
  const pillGroupEl = section.querySelector<HTMLElement>('#bs-type-buttons')!;
  const snippetReadoutEl = section.querySelector<HTMLElement>('#bs-readout-2')!;
  let currentEntry: ChartCatalogEntry = CHART_CATALOG[0];
  let currentChart: MCBaseChart<any> = document.createElement(
    currentEntry.tagName
  ) as MCBaseChart<any>;
  stageEl.appendChild(currentChart);
  mounted.push(currentChart);

  const buildEntryConfig = (entry: ChartCatalogEntry): Record<string, any> => ({
    title: entry.title,
    ...entry.createDefaultConfig(themeMode)
  });

  const renderSelectedCatalogEntry = (
    entry: ChartCatalogEntry,
    cfg: Record<string, any>
  ) => {
    if (currentChart.tagName.toLowerCase() !== entry.tagName) {
      const replacement = document.createElement(
        entry.tagName
      ) as MCBaseChart<any>;
      stageEl.replaceChildren(replacement);
      const pos = mounted.indexOf(currentChart);
      if (pos >= 0) mounted[pos] = replacement;
      else mounted.push(replacement);
      currentChart = replacement;
    }
    currentChart.setConfig({
      ...cfg,
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false
    });
    const fnName = REGISTER_FN_BY_ID[entry.id] ?? 'registerModernCharts';
    snippetReadoutEl.textContent = [
      `// 1. Default bootstrap (zoom: false, csvExport: false — feature chunks are NOT downloaded):`,
      `import { ${fnName} } from 'modern-charts/${entry.id}';`,
      `await ${fnName}();`,
      ``,
      `// 2. Explicitly enable features on bootstrap (lazy-loads only requested feature chunks):`,
      `await ${fnName}({ features: { zoom: true, csvExport: true } });`
    ].join('\n');
  };

  const configEditor = createLiveConfigEditor({
    title: 'Selected Chart Config (Live)',
    initialConfig: buildEntryConfig(currentEntry),
    hint: 'Live chart.config editor (Studio enables bootstrap features automatically for all interactive previews).',
    onConfigChange: (nextCfg) => {
      renderSelectedCatalogEntry(currentEntry, nextCfg);
    },
    onReset: () => {
      const fresh = buildEntryConfig(currentEntry);
      renderSelectedCatalogEntry(currentEntry, fresh);
      configEditor.syncConfig(fresh);
    }
  });
  section.querySelector('#bs-editor-2')!.appendChild(configEditor.element);

  for (const entry of CHART_CATALOG) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.dataset.bsChartType = entry.id;
    pill.textContent = entry.title.replace(' Chart', '');
    const selected = entry.id === currentEntry.id;
    pill.setAttribute('aria-pressed', String(selected));
    pill.classList.toggle('btn-primary', selected);
    pill.addEventListener('click', () => {
      currentEntry = entry;
      for (const b of pillGroupEl.querySelectorAll<HTMLButtonElement>(
        'button[data-bs-chart-type]'
      )) {
        const isMatch = b.dataset.bsChartType === entry.id;
        b.setAttribute('aria-pressed', String(isMatch));
        b.classList.toggle('btn-primary', isMatch);
      }
      const nextCfg = buildEntryConfig(entry);
      renderSelectedCatalogEntry(entry, nextCfg);
      configEditor.syncConfig(nextCfg);
    });
    pillGroupEl.appendChild(pill);
  }

  renderSelectedCatalogEntry(currentEntry, buildEntryConfig(currentEntry));
  return section;
}

export function renderBootstrappingGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  container.append(
    createFeatureMatrixSection(),
    mountDefaultVsEnabledDemo(themeMode, mounted),
    mountPerChartSubpathExplorer(themeMode, mounted)
  );

  const reference = document.createElement('section');
  reference.className = 'panel-card guide-section';
  reference.innerHTML = `
    <h2 class="panel-title">Bootstrapping Reference: Default (<code>false</code>) vs. Explicit (<code>true</code>)</h2>
    <p class="guide-prose">
      Use <code>registerModernCharts()</code> for full-library registration or
      <code>registerBarChart()</code> / <code>registerLineChart()</code> / etc. for single-chart lazy loading.
      Explore the individual feature guides for
      <a href="#/guide/view-zoom">🔍 Zoom Controls</a> and
      <a href="#/guide/csv-export">📥 CSV Data Export</a>.
    </p>
  `;
  reference.appendChild(
    createCodeBlock(
      `// ============================================================================
// A. Default Bootstrap (zoom: false, csvExport: false)
// Browser only downloads the chart component — feature chunks are NOT fetched.
// ============================================================================
import { registerBarChart } from 'modern-charts/bar';

await registerBarChart(); // equivalent to registerBarChart({ features: { zoom: false, csvExport: false } })

// ============================================================================
// B. Explicit Feature Bootstrap (zoom: true, csvExport: true)
// Dynamically downloads only the enabled feature chunks on demand.
// ============================================================================
import { registerModernCharts } from 'modern-charts';

await registerModernCharts({
  features: {
    zoom: true,      // enables <mc-view-layer>, [data-zoom="toggle"], chart.toggleZoom()
    csvExport: true  // enables chart.toCsv(), chart.exportCsv(), custom CSV serializers
  }
});`,
      'Default vs. Explicit Feature Bootstrapping'
    )
  );
  container.appendChild(reference);

  return mounted;
}
