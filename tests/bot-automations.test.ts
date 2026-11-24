import { describe, it, expect } from 'vitest';
// @ts-expect-error -- untyped ESM GitHub Actions script
import { computeLabelsForFiles } from '../.github/scripts/auto-label-pr.mjs';
// @ts-expect-error -- untyped ESM GitHub Actions script
import { syncAiContextSchema } from '../.github/scripts/sync-ai-context.mjs';
// @ts-expect-error -- untyped ESM GitHub Actions script
import { buildLighthouseMarkdown } from '../.github/scripts/post-lighthouse-comment.mjs';

describe('GitHub Actions Bot Automations', () => {
  it('computes accurate area and chart:<name> PR labels from changed file paths', () => {
    const files = [
      'src/charts/mc-bar-chart.ts',
      'src/charts/mc-heatmap-chart.ts',
      'src/components/mc-legend.ts',
      'apps/studio/main.ts',
      'apps/context/charts.schema.json',
      '.github/workflows/ci.yml',
      'tests/bot-automations.test.ts',
    ];
    const labels = computeLabelsForFiles(files);
    expect(labels).toEqual([
      'ai-context',
      'chart:bar',
      'chart:heatmap',
      'ci',
      'core',
      'studio',
      'tests',
    ]);
  });

  it('verifies all 10 chart defaultLayers stay synchronized with apps/context/charts.schema.json', () => {
    const report = syncAiContextSchema({ writeChanges: false });
    expect(report.totalCharts).toBe(10);
    expect(report.inSync).toBe(true);
    expect(report.updatedCharts).toBe(0);
    expect(report.updatedChartIds).toEqual([]);
  });

  it('parses inline LHCI manifest JSON and formats 0-100 Lighthouse scores', () => {
    process.env.LHCI_MANIFEST_PATH = JSON.stringify([
      {
        url: 'http://localhost:40793/index.html',
        isRepresentativeRun: true,
        summary: {
          performance: 0.62,
          accessibility: 0.93,
          'best-practices': 0.96,
          seo: 0.9
        }
      }
    ]);
    process.env.LHCI_LINKS = JSON.stringify({
      'http://localhost:40793/index.html': 'https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/example.html'
    });
    const markdown = buildLighthouseMarkdown();
    expect(markdown).toContain('🟠 **62** / 100');
    expect(markdown).toContain('🟢 **93** / 100');
    expect(markdown).toContain('🟢 **96** / 100');
    expect(markdown).toContain('🟢 **90** / 100');
    expect(markdown).toContain('View Full Lighthouse HTML Report');
    delete process.env.LHCI_MANIFEST_PATH;
    delete process.env.LHCI_LINKS;
  });
});
