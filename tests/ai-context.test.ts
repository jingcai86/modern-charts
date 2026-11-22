import { describe, it, expect, beforeEach } from 'vitest';
import pkg from '../package.json';
import { MCBaseChart, registerModernCharts } from '../src/index';

registerModernCharts();

const ALL_CHARTS = [
  'bar',
  'line',
  'pie',
  'heatmap',
  'radar',
  'sunburst',
  'sankey',
  'scatter',
  'treemap',
  'gauge'
] as const;

async function loadNodeHelpers(): Promise<{
  existsSync: (p: string) => boolean;
  readFileSync: (p: string, encoding: string) => string;
  resolvePath: (...parts: string[]) => string;
  cwd: string;
}> {
  const fsMod = 'node:fs';
  const pathMod = 'node:path';
  const [fs, path] = await Promise.all([
    import(/* @vite-ignore */ fsMod),
    import(/* @vite-ignore */ pathMod)
  ]);
  const cwd = (globalThis as any).process?.cwd?.() ?? '.';
  return {
    existsSync: fs.existsSync,
    readFileSync: fs.readFileSync,
    resolvePath: path.resolve,
    cwd
  };
}

describe('AI Context directory & LLM schema validation (Issue #17)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ships complete AI context files in apps/context/ and exposes them in package.json via dist/context/', async () => {
    const { existsSync, readFileSync, resolvePath, cwd } =
      await loadNodeHelpers();

    // Core AI context files
    for (const relPath of [
      'apps/context/README.md',
      'apps/context/llms.txt',
      'apps/context/llms-full.txt',
      'apps/context/architecture.md',
      'apps/context/charts.schema.json'
    ]) {
      expect(existsSync(resolvePath(cwd, relPath))).toBe(true);
    }

    // Per-chart markdown specs for all 10 charts
    const llmsTxt = readFileSync(
      resolvePath(cwd, 'apps/context/llms.txt'),
      'utf-8'
    );
    const llmsFull = readFileSync(
      resolvePath(cwd, 'apps/context/llms-full.txt'),
      'utf-8'
    );

    for (const chartId of ALL_CHARTS) {
      const mdPath = resolvePath(cwd, `apps/context/charts/${chartId}.md`);
      expect(existsSync(mdPath)).toBe(true);
      const md = readFileSync(mdPath, 'utf-8');
      expect(md).toContain(`<mc-${chartId}-chart>`);
      expect(md).toContain(`modern-charts/${chartId}`);
      expect(llmsTxt).toContain(`mc-${chartId}-chart`);
      expect(llmsFull).toContain(`# \`<mc-${chartId}-chart>\``);
    }

    // Shipped in npm package via dist/context/ (copied during `npm run build`)
    expect(pkg.files).toContain('dist');
    const exportsMap = pkg.exports as Record<string, any>;
    expect(exportsMap['./context/schema']).toBe(
      './dist/context/charts.schema.json'
    );
    expect(exportsMap['./context/*']).toBe('./dist/context/*');
  });

  it('validates charts.schema.json against every registered chart and renders every minimalConfig without error', async () => {
    const { readFileSync, resolvePath, cwd } = await loadNodeHelpers();
    const schema = JSON.parse(
      readFileSync(resolvePath(cwd, 'apps/context/charts.schema.json'), 'utf-8')
    );

    expect(Array.isArray(schema.charts)).toBe(true);
    expect(schema.charts.length).toBe(10);

    const exportsMap = pkg.exports as Record<string, any>;

    for (const spec of schema.charts) {
      expect(ALL_CHARTS).toContain(spec.id);
      expect(spec.tag).toBe(`mc-${spec.id}-chart`);
      expect(spec.subpath).toBe(`modern-charts/${spec.id}`);
      expect(exportsMap[`./${spec.id}`]).toBeDefined();

      // Instantiate the Web Component using ONLY the AI schema's tag & minimalConfig
      const el = document.createElement(spec.tag) as MCBaseChart<any>;
      document.body.appendChild(el);

      // Verify defaultLayers in AI context match the actual chart component implementation
      expect(spec.defaultLayers).toEqual(el.defaultLayers);

      // Render using the minimalConfig from context/charts.schema.json
      el.config = {
        ...spec.minimalConfig,
        width: 520,
        height: 320
      };

      const svg = el.shadowRoot?.querySelector('svg.mc-chart-svg');
      expect(svg).not.toBeNull();
      const renderedLayers = el.shadowRoot?.querySelectorAll('.mc-layer');
      expect(renderedLayers?.length).toBeGreaterThan(0);
    }
  });
});
