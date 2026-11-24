import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHART_CATALOG,
  COMMON_ATTRIBUTES,
  getAllAttributesForChart,
  type ChartAttributeSpec
} from '../apps/studio/catalog';
import { createAttributePanel } from '../apps/studio/pages/chart-detail/attribute-panel';
import type { ChartVirtualState } from '../apps/studio/state/config-store';

type Scope = 'all' | 'specific' | 'common';

function mount(entryId = 'bar', attributes?: ChartAttributeSpec[]) {
  const entry = CHART_CATALOG.find((chart) => chart.id === entryId)!;
  const config = entry.createDefaultConfig('light');
  const allAttributes = attributes ?? getAllAttributesForChart(entry);
  const changed = vi.fn();
  const panel = createAttributePanel({
    entry, config, allAttributes,
    vState: {} as ChartVirtualState,
    onConfigChanged: changed
  });
  document.body.appendChild(panel.element);
  const root = panel.element;
  const row = (path: string) =>
    Array.from(root.querySelectorAll<HTMLElement>('.attr-row')).find(
      (candidate) => candidate.dataset.configPath === path
    )!;
  const button = (scope: Scope) => root.querySelector<HTMLButtonElement>(
    `.attr-scope-filter-button[data-scope="${scope}"]`
  )!;
  const search = (query: string) => {
    const input = root.querySelector<HTMLInputElement>('#attr-search-input')!;
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('.attr-row'));
  const visibleRows = () => rows().filter((candidate) =>
    !candidate.hidden &&
    !candidate.closest<HTMLDetailsElement>('.attr-category-accordion')!.hidden &&
    !candidate.closest<HTMLElement>('.attr-scope-group')!.hidden
  );
  return { entry, config, allAttributes, changed, panel, root, row, button, search, rows, visibleRows };
}

afterEach(() => document.body.replaceChildren());

