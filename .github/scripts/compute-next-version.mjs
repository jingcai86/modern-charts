import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Computes and optionally applies the next SemVer version for `modern-charts`.
 *
 * Pre-1.0 guard (`ALLOW_MAJOR = false` by default):
 * - Stays strictly in `0.x` so `auto`, `patch`, `minor`, and `prerelease` never
 *   accidentally jump to `1.0.0`.
 * - Switch `ALLOW_MAJOR` to `true` (or pass `--type=custom --custom=1.0.0`)
 *   whenever you are ready to graduate to standard `1.0.0+` SemVer.
 */
const DEFAULT_ALLOW_MAJOR = false;

function parseArgs(argv) {
  const opts = {
    type: 'patch',
    preid: 'none',
    custom: '',
    allowMajor: DEFAULT_ALLOW_MAJOR,
    write: false
  };
  for (const arg of argv) {
    if (arg.startsWith('--type=')) opts.type = arg.slice(7).trim();
    else if (arg.startsWith('--preid=')) opts.preid = arg.slice(8).trim() || 'none';
    else if (arg.startsWith('--custom=')) opts.custom = arg.slice(9).trim();
    else if (arg === '--allow-major' || arg === '--allow-major=true') opts.allowMajor = true;
    else if (arg === '--write') opts.write = true;
  }
  return opts;
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)\.(\d+))?$/.exec(version.trim());
  if (!match) {
    throw new Error(`Unsupported semver string: "${version}"`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    preid: match[4] ?? null,
    prenum: match[5] !== undefined ? Number(match[5]) : null
  };
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function detectAutoBumpFromCommits(current) {
  const lastTag = git('describe --tags --abbrev=0 --match "v*"');
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const rawLog = git(`log ${range} --no-merges --pretty=format:"%s%n%b%x1e"`);
  const entries = rawLog
    .split('\x1e')
    .map((s) => s.trim())
    .filter(Boolean);

  let hasBreaking = false;
  let hasFeat = false;
  for (const entry of entries) {
    const firstLine = entry.split('\n')[0] || '';
    if (/^[a-z]+(\([^)]+\))?!:/i.test(firstLine) || /BREAKING CHANGE:/i.test(entry)) {
      hasBreaking = true;
    } else if (/^feat(\([^)]+\))?:/i.test(firstLine)) {
      hasFeat = true;
    }
  }

  // If currently on a prerelease (e.g. 0.1.0-alpha.1), auto increments the prerelease counter
  if (current.preid !== null) {
    return 'prerelease';
  }
  if (hasBreaking) {
    return current.major === 0 ? 'minor' : 'major';
  }
  if (hasFeat) {
    return 'minor';
  }
  return 'patch';
}

