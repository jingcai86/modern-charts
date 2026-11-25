import {
  formatConfigAssignment,
  parseConfigObjectLiteral,
  restoreSerializedFunctions
} from '../utils/code-sync';
import { escapeHtml } from '../utils/html';
import { isUnsafePathKey } from '../utils/object-path';
import { GUIDES_CATALOG, type GuideId } from './types';

export { escapeHtml } from '../utils/html';

// ============================================================================
// Accessible Copy-Button Wiring (Invoker Commands + Fallback)
// ============================================================================
let copyWiringInstalled = false;
let copySnippetSeq = 0;
let lastCopyAnnouncement = '';
const copyTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function reportCopyResult(button: HTMLElement, ok: boolean): void {
  const tip = button.nextElementSibling as HTMLElement | null;
  const prevTimer = copyTimers.get(button);
  if (prevTimer) clearTimeout(prevTimer);

  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');

  let message = ok ? 'Copied' : 'Copy failed';
  // VoiceOver skips identical consecutive announcements from the same live region.
  if (message === lastCopyAnnouncement) message += '\u00A0';
  lastCopyAnnouncement = message;

  if (tip) tip.textContent = '';
  void button.offsetWidth;
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
  if (tip) {
    requestAnimationFrame(() => {
      tip.textContent = message;
    });
  }

  copyTimers.set(
    button,
    setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      if (tip) tip.textContent = '';
    }, 1800)
  );
}

async function copyTargetText(button: HTMLElement, target: HTMLElement): Promise<void> {
  const text = target.matches('input, textarea')
    ? (target as HTMLTextAreaElement).value
    : target.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    reportCopyResult(button, true);
  } catch {
    reportCopyResult(button, false);
  }
}

function ensureCopyWiring(): void {
  if (copyWiringInstalled || typeof document === 'undefined') return;
  copyWiringInstalled = true;

  if (typeof window !== 'undefined' && 'CommandEvent' in window) {
    document.addEventListener(
      'command',
      (event: Event) => {
        const ce = event as Event & {
          command?: string;
          source?: HTMLElement | null;
          target?: EventTarget | null;
        };
        if (
          ce.command === '--copy' &&
          ce.source instanceof HTMLElement &&
          ce.target instanceof HTMLElement
        ) {
          void copyTargetText(ce.source, ce.target);
        }
      },
      true
    );
  } else {
    document.addEventListener('click', (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const targetEl = event.target as HTMLElement | null;
      const button = targetEl?.closest?.(
        'button[command="--copy"]'
      ) as HTMLElement | null;
      if (!button) return;
      const forId = button.getAttribute('commandfor');
      if (!forId) return;
      const copyTarget = document.getElementById(forId);
      if (copyTarget) void copyTargetText(button, copyTarget);
    });
  }
}

function createCopyControl(targetId: string): HTMLElement {
  ensureCopyWiring();
  const wrap = document.createElement('span');
  wrap.className = 'guide-copy-wrap';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'guide-copy-btn';
  btn.setAttribute('command', '--copy');
  btn.setAttribute('commandfor', targetId);
  btn.textContent = 'Copy';

  // Keep status live region outside <button> so assistive tech reliably announces it.
  const status = document.createElement('span');
  status.className = 'guide-copy-status';
  status.setAttribute('role', 'status');

  wrap.append(btn, status);
  return wrap;
}

// ============================================================================
// Read-Only Reference Snippet (for framework integration snippets)
// ============================================================================
export function createCodeBlock(code: string, title = 'Code Example'): HTMLElement {
  const targetId = `guide-code-ref-${++copySnippetSeq}`;
  const wrap = document.createElement('div');
  wrap.className = 'guide-code-wrap';

  const header = document.createElement('div');
  header.className = 'guide-code-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'guide-code-title';
  titleEl.textContent = title;

  const actions = document.createElement('div');
  actions.className = 'guide-code-actions';
  actions.appendChild(createCopyControl(targetId));

  header.append(titleEl, actions);

  const pre = document.createElement('pre');
  pre.className = 'guide-code-pre';
  const codeEl = document.createElement('code');
  codeEl.id = targetId;
  codeEl.textContent = code.trim();
  pre.appendChild(codeEl);

  wrap.append(header, pre);
  return wrap;
}

