import { joinChartItems, type ItemMotion } from '../../core/chart-item-join';
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

interface BarFrame {
  baseline: number;
  tip: number;
  bandStart: number;
  bandSize: number;
}

interface BarMotionState {
  frame: BarFrame;
  painted: BarGeometry;
  category: string;
  isHorizontal: boolean;
}

interface BandExtent {
  start: number;
  end: number;
}

interface BarLabelMotion {
  label?: { element: SVGElement; transform: string | null; opacity: string };
  frame?: { dx: number; dy: number; progress: number; entering: boolean };
}

const barMotion = new WeakMap<SVGGElement, BarMotionState>();
const labelMotion = new WeakMap<ComputedBarItemModel, BarLabelMotion>();

function barLabelMotion(bar: ComputedBarItemModel): BarLabelMotion {
  let binding = labelMotion.get(bar);
  if (!binding) {
    binding = {};
    labelMotion.set(bar, binding);
  }
  return binding;
}

function applyBarLabelMotion(binding: BarLabelMotion): void {
  const { label, frame } = binding;
  if (!label || !frame) return;
  const { element, transform, opacity } = label;
  if (frame.progress === 1) {
    if (transform === null) element.removeAttribute('transform');
    else element.setAttribute('transform', transform);
    if (frame.entering) element.style.opacity = opacity;
    return;
  }
  element.setAttribute('transform', `translate(${frame.dx},${frame.dy}) ${transform ?? ''}`);
  if (frame.entering) element.style.opacity = String(frame.progress);
}

function frameForBar(bar: ComputedBarItemModel): BarFrame {
  const start = bar.isHorizontal ? bar.x : bar.y;
  const end = start + (bar.isHorizontal ? bar.width : bar.height);
  const baseline = bar.valueBaseline ?? (bar.isHorizontal === (bar.value >= 0) ? start : end);
  return {
    baseline,
    tip: baseline === start ? end : start,
    bandStart: bar.isHorizontal ? bar.y : bar.x,
    bandSize: bar.isHorizontal ? bar.height : bar.width
  };
}

function geometryForFrame(frame: BarFrame, isHorizontal: boolean): BarGeometry {
  const start = Math.min(frame.baseline, frame.tip);
  const span = Math.abs(frame.tip - frame.baseline);
  return isHorizontal
    ? { x: start, y: frame.bandStart, width: span, height: frame.bandSize }
    : { x: frame.bandStart, y: start, width: frame.bandSize, height: span };
}

function barTransform(frame: BarGeometry, target: BarGeometry): string {
  const scaleX = frame.width / target.width;
  const scaleY = frame.height / target.height;
  const translateX = frame.x - target.x * scaleX;
  const translateY = frame.y - target.y * scaleY;
  return `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`;
}

function recordBand(bands: Map<string, BandExtent>, category: string, frame: BarFrame): void {
  const present = bands.get(category);
  const { bandStart, bandSize } = frame;
  bands.set(category, {
    start: Math.min(present?.start ?? bandStart, bandStart),
    end: Math.max(present?.end ?? bandStart, bandStart + bandSize)
  });
}

function collapsedBarFrame(
  state: BarMotionState,
  source: Map<string, BandExtent>,
  destination: Map<string, BandExtent>,
  span: number
): BarFrame {
  const { baseline, bandStart, bandSize } = state.frame;
  const center = bandStart + bandSize / 2;
  const existing = destination.get(state.category);
  let boundary = center;
  if (existing) {
    boundary = (existing.start + existing.end) / 2;
  } else {
    // Keep the collapsing band between its surviving neighbors as they move.
    let lower = -Infinity;
    let upper = Infinity;
    let before = 0;
    let after = span;
    for (const [category, previous] of source) {
      const next = destination.get(category);
      if (!next) continue;
      const candidate = (previous.start + previous.end) / 2;
      if (candidate < center && candidate > lower) {
        lower = candidate;
        before = next.end;
      }
      if (candidate > center && candidate < upper) {
        upper = candidate;
        after = next.start;
      }
    }
    boundary = lower === -Infinity ? 0 : upper === Infinity ? span : (before + after) / 2;
  }
  return { baseline, tip: baseline, bandStart: boundary, bandSize: 0 };
}

