#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const LABEL_DEFINITIONS = {
  core: { color: '0284c7', description: 'Core engine, scales, labels, markers, legends, or base chart' },
  studio: { color: '7c3aed', description: 'Modern Charts Studio playground & interactive guides' },
  'ai-context': { color: '0d9488', description: 'AI Context schema and LLM documentation' },
  ci: { color: '475569', description: 'GitHub Actions workflows and CI/CD automation' },
  tests: { color: '16a34a', description: 'Unit and integration test suite' },
  'chart:bar': { color: '2563eb', description: '<mc-bar-chart> component, model, and layers' },
  'chart:line': { color: '2563eb', description: '<mc-line-chart> component, model, and layers' },
  'chart:pie': { color: '2563eb', description: '<mc-pie-chart> component, model, and layers' },
  'chart:scatter': { color: '2563eb', description: '<mc-scatter-chart> component, model, and layers' },
  'chart:radar': { color: '2563eb', description: '<mc-radar-chart> component, model, and layers' },
  'chart:heatmap': { color: '2563eb', description: '<mc-heatmap-chart> component, model, and layers' },
  'chart:sunburst': { color: '2563eb', description: '<mc-sunburst-chart> component, model, and layers' },
  'chart:treemap': { color: '2563eb', description: '<mc-treemap-chart> component, model, and layers' },
  'chart:sankey': { color: '2563eb', description: '<mc-sankey-chart> component, model, and layers' },
  'chart:gauge': { color: '2563eb', description: '<mc-gauge-chart> component, model, and layers' }
};

const CHART_NAMES = [
  'bar',
  'line',
  'pie',
  'scatter',
  'radar',
  'heatmap',
  'sunburst',
  'treemap',
  'sankey',
  'gauge'
];

export function computeLabelsForFiles(files) {
  const matched = new Set();
  for (const f of files) {
    if (f.startsWith('.github/')) matched.add('ci');
    if (f.startsWith('tests/')) matched.add('tests');
    if (f.startsWith('apps/studio/')) matched.add('studio');
    if (f.startsWith('apps/context/')) matched.add('ai-context');
    if (f.startsWith('src/core/') || f.startsWith('src/components/')) {
      matched.add('core');
    }
    for (const c of CHART_NAMES) {
      if (
        f.includes(`mc-${c}-chart`) ||
        f.includes(`/${c}.model.ts`) ||
        f.includes(`/${c}.layers.ts`) ||
        f.includes(`/${c}.item.ts`) ||
        f.includes(`/charts/${c}.ts`)
      ) {
        matched.add(`chart:${c}`);
      }
    }
  }
  return Array.from(matched).toSorted();
}

async function runAutoLabeler() {
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repoFull || !eventPath || !existsSync(eventPath)) return;

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const prNumber = event.pull_request?.number;
  if (!prNumber) return;

  const apiBase = `https://api.github.com/repos/${repoFull}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const filesRes = await fetch(
    `${apiBase}/pulls/${prNumber}/files?per_page=100`,
    { headers }
  );
  if (!filesRes.ok) return;
  const filesData = await filesRes.json();
  const filenames = Array.isArray(filesData)
    ? filesData.map((f) => f.filename).filter(Boolean)
    : [];

  const labels = computeLabelsForFiles(filenames);
  if (labels.length === 0) return;

  for (const label of labels) {
    const def = LABEL_DEFINITIONS[label];
    if (!def) continue;
    await fetch(`${apiBase}/labels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: label,
        color: def.color,
        description: def.description
      })
    }).catch(() => {});
  }

  await fetch(`${apiBase}/issues/${prNumber}/labels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ labels })
  });
  console.log(`Applied labels [${labels.join(', ')}] to PR #${prNumber}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAutoLabeler().catch((err) => {
    console.error('Failed to auto-label PR:', err);
  });
}
