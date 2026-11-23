import type {
  CrosshatchPatternDef,
  DotsPatternDef,
  FillMatchContext,
  FillMatcher,
  FillRule,
  GradientStop,
  LinearGradientDef,
  LinesPatternDef,
  RadialGradientDef,
  SquaresPatternDef,
  SvgFillDef
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

let chartDefScopeSeq = 0;

function angleToLinearCoords(angleDeg = 0): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  // 0deg = top-to-bottom (natural for vertical bars/areas), 90deg = left-to-right
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  return {
    x1: pct(0.5 - dx * 0.5),
    y1: pct(0.5 + dy * 0.5),
    x2: pct(0.5 + dx * 0.5),
    y2: pct(0.5 - dy * 0.5)
  };
}

function normalizeStops(
  colors?: Array<string | GradientStop>
): GradientStop[] {
  if (!Array.isArray(colors) || colors.length === 0) {
    return [
      { offset: '0%', color: 'inherit', opacity: 1 },
      { offset: '100%', color: 'inherit', opacity: 0.35 }
    ];
  }
  const len = colors.length;
  return colors.map((entry, idx) => {
    const defaultOffset =
      len === 1 ? '0%' : `${Math.round((idx / (len - 1)) * 1000) / 10}%`;
    if (typeof entry === 'string') {
      return { offset: defaultOffset, color: entry };
    }
    const offset =
      typeof entry.offset === 'number' ? `${entry.offset}%` : entry.offset;
    return {
      offset: offset ?? defaultOffset,
      color: entry.color,
      opacity: entry.opacity
    };
  });
}

function resolveInherit(
  val: string | undefined,
  baseColor: string,
  fallback: string
): string {
  if (val === undefined) return fallback;
  return val === 'inherit' ? baseColor : val;
}

function defUsesInherit(def: SvgFillDef): boolean {
  if (def.type === 'custom') return true;
  if (def.type === 'linearGradient' || def.type === 'radialGradient') {
    const stops = normalizeStops(def.colors);
    return stops.some((s) => s.color === 'inherit');
  }
  const bg = def.background;
  const fg = def.color;
  return bg === 'inherit' || fg === 'inherit' || bg === undefined;
}

