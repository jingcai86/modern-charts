import {
  registerModernCharts,
  MCBaseChart,
  resolveEffectiveThemeMode,
  type ChartConfig,
  type ChartRenderContext,
  type ThemeModePreference
} from '../src/index';
import {
  CHART_CATALOG,
  COMMON_ATTRIBUTES,
  MARKER_THRESHOLD_ATTRIBUTES,
  SVG_ICON_PRESETS,
  VIEW_ZOOM_ATTRIBUTES,
  type ChartAttributeSpec,
  type ChartCatalogEntry
} from './chart-catalog';
import { generateRandomDataForChart } from './sample-data';

registerModernCharts();

const THEME_STORAGE_KEY = 'modern-charts-theme-mode';

function loadSavedThemePreference(): ThemeModePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'system';
}

function saveThemePreference(pref: ThemeModePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore storage errors
  }
}

let globalThemeMode: ThemeModePreference = loadSavedThemePreference();
document.documentElement.dataset.theme = resolveEffectiveThemeMode(globalThemeMode);

// Per-chart active config state so user customizations persist across route changes
const chartConfigState = new Map<string, ChartConfig<any>>();
// Per-chart active virtual UI state for helper attributes (__marker*, __labelIconPreset)
const chartVirtualState = new Map<
  string,
  {
    __markerEnabled: boolean;
    __markerThresholdValue: number;
    __markerCondition: 'below' | 'above' | 'between';
    __markerMatchColor: string;
    __labelIconPreset: string;
  }
>();

function getOrInitChartConfig(entry: ChartCatalogEntry): ChartConfig<any> {
  if (!chartConfigState.has(entry.id)) {
    const cfg = entry.createDefaultConfig(globalThemeMode);
    chartConfigState.set(entry.id, cfg);

    const lineMarker = cfg.markers?.find((m) => m.type === 'line');
    chartVirtualState.set(entry.id, {
      __markerEnabled: Boolean(cfg.markers && cfg.markers.length > 0),
      __markerThresholdValue:
        typeof lineMarker?.value === 'number' ? lineMarker.value : 130,
      __markerCondition:
        (lineMarker?.condition as 'below' | 'above' | 'between') ?? 'below',
      __markerMatchColor: lineMarker?.matchStyle?.color ?? '#ef4444',
      __labelIconPreset: 'none'
    });
  }
  return chartConfigState.get(entry.id)!;
}

function resetChartConfig(entry: ChartCatalogEntry): ChartConfig<any> {
  chartConfigState.delete(entry.id);
  chartVirtualState.delete(entry.id);
  return getOrInitChartConfig(entry);
}

// Deep property access helpers for dotted config paths (e.g. 'yScale.max', 'view.zoomable')
function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

function setByPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null || typeof cur[key] !== 'object') {
      cur[key] = {};
    } else {
      cur[key] = { ...cur[key] };
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function buildMarkersForVirtualState(
  entry: ChartCatalogEntry,
  vState: {
    __markerEnabled: boolean;
    __markerThresholdValue: number;
    __markerCondition: 'below' | 'above' | 'between';
    __markerMatchColor: string;
  }
) {
  if (!entry.supportsMarkers || !vState.__markerEnabled) {
    return [];
  }
  const val = Number(vState.__markerThresholdValue) || 130;
  const color = vState.__markerMatchColor || '#ef4444';
  const cond = vState.__markerCondition || 'below';

  return [
    {
      id: `${entry.id}-threshold-area`,
      type: 'area' as const,
      axis: 'y' as const,
      from: 0,
      to: val,
      fill: color,
      fillOpacity: 0.09
    },
    {
      id: `${entry.id}-threshold-line`,
      type: 'line' as const,
      axis: 'y' as const,
      value: val,
      from: cond === 'between' ? 0 : undefined,
      to: cond === 'between' ? val : undefined,
      label: `Threshold (${cond} ${val})`,
      icon: SVG_ICON_PRESETS.warn,
      stroke: color,
      strokeWidth: 2,
      strokeDasharray: '6 4',
      condition: cond,
      matchStyle: {
        color,
        fill: color,
        stroke: color,
        radius: 6
      }
    }
  ];
}

function getAllAttributesForChart(entry: ChartCatalogEntry): ChartAttributeSpec[] {
  const list: ChartAttributeSpec[] = [...entry.specificAttributes];
  if (entry.supportsMarkers) {
    list.push(...MARKER_THRESHOLD_ATTRIBUTES);
  }
  if (entry.supportsViewZoom) {
    list.push(...VIEW_ZOOM_ATTRIBUTES);
  }
  list.push(...COMMON_ATTRIBUTES);
  return list;
}

function formatConfigAsJson(config: ChartConfig<any>): string {
  return JSON.stringify(
    config,
    (_key, value) => {
      if (typeof value === 'function') {
        return '[Function]';
      }
      return value;
    },
    2
  );
}

function generateWebComponentHtmlSnippet(
  entry: ChartCatalogEntry,
  config: ChartConfig<any>
): string {
  const themeMode = config.themeMode ?? globalThemeMode;
  const palette = config.palette ?? 'modern';
  const motion =
    typeof config.motionConfig === 'string' ? config.motionConfig : 'default';
  const labelMode = config.labelMode ?? 'svg';

  const lines: string[] = [
    `<!-- 1. Place the Web Component tag in HTML -->`,
    `<${entry.tagName}`,
    `  id="my-${entry.id}-chart"`,
    `  auto-size="${config.autoSize !== false}"`,
    `  theme-mode="${themeMode}"`,
    `  palette="${palette}"`,
    `  motion-config="${motion}"`,
    `  label-mode="${labelMode}"`,
    `  aria-label="${config.ariaLabel ?? entry.title}"`,
    `  is-focusable="${config.isFocusable !== false}"`,
    `></${entry.tagName}>`,
    ``,
    `<!-- 2. Or configure everything via a single Nivo-style chart.config object -->`,
    `<script type="module">`,
    `  import { registerModernCharts } from 'modern-charts';`,
    `  registerModernCharts();`,
    ``,
    `  const chart = document.getElementById('my-${entry.id}-chart');`,
    `  chart.config = ${formatConfigAsJson(config)
      .split('\n')
      .map((l, idx) => (idx === 0 ? l : `  ${l}`))
      .join('\n')};`,
    `</script>`
  ];
  return lines.join('\n');
}

// ============================================================================
// OVERVIEW GALLERY VIEW (#/)
// ============================================================================
let activeOverviewCharts: MCBaseChart<any>[] = [];

function renderOverviewPage(root: HTMLElement): void {
  activeOverviewCharts = [];
  root.innerHTML = '';

  const navOverviewBtn = document.getElementById('nav-overview-btn');
  navOverviewBtn?.classList.add('active');

  // Grid of 10 clean live example cards
  const grid = document.createElement('section');
  grid.className = 'overview-grid';

  CHART_CATALOG.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'overview-card';
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open ${entry.title}`);

    card.innerHTML = `
      <div class="overview-card-header">
        <h3 class="overview-card-title">${entry.title}</h3>
      </div>
      <div class="overview-preview-stage" id="preview-stage-${entry.id}"></div>
    `;

    const navigateToChart = () => {
      window.location.hash = `#/chart/${entry.id}`;
    };

    card.addEventListener('click', navigateToChart);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToChart();
      }
    });

    grid.appendChild(card);

    // Mount live chart instance inside preview stage (without zoom overlay controls on home page cards)
    const stage = card.querySelector(`#preview-stage-${entry.id}`) as HTMLElement;
    const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
    const cfg = getOrInitChartConfig(entry);
    stage.appendChild(chartEl);
    chartEl.setConfig({
      ...cfg,
      themeMode: globalThemeMode,
      view: cfg.view ? { ...cfg.view, showControls: false } : undefined
    });
    activeOverviewCharts.push(chartEl);
  });

  root.appendChild(grid);
}

// ============================================================================
// DEDICATED CHART PLAYGROUND VIEW (#/chart/:id)
// ============================================================================
let activeDetailChart: MCBaseChart<any> | null = null;
let activeDetailEntry: ChartCatalogEntry | null = null;

