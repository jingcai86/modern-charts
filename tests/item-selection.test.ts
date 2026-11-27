import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  configureChartFeatures,
  configureI18n,
  getChartFeatures,
  isChartFeatureEnabled,
  registerModernCharts,
  type MCBaseChart,
  type SelectionChangeDetail
} from '../src/index';
import { registerBarChart } from '../src/entries/bar';
import { registerLineChart } from '../src/entries/line';
import { registerPieChart } from '../src/entries/pie';
import { registerHeatmapChart } from '../src/entries/heatmap';
import { registerRadarChart } from '../src/entries/radar';
import { registerSunburstChart } from '../src/entries/sunburst';
import { registerSankeyChart } from '../src/entries/sankey';
import { registerScatterChart } from '../src/entries/scatter';
import { registerTreemapChart } from '../src/entries/treemap';
import { registerGaugeChart } from '../src/entries/gauge';
import { CHART_CATALOG, getAllAttributesForChart } from '../apps/studio/catalog';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_PIE_DATA
} from '../apps/studio/sample-data';
import { renderChartDetailPage } from '../apps/studio/pages/chart-detail';
import { resetChartConfig } from '../apps/studio/state/config-store';
import { GUIDES_CATALOG, renderGuidePage } from '../apps/studio/guides';

beforeAll(async () => {
  await registerModernCharts();
});

afterEach(async () => {
  document.body.replaceChildren();
  configureI18n({});
  await configureChartFeatures({
    features: { zoom: false, csvExport: false, selection: false, chartState: true }
  });
  for (const entry of CHART_CATALOG) {
    resetChartConfig(entry);
  }
  vi.restoreAllMocks();
});

describe('Opt-in item selection feature bootstrapping (default false across all charts)', () => {
  it('defaults selection feature to false on registerModernCharts() and all 10 register<Chart>() entrypoints, and enables when features.selection is true', async () => {
    await configureChartFeatures({ features: { selection: false } });
    expect(isChartFeatureEnabled('selection')).toBe(false);
    expect(getChartFeatures().selection).toBe(false);

    await registerModernCharts();
    const registrars = [
      registerBarChart,
      registerLineChart,
      registerPieChart,
      registerHeatmapChart,
      registerRadarChart,
      registerSunburstChart,
      registerSankeyChart,
      registerScatterChart,
      registerTreemapChart,
      registerGaugeChart
    ];
    for (const registerFn of registrars) {
      await registerFn();
      expect(isChartFeatureEnabled('selection')).toBe(false);
    }

    // Mount a chart with selection config while features.selection is false
    const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
    bar.config = {
      width: 480,
      height: 280,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      selection: { enabled: true, mode: 'multiple' },
      data: SAMPLE_BAR_DATA
    };
    document.body.appendChild(bar);

    expect(bar.isFeatureEnabled('selection')).toBe(false);
    expect(bar.selectable).toBe(false);
    expect(bar.selectedItems).toEqual([]);
    expect(bar.selectedIds).toEqual([]);

    const firstBar = bar.shadowRoot!.querySelector<SVGElement>('.mc-bar-rect')!;
    firstBar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(bar.selectedItems).toEqual([]);
    expect(firstBar.hasAttribute('data-selected')).toBe(false);

    // Enable selection via per-chart bootstrap function
    await registerBarChart({ features: { selection: true } });
    expect(isChartFeatureEnabled('selection')).toBe(true);
    expect(bar.isFeatureEnabled('selection')).toBe(true);
    expect(bar.selectable).toBe(true);

    const activeFirstBar =
      bar.shadowRoot!.querySelector<SVGElement>('.mc-bar-rect')!;
    activeFirstBar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(bar.selectedIds).toEqual(['Cloud-Q1']);
    expect(activeFirstBar.getAttribute('data-selected')).toBe('true');
    expect(activeFirstBar.getAttribute('aria-selected')).toBe('true');

    // Disabling selection feature at runtime clears active selection behavior
    await registerBarChart({ features: { selection: false } });
    expect(bar.isFeatureEnabled('selection')).toBe(false);
    expect(bar.selectable).toBe(false);
    expect(bar.selectedItems).toEqual([]);
  });
});

