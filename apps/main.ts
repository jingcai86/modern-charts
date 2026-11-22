import {
  registerModernCharts,
  MCBaseChart,
  resolveEffectiveThemeMode,
  type ChartConfig,
  type MarkerLabelPosition,
  type MarkerMatchScope,
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
import {
  GUIDES_CATALOG,
  renderGuidePage,
  type GuideId
} from './guides';

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
    __markerMatchScope: MarkerMatchScope;
    __markerMatchColor: string;
    __markerLabelPosition: MarkerLabelPosition;
    __markerLabelPadding: number;
    __markerLabelEdgePadding: number;
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
      __markerMatchScope: lineMarker?.matchScope ?? 'partial',
      __markerMatchColor: lineMarker?.matchStyle?.color ?? '#ef4444',
      __markerLabelPosition: lineMarker?.labelPosition ?? 'top-right',
      __markerLabelPadding: lineMarker?.labelPadding ?? 10,
      __markerLabelEdgePadding: lineMarker?.labelEdgePadding ?? 10,
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

function isUnsafePathKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

// Deep property access helpers for dotted config paths (e.g. 'yScale.max', 'view.zoomable')
function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => {
    if (acc == null || isUnsafePathKey(part) || !Object.prototype.hasOwnProperty.call(acc, part)) {
      return undefined;
    }
    return acc[part];
  }, obj);
}

function setByPath(obj: any, path: string, value: any): void {
  if (!obj || typeof obj !== 'object') return;
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    if (
      !Object.prototype.hasOwnProperty.call(cur, key) ||
      cur[key] == null ||
      typeof cur[key] !== 'object'
    ) {
      cur[key] = {};
    } else {
      cur[key] = { ...cur[key] };
    }
    cur = cur[key];
  }
  const lastKey = parts[parts.length - 1];
  if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') {
    return;
  }
  cur[lastKey] = value;
}

function buildMarkersForVirtualState(
  entry: ChartCatalogEntry,
  vState: {
    __markerEnabled: boolean;
    __markerThresholdValue: number;
    __markerCondition: 'below' | 'above' | 'between';
    __markerMatchScope: MarkerMatchScope;
    __markerMatchColor: string;
    __markerLabelPosition: MarkerLabelPosition;
    __markerLabelPadding: number;
    __markerLabelEdgePadding: number;
  }
) {
  if (!entry.supportsMarkers || !vState.__markerEnabled) {
    return [];
  }
  const val = Number(vState.__markerThresholdValue) || 130;
  const color = vState.__markerMatchColor || '#ef4444';
  const cond = vState.__markerCondition || 'below';
  const matchScope = vState.__markerMatchScope || 'partial';
  const labelPosition = vState.__markerLabelPosition || 'top-right';
  const labelPadding = Number(vState.__markerLabelPadding ?? 10);
  const labelEdgePadding = Number(vState.__markerLabelEdgePadding ?? 10);

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
      labelPosition,
      labelPadding,
      labelEdgePadding,
      icon: SVG_ICON_PRESETS.warn,
      stroke: color,
      strokeWidth: 2,
      strokeDasharray: '6 4',
      condition: cond,
      matchScope,
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

function restoreSerializedFunctions(parsed: any, prev: any): any {
  if (parsed === '[Function]' && typeof prev === 'function') {
    return prev;
  }
  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) =>
      restoreSerializedFunctions(item, Array.isArray(prev) ? prev[idx] : undefined)
    );
  }
  if (parsed && typeof parsed === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(parsed)) {
      if (isUnsafePathKey(key)) continue;
      const prevVal =
        prev && typeof prev === 'object' && Object.prototype.hasOwnProperty.call(prev, key)
          ? prev[key]
          : undefined;
      out[key] = restoreSerializedFunctions(parsed[key], prevVal);
    }
    return out;
  }
  return parsed;
}

