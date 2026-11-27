import { HTMLElementBase } from '../../core/dom';
import { resolveElementAnchor } from '../../core/tooltip-anchor';
import type { ChartRenderContext } from '../../core/types';
import type {
  ComputedRadarPointModel,
  ComputedRadarSeriesModel
} from '../../models/radar.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Dumb Presentation Renderer for a single Radar Series Polygon Item.
 */
export function renderRadarPolygonItem(
  s: ComputedRadarSeriesModel,
  ctx: ChartRenderContext<any>,
  initial = true
): SVGPolygonElement {
  const poly = document.createElementNS(SVG_NS, 'polygon');
  poly.setAttribute('class', 'mc-radar-polygon');
  poly.setAttribute('data-item-component', 'mc-radar-item');
  poly.setAttribute('data-key', s.key);
  poly.setAttribute('points', s.polygonPointsAttr);
  const radarFill =
    ctx.resolveFill?.({
      id: s.key,
      seriesId: s.key,
      key: s.key,
      index: s.index,
      color: s.color,
      chartType: 'radar',
      target: 'polygon',
      datum: s
    }) ?? s.color;
  poly.setAttribute('fill', radarFill);
  poly.setAttribute('fill-opacity', String(s.fillOpacity));
  poly.setAttribute('stroke', s.color);
  poly.setAttribute('stroke-width', '2.2');
  if (s.blendMode && s.blendMode !== 'normal') {
    poly.style.mixBlendMode = s.blendMode;
    poly.setAttribute('data-blend-mode', s.blendMode);
  }

  if (initial) {
    ctx.animateItem(poly, { type: 'radar-expand', index: s.index });
  }

  ctx.registerEventTarget(poly, {
    target: 'radarPolygon',
    category: 'item',
    id: s.key,
    data: {
      id: s.key,
      seriesId: s.key,
      key: s.key,
      index: s.index,
      count: s.points.length,
      color: s.color,
      points: s.points.map((p) => ({ axis: p.axis, value: p.value }))
    }
  });

  return poly;
}

/**
 * Dumb Presentation Renderer for a single Radar Vertex Dot Item.
 */
export function renderRadarDotItem(
  pt: ComputedRadarPointModel,
  ctx: ChartRenderContext<any>,
  initial = true
): SVGCircleElement {
  const baseRadius = pt.dotRadius ?? 4.2;
  const borderWidth = pt.dotBorderWidth ?? 1.8;
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'mc-radar-dot');
  dot.setAttribute('data-item-component', 'mc-radar-dot-item');
  dot.setAttribute('cx', String(pt.x));
  dot.setAttribute('cy', String(pt.y));
  dot.setAttribute('r', String(baseRadius));
  dot.setAttribute('fill', pt.color);
  dot.setAttribute('stroke', ctx.theme.background);
  dot.setAttribute('stroke-width', String(borderWidth));
  const interactive = ctx.isInteractive !== false;
  if (interactive) {
    dot.style.cursor = 'pointer';
  }

  const radarCx =
    (ctx.state?.model as { cx?: number } | undefined)?.cx ?? ctx.innerWidth / 2;
  const radarCy =
    (ctx.state?.model as { cy?: number } | undefined)?.cy ?? ctx.innerHeight / 2;
  const fallbackAnchor = {
    left: ctx.margin.left + radarCx + pt.x - baseRadius,
    top: ctx.margin.top + radarCy + pt.y - baseRadius,
    width: baseRadius * 2,
    height: baseRadius * 2,
    relative: true
  };

  ctx.decorateAriaItem(dot, {
    type: 'radar-point',
    index: pt.globalIndex,
    total: pt.totalDots,
    id: `${pt.seriesKey}-${pt.axis}`,
    label: `${pt.seriesKey} ${pt.axis}`,
    seriesId: pt.seriesKey,
    category: pt.axis,
    value: pt.value,
    formattedValue: ctx.i18n.formatNumber(pt.value, { useGrouping: false }),
    color: pt.color,
    anchor: fallbackAnchor,
    datum: {
      key: pt.seriesKey,
      axis: pt.axis,
      value: pt.value
    }
  });

  if (initial) {
    ctx.animateItem(dot, {
      type: 'point-pop',
      index: pt.globalIndex,
      originX: pt.x,
      originY: pt.y
    });
  }

  if (interactive) {
    dot.addEventListener('mouseenter', (e) => {
      dot.setAttribute('r', String(baseRadius + 1.8));
      ctx.showTooltip(
        {
          title: pt.axis,
          label: pt.seriesKey,
          seriesId: pt.seriesKey,
          category: pt.axis,
          value: pt.value,
          formattedValue: ctx.i18n.formatNumber(pt.value, { useGrouping: false }),
          color: pt.color,
          anchor: resolveElementAnchor(dot, fallbackAnchor),
          datum: {
            key: pt.seriesKey,
            axis: pt.axis,
            value: pt.value
          }
        },
        (e as MouseEvent).clientX,
        (e as MouseEvent).clientY
      );
    });
    dot.addEventListener('mouseleave', () => {
      dot.setAttribute('r', String(baseRadius));
      ctx.hideTooltip();
    });
  }

  ctx.registerEventTarget(dot, {
    target: 'radarDot',
    category: 'item',
    id: `${pt.seriesKey}-${pt.axis}`,
    data: {
      id: `${pt.seriesKey}-${pt.axis}`,
      seriesId: pt.seriesKey,
      key: pt.seriesKey,
      axis: pt.axis,
      value: pt.value,
      index: pt.globalIndex,
      count: pt.totalDots,
      color: pt.color
    }
  });

  return dot;
}

export class MCRadarItem extends HTMLElementBase {}