describe('Interactive item selection across all 10 chart types (Issue #124)', () => {
  it('supports single-select and multi-select with pointer and keyboard across all 10 chart types', async () => {
    await registerModernCharts({ features: { selection: true } });
    expect(CHART_CATALOG).toHaveLength(10);

    for (const entry of CHART_CATALOG) {
      const chart = document.createElement(entry.tagName) as MCBaseChart<any>;
      const defaultCfg = entry.createDefaultConfig('dark');
      chart.config = {
        ...defaultCfg,
        width: 520,
        height: 320,
        animate: false
      };
      document.body.appendChild(chart);

      // Selection is disabled by default even when features.selection is loaded
      expect(chart.selectable, entry.id).toBe(false);

      // Enable single-select mode
      chart.config = {
        ...chart.config,
        selection: { enabled: true, mode: 'single' }
      };
      expect(chart.selectable, entry.id).toBe(true);
      expect(chart.selectionMode, entry.id).toBe('single');

      const selectableEls = Array.from(
        chart.shadowRoot!.querySelectorAll<SVGElement>('[data-selectable="true"]')
      );
      expect(selectableEls.length, entry.id).toBeGreaterThan(0);

      const events: SelectionChangeDetail[] = [];
      chart.addEventListener('mc-selection-change', (e: Event) => {
        events.push((e as CustomEvent<SelectionChangeDetail>).detail);
      });

      const firstEl = selectableEls[0];
      const firstId = firstEl.getAttribute('data-selection-id')!;
      expect(firstId, entry.id).toBeTruthy();

      // 1. Pointer click selects first item
      firstEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(chart.selectedIds, entry.id).toEqual([firstId]);
      expect(chart.selectedItems, entry.id).toHaveLength(1);
      expect(chart.selectedItems[0].id, entry.id).toBe(firstId);
      expect(chart.selectedItems[0].chartType, entry.id).toBe(entry.id);
      expect(chart.selectedItems[0].data, entry.id).toBeDefined();
      expect(firstEl.getAttribute('data-selected'), entry.id).toBe('true');
      expect(firstEl.getAttribute('aria-selected'), entry.id).toBe('true');
      expect(firstEl.classList.contains('mc-item--selected'), entry.id).toBe(
        true
      );
      expect(events[events.length - 1]?.action, entry.id).toBe('select');
      expect(events[events.length - 1]?.source, entry.id).toBe('pointer');

      if (selectableEls.length > 1) {
        const secondEl = selectableEls[1];
        const secondId = secondEl.getAttribute('data-selection-id')!;

        // 2. Single-select mode: choosing another item replaces the current selection
        secondEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(chart.selectedIds, entry.id).toEqual([secondId]);
        expect(firstEl.hasAttribute('data-selected'), entry.id).toBe(false);
        expect(firstEl.getAttribute('aria-selected'), entry.id).toBe('false');
        expect(secondEl.getAttribute('data-selected'), entry.id).toBe('true');
        expect(secondEl.getAttribute('aria-selected'), entry.id).toBe('true');

        // 3. Deselect with keyboard Enter
        secondEl.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        expect(chart.selectedIds, entry.id).toEqual([]);
        expect(events[events.length - 1]?.action, entry.id).toBe('deselect');
        expect(events[events.length - 1]?.source, entry.id).toBe('keyboard');

        // 4. Switch to multi-select mode: add multiple items and clear entire selection
        chart.selectionMode = 'multiple';
        expect(chart.selectionMode, entry.id).toBe('multiple');

        const multiEls = Array.from(
          chart.shadowRoot!.querySelectorAll<SVGElement>(
            '[data-selectable="true"]'
          )
        );
        multiEls[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        multiEls[1].dispatchEvent(
          new KeyboardEvent('keyup', { key: ' ', bubbles: true })
        );
        expect(chart.selectedIds, entry.id).toEqual([firstId, secondId]);
        expect(chart.selectedItems, entry.id).toHaveLength(2);

        // Remove individual item in multi-select mode
        multiEls[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(chart.selectedIds, entry.id).toEqual([secondId]);

        // Re-add and clear entire selection via Escape key or clearSelection()
        multiEls[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(chart.selectedIds, entry.id).toHaveLength(2);
        multiEls[0].dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        expect(chart.selectedIds, entry.id).toEqual([]);
        expect(events[events.length - 1]?.action, entry.id).toBe('clear');
      } else {
        // Single-item chart (e.g. single-series gauge): deselect via keyboard Enter
        firstEl.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
        expect(chart.selectedIds, entry.id).toEqual([]);
        expect(events[events.length - 1]?.action, entry.id).toBe('deselect');
        expect(events[events.length - 1]?.source, entry.id).toBe('keyboard');
      }

      chart.remove();
    }
  }, 45000);

  it('includes row, column, and value on Heatmap cell selection and in mc-selection-change events', async () => {
    await registerModernCharts({ features: { selection: true } });
    const heatmap = document.createElement(
      'mc-heatmap-chart'
    ) as MCBaseChart<any>;
    const onChangeSpy = vi.fn();
    heatmap.config = {
      width: 500,
      height: 320,
      animate: false,
      data: SAMPLE_HEATMAP_DATA,
      selection: {
        enabled: true,
        mode: 'multiple',
        onChange: onChangeSpy
      }
    };
    document.body.appendChild(heatmap);

    const cellEl = heatmap.shadowRoot!.querySelector<SVGElement>(
      '.mc-heatmap-cell[data-row="Mon"][data-col="06:00"]'
    )!;
    expect(cellEl).not.toBeNull();
    cellEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onChangeSpy).toHaveBeenCalledOnce();
    const detail = onChangeSpy.mock.calls[0][0] as SelectionChangeDetail;
    expect(detail.selectedIds).toEqual(['Mon-06:00']);
    expect(detail.item).toBeDefined();
    expect(detail.item?.row).toBe('Mon');
    expect(detail.item?.column).toBe('06:00');
    expect(detail.item?.value).toBe(42);
    expect(detail.item?.data.row).toBe('Mon');
    expect(detail.item?.data.column).toBe('06:00');
    expect(detail.item?.data.value).toBe(42);

    const selected = heatmap.selectedItems[0];
    expect(selected.row).toBe('Mon');
    expect(selected.column).toBe('06:00');
    expect(selected.value).toBe(42);

    // Programmatic selectItem, deselectItem, toggleItemSelection, clearSelection
    heatmap.selectItem('Tue-12:00');
    expect(heatmap.selectedIds).toEqual(['Mon-06:00', 'Tue-12:00']);
    expect(heatmap.isItemSelected('Tue-12:00')).toBe(true);

    heatmap.deselectItem('Mon-06:00');
    expect(heatmap.selectedIds).toEqual(['Tue-12:00']);

    heatmap.toggleItemSelection('Tue-12:00');
    expect(heatmap.selectedIds).toEqual([]);

    heatmap.setSelectedIds(['Mon-00:00', 'Wed-18:00']);
    expect(heatmap.selectedIds).toEqual(['Mon-00:00', 'Wed-18:00']);

    heatmap.clearSelection();
    expect(heatmap.selectedIds).toEqual([]);
    expect(heatmap.selectedItems).toEqual([]);
  });

  it('exposes Selectable items checkbox, Selection mode control, and Clear selection in Studio for all 10 charts', async () => {
    await registerModernCharts({ features: { selection: true } });

    for (const entry of CHART_CATALOG) {
      const attrs = getAllAttributesForChart(entry);
      const selectableSpec = attrs.find(
        (a) => a.configPath === 'selection.enabled'
      );
      const modeSpec = attrs.find((a) => a.configPath === 'selection.mode');
      expect(selectableSpec?.label, entry.id).toBe('Selectable items');
      expect(selectableSpec?.defaultValue, entry.id).toBe(false);
      expect(modeSpec?.label, entry.id).toBe('Selection mode');
      expect(modeSpec?.defaultValue, entry.id).toBe('single');

      const root = document.createElement('div');
      document.body.appendChild(root);
      const chart = renderChartDetailPage(root, entry);

      const selectableRow = root.querySelector<HTMLElement>(
        '.attr-row[data-config-path="selection.enabled"]'
      )!;
      const modeRow = root.querySelector<HTMLElement>(
        '.attr-row[data-config-path="selection.mode"]'
      )!;
      const clearBtn = root.querySelector<HTMLButtonElement>(
        '#btn-detail-clear-selection'
      )!;
      expect(selectableRow, entry.id).not.toBeNull();
      expect(
        selectableRow.querySelector('.attr-config-path')?.textContent,
        entry.id
      ).toBe('Selectable items');
      expect(modeRow, entry.id).not.toBeNull();
      expect(clearBtn, entry.id).not.toBeNull();

      const checkbox = selectableRow.querySelector<HTMLInputElement>(
        'input[type="checkbox"]'
      )!;
      const modeSelect = modeRow.querySelector<HTMLSelectElement>('select')!;
      expect(checkbox.checked, entry.id).toBe(false);
      expect(chart.selectable, entry.id).toBe(false);

      // Enable Selectable items in Studio and switch to multi-select
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(chart.selectable, entry.id).toBe(true);

      modeSelect.value = 'multiple';
      modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      expect(chart.selectionMode, entry.id).toBe('multiple');

      const firstItem = chart.shadowRoot!.querySelector<SVGElement>(
        '[data-selectable="true"]'
      )!;
      firstItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(chart.selectedIds.length, entry.id).toBe(1);

      const readout = root.querySelector('#detail-aria-readout')!;
      expect(readout.textContent, entry.id).toContain(
        'mc-selection-change → action="select"'
      );

      clearBtn.click();
      expect(chart.selectedIds, entry.id).toEqual([]);
      expect(readout.textContent, entry.id).toContain(
        'mc-selection-change → action="clear"'
      );

      root.remove();
    }
  }, 45000);
});

describe('Interactive Item Selection Studio guide', () => {
  it('renders single-select, multi-select, and all 10 chart switchers in the selection guide', async () => {
    expect(
      GUIDES_CATALOG.find((g) => g.id === 'selection')?.title
    ).toContain('Interactive Item Selection');

    const root = document.createElement('div');
    document.body.appendChild(root);
    const charts = renderGuidePage(root, 'selection', 'dark');
    expect(charts).toHaveLength(2);

    const ex1 = root.querySelector<HTMLElement>('#sel-modes-demo')!;
    const readout1 = ex1.querySelector<HTMLElement>('#sel-readout-1')!;
    const editor1 = ex1.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(readout1.textContent).toContain('Cloud-Q1');
    expect(readout1.textContent).toContain('Edge-Q2');
    expect(editor1.value).toContain('selection: true');

    // Switch to single-select mode in Example 1
    ex1.querySelector<HTMLButtonElement>('#sel-btn-single-1')!.click();
    expect(charts[0].selectionMode).toBe('single');
    expect(charts[0].selectedIds).toHaveLength(1);

    // Clear selection in Example 1
    ex1.querySelector<HTMLButtonElement>('#sel-btn-clear-1')!.click();
    expect(charts[0].selectedIds).toEqual([]);

    // Switch back to multi-select and apply preset
    ex1.querySelector<HTMLButtonElement>('#sel-btn-multiple-1')!.click();
    ex1.querySelector<HTMLButtonElement>('#sel-btn-preset-1')!.click();
    expect(charts[0].selectedIds).toEqual(['Cloud-Q1', 'Cloud-Q3']);

    // Example 2: Switch across all 10 chart types
    const ex2 = root.querySelector<HTMLElement>('#sel-all-charts')!;
    const readout2 = ex2.querySelector<HTMLElement>('#sel-readout-2')!;
    const typeBtns = Array.from(
      ex2.querySelectorAll<HTMLButtonElement>('button[data-sel-chart-type]')
    );
    expect(typeBtns).toHaveLength(10);

    for (const btn of typeBtns) {
      btn.click();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(charts[1].selectedIds.length).toBeGreaterThanOrEqual(1);
      if (btn.dataset.selChartType === 'heatmap') {
        expect(readout2.textContent).toContain('row="');
        expect(readout2.textContent).toContain('column="');
        expect(readout2.textContent).toContain('value=');
      }
    }

    ex2.querySelector<HTMLButtonElement>('#sel-btn-clear-2')!.click();
    expect(charts[1].selectedIds).toEqual([]);
    ex2.querySelector<HTMLButtonElement>('#sel-btn-select-first-2')!.click();
    expect(charts[1].selectedIds).toHaveLength(1);

    // Toggling features.selection to false in editor disables selection across both guide charts
    editor1.value = editor1.value.replace('selection: true', 'selection: false');
    editor1.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => {
      expect(charts[0].selectable).toBe(false);
      expect(charts[1].selectable).toBe(false);
      expect(readout1.textContent).toContain('Item selection disabled');
    });
  }, 20000);
});