// ============================================================================
// Base Live-Editable Code Editor Widget
// ============================================================================
export interface LiveCodeEditorOptions {
  title: string;
  initialValue: string;
  language?: 'config' | 'css' | 'html';
  hint?: string;
  onApply: (rawValue: string) => void | string;
  onReset?: () => void;
}

export interface LiveCodeEditorHandle {
  element: HTMLElement;
  textarea: HTMLTextAreaElement;
  setValue: (
    nextValue: string,
    opts?: { resetBaseline?: boolean; preserveFocus?: boolean }
  ) => void;
  setTitle: (nextTitle: string) => void;
  getValue: () => string;
  applyCurrent: () => void;
}

export function createLiveCodeEditor(
  options: LiveCodeEditorOptions
): LiveCodeEditorHandle {
  const idBase = `guide-live-editor-${++copySnippetSeq}`;
  const textareaId = `${idBase}-input`;
  const errorId = `${idBase}-error`;
  const lang = (options.language ?? 'config').toUpperCase();
  const defaultHint =
    options.hint ??
    `Live editable ${lang} — changes reflect on the chart immediately.`;

  let baselineValue = options.initialValue.trim();

  const wrap = document.createElement('div');
  wrap.className = 'guide-code-wrap guide-code-wrap--live';

  const header = document.createElement('div');
  header.className = 'guide-code-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'guide-code-title-group';

  const badge = document.createElement('span');
  badge.className = 'guide-code-live-badge';
  badge.textContent = `LIVE ${lang}`;

  const titleEl = document.createElement('span');
  titleEl.className = 'guide-code-title';
  titleEl.textContent = options.title;

  titleGroup.append(badge, titleEl);

  const actions = document.createElement('div');
  actions.className = 'guide-code-actions';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'guide-reset-btn';
  resetBtn.textContent = '↺ Reset';
  resetBtn.title = 'Restore example default';

  actions.append(resetBtn, createCopyControl(textareaId));
  header.append(titleGroup, actions);

  const textarea = document.createElement('textarea');
  textarea.id = textareaId;
  textarea.className = 'guide-code-editor';
  textarea.spellcheck = false;
  textarea.setAttribute('aria-label', `Live editable ${options.title}`);
  textarea.setAttribute('aria-invalid', 'false');
  textarea.value = baselineValue;

  const footer = document.createElement('div');
  footer.className = 'guide-code-footer';

  const statusEl = document.createElement('div');
  statusEl.id = errorId;
  statusEl.className = 'guide-code-status';
  statusEl.textContent = defaultHint;
  footer.appendChild(statusEl);

  wrap.append(header, textarea, footer);

  const setErrorState = (errMsg: string | null) => {
    if (errMsg) {
      textarea.setAttribute('aria-invalid', 'true');
      textarea.setAttribute('aria-describedby', errorId);
      wrap.classList.add('guide-code-wrap--error');
      statusEl.classList.add('is-error');
      statusEl.textContent = errMsg;
    } else {
      textarea.setAttribute('aria-invalid', 'false');
      textarea.removeAttribute('aria-describedby');
      wrap.classList.remove('guide-code-wrap--error');
      statusEl.classList.remove('is-error');
      statusEl.textContent = defaultHint;
    }
  };

  const applyCurrent = () => {
    try {
      const maybeError = options.onApply(textarea.value);
      if (typeof maybeError === 'string' && maybeError.length > 0) {
        setErrorState(maybeError);
      } else {
        setErrorState(null);
      }
    } catch (err: any) {
      setErrorState(err?.message ? String(err.message) : 'Invalid input');
    }
  };

  textarea.addEventListener('input', applyCurrent);

  resetBtn.addEventListener('click', () => {
    if (options.onReset) {
      options.onReset();
      setErrorState(null);
      return;
    }
    textarea.value = baselineValue;
    applyCurrent();
  });

  return {
    element: wrap,
    textarea,
    setValue: (nextValue, opts = {}) => {
      const trimmed = nextValue.trim();
      if (opts.resetBaseline !== false) {
        baselineValue = trimmed;
      }
      if (opts.preserveFocus && document.activeElement === textarea) {
        return;
      }
      textarea.value = trimmed;
      setErrorState(null);
    },
    setTitle: (nextTitle) => {
      titleEl.textContent = nextTitle;
      textarea.setAttribute('aria-label', `Live editable ${nextTitle}`);
    },
    getValue: () => textarea.value,
    applyCurrent
  };
}