function extractChartConfigJson(markup: string): string | null {
  const assignMatch = /\bchart\.config\s*=\s*\{/.exec(markup);
  if (!assignMatch) return null;
  const startIdx = assignMatch.index + assignMatch[0].length - 1;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < markup.length; i++) {
    const ch = markup[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return markup.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

function extractTagAttributes(markup: string, tagName: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const lower = markup.toLowerCase();
  const openToken = `<${tagName.toLowerCase()}`;
  let idx = lower.indexOf(openToken);
  while (idx !== -1) {
    const nextCh = lower[idx + openToken.length];
    if (!nextCh || /\s|>|\//.test(nextCh)) {
      break;
    }
    idx = lower.indexOf(openToken, idx + openToken.length);
  }
  if (idx === -1) return attrs;

  let i = idx + openToken.length;
  const len = markup.length;
  while (i < len) {
    while (i < len && /\s/.test(markup[i])) i++;
    if (i >= len || markup[i] === '>' || markup[i] === '/') break;

    const nameStart = i;
    while (i < len && !/[\s=/>]/.test(markup[i])) i++;
    const name = markup.slice(nameStart, i).toLowerCase();
    if (!name) break;

    while (i < len && /\s/.test(markup[i])) i++;
    if (markup[i] !== '=') {
      if (!isUnsafePathKey(name)) attrs[name] = 'true';
      continue;
    }
    i++;
    while (i < len && /\s/.test(markup[i])) i++;

    let val = '';
    const quote = markup[i];
    if (quote === '"' || quote === "'") {
      i++;
      const valStart = i;
      while (i < len && markup[i] !== quote) i++;
      val = markup.slice(valStart, i);
      if (i < len) i++;
    } else {
      const valStart = i;
      while (i < len && !/[\s>]/.test(markup[i])) i++;
      val = markup.slice(valStart, i);
    }

    if (!isUnsafePathKey(name)) {
      attrs[name] = val;
    }
  }
  return attrs;
}

const STANDARD_HTML_ATTR_TO_CONFIG: Record<string, { path: string; type: 'boolean' | 'string' }> = {
  'auto-size': { path: 'autoSize', type: 'boolean' },
  'theme-mode': { path: 'themeMode', type: 'string' },
  palette: { path: 'palette', type: 'string' },
  'motion-config': { path: 'motionConfig', type: 'string' },
  'label-mode': { path: 'labelMode', type: 'string' },
  'aria-label': { path: 'ariaLabel', type: 'string' },
  'is-focusable': { path: 'isFocusable', type: 'boolean' }
};

function applyHtmlAttributeToConfig(
  targetConfig: ChartConfig<any>,
  attrName: string,
  rawVal: string,
  allAttributes: ChartAttributeSpec[]
): void {
  const std = STANDARD_HTML_ATTR_TO_CONFIG[attrName];
  if (std) {
    const coerced =
      std.type === 'boolean' ? rawVal !== 'false' && rawVal !== '0' : rawVal;
    setByPath(targetConfig, std.path, coerced);
    return;
  }

  const spec = allAttributes.find(
    (s) => s.attrName && s.attrName.toLowerCase() === attrName
  );
  if (!spec || spec.configPath.startsWith('__')) return;

  if (spec.control === 'boolean') {
    setByPath(targetConfig, spec.configPath, rawVal !== 'false' && rawVal !== '0');
  } else if (spec.control === 'number' || spec.control === 'range') {
    const trimmed = rawVal.trim();
    if (trimmed === '' || trimmed === 'auto') {
      setByPath(targetConfig, spec.configPath, 'auto');
    } else {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) setByPath(targetConfig, spec.configPath, n);
    }
  } else {
    setByPath(targetConfig, spec.configPath, rawVal);
  }
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

  // Two-Column Studio Grid:
  //    Left: Live Interactive Chart Stage + Layer Toggles + AI Streamer + ARIA Inspector
  //    Right: All Customizable Attributes & Config Properties
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
        <button type="button" id="btn-detail-ai-stream" class="btn-primary">
          ▶ Stream AI Layers
        </button>
        <button type="button" id="btn-detail-replay-anim">
          ↻ Replay Animation
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

  // Right Card: All Customizable Attributes & Config Properties (Nivo-style minimizable accordion sections)
  const allAttributes = getAllAttributesForChart(entry);
  const categories = Array.from(new Set(allAttributes.map((a) => a.category)));

  const attributesSection = document.createElement('div');
  attributesSection.className = 'panel-card attributes-panel-card';
  attributesSection.innerHTML = `
    <div class="attributes-section-header">
      <div>
        <h2 class="panel-title">
          All Customizable Attributes &amp; Config Properties (${allAttributes.length})
        </h2>
        <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">
          Click any category header to expand or minimize it. Change any control below to see it reflect on the live chart and in <code>chart.config</code> immediately.
        </p>
      </div>
      <div class="attributes-filter-bar">
        <button type="button" id="btn-expand-all-attrs">Expand All</button>
        <button type="button" id="btn-collapse-all-attrs">Minimize All</button>
        <input
          type="text"
          id="attr-search-input"
          class="attr-search-input"
          placeholder="Filter attributes..."
          aria-label="Filter attributes"
        />
      </div>
    </div>
    <div class="attributes-accordion-list" id="attributes-categories-grid"></div>
  `;

  studioGrid.appendChild(chartCard);
  studioGrid.appendChild(attributesSection);
  root.appendChild(studioGrid);

  // Bottom Full-Width Card: Web Component HTML Markup
  const editorCard = document.createElement('section');
  editorCard.className = 'panel-card';
  editorCard.innerHTML = `
    <div class="panel-header">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <h2 class="panel-title">Web Component HTML Markup</h2>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <button type="button" id="btn-copy-ai-context" title="Copy LLM-ready chart context specification">
          🤖 Copy AI Context
        </button>
        <button type="button" id="btn-editor-randomize-data" class="btn-primary">
          🎲 Randomize Data
        </button>
        <button type="button" id="btn-reset-config">
          ↺ Reset Default
        </button>
      </div>
    </div>

    <p style="margin:0;font-size:0.8rem;color:var(--text-muted);" id="editor-helper-desc">
      Live-editable Web Component HTML markup. Edit attributes on <code>&lt;${entry.tagName}&gt;</code> or any field (including <code>data</code>) inside <code>chart.config</code> — changes reflect on the live chart immediately.
    </p>

    <textarea
      id="detail-html-preview"
      class="config-editor-textarea"
      spellcheck="false"
      aria-label="Live editable Web Component HTML markup"
    ></textarea>
  `;
  root.appendChild(editorCard);

  // Mount the live chart element
  const stage = chartCard.querySelector('#detail-chart-stage') as HTMLElement;
  const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
  stage.appendChild(chartEl);
  chartEl.setConfig(config);
  activeDetailChart = chartEl;

  const htmlPreviewBox = editorCard.querySelector(
    '#detail-html-preview'
  ) as HTMLTextAreaElement;
  const editorHelperDesc = editorCard.querySelector(
    '#editor-helper-desc'
  ) as HTMLElement;
  const defaultHelperHtml = editorHelperDesc.innerHTML;
  let lastSyncedTagAttrs: Record<string, string> = {};
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

  const handleRandomizeData = () => {
    config.data = generateRandomDataForChart(entry.id, config.data);
    applyConfigUpdate(config, 'randomize');
  };

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
        const streamedSnippet = generateWebComponentHtmlSnippet(entry, config);
        htmlPreviewBox.value = streamedSnippet;
        lastSyncedTagAttrs = extractTagAttributes(streamedSnippet, entry.tagName);
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

  categories.forEach((categoryName, catIdx) => {
    const specsInCat = allAttributes.filter((a) => a.category === categoryName);
    const catDetails = document.createElement('details');
    catDetails.className = 'attr-category-accordion';
    catDetails.dataset.category = categoryName;
    if (catIdx === 0) {
      catDetails.open = true;
    }

    const cleanCatTitle = categoryName.replace(/\s*\(<mc-[^>]+>\)/g, '');
    catDetails.innerHTML = `
      <summary class="attr-category-summary">
        <div class="attr-category-summary-left">
          <span class="attr-chevron" aria-hidden="true">▸</span>
          <span class="attr-category-name">${cleanCatTitle}</span>
        </div>
        <span class="comp-pill">${specsInCat.length}</span>
      </summary>
      <div class="attr-list"></div>
    `;

    const attrList = catDetails.querySelector('.attr-list') as HTMLElement;

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

    categoriesGrid.appendChild(catDetails);
  });

  // Expand All / Minimize All buttons
  attributesSection
    .querySelector('#btn-expand-all-attrs')
    ?.addEventListener('click', () => {
      categoriesGrid
        .querySelectorAll<HTMLDetailsElement>('.attr-category-accordion')
        .forEach((d) => {
          d.open = true;
        });
    });

  attributesSection
    .querySelector('#btn-collapse-all-attrs')
    ?.addEventListener('click', () => {
      categoriesGrid
        .querySelectorAll<HTMLDetailsElement>('.attr-category-accordion')
        .forEach((d) => {
          d.open = false;
        });
    });

  // Search filter for attributes
  const searchInput = attributesSection.querySelector(
    '#attr-search-input'
  ) as HTMLInputElement;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    const cards = categoriesGrid.querySelectorAll<HTMLDetailsElement>(
      '.attr-category-accordion'
    );
    cards.forEach((card, idx) => {
      const rows = card.querySelectorAll<HTMLElement>('.attr-row');
      let visibleInCard = 0;
      rows.forEach((r) => {
        const match = !q || (r.dataset.searchText ?? '').includes(q);
        r.style.display = match ? '' : 'none';
        if (match) visibleInCard++;
      });
      card.style.display = visibleInCard > 0 ? '' : 'none';
      if (q && visibleInCard > 0) {
        card.open = true;
      } else if (!q) {
        card.open = idx === 0;
      }
    });
  });

  // Central sync helper between Chart, HTML Markup Editor, and Attribute Controls
  function applyConfigUpdate(
    nextCfg: ChartConfig<any>,
    source: 'controls' | 'html-editor' | 'randomize' | 'reset'
  ) {
    chartConfigState.set(entry.id, nextCfg);
    chartEl.setConfig(nextCfg);

    if (source !== 'html-editor') {
      const nextSnippet = generateWebComponentHtmlSnippet(entry, nextCfg);
      htmlPreviewBox.value = nextSnippet;
      lastSyncedTagAttrs = extractTagAttributes(nextSnippet, entry.tagName);
      editorHelperDesc.innerHTML = defaultHelperHtml;
      editorHelperDesc.style.color = 'var(--text-muted)';
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
  const initialSnippet = generateWebComponentHtmlSnippet(entry, config);
  htmlPreviewBox.value = initialSnippet;
  lastSyncedTagAttrs = extractTagAttributes(initialSnippet, entry.tagName);

  // Live two-way sync when user edits Web Component HTML Markup or chart.config inside it
  htmlPreviewBox.addEventListener('input', () => {
    const rawMarkup = htmlPreviewBox.value;
    const jsonBlock = extractChartConfigJson(rawMarkup);
    const currentTagAttrs = extractTagAttributes(rawMarkup, entry.tagName);

    let nextCfg: ChartConfig<any> = { ...config };

    if (jsonBlock !== null) {
      try {
        const parsedRaw = JSON.parse(jsonBlock);
        if (parsedRaw && typeof parsedRaw === 'object') {
          nextCfg = restoreSerializedFunctions(parsedRaw, config);
          editorHelperDesc.innerHTML = defaultHelperHtml;
          editorHelperDesc.style.color = 'var(--text-muted)';
        }
      } catch (err: any) {
        editorHelperDesc.textContent = `Waiting for valid chart.config JSON: ${err?.message ?? 'Syntax error'}`;
        editorHelperDesc.style.color = '#f87171';
        return;
      }
    }

    // Apply any HTML tag attribute edits that changed compared to last synced snapshot
    for (const [attrName, attrVal] of Object.entries(currentTagAttrs)) {
      if (attrName === 'id') continue;
      if (lastSyncedTagAttrs[attrName] !== attrVal) {
        applyHtmlAttributeToConfig(nextCfg, attrName, attrVal, allAttributes);
      }
    }
    lastSyncedTagAttrs = currentTagAttrs;

    Object.keys(config).forEach((k) => delete (config as any)[k]);
    Object.assign(config, nextCfg);
    applyConfigUpdate(config, 'html-editor');
  });

  // Copy AI Context button (loads per-chart context spec from ./charts/<id>.md)
  const copyAiContextBtn = editorCard.querySelector(
    '#btn-copy-ai-context'
  ) as HTMLButtonElement | null;
  copyAiContextBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch(`./charts/${entry.id}.md`);
      const text = res.ok
        ? await res.text()
        : `# <${entry.tagName}>\n\nSubpath: modern-charts/${entry.id}\nDefault Layers: ${JSON.stringify(entry.defaultLayers)}`;
      await navigator.clipboard.writeText(text);
      const prev = copyAiContextBtn.textContent;
      copyAiContextBtn.textContent = '✓ Copied AI Context';
      setTimeout(() => {
        copyAiContextBtn.textContent = prev || '🤖 Copy AI Context';
      }, 1800);
    } catch {
      window.open(`./charts/${entry.id}.md`, '_blank', 'noopener,noreferrer');
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
// HASH ROUTER (#/, #/chart/:id, and #/guide/:id)
// ============================================================================
let activeGuideId: GuideId | null = null;

function syncTopNavActiveState(activeKey: string): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.navRoute === activeKey);
  });
}

