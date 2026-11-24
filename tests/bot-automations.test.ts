import { describe, it, expect } from 'vitest';
// @ts-expect-error -- untyped ESM GitHub Actions script
import { computeLabelsForFiles } from '../.github/scripts/auto-label-pr.mjs';
// @ts-expect-error -- untyped ESM GitHub Actions script
import { syncAiContextSchema } from '../.github/scripts/sync-ai-context.mjs';

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
});