// ============================================================================
// Live JS Config Editor (preserves functions + named layer reordering)
// ============================================================================
function restoreGuideConfigFunctions(
  parsed: any,
  prev: any,
  layerRegistry?: Record<string, any>
): any {
  if (parsed === '[Function]' && typeof prev === 'function') {
    return prev;
  }
  if (Array.isArray(parsed)) {
    // Allow reordering named layer objects ({ name, render: "[Function]" }) or matching function layers by registry
    const prevNamedMap = new Map<string, any>();
    if (Array.isArray(prev)) {
      for (const entry of prev) {
        if (entry && typeof entry === 'object' && typeof entry.name === 'string') {
          prevNamedMap.set(entry.name, entry);
        }
      }
    }
    return parsed.map((item, idx) => {
      if (
        typeof item === 'string' &&
        layerRegistry &&
        Object.prototype.hasOwnProperty.call(layerRegistry, item)
      ) {
        return layerRegistry[item];
      }
      if (item && typeof item === 'object' && typeof item.name === 'string') {
        const matchedPrev =
          prevNamedMap.get(item.name) ??
          (layerRegistry && Object.prototype.hasOwnProperty.call(layerRegistry, item.name)
            ? layerRegistry[item.name]
            : undefined);
        if (matchedPrev) {
          return restoreGuideConfigFunctions(item, matchedPrev, layerRegistry);
        }
      }
      return restoreGuideConfigFunctions(
        item,
        Array.isArray(prev) ? prev[idx] : undefined,
        layerRegistry
      );
    });
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
      out[key] = restoreGuideConfigFunctions(parsed[key], prevVal, layerRegistry);
    }
    return out;
  }
  return parsed;
}

export interface LiveConfigEditorOptions<T extends Record<string, any> = Record<string, any>> {
  title: string;
  initialConfig: T;
  /** Assignment prefix displayed before the config object (default: `'chart.config ='`). */
  assignPrefix?: string;
  hint?: string;
  /** Optional map of layer names/tokens to live custom layer functions/objects so users can reorder or restore them in `layers[]`. */
  layerRegistry?: Record<string, any>;
  onConfigChange: (nextConfig: T) => void;
  onReset?: () => void;
}

export interface LiveConfigEditorHandle<T extends Record<string, any> = Record<string, any>>
  extends LiveCodeEditorHandle {
  syncConfig: (
    nextConfig: T,
    opts?: { resetBaseline?: boolean; preserveFocus?: boolean; title?: string }
  ) => void;
}

export function createLiveConfigEditor<T extends Record<string, any> = Record<string, any>>(
  options: LiveConfigEditorOptions<T>
): LiveConfigEditorHandle<T> {
  let activeConfig: T = options.initialConfig;
  const assignPrefix = options.assignPrefix ?? 'chart.config =';

  const editor = createLiveCodeEditor({
    title: options.title,
    language: 'config',
    initialValue: formatConfigAssignment(options.initialConfig, assignPrefix),
    hint:
      options.hint ??
      'Live editable chart.config — modify data, colors, labels, or options to update the chart immediately.',
    onReset: options.onReset,
    onApply: (rawValue) => {
      let parsed: any;
      try {
        parsed = parseConfigObjectLiteral(rawValue);
      } catch (err: any) {
        return `Waiting for valid chart.config: ${err?.message ?? 'Syntax error'}`;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return 'Config must be a JavaScript object ({ ... }).';
      }
      const restored = options.layerRegistry
        ? restoreGuideConfigFunctions(parsed, activeConfig, options.layerRegistry)
        : restoreSerializedFunctions(parsed, activeConfig);
      activeConfig = restored as T;
      options.onConfigChange(restored as T);
    }
  });

  return {
    ...editor,
    syncConfig: (nextConfig, opts = {}) => {
      activeConfig = nextConfig;
      if (opts.title) editor.setTitle(opts.title);
      editor.setValue(formatConfigAssignment(nextConfig, assignPrefix), {
        resetBaseline: opts.resetBaseline,
        preserveFocus: opts.preserveFocus
      });
    }
  };
}