function computeNextVersion(currentStr, opts) {
  const cur = parseSemver(currentStr);
  let bump = opts.type;
  const preid = opts.preid && opts.preid !== 'none' ? opts.preid : null;

  if (bump === 'custom') {
    const cleaned = opts.custom.replace(/^v/i, '').trim();
    if (!cleaned) {
      throw new Error('custom_version is required when release_type is "custom".');
    }
    parseSemver(cleaned);
    return cleaned;
  }

  if (bump === 'auto') {
    bump = detectAutoBumpFromCommits(cur);
  }

  if (bump === 'major' && !opts.allowMajor) {
    bump = 'minor';
  }

  switch (bump) {
    case 'prerelease': {
      const targetPreid = preid ?? cur.preid ?? 'alpha';
      if (cur.preid === targetPreid && cur.prenum !== null) {
        return `${cur.major}.${cur.minor}.${cur.patch}-${targetPreid}.${cur.prenum + 1}`;
      }
      if (cur.preid !== null) {
        return `${cur.major}.${cur.minor}.${cur.patch}-${targetPreid}.0`;
      }
      return `${cur.major}.${cur.minor}.${cur.patch + 1}-${targetPreid}.0`;
    }
    case 'patch': {
      if (preid) {
        // e.g. 0.1.0-alpha.1 + patch + alpha -> 0.1.0-alpha.2
        if (cur.preid === preid && cur.prenum !== null) {
          return `${cur.major}.${cur.minor}.${cur.patch}-${preid}.${cur.prenum + 1}`;
        }
        // e.g. 0.1.0-alpha.1 + patch + beta -> 0.1.0-beta.0
        if (cur.preid !== null) {
          return `${cur.major}.${cur.minor}.${cur.patch}-${preid}.0`;
        }
        // e.g. 0.1.0 + patch + alpha -> 0.1.1-alpha.0
        return `${cur.major}.${cur.minor}.${cur.patch + 1}-${preid}.0`;
      }
      // Stable patch: graduates prerelease (0.1.0-alpha.1 -> 0.1.0) or bumps patch (0.1.0 -> 0.1.1)
      if (cur.preid !== null) {
        return `${cur.major}.${cur.minor}.${cur.patch}`;
      }
      return `${cur.major}.${cur.minor}.${cur.patch + 1}`;
    }
    case 'minor': {
      if (preid) {
        return `${cur.major}.${cur.minor + 1}.0-${preid}.0`;
      }
      return `${cur.major}.${cur.minor + 1}.0`;
    }
    case 'major': {
      if (preid) {
        return `${cur.major + 1}.0.0-${preid}.0`;
      }
      return `${cur.major + 1}.0.0`;
    }
    default:
      throw new Error(`Unknown release_type "${opts.type}". Expected patch | minor | prerelease | auto | custom.`);
  }
}

function resolveDistTag(version) {
  if (version.includes('-alpha')) return 'alpha';
  if (version.includes('-beta')) return 'beta';
  if (version.includes('-rc')) return 'next';
  return 'latest';
}

function applyVersionFiles(nextVersion) {
  // 1. package.json
  const pkgRaw = readFileSync('package.json', 'utf8');
  const pkg = JSON.parse(pkgRaw);
  pkg.version = nextVersion;
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  // 2. package-lock.json (if present)
  if (existsSync('package-lock.json')) {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    lock.version = nextVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = nextVersion;
    }
    writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  }

  // 3. src/core/types.ts (keeps runtime VERSION export in sync with package.json)
  const typesPath = 'src/core/types.ts';
  if (existsSync(typesPath)) {
    const typesSrc = readFileSync(typesPath, 'utf8');
    const updated = typesSrc.replace(
      /export const VERSION = ['"][^'"]+['"];/,
      `export const VERSION = '${nextVersion}';`
    );
    if (updated === typesSrc) {
      throw new Error(`Failed to locate export const VERSION in ${typesPath}`);
    }
    writeFileSync(typesPath, updated, 'utf8');
  }
}

const opts = parseArgs(process.argv.slice(2));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const currentVersion = pkg.version;
const nextVersion = computeNextVersion(currentVersion, opts);
const nextTag = `v${nextVersion}`;
const distTag = resolveDistTag(nextVersion);

if (nextVersion === currentVersion) {
  throw new Error(`Computed version (${nextVersion}) is identical to current version (${currentVersion}).`);
}

if (git(`rev-parse --verify --quiet refs/tags/${nextTag}`)) {
  throw new Error(`Git tag "${nextTag}" already exists. Choose a different release_type or custom_version.`);
}

if (opts.write) {
  applyVersionFiles(nextVersion);
}

const summary = {
  currentVersion,
  nextVersion,
  tag: nextTag,
  distTag,
  prerelease: nextVersion.includes('-'),
  wroteFiles: opts.write
};

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `current_version=${currentVersion}`,
      `version=${nextVersion}`,
      `tag=${nextTag}`,
      `dist_tag=${distTag}`,
      `prerelease=${summary.prerelease}`
    ].join('\n') + '\n'
  );
}

console.log(JSON.stringify(summary, null, 2));