function renderChartDetailPage(root: HTMLElement, entry: ChartCatalogEntry): void {
  activeOverviewCharts = [];
  activeDetailEntry = entry;
  root.innerHTML = '';

  const navOverviewBtn = document.getElementById('nav-overview-btn');
  navOverviewBtn?.classList.remove('active');

  const config = getOrInitChartConfig(entry);
  const vState = chartVirtualState.get(entry.id)!;

  // 1. Top Chart Navigation Strip (Back to Gallery + All 10 chart tabs)
  const navBar = document.createElement('nav');
  navBar.className = 'chart-nav-bar';
  navBar.setAttribute('aria-label', 'Chart Type Switcher');
  navBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <a href="#/" class="nav-home-btn">← Back to Gallery</a>
      <div class="chart-tabs-strip">
        ${CHART_CATALOG.map(
          (item) => `
          <a
            href="#/chart/${item.id}"
            class="chart-tab-pill ${item.id === entry.id ? 'active' : ''}"
          >
            ${item.title}
          </a>
        `
        ).join('')}
      </div>
    </div>
  `;
  root.appendChild(navBar);

  // 2. Two-Column Studio Grid:
  //    Left: Live Interactive Chart Stage + Layer Toggles + AI Streamer + ARIA Inspector
  //    Right: Live Editable `chart.config` JSON & Web Component HTML Inspector
  const studioGrid = document.createElement('section');
  studioGrid.className = 'detail-studio-grid';

  // Left Card: Live Chart Stage
  const chartCard = document.createElement('div');
  chartCard.className = 'panel-card';
  chartCard.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">
          <span>${entry.title}</span>
          <span class="comp-pill">&lt;${entry.tagName}&gt;</span>
        </h2>
        <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">
          ${entry.summary}
        </p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" id="btn-detail-randomize-data" class="btn-primary">
          🎲 Randomize Data
        </button>
        <button type="button" id="btn-detail-ai-stream">
          ▶ Stream AI Layers
        </button>
        <button type="button" id="btn-detail-replay-anim">
          ↻ Replay Animation
        </button>
        <button type="button" id="btn-detail-custom-layer">
          + Inject Custom Layer
        </button>
      </div>
    </div>

    <div class="layer-chips" id="detail-layer-chips"></div>

    <div class="detail-chart-stage" id="detail-chart-stage"></div>

    <div class="inspector-box">
      <div class="inspector-title">
        Live Item Readout (Hover or Tab + Arrow Keys on chart items):
      </div>
      <div class="inspector-readout" id="detail-aria-readout">
        Interact with any data element inside &lt;${entry.tagName}&gt; to inspect its aria-label, threshold state, and datum payload...
      </div>
    </div>
  `;

  // Right Card: Live Editable Data, Config & Web Component Markup
  const editorCard = document.createElement('div');
  editorCard.className = 'panel-card';
  editorCard.innerHTML = `
    <div class="panel-header">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <h2 class="panel-title">Live Config &amp; Data Editor</h2>
        <span id="config-sync-status" class="config-status-badge">Live Synced ✓</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div class="editor-tabs">
          <button type="button" id="tab-btn-data" class="editor-tab-btn active">
            chart.config.data (Edit Data)
          </button>
          <button type="button" id="tab-btn-json" class="editor-tab-btn">
            chart.config (Full Config)
          </button>
          <button type="button" id="tab-btn-html" class="editor-tab-btn">
            Web Component HTML
          </button>
        </div>
        <button type="button" id="btn-editor-randomize-data" class="btn-primary">
          🎲 Randomize Data
        </button>
        <button type="button" id="btn-reset-config">
          ↺ Reset Default
        </button>
      </div>
    </div>

    <p style="margin:0;font-size:0.8rem;color:var(--text-muted);" id="editor-helper-desc">
      Edit the dataset JSON below or click <strong>🎲 Randomize Data</strong> to generate new values — changes reflect on the chart and in <code>chart.config</code> immediately.
    </p>

    <textarea
      id="detail-data-textarea"
      class="config-editor-textarea"
      spellcheck="false"
      aria-label="Live chart.config.data JSON editor"
    ></textarea>

    <textarea
      id="detail-config-textarea"
      class="config-editor-textarea"
      spellcheck="false"
      aria-label="Live chart.config JSON editor"
      hidden
    ></textarea>

    <pre id="detail-html-preview" class="stream-code-box" hidden></pre>
  `;

  studioGrid.appendChild(chartCard);
  studioGrid.appendChild(editorCard);
  root.appendChild(studioGrid);

  // Mount the live chart element
  const stage = chartCard.querySelector('#detail-chart-stage') as HTMLElement;
  const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
  stage.appendChild(chartEl);
  chartEl.setConfig(config);
  activeDetailChart = chartEl;

  const dataTextarea = editorCard.querySelector(
    '#detail-data-textarea'
  ) as HTMLTextAreaElement;
  const configTextarea = editorCard.querySelector(
    '#detail-config-textarea'
  ) as HTMLTextAreaElement;
  const htmlPreviewBox = editorCard.querySelector(
    '#detail-html-preview'
  ) as HTMLPreElement;
  const syncStatusBadge = editorCard.querySelector(
    '#config-sync-status'
  ) as HTMLElement;
  const editorHelperDesc = editorCard.querySelector(
    '#editor-helper-desc'
  ) as HTMLElement;
  const ariaReadout = chartCard.querySelector(
    '#detail-aria-readout'
  ) as HTMLElement;

  // Bind live ARIA & pointer readout
  chartEl.addEventListener('mc-item-pointer-enter', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const target = detail?.originalEvent?.target as SVGElement | null;
    const ariaText = target?.getAttribute('aria-label') ?? 'Chart Item';
    const underThresh = target?.getAttribute('data-under-threshold') === 'true';
    ariaReadout.textContent = `role="${
      target?.getAttribute('role') ?? 'graphics-symbol'
    }" | aria-label="${ariaText}"${
      underThresh ? ' | ⚠️ UNDER THRESHOLD (Restyled)' : ''
    }`;
  });

  // Render Layer Toggle Chips
  const layerChipsContainer = chartCard.querySelector(
    '#detail-layer-chips'
  ) as HTMLElement;
  let activeLayerNames = [
    ...((config.layers as string[] | undefined) ?? entry.defaultLayers)
  ];

  function renderLayerChips() {
    layerChipsContainer.innerHTML = `<span style="font-size:0.76rem;color:var(--text-muted);margin-right:4px;">Active Layers:</span>`;
    entry.defaultLayers.forEach((layerName) => {
      const isOn = activeLayerNames.includes(layerName);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `layer-chip ${isOn ? 'active' : ''}`;
      chip.textContent = `${isOn ? '✓ ' : '+ '}${layerName}`;
      chip.addEventListener('click', () => {
        if (activeLayerNames.includes(layerName)) {
          activeLayerNames = activeLayerNames.filter((l) => l !== layerName);
        } else {
          activeLayerNames = entry.defaultLayers.filter(
            (l) => activeLayerNames.includes(l) || l === layerName
          );
        }
        config.layers = [...activeLayerNames];
        applyConfigUpdate(config, 'controls');
        renderLayerChips();
      });
      layerChipsContainer.appendChild(chip);
    });
  }
  renderLayerChips();

  // Tab switch between Editable Data, Editable Full Config JSON, and Web Component HTML
  const tabBtnData = editorCard.querySelector('#tab-btn-data') as HTMLButtonElement;
  const tabBtnJson = editorCard.querySelector('#tab-btn-json') as HTMLButtonElement;
  const tabBtnHtml = editorCard.querySelector('#tab-btn-html') as HTMLButtonElement;

  tabBtnData.addEventListener('click', () => {
    tabBtnData.classList.add('active');
    tabBtnJson.classList.remove('active');
    tabBtnHtml.classList.remove('active');
    dataTextarea.hidden = false;
    configTextarea.hidden = true;
    htmlPreviewBox.hidden = true;
    editorHelperDesc.innerHTML =
      'Edit the dataset JSON below or click <strong>🎲 Randomize Data</strong> to generate new values — changes reflect on the chart and in <code>chart.config</code> immediately.';
  });

  tabBtnJson.addEventListener('click', () => {
    tabBtnJson.classList.add('active');
    tabBtnData.classList.remove('active');
    tabBtnHtml.classList.remove('active');
    dataTextarea.hidden = true;
    configTextarea.hidden = false;
    htmlPreviewBox.hidden = true;
    editorHelperDesc.innerHTML =
      'Edit any field in the full <code>chart.config</code> JSON below or adjust any attribute control in the table underneath — both update the live chart immediately.';
  });

  tabBtnHtml.addEventListener('click', () => {
    tabBtnHtml.classList.add('active');
    tabBtnData.classList.remove('active');
    tabBtnJson.classList.remove('active');
    dataTextarea.hidden = true;
    configTextarea.hidden = true;
    htmlPreviewBox.hidden = false;
    editorHelperDesc.innerHTML =
      'Declarative Web Component HTML markup representing the current <code>chart.config</code> and its internal composable layer elements.';
  });

  const handleRandomizeData = () => {
    config.data = generateRandomDataForChart(entry.id, config.data);
    applyConfigUpdate(config, 'randomize');
  };

  chartCard
    .querySelector('#btn-detail-randomize-data')
    ?.addEventListener('click', handleRandomizeData);
  editorCard
    .querySelector('#btn-editor-randomize-data')
    ?.addEventListener('click', handleRandomizeData);

  // Action Buttons: Stream AI Layers, Replay Animation, Inject Custom Layer
  let isStreaming = false;
  chartCard
    .querySelector('#btn-detail-ai-stream')
    ?.addEventListener('click', async () => {
      if (isStreaming) return;
      isStreaming = true;
      activeLayerNames = [];
      renderLayerChips();

      for (let i = 0; i < entry.defaultLayers.length; i++) {
        const nextSlice = entry.defaultLayers.slice(0, i + 1);
        activeLayerNames = [...nextSlice];
        config.layers = [...nextSlice];
        chartEl.setConfig(config);
        configTextarea.value = formatConfigAsJson(config);
        htmlPreviewBox.textContent = generateWebComponentHtmlSnippet(entry, config);
        renderLayerChips();
        await new Promise((r) => setTimeout(r, 240));
      }
      isStreaming = false;
    });

  chartCard
    .querySelector('#btn-detail-replay-anim')
    ?.addEventListener('click', () => {
      chartEl.replayAnimation();
    });

  let customLayerInjected = false;
  const customOverlayFn = (ctx: ChartRenderContext<any>) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'client-custom-layer');

    const matchedCount = ctx.thresholds?.matchedItems.length ?? 0;
    const badgeText =
      matchedCount > 0
        ? `Custom Layer: ${matchedCount} items triggered threshold`
        : `Custom Layer: ${ctx.innerWidth}×${ctx.innerHeight}px canvas`;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(Math.max(8, ctx.innerWidth - 270)));
    rect.setAttribute('y', '8');
    rect.setAttribute('width', '262');
    rect.setAttribute('height', '26');
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', matchedCount > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)');
    rect.setAttribute('stroke', matchedCount > 0 ? '#ef4444' : '#6366f1');
    rect.setAttribute('stroke-width', '1.2');
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(Math.max(18, ctx.innerWidth - 258)));
    text.setAttribute('y', '25');
    text.setAttribute('fill', ctx.theme.textColor);
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', '700');
    text.textContent = badgeText;
    g.appendChild(text);

    return g;
  };

  chartCard
    .querySelector('#btn-detail-custom-layer')
    ?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!customLayerInjected) {
        chartEl.layers = [...activeLayerNames, customOverlayFn];
        customLayerInjected = true;
        btn.textContent = '✓ Custom Layer Active (Remove)';
        btn.classList.add('btn-primary');
      } else {
        chartEl.layers = [...activeLayerNames];
        customLayerInjected = false;
        btn.textContent = '+ Inject Custom Layer';
        btn.classList.remove('btn-primary');
      }
    });

  // 3. Full Interactive Attributes & Properties Customizer Section
  const allAttributes = getAllAttributesForChart(entry);
  const categories = Array.from(new Set(allAttributes.map((a) => a.category)));

  const attributesSection = document.createElement('section');
  attributesSection.className = 'panel-card';
  attributesSection.innerHTML = `
    <div class="attributes-section-header">
      <div>
        <h2 class="panel-title">
          All Customizable Attributes &amp; Config Properties (${allAttributes.length})
        </h2>
        <p style="margin:4px 0 0;font-size:0.83rem;color:var(--text-muted);">
          Every attribute and property that <code>&lt;${entry.tagName}&gt;</code> accepts. Change any control below to see it reflect on the live chart and in <code>chart.config</code> immediately.
        </p>
      </div>
      <div class="attributes-filter-bar">
        <input
          type="text"
          id="attr-search-input"
          class="attr-search-input"
          placeholder="Filter attributes (e.g. zoom, threshold, curve, aria)..."
          aria-label="Filter attributes"
        />
      </div>
    </div>
    <div class="attributes-categories-grid" id="attributes-categories-grid"></div>
  `;
  root.appendChild(attributesSection);

  const categoriesGrid = attributesSection.querySelector(
    '#attributes-categories-grid'
  ) as HTMLElement;

  // Map from configPath -> DOM sync callback so editing raw JSON updates the controls too
  const controlSyncCallbacks = new Map<string, () => void>();

  function getAttributeValue(spec: ChartAttributeSpec): any {
    if (spec.configPath.startsWith('__')) {
      return (vState as any)[spec.configPath] ?? spec.defaultValue;
    }
    const val = getByPath(config, spec.configPath);
    return val !== undefined ? val : spec.defaultValue;
  }

  function setAttributeValue(spec: ChartAttributeSpec, rawVal: any): void {
    if (spec.configPath.startsWith('__')) {
      (vState as any)[spec.configPath] = rawVal;
      if (spec.configPath === '__labelIconPreset') {
        const iconSvg = SVG_ICON_PRESETS[String(rawVal)];
        const prevLabel = !Array.isArray(config.label) ? config.label ?? {} : {};
        if (iconSvg) {
          config.labelMode = 'foreignObject';
          config.label = {
            ...prevLabel,
            renderMode: 'foreignObject',
            icon: iconSvg,
            iconPosition: 'start'
          };
        } else {
          const copy = { ...prevLabel };
          delete copy.icon;
          config.label = copy;
        }
        controlSyncCallbacks.get('labelMode')?.();
      } else {
        config.markers = buildMarkersForVirtualState(entry, vState);
      }
    } else {
      setByPath(config, spec.configPath, rawVal);
    }

    applyConfigUpdate(config, 'controls');
  }

  categories.forEach((categoryName) => {
    const specsInCat = allAttributes.filter((a) => a.category === categoryName);
    const catCard = document.createElement('div');
    catCard.className = 'attr-category-card';
    catCard.dataset.category = categoryName;

    catCard.innerHTML = `
      <h3 class="attr-category-title">
        <span>${categoryName.replace(/\s*\(<mc-[^>]+>\)/g, '')}</span>
        <span class="comp-pill">${specsInCat.length} props</span>
      </h3>
      <div class="attr-list"></div>
    `;

    const attrList = catCard.querySelector('.attr-list') as HTMLElement;

    specsInCat.forEach((spec) => {
      const row = document.createElement('div');
      row.className = 'attr-row';
      row.dataset.searchText = `${spec.configPath} ${spec.attrName} ${spec.description} ${spec.category}`.toLowerCase();

      const cleanAttrBadge = spec.attrName
        .replace(/\s*\/\s*mc-[a-z-]+\[[^\]]+\]/g, '')
        .replace(/^mc-[a-z-]+\[([^\]]+)\]$/, '$1');
      const metaDiv = document.createElement('div');
      metaDiv.className = 'attr-meta';
      metaDiv.innerHTML = `
        <div class="attr-names">
          <span class="attr-config-path">${
            spec.configPath.startsWith('__')
              ? spec.configPath.replace('__', '')
              : spec.configPath
          }</span>
          <span class="attr-html-badge">${cleanAttrBadge}</span>
        </div>
        <p class="attr-desc">${spec.description}</p>
      `;

      const controlCell = document.createElement('div');
      controlCell.className = 'attr-control-cell';

      const currentVal = getAttributeValue(spec);

      if (spec.control === 'boolean') {
        const label = document.createElement('label');
        label.className = 'toggle-switch';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(currentVal);
        const stateSpan = document.createElement('span');
        stateSpan.textContent = checkbox.checked ? 'true' : 'false';

        checkbox.addEventListener('change', () => {
          stateSpan.textContent = checkbox.checked ? 'true' : 'false';
          setAttributeValue(spec, checkbox.checked);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = Boolean(getAttributeValue(spec));
          checkbox.checked = v;
          stateSpan.textContent = v ? 'true' : 'false';
        });

        label.appendChild(checkbox);
        label.appendChild(stateSpan);
        controlCell.appendChild(label);
      } else if (spec.control === 'range') {
        const wrap = document.createElement('div');
        wrap.className = 'attr-range-wrap';
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(spec.min ?? 0);
        range.max = String(spec.max ?? 100);
        range.step = String(spec.step ?? 1);
        range.value = String(currentVal ?? spec.defaultValue);

        const valBadge = document.createElement('span');
        valBadge.className = 'attr-range-val';
        valBadge.textContent = String(range.value);

        range.addEventListener('input', () => {
          const num = Number(range.value);
          valBadge.textContent = String(num);
          setAttributeValue(spec, num);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          range.value = String(v ?? spec.defaultValue);
          valBadge.textContent = String(range.value);
        });

        wrap.appendChild(range);
        wrap.appendChild(valBadge);
        controlCell.appendChild(wrap);
      } else if (spec.control === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        if (spec.min !== undefined) input.min = String(spec.min);
        if (spec.max !== undefined) input.max = String(spec.max);
        if (spec.step !== undefined) input.step = String(spec.step);
        input.value =
          currentVal === 'auto' || currentVal === undefined
            ? ''
            : String(currentVal);
        input.placeholder = 'auto';

        input.addEventListener('input', () => {
          const raw = input.value.trim();
          const parsed = raw === '' ? 'auto' : Number(raw);
          setAttributeValue(spec, Number.isNaN(parsed as number) ? 'auto' : parsed);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          input.value = v === 'auto' || v === undefined ? '' : String(v);
        });

        controlCell.appendChild(input);
      } else if (spec.control === 'select') {
        const select = document.createElement('select');
        (spec.options ?? []).forEach((opt) => {
          const optionEl = document.createElement('option');
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          if (String(currentVal) === opt.value) {
            optionEl.selected = true;
          }
          select.appendChild(optionEl);
        });

        select.addEventListener('change', () => {
          setAttributeValue(spec, select.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = String(getAttributeValue(spec));
          select.value = v;
        });

        controlCell.appendChild(select);
      } else if (spec.control === 'color') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = String(currentVal || '#ef4444');
        colorInput.style.width = '44px';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.background = 'transparent';
        colorInput.style.cursor = 'pointer';

        const hexLabel = document.createElement('span');
        hexLabel.className = 'attr-range-val';
        hexLabel.textContent = colorInput.value;

        colorInput.addEventListener('input', () => {
          hexLabel.textContent = colorInput.value;
          setAttributeValue(spec, colorInput.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = String(getAttributeValue(spec) || '#ef4444');
          colorInput.value = v;
          hexLabel.textContent = v;
        });

        controlCell.appendChild(colorInput);
        controlCell.appendChild(hexLabel);
      } else {
        // text
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = String(currentVal ?? '');

        textInput.addEventListener('input', () => {
          setAttributeValue(spec, textInput.value);
        });

        controlSyncCallbacks.set(spec.configPath, () => {
          const v = getAttributeValue(spec);
          textInput.value = String(v ?? '');
        });

        controlCell.appendChild(textInput);
      }

      row.appendChild(metaDiv);
      row.appendChild(controlCell);
      attrList.appendChild(row);
    });

    categoriesGrid.appendChild(catCard);
  });

  // Search filter for attributes
  const searchInput = attributesSection.querySelector(
    '#attr-search-input'
  ) as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    const cards = categoriesGrid.querySelectorAll<HTMLElement>('.attr-category-card');
    cards.forEach((card) => {
      const rows = card.querySelectorAll<HTMLElement>('.attr-row');
      let visibleInCard = 0;
      rows.forEach((r) => {
        const match = !q || (r.dataset.searchText ?? '').includes(q);
        r.style.display = match ? '' : 'none';
        if (match) visibleInCard++;
      });
      card.style.display = visibleInCard > 0 ? '' : 'none';
    });
  });

  // Central sync helper between Chart, Data Editor, JSON Editor, HTML Preview, and Attribute Controls
  function applyConfigUpdate(
    nextCfg: ChartConfig<any>,
    source: 'controls' | 'data-editor' | 'json-editor' | 'randomize' | 'reset'
  ) {
    chartConfigState.set(entry.id, nextCfg);
    chartEl.setConfig(nextCfg);

    htmlPreviewBox.textContent = generateWebComponentHtmlSnippet(entry, nextCfg);

    if (source !== 'data-editor') {
      dataTextarea.value = JSON.stringify(nextCfg.data, null, 2);
    }

    if (source !== 'json-editor') {
      configTextarea.value = formatConfigAsJson(nextCfg);
    }

    if (source !== 'data-editor' && source !== 'json-editor') {
      syncStatusBadge.textContent = 'Live Synced ✓';
      syncStatusBadge.classList.remove('error');
    }

    if (source !== 'controls') {
      controlSyncCallbacks.forEach((syncFn) => syncFn());
      if (Array.isArray(nextCfg.layers)) {
        activeLayerNames = nextCfg.layers.filter(
          (l): l is string => typeof l === 'string'
        );
      } else {
        activeLayerNames = [...entry.defaultLayers];
      }
      renderLayerChips();
    }
  }

  // Initialize editor contents
  dataTextarea.value = JSON.stringify(config.data, null, 2);
  configTextarea.value = formatConfigAsJson(config);
  htmlPreviewBox.textContent = generateWebComponentHtmlSnippet(entry, config);

  // Live Data JSON editor input listener
  dataTextarea.addEventListener('input', () => {
    try {
      const parsedData = JSON.parse(dataTextarea.value);
      config.data = parsedData;

      syncStatusBadge.textContent = 'Data Synced ✓';
      syncStatusBadge.classList.remove('error');
      applyConfigUpdate(config, 'data-editor');
    } catch (_err: any) {
      syncStatusBadge.textContent = 'Invalid Data JSON';
      syncStatusBadge.classList.add('error');
    }
  });

  // Live Full Config JSON editor input listener
  configTextarea.addEventListener('input', () => {
    try {
      const parsed = JSON.parse(configTextarea.value);
      Object.keys(config).forEach((k) => delete (config as any)[k]);
      Object.assign(config, parsed);

      syncStatusBadge.textContent = 'Config Synced ✓';
      syncStatusBadge.classList.remove('error');
      applyConfigUpdate(config, 'json-editor');
    } catch (_err: any) {
      syncStatusBadge.textContent = 'Invalid Config JSON';
      syncStatusBadge.classList.add('error');
    }
  });

  // Reset Default Config button
  editorCard.querySelector('#btn-reset-config')?.addEventListener('click', () => {
    const fresh = resetChartConfig(entry);
    Object.keys(config).forEach((k) => delete (config as any)[k]);
    Object.assign(config, fresh);
    const freshVState = chartVirtualState.get(entry.id)!;
    Object.assign(vState, freshVState);
    applyConfigUpdate(config, 'reset');
  });
}

