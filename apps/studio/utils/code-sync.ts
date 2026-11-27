import type { ChartConfig, ThemeModePreference } from '../../../src/index';
import type { ChartAttributeSpec, ChartCatalogEntry } from '../catalog';
import { isUnsafePathKey, setByPath } from './object-path';

const MAX_PARSE_DEPTH = 64;

const JS_IDENTIFIER_START = /^[$_\p{ID_Start}]$/u;
const JS_IDENTIFIER_PART = /^[$_\u200c\u200d\p{ID_Continue}]$/u;

function isJsIdentifierStart(code: number | undefined): boolean {
  return code !== undefined && JS_IDENTIFIER_START.test(String.fromCodePoint(code));
}

function isJsIdentifierPart(code: number | undefined): boolean {
  return code !== undefined && JS_IDENTIFIER_PART.test(String.fromCodePoint(code));
}

function isValidJsIdentifier(key: string): boolean {
  let first = true;
  for (const char of key) {
    const code = char.codePointAt(0);
    if (first ? !isJsIdentifierStart(code) : !isJsIdentifierPart(code)) {
      return false;
    }
    first = false;
  }
  return !first;
}

function formatJsString(str: string): string {
  let out = "'";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') out += '\\\\';
    else if (ch === "'") out += "\\'";
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\u2028') out += '\\u2028';
    else if (ch === '\u2029') out += '\\u2029';
    else out += ch;
  }
  return `${out}'`;
}

function isSimplePrimitive(val: unknown): boolean {
  return (
    val === null ||
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  );
}

type FormatCallback = (callback: Function) => string;

/**
 * Serializes a chart config as a JavaScript object literal.
 * By default, functions use a placeholder that restoreSerializedFunctions() can restore.
 */
export function formatConfigAsJsObject(
  value: unknown,
  indent = 0,
  formatCallback?: FormatCallback
): string {
  if (typeof value === 'function') {
    return formatCallback?.(value) ?? "'[Function]'";
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }
  if (typeof value === 'string') {
    return formatJsString(value);
  }

  const pad = ' '.repeat(indent);
  const nextPad = ' '.repeat(indent + 2);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 8 && value.every(isSimplePrimitive)) {
      const inline = `[${value
        .map((item) => formatConfigAsJsObject(item, 0))
        .join(', ')}]`;
      if (inline.length <= 72) {
        return inline;
      }
    }
    const items = value.map(
      (item) => `${nextPad}${formatConfigAsJsObject(item, indent + 2, formatCallback)}`
    );
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, val]) => !isUnsafePathKey(key) && val !== undefined
    );
    if (entries.length === 0) return '{}';
    const props = entries.map(([key, val]) => {
      const formattedKey = isValidJsIdentifier(key) ? key : formatJsString(key);
      return `${nextPad}${formattedKey}: ${formatConfigAsJsObject(val, indent + 2, formatCallback)}`;
    });
    return `{\n${props.join(',\n')}\n${pad}}`;
  }

  return 'null';
}

export function formatConfigAssignment(
  config: Record<string, any>,
  assignPrefix = 'chart.config =',
  formatCallback?: FormatCallback
): string {
  const body = formatConfigAsJsObject(config, 0, formatCallback);
  const trimmedPrefix = assignPrefix.trim();
  return trimmedPrefix ? `${trimmedPrefix} ${body};` : body;
}

/**
 * Pure, linear-time recursive-descent parser for JS config object literals
 * (e.g. `chart.config = { palette: 'shadcn', data: [...] };`).
 * Supports unquoted Unicode identifier keys, single/double-quoted strings, trailing commas,
 * and `//` or `/* *\/` comments — with zero `eval` or `new Function`.
 */
