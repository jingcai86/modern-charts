import type { ChartCatalogEntry } from './catalog';
import { configureChartFeatures } from '../../src/core/features';

const chartModules = new Map<string, () => Promise<unknown>>([
  ['line', () => import('../../src/entries/line')],
  ['bar', () => import('../../src/entries/bar')],
  ['pie', () => import('../../src/entries/pie')],
  ['heatmap', () => import('../../src/entries/heatmap')],
  ['radar', () => import('../../src/entries/radar')],
  ['sunburst', () => import('../../src/entries/sunburst')],
  ['sankey', () => import('../../src/entries/sankey')],
  ['scatter', () => import('../../src/entries/scatter')],
  ['treemap', () => import('../../src/entries/treemap')],
  ['gauge', () => import('../../src/entries/gauge')]
]);
const loading = new Map<string, Promise<void>>();

/** Share a pending chart import between its preview and playground. */
export function loadChart(entry: ChartCatalogEntry): Promise<void> {
  void configureChartFeatures({ features: { zoom: true, csvExport: true } });
  if (customElements.get(entry.tagName)) return Promise.resolve();
  const pending = loading.get(entry.id);
  if (pending) return pending;

  const importModule = chartModules.get(entry.id);
  if (!importModule) return Promise.reject(new Error(`Unknown chart: ${entry.id}`));

  const result = Promise.all([
    importModule(),
    configureChartFeatures({ features: { zoom: true, csvExport: true } })
  ]).then(() => {
    if (!customElements.get(entry.tagName)) {
      throw new Error(`Chart module did not register ${entry.tagName}`);
    }
  }).finally(() => loading.delete(entry.id));
  loading.set(entry.id, result);
  return result;
}
