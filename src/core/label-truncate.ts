import {
  layoutWithLines,
  measureNaturalWidth,
  prepareWithSegments,
  type PreparedTextWithSegments
} from '@chenglou/pretext';
import { rotatesOnOverflow } from './label-overflow';
import type {
  LabelDescriptor,
  LabelOverflowConfig,
  LabelOverflowStrategy,
  LabelStyleOverride,
  LabelTruncateResult,
  MeasuredLabelLine,
  ResolvedLabelOverflowConfig,
  TooltipConfig
} from './types';

export const DEFAULT_TRUNCATE_ELLIPSIS = '…';
export const DEFAULT_MAX_ROTATION = 45;

let canvasSupportChecked = false;

/**
 * Ensures 2D canvas `measureText` returns positive widths in headless test
 * environments (e.g. jsdom/happy-dom) so `@chenglou/pretext` measurements
 * remain accurate everywhere.
 */
export function ensureCanvasTextMeasurementSupport(): void {
  if (
    canvasSupportChecked ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof document === 'undefined'
  ) return;
  canvasSupportChecked = true;
  try {
    const probe = document.createElement('canvas');
    const ctx = probe.getContext?.('2d');
    if (ctx && typeof ctx.measureText === 'function') {
      const m = ctx.measureText('M');
      if (m && m.width > 0) return;
    }
  } catch {
    // Fallback below
  }

  const estimateWidth = (text: string, font: string): number => {
    const sizeMatch = font.match(/(?:^|\D)(\d+(?:\.\d+)?)px/);
    const fontSize = sizeMatch ? Number.parseFloat(sizeMatch[1]) : 12;
    let total = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (ch === ' ') total += fontSize * 0.32;
      else if ("ilI1|.,:;!'".includes(ch)) total += fontSize * 0.34;
      else if ('mwMW@%'.includes(ch)) total += fontSize * 0.82;
      else if (code > 0x2e80) total += fontSize * 1.0;
      else total += fontSize * 0.58;
    }
    return total;
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function (
    contextId: string,
    options?: any
  ) {
    const existing = origGetContext
      ? origGetContext.call(this, contextId as any, options)
      : null;
    if (contextId === '2d') {
      const ctx2d = existing as CanvasRenderingContext2D | null;
      if (ctx2d && typeof ctx2d.measureText === 'function') {
        const test = ctx2d.measureText('M');
        if (test && test.width > 0) return ctx2d;
      }
      const mockCtx: any = existing ?? { font: '12px sans-serif' };
      if (!mockCtx.font) mockCtx.font = '12px sans-serif';
      mockCtx.measureText = (str: string) => ({
        width: estimateWidth(
          String(str ?? ''),
          mockCtx.font || '12px sans-serif'
        )
      });
      return mockCtx;
    }
    return existing;
  };
}

ensureCanvasTextMeasurementSupport();

type GraphemeSegmenter = {
  segment(input: string): Iterable<{ segment: string }>;
};

let cachedSegmenter: GraphemeSegmenter | null | undefined;

/**
 * Splits a string into user-perceived grapheme clusters so Unicode emojis,
 * combining marks, and CJK characters are never sliced mid-glyph.
 */
export function splitGraphemes(text: string): string[] {
  if (!text) return [];
  if (cachedSegmenter === undefined) {
    const IntlAny = typeof Intl !== 'undefined' ? (Intl as any) : undefined;
    if (IntlAny && typeof IntlAny.Segmenter === 'function') {
      cachedSegmenter = new IntlAny.Segmenter(undefined, {
        granularity: 'grapheme'
      }) as GraphemeSegmenter;
    } else {
      cachedSegmenter = null;
    }
  }
  if (cachedSegmenter) {
    const out: string[] = [];
    for (const part of cachedSegmenter.segment(text)) {
      out.push(part.segment);
    }
    return out;
  }
  return Array.from(text);
}

