import { CHART_CATALOG } from '../catalog';
import { getGlobalPalette } from '../state/theme';
import type { MCBaseChart } from '../../../src/core/base-chart';
import { configureChartFeatures } from '../../../src/core/features';
import type { ThemeModePreference } from '../../../src/core/types';
import { createCodeBlock } from './shared';

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
      Pass <code>features</code> to <code>registerModernCharts()</code> or a standalone chart’s registration function.
      Both features default to <code>false</code>. Standalone imports load the enabled feature chunks on demand.
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

function createBootstrapPlayground(
  themeMode: ThemeModePreference,
  mounted: MCBaseChart<any>[]
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'panel-card guide-section';
  section.innerHTML = `
    <h2 class="panel-title">Try Feature Bootstrapping</h2>
    <p class="guide-prose">
      Choose a registration example and enable features to try on the chart. The code updates with your choices.
    </p>
    <div class="guide-controls-row">
      <label>Registration
        <select id="bs-entrypoint">
          <option value="library">Full library</option>
          <option value="standalone">Standalone chart</option>
        </select>
      </label>
      <label>Chart <select id="bs-chart-type"></select></label>
      <div class="guide-controls-row" role="group" aria-label="Bootstrap features">
        <label><input id="bs-zoom" type="checkbox"> Zoom</label>
        <label><input id="bs-csv-export" type="checkbox"> CSV export</label>
      </div>
    </div>
    <div class="guide-example-grid">
      <div>
        <div class="guide-chart-stage" id="bs-chart"></div>
      </div>
      <div id="bs-bootstrap-code"></div>
    </div>
    <div class="guide-controls-row">
      <button type="button" id="bs-download-csv" disabled>Download CSV</button>
      <span id="bs-feature-status" role="status"></span>
    </div>
    <details id="bs-csv-preview" hidden>
      <summary>CSV preview</summary>
      <pre class="guide-code-pre" id="bs-csv-output"></pre>
    </details>
  `;

  const entrypoint = section.querySelector<HTMLSelectElement>('#bs-entrypoint')!;
  const chartType = section.querySelector<HTMLSelectElement>('#bs-chart-type')!;
  const zoom = section.querySelector<HTMLInputElement>('#bs-zoom')!;
  const csvExport = section.querySelector<HTMLInputElement>('#bs-csv-export')!;
  const stage = section.querySelector('#bs-chart')!;
  const download = section.querySelector<HTMLButtonElement>('#bs-download-csv')!;
  const csvPreview = section.querySelector<HTMLDetailsElement>('#bs-csv-preview')!;
  const csvOutput = section.querySelector('#bs-csv-output')!;
  const status = section.querySelector('#bs-feature-status')!;
  const codeBlock = createCodeBlock('', 'Bootstrap and use chart features');
  const code = codeBlock.querySelector('code')!;
  section.querySelector('#bs-bootstrap-code')!.appendChild(codeBlock);

  for (const entry of CHART_CATALOG) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.title;
    chartType.appendChild(option);
  }
  chartType.value = 'bar';
  const selectedChart = () => CHART_CATALOG.find(({ id }) => id === chartType.value)!;
  let chart: MCBaseChart<any>;

  const syncSnippet = () => {
    const chartEntry = selectedChart();
    const standalone = entrypoint.value === 'standalone';
    const registrar = standalone ? REGISTER_FN_BY_ID[chartEntry.id] : 'registerModernCharts';
    const source = standalone ? `modern-charts/${chartEntry.id}` : 'modern-charts';
    const lines = [
      `import { ${registrar} } from '${source}';`,
      '',
      `await ${registrar}({`,
      `  features: { zoom: ${zoom.checked}, csvExport: ${csvExport.checked} }`,
      '});'
    ];

    if (zoom.checked || csvExport.checked) {
      lines.push('', '// Use the enabled features on your configured chart.',
        `const chart = document.querySelector('${chartEntry.tagName}');`);
      if (zoom.checked) lines.push('chart.toggleZoom(true);');
      if (csvExport.checked) {
        lines.push('const csv = chart.toCsv();', '// Call chart.exportCsv() to download the CSV.');
      }
    }
    code.textContent = lines.join('\n');
  };

  const syncCsvPreview = (available: boolean) => {
    download.disabled = !available;
    csvPreview.hidden = !available;
    csvOutput.textContent = available ? chart.toCsv() : '';
  };

  const mountChart = () => {
    const entry = selectedChart();
    chart = document.createElement(entry.tagName) as MCBaseChart<any>;
    chart.setConfig({
      ...entry.createDefaultConfig(themeMode),
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false
    });
    stage.replaceChildren(chart);
    mounted[0] = chart;
    syncSnippet();
    syncCsvPreview(!download.disabled);
  };

  let changeId = 0;
  const applyFeatures = async () => {
    const id = ++changeId;
    const features = { zoom: zoom.checked, csvExport: csvExport.checked };
    syncSnippet();
    syncCsvPreview(false);
    status.textContent = features.zoom || features.csvExport ? 'Loading features…' : '';
    try {
      await configureChartFeatures({ features });
      if (id !== changeId) return;
      status.textContent = '';
      syncCsvPreview(features.csvExport);
    } catch {
      if (id === changeId) status.textContent = 'A feature could not load. Toggle it to retry.';
    }
  };

  entrypoint.addEventListener('change', syncSnippet);
  chartType.addEventListener('change', mountChart);
  zoom.addEventListener('change', () => void applyFeatures());
  csvExport.addEventListener('change', () => void applyFeatures());
  download.addEventListener('click', () => chart.exportCsv());

  mountChart();
  void applyFeatures();
  return section;
}

export function renderBootstrappingGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];
  container.append(createFeatureMatrixSection(), createBootstrapPlayground(themeMode, mounted));
  return mounted;
}