// ============================================================================
// Live Scoped CSS Editor (Constructable CSSStyleSheet — zero innerHTML)
// ============================================================================
const scopedSheets = new Map<string, CSSStyleSheet>();

function getOrCreateAdoptedSheet(scopeKey: string): CSSStyleSheet | null {
  if (
    typeof CSSStyleSheet === 'undefined' ||
    !('replaceSync' in CSSStyleSheet.prototype) ||
    typeof document === 'undefined' ||
    !('adoptedStyleSheets' in document)
  ) {
    return null;
  }
  let sheet = scopedSheets.get(scopeKey);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    scopedSheets.set(scopeKey, sheet);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  return sheet;
}

export interface LiveCssEditorOptions {
  title: string;
  scopeKey: string;
  /** Selector written by user in the editor (e.g. `mc-bar-chart`). */
  hostSelector: string;
  /** Scoped selector targeting strictly this demo chart (e.g. `mc-bar-chart.guide-css-part-bar`). */
  scopedSelector: string;
  initialCss: string;
  hint?: string;
  onReset?: () => void;
}

export function createLiveCssEditor(
  options: LiveCssEditorOptions
): LiveCodeEditorHandle {
  const applyScopedCss = (rawCss: string): string | void => {
    // Reject obvious unbalanced braces while typing so partial edits fail gracefully
    let depth = 0;
    for (const ch of rawCss) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth < 0) return 'Waiting for valid CSS: unexpected "}"';
    }
    if (depth !== 0) return 'Waiting for valid CSS: unclosed "{" block';

    // Scope host selector occurrences (e.g. `mc-bar-chart` -> `mc-bar-chart.guide-css-part-bar`)
    const escapedHost = options.hostSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hostRegex = new RegExp(`(?<![\\w-])${escapedHost}(?![\\w-])`, 'g');
    const scopedCss = rawCss.replace(hostRegex, options.scopedSelector);

    const sheet = getOrCreateAdoptedSheet(options.scopeKey);
    if (sheet) {
      sheet.replaceSync(scopedCss);
    }
  };

  applyScopedCss(options.initialCss.trim());

  const editor = createLiveCodeEditor({
    title: options.title,
    language: 'css',
    initialValue: options.initialCss,
    hint:
      options.hint ??
      'Live editable CSS — edit ::part() or --mc-* variables to restyle the chart immediately.',
    onReset: options.onReset,
    onApply: applyScopedCss
  });

  return editor;
}

// ============================================================================
// Live Declarative Web Component HTML Editor (DOMParser + strict allowlist)
// ============================================================================
const SVG_NS = 'http://www.w3.org/2000/svg';

const SAFE_HTML_TAGS = new Set([
  'div',
  'span',
  'p',
  'strong',
  'em',
  'b',
  'i',
  'small',
  'br',
  'button',
  'mc-tooltip',
  'mc-def',
  'mc-label',
  'mc-truncate',
  'template'
]);

const SAFE_SVG_TAGS = new Set([
  'svg',
  'g',
  'rect',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'stop',
  'lineargradient',
  'radialgradient',
  'pattern'
]);

const SVG_CAMEL_TAGS: Record<string, string> = {
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient'
};

const SAFE_ATTR_NAMES = new Set([
  'slot',
  'style',
  'class',
  'id',
  'type',
  'role',
  'aria-hidden',
  'aria-label',
  // <mc-def>
  'def-id',
  'match',
  'colors',
  'angle',
  'size',
  'padding',
  'spacing',
  'rotation',
  'line-width',
  'stagger',
  'background',
  'color',
  'opacity',
  'width',
  'height',
  // <mc-tooltip>
  'offset-x',
  'offset-y',
  'position',
  'anchor-gap',
  'enabled',
  // <mc-label> / <mc-truncate>
  'for',
  'text',
  'format',
  'strategy',
  'max-width',
  'max-chars',
  'max-lines',
  'max-rotation',
  'ellipsis',
  'enable-tooltip',
  'font-size',
  'font-weight',
  'bg-color',
  'border-color',
  'border-radius',
  // SVG geometry attributes
  'd',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-opacity',
  'viewbox',
  'points',
  'transform',
  'offset',
  'stop-color',
  'stop-opacity'
]);

const SVG_CAMEL_ATTRS: Record<string, string> = {
  viewbox: 'viewBox'
};

