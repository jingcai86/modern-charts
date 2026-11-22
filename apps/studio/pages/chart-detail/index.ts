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
 * 1. Live chart stage, layer toggle chips, AI progressive layer streamer, & ARIA readout
 * 2. Collapsible right-hand Attribute & Config Control Panel
 * 3. Bottom two-way Web Component HTML / JSON Markup Editor
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

    <div class="inspector-box">
      <div class="inspector-title">
        Live Item Readout (Hover or Tab + Arrow Keys on chart items):
      </div>
      <div class="inspector-readout" id="detail-aria-readout">
        Interact with any data element inside &lt;${entry.tagName}&gt; to inspect its aria-label, threshold state, and datum payload...
      </div>
    </div>
  `;

  // Mount live chart element
  const stage = chartCard.querySelector('#detail-chart-stage') as HTMLElement;
  const chartEl = document.createElement(entry.tagName) as MCBaseChart<any>;
  stage.appendChild(chartEl);
  chartEl.setConfig(config);

  const ariaReadout = chartCard.querySelector(
    '#detail-aria-readout'
  ) as HTMLElement;
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

  // Bottom Card: Two-Way HTML / JSON Code Editor
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

  studioGrid.appendChild(chartCard);
  studioGrid.appendChild(attrPanel.element);
  root.appendChild(studioGrid);
  root.appendChild(editorPanel.element);

  return chartEl;
}
