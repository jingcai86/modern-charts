import { getScalePosition } from './scale-manager';
import type {
  ChartRenderContext,
  CustomLabelRenderer,
  LabelDescriptor,
  LabelPadding,
  LabelStyleOverride,
  LegendItem,
  MarkerAnnotationConfig,
  MarkerAnnotationPosition,
  MarkerCondition,
  MarkerConfig,
  MarkerLabelPosition,
  MarkerMatchStyle,
  ResolvedMarker,
  ThresholdContextInfo,
  ThresholdEvaluationResult,
  ThresholdMatchedItem,
  TooltipConfig
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ResolvedMarkerAnnotation {
  text: string;
  icon?: string | SVGElement | HTMLElement;
  position: MarkerAnnotationPosition;
  padding: number;
  offsetX: number;
  offsetY: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  labelPadding?: LabelPadding;
  formatter?: LabelStyleOverride['formatter'];
  renderer?: CustomLabelRenderer;
  enableTooltip: boolean;
  tooltipText?: string;
  tooltipConfig?: TooltipConfig<ResolvedMarker>;
}

/**
 * Resolves a marker's optional outside `annotation` into a normalized descriptor.
 * Returns `null` when the marker has no annotation configured.
 */
export function resolveMarkerAnnotation(
  marker: MarkerConfig
): ResolvedMarkerAnnotation | null {
  const raw = marker.annotation;
  if (!raw) return null;

  const axis = marker.axis ?? 'y';
  const defaultPos: MarkerAnnotationPosition = axis === 'x' ? 'top' : 'right';

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return null;
    return {
      text,
      position: defaultPos,
      padding: 8,
      offsetX: 0,
      offsetY: 0,
      enableTooltip: true
    };
  }

  const text = raw.text !== undefined ? String(raw.text) : raw.icon ? '' : (marker.label ?? '');
  if (!text && !raw.icon) return null;

  const rawTip = raw.tooltip;
  const tooltipConfig =
    typeof rawTip === 'object' && rawTip !== null ? rawTip : undefined;
  const enableTooltip =
    raw.enableTooltip === false ||
    rawTip === false ||
    tooltipConfig?.enabled === false
      ? false
      : true;

  return {
    text,
    icon: raw.icon,
    position: raw.position ?? defaultPos,
    padding:
      raw.padding !== undefined && Number.isFinite(raw.padding)
        ? Math.max(0, raw.padding)
        : 8,
    offsetX: raw.offsetX ?? 0,
    offsetY: raw.offsetY ?? 0,
    color: raw.color,
    background: raw.background,
    borderColor: raw.borderColor,
    borderRadius: raw.borderRadius,
    fontSize: raw.fontSize,
    fontWeight: raw.fontWeight,
    fontFamily: raw.fontFamily,
    labelPadding: raw.labelPadding,
    formatter: raw.formatter,
    renderer: raw.renderer,
    enableTooltip,
    tooltipText: typeof rawTip === 'string' ? rawTip : undefined,
    tooltipConfig
  };
}

/**
 * Builds unified `LegendItem` entries for all line and area markers that opt
 * into the chart legend (`marker.legend: true | MarkerLegendConfig`).
 */
export function buildMarkerLegendItems(markers: ResolvedMarker[]): LegendItem[] {
  const items: LegendItem[] = [];
  for (const marker of markers) {
    if (!marker.legend) continue;
    const legCfg = typeof marker.legend === 'object' ? marker.legend : {};
    if (legCfg.enabled === false) continue;

    const annText =
      typeof marker.annotation === 'string'
        ? marker.annotation
        : marker.annotation?.text;
    const label = legCfg.label || marker.label || annText || marker.id;
    const color =
      legCfg.color ||
      (marker.type === 'area'
        ? marker.fill || marker.stroke || '#ef4444'
        : marker.stroke || marker.fill || '#ef4444');
    const swatchPref = legCfg.swatch ?? 'auto';
    const swatch: 'square' | 'line' | 'area' =
      swatchPref === 'auto'
        ? marker.type === 'area'
          ? 'area'
          : 'line'
        : swatchPref;

    const valueDisplay =
      marker.type === 'area'
        ? `${marker.from ?? 0} – ${marker.to ?? 0}`
        : marker.value;

    items.push({
      id: `marker:${marker.id}`,
      label,
      color,
      value: valueDisplay,
      swatch,
      strokeDasharray:
        swatch === 'line' ? marker.strokeDasharray ?? '6 4' : marker.strokeDasharray,
      fillOpacity: swatch === 'area' ? marker.fillOpacity ?? 0.25 : undefined,
      kind: 'marker',
      tooltipText: legCfg.tooltip,
      meta: {
        kind: 'marker',
        markerId: marker.id,
        markerType: marker.type,
        axis: marker.axis,
        value: marker.value,
        from: marker.from,
        to: marker.to,
        condition:
          typeof marker.condition === 'string' ? marker.condition : undefined,
        matchScope: marker.matchScope,
        matchedCount: marker.matchedItems?.length ?? 0
      }
    });
  }
  return items;
}

