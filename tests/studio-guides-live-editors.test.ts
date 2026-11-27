import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getChartFeatures, registerModernCharts } from '../src/index';
import {
  GUIDES_CATALOG,
  renderGuidePage,
  type GuideId
} from '../apps/studio/guides/index';
import {
  formatGuideConfigAssignment,
  parseGuideConfig
} from '../apps/studio/guides/callback-config';
import {
  extractChartConfigBlock,
  formatConfigAsJsObject,
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';
import { createCodeEditorPanel } from '../apps/studio/pages/chart-detail/code-editor';
import { CHART_CATALOG } from '../apps/studio/catalog';

function findRunCallbacksButton(editor: HTMLTextAreaElement): HTMLButtonElement | undefined {
  return [...editor.closest('.guide-code-wrap')!.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === 'Run callback edits');
}

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
        expect(ta.value).not.toContain('[Function]');
        expect(ta.getAttribute('aria-invalid')).toBe('false');
        expect(ta.hasAttribute('aria-describedby')).toBe(false);
        const wrap = ta.closest('.guide-code-wrap');
        expect(wrap).not.toBeNull();

        const badgeText = wrap!.querySelector('.guide-code-live-badge')?.textContent;
        expect(['LIVE CONFIG', 'LIVE CSS', 'LIVE HTML', 'LIVE JS']).toContain(badgeText);
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

  it('applies the commented overlay opt-out and keeps it in sync with the chart presets', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'chart-state', 'dark');
    const overlay = root.querySelector<HTMLInputElement>('#cs-overlay-enabled')!;
    const loading = root.querySelector<HTMLButtonElement>('[data-cs-mode="loading"]')!;
    const badge = root.querySelector('#cs-event-badge')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#cs-code-1 textarea')!;
    const commentedOptOut = /^([ \t]*)\/\/[ \t]*(chartState: false)/m;
    expect(root.querySelector('h1')?.textContent).toContain('Default is true');
    expect(overlay.checked).toBe(true);
    expect(editor.value).toContain("import { registerBarChart } from 'modern-charts/bar';");
    expect(editor.value).toMatch(commentedOptOut);
    expect(parseConfigObjectLiteral(extractChartConfigBlock(editor.value)!).keys).toEqual(['Cloud', 'Edge']);

    editor.value = editor.value.replace(commentedOptOut, '$1$2');
    editor.dispatchEvent(new Event('input'));
    expect(editor.getAttribute('aria-invalid')).toBe('false');
    expect(overlay.checked).toBe(false);
    loading.click();
    expect(editor.value).toMatch(/^[ \t]*chartState: false/m);
    expect(getChartFeatures().chartState).toBe(false);
    expect(chart.getStateElement()?.hidden).toBe(true);
    expect(badge.textContent).toContain('loading · aria-busy: true');

    overlay.click();
    await vi.waitFor(() => expect(chart.getStateElement()?.hidden).toBe(false));
    expect(getChartFeatures().chartState).toBe(true);
    expect(editor.value).toMatch(commentedOptOut);
  });

  it('applies the tooltip opt-out and drives the custom slot="tooltip" element for item and legend requests in the Tooltips guide', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'tooltips', 'dark');
    const bar5 = charts[4];
    const builtinToggle = root.querySelector<HTMLInputElement>('#tp-builtin-enabled')!;
    const badge = root.querySelector<HTMLElement>('#tp-slot-badge')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-tooltip-code-5 textarea')!;
    const customTooltip = bar5.querySelector<HTMLElement>('dashboard-tooltip[slot="tooltip"]')!;
    const commentedOptOut = /^([ \t]*)\/\/[ \t]*(tooltip: false)/m;

    expect(root.querySelector('h1')?.textContent).toContain('Default is true');
    expect(builtinToggle.checked).toBe(true);
    expect(customTooltip).not.toBeNull();
    expect(editor.value).toContain("import { registerBarChart } from 'modern-charts/bar';");
    expect(editor.value).toMatch(commentedOptOut);
    expect(bar5.getTooltipElement()).not.toBeNull();
    expect(bar5.getLegendTooltipElement()).not.toBeNull();

    // Uncomment tooltip: false in live editor -> disables and unmounts built-in <mc-tooltip> hosts
    editor.value = editor.value.replace(commentedOptOut, '$1$2');
    editor.dispatchEvent(new Event('input'));
    expect(editor.getAttribute('aria-invalid')).toBe('false');
    expect(builtinToggle.checked).toBe(false);
    expect(getChartFeatures().tooltip).toBe(false);
    expect(bar5.getTooltipElement()).toBeNull();
    expect(bar5.getLegendTooltipElement()).toBeNull();
    expect(bar5.shadowRoot?.querySelectorAll('mc-tooltip')).toHaveLength(0);
    expect(badge.textContent).toContain('built-in: disabled (0 hosts)');

    // Hover a bar -> custom slot="tooltip" receives target="item"
    const firstBar = bar5.shadowRoot!.querySelector<SVGRectElement>('.mc-bar-rect')!;
    firstBar.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 120, clientY: 140 }));
    expect(customTooltip.hidden).toBe(false);
    expect(customTooltip.dataset.target).toBe('item');
    expect(customTooltip.textContent).toContain('Item Tooltip');
    expect(customTooltip.textContent).toContain('Q1');
    expect(badge.textContent).toContain('target: item');
    firstBar.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(customTooltip.hidden).toBe(true);

    // Hover a legend item -> custom slot="tooltip" receives target="legend"
    const legendItem = bar5.shadowRoot!.querySelector<SVGGElement>('.mc-legend-item')!;
    legendItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 180, clientY: 300 }));
    expect(customTooltip.hidden).toBe(false);
    expect(customTooltip.dataset.target).toBe('legend');
    expect(customTooltip.textContent).toContain('Legend Tooltip');
    expect(customTooltip.textContent).toContain('Cloud');
    expect(badge.textContent).toContain('target: legend');
    legendItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(customTooltip.hidden).toBe(true);

    // Re-enable built-in tooltip via checkbox -> remounts hosts and restores commented opt-out
    builtinToggle.click();
    await vi.waitFor(() => expect(bar5.getTooltipElement()).not.toBeNull());
    expect(getChartFeatures().tooltip).toBe(true);
    expect(editor.value).toMatch(commentedOptOut);
  });

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
    expect(chart.config.label).toMatchObject([
      { target: 'axis-tick', overflow: { maxLines: 4 } },
      { target: 'data', overflow: { maxLines: 4 } }
    ]);

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
    const { config: cfg, hasPendingCallbacks } = parseGuideConfig(layerEditor.value, lineChart.config);
    expect(hasPendingCallbacks).toBe(false);
    const customObj = cfg.layers.find((l: any) => l?.name === 'peak-and-mean');
    expect(customObj).toBeTruthy();
    cfg.layers = ['grid', customObj, 'axes', 'lines', 'points', 'legends'];
    cfg.data[0].data[0].y = 110;
    layerEditor.value = formatGuideConfigAssignment(cfg);
    layerEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(layerEditor.getAttribute('aria-invalid')).toBe('false');
    expect(findRunCallbacksButton(layerEditor)).toBeUndefined();
    const customLayerG = lineChart.shadowRoot?.querySelector(
      '[data-layer-name="peak-and-mean"]'
    );
    expect(customLayerG).not.toBeNull();
    expect(customLayerG!.textContent).toContain('Peak: 110K (Mon)');
  });

  it('applies SVG renderer edits on request and restores the original renderer on reset', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'custom-layers', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-custom-layer-code-1 textarea')!;
    const bandFill = () => chart.shadowRoot
      ?.querySelector('[data-layer-name="peak-and-mean"] rect')
      ?.getAttribute('fill');

    expect(editor.value).toContain('document.createElementNS');
    expect(bandFill()).toBe('#6366f1');
    expect(findRunCallbacksButton(editor)).toBeUndefined();

    editor.value = editor.value.replace('#6366f1', '#abcdef');
    editor.dispatchEvent(new Event('input'));
    expect(bandFill()).toBe('#6366f1');
    findRunCallbacksButton(editor)!.click();
    await vi.waitFor(() => expect(bandFill()).toBe('#abcdef'));
    expect(findRunCallbacksButton(editor)).toBeUndefined();

    root.querySelector<HTMLButtonElement>('#btn-layer-pos-back')!.click();
    expect(bandFill()).toBe('#abcdef');
    const toggleLayer = root.querySelector<HTMLButtonElement>('#btn-layer-toggle')!;
    toggleLayer.click();
    expect(bandFill()).toBeUndefined();
    toggleLayer.click();
    expect(bandFill()).toBe('#abcdef');
    expect(editor.value).toContain('#abcdef');

    editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(bandFill()).toBe('#6366f1');
    expect(editor.value).toContain('#6366f1');
  });

  it('keeps an edited D3 renderer when updating its confidence band', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'd3', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-d3-code-1 textarea')!;
    const slider = root.querySelector<HTMLInputElement>('#d3-band-slider')!;
    const ribbon = () => chart.shadowRoot!.querySelector('[data-layer-name="d3-confidence-band"] path')!;
    const initialPath = ribbon().getAttribute('d');
    expect(initialPath).toBeTruthy();

    editor.value = editor.value.replace('#06b6d4', '#abcdef');
    editor.dispatchEvent(new Event('input'));
    expect(ribbon().getAttribute('fill')).toBe('#06b6d4');
    findRunCallbacksButton(editor)!.click();
    await vi.waitFor(() => expect(ribbon().getAttribute('fill')).toBe('#abcdef'));
    expect(ribbon().getAttribute('d')).toBe(initialPath);

    slider.value = '20';
    slider.dispatchEvent(new Event('input'));
    expect(editor.value).toContain('#abcdef');
    expect(ribbon().getAttribute('fill')).toBe('#abcdef');
    expect(ribbon().getAttribute('d')).not.toBe(initialPath);

    editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(ribbon().getAttribute('fill')).toBe('#06b6d4');
    expect(ribbon().getAttribute('d')).toBe(initialPath);
  });

  it('applies a JavaScript axis label formatter edit on request', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'custom-labels', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-label-code-1 textarea')!;
    const axisLabels = () => Array.from(
      chart.shadowRoot!.querySelectorAll('[data-label-id^="y-tick-"]'),
      (label) => label.textContent ?? ''
    );

    expect(editor.value).toContain('$${text}K');
    const originalLabels = axisLabels();
    expect(originalLabels.some(label => label.startsWith('$'))).toBe(true);

    editor.value = editor.value.replace('$${text}K', '€${text}K');
    editor.dispatchEvent(new Event('input'));
    expect(axisLabels()).toEqual(originalLabels);
    findRunCallbacksButton(editor)!.click();
    const editedLabels = originalLabels.map(label => label.replace(/^\$/, '€'));
    await vi.waitFor(() => expect(axisLabels()).toEqual(editedLabels));

    editor.value = editor.value.replace('€${text}K', '${window.document.title}');
    editor.dispatchEvent(new Event('input'));
    findRunCallbacksButton(editor)!.click();
    await vi.waitFor(() => expect(editor.getAttribute('aria-invalid')).toBe('true'));
    expect(axisLabels()).toEqual(editedLabels);
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
    const tooltipHint = root.querySelector<HTMLElement>('#tr-tooltip-hint')!;
    expect(tooltipHint.closest('.panel-header')).toBeNull();
    expect(tooltipHint.hidden).toBe(!visible.some((control) => control === 'enableTooltip'));
    const controls = root.querySelectorAll<HTMLElement>('[data-trunc-control]');
    expect(Array.from(controls).filter(control => !control.hidden).map(control => control.dataset.truncControl))
      .toEqual(visible);

    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const { strategy: configured, ...overflow } = parseConfigObjectLiteral(editor.value).label.overflow;
    expect(configured).toBe(strategy);
    expect(Object.keys(overflow).sort()).toEqual(
      visible.filter(key => key !== 'maxChars').sort()
    );
  });

  it('applies the truncation guide controls and full-text tooltips to the chosen label targets', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'truncation', 'dark');
    const select = root.querySelector<HTMLSelectElement>('#tr-target-select')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const tooltip = chart.getTooltipElement()!;
    const readConfig = () => parseConfigObjectLiteral(editor.value);
    const selectScope = (value: string) => {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    expect(Array.from(select.options, ({ value }) => value).sort()).toEqual(['axis-tick', 'both', 'data']);
    expect(select.value).toBe('axis-tick');
    root.querySelector<HTMLButtonElement>('[data-trunc-strat="rotate"]')!.click();

    for (const scope of ['axis-tick', 'data', 'both']) {
      selectScope(scope);
      const { data, label } = readConfig();
      if (scope === 'both') {
        expect(label.map((entry: { target: string }) => entry.target).sort()).toEqual(['axis-tick', 'data']);
      } else {
        expect(label.target).toBe(scope);
      }

      for (const [target, id, fullText] of [
        ['axis-tick', 'x-tick-0', data[0].dept],
        ['data', 'bar-label-0', data[0].itemLabel]
      ] as const) {
        const renderedLabel = chart.shadowRoot!.querySelector(`[data-label-id="${id}"]`)!;
        const selected = scope === 'both' || scope === target;
        expect(renderedLabel.getAttribute('data-applied-rotation')).toBe(selected ? '-45' : null);
        if (selected) {
          expect(renderedLabel.getAttribute('data-overflow-strategy')).toBe('rotate');
          expect(renderedLabel.getAttribute('data-full-text')).toBe(fullText);
          renderedLabel.dispatchEvent(new MouseEvent('mouseenter', { clientX: 50, clientY: 60 }));
          expect(tooltip.hidden).toBe(false);
          expect(tooltip.shadowRoot!.querySelector('[part="header"]')?.textContent).toBe(fullText);
          renderedLabel.dispatchEvent(new MouseEvent('mouseleave'));
          expect(tooltip.hidden).toBe(true);
        }
      }
    }

    root.querySelector<HTMLInputElement>('#tr-tip-toggle')!.click();
    for (const id of ['x-tick-0', 'bar-label-0']) {
      const renderedLabel = chart.shadowRoot!.querySelector(`[data-label-id="${id}"]`)!;
      expect(renderedLabel.classList.contains('mc-label--interactive')).toBe(false);
    }

    root.querySelector<HTMLButtonElement>('[data-trunc-strat="none"]')!.click();
    expect(select.closest('[hidden]')).toBeNull();
    expect(select.value).toBe('both');
    selectScope('data');
    expect(readConfig().label).toMatchObject({ target: 'data', overflow: { strategy: 'none' } });
  });

  it('syncs label targets edited in the truncation guide snippet and preserves those edits until reset', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'truncation', 'dark');
    const select = root.querySelector<HTMLSelectElement>('#tr-target-select')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const readConfig = () => parseConfigObjectLiteral(editor.value);
    const initial = readConfig();
    const itemLabel = 'A long custom caption inside the spending bar';
    const dept = 'A renamed category with a long axis caption';
    const data = [{ ...initial.data[0], itemLabel, dept }, ...initial.data.slice(1)];
    const overflow = { strategy: 'truncate', maxWidth: 60, maxChars: 9, ellipsis: '~', enableTooltip: false };
    const dataLabel = { target: 'data', formatter: '{{itemLabel}}', overflow };
    const axisLabel = { target: 'axis-tick', overflow };
    const edit = (label: typeof dataLabel | Array<typeof dataLabel | typeof axisLabel>) => {
      editor.value = formatConfigAssignment({ ...initial, data, label });
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      expect(editor.getAttribute('aria-invalid')).toBe('false');
    };

    edit(dataLabel);
    expect(select.value).toBe('data');
    const renderedDataLabel = () => chart.shadowRoot!.querySelector('[data-label-id="bar-label-0"]')!;
    expect(renderedDataLabel().getAttribute('data-full-text')).toBe(itemLabel);
    expect(renderedDataLabel().textContent).toContain('~');
    expect(renderedDataLabel().classList.contains('mc-label--interactive')).toBe(false);

    edit([axisLabel, dataLabel]);
    expect(select.value).toBe('both');
    root.querySelector<HTMLButtonElement>('[data-trunc-strat="rotate-wrap-truncate"]')!.click();
    const updated = readConfig();
    expect(updated.data[0]).toMatchObject({ itemLabel, dept });
    expect(updated.label).toEqual(expect.arrayContaining(['axis-tick', 'data'].map((target) =>
      expect.objectContaining({ target, overflow: expect.objectContaining({
        ...overflow, strategy: 'rotate-wrap-truncate'
      }) })
    )));

    editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(select.value).toBe('axis-tick');
    expect(readConfig().data[0]).toEqual(initial.data[0]);
    expect(readConfig().label).toMatchObject({ target: 'axis-tick', overflow: { strategy: 'truncate' } });
  });

  it('offers three ellipsis presets with hover and keyboard help', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    renderGuidePage(root, 'truncation', 'dark');

    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const ellipsisSelect = root.querySelector<HTMLSelectElement>('#tr-ellipsis-select')!;
    const info = root.querySelector<HTMLElement>('#tr-ellipsis-info')!;
    const infoButton = root.querySelector<HTMLButtonElement>('button[aria-controls="tr-ellipsis-info"]')!;
    expect(Array.from(ellipsisSelect.options, (option) => option.value)).toEqual(['…', '...', '→']);
    expect(ellipsisSelect.value).toBe('…');
    expect(ellipsisSelect.getAttribute('aria-describedby')).toBe(info.id);
    const table = info.querySelector('table')!;
    expect(Array.from(table.rows, (row) => Array.from(row.cells, (cell) => cell.textContent))).toEqual([
      ['Suffix', 'maxChars used'],
      ['… (default)', '1'],
      ['... (three periods)', '3'],
      ['→ (arrow)', '1']
    ]);

    infoButton.dispatchEvent(new MouseEvent('mouseenter'));
    expect(infoButton.getAttribute('aria-expanded')).toBe('true');
    infoButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(infoButton.getAttribute('aria-expanded')).toBe('false');
    infoButton.focus();
    expect(infoButton.getAttribute('aria-expanded')).toBe('true');
    infoButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    for (const suffix of ['...', '→']) {
      ellipsisSelect.value = suffix;
      ellipsisSelect.dispatchEvent(new Event('change', { bubbles: true }));
      expect(parseConfigObjectLiteral(editor.value).label.overflow.ellipsis).toBe(suffix);
    }

    editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('button.guide-reset-btn')!.click();
    expect(ellipsisSelect.value).toBe('…');
  });

  it('keeps edited categories and overflow limits while switching wrapping modes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const [chart] = renderGuidePage(root, 'truncation', 'dark');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-trunc-code-1 textarea')!;
    const ellipsisSelect = root.querySelector<HTMLSelectElement>('#tr-ellipsis-select')!;
    const config = parseConfigObjectLiteral(editor.value);
    const category = 'Long renamed department for the responsive chart';
    const suffix = '~';
    config.data[0].dept = category;
    config.label.overflow = {
      strategy: 'wrap-truncate',
      maxWidth: 48,
      maxChars: 30,
      maxLines: 2,
      ellipsis: suffix,
      enableTooltip: false
    };
    editor.value = formatConfigAssignment(config);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ellipsisSelect.options).toHaveLength(3);
    expect(ellipsisSelect.selectedIndex).toBe(-1);

    const tick = () => chart.shadowRoot?.querySelector('[data-label-id="x-tick-0"]');
    const select = (strategy: string) => root.querySelector<HTMLButtonElement>(`[data-trunc-strat="${strategy}"]`)!.click();
    expect(tick()?.getAttribute('data-truncated')).toBe('true');
    expect(tick()?.textContent).toContain(suffix);

    select('wrap');
    expect(tick()?.getAttribute('data-truncated')).toBe('false');
    expect(tick()?.querySelectorAll('tspan').length).toBeGreaterThan(2);
    expect(tick()?.textContent).not.toContain(suffix);
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