function buildPatternElement(
  def: SvgFillDef,
  scopedId: string,
  baseColor: string
): SVGElement {
  if (def.type === 'linearGradient') {
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', scopedId);
    if (def.gradientUnits) grad.setAttribute('gradientUnits', def.gradientUnits);
    const coords = angleToLinearCoords(def.angle ?? 0);
    grad.setAttribute('x1', String(def.x1 ?? coords.x1));
    grad.setAttribute('y1', String(def.y1 ?? coords.y1));
    grad.setAttribute('x2', String(def.x2 ?? coords.x2));
    grad.setAttribute('y2', String(def.y2 ?? coords.y2));
    for (const s of normalizeStops(def.colors)) {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', String(s.offset));
      stop.setAttribute('stop-color', resolveInherit(s.color, baseColor, baseColor));
      if (s.opacity !== undefined) {
        stop.setAttribute('stop-opacity', String(s.opacity));
      }
      grad.appendChild(stop);
    }
    return grad;
  }

  if (def.type === 'radialGradient') {
    const grad = document.createElementNS(SVG_NS, 'radialGradient');
    grad.setAttribute('id', scopedId);
    if (def.gradientUnits) grad.setAttribute('gradientUnits', def.gradientUnits);
    grad.setAttribute('cx', String(def.cx ?? '50%'));
    grad.setAttribute('cy', String(def.cy ?? '50%'));
    grad.setAttribute('r', String(def.r ?? '50%'));
    if (def.fx !== undefined) grad.setAttribute('fx', String(def.fx));
    if (def.fy !== undefined) grad.setAttribute('fy', String(def.fy));
    for (const s of normalizeStops(def.colors)) {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', String(s.offset));
      stop.setAttribute('stop-color', resolveInherit(s.color, baseColor, baseColor));
      if (s.opacity !== undefined) {
        stop.setAttribute('stop-opacity', String(s.opacity));
      }
      grad.appendChild(stop);
    }
    return grad;
  }

  if (def.type === 'custom') {
    if (typeof def.render === 'function') {
      const customEl = def.render(scopedId, baseColor);
      if (!customEl.getAttribute('id')) {
        customEl.setAttribute('id', scopedId);
      }
      return customEl;
    }
    const raw = (def.svg ?? '').trim();
    if (
      raw.startsWith('<pattern') ||
      raw.startsWith('<linearGradient') ||
      raw.startsWith('<radialGradient')
    ) {
      const host = document.createElementNS(SVG_NS, 'svg');
      host.innerHTML = raw.replace(/\binherit\b/g, baseColor);
      const first = host.firstElementChild as SVGElement | null;
      if (first) {
        first.setAttribute('id', scopedId);
        return first;
      }
    }
    const pat = document.createElementNS(SVG_NS, 'pattern');
    pat.setAttribute('id', scopedId);
    pat.setAttribute('patternUnits', def.patternUnits ?? 'userSpaceOnUse');
    pat.setAttribute('width', String(def.width ?? 10));
    pat.setAttribute('height', String(def.height ?? 10));
    if (def.patternTransform) {
      pat.setAttribute('patternTransform', def.patternTransform);
    }
    if (raw) {
      pat.innerHTML = raw.replace(/\binherit\b/g, baseColor);
    }
    return pat;
  }

  const pat = document.createElementNS(SVG_NS, 'pattern');
  pat.setAttribute('id', scopedId);
  pat.setAttribute('patternUnits', 'userSpaceOnUse');

  const bg = resolveInherit(def.background, baseColor, baseColor);
  const fg = resolveInherit(def.color, baseColor, 'rgba(255,255,255,0.42)');
  const opacity = def.opacity;

  const appendBg = (w: number, h: number) => {
    if (bg === 'none' || bg === 'transparent') return;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('fill', bg);
    pat.appendChild(rect);
  };

  if (def.type === 'dots') {
    const size = Math.max(1, def.size ?? 4);
    const padding = Math.max(1, def.padding ?? 4);
    const step = size + padding;
    const tile = def.stagger ? step * 2 : step;
    const r = size / 2;
    pat.setAttribute('width', String(tile));
    pat.setAttribute('height', String(tile));
    appendBg(tile, tile);

    const addDot = (cx: number, cy: number) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', String(r));
      c.setAttribute('fill', fg);
      if (opacity !== undefined) c.setAttribute('fill-opacity', String(opacity));
      pat.appendChild(c);
    };

    if (def.stagger) {
      addDot(step * 0.5, step * 0.5);
      addDot(step * 1.5, step * 1.5);
    } else {
      addDot(step * 0.5, step * 0.5);
    }
    return pat;
  }

  if (def.type === 'squares') {
    const size = Math.max(1, def.size ?? 4);
    const padding = Math.max(1, def.padding ?? 4);
    const step = size + padding;
    const tile = def.stagger ? step * 2 : step;
    const offset = padding / 2;
    pat.setAttribute('width', String(tile));
    pat.setAttribute('height', String(tile));
    appendBg(tile, tile);

    const addSquare = (x: number, y: number) => {
      const sq = document.createElementNS(SVG_NS, 'rect');
      sq.setAttribute('x', String(x));
      sq.setAttribute('y', String(y));
      sq.setAttribute('width', String(size));
      sq.setAttribute('height', String(size));
      sq.setAttribute('fill', fg);
      if (opacity !== undefined) sq.setAttribute('fill-opacity', String(opacity));
      pat.appendChild(sq);
    };

    if (def.stagger) {
      addSquare(offset, offset);
      addSquare(step + offset, step + offset);
    } else {
      addSquare(offset, offset);
    }
    return pat;
  }

  // 'lines' or 'crosshatch'
  const spacing = Math.max(2, def.spacing ?? 7);
  const lineWidth = Math.max(0.5, def.lineWidth ?? 2);
  const rotation = def.rotation ?? -45;

  pat.setAttribute('width', String(spacing));
  pat.setAttribute('height', String(spacing));
  if (rotation !== 0) {
    pat.setAttribute('patternTransform', `rotate(${rotation})`);
  }
  appendBg(spacing, spacing);

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', fg);
    line.setAttribute('stroke-width', String(lineWidth));
    if (opacity !== undefined) {
      line.setAttribute('stroke-opacity', String(opacity));
    }
    pat.appendChild(line);
  };

  addLine(0, spacing / 2, spacing, spacing / 2);
  if (def.type === 'crosshatch') {
    addLine(spacing / 2, 0, spacing / 2, spacing);
  }
  return pat;
}

