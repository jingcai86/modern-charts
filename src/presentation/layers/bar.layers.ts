import { joinChartItems } from '../../core/chart-item-join';
import { physicalTextAnchor } from '../../core/i18n';
import { renderLegendLayer } from '../../core/scale-manager';
import type {
  BarDatum,
  BarOuterLabelDatum,
  ChartRenderContext
} from '../../core/types';
import type { BarChartModel, ComputedBarItemModel } from '../../models/bar.model';
import { renderBarItem } from '../items/bar.item';

type BarGeometry = Pick<ComputedBarItemModel, 'x' | 'y' | 'width' | 'height'>;

interface BarMotionState {
  geometry: BarGeometry;
  value: number;
  moving: boolean;
}

const barMotion = new WeakMap<SVGGElement, BarMotionState>();

function interpolateBarGeometry(from: BarGeometry, to: BarGeometry, progress: number): BarGeometry {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: Math.max(0, from.width + (to.width - from.width) * progress),
    height: Math.max(0, from.height + (to.height - from.height) * progress)
  };
}

function barTransform(frame: BarGeometry, target: BarGeometry): string {
  const scaleX = frame.width / target.width;
  const scaleY = frame.height / target.height;
  const translateX = frame.x - target.x * scaleX;
  const translateY = frame.y - target.y * scaleY;
  return `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`;
}

/**
 * Dumb Presentation Layer for Bar Items (`bars` layer).
 */
export function renderBarsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  joinChartItems(
    ctx.layerGroup,
    model.bars,
    (bar) => JSON.stringify([bar.indexValue, bar.key]),
    ctx.animationConfig,
    (group, bar, { initial, entered, structureChanged, motion }) => {
      const animationIndex = initial ? bar.index : entered ? 0 : false;
      const mark = renderBarItem(bar, ctx, animationIndex);
      group.replaceChildren(mark);
      group.removeAttribute('transform');

      const previous = barMotion.get(group);
      const target = { x: bar.x, y: bar.y, width: bar.width, height: bar.height };
      const state = { geometry: target, value: bar.value, moving: false };
      barMotion.set(group, state);
      if (!motion || !previous || structureChanged || (previous.value === bar.value && !previous.moving)) return;

      const from = previous.geometry;
      const canTransform = target.width > 0 && target.height > 0;
      if ((!canTransform && mark.localName !== 'rect') ||
        !Object.values(from).every(Number.isFinite) || !Object.values(target).every(Number.isFinite) ||
        (from.x === target.x && from.y === target.y && from.width === target.width && from.height === target.height)
      ) return;

      state.moving = true;
      motion((progress) => {
        state.geometry = progress === 1 ? target : interpolateBarGeometry(from, target, progress);
        if (canTransform) {
          // Move threshold segments and their clips together.
          group.setAttribute('transform', barTransform(state.geometry, target));
        } else {
          for (const [attribute, value] of Object.entries(state.geometry)) mark.setAttribute(attribute, String(value));
        }
      }, () => {
        state.geometry = target;
        state.moving = false;
        group.removeAttribute('transform');
      });
    }
  );
}

/**
 * Dumb Presentation Layer for Outer / Stack-Summary Bar Labels (`type: 'bar-outer'`).
 * Renders labels above positive bars/stacks and below negative bars/stacks
 * (or aligned at `chart-bottom` / `above-zero`), coexisting seamlessly with
 * inner centered bar labels (`type: 'data'`) and supporting full `<mc-label>`
 * customization, padding, formatting, icons, `<foreignObject>`, and custom renderers.
 */