function animateBarFrame(
  group: SVGGElement,
  mark: Element,
  state: BarMotionState,
  from: BarFrame,
  to: BarFrame,
  motion: ItemMotion,
  onFrame?: (geometry: BarGeometry, progress: number) => void
): void {
  const { painted, isHorizontal } = state;
  const canTransform = painted.width > 0 && painted.height > 0;
  if ((!canTransform && mark.localName !== 'rect') ||
    !Object.values(from).every(Number.isFinite) || !Object.values(to).every(Number.isFinite) ||
    (from.baseline === to.baseline && from.tip === to.tip && from.bandStart === to.bandStart && from.bandSize === to.bandSize)
  ) return;

  motion((progress) => {
    state.frame = progress === 1 ? to : {
      baseline: from.baseline + (to.baseline - from.baseline) * progress,
      tip: from.tip + (to.tip - from.tip) * progress,
      bandStart: from.bandStart + (to.bandStart - from.bandStart) * progress,
      bandSize: from.bandSize + (to.bandSize - from.bandSize) * progress
    };
    const geometry = geometryForFrame(state.frame, isHorizontal);
    if (canTransform) {
      // Move threshold segments and their clips together.
      group.setAttribute('transform', barTransform(geometry, painted));
    } else {
      for (const [attribute, value] of Object.entries(geometry)) mark.setAttribute(attribute, String(value));
    }
    onFrame?.(geometry, progress);
  }, () => group.removeAttribute('transform'));
}

/**
 * Dumb Presentation Layer for Bar Items (`bars` layer).
 */
export function renderBarsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  const isHorizontal = model.layout === 'horizontal';
  const span = isHorizontal ? ctx.innerHeight : ctx.innerWidth;
  const previousBands = new Map<string, BandExtent>();
  for (const group of ctx.layerGroup.children) {
    const previous = barMotion.get(group as SVGGElement);
    if (previous?.isHorizontal === isHorizontal) recordBand(previousBands, previous.category, previous.frame);
  }
  const nextBands = new Map<string, BandExtent>();
  for (const bar of model.bars) recordBand(nextBands, bar.indexValue, frameForBar(bar));

  joinChartItems(
    ctx.layerGroup,
    model.bars,
    (bar) => JSON.stringify([bar.indexValue, bar.key]),
    ctx.animationConfig,
    (group, bar, { initial, entered, motion }) => {
      const mark = renderBarItem(bar, ctx, initial ? bar.index : false);
      group.replaceChildren(mark);
      group.removeAttribute('transform');

      const previous = barMotion.get(group);
      const target = frameForBar(bar);
      const state = {
        frame: target,
        painted: bar,
        category: bar.indexValue,
        isHorizontal: bar.isHorizontal
      };
      barMotion.set(group, state);
      if (!motion) return;
      const from = previous?.isHorizontal === isHorizontal
        ? previous.frame
        : entered
          ? collapsedBarFrame(state, nextBands, previousBands, span)
          : target;
      const binding = model.enableLabels ? barLabelMotion(bar) : undefined;
      const followLabel = binding ? (frame: BarGeometry, progress: number) => {
        binding.frame = {
          dx: frame.x - bar.x + (frame.width - bar.width) / 2,
          dy: frame.y - bar.y + (frame.height - bar.height) / 2,
          progress,
          entering: entered && !previous
        };
        applyBarLabelMotion(binding);
      } : undefined;
      animateBarFrame(group, mark, state, from, target, motion, followLabel);
    },
    (group, motion) => {
      const state = barMotion.get(group);
      // Shared paint retention can prepend a defs node before the original mark.
      const mark = group.lastElementChild;
      if (!state || !mark) return;
      const target = collapsedBarFrame(state, previousBands, nextBands, span);
      animateBarFrame(group, mark, state, state.frame, target, motion);
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

      const rendered = ctx.renderLabel(ctx.layerGroup, {
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
      if (rendered && ctx.animationConfig.enabled) {
        const binding = barLabelMotion(b);
        binding.label = {
          element: rendered,
          transform: rendered.getAttribute('transform'),
          opacity: rendered.style.opacity
        };
        applyBarLabelMotion(binding);
      }
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