export class MarkerEngine {
  /**
   * Resolves raw `MarkerConfig[]` into `ResolvedMarker[]` using the chart's active D3 scales.
   */
  public resolveMarkers(
    rawMarkers: MarkerConfig[],
    xScale: any,
    yScale: any,
    innerWidth: number,
    innerHeight: number
  ): ResolvedMarker[] {
    return rawMarkers.map((m, idx) => {
      const axis = m.axis ?? 'y';
      const scale = axis === 'x' ? xScale : yScale;
      const type =
        m.type ??
        (m.from !== undefined && m.to !== undefined ? 'area' : 'line');
      const id = m.id || `marker-${type}-${idx}`;

      let pixelPos: number | undefined;
      let pixelFrom: number | undefined;
      let pixelTo: number | undefined;

      if (type === 'line') {
        const targetVal = m.value ?? m.to ?? m.from ?? 0;
        pixelPos = scale ? getScalePosition(scale, targetVal) : 0;
      } else {
        const fromVal = m.from ?? 0;
        const toVal = m.to ?? m.value ?? 0;
        pixelFrom = scale
          ? getScalePosition(scale, fromVal)
          : axis === 'y'
          ? innerHeight
          : 0;
        pixelTo = scale
          ? getScalePosition(scale, toVal)
          : axis === 'y'
          ? 0
          : innerWidth;
      }

      return {
        ...m,
        id,
        type,
        axis,
        pixelPos,
        pixelFrom,
        pixelTo,
        matchedItems: []
      };
    });
  }

