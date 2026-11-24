import { MCBaseChart } from '../core/base-chart';
import {
  renderCartesianAxes,
  renderCartesianGrid
} from '../core/scale-manager';
import { allocateUniqueSvgId } from '../core/threshold-clip';
import type {
  ChartRenderContext,
  LineCrosshairType,
  LineSeries,
  LineStrokeStyle,
  ScatterSymbolType
} from '../core/types';
import {
  computeLineChartModel,
  computeLineTransitionFrame,
  interpolateLineFrame,
  type LineChartModel,
  type LinePointCoord,
  type LineSeriesTransitionFrame
} from '../models/line.model';
import {
  renderLineAreasLayer,
  renderLineLegendsLayer,
  renderLinePointLabelsLayer,
  renderLinePointsLayer,
  renderLinesLayer,
  renderLineSlicesLayer
} from '../presentation/layers/line.layers';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * `<mc-line-chart>` Orchestrator Web Component.
 * Wires the pure `computeLineChartModel` Model Layer with the dumb presentation layers
 * (`renderLineAreasLayer`, `renderLinesLayer`, `renderLinePointsLayer`, `renderLinePointLabelsLayer`, `renderLineSlicesLayer`, `renderLineLegendsLayer`)
 * and smoothly interpolates lines, areas, and points across live/streaming data updates.
 */
export class MCLineChart extends MCBaseChart<LineSeries[]> {
  static observedAttributes = [
    ...MCBaseChart.baseObservedAttributes,
    'curve',
    'enable-area',
    'area-opacity',
    'area-baseline-value',
    'line-width',
    'line-style',
    'point-size',
    'point-border-width',
    'symbol',
    'stacked',
    'connect-nulls',
    'crosshair-type',
    'enable-point-labels',
    'enable-slices',
    'x-title',
    'y-title'
  ];

  #prevSeriesCoords = new Map<string, LinePointCoord[]>();
  #currentSeriesCoords = new Map<string, LinePointCoord[]>();
  #transitionRafId: number | null = null;

  get chartType(): string {
    return 'line';
  }

  get defaultLayers(): string[] {
    return [
      'grid',
      'markers',
      'axes',
      'areas',
      'lines',
      'points',
      'pointLabels',
      'slices',
      'legends'
    ];
  }

  get curve(): string {
    return this.getOption('curve', 'curve', 'monotoneX') || 'monotoneX';
  }
  set curve(val: string) {
    this._config.curve = val;
    this.setAttribute('curve', val);
  }

  get enableArea(): boolean {
    return Boolean(this.getOption('enableArea', 'enable-area', false));
  }
  set enableArea(val: boolean) {
    this._config.enableArea = val;
    if (val) this.setAttribute('enable-area', 'true');
    else this.removeAttribute('enable-area');
  }

  get enablePointLabels(): boolean {
    return Boolean(
      this.getOption('enablePointLabels', 'enable-point-labels', false)
    );
  }
  set enablePointLabels(val: boolean) {
    this._config.enablePointLabels = val;
    if (val) this.setAttribute('enable-point-labels', 'true');
    else this.removeAttribute('enable-point-labels');
  }

  protected override hasPlottableData(data: LineSeries[] | null): boolean {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.some(
      (s) =>
        Array.isArray(s?.data) &&
        s.data.some(
          (pt) =>
            pt != null &&
            pt.y !== null &&
            pt.y !== undefined &&
            (pt.y as unknown) !== '' &&
            Number.isFinite(Number(pt.y))
        )
    );
  }

