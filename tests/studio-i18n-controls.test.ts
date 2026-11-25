import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHART_CATALOG,
  COMMON_ATTRIBUTES,
  getAllAttributesForChart
} from '../apps/studio/catalog';
import { createAttributePanel } from '../apps/studio/pages/chart-detail/attribute-panel';
import type { ChartVirtualState } from '../apps/studio/state/config-store';
import {
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';
import { getByPath } from '../apps/studio/utils/object-path';

describe('Studio chart internationalization controls', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes locale, time zone, and direction through config controls for every chart', () => {
    for (const entry of CHART_CATALOG) {
      const controls = getAllAttributesForChart(entry).filter((attribute) =>
        attribute.configPath.startsWith('i18n.')
      );
      expect(controls.map((attribute) => attribute.configPath)).toEqual([
        'i18n.locale',
        'i18n.timeZone',
        'i18n.direction'
      ]);
      expect(controls.every((attribute) => attribute.attrName === 'config only')).toBe(true);
    }
  });

  it('edits and clears localization settings without writing an empty time zone', () => {
    const entry = CHART_CATALOG.find((chart) => chart.id === 'line')!;
    const config = entry.createDefaultConfig('light');
    const onConfigChanged = vi.fn();
    const panel = createAttributePanel({
      entry,
      config,
      vState: {} as ChartVirtualState,
      allAttributes: COMMON_ATTRIBUTES.filter((attribute) =>
        attribute.configPath.startsWith('i18n.')
      ),
      onConfigChanged,
      onResetDefault: vi.fn()
    });
    document.body.appendChild(panel.element);

    const control = (path: string): HTMLInputElement | HTMLSelectElement => {
      const row = Array.from(panel.element.querySelectorAll('.attr-row')).find(
        (row) => row.querySelector('.attr-config-path')?.textContent === path
      );
      return row!.querySelector('input, select')!;
    };
    const locale = control('i18n.locale');
    const timeZone = control('i18n.timeZone');
    const direction = control('i18n.direction');
    expect(locale.value).toBe('en-US');
    expect(timeZone.value).toBe('');
    expect(direction.value).toBe('ltr');
    expect(getByPath(config, 'i18n')).toBeUndefined();
    expect(onConfigChanged).not.toHaveBeenCalled();

    locale.value = 'de-';
    locale.dispatchEvent(new Event('input'));
    expect(locale.validity.customError).toBe(true);
    expect(locale.getAttribute('aria-invalid')).toBe('true');
    expect(locale.validationMessage).toContain('valid locale');
    expect(getByPath(config, 'i18n')).toBeUndefined();
    expect(onConfigChanged).not.toHaveBeenCalled();

    locale.value = ' ar-EG ';
    locale.dispatchEvent(new Event('input'));
    expect(locale.validity.valid).toBe(true);
    expect(locale.hasAttribute('aria-invalid')).toBe(false);

    timeZone.value = 'Europe/B';
    timeZone.dispatchEvent(new Event('input'));
    expect(timeZone.validity.customError).toBe(true);
    expect(timeZone.validationMessage).toContain('valid IANA time zone');
    expect(getByPath(config, 'i18n.timeZone')).toBeUndefined();
    expect(onConfigChanged).toHaveBeenCalledTimes(1);
    timeZone.value = ' Asia/Tokyo ';
    timeZone.dispatchEvent(new Event('input'));
    direction.value = 'rtl';
    direction.dispatchEvent(new Event('change'));
    expect(getByPath(config, 'i18n')).toEqual({
      locale: 'ar-EG', timeZone: 'Asia/Tokyo', direction: 'rtl'
    });
    expect(onConfigChanged).toHaveBeenCalledTimes(3);
    expect(timeZone.validity.valid).toBe(true);
    expect(timeZone.hasAttribute('aria-invalid')).toBe(false);
    expect(parseConfigObjectLiteral(formatConfigAssignment(config)).i18n).toEqual(
      getByPath(config, 'i18n')
    );

    timeZone.value = '   ';
    timeZone.dispatchEvent(new Event('input'));
    expect(getByPath(config, 'i18n')).not.toHaveProperty('timeZone');
    expect(getByPath(config, 'i18n.locale')).toBe('ar-EG');

    locale.value = '';
    locale.dispatchEvent(new Event('input'));
    expect(getByPath(config, 'i18n')).not.toHaveProperty('locale');
    expect(getByPath(config, 'i18n.direction')).toBe('rtl');
    panel.syncAllControls();
    expect(locale.value).toBe('en-US');
    expect(timeZone.value).toBe('');
    expect(direction.value).toBe('rtl');
  });
});