  /**
   * Creates the `ThresholdContextInfo` object attached to `ctx.thresholds` and `ctx.evaluateThresholds`,
   * ensuring both built-in chart layers (bars, lines, points) and client custom layers have full access
   * to threshold state and matched items.
   */
  public createThresholdContext(
    resolvedMarkers: ResolvedMarker[]
  ): ThresholdContextInfo & {
    recordMatchedItem: (
      item: Omit<
        ThresholdMatchedItem,
        | 'effectiveColor'
        | 'isUnderThreshold'
        | 'isAboveThreshold'
        | 'matchedMarkerIds'
        | 'style'
      >,
      evalResult: ThresholdEvaluationResult
    ) => ThresholdMatchedItem;
  } {
    const matchedItems: ThresholdMatchedItem[] = [];
    const underThresholdItems: ThresholdMatchedItem[] = [];
    const aboveThresholdItems: ThresholdMatchedItem[] = [];

    const evaluate = (
      value: number,
      datum?: any,
      axis: 'x' | 'y' = 'y',
      defaultColor?: string
    ): ThresholdEvaluationResult => {
      const matchedMarkerIds: string[] = [];
      const matchedMarkers: MarkerConfig[] = [];
      let mergedStyle: MarkerMatchStyle = {};
      let isUnderThreshold = false;
      let isAboveThreshold = false;

      for (const marker of resolvedMarkers) {
        if (marker.axis !== axis) continue;
        if (!marker.condition) continue;

        const { matches, isUnder, isAbove } = this.checkCondition(
          value,
          datum,
          marker
        );

        if (matches) {
          matchedMarkerIds.push(marker.id);
          matchedMarkers.push(marker);
          if (isUnder) isUnderThreshold = true;
          if (isAbove) isAboveThreshold = true;

          const fallbackThresholdColor =
            marker.matchStyle?.color ||
            marker.matchStyle?.fill ||
            marker.stroke ||
            '#ef4444';

          mergedStyle = {
            ...mergedStyle,
            color: fallbackThresholdColor,
            fill: marker.matchStyle?.fill || fallbackThresholdColor,
            stroke:
              marker.matchStyle?.stroke ||
              marker.stroke ||
              fallbackThresholdColor,
            ...(marker.matchStyle ?? {})
          };
        }
      }

      const matched = matchedMarkerIds.length > 0;
      const effectiveColor = matched
        ? mergedStyle.fill || mergedStyle.color || defaultColor
        : defaultColor;

      return {
        matched,
        isUnderThreshold,
        isAboveThreshold,
        matchedMarkerIds,
        matchedMarkers,
        style: mergedStyle,
        effectiveColor
      };
    };

    const recordMatchedItem = (
      item: Omit<
        ThresholdMatchedItem,
        | 'effectiveColor'
        | 'isUnderThreshold'
        | 'isAboveThreshold'
        | 'matchedMarkerIds'
        | 'style'
      >,
      evalResult: ThresholdEvaluationResult
    ): ThresholdMatchedItem => {
      const fullItem: ThresholdMatchedItem = {
        ...item,
        effectiveColor: evalResult.effectiveColor || item.originalColor,
        isUnderThreshold: evalResult.isUnderThreshold,
        isAboveThreshold: evalResult.isAboveThreshold,
        matchedMarkerIds: evalResult.matchedMarkerIds,
        style: evalResult.style
      };

      if (evalResult.matched) {
        matchedItems.push(fullItem);
        if (evalResult.isUnderThreshold) underThresholdItems.push(fullItem);
        if (evalResult.isAboveThreshold) aboveThresholdItems.push(fullItem);

        for (const m of resolvedMarkers) {
          if (evalResult.matchedMarkerIds.includes(m.id)) {
            m.matchedItems.push(fullItem);
          }
        }
      }

      return fullItem;
    };

    return {
      markers: resolvedMarkers,
      matchedItems,
      underThresholdItems,
      aboveThresholdItems,
      evaluate,
      recordMatchedItem
    };
  }

  private checkCondition(
    value: number,
    datum: any,
    marker: ResolvedMarker
  ): { matches: boolean; isUnder: boolean; isAbove: boolean } {
    const cond: MarkerCondition | undefined = marker.condition;
    if (!cond) return { matches: false, isUnder: false, isAbove: false };

    const rawThreshold =
      marker.value !== undefined
        ? Number(marker.value)
        : marker.to !== undefined
        ? Number(marker.to)
        : Number(marker.from ?? 0);

    if (typeof cond === 'function') {
      const matches = Boolean(cond(value, datum));
      return {
        matches,
        isUnder: matches && value < rawThreshold,
        isAbove: matches && value > rawThreshold
      };
    }

    const fromNum = Number(marker.from ?? marker.value ?? 0);
    const toNum = Number(marker.to ?? marker.value ?? 0);
    const low = Math.min(fromNum, toNum);
    const high = Math.max(fromNum, toNum);

    switch (cond) {
      case 'below':
      case 'under':
        return {
          matches: value < rawThreshold,
          isUnder: value < rawThreshold,
          isAbove: false
        };
      case 'lte':
        return {
          matches: value <= rawThreshold,
          isUnder: value <= rawThreshold,
          isAbove: false
        };
      case 'above':
      case 'over':
        return {
          matches: value > rawThreshold,
          isUnder: false,
          isAbove: value > rawThreshold
        };
      case 'gte':
        return {
          matches: value >= rawThreshold,
          isUnder: false,
          isAbove: value >= rawThreshold
        };
      case 'between':
        return {
          matches: value >= low && value <= high,
          isUnder: value <= high && low <= 0,
          isAbove: value >= low && low > 0
        };
      case 'outside':
        return {
          matches: value < low || value > high,
          isUnder: value < low,
          isAbove: value > high
        };
      default:
        return { matches: false, isUnder: false, isAbove: false };
    }
  }

