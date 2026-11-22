import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = process.env.RELEASE_VERSION || pkg.version;
const tag = process.env.RELEASE_TAG || `v${version}`;
const distTag = process.env.RELEASE_DIST_TAG || (version.includes('-') ? 'alpha' : 'latest');
const repo = process.env.GITHUB_REPOSITORY || 'jingcai86/modern-charts';
const outputPath = process.argv[2] || 'release-notes.md';

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// Find previous tag before the current tag (or HEAD)
const refBase = git(`rev-parse --verify --quiet ${tag}`) ? `${tag}^` : 'HEAD';
const prevTag = git(`describe --tags --abbrev=0 ${refBase}`);
const range = prevTag ? `${prevTag}..${git(`rev-parse --verify --quiet ${tag}`) ? tag : 'HEAD'}` : 'HEAD';

// Collect commits in range (exclude merge commits and release bump commits)
const rawLog = git(`log ${range} --no-merges --pretty=format:"%H%x1f%h%x1f%s%x1f%an"`);
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

// Compute bundle size info if dist/index.js is built
let bundleLine = '';
if (existsSync('dist/index.js')) {
  const raw = readFileSync('dist/index.js');
  const rawKb = (raw.length / 1024).toFixed(2);
  const gzipKb = (gzipSync(raw, { level: 9 }).length / 1024).toFixed(2);
  bundleLine = `- **Bundle Size (\`dist/index.js\`)**: \`${rawKb} kB\` (\`${gzipKb} kB\` gzipped)\n`;
}

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
