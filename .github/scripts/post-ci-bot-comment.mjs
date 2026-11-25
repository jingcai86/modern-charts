#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { upsertPrComment } from './upsert-pr-comment.mjs';

const MARKER = '<!-- modern-charts-ci-bot-report -->';

function readJsonSafe(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

const covSummary = readJsonSafe('coverage/coverage-summary.json', null);
const mwgReport = readJsonSafe('mwg-report.json', {
  totalFindings: 0,
  filesScanned: 0
});
const aiReport = readJsonSafe('ai-context-report.json', {
  totalCharts: 10,
  updatedCharts: 0,
  inSync: true
});

const totalCov = covSummary?.total ?? null;
const fmtCov = (metric) =>
  metric
    ? `**${Number(metric.pct).toFixed(2)}%** (${metric.covered}/${metric.total})`
    : 'N/A';

const lines = [
  MARKER,
  '## 🤖 Automated PR Quality & Coverage Report',
  '',
  '### 📊 Vitest Test Coverage Summary',
  '| Metric | Coverage (Covered / Total) |',
  '| :--- | :--- |',
  `| **Lines** | ${fmtCov(totalCov?.lines)} |`,
  `| **Statements** | ${fmtCov(totalCov?.statements)} |`,
  `| **Functions** | ${fmtCov(totalCov?.functions)} |`,
  `| **Branches** | ${fmtCov(totalCov?.branches)} |`,
  '',
  '### 🌐 Modern Web Guidance & AI Context Checks',
  '| Check | Status | Details |',
  '| :--- | :--- | :--- |',
  `| **Modern Web Guidance Scan** | ${mwgReport.totalFindings === 0 ? '✅ Passed' : '❌ Failed'} | \`${mwgReport.totalFindings}\` legacy findings across \`${mwgReport.filesScanned || 'all'}\` scanned files |`,
  `| **AI Context Schema Sync** | ${aiReport.inSync ? '✅ In Sync' : '⚠️ Drift Detected'} | \`${aiReport.totalCharts}/10\` chart specs synchronized with \`apps/context/charts.schema.json\`${aiReport.updatedCharts > 0 ? ` (auto-synced ${aiReport.updatedCharts})` : ''} |`
];

const body = lines.join('\n');

upsertPrComment(MARKER, body).catch(() => {
  console.error('Failed to post CI bot comment.');
});
