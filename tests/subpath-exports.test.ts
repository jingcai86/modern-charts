import { describe, it, expect, beforeEach } from 'vitest';
import pkg from '../package.json';
import {
  BAR_COMPONENT_REGISTRY,
  MCBarChart,
  registerBarChart
} from '../src/entries/bar';
import { CORE_COMPONENT_REGISTRY } from '../src/core/registry';
import { SAMPLE_BAR_DATA } from '../apps/sample-data';

const ALL_CHART_SUBPATHS = [
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
  dirname: (p: string) => string;
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
    dirname: path.dirname,
    cwd
  };
}

describe('Per-chart standalone subpath exports & scoped registration (Issue #11)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('registers ONLY <mc-bar-chart>, <mc-bar-item>, and shared core components when importing modern-charts/bar', () => {
    // Expected bar + core components ARE registered
    for (const tag of Object.keys(CORE_COMPONENT_REGISTRY)) {
      expect(customElements.get(tag)).toBeDefined();
    }
    expect(customElements.get('mc-bar-chart')).toBe(MCBarChart);
    expect(customElements.get('mc-bar-item')).toBeDefined();

    // Unrelated chart components MUST NOT be registered
    const unrelatedChartTags = [
      'mc-line-chart',
      'mc-pie-chart',
      'mc-heatmap-chart',
      'mc-radar-chart',
      'mc-sunburst-chart',
      'mc-sankey-chart',
      'mc-scatter-chart',
      'mc-treemap-chart',
      'mc-gauge-chart',
      'mc-line-item',
      'mc-point-item',
      'mc-arc-item',
      'mc-cell-item',
      'mc-radar-item',
      'mc-sankey-node-item',
      'mc-sankey-link-item',
      'mc-scatter-item'
    ];
    for (const tag of unrelatedChartTags) {
      expect(customElements.get(tag)).toBeUndefined();
    }

    // Calling registerBarChart again is idempotent
    expect(() => registerBarChart()).not.toThrow();
    expect(Object.keys(BAR_COMPONENT_REGISTRY)).toContain('mc-bar-chart');
    expect(Object.keys(BAR_COMPONENT_REGISTRY)).toContain('mc-bar-item');
    expect(Object.keys(BAR_COMPONENT_REGISTRY)).not.toContain('mc-pie-chart');
  });

  it('renders <mc-bar-chart> completely when imported standalone and exposes tree-shaken ctx.d3 helpers', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    let capturedD3: any = null;
    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      layers: [
        'grid',
        'axes',
        'bars',
        {
          name: 'd3-check',
          render: (ctx) => {
            capturedD3 = ctx.d3;
          }
        },
        'legends'
      ]
    };

    const rects = bar.shadowRoot?.querySelectorAll('.mc-bar-rect');
    expect(rects?.length).toBe(8);
    expect(capturedD3).not.toBeNull();
    expect(typeof capturedD3.select).toBe('function');
    expect(typeof capturedD3.scaleLinear).toBe('function');
    expect(typeof capturedD3.format).toBe('function');
  });

  it('exposes all per-chart and core subpath exports in package.json with matching types and import paths', async () => {
    const { existsSync, resolvePath, cwd } = await loadNodeHelpers();
    const exportsMap = pkg.exports as Record<
      string,
      string | { types: string; import: string }
    >;

    expect(exportsMap['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js'
    });
    expect(exportsMap['./core']).toEqual({
      types: './dist/entries/core.d.ts',
      import: './dist/core.js'
    });

    for (const chart of ALL_CHART_SUBPATHS) {
      expect(exportsMap[`./${chart}`]).toEqual({
        types: `./dist/entries/${chart}.d.ts`,
        import: `./dist/${chart}.js`
      });
      const entryPath = resolvePath(cwd, `src/entries/${chart}.ts`);
      expect(existsSync(entryPath)).toBe(true);
    }

    // sideEffects array includes entry files while allowing shared chunks to tree-shake
    expect(Array.isArray(pkg.sideEffects)).toBe(true);
    expect(pkg.sideEffects).toContain('./dist/index.js');
    expect(pkg.sideEffects).toContain('./dist/bar.js');
    expect(pkg.sideEffects).toContain('./dist/core.js');
  });

  it('emits isolated standalone dist bundles without pulling in unrelated charts (when dist/ is present)', async () => {
    const { existsSync, readFileSync, resolvePath, dirname, cwd } =
      await loadNodeHelpers();
    const barBundlePath = resolvePath(cwd, 'dist/bar.js');
    if (!existsSync(barBundlePath)) {
      return;
    }

    // Collect bar.js plus any local chunks it imports
    const visited = new Set<string>();
    const collectSource = (filePath: string): string => {
      if (visited.has(filePath) || !existsSync(filePath)) return '';
      visited.add(filePath);
      const code = readFileSync(filePath, 'utf-8');
      let combined = code;
      const importRegex = /from\s+["'](\.[^"']+)["']/g;
      for (const match of code.matchAll(importRegex)) {
        const nextPath = resolvePath(dirname(filePath), match[1]);
        combined += '\n' + collectSource(nextPath);
      }
      return combined;
    };

    const barGraphCode = collectSource(barBundlePath);
    expect(barGraphCode).toContain('mc-bar-chart');
    expect(barGraphCode).not.toContain('interpolateViridis');

    // Verify EVERY single standalone chart bundle (all 10) + core is isolated
    // and never pulls in any unrelated chart custom element
    const chartTagBySubpath: Record<string, string> = {
      bar: 'mc-bar-chart',
      line: 'mc-line-chart',
      pie: 'mc-pie-chart',
      heatmap: 'mc-heatmap-chart',
      radar: 'mc-radar-chart',
      sunburst: 'mc-sunburst-chart',
      sankey: 'mc-sankey-chart',
      scatter: 'mc-scatter-chart',
      treemap: 'mc-treemap-chart',
      gauge: 'mc-gauge-chart'
    };

    // Core bundle must not pull in ANY chart tag
    visited.clear();
    const coreCode = collectSource(resolvePath(cwd, 'dist/core.js'));
    for (const tag of Object.values(chartTagBySubpath)) {
      expect(coreCode).not.toContain(tag);
    }

    // Each of the 10 chart bundles contains ONLY its own chart tag and none of the other 9
    for (const subpath of ALL_CHART_SUBPATHS) {
      visited.clear();
      const graphCode = collectSource(resolvePath(cwd, `dist/${subpath}.js`));
      const ownTag = chartTagBySubpath[subpath];
      expect(graphCode).toContain(ownTag);
      for (const [otherSubpath, otherTag] of Object.entries(chartTagBySubpath)) {
        if (otherSubpath !== subpath) {
          expect(graphCode).not.toContain(otherTag);
        }
      }
      // Sequential color interpolators should only appear in heatmap (not other standalone charts)
      if (subpath !== 'heatmap') {
        expect(graphCode).not.toContain('interpolateViridis');
      }
    }

    // Verify declaration files exist for all subpaths
    for (const subpath of ['core', ...ALL_CHART_SUBPATHS]) {
      expect(existsSync(resolvePath(cwd, `dist/${subpath}.js`))).toBe(true);
      expect(
        existsSync(resolvePath(cwd, `dist/entries/${subpath}.d.ts`))
      ).toBe(true);
    }
  });
});