  /**
   * Resolves inside marker label coordinates, text-anchor, and vertical baseline
   * for `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`,
   * `bottom-right` (plus shorthands `start`, `middle`, `end`) with configurable
   * `labelPadding` and `labelEdgePadding`.
   */
  private resolveMarkerLabelPlacement(
    marker: ResolvedMarker,
    ctx: ChartRenderContext<any>,
    bounds: { posPx?: number; minP?: number; maxP?: number }
  ): {
    x: number;
    y: number;
    anchor: NonNullable<LabelDescriptor['anchor']>;
    baseline: NonNullable<LabelDescriptor['baseline']>;
  } {
    const rawPos: MarkerLabelPosition = marker.labelPosition ?? 'top-right';

    // Normalize legacy shorthands ('start' | 'middle' | 'end')
    const normalizedPos: Exclude<MarkerLabelPosition, 'start' | 'middle' | 'end'> =
      rawPos === 'start'
        ? marker.axis === 'x'
          ? 'top-right'
          : 'top-left'
        : rawPos === 'middle'
        ? 'top-center'
        : rawPos === 'end'
        ? 'top-right'
        : rawPos;

    const pad = marker.labelPadding ?? 10;
    const edgePad = marker.labelEdgePadding ?? 10;
    const offsetX = marker.labelOffsetX ?? 0;
    const offsetY = marker.labelOffsetY ?? 0;

    const isArea = marker.type === 'area';
    const minP = bounds.minP ?? bounds.posPx ?? 0;
    const maxP = bounds.maxP ?? bounds.posPx ?? 0;
    const centerP = isArea ? (minP + maxP) / 2 : bounds.posPx ?? 0;

    let x = 0;
    let y = 0;
    let anchor: NonNullable<LabelDescriptor['anchor']> = 'middle';
    let baseline: NonNullable<LabelDescriptor['baseline']> = 'middle';

    if (marker.axis === 'y') {
      switch (normalizedPos) {
        case 'top-left':
          x = edgePad;
          y = isArea ? minP + pad : centerP - pad;
          anchor = 'start';
          baseline = isArea ? 'hanging' : 'alphabetic';
          break;
        case 'top-center':
          x = ctx.innerWidth / 2;
          y = isArea ? minP + pad : centerP - pad;
          anchor = 'middle';
          baseline = isArea ? 'hanging' : 'alphabetic';
          break;
        case 'top-right':
          x = ctx.innerWidth - edgePad;
          y = isArea ? minP + pad : centerP - pad;
          anchor = 'end';
          baseline = isArea ? 'hanging' : 'alphabetic';
          break;
        case 'bottom-left':
          x = edgePad;
          y = isArea ? maxP - pad : centerP + pad;
          anchor = 'start';
          baseline = isArea ? 'alphabetic' : 'hanging';
          break;
        case 'bottom-center':
          x = ctx.innerWidth / 2;
          y = isArea ? maxP - pad : centerP + pad;
          anchor = 'middle';
          baseline = isArea ? 'alphabetic' : 'hanging';
          break;
        case 'bottom-right':
          x = ctx.innerWidth - edgePad;
          y = isArea ? maxP - pad : centerP + pad;
          anchor = 'end';
          baseline = isArea ? 'alphabetic' : 'hanging';
          break;
      }
    } else {
      // axis === 'x' (vertical marker line or vertical marker area)
      switch (normalizedPos) {
        case 'top-left':
          x = isArea ? minP + pad : centerP - pad;
          y = edgePad;
          anchor = isArea ? 'start' : 'end';
          baseline = 'hanging';
          break;
        case 'top-center':
          x = centerP;
          y = edgePad;
          anchor = 'middle';
          baseline = 'hanging';
          break;
        case 'top-right':
          x = isArea ? maxP - pad : centerP + pad;
          y = edgePad;
          anchor = isArea ? 'end' : 'start';
          baseline = 'hanging';
          break;
        case 'bottom-left':
          x = isArea ? minP + pad : centerP - pad;
          y = ctx.innerHeight - edgePad;
          anchor = isArea ? 'start' : 'end';
          baseline = 'alphabetic';
          break;
        case 'bottom-center':
          x = centerP;
          y = ctx.innerHeight - edgePad;
          anchor = 'middle';
          baseline = 'alphabetic';
          break;
        case 'bottom-right':
          x = isArea ? maxP - pad : centerP + pad;
          y = ctx.innerHeight - edgePad;
          anchor = isArea ? 'end' : 'start';
          baseline = 'alphabetic';
          break;
      }
    }

    return {
      x: x + offsetX,
      y: y + offsetY,
      anchor,
      baseline
    };
  }