  protected override cancelTransitions(clearSnapshot = false): void {
    if (this.#transitionRafId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.#transitionRafId);
      }
      this.#transitionRafId = null;
      // Preserve mid-flight interpolated coordinates so rapid updates stay seamless
      if (!clearSnapshot && this.#currentSeriesCoords.size > 0) {
        this.#prevSeriesCoords = new Map(this.#currentSeriesCoords);
      }
    }
    this.#currentSeriesCoords.clear();
    if (clearSnapshot) {
      this.#prevSeriesCoords.clear();
    }
  }

  protected prepareContext(ctx: ChartRenderContext<LineSeries[]>): void {
    const rawSymbol = this.getOption('symbol', 'symbol', 'circle');
    const symbol: ScatterSymbolType =
      typeof rawSymbol === 'string'
        ? (rawSymbol as ScatterSymbolType)
        : 'circle';
    const model = computeLineChartModel(ctx, {
      curve: this.curve,
      enableArea: this.enableArea,
      areaOpacity: this.getOption('areaOpacity', 'area-opacity', 0.22) ?? 0.22,
      areaBaselineValue: this.getOption(
        'areaBaselineValue',
        'area-baseline-value'
      ),
      lineWidth: this.getOption('lineWidth', 'line-width', 2.5) ?? 2.5,
      lineStyle:
        (this.getOption('lineStyle', 'line-style', 'solid') as LineStrokeStyle) ??
        'solid',
      pointSize: this.getOption('pointSize', 'point-size', 9) ?? 9,
      pointBorderWidth:
        this.getOption('pointBorderWidth', 'point-border-width', 2.2) ?? 2.2,
      symbol,
      stacked: Boolean(this.getOption('stacked', 'stacked', false)),
      connectNulls:
        this.getOption('connectNulls', 'connect-nulls', true) !== false,
      crosshairType:
        (this.getOption(
          'crosshairType',
          'crosshair-type',
          'x'
        ) as LineCrosshairType) ?? 'x',
      enablePointLabels: this.enablePointLabels,
      enableSlices:
        this.getOption('enableSlices', 'enable-slices', true) !== false,
      xTitle: this.getOption('xTitle', 'x-title'),
      yTitle: this.getOption('yTitle', 'y-title'),
      setupThresholds: (c) => this.setupMarkersAndThresholds(c),
      recordThresholdItem: (item, evalRes) =>
        this._recordMatchedThresholdItem!(item, evalRes)
    });

    const transitions = new Map<string, LineSeriesTransitionFrame>();
    if (
      ctx.animationConfig.enabled &&
      ctx.animationConfig.duration > 0 &&
      this.#prevSeriesCoords.size > 0
    ) {
      for (const s of model.series) {
        const prevCoords = this.#prevSeriesCoords.get(s.id);
        if (!prevCoords || prevCoords.length === 0) continue;
        const nextCoords: LinePointCoord[] = s.points.map((p) => ({
          xKey: String(p.xValue),
          px: p.px,
          py: p.py,
          py0: p.py0
        }));
        const frame = computeLineTransitionFrame(s.id, prevCoords, nextCoords);
        if (frame && frame.hasMotion) {
          transitions.set(s.id, frame);
        }
      }
    }

    ctx.state.model = model;
    ctx.state.computedSeries = model.series;
    ctx.state.lineTransitions = transitions.size > 0 ? transitions : null;
  }

  protected override afterRender(ctx: ChartRenderContext<LineSeries[]>): void {
    const model = ctx.state.model as LineChartModel | undefined;
    if (!model) return;

    const finalCoords = new Map<string, LinePointCoord[]>();
    for (const s of model.series) {
      finalCoords.set(
        s.id,
        s.points.map((p) => ({
          xKey: String(p.xValue),
          px: p.px,
          py: p.py,
          py0: p.py0
        }))
      );
    }

    const transitions = ctx.state.lineTransitions as
      | Map<string, LineSeriesTransitionFrame>
      | null
      | undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      !transitions ||
      transitions.size === 0 ||
      prefersReducedMotion ||
      typeof requestAnimationFrame !== 'function'
    ) {
      this.#prevSeriesCoords = finalCoords;
      return;
    }

    // Store final coords as baseline once transition completes (or if cancelled after finish)
    this.#prevSeriesCoords = finalCoords;

    const linesLayer = ctx.rootGroup.querySelector<SVGGElement>('.mc-layer--lines');
    const areasLayer = ctx.rootGroup.querySelector<SVGGElement>('.mc-layer--areas');
    const pointsLayer = ctx.rootGroup.querySelector<SVGGElement>('.mc-layer--points');
    const defsEl = ctx.svg.querySelector('.mc-chart-defs');

    interface SeriesDomTargets {
      frame: LineSeriesTransitionFrame;
      finalLineD: string;
      finalAreaD: string;
      linePaths: SVGPathElement[];
      areaPaths: SVGPathElement[];
      circles: SVGCircleElement[];
    }

    const targets: SeriesDomTargets[] = [];
    for (const s of model.series) {
      const frame = transitions.get(s.id);
      if (!frame) continue;

      const collectPaths = (layer: Element | null): SVGPathElement[] => {
        if (!layer) return [];
        const matched: SVGPathElement[] = [];
        for (const el of Array.from(layer.children)) {
          if (el.getAttribute('data-series-id') !== s.id) continue;
          if (el.tagName.toLowerCase() === 'path') {
            matched.push(el as SVGPathElement);
          } else {
            matched.push(
              ...Array.from(el.querySelectorAll<SVGPathElement>('path'))
            );
          }
        }
        return matched;
      };

      const circles = pointsLayer
        ? Array.from(pointsLayer.children).filter(
            (el): el is SVGCircleElement =>
              el.tagName.toLowerCase() === 'circle' &&
              el.getAttribute('data-series-id') === s.id
          )
        : [];

      targets.push({
        frame,
        finalLineD: s.linePathD,
        finalAreaD: s.areaPathD,
        linePaths: collectPaths(linesLayer),
        areaPaths: collectPaths(areasLayer),
        circles
      });
    }

    if (targets.length === 0) return;

    // Temporary plot-area clip paths so sliding-window entries/exits clip crisply at the axes
    let plotClipEl: SVGClipPathElement | null = null;
    let ptsClipEl: SVGClipPathElement | null = null;
    const prevLinesClip = linesLayer?.getAttribute('clip-path') ?? null;
    const prevAreasClip = areasLayer?.getAttribute('clip-path') ?? null;
    const prevPointsClip = pointsLayer?.getAttribute('clip-path') ?? null;

    if (defsEl) {
      const plotClipId = allocateUniqueSvgId('mc-line-morph-clip');
      plotClipEl = document.createElementNS(SVG_NS, 'clipPath');
      plotClipEl.setAttribute('id', plotClipId);
      const plotRect = document.createElementNS(SVG_NS, 'rect');
      plotRect.setAttribute('x', '0');
      plotRect.setAttribute('y', '-16');
      plotRect.setAttribute('width', String(Math.max(0, ctx.innerWidth)));
      plotRect.setAttribute('height', String(Math.max(0, ctx.innerHeight + 32)));
      plotClipEl.appendChild(plotRect);
      defsEl.appendChild(plotClipEl);

      if (linesLayer && !prevLinesClip) {
        linesLayer.setAttribute('clip-path', `url(#${plotClipId})`);
      }
      if (areasLayer && !prevAreasClip) {
        areasLayer.setAttribute('clip-path', `url(#${plotClipId})`);
      }

      const ptsClipId = allocateUniqueSvgId('mc-line-pts-morph-clip');
      ptsClipEl = document.createElementNS(SVG_NS, 'clipPath');
      ptsClipEl.setAttribute('id', ptsClipId);
      const ptsRect = document.createElementNS(SVG_NS, 'rect');
      ptsRect.setAttribute('x', '-8');
      ptsRect.setAttribute('y', '-16');
      ptsRect.setAttribute('width', String(Math.max(0, ctx.innerWidth + 16)));
      ptsRect.setAttribute('height', String(Math.max(0, ctx.innerHeight + 32)));
      ptsClipEl.appendChild(ptsRect);
      defsEl.appendChild(ptsClipEl);

      if (pointsLayer && !prevPointsClip) {
        pointsLayer.setAttribute('clip-path', `url(#${ptsClipId})`);
      }
    }

    const cleanupClips = () => {
      if (linesLayer && !prevLinesClip) linesLayer.removeAttribute('clip-path');
      if (areasLayer && !prevAreasClip) areasLayer.removeAttribute('clip-path');
      if (pointsLayer && !prevPointsClip) pointsLayer.removeAttribute('clip-path');
      plotClipEl?.remove();
      ptsClipEl?.remove();
    };

    const duration = Math.max(120, Math.min(ctx.animationConfig.duration, 750));
    const easeFn = this.animationEngine.getD3Easing(ctx.animationConfig.easing);

    const applyProgress = (rawT: number) => {
      const done = rawT >= 1;
      const e = done ? 1 : easeFn(Math.max(0, rawT));

      for (const target of targets) {
        if (done) {
          for (const p of target.linePaths) p.setAttribute('d', target.finalLineD);
          for (const p of target.areaPaths) p.setAttribute('d', target.finalAreaD);
          target.circles.forEach((c, idx) => {
            const pt = target.frame.toPoints[idx];
            if (!pt) return;
            c.setAttribute('cx', String(pt.px));
            c.setAttribute('cy', String(pt.py));
            if (target.frame.enteringIndices.has(idx)) {
              c.style.opacity = '';
            }
          });
          this.#currentSeriesCoords.set(target.frame.seriesId, target.frame.toPoints);
        } else {
          const interp = interpolateLineFrame(
            target.frame,
            e,
            model.curve,
            target.areaPaths.length > 0
          );
          for (const p of target.linePaths) p.setAttribute('d', interp.linePathD);
          for (const p of target.areaPaths) p.setAttribute('d', interp.areaPathD);
          target.circles.forEach((c, idx) => {
            const pt = interp.points[idx];
            if (!pt) return;
            c.setAttribute('cx', String(pt.px));
            c.setAttribute('cy', String(pt.py));
            if (target.frame.enteringIndices.has(idx)) {
              c.style.opacity = String(Math.min(1, e * 1.4));
            }
          });
          this.#currentSeriesCoords.set(target.frame.seriesId, interp.points);
        }
      }
    };

    // Synchronously position frame 0 before browser paint to avoid any 1-frame flash
    applyProgress(0);

    const startTime =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const step = (now: number) => {
      if (!this.isConnected) {
        this.#transitionRafId = null;
        cleanupClips();
        return;
      }
      const elapsed = now - startTime;
      const rawT = Math.min(1, Math.max(0, elapsed / duration));
      applyProgress(rawT);
      if (rawT < 1) {
        this.#transitionRafId = requestAnimationFrame(step);
      } else {
        this.#transitionRafId = null;
        this.#currentSeriesCoords.clear();
        cleanupClips();
      }
    };

    this.#transitionRafId = requestAnimationFrame(step);
  }

  protected getLayerRenderers(): Record<
    string,
    (ctx: ChartRenderContext<LineSeries[]>) => void
  > {
    const defs = () => this.shadowRoot?.querySelector('.mc-chart-defs');
    return {
      grid: (ctx) => renderCartesianGrid(ctx),
      axes: (ctx) => {
        const model = ctx.state.model as LineChartModel;
        renderCartesianAxes(ctx, {
          xTitle: model.xTitle,
          yTitle: model.yTitle
        });
      },
      areas: (ctx) => {
        const explicitAreaLayer = Array.from(this.children).some(
          (el) =>
            el.tagName.toLowerCase() === 'mc-chart-layer' &&
            el.getAttribute('name') === 'areas'
        );
        renderLineAreasLayer(
          ctx.state.model as LineChartModel,
          ctx,
          defs(),
          explicitAreaLayer
        );
      },
      lines: (ctx) =>
        renderLinesLayer(ctx.state.model as LineChartModel, ctx, defs()),
      points: (ctx) =>
        renderLinePointsLayer(ctx.state.model as LineChartModel, ctx),
      pointLabels: (ctx) => {
        const explicitLayer = Array.from(this.children).some(
          (el) =>
            el.tagName.toLowerCase() === 'mc-chart-layer' &&
            el.getAttribute('name') === 'pointLabels'
        );
        const hasOverride = this.resolveLabelOverrides().some(
          (o) => o.target === 'data' || o.target === 'all'
        );
        renderLinePointLabelsLayer(
          ctx.state.model as LineChartModel,
          ctx,
          explicitLayer || hasOverride
        );
      },
      slices: (ctx) =>
        renderLineSlicesLayer(ctx.state.model as LineChartModel, ctx),
      legends: (ctx) =>
        renderLineLegendsLayer(ctx.state.model as LineChartModel, ctx)
    };
  }
}