export function parseConfigObjectLiteral(
  source: string,
  readCallbacks?: (source: string, start: number) => ReadonlyMap<number, { value: unknown; end: number }>
): any {
  let pos = 0;
  const len = source.length;
  let callbacks: ReturnType<NonNullable<typeof readCallbacks>> | undefined;

  const isWs = (code: number): boolean =>
    code === 32 || code === 9 || code === 10 || code === 13 || code === 0xfeff;

  const skipWsAndComments = (): void => {
    while (pos < len) {
      const code = source.charCodeAt(pos);
      if (isWs(code)) {
        pos++;
        continue;
      }
      if (code === 47 && pos + 1 < len) {
        const next = source.charCodeAt(pos + 1);
        if (next === 47) {
          // Line comment //
          pos += 2;
          while (pos < len && source.charCodeAt(pos) !== 10 && source.charCodeAt(pos) !== 13) {
            pos++;
          }
          continue;
        }
        if (next === 42) {
          // Block comment /* ... */
          pos += 2;
          let closed = false;
          while (pos + 1 < len) {
            if (source.charCodeAt(pos) === 42 && source.charCodeAt(pos + 1) === 47) {
              pos += 2;
              closed = true;
              break;
            }
            pos++;
          }
          if (!closed) {
            throw new SyntaxError('Unterminated block comment');
          }
          continue;
        }
      }
      break;
    }
  };

  const readIdentifier = (): string => {
    const start = pos;
    const first = source.codePointAt(pos);
    if (!isJsIdentifierStart(first)) {
      return '';
    }
    pos += first! > 0xffff ? 2 : 1;
    while (pos < len) {
      const next = source.codePointAt(pos);
      if (!isJsIdentifierPart(next)) break;
      pos += next! > 0xffff ? 2 : 1;
    }
    return source.slice(start, pos);
  };

  const trySkipAssignmentPrefix = (): void => {
    skipWsAndComments();
    if (pos >= len || source[pos] === '{') return;

    const saved = pos;
    const first = readIdentifier();
    if (!first) {
      pos = saved;
      return;
    }

    // Support `export default { ... }`
    if (first === 'export') {
      skipWsAndComments();
      const second = readIdentifier();
      if (second === 'default') {
        skipWsAndComments();
        return;
      }
      pos = saved;
      return;
    }

    // Support `const config = { ... }`, `let cfg = { ... }`, `var cfg = { ... }`
    if (first === 'const' || first === 'let' || first === 'var') {
      skipWsAndComments();
      const varName = readIdentifier();
      if (!varName) {
        pos = saved;
        return;
      }
    } else {
      // Support `chart.config = { ... }` or `myChart.config = { ... }`
      while (pos < len && source[pos] === '.') {
        pos++;
        if (!readIdentifier()) {
          pos = saved;
          return;
        }
      }
    }

    skipWsAndComments();
    if (pos < len && source[pos] === '=') {
      pos++;
      skipWsAndComments();
      return;
    }

    pos = saved;
  };

  const parseString = (quote: string): string => {
    pos++; // skip opening quote
    let out = '';
    while (pos < len) {
      const ch = source[pos];
      if (ch === quote) {
        pos++;
        return out;
      }
      if (ch === '\n' || ch === '\r') {
        if (quote !== '`') {
          throw new SyntaxError('Unterminated string literal');
        }
        out += ch;
        pos++;
        continue;
      }
      if (ch === '\\') {
        pos++;
        if (pos >= len) {
          throw new SyntaxError('Unterminated escape sequence');
        }
        const esc = source[pos++];
        switch (esc) {
          case 'n':
            out += '\n';
            break;
          case 'r':
            out += '\r';
            break;
          case 't':
            out += '\t';
            break;
          case 'b':
            out += '\b';
            break;
          case 'f':
            out += '\f';
            break;
          case '0':
            out += '\0';
            break;
          case '\\':
            out += '\\';
            break;
          case "'":
            out += "'";
            break;
          case '"':
            out += '"';
            break;
          case '`':
            out += '`';
            break;
          case '/':
            out += '/';
            break;
          case 'u': {
            const hex = source.slice(pos, pos + 4);
            if (hex.length !== 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new SyntaxError('Invalid unicode escape sequence');
            }
            out += String.fromCharCode(Number.parseInt(hex, 16));
            pos += 4;
            break;
          }
          case 'x': {
            const hex = source.slice(pos, pos + 2);
            if (hex.length !== 2 || !/^[0-9a-fA-F]{2}$/.test(hex)) {
              throw new SyntaxError('Invalid hex escape sequence');
            }
            out += String.fromCharCode(Number.parseInt(hex, 16));
            pos += 2;
            break;
          }
          default:
            out += esc;
        }
        continue;
      }
      if (quote === '`' && ch === '$' && source[pos + 1] === '{') {
        throw new SyntaxError('Template interpolations (${...}) are not supported');
      }
      out += ch;
      pos++;
    }
    throw new SyntaxError('Unterminated string literal');
  };

  const parseNumber = (): number => {
    const start = pos;
    if (source[pos] === '-' || source[pos] === '+') pos++;
    let hasDigits = false;
    while (pos < len && source.charCodeAt(pos) >= 48 && source.charCodeAt(pos) <= 57) {
      hasDigits = true;
      pos++;
    }
    if (pos < len && source[pos] === '.') {
      pos++;
      while (pos < len && source.charCodeAt(pos) >= 48 && source.charCodeAt(pos) <= 57) {
        hasDigits = true;
        pos++;
      }
    }
    if (!hasDigits) {
      throw new SyntaxError(`Invalid number at position ${start}`);
    }
    if (pos < len && (source[pos] === 'e' || source[pos] === 'E')) {
      pos++;
      if (pos < len && (source[pos] === '+' || source[pos] === '-')) pos++;
      let expDigits = false;
      while (pos < len && source.charCodeAt(pos) >= 48 && source.charCodeAt(pos) <= 57) {
        expDigits = true;
        pos++;
      }
      if (!expDigits) {
        throw new SyntaxError(`Invalid exponent at position ${start}`);
      }
    }
    const raw = source.slice(start, pos);
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new SyntaxError(`Invalid numeric value "${raw}"`);
    }
    return num;
  };

  const parseArray = (depth: number): any[] => {
    if (depth > MAX_PARSE_DEPTH) {
      throw new SyntaxError('Config nesting depth exceeded');
    }
    pos++; // skip '['
    const arr: any[] = [];
    skipWsAndComments();
    if (pos < len && source[pos] === ']') {
      pos++;
      return arr;
    }
    while (pos < len) {
      skipWsAndComments();
      if (pos < len && source[pos] === ']') {
        // Trailing comma
        pos++;
        return arr;
      }
      arr.push(parseValue(depth + 1));
      skipWsAndComments();
      if (pos < len && source[pos] === ',') {
        pos++;
        continue;
      }
      if (pos < len && source[pos] === ']') {
        pos++;
        return arr;
      }
      throw new SyntaxError(`Expected ',' or ']' at position ${pos}`);
    }
    throw new SyntaxError("Unterminated array (missing ']')");
  };

  const parseObject = (depth: number): Record<string, any> => {
    if (depth > MAX_PARSE_DEPTH) {
      throw new SyntaxError('Config nesting depth exceeded');
    }
    pos++; // skip '{'
    const obj: Record<string, any> = {};
    skipWsAndComments();
    if (pos < len && source[pos] === '}') {
      pos++;
      return obj;
    }
    while (pos < len) {
      skipWsAndComments();
      if (pos < len && source[pos] === '}') {
        // Trailing comma
        pos++;
        return obj;
      }

      let key: string;
      const ch = source[pos];
      if (ch === '"' || ch === "'") {
        key = parseString(ch);
      } else if (isJsIdentifierStart(source.codePointAt(pos))) {
        key = readIdentifier();
      } else if (source.charCodeAt(pos) >= 48 && source.charCodeAt(pos) <= 57) {
        key = String(parseNumber());
      } else {
        throw new SyntaxError(`Expected property name at position ${pos}`);
      }

      skipWsAndComments();
      if (pos >= len || source[pos] !== ':') {
        throw new SyntaxError(`Expected ':' after property "${key}"`);
      }
      pos++; // skip ':'

      skipWsAndComments();
      const val = parseValue(depth + 1);
      if (!isUnsafePathKey(key)) {
        obj[key] = val;
      }

      skipWsAndComments();
      if (pos < len && source[pos] === ',') {
        pos++;
        continue;
      }
      if (pos < len && source[pos] === '}') {
        pos++;
        return obj;
      }
      throw new SyntaxError(`Expected ',' or '}' at position ${pos}`);
    }
    throw new SyntaxError("Unterminated object (missing '}')");
  };

  const parseValue = (depth: number): any => {
    skipWsAndComments();
    if (pos >= len) {
      throw new SyntaxError('Unexpected end of config');
    }
    const callback = callbacks?.get(pos);
    if (callback) {
      pos = callback.end;
      return callback.value;
    }
    const ch = source[pos];
    if (ch === '{') return parseObject(depth);
    if (ch === '[') return parseArray(depth);
    if (ch === '"' || ch === "'" || ch === '`') return parseString(ch);
    if (
      ch === '-' ||
      ch === '+' ||
      ch === '.' ||
      (ch >= '0' && ch <= '9')
    ) {
      return parseNumber();
    }
    if (isJsIdentifierStart(source.codePointAt(pos))) {
      const word = readIdentifier();
      if (word === 'true') return true;
      if (word === 'false') return false;
      if (word === 'null') return null;
      if (word === 'undefined') return undefined;
      throw new SyntaxError(`Unexpected identifier "${word}"`);
    }
    throw new SyntaxError(`Unexpected token "${ch}" at position ${pos}`);
  };

  trySkipAssignmentPrefix();
  skipWsAndComments();
  callbacks = readCallbacks?.(source, pos);
  const result = parseValue(0);
  skipWsAndComments();
  if (pos < len && source[pos] === ';') {
    pos++;
    skipWsAndComments();
  }
  if (pos < len) {
    throw new SyntaxError(`Unexpected trailing token "${source[pos]}" at position ${pos}`);
  }
  return result;
}