  /**
   * Renders an outside marker annotation (icon and/or text) placed at the plot
   * edge where the mark line/area reaches (`left`, `right`, `top`, or `bottom`),
   * with interactive hover and keyboard focus tooltip support (enabled by default).
   */
  private renderMarkerAnnotation(
    marker: ResolvedMarker,
    ctx: ChartRenderContext<any>,
    parentG: SVGGElement,
    bounds: { posPx?: number; minP?: number; maxP?: number }
  ): void {
    const ann = resolveMarkerAnnotation(marker);
    if (!ann) return;

    const isArea = marker.type === 'area';
    const minP = bounds.minP ?? bounds.posPx ?? 0;
    const maxP = bounds.maxP ?? bounds.posPx ?? 0;
    const centerP = isArea ? (minP + maxP) / 2 : bounds.posPx ?? 0;

    let x = 0;
    let y = 0;
    let anchor: NonNullable<LabelDescriptor['anchor']> = 'middle';
    let baseline: NonNullable<LabelDescriptor['baseline']> = 'middle';

    if (marker.axis === 'y') {
      switch (ann.position) {
        case 'left':
          x = -ann.padding;
          y = centerP;
          anchor = 'end';
          baseline = 'middle';
          break;
        case 'right':
          x = ctx.innerWidth + ann.padding;
          y = centerP;
          anchor = 'start';
          baseline = 'middle';
          break;
        case 'top':
          x = ctx.innerWidth / 2;
          y = -ann.padding;
          anchor = 'middle';
          baseline = 'alphabetic';
          break;
        case 'bottom':
          x = ctx.innerWidth / 2;
          y = ctx.innerHeight + ann.padding;
          anchor = 'middle';
          baseline = 'hanging';
          break;
      }
    } else {
      switch (ann.position) {
        case 'top':
          x = centerP;
          y = -ann.padding;
          anchor = 'middle';
          baseline = 'alphabetic';
          break;
        case 'bottom':
          x = centerP;
          y = ctx.innerHeight + ann.padding;
          anchor = 'middle';
          baseline = 'hanging';
          break;
        case 'left':
          x = -ann.padding;
          y = ctx.innerHeight / 2;
          anchor = 'end';
          baseline = 'middle';
          break;
        case 'right':
          x = ctx.innerWidth + ann.padding;
          y = ctx.innerHeight / 2;
          anchor = 'start';
          baseline = 'middle';
          break;
      }
    }

    x += ann.offsetX;
    y += ann.offsetY;

    const accent = marker.stroke || marker.fill || '#ef4444';
    const annG = document.createElementNS(SVG_NS, 'g');
    annG.setAttribute(
      'class',
      `mc-marker-annotation mc-marker-annotation--${ann.position}`
    );
    annG.setAttribute('data-marker-id', marker.id);
    annG.setAttribute('data-annotation-position', ann.position);
    annG.setAttribute('role', 'note');
    if (ann.enableTooltip) {
      annG.setAttribute('tabindex', '0');
      annG.setAttribute('pointer-events', 'auto');
      annG.style.pointerEvents = 'auto';
      annG.style.cursor = 'pointer';
    } else {
      annG.setAttribute('pointer-events', 'none');
      annG.style.pointerEvents = 'none';
      annG.style.cursor = 'default';
    }
    annG.setAttribute(
      'aria-label',
      ann.text || marker.label || `Marker annotation: ${marker.id}`
    );
    annG.style.outline = 'none';

    const annFontSize = ann.fontSize ?? Math.max(10, ctx.theme.fontSize - 1);
    const annFontWeight = ann.fontWeight ?? 600;
    const annDescriptor: LabelDescriptor = {
      id: `marker-annotation-${marker.id}`,
      text: ann.text,
      x,
      y,
      type: 'marker',
      anchor,
      baseline,
      fontSize: annFontSize,
      fontWeight: annFontWeight,
      fontFamily: ann.fontFamily,
      color:
        ann.color ??
        (ctx.theme.mode === 'dark' ? '#fecdd3' : accent),
      ...(ann.background ? { background: ann.background } : {}),
      ...(ann.borderColor ? { borderColor: ann.borderColor } : {}),
      ...(ann.borderRadius !== undefined ? { borderRadius: ann.borderRadius } : {}),
      ...(ann.labelPadding ? { padding: ann.labelPadding } : {}),
      ...(ann.renderer ? { renderer: ann.renderer } : {}),
      icon: ann.icon,
      datum: marker
    };
    if (typeof ann.formatter === 'function') {
      annDescriptor.text = ann.formatter(annDescriptor.text, annDescriptor);
    }

    // Transparent hover hit-area so boxless annotation text/icons remain easy to hover
    if (ann.enableTooltip) {
      const measured = ctx.measureText(annDescriptor.text, annDescriptor);
      const hitW = Math.max(18, measured.boxWidth + 8);
      const hitH = Math.max(18, measured.boxHeight + 6);
      const hitX =
        anchor === 'end'
          ? x - hitW + 4
          : anchor === 'middle'
          ? x - hitW / 2
          : x - 4;
      const hitY =
        baseline === 'hanging'
          ? y - 3
          : baseline === 'alphabetic'
          ? y - hitH + 3
          : y - hitH / 2;
      const hitRect = document.createElementNS(SVG_NS, 'rect');
      hitRect.setAttribute('class', 'mc-marker-annotation-hit');
      hitRect.setAttribute('x', String(hitX));
      hitRect.setAttribute('y', String(hitY));
      hitRect.setAttribute('width', String(hitW));
      hitRect.setAttribute('height', String(hitH));
      hitRect.setAttribute('rx', '4');
      hitRect.setAttribute('fill', 'transparent');
      annG.appendChild(hitRect);
    }

    ctx.renderLabel(annG, annDescriptor);

    ctx.registerEventTarget(annG, {
      target: 'marker',
      category: 'marker',
      id: marker.id,
      data: {
        id: marker.id,
        type: marker.type,
        axis: marker.axis,
        part: 'annotation',
        label: ann.text || marker.label || marker.id,
        value: marker.value,
        from: marker.from,
        to: marker.to,
        condition: marker.condition,
        matchedCount: marker.matchedItems.length,
        matchedItems: marker.matchedItems,
        marker
      }
    });

    if (ann.enableTooltip) {
      const valueDisplay =
        marker.type === 'area'
          ? `${marker.from ?? 0} – ${marker.to ?? 0}`
          : marker.value ?? '';
      const conditionBadge =
        typeof marker.condition === 'string'
          ? `Condition: ${marker.condition}${
              marker.type === 'area'
                ? ` (${marker.from ?? 0}–${marker.to ?? 0})`
                : marker.value !== undefined
                ? ` ${marker.value}`
                : ''
            }`
          : undefined;

      const buildPayload = (source: 'pointer' | 'keyboard' = 'pointer') => {
        const r = annG.getBoundingClientRect();
        return {
          title: ann.text || marker.label || marker.id,
          label: marker.type === 'area' ? 'Area Marker' : 'Line Marker',
          seriesId: marker.id,
          value: valueDisplay,
          formattedValue: ann.tooltipText ?? String(valueDisplay),
          color: accent,
          badge: conditionBadge,
          datum: marker,
          source,
          anchor:
            r.width > 0 || r.height > 0
              ? {
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                  relative: false
                }
              : {
                  left: ctx.margin.left + x,
                  top: ctx.margin.top + y,
                  width: 0,
                  height: 0,
                  relative: true
                }
        };
      };

      annG.addEventListener('mouseenter', (e) => {
        const me = e as MouseEvent;
        ctx.showTooltip(
          buildPayload('pointer'),
          me.clientX,
          me.clientY,
          ann.tooltipConfig
        );
      });
      annG.addEventListener('mousemove', (e) => {
        const me = e as MouseEvent;
        ctx.showTooltip(
          buildPayload('pointer'),
          me.clientX,
          me.clientY,
          ann.tooltipConfig
        );
      });
      annG.addEventListener('mouseleave', () => {
        ctx.hideTooltip();
      });
      annG.addEventListener('focus', () => {
        const rect = annG.getBoundingClientRect();
        ctx.showTooltip(
          buildPayload('keyboard'),
          rect.left + rect.width / 2,
          rect.top,
          { ...(ann.tooltipConfig ?? {}), position: 'item' }
        );
      });
      annG.addEventListener('blur', () => {
        ctx.hideTooltip();
      });
      annG.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') {
          ctx.hideTooltip();
        }
      });
    }

    parentG.appendChild(annG);
  }

  /**
   * Renders the built-in `'markers'` layer (both marker areas and marker lines,
   * with labels rendered through `<mc-label>` / `ctx.renderLabel`).
   */
  public renderMarkersLayer(ctx: ChartRenderContext<any>): void {
    const markers = ctx.markers ?? [];
    if (markers.length === 0) return;

    // Ensure the markers layer never intercepts hover/pointer events meant for underlying chart items
    ctx.layerGroup.setAttribute('pointer-events', 'none');
    ctx.layerGroup.style.pointerEvents = 'none';

    markers.forEach((marker) => {
      const itemG = document.createElementNS(SVG_NS, 'g');
      itemG.setAttribute(
        'class',
        `mc-marker mc-marker--${marker.type} mc-marker--${marker.axis}`
      );
      itemG.setAttribute('data-marker-id', marker.id);
      itemG.setAttribute('data-marker-type', marker.type);
      itemG.setAttribute('pointer-events', 'none');
      itemG.style.pointerEvents = 'none';

      if (marker.type === 'area') {
        const p0 = marker.pixelFrom ?? 0;
        const p1 = marker.pixelTo ?? 0;
        const minP = Math.min(p0, p1);
        const maxP = Math.max(p0, p1);
        const sizeP = Math.max(2, Math.abs(p1 - p0));

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('class', 'mc-marker-area');
        rect.setAttribute('pointer-events', 'none');
        rect.style.pointerEvents = 'none';
        if (marker.axis === 'x') {
          rect.setAttribute('x', String(minP));
          rect.setAttribute('y', '0');
          rect.setAttribute('width', String(sizeP));
          rect.setAttribute('height', String(ctx.innerHeight));
        } else {
          rect.setAttribute('x', '0');
          rect.setAttribute('y', String(minP));
          rect.setAttribute('width', String(ctx.innerWidth));
          rect.setAttribute('height', String(sizeP));
        }

        const fill = marker.fill || marker.stroke || '#ef4444';
        rect.setAttribute('fill', fill);
        rect.setAttribute('fill-opacity', String(marker.fillOpacity ?? 0.12));
        if (marker.stroke) {
          rect.setAttribute('stroke', marker.stroke);
          rect.setAttribute(
            'stroke-width',
            String(marker.strokeWidth ?? 1)
          );
          if (marker.strokeDasharray) {
            rect.setAttribute('stroke-dasharray', marker.strokeDasharray);
          }
        }
        itemG.appendChild(rect);

        if (marker.label) {
          const placement = this.resolveMarkerLabelPlacement(marker, ctx, {
            minP,
            maxP
          });
          const ls = marker.labelStyle;
          const areaLabelDesc: LabelDescriptor = {
            id: `marker-label-${marker.id}`,
            text: marker.label,
            x: placement.x,
            y: placement.y,
            type: 'marker',
            anchor: placement.anchor,
            baseline: placement.baseline,
            fontSize: ls?.fontSize ?? Math.max(10, ctx.theme.fontSize - 1),
            fontWeight: ls?.fontWeight ?? 600,
            fontFamily: ls?.fontFamily,
            color: ls?.color ?? (marker.stroke || fill),
            ...(ls?.renderMode ? { renderMode: ls.renderMode } : {}),
            ...(ls?.background ? { background: ls.background } : {}),
            ...(ls?.borderColor ? { borderColor: ls.borderColor } : {}),
            ...(ls?.borderRadius !== undefined ? { borderRadius: ls.borderRadius } : {}),
            ...(ls?.padding ? { padding: ls.padding } : {}),
            ...(ls?.maxWidth !== undefined ? { maxWidth: ls.maxWidth } : {}),
            ...(ls?.rotation !== undefined ? { rotation: ls.rotation } : {}),
            ...(ls?.templateHtml ? { templateHtml: ls.templateHtml } : {}),
            ...(ls?.renderer ? { renderer: ls.renderer } : {}),
            icon: ls?.icon ?? marker.icon,
            ...(ls?.iconPosition ? { iconPosition: ls.iconPosition } : {}),
            datum: marker
          };
          if (typeof ls?.formatter === 'function') {
            areaLabelDesc.text = ls.formatter(areaLabelDesc.text, areaLabelDesc);
          }

          const areaLabel = ctx.renderLabel(itemG, areaLabelDesc);
          if (areaLabel) {
            areaLabel.setAttribute('pointer-events', 'none');
            areaLabel.style.pointerEvents = 'none';
          }
        }

        this.renderMarkerAnnotation(marker, ctx, itemG, { minP, maxP });
      } else {
        const posPx = marker.pixelPos ?? 0;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('class', 'mc-marker-line');
        line.setAttribute('pointer-events', 'none');
        line.style.pointerEvents = 'none';

        if (marker.axis === 'x') {
          line.setAttribute('x1', String(posPx));
          line.setAttribute('x2', String(posPx));
          line.setAttribute('y1', '0');
          line.setAttribute('y2', String(ctx.innerHeight));
        } else {
          line.setAttribute('x1', '0');
          line.setAttribute('x2', String(ctx.innerWidth));
          line.setAttribute('y1', String(posPx));
          line.setAttribute('y2', String(posPx));
        }

        const stroke = marker.stroke || '#ef4444';
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-width', String(marker.strokeWidth ?? 2));
        line.setAttribute(
          'stroke-dasharray',
          marker.strokeDasharray ?? '6 4'
        );
        itemG.appendChild(line);

        if (marker.label) {
          const placement = this.resolveMarkerLabelPlacement(marker, ctx, {
            posPx
          });
          const ls = marker.labelStyle;
          const lineLabelDesc: LabelDescriptor = {
            id: `marker-label-${marker.id}`,
            text: marker.label,
            x: placement.x,
            y: placement.y,
            type: 'marker',
            anchor: placement.anchor,
            baseline: placement.baseline,
            fontSize: ls?.fontSize ?? Math.max(10, ctx.theme.fontSize - 1),
            fontWeight: ls?.fontWeight ?? 600,
            fontFamily: ls?.fontFamily,
            color:
              ls?.color ?? (ctx.theme.mode === 'dark' ? '#fecdd3' : stroke),
            ...(ls?.renderMode ? { renderMode: ls.renderMode } : {}),
            ...(ls?.background ? { background: ls.background } : {}),
            ...(ls?.borderColor ? { borderColor: ls.borderColor } : {}),
            ...(ls?.borderRadius !== undefined ? { borderRadius: ls.borderRadius } : {}),
            ...(ls?.padding ? { padding: ls.padding } : {}),
            ...(ls?.maxWidth !== undefined ? { maxWidth: ls.maxWidth } : {}),
            ...(ls?.rotation !== undefined ? { rotation: ls.rotation } : {}),
            ...(ls?.templateHtml ? { templateHtml: ls.templateHtml } : {}),
            ...(ls?.renderer ? { renderer: ls.renderer } : {}),
            icon: ls?.icon ?? marker.icon,
            ...(ls?.iconPosition ? { iconPosition: ls.iconPosition } : {}),
            datum: marker
          };
          if (typeof ls?.formatter === 'function') {
            lineLabelDesc.text = ls.formatter(lineLabelDesc.text, lineLabelDesc);
          }

          const lineLabel = ctx.renderLabel(itemG, lineLabelDesc);
          if (lineLabel) {
            lineLabel.setAttribute('pointer-events', 'none');
            lineLabel.style.pointerEvents = 'none';
          }
        }

        this.renderMarkerAnnotation(marker, ctx, itemG, { posPx });
      }

      ctx.layerGroup.appendChild(itemG);
    });
  }
}
