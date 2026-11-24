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
  const status = (count: number) => expect(
    root.querySelector('.attr-filter-status')!.textContent
  ).toContain(`Showing ${count} of ${allAttributes.length} properties`);
  return { entry, config, allAttributes, changed, panel, root, row, button, search, rows, visibleRows, status };
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
        const heading = group.querySelector('h3')!.textContent!;
        expect(heading).toContain(group.dataset.scope === 'specific' ? 'Chart-specific' : 'Common');
        expect(heading).toMatch(new RegExp(`\\b${group.querySelectorAll('.attr-row').length}\\b`));
      }
      for (const row of view.rows()) {
        const scope = specific.has(row.dataset.configPath!) ? 'specific' : 'common';
        expect(row.dataset.scope, `${entry.id}: ${row.dataset.configPath}`).toBe(scope);
        expect(row.closest<HTMLElement>('.attr-scope-group')!.dataset.scope).toBe(scope);
        expect(row.closest<HTMLDetailsElement>('.attr-category-accordion')!.dataset.scope).toBe(scope);
      }
      const commonCategories = Array.from(groups[1].querySelectorAll<HTMLDetailsElement>(
        '.attr-category-accordion'
      ), (card) => card.dataset.category);
      expect(commonCategories).toEqual(commonOrder.filter((category) =>
        view.allAttributes.some((attribute) => !specific.has(attribute.configPath) && attribute.category === category)
      ));
      expect(view.root.querySelector('.attributes-scope-filter')!.getAttribute('role')).toBe('group');
      expect(view.root.querySelector('.attributes-scope-filter')!.getAttribute('aria-label')).toBe('Attribute scope');
      expect(view.root.querySelector('.attr-filter-status')!.getAttribute('aria-live')).toBe('polite');
      expect(view.button('all').getAttribute('aria-pressed')).toBe('true');
      for (const [scope, count] of [
        ['all', view.allAttributes.length], ['specific', specific.size],
        ['common', view.allAttributes.length - specific.size]
      ] as const) {
        expect(view.button(scope).textContent).toMatch(new RegExp(`\\b${count}\\b`));
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
    view.status(0);

    view.button('specific').click();
    expect(view.visibleRows().map((row) => row.dataset.configPath)).toEqual(['groupMode']);
    expect(view.root.querySelector<HTMLElement>('.attr-scope-group[data-scope="common"]')!.hidden).toBe(true);
    expect(view.root.querySelector<HTMLElement>('.attr-empty-state')!.hidden).toBe(true);
    view.status(1);

    view.button('all').click();
    view.search('  I18N.LOCALE  ');
    expect(view.visibleRows().map((row) => row.dataset.configPath)).toEqual(['i18n.locale']);
    expect(view.row('i18n.locale').closest<HTMLDetailsElement>('details')!.open).toBe(true);
    expect(view.root.querySelector<HTMLElement>('.attr-scope-group[data-scope="specific"]')!.hidden).toBe(true);
    view.status(1);
    view.search('');
    expect(view.visibleRows()).toHaveLength(view.allAttributes.length);
    expect(view.rows()).toHaveLength(view.allAttributes.length);
    view.status(view.allAttributes.length);

    const commonOnly = mount('line', COMMON_ATTRIBUTES);
    const visibleGroups = Array.from(commonOnly.root.querySelectorAll<HTMLElement>('.attr-scope-group')).filter((group) => !group.hidden);
    expect(visibleGroups.map((group) => group.dataset.scope)).toEqual(['common']);
    commonOnly.status(COMMON_ATTRIBUTES.length);
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