describe('Studio attribute scopes and search', () => {
  it('keeps every catalog property once and separates chart capabilities from shared controls for all charts', () => {
    const commonOrder = [
      'Sizing & Layout', 'Theme Layer (<mc-theme-layer>)',
      'Universal Label (<mc-label>)', 'Legend (<mc-legend>)',
      'Tooltip (<mc-tooltip>)', 'View & Zoom (<mc-view-layer>)',
      'Marker & Threshold (<mc-marker-layer>)', 'Animation (<mc-animation-layer>)',
      'Accessibility (<mc-aria-layer>)', 'Internationalization'
    ];
    for (const entry of CHART_CATALOG) {
      const view = mount(entry.id);
      const specific = new Set(entry.specificAttributes.map((attribute) => attribute.configPath));
      const paths = view.rows().map((row) => row.dataset.configPath);
      expect(paths, entry.id).toHaveLength(view.allAttributes.length);
      expect(new Set(paths).size, entry.id).toBe(paths.length);
      expect(new Set(paths), entry.id).toEqual(new Set(view.allAttributes.map((attribute) => attribute.configPath)));

      const groups = Array.from(view.root.querySelectorAll<HTMLElement>(
        '.attributes-accordion-list .attr-scope-group'
      ));
      expect(groups.map((group) => group.dataset.scope), entry.id).toEqual(['specific', 'common']);
      for (const group of groups) {
        const heading = group.querySelector('h3')!.textContent!.trim();
        expect(heading).toBe(group.dataset.scope === 'specific' ? 'Chart-specific' : 'Common');
      }
      for (const row of view.rows()) {
        const scope = specific.has(row.dataset.configPath!) ? 'specific' : 'common';
        expect(row.dataset.scope, `${entry.id}: ${row.dataset.configPath}`).toBe(scope);
        expect(row.closest<HTMLElement>('.attr-scope-group')!.dataset.scope).toBe(scope);
        expect(row.closest<HTMLDetailsElement>('.attr-category-accordion')!.dataset.scope).toBe(scope);
        const spec = view.allAttributes.find((attribute) => attribute.configPath === row.dataset.configPath)!;
        expect(row.querySelector('.attr-config-path')!.getAttribute('title')).toBe(spec.description);
      }
      const commonCategories = Array.from(groups[1].querySelectorAll<HTMLDetailsElement>(
        '.attr-category-accordion'
      ), (card) => card.dataset.category);
      expect(commonCategories).toEqual(commonOrder.filter((category) =>
        view.allAttributes.some((attribute) => !specific.has(attribute.configPath) && attribute.category === category)
      ));
      expect(view.root.querySelector('.attributes-scope-filter')!.getAttribute('role')).toBe('group');
      expect(view.root.querySelector('.attributes-scope-filter')!.getAttribute('aria-label')).toBe('Attribute scope');
      expect(view.root.querySelector('h2')!.textContent!.trim()).toBe('Attributes & Config');
      expect(view.root.querySelector(
        '.attributes-section-description, .attr-scope-description, .attr-scope-badge, ' +
        '.attr-scope-count, .attr-category-scope, [data-category-count], .attr-filter-status, .attr-desc'
      )).toBeNull();
      expect(view.button('all').getAttribute('aria-pressed')).toBe('true');
      for (const [scope, label] of [
        ['all', 'All'], ['specific', 'Chart-specific'], ['common', 'Common']
      ] as const) {
        expect(view.button(scope).textContent!.trim()).toBe(label);
      }
      if (entry.id === 'line' || entry.id === 'bar') {
        const scaleAttributes = entry.specificAttributes.filter((attribute) => attribute.category.startsWith('Scale Layer'));
        expect(scaleAttributes.length).toBeGreaterThan(0);
        expect(scaleAttributes.every((attribute) => view.row(attribute.configPath).dataset.scope === 'specific')).toBe(true);
      }
      view.root.remove();
    }
  });

  it('combines scope and text filters, reports empty results, and hides empty groups without losing properties', () => {
    const view = mount();
    view.button('common').click();
    expect(view.visibleRows().every((row) => row.dataset.scope === 'common')).toBe(true);
    view.search('GROUPMODE');
    expect(view.visibleRows()).toHaveLength(0);
    expect(view.root.querySelector<HTMLElement>('.attr-empty-state')!.hidden).toBe(false);
    expect(Array.from(view.root.querySelectorAll<HTMLElement>('.attr-scope-group')).every((group) => group.hidden)).toBe(true);
    const empty = view.root.querySelector<HTMLElement>('.attr-empty-state')!;
    expect(empty.textContent).toBe('No matching attributes.');
    expect(empty.getAttribute('role')).toBe('status');
    expect(empty.getAttribute('aria-live')).toBe('polite');

    view.button('specific').click();
    expect(view.visibleRows().map((row) => row.dataset.configPath)).toEqual(['groupMode']);
    expect(view.root.querySelector<HTMLElement>('.attr-scope-group[data-scope="common"]')!.hidden).toBe(true);
    expect(view.root.querySelector<HTMLElement>('.attr-empty-state')!.hidden).toBe(true);

    view.button('all').click();
    view.search('  I18N.LOCALE  ');
    expect(view.visibleRows().map((row) => row.dataset.configPath)).toEqual(['i18n.locale']);
    expect(view.row('i18n.locale').closest<HTMLDetailsElement>('details')!.open).toBe(true);
    expect(view.root.querySelector<HTMLElement>('.attr-scope-group[data-scope="specific"]')!.hidden).toBe(true);
    view.search('');
    expect(view.visibleRows()).toHaveLength(view.allAttributes.length);
    expect(view.rows()).toHaveLength(view.allAttributes.length);
    expect(view.root.querySelector<HTMLElement>('.attr-empty-state')!.hidden).toBe(true);
    view.search('arranges multi-series');
    expect(view.visibleRows().map((row) => row.dataset.configPath)).toEqual(['groupMode']);
    view.search('');

    const commonOnly = mount('line', COMMON_ATTRIBUTES);
    const visibleGroups = Array.from(commonOnly.root.querySelectorAll<HTMLElement>('.attr-scope-group')).filter((group) => !group.hidden);
    expect(visibleGroups.map((group) => group.dataset.scope)).toEqual(['common']);
    expect(commonOnly.visibleRows()).toHaveLength(COMMON_ATTRIBUTES.length);
  });

  it('restores disclosure choices after search and keeps expand/minimize behavior across scope changes', () => {
    const view = mount();
    const cards = Array.from(view.root.querySelectorAll<HTMLDetailsElement>('.attr-category-accordion'));
    view.root.querySelector<HTMLButtonElement>('#btn-collapse-all-attrs')!.click();
    expect(cards.every((card) => !card.open)).toBe(true);
    view.row('groupMode').closest<HTMLDetailsElement>('details')!.open = true;
    view.row('i18n.locale').closest<HTMLDetailsElement>('details')!.open = true;
    const beforeSearch = cards.map((card) => card.open);
    view.search('palette');
    expect(view.row('palette').closest<HTMLDetailsElement>('details')!.open).toBe(true);
    view.button('common').click();
    view.search('i18n.locale');
    view.search('');
    expect(cards.map((card) => card.open)).toEqual(beforeSearch);
    view.button('all').click();
    expect(cards.map((card) => card.open)).toEqual(beforeSearch);

    view.root.querySelector<HTMLButtonElement>('#btn-expand-all-attrs')!.click();
    expect(cards.every((card) => card.open)).toBe(true);
    view.search('groupMode');
    view.search('');
    expect(cards.every((card) => card.open)).toBe(true);
    view.root.querySelector<HTMLButtonElement>('#btn-collapse-all-attrs')!.click();
    view.search('i18n.locale');
    expect(view.row('i18n.locale').closest<HTMLDetailsElement>('details')!.open).toBe(true);
    view.search('');
    expect(cards.every((card) => !card.open)).toBe(true);
  });

  it('keeps shared and chart-specific controls editable and synchronizable after filtering', () => {
    const view = mount();
    const { data, markers } = view.config;
    view.button('specific').click();
    const mode = view.row('groupMode').querySelector<HTMLSelectElement>('select')!;
    mode.value = 'stacked';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    view.button('common').click();
    view.search('chart-title');
    const title = view.row('title').querySelector<HTMLInputElement>('input')!;
    title.value = 'Operational spending';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    expect(view.config.groupMode).toBe('stacked');
    expect(view.config.title).toBe('Operational spending');
    expect(view.config.data).toBe(data);
    expect(view.config.markers).toBe(markers);
    expect(view.changed).toHaveBeenCalledTimes(2);

    view.config.groupMode = 'grouped';
    view.config.title = 'External update';
    view.panel.syncAllControls();
    expect(mode.value).toBe('grouped');
    expect(title.value).toBe('External update');
    expect(view.button('common').getAttribute('aria-pressed')).toBe('true');
    expect(view.changed).toHaveBeenCalledTimes(2);
  });
});
