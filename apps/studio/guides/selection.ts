import { CHART_CATALOG, type ChartCatalogEntry } from '../catalog';
import { getGlobalPalette } from '../state/theme';
import { SAMPLE_BAR_DATA } from '../sample-data';
import type {
  MCBaseChart,
  SelectedChartItem,
  SelectionChangeDetail,
  SelectionMode,
  ThemeModePreference
} from '../../../src/index';
import { createFeatureGuideBootstrap } from './bootstrapping';

function formatSelectedItemLine(item: SelectedChartItem): string {
  if (item.chartType === 'heatmap') {
    return `${item.id} → row="${item.row}", column="${item.column}", value=${item.value}`;
  }
  const parts = [`id="${item.id}"`, `label="${item.label}"`];
  if (item.seriesId) parts.push(`seriesId="${item.seriesId}"`);
  if (item.category) parts.push(`category="${item.category}"`);
  if (item.value !== undefined) parts.push(`value=${item.value}`);
  return parts.join(', ');
}

export function renderSelectionGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];
  const bootstrap = createFeatureGuideBootstrap({
    selection: true,
    zoom: false,
    csvExport: false
  });

  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Interactive Item Selection Across All 10 Chart Types</h2>
    <p class="guide-prose">
      Every chart component supports opt-in item selection in <strong>single-select</strong> (<code>'single'</code>)
      and <strong>multi-select</strong> (<code>'multiple'</code>) modes via pointer click, keyboard
      (<kbd>Tab</kbd> / Arrow keys + <kbd>Enter</kbd> or <kbd>Space</kbd>, <kbd>Esc</kbd> to clear), or programmatic APIs.
      To keep standalone chart bundles minimal, item selection defaults to <code>false</code> at bootstrap and is enabled via
      <code>registerModernCharts({ features: { selection: true } })</code> or per-chart
      <code>registerBarChart({ features: { selection: true } })</code> (see the
      <a href="#/guide/bootstrapping">🚀 Feature Bootstrapping &amp; Lazy Loading guide</a>).
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
            <td><strong>Selection Config &amp; Attributes</strong></td>
            <td><code>config.selection</code>, <code>selectable</code>, <code>selection-mode</code></td>
            <td>Opt in with <code>selection: { enabled: true, mode: 'single' | 'multiple', selectedIds }</code> or HTML attributes <code>selectable</code> and <code>selection-mode="multiple"</code>.</td>
          </tr>
          <tr>
            <td><strong>Selected Items &amp; IDs</strong></td>
            <td><code>chart.selectedItems</code>, <code>chart.selectedIds</code>, <code>chart.isItemSelected(id)</code></td>
            <td>Reads the selected items with identity and data (including <code>row</code>, <code>column</code>, and <code>value</code> for Heatmap cells).</td>
          </tr>
          <tr>
            <td><strong>Programmatic Selection</strong></td>
            <td><code>chart.selectItem(id)</code>, <code>chart.deselectItem(id)</code>, <code>chart.toggleItemSelection(id)</code>, <code>chart.setSelectedIds(ids)</code>, <code>chart.clearSelection()</code></td>
            <td>Selects, deselects, toggles, replaces, or clears the active selection and updates <code>aria-selected</code> and visual highlighting.</td>
          </tr>
          <tr>
            <td><strong>Selection Change Event</strong></td>
            <td><code>mc-selection-change</code>, <code>selection.onChange</code></td>
            <td>Composed event emitting <code>{ selectedItems, selectedIds, item, action, mode, chartType, source }</code> on pointer, keyboard, or API changes.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // ============================================================================
  // Example 1: Single-Select vs. Multi-Select & Clear Selection
  // ============================================================================
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.id = 'sel-modes-demo';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Single-Select vs. Multi-Select &amp; Keyboard / Pointer Selection</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Click bars or focus them with <kbd>Tab</kbd> and press <kbd>Enter</kbd> / <kbd>Space</kbd> to toggle selection. Switch between single-select and multi-select or clear the selection.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Selection mode controls">
        <button type="button" id="sel-btn-single-1" data-sel-mode="single" aria-pressed="false">Single-Select</button>
        <button type="button" id="sel-btn-multiple-1" data-sel-mode="multiple" aria-pressed="true" class="btn-primary">Multi-Select</button>
        <button type="button" id="sel-btn-preset-1">Select Q1 &amp; Q3 Cloud</button>
        <button type="button" id="sel-btn-clear-1">Clear Selection</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="sel-chart-1"></div>
      <div id="sel-editor-1"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Selected Items &amp; <code>mc-selection-change</code> Inspector</div>
      <div class="inspector-readout" id="sel-readout-1" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre-wrap;font-family:var(--font-mono, monospace);"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#sel-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const readout1 = ex1.querySelector<HTMLElement>('#sel-readout-1')!;
  const btnSingle1 = ex1.querySelector<HTMLButtonElement>('#sel-btn-single-1')!;
  const btnMultiple1 = ex1.querySelector<HTMLButtonElement>('#sel-btn-multiple-1')!;
  const btnPreset1 = ex1.querySelector<HTMLButtonElement>('#sel-btn-preset-1')!;
  const btnClear1 = ex1.querySelector<HTMLButtonElement>('#sel-btn-clear-1')!;

  const buildEx1Config = (
    mode: SelectionMode = 'multiple',
    selectedIds: string[] = ['Cloud-Q1', 'Edge-Q2']
  ): Record<string, any> => ({
    title: 'Quarterly Spend ($K)',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'OnPrem'],
    selection: {
      enabled: true,
      mode,
      selectedIds
    },
    data: structuredClone(SAMPLE_BAR_DATA)
  });

  const syncEx1Readout = (lastEvent?: SelectionChangeDetail) => {
    const enabled = bar1.isFeatureEnabled('selection') && bar1.selectable;
    const mode = bar1.selectionMode;
    btnSingle1.setAttribute('aria-pressed', String(mode === 'single'));
    btnSingle1.classList.toggle('btn-primary', mode === 'single');
    btnMultiple1.setAttribute('aria-pressed', String(mode === 'multiple'));
    btnMultiple1.classList.toggle('btn-primary', mode === 'multiple');
    btnPreset1.disabled = !enabled;
    btnClear1.disabled = !enabled || bar1.selectedIds.length === 0;

    if (!enabled) {
      readout1.textContent = 'Item selection disabled (enable features.selection and selection.enabled).';
      return;
    }
    const items = bar1.selectedItems;
    const header = lastEvent
      ? `mc-selection-change (${lastEvent.action} via ${lastEvent.source}) · mode: ${mode} · selected (${items.length}): [${bar1.selectedIds.join(', ')}]`
      : `mode: ${mode} · selected (${items.length}): [${bar1.selectedIds.join(', ')}]`;
    const lines = items.map((item) => `  • ${formatSelectedItemLine(item)}`);
    readout1.textContent = lines.length > 0 ? `${header}\n${lines.join('\n')}` : `${header}\n  (no items selected)`;
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

  const initialCfg1 = buildEx1Config('multiple', ['Cloud-Q1', 'Edge-Q2']);
  applyEx1Config(initialCfg1);

  const editor1 = bootstrap.createEditor({
    title: 'Bootstrap and Configure Item Selection',
    initialConfig: initialCfg1,
    chartId: () => 'bar',
    usage: `chart.addEventListener('mc-selection-change', (event) => {
  console.log(event.detail.selectedIds, event.detail.selectedItems);
});`,
    hint: 'Edit features.selection or selection.mode / selection.selectedIds in chart.config.',
    onConfigChange: (nextCfg) => {
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      const fresh = buildEx1Config('multiple', ['Cloud-Q1', 'Edge-Q2']);
      applyEx1Config(fresh);
      editor1.syncConfig(fresh);
    }
  });
  ex1.querySelector('#sel-editor-1')!.appendChild(editor1.element);

  bar1.addEventListener('mc-selection-change', (e: Event) => {
    const detail = (e as CustomEvent<SelectionChangeDetail>).detail;
    syncEx1Readout(detail);
  });

  const setEx1Mode = (mode: SelectionMode) => {
    const nextCfg = buildEx1Config(mode, [...bar1.selectedIds]);
    applyEx1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  };

  btnSingle1.addEventListener('click', () => setEx1Mode('single'));
  btnMultiple1.addEventListener('click', () => setEx1Mode('multiple'));
  btnPreset1.addEventListener('click', () => {
    bar1.setSelectedIds(['Cloud-Q1', 'Cloud-Q3']);
  });
  btnClear1.addEventListener('click', () => {
    bar1.clearSelection();
  });

  // ============================================================================
  // Example 2: Selection Across All 10 Chart Types (including Heatmap Cells)
  // ============================================================================
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.id = 'sel-all-charts';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Item Selection Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch across all 10 chart types to test pointer and keyboard selection. Heatmap selection includes each cell’s <code>row</code>, <code>column</code>, and <code>value</code>.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Chart type selection switcher" id="sel-type-buttons"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="sel-chart-2"></div>
      <div id="sel-editor-2"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div class="inspector-title" id="sel-status-2">Active Chart Selection</div>
        <div class="guide-controls-row">
          <button type="button" id="sel-btn-select-first-2">Select First Item</button>
          <button type="button" id="sel-btn-clear-2">Clear Selection</button>
        </div>
      </div>
      <div class="inspector-readout" id="sel-readout-2" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre-wrap;font-family:var(--font-mono, monospace);margin-top:6px;"></div>
    </div>
  `;
  container.appendChild(ex2);

  const stage2 = ex2.querySelector<HTMLElement>('#sel-chart-2')!;
  const typeBtnsWrap2 = ex2.querySelector<HTMLElement>('#sel-type-buttons')!;
  const status2 = ex2.querySelector<HTMLElement>('#sel-status-2')!;
  const readout2 = ex2.querySelector<HTMLElement>('#sel-readout-2')!;
  const btnSelectFirst2 = ex2.querySelector<HTMLButtonElement>('#sel-btn-select-first-2')!;
  const btnClear2 = ex2.querySelector<HTMLButtonElement>('#sel-btn-clear-2')!;

  let activeEntry2: ChartCatalogEntry =
    CHART_CATALOG.find((e) => e.id === 'heatmap') ?? CHART_CATALOG[0];
  let activeChart2: MCBaseChart<any> = document.createElement(
    activeEntry2.tagName
  ) as MCBaseChart<any>;
  stage2.appendChild(activeChart2);
  mounted.push(activeChart2);

  const buildEx2Config = (entry: ChartCatalogEntry): Record<string, any> => ({
    ...entry.createDefaultConfig(themeMode),
    selection: {
      enabled: true,
      mode: 'multiple'
    }
  });

  const syncEx2Readout = (lastEvent?: SelectionChangeDetail) => {
    const enabled =
      activeChart2.isFeatureEnabled('selection') && activeChart2.selectable;
    btnSelectFirst2.disabled = !enabled;
    btnClear2.disabled = !enabled || activeChart2.selectedIds.length === 0;
    if (!enabled) {
      status2.textContent = `${activeEntry2.title} · selection disabled`;
      readout2.textContent = '';
      return;
    }
    const items = activeChart2.selectedItems;
    status2.textContent = `${activeEntry2.title} (<${activeEntry2.tagName}>) · mode: ${activeChart2.selectionMode} · ${items.length} selected`;
    if (items.length === 0) {
      readout2.textContent = lastEvent
        ? `Last action: ${lastEvent.action} (${lastEvent.source}) · No items currently selected.`
        : 'Click or Tab-focus + Enter/Space any chart item to inspect its selection payload.';
      return;
    }
    readout2.textContent = items
      .map((item) => formatSelectedItemLine(item))
      .join('\n');
  };

  const wireEx2Chart = (chart: MCBaseChart<any>) => {
    chart.addEventListener('mc-selection-change', (e: Event) => {
      syncEx2Readout((e as CustomEvent<SelectionChangeDetail>).detail);
    });
  };
  wireEx2Chart(activeChart2);

  const updateEx2Chart = (
    entry: ChartCatalogEntry,
    cfg: Record<string, any>
  ) => {
    if (activeChart2.tagName.toLowerCase() !== entry.tagName) {
      const replacement = document.createElement(
        entry.tagName
      ) as MCBaseChart<any>;
      stage2.replaceChildren(replacement);
      const pos = mounted.indexOf(activeChart2);
      if (pos >= 0) mounted[pos] = replacement;
      else mounted.push(replacement);
      activeChart2 = replacement;
      wireEx2Chart(activeChart2);
    }
    activeChart2.setConfig({
      ...cfg,
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false
    });
    const firstSelectable =
      activeChart2.shadowRoot?.querySelector<SVGElement>('[data-selection-id]');
    const firstId = firstSelectable?.getAttribute('data-selection-id');
    if (firstId && activeChart2.selectedIds.length === 0) {
      activeChart2.selectItem(firstId, { silent: true });
    }
    syncEx2Readout();
  };

  const editor2 = bootstrap.createEditor({
    title: 'Bootstrap and Inspect Selected Items',
    initialConfig: buildEx2Config(activeEntry2),
    chartId: () => activeEntry2.id,
    usage: `chart.addEventListener('mc-selection-change', ({ detail }) => {
  console.log(detail.chartType, detail.selectedItems);
});`,
    hint: 'Switch chart types or edit selection.mode in chart.config to test single vs. multi-select.',
    onConfigChange: (nextCfg) => {
      updateEx2Chart(activeEntry2, nextCfg);
    },
    onReset: () => {
      const fresh = buildEx2Config(activeEntry2);
      updateEx2Chart(activeEntry2, fresh);
      editor2.syncConfig(fresh);
    }
  });
  ex2.querySelector('#sel-editor-2')!.appendChild(editor2.element);

  for (const entry of CHART_CATALOG) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.selChartType = entry.id;
    btn.textContent = entry.title.replace(' Chart', '');
    const isSelected = entry.id === activeEntry2.id;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.classList.toggle('btn-primary', isSelected);
    btn.addEventListener('click', () => {
      activeEntry2 = entry;
      for (const b of typeBtnsWrap2.querySelectorAll<HTMLButtonElement>(
        'button[data-sel-chart-type]'
      )) {
        const match = b.dataset.selChartType === entry.id;
        b.setAttribute('aria-pressed', String(match));
        b.classList.toggle('btn-primary', match);
      }
      const nextCfg = buildEx2Config(entry);
      updateEx2Chart(entry, nextCfg);
      editor2.syncConfig(nextCfg);
    });
    typeBtnsWrap2.appendChild(btn);
  }

  updateEx2Chart(activeEntry2, buildEx2Config(activeEntry2));

  btnSelectFirst2.addEventListener('click', () => {
    const firstEl =
      activeChart2.shadowRoot?.querySelector<SVGElement>('[data-selection-id]');
    const firstId = firstEl?.getAttribute('data-selection-id');
    if (firstId) {
      activeChart2.selectItem(firstId);
    }
  });

  btnClear2.addEventListener('click', () => {
    activeChart2.clearSelection();
  });

  bootstrap.onFeaturesChanged(() => {
    syncEx1Readout();
    syncEx2Readout();
  });

  return mounted;
}
