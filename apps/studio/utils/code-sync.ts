import type { ChartConfig, ThemeModePreference } from '../../../src/index';
import type { ChartAttributeSpec, ChartCatalogEntry } from '../catalog';
import { isUnsafePathKey, setByPath } from './object-path';

export function formatConfigAsJson(config: ChartConfig<any>): string {
  return JSON.stringify(
    config,
    (_key, value) => {
      if (typeof value === 'function') {
        return '[Function]';
      }
      return value;
    },
    2
  );
}

export function generateWebComponentHtmlSnippet(
  entry: ChartCatalogEntry,
  config: ChartConfig<any>,
  fallbackThemeMode: ThemeModePreference
): string {
  const themeMode = config.themeMode ?? fallbackThemeMode;
  const palette = config.palette ?? 'modern';
  const motion =
    typeof config.motionConfig === 'string' ? config.motionConfig : 'default';
  const labelMode = config.labelMode ?? 'svg';

  const lines: string[] = [
    `<!-- 1. Place the Web Component tag in HTML -->`,
    `<${entry.tagName}`,
    `  id="my-${entry.id}-chart"`,
    `  auto-size="${config.autoSize !== false}"`,
    `  theme-mode="${themeMode}"`,
    `  palette="${palette}"`,
    `  motion-config="${motion}"`,
    `  label-mode="${labelMode}"`,
    `  aria-label="${config.ariaLabel ?? entry.title}"`,
    `  is-focusable="${config.isFocusable !== false}"`,
    `></${entry.tagName}>`,
    ``,
    `<!-- 2. Or configure everything via a single Nivo-style chart.config object -->`,
    `<script type="module">`,
    `  import { registerModernCharts } from 'modern-charts';`,
    `  registerModernCharts();`,
    ``,
    `  const chart = document.getElementById('my-${entry.id}-chart');`,
    `  chart.config = ${formatConfigAsJson(config)
      .split('\n')
      .map((l, idx) => (idx === 0 ? l : `  ${l}`))
      .join('\n')};`,
    `</script>`
  ];
  return lines.join('\n');
}

export function restoreSerializedFunctions(parsed: any, prev: any): any {
  if (parsed === '[Function]' && typeof prev === 'function') {
    return prev;
  }
  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) =>
      restoreSerializedFunctions(item, Array.isArray(prev) ? prev[idx] : undefined)
    );
  }
  if (parsed && typeof parsed === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(parsed)) {
      if (isUnsafePathKey(key)) continue;
      const prevVal =
        prev &&
        typeof prev === 'object' &&
        Object.prototype.hasOwnProperty.call(prev, key)
          ? prev[key]
          : undefined;
      out[key] = restoreSerializedFunctions(parsed[key], prevVal);
    }
    return out;
  }
  return parsed;
}

export function extractChartConfigJson(markup: string): string | null {
  const assignMatch = /\bchart\.config\s*=\s*\{/.exec(markup);
  if (!assignMatch) return null;
  const startIdx = assignMatch.index + assignMatch[0].length - 1;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < markup.length; i++) {
    const ch = markup[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return markup.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

export function extractTagAttributes(
  markup: string,
  tagName: string
): Record<string, string> {
  const attrs: Record<string, string> = {};
  const lower = markup.toLowerCase();
  const openToken = `<${tagName.toLowerCase()}`;
  let idx = lower.indexOf(openToken);
  while (idx !== -1) {
    const nextCh = lower[idx + openToken.length];
    if (!nextCh || /\s|>|\//.test(nextCh)) {
      break;
    }
    idx = lower.indexOf(openToken, idx + openToken.length);
  }
  if (idx === -1) return attrs;

  let i = idx + openToken.length;
  const len = markup.length;
  while (i < len) {
    while (i < len && /\s/.test(markup[i])) i++;
    if (i >= len || markup[i] === '>' || markup[i] === '/') break;

    const nameStart = i;
    while (i < len && !/[\s=/>]/.test(markup[i])) i++;
    const name = markup.slice(nameStart, i).toLowerCase();
    if (!name) break;

    while (i < len && /\s/.test(markup[i])) i++;
    if (markup[i] !== '=') {
      if (!isUnsafePathKey(name)) attrs[name] = 'true';
      continue;
    }
    i++;
    while (i < len && /\s/.test(markup[i])) i++;

    let val = '';
    const quote = markup[i];
    if (quote === '"' || quote === "'") {
      i++;
      const valStart = i;
      while (i < len && markup[i] !== quote) i++;
      val = markup.slice(valStart, i);
      if (i < len) i++;
    } else {
      const valStart = i;
      while (i < len && !/[\s>]/.test(markup[i])) i++;
      val = markup.slice(valStart, i);
    }

    if (!isUnsafePathKey(name)) {
      attrs[name] = val;
    }
  }
  return attrs;
}

const STANDARD_HTML_ATTR_TO_CONFIG: Record<
  string,
  { path: string; type: 'boolean' | 'string' }
> = {
  'auto-size': { path: 'autoSize', type: 'boolean' },
  'theme-mode': { path: 'themeMode', type: 'string' },
  palette: { path: 'palette', type: 'string' },
  'motion-config': { path: 'motionConfig', type: 'string' },
  'label-mode': { path: 'labelMode', type: 'string' },
  'aria-label': { path: 'ariaLabel', type: 'string' },
  'is-focusable': { path: 'isFocusable', type: 'boolean' }
};

export function applyHtmlAttributeToConfig(
  targetConfig: ChartConfig<any>,
  attrName: string,
  rawVal: string,
  allAttributes: ChartAttributeSpec[]
): void {
  const std = STANDARD_HTML_ATTR_TO_CONFIG[attrName];
  if (std) {
    const coerced =
      std.type === 'boolean' ? rawVal !== 'false' && rawVal !== '0' : rawVal;
    setByPath(targetConfig, std.path, coerced);
    return;
  }

  const spec = allAttributes.find(
    (s) => s.attrName && s.attrName.toLowerCase() === attrName
  );
  if (!spec || spec.configPath.startsWith('__')) return;

  if (spec.control === 'boolean') {
    setByPath(
      targetConfig,
      spec.configPath,
      rawVal !== 'false' && rawVal !== '0'
    );
  } else if (spec.control === 'number' || spec.control === 'range') {
    const trimmed = rawVal.trim();
    if (trimmed === '' || trimmed === 'auto') {
      setByPath(targetConfig, spec.configPath, 'auto');
    } else {
      const n = Number(trimmed);
      if (!Number.isNaN(n)) setByPath(targetConfig, spec.configPath, n);
    }
  } else {
    setByPath(targetConfig, spec.configPath, rawVal);
  }
}
