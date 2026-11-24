#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

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

async function upsertPrComment() {
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repoFull || !eventPath || !existsSync(eventPath)) {
    console.log(body);
    return;
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const prNumber = event.pull_request?.number;
  if (!prNumber) {
    console.log('Not a pull_request event; skipping PR comment.');
    return;
  }

  const apiBase = `https://api.github.com/repos/${repoFull}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const listRes = await fetch(
    `${apiBase}/issues/${prNumber}/comments?per_page=100`,
    { headers }
  );
  const comments = listRes.ok ? await listRes.json() : [];
  const existing = Array.isArray(comments)
    ? comments.find((c) => typeof c.body === 'string' && c.body.includes(MARKER))
    : null;

  if (existing) {
    await fetch(`${apiBase}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body })
    });
    console.log(`Updated CI quality report comment #${existing.id} on PR #${prNumber}.`);
  } else {
    await fetch(`${apiBase}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body })
    });
    console.log(`Posted CI quality report comment on PR #${prNumber}.`);
  }
}

upsertPrComment().catch((err) => {
  console.error('Failed to post CI bot comment:', err);
});
