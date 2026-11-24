import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { registerModernCharts } from '../src/index';
import {
  GUIDES_CATALOG,
  renderGuidePage,
  type GuideId
} from '../apps/studio/guides/index';

describe('Studio Live-Editable Guide Examples (Issue #62)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders live client-editable editors across all 11 Studio guides with accessible controls', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    let totalEditors = 0;

    for (const guide of GUIDES_CATALOG) {
      const charts = renderGuidePage(root, guide.id as GuideId, 'dark');
      expect(charts.length, `guide "${guide.id}" should mount charts`).toBeGreaterThan(0);

      const editors = Array.from(
        root.querySelectorAll<HTMLTextAreaElement>('textarea.guide-code-editor')
      );
      expect(
        editors.length,
        `guide "${guide.id}" should render at least one live-editable textarea`
      ).toBeGreaterThan(0);
      totalEditors += editors.length;

      for (const ta of editors) {
        expect(ta.getAttribute('aria-invalid')).toBe('false');
        expect(ta.hasAttribute('aria-describedby')).toBe(false);
        const wrap = ta.closest('.guide-code-wrap');
        expect(wrap).not.toBeNull();

        const resetBtn = wrap!.querySelector('button.guide-reset-btn');
        const copyBtn = wrap!.querySelector('button.guide-copy-btn');
        const copyStatus = copyBtn?.nextElementSibling;
        expect(resetBtn).not.toBeNull();
        expect(copyBtn?.getAttribute('command')).toBe('--copy');
        expect(copyBtn?.getAttribute('commandfor')).toBe(ta.id);
        expect(copyStatus?.getAttribute('role')).toBe('status');
      }
    }

    expect(totalEditors).toBeGreaterThanOrEqual(24);
  });

  it('updates mounted charts live on JSON config edits, surfaces accessible errors on invalid JSON, and resets cleanly', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const charts = renderGuidePage(root, 'accessibility', 'dark');
    const staticChart = charts[1];
    const editors = Array.from(
      root.querySelectorAll<HTMLTextAreaElement>('textarea.guide-code-editor')
    );
    const staticEditor = editors[1];

    // 1. Live edit JSON: flip isInteractive to false and change title
    const parsed = JSON.parse(staticEditor.value);
    parsed.isInteractive = false;
    parsed.title = 'Client-Edited Static Title';
    staticEditor.value = JSON.stringify(parsed, null, 2);
    staticEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(staticEditor.getAttribute('aria-invalid')).toBe('false');
    expect(staticChart.isInteractive).toBe(false);
    expect(staticChart.config.title).toBe('Client-Edited Static Title');

    // 2. Typing broken JSON flags aria-invalid + aria-describedby without crashing
    staticEditor.value = '{ "isInteractive": ';
    staticEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(staticEditor.getAttribute('aria-invalid')).toBe('true');
    const errId = staticEditor.getAttribute('aria-describedby');
    expect(errId).toBeTruthy();
    expect(document.getElementById(errId!)?.textContent).toContain('Waiting for valid JSON');

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
    const cfg = JSON.parse(layerEditor.value);
    const customObj = cfg.layers.find((l: any) => l?.name === 'peak-and-mean');
    expect(customObj).toBeTruthy();
    cfg.layers = ['grid', customObj, 'axes', 'lines', 'points', 'legends'];
    cfg.data[0].data[0].y = 110;
    layerEditor.value = JSON.stringify(cfg, null, 2);
    layerEditor.dispatchEvent(new Event('input', { bubbles: true }));

    expect(layerEditor.getAttribute('aria-invalid')).toBe('false');
    const customLayerG = lineChart.shadowRoot?.querySelector(
      '[data-layer-name="peak-and-mean"]'
    );
    expect(customLayerG).not.toBeNull();
    expect(customLayerG!.textContent).toContain('Peak: 110K (Mon)');
  });
});
