import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = process.env.RELEASE_VERSION || pkg.version;
const tag = process.env.RELEASE_TAG || `v${version}`;
const distTag = process.env.RELEASE_DIST_TAG || (version.includes('-') ? 'alpha' : 'latest');
const repo = process.env.GITHUB_REPOSITORY || 'jingcai86/modern-charts';
const outputPath = 'release-notes.md';

function git(...args) {
  try {
    return execFileSync('/usr/bin/git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

// Find previous tag before the current tag (or HEAD)
const taggedCommit = git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`);
const refBase = taggedCommit ? `${taggedCommit}^` : 'HEAD';
const prevTag = git('describe', '--tags', '--abbrev=0', refBase);
const range = prevTag ? `refs/tags/${prevTag}..${taggedCommit || 'HEAD'}` : 'HEAD';

// Collect commits in range (exclude merge commits and release bump commits)
const rawLog = git('log', '--no-merges', '--pretty=format:%H%x1f%h%x1f%s%x1f%an', range, '--');
const commits = rawLog
  ? rawLog
      .split('\n')
      .map((line) => {
        const [hash, shortHash, subject, author] = line.split('\x1f');
        return { hash, shortHash, subject: subject.trim(), author: author.trim() };
      })
      .filter((c) => !/^chore\(release\):/i.test(c.subject))
  : [];

const buckets = {
  breaking: [],
  features: [],
  fixes: [],
  docsUi: [],
  ciDeps: [],
  other: []
};

for (const c of commits) {
  const entry = `- ${c.subject} ([\`${c.shortHash}\`](https://github.com/${repo}/commit/${c.hash}))`;

  if (/^[a-z]+(\([^)]+\))?!:/i.test(c.subject) || /BREAKING CHANGE/i.test(c.subject)) {
    buckets.breaking.push(entry);
  } else if (/^feat(\([^)]+\))?:/i.test(c.subject)) {
    buckets.features.push(entry);
  } else if (/^fix(\([^)]+\))?:/i.test(c.subject)) {
    buckets.fixes.push(entry);
  } else if (/^(docs|style|refactor|perf)(\([^)]+\))?:/i.test(c.subject)) {
    buckets.docsUi.push(entry);
  } else if (/^(ci|chore|build|test)(\([^)]+\))?:/i.test(c.subject)) {
    buckets.ciDeps.push(entry);
  } else {
    buckets.other.push(entry);
  }
}

const sections = [
  ['#### 💥 Breaking Changes', buckets.breaking],
  ['#### 🚀 Features', buckets.features],
  ['#### 🐛 Bug Fixes', buckets.fixes],
  ['#### 🎨 UI, Theme & Docs', buckets.docsUi],
  ['#### ⚙️ CI, Tooling & Dependencies', buckets.ciDeps],
  ['#### 📦 Other Changes', buckets.other]
]
  .filter(([, items]) => items.length > 0)
  .map(([heading, items]) => `${heading}\n\n${items.join('\n')}`)
  .join('\n\n');

const sizeReport = JSON.parse(readFileSync(0, 'utf8'));
if (!Array.isArray(sizeReport)) throw new Error('Expected Size Limit measurements.');

function formatFullLibrarySize(compression) {
  const name = `Full library (modern-charts) [${compression}]`;
  const measurement = sizeReport.find((result) => result.name === name);
  if (!Number.isFinite(measurement?.size)) throw new Error(`Missing Size Limit measurement for ${name}.`);
  return `${(measurement.size / 1000).toFixed(2)} kB`;
}

const bundleLine = `- **Full library bundle with dependencies** — \`${formatFullLibrarySize('brotli')}\` Brotli · \`${formatFullLibrarySize('gzip')}\` gzip\n`;

const installCmd =
  distTag === 'latest'
    ? `npm install modern-charts`
    : `npm install modern-charts@${version}`;

const compareLine = prevTag
  ? `**Full Changelog**: https://github.com/${repo}/compare/${prevTag}...${tag}`
  : `**Tag**: https://github.com/${repo}/releases/tag/${tag}`;

const markdown = `## modern-charts \`${tag}\`

### 📦 Installation

\`\`\`bash
${installCmd}
\`\`\`

### 🔗 Links & Package Info
- **npm**: https://www.npmjs.com/package/modern-charts/v/${version}
- **Live Demo & Catalog**: https://jingcai86.github.io/modern-charts/
${bundleLine}- **Provenance**: Verified via GitHub Actions OIDC (Sigstore)

---

### 📋 What's Changed

${sections || '- Maintenance and release updates.'}

---

${compareLine}
`;

writeFileSync(outputPath, markdown, 'utf8');
console.log(`Generated release notes at ${outputPath}`);