function matchesRule(matcher: FillMatcher, ctx: FillMatchContext): boolean {
  if (matcher === '*') return true;
  if (typeof matcher === 'string') {
    return (
      ctx.id === matcher ||
      ctx.seriesId === matcher ||
      ctx.key === matcher ||
      ctx.category === matcher
    );
  }
  if (typeof matcher === 'function') {
    try {
      return Boolean(matcher(ctx.datum ?? ctx, ctx));
    } catch {
      return false;
    }
  }
  if (matcher && typeof matcher === 'object') {
    if (matcher.target !== undefined && ctx.target !== matcher.target) {
      return false;
    }
    if (
      matcher.id !== undefined &&
      ctx.id !== matcher.id &&
      ctx.seriesId !== matcher.id &&
      ctx.key !== matcher.id
    ) {
      return false;
    }
    if (matcher.seriesId !== undefined && ctx.seriesId !== matcher.seriesId) {
      return false;
    }
    if (matcher.key !== undefined && ctx.key !== matcher.key) {
      return false;
    }
    if (matcher.category !== undefined && ctx.category !== matcher.category) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Per-chart SVG `<defs>` Pattern & Gradient Engine.
 * Scopes every `<pattern>`, `<linearGradient>`, and `<radialGradient>` ID to its
 * owning chart instance so multiple charts on the same page never suffer `url(#id)` collisions.
 */
export class PatternEngine {
  readonly #scopePrefix: string;
  #defsEl: Element | null = null;
  #defMap = new Map<string, SvgFillDef>();
  #rules: FillRule[] = [];
  #mountedIds = new Map<string, string>();
  #colorVariantSeq = 0;

  constructor() {
    this.#scopePrefix = `mc-def-${++chartDefScopeSeq}`;
  }

  public get scopePrefix(): string {
    return this.#scopePrefix;
  }

  /**
   * Prepares the engine for the current render pass with chart-scoped `<defs>`.
   */
  public prepare(
    defsEl: Element | null,
    defs: SvgFillDef[],
    rules: FillRule[]
  ): void {
    this.#defsEl = defsEl;
    this.#defMap.clear();
    this.#mountedIds.clear();
    this.#colorVariantSeq = 0;
    this.#rules = Array.isArray(rules) ? rules : [];

    if (!defsEl || !Array.isArray(defs) || defs.length === 0) return;

    for (const def of defs) {
      if (!def || !def.id) continue;
      this.#defMap.set(def.id, def);
      // Eagerly mount fixed-color defs once so direct `url(#id)` references always resolve
      if (!defUsesInherit(def)) {
        this.#ensureMounted(def, '');
      }
    }
  }

  public hasDefinitions(): boolean {
    return this.#defMap.size > 0;
  }

  /**
   * Resolves a fill rule for a chart item or legend swatch.
   * Returns `url(#scopedId)` if a rule matches a registered def, otherwise `ctx.color`.
   */
  public resolveFill(ctx: FillMatchContext): string {
    if (this.#defMap.size === 0 || this.#rules.length === 0 || !this.#defsEl) {
      return ctx.color;
    }

    for (const rule of this.#rules) {
      if (!rule || !rule.id) continue;
      if (matchesRule(rule.match, ctx)) {
        const resolved = this.resolveDefUrl(rule.id, ctx.color);
        if (resolved) return resolved;
      }
    }

    return ctx.color;
  }

  /**
   * Resolves a user def `id` or `url(#id)` into its chart-scoped `url(#mc-def-...)`.
   * Passes standard CSS colors (e.g. `#ef4444`, `rgba(...)`) through unchanged.
   */
  public resolveDefUrl(
    raw: string | undefined,
    baseColor: string
  ): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    const urlMatch = /^url\(#([^)]+)\)$/.exec(trimmed);
    const lookupId = urlMatch ? urlMatch[1] : trimmed;

    const def = this.#defMap.get(lookupId);
    if (!def) return raw;

    const scopedId = this.#ensureMounted(def, baseColor);
    return scopedId ? `url(#${scopedId})` : raw;
  }

  #ensureMounted(def: SvgFillDef, baseColor: string): string | null {
    if (!this.#defsEl) return null;
    const usesInherit = defUsesInherit(def);
    const cacheKey = usesInherit ? `${def.id}::${baseColor}` : def.id;
    const existing = this.#mountedIds.get(cacheKey);
    if (existing) return existing;

    const safeId = def.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const scopedId = usesInherit
      ? `${this.#scopePrefix}-${safeId}-c${this.#colorVariantSeq++}`
      : `${this.#scopePrefix}-${safeId}`;

    const el = buildPatternElement(def, scopedId, baseColor);
    this.#defsEl.appendChild(el);
    this.#mountedIds.set(cacheKey, scopedId);
    return scopedId;
  }
}

// ============================================================================
// Ergonomic Pattern & Gradient Builder Helpers
// ============================================================================

export function patternDots(
  id: string,
  options: Omit<DotsPatternDef, 'id' | 'type'> = {}
): DotsPatternDef {
  return { id, type: 'dots', ...options };
}

export function patternLines(
  id: string,
  options: Omit<LinesPatternDef, 'id' | 'type'> = {}
): LinesPatternDef {
  return { id, type: 'lines', ...options };
}

export function patternSquares(
  id: string,
  options: Omit<SquaresPatternDef, 'id' | 'type'> = {}
): SquaresPatternDef {
  return { id, type: 'squares', ...options };
}

export function patternCrosshatch(
  id: string,
  options: Omit<CrosshatchPatternDef, 'id' | 'type'> = {}
): CrosshatchPatternDef {
  return { id, type: 'crosshatch', ...options };
}

export function linearGradientDef(
  id: string,
  colors: Array<string | GradientStop>,
  options: Omit<LinearGradientDef, 'id' | 'type' | 'colors'> = {}
): LinearGradientDef {
  return { id, type: 'linearGradient', colors, ...options };
}

export function radialGradientDef(
  id: string,
  colors: Array<string | GradientStop>,
  options: Omit<RadialGradientDef, 'id' | 'type' | 'colors'> = {}
): RadialGradientDef {
  return { id, type: 'radialGradient', colors, ...options };
}
