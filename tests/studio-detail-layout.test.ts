import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerModernCharts } from '../src/index';
import { CHART_CATALOG } from '../apps/studio/catalog';
import { renderChartDetailPage } from '../apps/studio/pages/chart-detail';

describe('Chart Detail Page Layout — Event Inspector beside HTML Markup', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('places Live Unified Event Inspector to the right of Web Component HTML Markup in .detail-bottom-grid and streams live events', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const heatmapEntry = CHART_CATALOG.find((c) => c.id === 'heatmap')!;
    const chartEl = renderChartDetailPage(root, heatmapEntry);

    const topGrid = root.querySelector('.detail-studio-grid');
    const bottomGrid = root.querySelector('.detail-bottom-grid');
    expect(topGrid).not.toBeNull();
    expect(bottomGrid).not.toBeNull();

    // Event inspector is no longer inside the top chart card
    expect(topGrid!.querySelector('#detail-aria-readout')).toBeNull();

    // Bottom grid has Web Component HTML Markup on the left, Live Unified Event Inspector on the right
    expect(bottomGrid!.children.length).toBe(2);
    expect(bottomGrid!.children[0].querySelector('#detail-html-preview')).not.toBeNull();
    expect(bottomGrid!.children[1].classList.contains('event-inspector-card')).toBe(true);
    expect(bottomGrid!.children[1].querySelector('#detail-aria-readout')).not.toBeNull();

    // Clicking a heatmap cell populates both Latest Event and Recent Event Stream
    const cell = chartEl.shadowRoot?.querySelector(
      '[data-event-target="heatmapCell"]'
    ) as Element | null;
    expect(cell).not.toBeNull();
    cell!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 80, clientY: 80 })
    );

    const readout = bottomGrid!.querySelector('#detail-aria-readout')!;
    expect(readout.textContent).toContain('click → target="heatmapCell"');

    const rows = bottomGrid!.querySelectorAll('.event-inspector-row');
    expect(rows.length).toBeGreaterThanOrEqual(1);

    // Clear button resets the log and readout
    const clearBtn = bottomGrid!.querySelector(
      '#btn-detail-clear-events'
    ) as HTMLButtonElement;
    clearBtn.click();
    expect(bottomGrid!.querySelectorAll('.event-inspector-row').length).toBe(0);
    expect(bottomGrid!.querySelector('.event-inspector-empty')).not.toBeNull();
  });

  it('copies AI Context without mutating button text or shifting layout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '# <mc-bar-chart>'
    } as Response);

    try {
      const root = document.createElement('div');
      document.body.appendChild(root);
      const barEntry = CHART_CATALOG.find((c) => c.id === 'bar')!;
      renderChartDetailPage(root, barEntry);

      const copyBtn = root.querySelector<HTMLButtonElement>('#btn-copy-ai-context')!;
      const statusEl = root.querySelector<HTMLElement>('#copy-ai-context-status')!;
      const initialLabel = copyBtn.textContent;

      copyBtn.click();
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('# <mc-bar-chart>'));
      expect(copyBtn.textContent).toBe(initialLabel);
      expect(copyBtn.hasAttribute('data-copied')).toBe(true);
      expect(statusEl.textContent).toBe('✓ Copied AI Context');

      vi.advanceTimersByTime(1800);
      expect(copyBtn.hasAttribute('data-copied')).toBe(false);
      expect(statusEl.textContent).toBe('');
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });

  it('minimizes subtext into 4 hoverable info icon tooltips next to the 4 section titles on all 10 chart pages', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    for (const entry of CHART_CATALOG) {
      renderChartDetailPage(root, entry);

      // Verify no persistent inline subtext paragraphs remain visible
      expect(root.querySelector('.event-inspector-desc')).toBeNull();
      const editorError = root.querySelector<HTMLElement>('#editor-helper-desc');
      expect(editorError?.hidden).toBe(true);

      // Verify all 4 sections have a .panel-title-group with an info icon button and popover tooltip
      const infoButtons = Array.from(
        root.querySelectorAll<HTMLButtonElement>('.panel-title-group .section-info-btn')
      );
      const infoPopovers = Array.from(
        root.querySelectorAll<HTMLElement>('.panel-title-group .section-info-popover')
      );
      expect(infoButtons, entry.id).toHaveLength(4);
      expect(infoPopovers, entry.id).toHaveLength(4);
      const reset = root.querySelector('.attributes-section-header #btn-reset-default-attrs');
      expect(reset?.textContent?.trim(), entry.id).toBe('Reset Default');

      expect(infoPopovers[0].textContent).toContain(entry.summary);
      expect(infoPopovers[1].textContent).toContain('Interactive controls for chart-specific options');
      expect(infoPopovers[2].textContent).toContain('Live-editable Web Component HTML markup');
      expect(infoPopovers[3].textContent).toContain('Click, hover, or Tab-focus anywhere');

      // Hovering each info icon opens its tooltip popover and sets aria-expanded="true"
      infoButtons.forEach((btn, idx) => {
        const pop = infoPopovers[idx];
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        expect(pop.classList.contains('is-open')).toBe(false);

        btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        expect(btn.getAttribute('aria-expanded')).toBe('true');
        expect(pop.classList.contains('is-open')).toBe(true);

        btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        expect(pop.classList.contains('is-open')).toBe(false);
      });
    }
  });

  it('unifies top-right Studio dropdowns (#nav-pages-trigger, #global-palette-select, #global-appearance-select) with matching branded-select styling', async () => {
    const fsModule = 'node:fs';
    const { readFileSync } = await import(/* @vite-ignore */ fsModule);
    const html = readFileSync('apps/studio/index.html', 'utf8');
    const css = readFileSync('apps/studio/styles/layout.css', 'utf8');

    expect(html).toContain('id="global-palette-select" name="palette" class="studio-select"');
    expect(html).toContain('id="global-appearance-select" name="appearance" class="studio-select"');
    expect(css).toContain('appearance: base-select');
    expect(css).toContain('select::picker(select)');
    expect(css).toContain('select::picker-icon');
    expect(css).toContain('select option::checkmark');
  });
});