function isSafeStyleValue(val: string): boolean {
  const lower = val.toLowerCase();
  return (
    !lower.includes('url(') &&
    !lower.includes('expression(') &&
    !lower.includes('javascript:') &&
    !lower.includes('@import')
  );
}

function cloneSanitizedNode(node: Node, inSvg = false): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const srcEl = node as Element;
  const tagLower = srcEl.tagName.toLowerCase();

  const isSvg = inSvg || tagLower === 'svg' || SAFE_SVG_TAGS.has(tagLower);
  if (!isSvg && !SAFE_HTML_TAGS.has(tagLower)) {
    return null;
  }
  if (isSvg && !SAFE_SVG_TAGS.has(tagLower)) {
    return null;
  }

  const targetEl = isSvg
    ? document.createElementNS(SVG_NS, SVG_CAMEL_TAGS[tagLower] ?? tagLower)
    : document.createElement(tagLower);

  for (const attr of Array.from(srcEl.attributes)) {
    const attrLower = attr.name.toLowerCase();
    if (attrLower.startsWith('on')) continue;
    const allowed =
      SAFE_ATTR_NAMES.has(attrLower) || attrLower.startsWith('data-');
    if (!allowed) continue;
    if (attrLower === 'style' && !isSafeStyleValue(attr.value)) continue;
    const outName = isSvg ? SVG_CAMEL_ATTRS[attrLower] ?? attrLower : attrLower;
    targetEl.setAttribute(outName, attr.value);
  }

  if (tagLower === 'template') {
    const srcTpl = srcEl as HTMLTemplateElement;
    const dstTpl = targetEl as HTMLTemplateElement;
    for (const child of Array.from(srcTpl.content.childNodes)) {
      const safeChild = cloneSanitizedNode(child, false);
      if (safeChild) dstTpl.content.appendChild(safeChild);
    }
    return dstTpl;
  }

  for (const child of Array.from(srcEl.childNodes)) {
    const safeChild = cloneSanitizedNode(child, isSvg);
    if (safeChild) targetEl.appendChild(safeChild);
  }
  return targetEl;
}

export interface ParsedSafeChartMarkup {
  chartAttrs: Record<string, string>;
  children: Node[];
}

export interface LiveHtmlEditorOptions {
  title: string;
  chartTag: string;
  initialMarkup: string;
  hint?: string;
  onMarkupApply: (parsed: ParsedSafeChartMarkup) => void | string;
  onReset?: () => void;
}

export function createLiveHtmlEditor(
  options: LiveHtmlEditorOptions
): LiveCodeEditorHandle {
  const applyMarkup = (rawMarkup: string): string | void => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawMarkup, 'text/html');
    const rootChart = doc.body.querySelector(options.chartTag);
    if (!rootChart) {
      return `Waiting for <${options.chartTag}> root element in markup.`;
    }

    const chartAttrs: Record<string, string> = {};
    for (const attr of Array.from(rootChart.attributes)) {
      const lower = attr.name.toLowerCase();
      if (lower.startsWith('on') || isUnsafePathKey(lower)) continue;
      chartAttrs[lower] = attr.value;
    }

    const children: Node[] = [];
    for (const child of Array.from(rootChart.childNodes)) {
      const safe = cloneSanitizedNode(child, false);
      if (safe) children.push(safe);
    }

    return options.onMarkupApply({ chartAttrs, children });
  };

  return createLiveCodeEditor({
    title: options.title,
    language: 'html',
    initialValue: options.initialMarkup,
    hint:
      options.hint ??
      `Live editable <${options.chartTag}> markup — changes reflect on the chart immediately.`,
    onReset: options.onReset,
    onApply: applyMarkup
  });
}

// ============================================================================
// Guide Hero Header
// ============================================================================
export function renderGuideHeader(activeId: GuideId): HTMLElement {
  const meta = GUIDES_CATALOG.find((g) => g.id === activeId)!;
  const header = document.createElement('section');
  header.className = 'guide-hero';

  header.innerHTML = `
    <div class="guide-hero-copy">
      <h1 class="guide-hero-title">${meta.icon} ${escapeHtml(meta.title)}</h1>
      <p class="guide-hero-summary">${escapeHtml(meta.summary)}</p>
    </div>
  `;
  return header;
}