// ============================================================================
// HASH ROUTER (#/ and #/chart/:id)
// ============================================================================
function handleRoute(): void {
  const root = document.getElementById('app-root');
  if (!root) return;

  const hash = window.location.hash || '#/';
  const match = hash.match(/^#\/chart\/([a-z0-9-]+)$/i);

  if (match) {
    const chartId = match[1].toLowerCase();
    const entry = CHART_CATALOG.find((c) => c.id === chartId);
    if (entry) {
      renderChartDetailPage(root, entry);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  activeDetailChart = null;
  activeDetailEntry = null;
  renderOverviewPage(root);
}

window.addEventListener('hashchange', handleRoute);

// ============================================================================
// GLOBAL THEME MODE SWITCHER (System / Dark / Light Mode + localStorage)
// ============================================================================
const globalThemeSelect = document.getElementById(
  'global-theme-select'
) as HTMLSelectElement | null;

if (globalThemeSelect) {
  globalThemeSelect.value = globalThemeMode;
}

function applyGlobalThemePreference(pref: ThemeModePreference): void {
  globalThemeMode = pref;
  saveThemePreference(pref);

  const effectiveMode = resolveEffectiveThemeMode(pref);
  document.documentElement.dataset.theme = effectiveMode;

  if (globalThemeSelect && globalThemeSelect.value !== pref) {
    globalThemeSelect.value = pref;
  }

  // Update all stored chart configs to reflect the new themeMode
  chartConfigState.forEach((cfg) => {
    cfg.themeMode = pref;
    if (cfg.theme) {
      delete cfg.theme.background;
      delete cfg.theme.textColor;
      delete cfg.theme.axisColor;
      delete cfg.theme.gridColor;
    }
  });

  // Update active view
  if (activeDetailChart && activeDetailEntry) {
    renderChartDetailPage(
      document.getElementById('app-root')!,
      activeDetailEntry
    );
  } else {
    activeOverviewCharts.forEach((chart) => {
      chart.setConfig({
        ...chart.config,
        themeMode: pref,
        view: chart.config.view
          ? { ...chart.config.view, showControls: false }
          : undefined
      });
    });
  }
}

globalThemeSelect?.addEventListener('change', (e) => {
  const pref = (e.target as HTMLSelectElement).value as ThemeModePreference;
  applyGlobalThemePreference(pref);
});

// Listen for OS color-scheme changes so 'system' mode updates live
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (globalThemeMode === 'system') {
        applyGlobalThemePreference('system');
      }
    });
}

// Initial route render
handleRoute();
