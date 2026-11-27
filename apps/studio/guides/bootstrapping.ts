import { CHART_CATALOG } from '../catalog';
import { getGlobalPalette } from '../state/theme';
import { parseConfigObjectLiteral } from '../utils/code-sync';
import type { MCBaseChart } from '../../../src/core/base-chart';
import { configureChartFeatures } from '../../../src/core/features';
import type { ThemeModePreference } from '../../../src/core/types';
import { createCodeBlock, createLiveCodeEditor } from './shared';

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

function parseBootstrap(source: string) {
  const code = source.trim();
  const declaration = /^import\s*\{\s*(register\w+)\s*\}\s*from\s*(['"])(modern-charts(?:\/[a-z]+)?)\2/.exec(code);
  if (!declaration) throw new SyntaxError('Use a Modern Charts import followed by its registration call.');

  const [, registrar, , modulePath] = declaration;
  const chartId = modulePath === 'modern-charts' ? undefined : modulePath.slice('modern-charts/'.length);
  const expectedRegistrar = chartId ? REGISTER_FN_BY_ID[chartId] : 'registerModernCharts';
  const call = code.slice(declaration[0].length).trim().replace(/^;|;$/g, '').trim();
  const registration = /^(?:await\s+)?(register\w+)\s*\(([\s\S]*)\)$/.exec(call);
  if (registrar !== expectedRegistrar || registration?.[1] !== registrar) {
    throw new SyntaxError('Match the registration function to its Modern Charts import.');
  }

  const rawOptions = registration[2].trim();
  const literal = rawOptions.replace(/,$/, '').trimEnd();
  if (rawOptions && (!literal.startsWith('{') || !literal.endsWith('}'))) {
    throw new SyntaxError('Pass feature options as an object.');
  }
  const options: Record<string, unknown> = literal ? parseConfigObjectLiteral(literal) : {};
  const features: unknown = 'features' in options ? options.features : options;
  if (!features || typeof features !== 'object' || Array.isArray(features) ||
      Object.entries(features).some(([key, value]) =>
        (key !== 'zoom' && key !== 'csvExport') || typeof value !== 'boolean')) {
    throw new SyntaxError('Set zoom and csvExport to true or false.');
  }
  return {
    chartId,
    zoom: 'zoom' in features && features.zoom === true,
    csvExport: 'csvExport' in features && features.csvExport === true
  };
}

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
      Edit the registration code or use the controls to try features on the chart.
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
      <div class="guide-body-stack">
        <div id="bs-bootstrap-code"></div>
        <div id="bs-feature-code" hidden></div>
      </div>
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
  const featureCode = section.querySelector<HTMLElement>('#bs-feature-code')!;
  const featureExample = createCodeBlock('', 'Use the enabled features');
  const featureSnippet = featureExample.querySelector('code')!;
  featureCode.appendChild(featureExample);

  for (const entry of CHART_CATALOG) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.title;
    chartType.appendChild(option);
  }
  chartType.value = 'bar';
  const selectedChart = () => CHART_CATALOG.find(({ id }) => id === chartType.value)!;
  let chart: MCBaseChart<any>;

  const formatBootstrap = () => {
    const chartEntry = selectedChart();
    const standalone = entrypoint.value === 'standalone';
    const registrar = standalone ? REGISTER_FN_BY_ID[chartEntry.id] : 'registerModernCharts';
    const source = standalone ? `modern-charts/${chartEntry.id}` : 'modern-charts';
    return [
      `import { ${registrar} } from '${source}';`,
      '',
      `await ${registrar}({`,
      `  features: { zoom: ${zoom.checked}, csvExport: ${csvExport.checked} }`,
      '});'
    ].join('\n');
  };

  const syncFeatureExample = () => {
    featureCode.hidden = !zoom.checked && !csvExport.checked;
    const lines = [`const chart = document.querySelector('${selectedChart().tagName}');`];
    if (zoom.checked) lines.push('chart.toggleZoom(true);');
    if (csvExport.checked) {
      lines.push('const csv = chart.toCsv();', '// Call chart.exportCsv() to download the CSV.');
    }
    featureSnippet.textContent = lines.join('\n');
  };

  const syncCsvPreview = (available: boolean) => {
    download.disabled = !available;
    csvPreview.hidden = !available;
    csvOutput.textContent = available ? chart.toCsv() : '';
  };

  const mountChart = () => {
    const entry = selectedChart();
    if (chart?.localName === entry.tagName) return;
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
    syncCsvPreview(!download.disabled);
  };

  let changeId = 0;
  const applyFeatures = async () => {
    const id = ++changeId;
    const features = { zoom: zoom.checked, csvExport: csvExport.checked };
    syncFeatureExample();
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

  const editor = createLiveCodeEditor({
    title: 'Bootstrap and use chart features',
    initialValue: formatBootstrap(),
    language: 'js',
    hint: 'Edit the Modern Charts import and registration options to update the preview.',
    onApply: (source) => {
      const parsed = parseBootstrap(source);
      entrypoint.value = parsed.chartId ? 'standalone' : 'library';
      if (parsed.chartId) chartType.value = parsed.chartId;
      zoom.checked = parsed.zoom;
      csvExport.checked = parsed.csvExport;
      mountChart();
      void applyFeatures();
    },
    onReset: () => {
      chartType.value = 'bar';
      editor.setValue(editorDefault, { resetBaseline: false });
      editor.applyCurrent();
    }
  });
  const editorDefault = editor.getValue();
  section.querySelector('#bs-bootstrap-code')!.appendChild(editor.element);

  const syncSnippet = () => editor.setValue(formatBootstrap(), { resetBaseline: false });
  const updateFeaturesFromControls = () => {
    syncSnippet();
    void applyFeatures();
  };
  entrypoint.addEventListener('change', syncSnippet);
  chartType.addEventListener('change', () => {
    mountChart();
    syncSnippet();
    syncFeatureExample();
  });
  zoom.addEventListener('change', updateFeaturesFromControls);
  csvExport.addEventListener('change', updateFeaturesFromControls);
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
