import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('renders one size-limit row per package with independent compression deltas', () => {
  const directory = mkdtempSync(join(tmpdir(), 'modern-charts-size-test-'));
  const base = join(directory, 'base.json');
  const current = join(directory, 'current.json');
  try {
    writeFileSync(base, JSON.stringify([
      { name: 'Library [brotli]', size: 8_000 },
      { name: 'Library [gzip]', size: 10_000 },
      { name: 'Removed [gzip]', size: 3_500 }
    ]));
    writeFileSync(current, JSON.stringify([
      { name: 'Library [gzip]', size: 9_000, passed: true },
      { name: 'Added [brotli]', size: 3_000, passed: true },
      { name: 'Library [brotli]', size: 8_800, passed: false, sizeLimit: 8_500 }
    ]));

    const script = fileURLToPath(new URL('./render-size-limit-report.mjs', import.meta.url));
    const report = execFileSync(process.execPath, [script, base, current], { encoding: 'utf8' });

    assert.deepEqual(report.trim().split('\n'), [
      '## size-limit report 📦',
      '',
      '| Package entry | Brotli | gzip |',
      '| :--- | ---: | ---: |',
      '| Library | ❌ **8.80 kB** (+10% 🔺, limit 8.50 kB) | 9.00 kB (-10% 🔽) |',
      '| Added | 3.00 kB (new) | — |',
      '| Removed | — | Removed |'
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
