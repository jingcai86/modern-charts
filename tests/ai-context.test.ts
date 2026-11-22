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

  it('ships complete AI context files in context/ and exposes them in package.json', async () => {
    const { existsSync, readFileSync, resolvePath, cwd } =
      await loadNodeHelpers();

    // Core AI context files
    for (const relPath of [
      'context/README.md',
      'context/llms.txt',
      'context/llms-full.txt',
      'context/architecture.md',
      'context/charts.schema.json'
    ]) {
      expect(existsSync(resolvePath(cwd, relPath))).toBe(true);
    }

    // Per-chart markdown specs for all 10 charts
    const llmsTxt = readFileSync(resolvePath(cwd, 'context/llms.txt'), 'utf-8');
    const llmsFull = readFileSync(
      resolvePath(cwd, 'context/llms-full.txt'),
      'utf-8'
    );

    for (const chartId of ALL_CHARTS) {
      const mdPath = resolvePath(cwd, `context/charts/${chartId}.md`);
      expect(existsSync(mdPath)).toBe(true);
      const md = readFileSync(mdPath, 'utf-8');
      expect(md).toContain(`<mc-${chartId}-chart>`);
      expect(md).toContain(`modern-charts/${chartId}`);
      expect(llmsTxt).toContain(`mc-${chartId}-chart`);
      expect(llmsFull).toContain(`# \`<mc-${chartId}-chart>\``);
    }

    // Shipped in npm package files and exports
    expect(pkg.files).toContain('context');
    const exportsMap = pkg.exports as Record<string, any>;
    expect(exportsMap['./context/schema']).toBe('./context/charts.schema.json');
    expect(exportsMap['./context/*']).toBe('./context/*');
  });

  it('validates charts.schema.json against every registered chart and renders every minimalConfig without error', async () => {
    const { readFileSync, resolvePath, cwd } = await loadNodeHelpers();
    const schema = JSON.parse(
      readFileSync(resolvePath(cwd, 'context/charts.schema.json'), 'utf-8')
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
