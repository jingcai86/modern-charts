#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { upsertPrComment } from './upsert-pr-comment.mjs';

const MARKER = '<!-- modern-charts-lighthouse-bot-report -->';

function scoreBadge(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return '⚪ N/A';
  const pct = Math.round(Number(score) * 100);
  const icon = pct >= 90 ? '🟢' : pct >= 50 ? '🟠' : '🔴';
  return `${icon} **${pct}** / 100`;
}

export function buildLighthouseMarkdown(env = process.env) {
  const rawManifestEnv = (env.LHCI_MANIFEST_PATH || '').trim();
  const manifestPath = '.lighthouseci/manifest.json';
  let summary = null;
  let reportUrl = '';

  if (env.LHCI_LINKS) {
    try {
      const linksObj = JSON.parse(env.LHCI_LINKS);
      reportUrl = Object.values(linksObj)[0] || '';
    } catch {
      reportUrl = '';
    }
  }

  let manifest = null;
  if (rawManifestEnv.startsWith('[')) {
    try {
      manifest = JSON.parse(rawManifestEnv);
    } catch {
      manifest = null;
    }
  } else if (existsSync(rawManifestEnv || manifestPath)) {
    try {
      manifest = JSON.parse(
        readFileSync(rawManifestEnv || manifestPath, 'utf8')
      );
    } catch {
      manifest = null;
    }
  } else if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = null;
    }
  }

  const entry = Array.isArray(manifest) ? manifest[0] : null;
  if (entry?.summary) {
    summary = entry.summary;
  } else if (entry?.jsonPath && existsSync(entry.jsonPath)) {
    try {
      const lhr = JSON.parse(readFileSync(entry.jsonPath, 'utf8'));
      summary = {
        performance: lhr.categories?.performance?.score,
        accessibility: lhr.categories?.accessibility?.score,
        'best-practices': lhr.categories?.['best-practices']?.score,
        seo: lhr.categories?.seo?.score
      };
    } catch {
      // ignore parse errors
    }
  }

  const lines = [
    MARKER,
    '## 🔦 Lighthouse CI Audit Report',
    '',
    '| Category | Score | Threshold |',
    '| :--- | :--- | :--- |',
    `| **Performance** | ${scoreBadge(summary?.performance)} | Informational |`,
    `| **Accessibility** | ${scoreBadge(summary?.accessibility)} | \`>= 85\` |`,
    `| **Best Practices** | ${scoreBadge(summary?.['best-practices'])} | \`>= 85\` |`,
    `| **SEO** | ${scoreBadge(summary?.seo)} | Informational |`
  ];

  if (reportUrl) {
    lines.push('', `🔗 [View Full Lighthouse HTML Report](${reportUrl})`);
  }

  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  upsertPrComment(MARKER, buildLighthouseMarkdown()).catch(() => {
    console.error('Failed to post Lighthouse comment.');
  });
}
