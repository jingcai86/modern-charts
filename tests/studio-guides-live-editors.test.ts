import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registerModernCharts } from '../src/index';
import {
  GUIDES_CATALOG,
  renderGuidePage,
  type GuideId
} from '../apps/studio/guides/index';
import {
  extractChartConfigBlock,
  formatConfigAsJsObject,
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';
import { createCodeEditorPanel } from '../apps/studio/pages/chart-detail/code-editor';
import { CHART_CATALOG } from '../apps/studio/catalog';

describe('Studio Live-Editable Guide Examples (Issue #62)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each(GUIDES_CATALOG)(
    'renders live client-editable editors (no LIVE JSON) with accessible controls for guide "$id"',
    (guide) => {
      const root = document.createElement('div');
      document.body.appendChild(root);

      const charts = renderGuidePage(root, guide.id as GuideId, 'dark');
      expect(charts.length, `guide "${guide.id}" should mount charts`).toBeGreaterThan(0);

      const editors = Array.from(
        root.querySelectorAll<HTMLTextAreaElement>('textarea.guide-code-editor')
      );
      expect(
        editors.length,
        `guide "${guide.id}" should render at least one live-editable textarea`
      ).toBeGreaterThan(0);

      for (const ta of editors) {
        expect(ta.getAttribute('aria-invalid')).toBe('false');
        expect(ta.hasAttribute('aria-describedby')).toBe(false);
        const wrap = ta.closest('.guide-code-wrap');
        expect(wrap).not.toBeNull();

        const badgeText = wrap!.querySelector('.guide-code-live-badge')?.textContent;
        expect(['LIVE CONFIG', 'LIVE CSS', 'LIVE HTML']).toContain(badgeText);
        expect(badgeText).not.toBe('LIVE JSON');

        const resetBtn = wrap!.querySelector('button.guide-reset-btn');
        const copyBtn = wrap!.querySelector('button.guide-copy-btn');
        const copyStatus = copyBtn?.nextElementSibling;
        expect(resetBtn).not.toBeNull();
        expect(copyBtn?.getAttribute('command')).toBe('--copy');
        expect(copyBtn?.getAttribute('commandfor')).toBe(ta.id);
        expect(copyStatus?.getAttribute('role')).toBe('status');
      }
    },
    15_000
  );

  it('shows and applies the active overflow settings in the Custom Labels guide', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [, chart] = renderGuidePage(root, 'custom-labels', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-label-code-2 textarea')!;
    const maxChars = root.querySelector<HTMLInputElement>('#lbl-maxchars-slider')!;
    const maxLines = root.querySelector<HTMLInputElement>('#lbl-maxlines-slider')!;
    const maxRotation = root.querySelector<HTMLInputElement>('#lbl-maxrot-slider')!;
    const tooltip = root.querySelector<HTMLInputElement>('#lbl-tooltip-toggle')!;
    const activate = (mode: string) =>
      root.querySelector<HTMLButtonElement>(`[data-ov-strat="${mode}"]`)!.click();
    const overflow = () => parseConfigObjectLiteral(editor.value).label.overflow;

    activate('wrap');
    for (const input of [maxChars, maxLines, maxRotation, tooltip]) {
      expect(input.closest('label')!.hidden).toBe(true);
    }
    expect(overflow()).toEqual({ strategy: 'wrap', maxWidth: 82 });

    activate('wrap-truncate');
    expect(maxLines.closest('label')!.hidden).toBe(false);
    expect(maxRotation.closest('label')!.hidden).toBe(true);
    maxLines.value = '3';
    maxLines.dispatchEvent(new Event('input'));
    expect(overflow()).toMatchObject({ strategy: 'wrap-truncate', maxLines: 3 });

    activate('rotate-wrap-truncate');
    expect(maxRotation.closest('label')!.hidden).toBe(false);
    expect(overflow()).toMatchObject({ strategy: 'rotate-wrap-truncate', maxLines: 3, maxRotation: -45 });
    const editedConfig = parseConfigObjectLiteral(editor.value);
    editedConfig.label.overflow.maxLines = 4;
    editor.value = formatConfigAssignment(editedConfig);
    editor.dispatchEvent(new Event('input'));
    expect(maxLines.value).toBe('4');
    expect(chart.config.label).toMatchObject({ overflow: { maxLines: 4 } });

    editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(overflow()).toEqual({ strategy: 'truncate', maxWidth: 82, enableTooltip: true });
  });

  it('updates mounted charts live on JS chart.config edits, surfaces accessible errors on invalid syntax, and resets cleanly', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const charts = renderGuidePage(root, 'accessibility', 'dark');
    const staticChart = charts[1];
    const editors = Array.from(
      root.querySelectorAll<HTMLTextAreaElement>('textarea.guide-code-editor')
    );
    const staticEditor = editors[1];

    expect(staticEditor.value.startsWith('chart.config = {')).toBe(true);

    // 1. Live edit JS config with unquoted keys, single quotes, comment, and trailing comma
    const parsed = parseConfigObjectLiteral(staticEditor.value);
    parsed.isInteractive = false;
    parsed.title = 'Client-Edited Static Title';
    staticEditor.value = `// Updated live config\n${formatConfigAssignment(parsed).replace(/\n\};$/, ',\n};')}`;
    staticEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(staticEditor.getAttribute('aria-invalid')).toBe('false');
    expect(staticChart.isInteractive).toBe(false);
    expect(staticChart.config.title).toBe('Client-Edited Static Title');

    // 2. Typing broken config flags aria-invalid + aria-describedby without crashing
    staticEditor.value = 'chart.config = { isInteractive: ';
    staticEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(staticEditor.getAttribute('aria-invalid')).toBe('true');
    const errId = staticEditor.getAttribute('aria-describedby');
    expect(errId).toBeTruthy();
    expect(document.getElementById(errId!)?.textContent).toContain('Waiting for valid chart.config');

    // 3. Clicking Reset restores default config and clears aria-invalid
    const resetBtn = staticEditor
      .closest('.guide-code-wrap')!
      .querySelector<HTMLButtonElement>('button.guide-reset-btn')!;
    resetBtn.click();

    expect(staticEditor.getAttribute('aria-invalid')).toBe('false');
    expect(staticEditor.hasAttribute('aria-describedby')).toBe(false);
    expect(staticChart.isInteractive).toBe(true);
  });

  it('updates declarative HTML examples (<mc-def> and slots) live while stripping unsafe tags/attributes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const charts = renderGuidePage(root, 'patterns', 'dark');
    const gaugeChart = charts[charts.length - 1];
    const editors = Array.from(
      root.querySelectorAll<HTMLTextAreaElement>('textarea.guide-code-editor')
    );
    const htmlEditor = editors[editors.length - 1];

    htmlEditor.value = `<mc-gauge-chart onclick="alert(1)">
      <script>window.__xss = true;</script>
      <mc-def def-id="live-stripes" type="lines" match="*" rotation="-45" spacing="6" onclick="evil()"></mc-def>
    </mc-gauge-chart>`;
    htmlEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(htmlEditor.getAttribute('aria-invalid')).toBe('false');
    expect(gaugeChart.querySelector('script')).toBeNull();
    const defEl = gaugeChart.querySelector('mc-def');
    expect(defEl).not.toBeNull();
    expect(defEl!.getAttribute('def-id')).toBe('live-stripes');
    expect(defEl!.getAttribute('type')).toBe('lines');
    expect(defEl!.hasAttribute('onclick')).toBe(false);
    expect(gaugeChart.shadowRoot?.querySelector('defs pattern')).not.toBeNull();
  });

  it('validates live CSS editors and preserves custom layer reordering in Custom Layers guide', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    renderGuidePage(root, 'tooltips', 'dark');
    const cssEditor = root.querySelector<HTMLTextAreaElement>(
      'textarea.guide-code-editor'
    )!;
    cssEditor.value = 'mc-bar-chart::part(tooltip) { border: 2px solid #10b981;';
    cssEditor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(cssEditor.getAttribute('aria-invalid')).toBe('true');

    cssEditor.value = 'mc-bar-chart::part(tooltip) { border: 2px solid #10b981; }';
    cssEditor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(cssEditor.getAttribute('aria-invalid')).toBe('false');

    // Reordering named custom layer in Custom Layers guide
    const layerCharts = renderGuidePage(root, 'custom-layers', 'dark');
    const lineChart = layerCharts[0];
    const layerEditor = root.querySelector<HTMLTextAreaElement>(
      'textarea.guide-code-editor'
    )!;
    const cfg = parseConfigObjectLiteral(layerEditor.value);
    const customObj = cfg.layers.find((l: any) => l?.name === 'peak-and-mean');
    expect(customObj).toBeTruthy();
    cfg.layers = ['grid', customObj, 'axes', 'lines', 'points', 'legends'];
    cfg.data[0].data[0].y = 110;
    layerEditor.value = formatConfigAssignment(cfg);
    layerEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(layerEditor.getAttribute('aria-invalid')).toBe('false');
    const customLayerG = lineChart.shadowRoot?.querySelector(
      '[data-layer-name="peak-and-mean"]'
    );
    expect(customLayerG).not.toBeNull();
    expect(customLayerG!.textContent).toContain('Peak: 110K (Mon)');
  });

  it.each([
    ['truncate', ['maxWidth', 'maxChars', 'ellipsis', 'enableTooltip']],
    ['rotate', ['maxWidth', 'maxChars', 'maxRotation', 'enableTooltip']],
    ['both', ['maxWidth', 'maxChars', 'maxRotation', 'ellipsis', 'enableTooltip']],
    ['wrap', ['maxWidth']],
    ['wrap-truncate', ['maxWidth', 'maxChars', 'maxLines', 'ellipsis', 'enableTooltip']],
    ['rotate-wrap-truncate', ['maxWidth', 'maxChars', 'maxLines', 'maxRotation', 'ellipsis', 'enableTooltip']],
    ['none', []]
  ] as const)('shows only controls used by the %s strategy in the truncation guide', (strategy, visible) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    renderGuidePage(root, 'truncation', 'dark');

    const button = root.querySelector<HTMLButtonElement>(`[data-trunc-strat="${strategy}"]`)!;
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const labels = root.querySelectorAll<HTMLLabelElement>('[data-trunc-control]');
    expect(Array.from(labels).filter(label => !label.hidden).map(label => label.dataset.truncControl))
      .toEqual(visible);

    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const { strategy: configured, ...overflow } = parseConfigObjectLiteral(editor.value).label.overflow;
    expect(configured).toBe(strategy);
    expect(Object.keys(overflow).sort()).toEqual(
      visible.filter(key => key !== 'maxChars').sort()
    );
  });

  it('keeps edited categories and overflow limits while switching wrapping modes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'truncation', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const config = parseConfigObjectLiteral(editor.value);
    const category = 'Long renamed department for the responsive chart';
    config.data[0].dept = category;
    config.label.overflow = {
      strategy: 'wrap-truncate',
      maxWidth: 48,
      maxChars: 30,
      maxLines: 2,
      ellipsis: '→',
      enableTooltip: false
    };
    editor.value = formatConfigAssignment(config);
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    const tick = () => chart.shadowRoot?.querySelector('[data-label-id="x-tick-0"]');
    const select = (strategy: string) => root.querySelector<HTMLButtonElement>(`[data-trunc-strat="${strategy}"]`)!.click();
    expect(tick()?.getAttribute('data-truncated')).toBe('true');
    expect(tick()?.textContent).toContain('→');

    select('wrap');
    expect(tick()?.getAttribute('data-truncated')).toBe('false');
    expect(tick()?.querySelectorAll('tspan').length).toBeGreaterThan(2);
    expect(tick()?.textContent).not.toContain('→');
    expect(parseConfigObjectLiteral(editor.value).data[0].dept).toBe(category);

    select('rotate-wrap-truncate');
    expect(tick()?.getAttribute('data-truncated')).toBe('true');
    expect(tick()?.getAttribute('data-applied-rotation')).toBe('-45');
    expect(parseConfigObjectLiteral(editor.value).label.overflow).toEqual({
      ...config.label.overflow,
      strategy: 'rotate-wrap-truncate',
      maxRotation: -45
    });

    editor.closest('.guide-code-wrap')?.querySelector<HTMLButtonElement>('button.guide-reset-btn')?.click();
    expect(parseConfigObjectLiteral(editor.value).data[0].dept).toBe('Global Cloud Platform Infrastructure');
  });

  it('parses JS config object literals safely and updates chart-detail code editor live', () => {
    const sample = `
      /* Leading comment */
      chart.config = {
        palette: 'material', // inline comment
        'custom-key': 'hello {world}',
        values: [1, -2.5, .5, 1e2,],
        nested: { enabled: true, empty: null, },
        __proto__: { polluted: true },
      };
    `;
    const parsed = parseConfigObjectLiteral(sample);
    expect(parsed.palette).toBe('material');
    expect(parsed['custom-key']).toBe('hello {world}');
    expect(parsed.values).toEqual([1, -2.5, 0.5, 100]);
    expect(parsed.nested).toEqual({ enabled: true, empty: null });
    expect(({} as any).polluted).toBeUndefined();

    const formatted = formatConfigAsJsObject({
      palette: 'shadcn',
      keys: ['A', 'B'],
      'kebab-key': "it's ok"
    });
    expect(formatted).toContain("palette: 'shadcn'");
    expect(formatted).toContain("keys: ['A', 'B']");
    expect(formatted).toContain("'kebab-key': 'it\\'s ok'");
    expect(parseConfigObjectLiteral(formatted)).toEqual({
      palette: 'shadcn',
      keys: ['A', 'B'],
      'kebab-key': "it's ok"
    });

    // Brace extraction handles single quotes and comments containing braces
    const htmlWithConfig = `<script>
      chart.config = {
        title: 'Revenue {Q1}', // keep } out of brace count
        palette: 'antd',
      };
    </script>`;
    const block = extractChartConfigBlock(htmlWithConfig);
    expect(block).not.toBeNull();
    expect(parseConfigObjectLiteral(block!)).toEqual({
      title: 'Revenue {Q1}',
      palette: 'antd'
    });

    // Chart detail code editor emits JS chart.config and accepts live JS edits
    const barEntry = CHART_CATALOG.find((c) => c.id === 'bar')!;
    let latestCfg = barEntry.createDefaultConfig('dark');
    const panel = createCodeEditorPanel({
      entry: barEntry,
      config: latestCfg,
      allAttributes: barEntry.specificAttributes,
      onMarkupEdited: (next) => {
        latestCfg = next;
      },
      onRandomizeData: () => {},
      onResetDefault: () => {}
    });
    const ta = panel.element.querySelector<HTMLTextAreaElement>('#detail-html-preview')!;
    expect(ta.value).toContain("palette: 'shadcn'");
    ta.value = ta.value.replace("palette: 'shadcn'", "palette: 'bootstrap', // live edit");
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    expect(latestCfg.palette).toBe('bootstrap');
  });
});
