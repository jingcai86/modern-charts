import type { ChartConfig, MCBaseChart } from '../../../../src/index';
import {
  getAllAttributesForChart,
  type ChartCatalogEntry
} from '../../catalog';
import { escapeHtml } from '../../guides/shared';
import { generateRandomDataForChart } from '../../sample-data';
import {
  getChartVirtualState,
  getOrInitChartConfig,
  resetChartConfig,
  setStoredChartConfig
} from '../../state/config-store';
import { createAttributePanel } from './attribute-panel';
import { createCodeEditorPanel } from './code-editor';

/**
 * Renders the Dedicated Chart Playground View (`#/chart/:id`), coordinating:
 * 1. Live chart stage, layer toggle chips, and AI progressive layer streamer
 * 2. Collapsible right-hand Attribute & Config Control Panel
 * 3. Bottom row: two-way Web Component HTML & chart.config Editor (left) + Live Unified Event Inspector (right)
 */
export function renderChartDetailPage(
  root: HTMLElement,
  entry: ChartCatalogEntry
): MCBaseChart<any> {
  root.innerHTML = '';

  const config = getOrInitChartConfig(entry);
  const vState = getChartVirtualState(entry.id);
  const allAttributes = getAllAttributesForChart(entry);

  const studioGrid = document.createElement('section');
  studioGrid.className = 'detail-studio-grid';

  // Left Card: Live Chart Stage
  const chartCard = document.createElement('div');
  chartCard.className = 'panel-card';
  chartCard.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">
          <span>${escapeHtml(entry.title)}</span>
          <span class="comp-pill">&lt;${escapeHtml(entry.tagName)}&gt;</span>
        </h2>
        <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">
          ${escapeHtml(entry.summary)}
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
  `;

  // Mount live chart element
  const stage = chartCard.querySelector('#detail-chart-stage') as HTMLElement;
  const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
  stage.appendChild(chartEl);
  chartEl.setConfig(config);

  // Bottom-Right Card: Live Unified Event Inspector (beside Web Component HTML Markup)
  const inspectorCard = document.createElement('section');
  inspectorCard.className = 'panel-card event-inspector-card';
  inspectorCard.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Live Unified Event Inspector</h2>
      <button type="button" id="btn-detail-clear-events">Clear</button>
    </div>
    <p class="event-inspector-desc">
      Click, hover, or Tab-focus anywhere on <code>&lt;${escapeHtml(entry.tagName)}&gt;</code> — items, axes, legends, titles, or empty canvas.
    </p>
    <div class="inspector-box">
      <div class="inspector-title">Latest Event</div>
      <div class="inspector-readout" id="detail-aria-readout">
        Click, hover, or Tab-focus any part of &lt;${escapeHtml(entry.tagName)}&gt; to inspect its unified event type, target, category, and data payload...
      </div>
    </div>
    <div class="event-inspector-log-wrap">
      <div class="inspector-title">Recent Event Stream</div>
      <div class="event-inspector-history" id="detail-event-history" role="log" aria-live="polite">
        <div class="event-inspector-empty">Waiting for chart interaction...</div>
      </div>
    </div>
  `;

  const ariaReadout = inspectorCard.querySelector(
    '#detail-aria-readout'
  ) as HTMLElement;
  const eventHistoryEl = inspectorCard.querySelector(
    '#detail-event-history'
  ) as HTMLElement;
  const clearEventsBtn = inspectorCard.querySelector(
    '#btn-detail-clear-events'
  ) as HTMLButtonElement;
  const defaultReadoutText = ariaReadout.textContent?.trim() ?? '';
  const eventLogLines: string[] = [];

  const recordInspectorEvent = (summary: string): void => {
    ariaReadout.textContent = summary;
    const ts = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    eventLogLines.unshift(`[${ts}] ${summary}`);
    if (eventLogLines.length > 20) eventLogLines.pop();
    const frag = document.createDocumentFragment();
    for (const line of eventLogLines) {
      const row = document.createElement('div');
      row.className = 'event-inspector-row';
      row.textContent = line;
      frag.appendChild(row);
    }
    eventHistoryEl.replaceChildren(frag);
  };

  clearEventsBtn.addEventListener('click', () => {
    lastClickSummary = '';
    eventLogLines.length = 0;
    ariaReadout.textContent = defaultReadoutText;
    const empty = document.createElement('div');
    empty.className = 'event-inspector-empty';
    empty.textContent = 'Log cleared. Interact with the chart to record events...';
    eventHistoryEl.replaceChildren(empty);
  });

  const formatEventSummary = (ev: {
    type: string;
    target: string;
    category: string;
    targetId?: string;
    data?: Record<string, any>;
  }): string => {
    const header = `${ev.type} → target="${ev.target}" (category="${ev.category}"${
      ev.targetId ? `, id="${ev.targetId}"` : ''
    })`;
    if (ev.data === undefined) {
      return `${header} | data: undefined (empty area)`;
    }
    const preview: Record<string, unknown> = {};
    for (const key of [
      'label',
      'key',
      'seriesId',
      'category',
      'axis',
      'part',
      'value',
      'index',
      'count',
      'percentage',
      'stackTotal',
      'text'
    ]) {
      if (ev.data[key] !== undefined) {
        preview[key] =
          typeof ev.data[key] === 'number' && !Number.isInteger(ev.data[key])
            ? Number(ev.data[key].toFixed(2))
            : ev.data[key];
      }
    }
    return `${header} | data: ${JSON.stringify(preview)}`;
  };

  let lastClickSummary = '';
  chartEl.on('click', (ev) => {
    lastClickSummary = formatEventSummary(ev);
    recordInspectorEvent(lastClickSummary);
  });
  chartEl.on('mouseenter', (ev) => {
    if (ev.target === 'canvas' && lastClickSummary) return;
    recordInspectorEvent(formatEventSummary(ev));
  });
  chartEl.on('focus', (ev) => {
    recordInspectorEvent(formatEventSummary(ev));
  });

  // Layer Toggle Chips
  const layerChipsContainer = chartCard.querySelector(
    '#detail-layer-chips'
  ) as HTMLElement;
  let activeLayerNames = [
    ...((config.layers as string[] | undefined) ?? entry.defaultLayers)
  ];

  function renderLayerChips(): void {
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

  // Right Card: Attribute Controls
  const attrPanel = createAttributePanel({
    entry,
    config,
    vState,
    allAttributes,
    onConfigChanged: () => applyConfigUpdate(config, 'controls')
  });

  // Bottom Card: Two-Way HTML & chart.config Code Editor
  const editorPanel = createCodeEditorPanel({
    entry,
    config,
    allAttributes,
    onMarkupEdited: (nextCfg) => {
      Object.keys(config).forEach((k) => delete (config as any)[k]);
      Object.assign(config, nextCfg);
      applyConfigUpdate(config, 'html-editor');
    },
    onRandomizeData: () => {
      config.data = generateRandomDataForChart(entry.id, config.data);
      applyConfigUpdate(config, 'randomize');
    },
    onResetDefault: () => {
      const fresh = resetChartConfig(entry);
      Object.keys(config).forEach((k) => delete (config as any)[k]);
      Object.assign(config, fresh);
      Object.assign(vState, getChartVirtualState(entry.id));
      applyConfigUpdate(config, 'reset');
    }
  });

  function applyConfigUpdate(
    nextCfg: ChartConfig<any>,
    source: 'controls' | 'html-editor' | 'randomize' | 'reset'
  ): void {
    setStoredChartConfig(entry.id, nextCfg);
    chartEl.setConfig(nextCfg);

    if (source !== 'html-editor') {
      editorPanel.syncFromConfig(nextCfg);
    }

    if (source !== 'controls') {
      attrPanel.syncAllControls();
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

  // Action Buttons: Stream AI Layers & Replay Animation
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
        editorPanel.syncFromConfig(config);
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

  const bottomGrid = document.createElement('section');
  bottomGrid.className = 'detail-bottom-grid';
  bottomGrid.appendChild(editorPanel.element);
  bottomGrid.appendChild(inspectorCard);

  studioGrid.appendChild(chartCard);
  studioGrid.appendChild(attrPanel.element);
  root.appendChild(studioGrid);
  root.appendChild(bottomGrid);

  return chartEl;
}
