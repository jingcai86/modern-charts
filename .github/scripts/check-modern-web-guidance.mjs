#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let rawOutput = '';
try {
  rawOutput = execSync('npx -y modern-web-guidance@latest legacy-scan . --json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch (err) {
  rawOutput = err?.stdout ? String(err.stdout) : '';
}

const jsonStart = rawOutput.indexOf('{');
const report =
  jsonStart >= 0
    ? JSON.parse(rawOutput.slice(jsonStart))
    : { totalFindings: 0, filesScanned: 0, findings: [] };

const nestedFindings = Array.isArray(report.guides)
  ? report.guides.flatMap((g) =>
      Array.isArray(g.rules)
        ? g.rules.flatMap((r) =>
            Array.isArray(r.findings)
              ? r.findings.map((f) => ({
                  ...f,
                  ruleId: r.ruleId,
                  guideId: g.guideId
                }))
              : []
          )
        : []
    )
  : [];

const findings = Array.isArray(report.findings)
  ? report.findings
  : nestedFindings;
const totalFindings = Number(report.totalFindings ?? findings.length);
const filesScanned = Number(
  report.scannedFileCount ?? report.filesScanned ?? 0
);

for (const f of findings) {
  const file = f.file || f.path || 'unknown';
  const line = f.line || 1;
  const msg = f.message || f.ruleId || 'Legacy web pattern detected';
  console.log(`::error file=${file},line=${line}::[modern-web-guidance] ${msg}`);
}

writeFileSync(
  'mwg-report.json',
  JSON.stringify(
    {
      totalFindings,
      filesScanned,
      findings
    },
    null,
    2
  )
);

console.log(
  `[modern-web-guidance] Scanned ${filesScanned} files — ${totalFindings} findings.`
);

if (totalFindings > 0) {
  process.exit(1);
}
