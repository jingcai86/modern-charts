// @vitest-environment node

import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const entrypoints = {
  '.': () => import('../src/index'),
  './core': () => import('../src/entries/core'),
  './bar': () => import('../src/entries/bar'),
  './line': () => import('../src/entries/line'),
  './pie': () => import('../src/entries/pie'),
  './heatmap': () => import('../src/entries/heatmap'),
  './radar': () => import('../src/entries/radar'),
  './sunburst': () => import('../src/entries/sunburst'),
  './sankey': () => import('../src/entries/sankey'),
  './scatter': () => import('../src/entries/scatter'),
  './treemap': () => import('../src/entries/treemap'),
  './gauge': () => import('../src/entries/gauge')
};

describe('imports on the server', () => {
  it('covers every JavaScript package export', () => {
    const exportedSubpaths = Object.entries(pkg.exports)
      .filter(([, target]) => typeof target === 'object' && 'import' in target)
      .map(([subpath]) => subpath);

    expect(Object.keys(entrypoints).sort()).toEqual(exportedSubpaths.sort());
  });

  it.each(Object.entries(entrypoints))('imports %s without a DOM', async (_subpath, load) => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
    expect(typeof customElements).toBe('undefined');

    await expect(load()).resolves.toBeDefined();

    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
    expect(typeof customElements).toBe('undefined');
  });

  it('supports pure helpers and rejects chart construction on the server', async () => {
    const { formatGroupedNumber, createChartI18n, registerModernCharts } = await import('../src/index');
    const { MCBarChart } = await import('../src/entries/bar');

    expect(formatGroupedNumber(1234.5, createChartI18n({ locale: 'de-DE' }))).toBe('1.234,5');
    expect(() => registerModernCharts()).not.toThrow();
    expect(() => new MCBarChart()).toThrow('require a browser DOM');
  });
});