/**
 * Normalizes a label overflow strategy string.
 */
export function normalizeOverflowStrategy(
  raw?: string | null
): LabelOverflowStrategy | undefined {
  if (!raw) return undefined;
  const lower = raw.trim().toLowerCase();
  if (
    lower === 'truncate' ||
    lower === 'rotate' ||
    lower === 'both' ||
    lower === 'wrap' ||
    lower === 'wrap-truncate' ||
    lower === 'rotate-wrap-truncate' ||
    lower === 'none'
  ) {
    return lower;
  }
  return undefined;
}

/**
 * Normalizes `LabelOverflowStrategy | LabelOverflowConfig` into a partial config object.
 */
export function normalizeOverflowInput(
  input?: LabelOverflowStrategy | LabelOverflowConfig
): Partial<LabelOverflowConfig> {
  if (!input) return {};
  if (typeof input === 'string') {
    const strategy = normalizeOverflowStrategy(input);
    return strategy ? { strategy } : {};
  }
  return { ...input };
}

/**
 * Resolves the effective overflow configuration from a `LabelDescriptor` or
 * `LabelStyleOverride`, defaulting strategy to `'truncate'`, `maxRotation` to `45`,
 * `ellipsis` to `'…'`, and `enableTooltip` to `true`.
 */
export function resolveLabelOverflowConfig(
  source: Partial<LabelDescriptor | LabelStyleOverride> = {}
): ResolvedLabelOverflowConfig {
  const fromOverflow = normalizeOverflowInput(source.overflow);

  const strategy: LabelOverflowStrategy =
    normalizeOverflowStrategy(fromOverflow.strategy) ?? 'truncate';

  const maxWidth =
    source.maxWidth !== undefined ? source.maxWidth : fromOverflow.maxWidth;
  const maxChars =
    source.maxChars !== undefined ? source.maxChars : fromOverflow.maxChars;
  const maxLines =
    source.maxLines !== undefined ? source.maxLines : fromOverflow.maxLines;
  const ellipsis =
    source.ellipsis !== undefined
      ? source.ellipsis
      : fromOverflow.ellipsis !== undefined
      ? fromOverflow.ellipsis
      : DEFAULT_TRUNCATE_ELLIPSIS;

  const rawMaxRotation =
    source.maxRotation !== undefined
      ? source.maxRotation
      : fromOverflow.maxRotation;
  const maxRotation =
    rawMaxRotation !== undefined && Number.isFinite(rawMaxRotation)
      ? rawMaxRotation
      : DEFAULT_MAX_ROTATION;

  const rawTooltip =
    source.tooltip !== undefined ? source.tooltip : fromOverflow.tooltip;
  const tooltipConfig: TooltipConfig<LabelDescriptor> | undefined =
    rawTooltip && typeof rawTooltip === 'object' ? rawTooltip : undefined;

  const explicitEnable =
    source.enableTooltip !== undefined
      ? source.enableTooltip
      : fromOverflow.enableTooltip;

  let enableTooltip = true;
  if (
    explicitEnable === false ||
    rawTooltip === false ||
    tooltipConfig?.enabled === false
  ) {
    enableTooltip = false;
  }

  return {
    strategy,
    maxWidth:
      maxWidth !== undefined && Number.isFinite(maxWidth) && maxWidth > 0
        ? maxWidth
        : undefined,
    maxChars:
      maxChars !== undefined && Number.isFinite(maxChars) && maxChars > 0
        ? Math.floor(maxChars)
        : undefined,
    maxLines:
      maxLines !== undefined && Number.isFinite(maxLines) && maxLines > 0
        ? Math.max(1, Math.floor(maxLines))
        : undefined,
    ellipsis,
    maxRotation,
    enableTooltip,
    tooltip: tooltipConfig
  };
}

