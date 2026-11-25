import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureI18n,
  createChartI18n,
  getI18nConfig,
  physicalTextAnchor,
  subscribeI18n
} from '../src/core/i18n';
import { formatAxisDate, formatAxisNumber, formatDisplayValue, formatGroupedNumber } from '../src/core/format';
import { AriaEngine, createDefaultAriaConfig } from '../src/core/aria-engine';
import type { AriaItemDescriptor, ChartI18nConfig } from '../src/core/types';

afterEach(() => configureI18n({}));

describe('shared chart internationalization', () => {
  it('merges partial global and per-chart messages without sharing mutable inputs', () => {
    const config = { locale: 'de-DE', messages: { loading: 'Laden…', total: 'Gesamt' } };
    configureI18n(config);
    config.messages.total = 'Mutated';
    const chart = createChartI18n({ messages: { value: 'Wert', total: undefined } });
    expect(chart.locale).toBe('de-DE');
    expect(chart.message('loading')).toBe('Laden…');
    expect(chart.message('value')).toBe('Wert');
    expect(chart.message('total')).toBe('Gesamt');
    expect(chart.message('empty')).toBe('No data');
    const snapshot = getI18nConfig();
    snapshot.messages!.total = 'Changed copy';
    expect(createChartI18n().message('total')).toBe('Gesamt');
    configureI18n({ locale: 'fr-FR' });
    expect(createChartI18n().message('loading')).toBe('Loading…');
    expect(chart.message('loading')).toBe('Laden…');
  });

  it('notifies subscribers and rejects invalid global configuration atomically', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeI18n(listener);
    try {
      configureI18n({ locale: 'de-DE' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(() => configureI18n({ timeZone: 'Invalid/TimeZone' })).toThrow(RangeError);
      expect(() => configureI18n({ direction: 'auto' } as unknown as ChartI18nConfig)).toThrow(RangeError);
      expect(createChartI18n().locale).toBe('de-DE');
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      configureI18n({});
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('formats locale numbers, SI portions, currency, precision, and percentages', () => {
    const de = createChartI18n({ locale: 'de-DE' });
    expect(formatGroupedNumber(1234.56, de)).toBe('1.234,56');
    expect(formatAxisNumber(1500000, de)).toBe('1,5M');
    expect(formatAxisNumber(1.256, de)).toBe('1,26');
    expect(formatAxisNumber(42)).toBe('42');
    expect(formatDisplayValue(12.34567, de)).toBe('12,34567');
    expect(de.formatNumber(-0)).toBe('0');
    expect(de.formatNumber(1e-25, { useGrouping: false })).not.toBe('0');
    expect(de.formatNumber(12.34567, { maximumFractionDigits: 2 })).toBe('12,35');
    expect(de.formatNumber(1234.56, { style: 'currency', currency: 'JPY' })).toBe(
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'JPY' }).format(1234.56)
    );
    expect(de.formatPercent(0.125, { maximumFractionDigits: 1 })).toBe(
      new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 }).format(0.125)
    );
    expect(formatDisplayValue(null, de)).toBe('');
    expect(formatDisplayValue('unchanged-id', de)).toBe('unchanged-id');
  });

  it('uses the selected time zone across date helpers', () => {
    const instant = new Date('2026-01-01T01:00:00Z');
    const la = createChartI18n({ locale: 'en-US', timeZone: 'America/Los_Angeles' });
    const utc = createChartI18n({ locale: 'en-US', timeZone: 'UTC' });
    expect(formatAxisDate(instant, la)).toBe('Dec 31');
    expect(formatDisplayValue(instant, utc)).toBe('Jan 01');
    expect(la.formatDate(instant, { year: 'numeric' })).toBe('2025');
    expect(utc.formatDate(instant, { year: 'numeric' })).toBe('2026');
    expect(formatAxisDate(new Date('invalid'), la)).toBe('');
  });

  it('defers runtime time zone lookup for numeric charts while preserving date defaults', () => {
    const instant = new Date('2026-01-01T01:00:00Z');
    const defaultFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric' });
    const formatDate = vi.spyOn(Intl, 'DateTimeFormat');
    try {
      const i18n = createChartI18n();
      expect(i18n.formatNumber(1234)).toBe('1,234');
      expect(formatDate).not.toHaveBeenCalled();
      expect(i18n.timeZone).toBe(defaultFormatter.resolvedOptions().timeZone);
      expect(i18n.formatDate(instant, { year: 'numeric' })).toBe(defaultFormatter.format(instant));
    } finally {
      formatDate.mockRestore();
    }
  });

  it('rejects invalid locale and time zone overrides before formatting', () => {
    expect(() => createChartI18n({ locale: 'invalid_locale' })).toThrow(RangeError);
    expect(() => createChartI18n({ timeZone: 'Invalid/TimeZone' })).toThrow(RangeError);
  });

  it('interpolates message names containing Unicode join controls', () => {
    const joiningKey = 'a\u200db';
    const nonJoiningKey = 'a\u200cb';
    const i18n = createChartI18n({
      messages: { loading: `{{ ${joiningKey} }} / {{ ${nonJoiningKey} }}` }
    });
    expect(i18n.message('loading', { [joiningKey]: 'join', [nonJoiningKey]: 'separate' }))
      .toBe('join / separate');
  });

  it('keeps logical text direction separate from physical SVG geometry', () => {
    expect(physicalTextAnchor('start', 'rtl')).toBe('end');
    expect(physicalTextAnchor('end', 'rtl')).toBe('start');
    expect(physicalTextAnchor('middle', 'rtl')).toBe('middle');
    expect(physicalTextAnchor('start', 'ltr')).toBe('start');
  });
});