function handleRoute(): void {
  const root = document.getElementById('app-root');
  if (!root) return;

  const hash = window.location.hash || '#/';

  const guideMatch = hash.match(/^#\/guides?(?:\/([a-z0-9-]+))?$/i);
  if (guideMatch) {
    const requested = (guideMatch[1] ?? 'custom-layers').toLowerCase() as GuideId;
    const found = GUIDES_CATALOG.find((g) => g.id === requested);
    const resolvedId: GuideId = found ? found.id : 'custom-layers';
    activeDetailChart = null;
    activeDetailEntry = null;
    activeOverviewCharts = [];
    activeGuideId = resolvedId;
    renderGuidePage(root, resolvedId, globalThemeMode);
    syncTopNavActiveState(`guide:${resolvedId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const match = hash.match(/^#\/chart\/([a-z0-9-]+)$/i);
  if (match) {
    const chartId = match[1].toLowerCase();
    const entry = CHART_CATALOG.find((c) => c.id === chartId);
    if (entry) {
      activeGuideId = null;
      renderChartDetailPage(root, entry);
      syncTopNavActiveState('overview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  activeDetailChart = null;
  activeDetailEntry = null;
  activeGuideId = null;
  renderOverviewPage(root);
  syncTopNavActiveState('overview');
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
  if (activeGuideId) {
    renderGuidePage(
      document.getElementById('app-root')!,
      activeGuideId,
      pref
    );
  } else if (activeDetailChart && activeDetailEntry) {
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