export function generateWebComponentHtmlSnippet(
  entry: ChartCatalogEntry,
  config: ChartConfig<any>,
  fallbackThemeMode: ThemeModePreference
): string {
  const themeMode = config.themeMode ?? fallbackThemeMode;
  const palette = config.palette ?? 'shadcn';
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
    `  is-interactive="${config.isInteractive !== false}"`,
    `  is-focusable="${config.isFocusable !== false}"`,
    `></${entry.tagName}>`,
    ``,
    `<!-- 2. Or configure everything via a single chart.config object -->`,
    `<script type="module">`,
    `  import { registerModernCharts } from 'modern-charts';`,
    `  registerModernCharts();`,
    ``,
    `  const chart = document.getElementById('my-${entry.id}-chart');`,
    `  chart.config = ${formatConfigAsJsObject(config)
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

/**
 * Finds the `{ ... }` object literal assigned to `chart.config` and its end offset in the source.
 * Safely skips single-quoted, double-quoted, and template strings as well as `//` and `/* *\/` comments.
 */
export function findChartConfigBlock(markup: string): { literal: string; end: number } | null {
  const assignMatch = /\bchart\.config\s*=\s*\{/.exec(markup);
  if (!assignMatch) return null;
  const startIdx = assignMatch.index + assignMatch[0].length - 1;

  let depth = 0;
  let quoteChar: string | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = startIdx; i < markup.length; i++) {
    const ch = markup[i];
    const next = markup[i + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (quoteChar !== null) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quoteChar) {
        quoteChar = null;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quoteChar = ch;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const end = i + 1;
        return { literal: markup.slice(startIdx, end), end };
      }
    }
  }
  return null;
}

export function extractChartConfigBlock(markup: string): string | null {
  return findChartConfigBlock(markup)?.literal ?? null;
}

export function extractTagAttributes(
  markup: string,
  tagName: string
): Record<string, string> {
  const attrs: Record<string, string> = {};
  // HTML tag names fold ASCII only; Unicode case conversion can change source offsets.
  const lower = markup.replace(/[A-Z]/g, (char) => char.toLowerCase());
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
  'is-interactive': { path: 'isInteractive', type: 'boolean' },
  'is-focusable': { path: 'isFocusable', type: 'boolean' },
  selectable: { path: 'selection.enabled', type: 'boolean' },
  'selection-mode': { path: 'selection.mode', type: 'string' }
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
