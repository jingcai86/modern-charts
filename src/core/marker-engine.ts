import { getScalePosition } from './scale-manager';
import type {
  ChartRenderContext,
  LabelDescriptor,
  MarkerCondition,
  MarkerConfig,
  MarkerLabelPosition,
  MarkerMatchStyle,
  ResolvedMarker,
  ThresholdContextInfo,
  ThresholdEvaluationResult,
  ThresholdMatchedItem
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
   * Resolves marker label coordinates, text-anchor, and vertical baseline
   * for inside (`top-left`, `top-center`, `top-right`, `bottom-left`,
   * `bottom-center`, `bottom-right`, plus legacy `start`/`middle`/`end`)
   * and outside (`outside-left`, `outside-right`, `outside-top`, `outside-bottom`)
   * positions with configurable `labelPadding` and `labelEdgePadding`.
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
    const rawPos: MarkerLabelPosition =
      marker.labelPosition ?? (marker.axis === 'x' ? 'top-right' : 'top-right');

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

    const isOutside = normalizedPos.startsWith('outside-');
    const pad = marker.labelPadding ?? (isOutside ? 8 : 10);
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
        case 'outside-left':
          x = -pad;
          y = centerP;
          anchor = 'end';
          baseline = 'middle';
          break;
        case 'outside-right':
          x = ctx.innerWidth + pad;
          y = centerP;
          anchor = 'start';
          baseline = 'middle';
          break;
        case 'outside-top':
          x = ctx.innerWidth / 2;
          y = -pad;
          anchor = 'middle';
          baseline = 'alphabetic';
          break;
        case 'outside-bottom':
          x = ctx.innerWidth / 2;
          y = ctx.innerHeight + pad;
          anchor = 'middle';
          baseline = 'hanging';
          break;
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
        case 'outside-top':
          x = centerP;
          y = -pad;
          anchor = 'middle';
          baseline = 'alphabetic';
          break;
        case 'outside-bottom':
          x = centerP;
          y = ctx.innerHeight + pad;
          anchor = 'middle';
          baseline = 'hanging';
          break;
        case 'outside-left':
          x = -pad;
          y = edgePad;
          anchor = 'end';
          baseline = 'hanging';
          break;
        case 'outside-right':
          x = ctx.innerWidth + pad;
          y = edgePad;
          anchor = 'start';
          baseline = 'hanging';
          break;
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

          const areaLabel = ctx.renderLabel(itemG, {
            id: `marker-label-${marker.id}`,
            text: marker.label,
            x: placement.x,
            y: placement.y,
            type: 'marker',
            anchor: placement.anchor,
            baseline: placement.baseline,
            fontSize: Math.max(10, ctx.theme.fontSize - 1),
            fontWeight: 600,
            color: marker.stroke || '#fda4af',
            background:
              ctx.theme.mode === 'dark'
                ? 'rgba(15, 23, 42, 0.84)'
                : 'rgba(255, 255, 255, 0.9)',
            borderColor: marker.stroke || fill,
            borderRadius: 5,
            icon: marker.icon,
            datum: marker
          });
          if (areaLabel) {
            areaLabel.setAttribute('pointer-events', 'none');
            areaLabel.style.pointerEvents = 'none';
          }
        }
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

          const lineLabel = ctx.renderLabel(itemG, {
            id: `marker-label-${marker.id}`,
            text: marker.label,
            x: placement.x,
            y: placement.y,
            type: 'marker',
            anchor: placement.anchor,
            baseline: placement.baseline,
            fontSize: Math.max(10, ctx.theme.fontSize - 1),
            fontWeight: 600,
            color:
              ctx.theme.mode === 'dark' ? '#fecdd3' : stroke,
            background:
              ctx.theme.mode === 'dark'
                ? 'rgba(136, 19, 55, 0.82)'
                : 'rgba(255, 241, 242, 0.95)',
            borderColor: stroke,
            borderRadius: 5,
            icon: marker.icon,
            datum: marker
          });
          if (lineLabel) {
            lineLabel.setAttribute('pointer-events', 'none');
            lineLabel.style.pointerEvents = 'none';
          }
        }
      }

      ctx.layerGroup.appendChild(itemG);
    });
  }
}
