import { readFileSync } from 'node:fs';

function readResults(path) {
  const results = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(results)) {
    throw new Error(results.error ?? `Expected Size Limit results in ${path}.`);
  }
  return new Map(results.map(result => [result.name, result]));
}

function formatBytes(bytes) {
  return bytes < 1000 ? `${bytes} B` : `${(bytes / 1000).toFixed(2)} kB`;
}

function formatChange(currentSize, baseSize) {
  if (baseSize === undefined || baseSize === 0) return 'new';
  const difference = currentSize - baseSize;
  if (difference === 0) return '0%';
  const percent = Math.ceil(Math.abs(difference) * 10000 / baseSize) / 100;
  return difference > 0 ? `+${percent}% 🔺` : `-${percent}% 🔽`;
}

function formatCell(current, base) {
  if (!current) return base ? 'Removed' : '—';
  if (current.size === undefined) return 'Unavailable';

  const size = formatBytes(current.size);
  const change = formatChange(current.size, base?.size);
  if (current.passed === false) {
    return `❌ **${size}** (${change}, limit ${formatBytes(current.sizeLimit)})`;
  }
  return `${size} (${change})`;
}

const base = readResults(process.argv[2]);
const current = readResults(process.argv[3]);
const entries = new Set(
  [...current.keys(), ...base.keys()].map(name => name.replace(/ \[(brotli|gzip)\]$/, ''))
);
const rows = [...entries].map(entry => {
  const brotli = `${entry} [brotli]`;
  const gzip = `${entry} [gzip]`;
  return `| ${entry.replaceAll('|', '\\|')} | ${formatCell(current.get(brotli), base.get(brotli))} | ${formatCell(current.get(gzip), base.get(gzip))} |`;
});

console.log([
  '## size-limit report 📦',
  '',
  '| Package entry | Brotli | gzip |',
  '| :--- | ---: | ---: |',
  ...rows
].join('\n'));
