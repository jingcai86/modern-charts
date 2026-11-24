#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function syncAiContextSchema({ writeChanges = true } = {}) {
  const schemaPath = resolve('apps/context/charts.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

  const updatedCharts = [];
  const chartStatuses = [];

  for (const chart of schema.charts ?? []) {
    const chartFile = resolve(`src/charts/${chart.tag}.ts`);
    const src = readFileSync(chartFile, 'utf8');

    const layersMatch = src.match(
      /get\s+defaultLayers\(\)\s*:\s*string\[\]\s*\{\s*return\s*\[([\s\S]*?)\];/
    );
    if (layersMatch) {
      const parsedLayers = Array.from(
        layersMatch[1].matchAll(/['"]([^'"]+)['"]/g),
        (m) => m[1]
      );
      if (
        parsedLayers.length > 0 &&
        JSON.stringify(chart.defaultLayers) !== JSON.stringify(parsedLayers)
      ) {
        chart.defaultLayers = parsedLayers;
        updatedCharts.push(chart.id);
      }
    }

    chartStatuses.push({
      id: chart.id,
      tag: chart.tag,
      layersCount: chart.defaultLayers?.length ?? 0
    });
  }

  if (writeChanges && updatedCharts.length > 0) {
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
  }

  const report = {
    totalCharts: chartStatuses.length,
    updatedCharts: updatedCharts.length,
    updatedChartIds: updatedCharts,
    inSync: true,
    charts: chartStatuses
  };

  if (writeChanges) {
    writeFileSync('ai-context-report.json', JSON.stringify(report, null, 2));
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = syncAiContextSchema({ writeChanges: true });
  if (report.updatedCharts > 0) {
    console.log(
      `[sync-ai-context] Synchronized ${report.updatedCharts} chart definition(s) in apps/context/charts.schema.json.`
    );
  } else {
    console.log(
      `[sync-ai-context] All ${report.totalCharts} charts in apps/context/charts.schema.json are in sync.`
    );
  }
}
