import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('reports the full library from Size Limit in decimal kilobytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'modern-charts-release-notes-'));
  try {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ version: '0.1.2' }));
    const report = [
      { name: 'Standalone Bar chart (modern-charts/bar) [gzip]', size: 105200 },
      { name: 'Full library (modern-charts) [gzip]', size: 151900 },
      { name: 'Full library (modern-charts) [brotli]', size: 127086 }
    ];
    const script = fileURLToPath(new URL('./generate-release-notes.mjs', import.meta.url));
    execFileSync(process.execPath, [script], { cwd: directory, input: JSON.stringify(report) });

    const notes = readFileSync(join(directory, 'release-notes.md'), 'utf8');
    assert.ok(notes.includes('**Full library bundle with dependencies** — `127.09 kB` Brotli · `151.90 kB` gzip'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
