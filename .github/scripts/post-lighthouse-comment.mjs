#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const MARKER = '<!-- modern-charts-lighthouse-bot-report -->';

function scoreBadge(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return '⚪ N/A';
  const pct = Math.round(Number(score) * 100);
  const icon = pct >= 90 ? '🟢' : pct >= 50 ? '🟠' : '🔴';
  return `${icon} **${pct}** / 100`;
}

export function buildLighthouseMarkdown() {
  const rawManifestEnv = (process.env.LHCI_MANIFEST_PATH || '').trim();
  const manifestPath = '.lighthouseci/manifest.json';
  let summary = null;
  let reportUrl = '';

  if (process.env.LHCI_LINKS) {
    try {
      const linksObj = JSON.parse(process.env.LHCI_LINKS);
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

async function upsertLighthouseComment() {
  const body = buildLighthouseMarkdown();
  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repoFull || !eventPath || !existsSync(eventPath)) {
    console.log(body);
    return;
  }

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
    console.log(`Updated Lighthouse report comment #${existing.id} on PR #${prNumber}.`);
  } else {
    await fetch(`${apiBase}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body })
    });
    console.log(`Posted Lighthouse report comment on PR #${prNumber}.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  upsertLighthouseComment().catch((err) => {
    console.error('Failed to post Lighthouse comment:', err);
  });
}
