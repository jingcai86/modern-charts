import type { ChartConfig } from '../../../../src/index';
import type { ChartAttributeSpec, ChartCatalogEntry } from '../../catalog';
import { escapeHtml } from '../../utils/html';
import { getGlobalThemeMode } from '../../state/theme';
import {
  renderSectionInfoTooltip,
  wireSectionInfoTooltips
} from './section-info';
import {
  applyHtmlAttributeToConfig,
  extractChartConfigBlock,
  extractTagAttributes,
  generateWebComponentHtmlSnippet,
  parseConfigObjectLiteral,
  restoreSerializedFunctions
} from '../../utils/code-sync';

export interface CodeEditorPanelHandle {
  element: HTMLElement;
  syncFromConfig: (config: ChartConfig<any>) => void;
}

/**
 * Renders the bottom live two-way Web Component HTML Markup & `chart.config` editor,
 * including Randomize Data, Copy AI Context, and Reset Default buttons.
 */
export function createCodeEditorPanel(opts: {
  entry: ChartCatalogEntry;
  config: ChartConfig<any>;
  allAttributes: ChartAttributeSpec[];
  onMarkupEdited: (nextConfig: ChartConfig<any>) => void;
  onRandomizeData: () => void;
  onResetDefault: () => void;
}): CodeEditorPanelHandle {
  const {
    entry,
    config,
    allAttributes,
    onMarkupEdited,
    onRandomizeData,
    onResetDefault
  } = opts;

  const editorCard = document.createElement('section');
  editorCard.className = 'panel-card';
  editorCard.innerHTML = `
    <div class="panel-header">
      <div class="panel-title-group">
        <h2 class="panel-title">Web Component HTML Markup</h2>
        ${renderSectionInfoTooltip(
          `detail-markup-info-${entry.id}`,
          'More about Web Component HTML Markup',
          `Live-editable Web Component HTML markup. Edit attributes on <code>&lt;${escapeHtml(entry.tagName)}&gt;</code> or any field (including <code>data</code>) inside <code>chart.config</code> — changes reflect on the live chart immediately.`
        )}
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

    <p style="margin:0;font-size:0.8rem;color:#f87171;" id="editor-helper-desc" hidden></p>

    <textarea
      id="detail-html-preview"
      class="config-editor-textarea"
      spellcheck="false"
      aria-label="Live editable Web Component HTML markup"
    ></textarea>
  `;

  const htmlPreviewBox = editorCard.querySelector(
    '#detail-html-preview'
  ) as HTMLTextAreaElement;
  const editorHelperDesc = editorCard.querySelector(
    '#editor-helper-desc'
  ) as HTMLElement;
  let lastSyncedTagAttrs: Record<string, string> = {};

  const syncFromConfig = (nextCfg: ChartConfig<any>): void => {
    const nextSnippet = generateWebComponentHtmlSnippet(
      entry,
      nextCfg,
      getGlobalThemeMode()
    );
    htmlPreviewBox.value = nextSnippet;
    lastSyncedTagAttrs = extractTagAttributes(nextSnippet, entry.tagName);
    editorHelperDesc.textContent = '';
    editorHelperDesc.hidden = true;
  };

  syncFromConfig(config);

  htmlPreviewBox.addEventListener('input', () => {
    const rawMarkup = htmlPreviewBox.value;
    const configBlock = extractChartConfigBlock(rawMarkup);
    const currentTagAttrs = extractTagAttributes(rawMarkup, entry.tagName);

    let nextCfg: ChartConfig<any> = { ...config };

    if (configBlock !== null) {
      try {
        const parsedRaw = parseConfigObjectLiteral(configBlock);
        if (parsedRaw && typeof parsedRaw === 'object' && !Array.isArray(parsedRaw)) {
          nextCfg = restoreSerializedFunctions(parsedRaw, config);
          editorHelperDesc.textContent = '';
          editorHelperDesc.hidden = true;
        }
      } catch (err: any) {
        editorHelperDesc.textContent = `Waiting for valid chart.config: ${
          err?.message ?? 'Syntax error'
        }`;
        editorHelperDesc.hidden = false;
        return;
      }
    }

    for (const [attrName, attrVal] of Object.entries(currentTagAttrs)) {
      if (attrName === 'id') continue;
      if (lastSyncedTagAttrs[attrName] !== attrVal) {
        applyHtmlAttributeToConfig(nextCfg, attrName, attrVal, allAttributes);
      }
    }
    lastSyncedTagAttrs = currentTagAttrs;
    onMarkupEdited(nextCfg);
  });

  editorCard
    .querySelector('#btn-editor-randomize-data')
    ?.addEventListener('click', onRandomizeData);

  editorCard
    .querySelector('#btn-reset-config')
    ?.addEventListener('click', onResetDefault);

  const copyAiContextBtn = editorCard.querySelector(
    '#btn-copy-ai-context'
  ) as HTMLButtonElement | null;
  copyAiContextBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch(`./charts/${entry.id}.md`);
      const text = res.ok
        ? await res.text()
        : `# <${entry.tagName}>\n\nSubpath: modern-charts/${entry.id}\nDefault Layers: ${JSON.stringify(
            entry.defaultLayers
          )}`;
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

  wireSectionInfoTooltips(editorCard);

  return {
    element: editorCard,
    syncFromConfig
  };
}