function resolveOverflowRotation(
  explicitRotation: number | undefined,
  maxRotation: number
): number {
  const cap = Number.isFinite(maxRotation) ? maxRotation : DEFAULT_MAX_ROTATION;
  if (
    explicitRotation !== undefined &&
    Number.isFinite(explicitRotation) &&
    explicitRotation !== 0
  ) {
    const absCap = Math.abs(cap);
    if (absCap === 0) return 0;
    return Math.max(-absCap, Math.min(absCap, explicitRotation));
  }
  return cap;
}

/**
 * Truncates a single line of text to satisfy `maxChars` (grapheme count) and/or
 * `maxWidth` (pixel width measured via `@chenglou/pretext` using binary search).
 */
export function truncateSingleLine(
  line: string,
  maxWidth: number | undefined,
  maxChars: number | undefined,
  ellipsis: string,
  measureWidth: (s: string) => number,
  forceEllipsis = false
): { text: string; width: number; truncated: boolean } {
  const graphemes = splitGraphemes(line);
  const ellipsisGraphemes = splitGraphemes(ellipsis);
  const ellipsisLen = ellipsisGraphemes.length;

  let baseGraphemes = graphemes;
  let truncated = false;

  if (maxChars !== undefined && maxChars > 0 && graphemes.length > maxChars) {
    const keepCount = Math.max(0, maxChars - ellipsisLen);
    baseGraphemes = graphemes.slice(0, keepCount);
    truncated = true;
  } else if (forceEllipsis) {
    const keepCount =
      maxChars !== undefined && maxChars > 0
        ? Math.min(graphemes.length, Math.max(0, maxChars - ellipsisLen))
        : graphemes.length;
    baseGraphemes = graphemes.slice(0, keepCount);
    truncated = true;
  }

  const buildCandidate = (count: number, withEllipsis: boolean): string => {
    if (!withEllipsis) return baseGraphemes.slice(0, count).join('');
    const prefix = baseGraphemes.slice(0, count).join('').trimEnd();
    if (maxChars !== undefined && maxChars > 0 && maxChars <= ellipsisLen) {
      return ellipsisGraphemes.slice(0, maxChars).join('');
    }
    return `${prefix}${ellipsis}`;
  };

  let candidate = buildCandidate(baseGraphemes.length, truncated);
  let width = measureWidth(candidate);

  if (maxWidth !== undefined && maxWidth > 0 && width > maxWidth) {
    const ellipsisWidth = measureWidth(ellipsis);
    if (ellipsisWidth >= maxWidth) {
      return {
        text:
          maxChars !== undefined && maxChars > 0 && maxChars < ellipsisLen
            ? ellipsisGraphemes.slice(0, maxChars).join('')
            : ellipsis,
        width: ellipsisWidth,
        truncated: true
      };
    }

    let lo = 0;
    let hi = baseGraphemes.length;
    let bestText = ellipsis;
    let bestWidth = ellipsisWidth;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const trial = buildCandidate(mid, true);
      const trialWidth = measureWidth(trial);
      if (trialWidth <= maxWidth) {
        bestText = trial;
        bestWidth = trialWidth;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return {
      text: bestText,
      width: bestWidth,
      truncated: true
    };
  }

  return {
    text: candidate,
    width,
    truncated
  };
}

export interface TruncatePretextOptions {
  font: string;
  lineHeight: number;
  availWidth?: number;
  maxHeight?: number;
  explicitRotation?: number;
  overflow: ResolvedLabelOverflowConfig;
  getPrepared?: (text: string, font: string) => PreparedTextWithSegments;
}

/**
 * Core `@chenglou/pretext` truncation, rotation, and wrapping engine shared by
 * `LabelEngine`, `<mc-label>`, and `<mc-truncate>`.
 */
export function truncateWithPretext(
  rawText: string,
  options: TruncatePretextOptions
): LabelTruncateResult {
  const originalText = String(rawText ?? '');
  const {
    font,
    lineHeight,
    availWidth,
    maxHeight,
    explicitRotation,
    overflow
  } = options;
  const getPrepared =
    options.getPrepared ?? ((t: string, f: string) => prepareWithSegments(t, f));
  const measureWidth = (s: string): number => {
    if (!s) return 0;
    return Math.ceil(measureNaturalWidth(getPrepared(s, font)));
  };

  if (originalText.length === 0) {
    return {
      text: '',
      originalText: '',
      lines: [],
      truncated: false,
      overflowTriggered: false,
      appliedStrategy: overflow.strategy,
      appliedRotation: explicitRotation ?? 0,
      naturalWidth: 0,
      width: 0
    };
  }

  const explicitLines = originalText.split('\n');
  const explicitLineMetrics: MeasuredLabelLine[] = explicitLines.map((line) => ({
    text: line,
    width: measureWidth(line)
  }));

  const naturalWidth =
    explicitLineMetrics.length > 0
      ? Math.max(...explicitLineMetrics.map((l) => l.width))
      : 0;
  const hasMaxWidth =
    availWidth !== undefined && Number.isFinite(availWidth) && availWidth > 0;
  const strategy = overflow.strategy;
  const maxChars = strategy === 'wrap' ? undefined : overflow.maxChars;
  const hasMaxChars = maxChars !== undefined && maxChars > 0;

  let maxLinesCap = strategy === 'wrap' ? undefined : overflow.maxLines;
  if (strategy !== 'wrap' && maxHeight !== undefined && Number.isFinite(maxHeight) && maxHeight > 0) {
    const fromHeight = Math.max(1, Math.floor(maxHeight / lineHeight));
    maxLinesCap =
      maxLinesCap !== undefined
        ? Math.min(maxLinesCap, fromHeight)
        : fromHeight;
  }

  const exceedsWidth = hasMaxWidth && naturalWidth > availWidth!;
  const exceedsChars = hasMaxChars && explicitLines.some(
    (line) => line.length > maxChars && splitGraphemes(line).length > maxChars
  );
  const exceedsLines =
    maxLinesCap !== undefined && explicitLines.length > maxLinesCap;
  const overflowTriggered = exceedsWidth || exceedsChars || exceedsLines;

  const baseRotation = explicitRotation ?? 0;
  const rotationFor = (triggered: boolean): number =>
    triggered && rotatesOnOverflow(strategy)
      ? resolveOverflowRotation(explicitRotation, overflow.maxRotation)
      : baseRotation;

  if (strategy === 'none' || strategy === 'rotate') {
    return {
      text: originalText,
      originalText,
      lines: explicitLineMetrics,
      truncated: false,
      overflowTriggered,
      appliedStrategy: strategy,
      appliedRotation: rotationFor(overflowTriggered),
      naturalWidth,
      width: naturalWidth
    };
  }

  if (strategy === 'wrap' || strategy === 'wrap-truncate' || strategy === 'rotate-wrap-truncate') {
    let wrapSource = originalText;
    let truncated = false;

    if (hasMaxChars) {
      const allGraphemes = splitGraphemes(originalText);
      if (allGraphemes.length > maxChars) {
        const res = truncateSingleLine(
          originalText,
          undefined,
          maxChars,
          overflow.ellipsis,
          measureWidth
        );
        wrapSource = res.text;
        truncated = res.truncated;
      }
    }

    const wrapWidth = hasMaxWidth
      ? Math.max(12, availWidth!)
      : Math.max(naturalWidth + 4, 1000);
    let lines: MeasuredLabelLine[] = wrapSource.split('\n').flatMap((paragraph) => {
      // Pretext normalizes newlines by default. Lay out each explicit line independently.
      const { lines: wrapped } = layoutWithLines(getPrepared(paragraph, font), wrapWidth, lineHeight);
      return wrapped.length > 0
        ? wrapped.map((line) => ({ text: line.text, width: Math.ceil(line.width) }))
        : [{ text: '', width: 0 }];
    });
    const wrappedOverflow = lines.length > explicitLines.length;

    if (maxLinesCap !== undefined && lines.length > maxLinesCap) {
      lines = lines.slice(0, maxLinesCap);
      const last = lines[lines.length - 1];
      const fitted = truncateSingleLine(
        last.text,
        hasMaxWidth ? wrapWidth : undefined,
        undefined,
        overflow.ellipsis,
        measureWidth,
        true
      );
      last.text = fitted.text;
      last.width = fitted.width;
      truncated = true;
    }

    const width = Math.max(0, ...lines.map((line) => line.width));
    const triggered = overflowTriggered || wrappedOverflow || truncated;

    return {
      text: lines.map((l) => l.text).join('\n'),
      originalText,
      lines,
      truncated,
      overflowTriggered: triggered,
      appliedStrategy: strategy,
      appliedRotation: rotationFor(triggered),
      naturalWidth,
      width: strategy === 'wrap' ? width : Math.min(wrapWidth, width)
    };
  }

  // 'truncate' (default) and 'both' (rotate + truncate)
  const appliedRotation = rotationFor(overflowTriggered);

  if (!overflowTriggered) {
    return {
      text: originalText,
      originalText,
      lines: explicitLineMetrics,
      truncated: false,
      overflowTriggered: false,
      appliedStrategy: strategy,
      appliedRotation,
      naturalWidth,
      width: naturalWidth
    };
  }

  const sliced =
    maxLinesCap !== undefined && explicitLines.length > maxLinesCap;
  const targetLines = sliced
    ? explicitLines.slice(0, maxLinesCap)
    : explicitLines;

  let anyTruncated = sliced;
  const outLines: MeasuredLabelLine[] = targetLines.map((line, idx) => {
    const isLastAndSliced = sliced && idx === targetLines.length - 1;
    const fitted = truncateSingleLine(
      line,
      hasMaxWidth ? availWidth : undefined,
      hasMaxChars ? overflow.maxChars : undefined,
      overflow.ellipsis,
      measureWidth,
      isLastAndSliced
    );
    if (fitted.truncated) anyTruncated = true;
    return {
      text: fitted.text,
      width: fitted.width
    };
  });

  const width =
    outLines.length > 0 ? Math.max(...outLines.map((l) => l.width)) : 0;

  return {
    text: outLines.map((l) => l.text).join('\n'),
    originalText,
    lines: outLines,
    truncated: anyTruncated,
    overflowTriggered: true,
    appliedStrategy: strategy,
    appliedRotation,
    naturalWidth,
    width
  };
}

/**
 * Convenience helper for direct programmatic truncation/overflow computation
 * powered by `@chenglou/pretext` (zero DOM layout reflow).
 */
export function truncateTextWithPretext(
  text: string,
  options: {
    font?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    lineHeight?: number;
    maxWidth?: number;
    maxChars?: number;
    maxLines?: number;
    maxHeight?: number;
    ellipsis?: string;
    strategy?: LabelOverflowStrategy;
    maxRotation?: number;
    rotation?: number;
  } = {}
): LabelTruncateResult {
  const fontSize = options.fontSize ?? 12;
  const fontWeight = options.fontWeight ?? 500;
  const fontFamily = options.fontFamily ?? 'Inter, sans-serif';
  const font = options.font ?? `${fontWeight} ${fontSize}px ${fontFamily}`;
  const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.35);

  const overflow = resolveLabelOverflowConfig({
    maxWidth: options.maxWidth,
    maxChars: options.maxChars,
    maxLines: options.maxLines,
    ellipsis: options.ellipsis,
    maxRotation: options.maxRotation,
    overflow: options.strategy ? { strategy: options.strategy } : undefined
  });

  return truncateWithPretext(text, {
    font,
    lineHeight,
    availWidth: overflow.maxWidth,
    maxHeight: options.maxHeight,
    explicitRotation: options.rotation,
    overflow
  });
}