describe('localized accessible chart content', () => {
  const engine = new AriaEngine();
  const bar: AriaItemDescriptor = {
    id: 'revenue', type: 'bar', index: 0, total: 2,
    seriesId: 'Umsatz', category: 'Januar', value: 1234.5, datum: {}
  };

  it('localizes default item sentences and roles but keeps numeric ARIA attributes machine readable', () => {
    const i18n = createChartI18n({ locale: 'de-DE', messages: {
      ariaBarCategory: '{{label}} für {{category}}: {{value}}', ariaRoleBar: 'Balken'
    } });
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    engine.decorateItem(element, bar, createDefaultAriaConfig(), {}, {}, i18n);
    expect(element.getAttribute('aria-label')).toBe('Umsatz für Januar: 1234,5');
    expect(element.getAttribute('aria-roledescription')).toBe('Balken');
    expect(element.getAttribute('aria-valuenow')).toBe('1234.5');
    expect(element.getAttribute('data-aria-id')).toBe('revenue');
  });

  it('localizes percentage templates and respects supplied formatted values and callbacks', () => {
    const ar = createChartI18n({ locale: 'ar-EG', direction: 'rtl' });
    const arc: AriaItemDescriptor = { id: 'A', type: 'arc', index: 0, datum: {}, value: 12.5, percentage: 12.5, formattedValue: 'Custom value' };
    const expectedPercent = ar.formatPercent(0.125, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
    expect(engine.interpolateAriaTemplate('{{formattedValue}} {{percentage}}', arc, ar)).toBe(`Custom value ${expectedPercent}`);
    expect(engine.buildDefaultItemLabel(arc, ar)).toBe(`A: Custom value (${expectedPercent})`);
    const callback = vi.fn(() => 'Localized callback');
    expect(engine.resolveItemLabel(bar, { ...createDefaultAriaConfig(), itemLabel: callback }, {}, ar)).toBe('Localized callback');
    expect(callback).toHaveBeenCalledWith(bar);
    const specific = vi.fn(() => 'Specific wins');
    expect(engine.resolveItemLabel(bar, { ...createDefaultAriaConfig(), itemLabel: callback }, { barAriaLabel: specific }, ar)).toBe('Specific wins');
    expect(specific).toHaveBeenCalledWith(bar);
  });

  it('translates accessible table headers and escapes translated and data content', () => {
    const i18n = createChartI18n({ locale: 'fr-FR', messages: {
      tableCaption: 'Données', tableSeries: 'Série & élément', tableCategory: 'Catégorie',
      tableValue: 'Valeur', tableSummary: 'Résumé', ariaRoleBar: 'barre'
    } });
    const html = engine.buildAccessibleDataTableHtml('', [{ item: { ...bar, category: undefined }, label: '<custom summary>' }], i18n);
    expect(html).toContain('<caption>Données</caption>');
    expect(html).toContain('Série &amp; élément');
    expect(html).toContain('Catégorie');
    expect(html).toContain('Valeur');
    expect(html).toContain('Résumé');
    expect(html).toContain('barre');
    expect(html).toContain('1234,5');
    expect(html).toContain('&lt;custom summary&gt;');
    expect(html).not.toContain('<custom summary>');
  });
});