export function renderBarOuterLabelsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  const cfg = model.outerLabels;
  if (!cfg.enabled) return;

  const fontSize = cfg.fontSize ?? Math.max(11, ctx.theme.fontSize);
  const fontWeight = cfg.fontWeight ?? 700;
  const pad = cfg.padding;

  model.outerLabelItems.forEach((item) => {
    const outerDatum: BarOuterLabelDatum = {
      scope: item.scope,
      sign: item.sign,
      category: item.category,
      key: item.key,
      keys: item.keys,
      value: item.value,
      positiveTotal: item.positiveTotal,
      negativeTotal: item.negativeTotal,
      netTotal: item.netTotal,
      barCount: item.barCount,
      row: item.row
    };

    const text = cfg.formatter
      ? cfg.formatter(outerDatum)
      : ctx.i18n.formatNumber(Math.round(item.value * 100) / 100, { useGrouping: false });

    const maxWidth =
      cfg.maxWidth ??
      (item.isHorizontal ? undefined : Math.max(48, item.width + 24));

    const measured = ctx.measureText(text, {
      type: 'bar-outer',
      fontSize,
      fontWeight,
      fontFamily: cfg.fontFamily,
      background: cfg.background,
      padding: cfg.boxPadding,
      maxWidth,
      maxChars: cfg.maxChars,
      ellipsis: cfg.ellipsis,
      overflow: cfg.overflow,
      maxRotation: cfg.maxRotation,
      icon: cfg.icon,
      iconPosition: cfg.iconPosition,
      iconSize: cfg.iconSize,
      iconGap: cfg.iconGap,
      templateHtml: cfg.templateHtml
    });

    let labelX = 0;
    let labelY = 0;
    let placement = 'top';

    if (item.isHorizontal) {
      labelY = item.y + item.height / 2;
      if (item.sign === 'positive') {
        if (cfg.position === 'bottom') {
          labelX = item.x - pad - measured.boxWidth / 2;
          placement = 'bottom';
        } else {
          labelX = item.x + item.width + pad + measured.boxWidth / 2;
          placement = 'top';
        }
      } else if (cfg.negativePosition === 'chart-bottom') {
        labelX = pad + measured.boxWidth / 2;
        placement = 'chart-bottom';
      } else if (cfg.negativePosition === 'above-zero') {
        labelX = model.zeroPos + pad + measured.boxWidth / 2;
        placement = 'above-zero';
      } else {
        labelX = item.x - pad - measured.boxWidth / 2;
        placement = 'outside-bottom';
      }
    } else {
      labelX = item.x + item.width / 2;
      if (item.sign === 'positive') {
        if (cfg.position === 'bottom') {
          labelY = item.y + item.height + pad + measured.boxHeight / 2;
          placement = 'bottom';
        } else {
          labelY = item.y - pad - measured.boxHeight / 2;
          placement = 'top';
        }
      } else if (cfg.negativePosition === 'chart-bottom') {
        labelY = model.innerHeight - pad - measured.boxHeight / 2;
        placement = 'chart-bottom';
      } else if (cfg.negativePosition === 'above-zero') {
        labelY = model.zeroPos - pad - measured.boxHeight / 2;
        placement = 'above-zero';
      } else {
        labelY = item.y + item.height + pad + measured.boxHeight / 2;
        placement = 'outside-bottom';
      }
    }

    const rendered = ctx.renderLabel(ctx.layerGroup, {
      id: item.id,
      text,
      x: labelX,
      y: labelY,
      type: 'bar-outer',
      className: 'mc-bar-outer-label',
      anchor: 'middle',
      baseline: 'middle',
      maxWidth,
      maxChars: cfg.maxChars,
      ellipsis: cfg.ellipsis,
      overflow: cfg.overflow,
      maxRotation: cfg.maxRotation,
      enableTooltip: cfg.enableTooltip,
      tooltip: cfg.tooltip,
      fontSize,
      fontWeight,
      fontFamily: cfg.fontFamily,
      color: cfg.color ?? ctx.theme.textColor,
      background: cfg.background,
      borderColor: cfg.borderColor,
      borderRadius: cfg.borderRadius,
      padding: cfg.boxPadding,
      renderMode: cfg.renderMode,
      templateHtml: cfg.templateHtml,
      icon: cfg.icon,
      iconPosition: cfg.iconPosition,
      iconSize: cfg.iconSize,
      iconGap: cfg.iconGap,
      renderer: cfg.renderer,
      datum: outerDatum,
      meta: {
        scope: item.scope,
        sign: item.sign,
        placement,
        padding: pad
      }
    });

    if (rendered) {
      rendered.setAttribute('data-bar-outer-scope', item.scope);
      rendered.setAttribute('data-bar-outer-sign', item.sign);
      rendered.setAttribute('data-bar-outer-placement', placement);
      rendered.setAttribute('data-bar-outer-category', item.category);
    }
  });
}

/**
 * Dumb Presentation Layer for Bar Data Labels (`labels` layer).
 * Supports inner centered bar labels (`enableLabels`) AND outer/summary labels
 * (`outerLabels`) independently or simultaneously.
 */
export function renderBarLabelsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>,
  options: { includeOuterLabels?: boolean } = {}
): void {
  const includeOuter = options.includeOuterLabels ?? true;

  if (model.enableLabels) {
    model.bars.forEach((b, idx) => {
      const text = ctx.i18n.formatNumber(b.value, { useGrouping: false });
      const measured = ctx.measureText(text, {
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        icon: b.threshold.style.icon
      });

      const fitsInside =
        b.height >= measured.boxHeight + 6 && b.width >= measured.boxWidth + 6;

      // When outer labels are simultaneously enabled, keep inner labels strictly
      // inside fitting bars so tiny bars do not collide with the outer label above/below.
      if (model.outerLabels.enabled && !fitsInside) {
        return;
      }

      let labelX = b.x + b.width / 2;
      let labelY = b.y + b.height / 2;
      let anchor: 'start' | 'middle' | 'end' = 'middle';
      let maxWidth = Math.max(36, b.width + 12);

      if (!fitsInside) {
        if (b.isHorizontal) {
          labelY = b.y + b.height / 2;
          if (b.value < 0) {
            labelX = b.x - 6;
            anchor = 'end';
            maxWidth = Math.max(36, labelX + ctx.margin.left - 6);
          } else {
            labelX = b.x + b.width + 6;
            anchor = 'start';
            maxWidth = Math.max(36, ctx.innerWidth - labelX + ctx.margin.right - 6);
          }
        } else if (b.value < 0) {
          labelY = b.y + b.height + 10;
        } else {
          labelY = Math.max(10, b.y - 10);
        }
      }

      ctx.renderLabel(ctx.layerGroup, {
        id: `bar-label-${idx}`,
        text,
        x: labelX,
        y: labelY,
        type: 'data',
        anchor: physicalTextAnchor(anchor, ctx.i18n.direction),
        baseline: 'middle',
        maxWidth,
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        fontWeight: 600,
        color:
          b.threshold.style.labelColor ??
          (fitsInside ? '#ffffff' : ctx.theme.textColor),
        icon: b.threshold.style.icon,
        datum: {
          id: b.key,
          category: b.indexValue,
          value: b.value,
          isUnderThreshold: b.threshold.isUnderThreshold,
          ...b.datum
        }
      });
    });
  }

  if (includeOuter && model.outerLabels.enabled) {
    renderBarOuterLabelsLayer(model, ctx);
  }
}

/**
 * Dumb Presentation Layer for Bar Legends (`legends` layer).
 */
export function renderBarLegendsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  renderLegendLayer(
    ctx,
    model.activeKeys.map((k) => ({
      id: k,
      label: k,
      color: ctx.colorScale(k)
    })),
    'bottom'
  );
}
