import { buildAxisScale } from '../core/scale-manager';
import { createOrdinalColorScale } from '../core/theme';
import type {
  BarDatum,
  BarNegativeLabelPosition,
  BarOuterLabelConfig,
  BarOuterLabelPosition,
  BarOuterLabelScope,
  ChartRenderContext,
  ThresholdEvaluationResult,
  ThresholdMatchedItem
} from '../core/types';

export interface ResolvedBarOuterLabelConfig extends BarOuterLabelConfig {
  enabled: boolean;
  scope: BarOuterLabelScope;
  position: BarOuterLabelPosition;
  negativePosition: BarNegativeLabelPosition;
  padding: number;
}

export function createDefaultBarOuterLabelConfig(
  input?: boolean | BarOuterLabelConfig
): ResolvedBarOuterLabelConfig {
  if (typeof input === 'boolean') {
    return {
      enabled: input,
      scope: 'auto',
      position: 'auto',
      negativePosition: 'outside-bottom',
      padding: 8
    };
  }
  return {
    ...input,
    enabled: input?.enabled === true,
    scope: input?.scope ?? 'auto',
    position: input?.position ?? 'auto',
    negativePosition: input?.negativePosition ?? 'outside-bottom',
    padding:
      input?.padding !== undefined && Number.isFinite(input.padding)
        ? Math.max(0, input.padding)
        : 8
  };
}

export interface ComputedBarItemModel {
  id: string;
  index: number;
  total: number;
  key: string;
  indexValue: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  isHorizontal: boolean;
  originalColor: string;
  color: string;
  threshold: ThresholdEvaluationResult;
  datum: BarDatum;
}

export interface ComputedBarOuterLabelModel {
  id: string;
  index: number;
  scope: 'bar' | 'stack';
  sign: 'positive' | 'negative';
  category: string;
  key?: string;
  keys: string[];
  value: number;
  positiveTotal: number;
  negativeTotal: number;
  netTotal: number;
  barCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isHorizontal: boolean;
  row: BarDatum;
}

export interface BarChartModel {
  bars: ComputedBarItemModel[];
  outerLabelItems: ComputedBarOuterLabelModel[];
  outerLabels: ResolvedBarOuterLabelConfig;
  activeKeys: string[];
  indexBy: string;
  groupMode: 'grouped' | 'stacked';
  layout: 'vertical' | 'horizontal';
  zeroPos: number;
  innerWidth: number;
  innerHeight: number;
  xTitle?: string;
  yTitle?: string;
  enableLabels: boolean;
}

export interface BarModelInput {
  indexBy: string;
  keys: string[];
  groupMode: 'grouped' | 'stacked';
  layout: 'vertical' | 'horizontal';
  padding?: number;
  innerPadding?: number;
  min?: number;
  max?: number;
  reverse?: boolean;
  barMaxWidth?: number;
  barMinHeight?: number;
  borderRadius: number;
  enableLabels: boolean;
  outerLabels?: boolean | BarOuterLabelConfig;
  xTitle?: string;
  yTitle?: string;
  setupThresholds: (ctx: ChartRenderContext<BarDatum[]>) => void;
  recordThresholdItem?: (
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
}

/**
 * Pure Model Layer for `<mc-bar-chart>`.
 * Computes D3 band/linear scales, grouped/stacked bar geometry, outer/summary
 * label anchors, and threshold state without creating any DOM nodes.
 */
export function computeBarChartModel(
  ctx: ChartRenderContext<BarDatum[]>,
  input: BarModelInput
): BarChartModel {
  const rows = Array.isArray(ctx.data) ? ctx.data : [];
  const { indexBy, keys: activeKeys, groupMode, layout, borderRadius } = input;
  const isStacked =
    groupMode === 'stacked' || ctx.scaleConfig.y.stacked === true;
  const isHorizontal = layout === 'horizontal';
  const outerLabels = createDefaultBarOuterLabelConfig(input.outerLabels);

  const categories = rows.map((r) => String(r[indexBy] ?? ''));
  const numericValues: number[] = [0];

  rows.forEach((r) => {
    if (isStacked) {
      let sumPos = 0;
      let sumNeg = 0;
      activeKeys.forEach((k) => {
        const v = Number(r[k] ?? 0);
        if (v >= 0) sumPos += v;
        else sumNeg += v;
      });
      numericValues.push(sumPos, sumNeg);
    } else {
      activeKeys.forEach((k) => {
        numericValues.push(Number(r[k] ?? 0));
      });
    }
  });

  const bandAxisOverrides =
    input.padding !== undefined && Number.isFinite(input.padding)
      ? {
          padding: Math.max(0, Math.min(0.85, Number(input.padding))),
          innerPadding: Math.max(0, Math.min(0.85, Number(input.padding))),
          outerPadding: Math.max(0, Math.min(0.85, Number(input.padding))) / 2
        }
      : {};

  const valAxisOverrides = {
    ...(input.min !== undefined && Number.isFinite(input.min)
      ? { min: Number(input.min) }
      : {}),
    ...(input.max !== undefined && Number.isFinite(input.max)
      ? { max: Number(input.max) }
      : {}),
    ...(input.reverse !== undefined ? { reverse: Boolean(input.reverse) } : {})
  };

  if (isHorizontal) {
    ctx.xScale = buildAxisScale(
      { ...ctx.scaleConfig.y, type: 'linear', ...valAxisOverrides },
      numericValues,
      [0, ctx.innerWidth]
    );
    ctx.yScale = buildAxisScale(
      { ...ctx.scaleConfig.x, type: 'band', ...bandAxisOverrides },
      categories,
      [0, ctx.innerHeight]
    );
  } else {
    ctx.xScale = buildAxisScale(
      { ...ctx.scaleConfig.x, type: 'band', ...bandAxisOverrides },
      categories,
      [0, ctx.innerWidth]
    );
    ctx.yScale = buildAxisScale(
      { ...ctx.scaleConfig.y, ...valAxisOverrides },
      numericValues,
      [ctx.innerHeight, 0]
    );
  }

  ctx.colorScale = createOrdinalColorScale(ctx.theme, activeKeys);
  input.setupThresholds(ctx);

  const rawRects: Omit<ComputedBarItemModel, 'index' | 'total'>[] = [];
  const bandScale = isHorizontal ? ctx.yScale : ctx.xScale;
  const valScale = isHorizontal ? ctx.xScale : ctx.yScale;
  const zeroPos = Number(valScale(0));
  const bandwidth =
    typeof bandScale.bandwidth === 'function' ? bandScale.bandwidth() : 32;
  const innerPad =
    input.innerPadding !== undefined && Number.isFinite(input.innerPadding)
      ? Math.max(0, Number(input.innerPadding))
      : 3;
  const maxBarThickness =
    input.barMaxWidth !== undefined &&
    Number.isFinite(input.barMaxWidth) &&
    Number(input.barMaxWidth) > 0
      ? Number(input.barMaxWidth)
      : Infinity;
  const minBarSpan =
    input.barMinHeight !== undefined && Number.isFinite(input.barMinHeight)
      ? Math.max(1, Number(input.barMinHeight))
      : 1;
  const valueAxis: 'x' | 'y' = isHorizontal ? 'x' : 'y';

  const rowSummaries: {
    category: string;
    row: BarDatum;
    positiveTotal: number;
    negativeTotal: number;
    netTotal: number;
    posBars: Omit<ComputedBarItemModel, 'index' | 'total'>[];
    negBars: Omit<ComputedBarItemModel, 'index' | 'total'>[];
  }[] = [];

  rows.forEach((row) => {
    const cat = String(row[indexBy] ?? '');
    const bandPos = Number(bandScale(cat) ?? 0);
    let runningPos = 0;
    let runningNeg = 0;
    let positiveTotal = 0;
    let negativeTotal = 0;
    const posBars: Omit<ComputedBarItemModel, 'index' | 'total'>[] = [];
    const negBars: Omit<ComputedBarItemModel, 'index' | 'total'>[] = [];

    activeKeys.forEach((key, kIdx) => {
      const val = Number(row[key] ?? 0);
      const originalColor = ctx.colorScale(key);

      let x = 0;
      let y = 0;
      let width = 0;
      let height = 0;

      if (isHorizontal) {
        if (isStacked) {
          const base = val >= 0 ? runningPos : runningNeg;
          const next = base + val;
          if (val >= 0) runningPos = next;
          else runningNeg = next;
          const x0 = Number(valScale(base));
          const x1 = Number(valScale(next));
          const rawW = Math.abs(x1 - x0);
          width = val !== 0 ? Math.max(minBarSpan, rawW) : Math.max(1, rawW);
          x = x1 >= x0 ? x0 : x0 - width;
          height = Math.min(bandwidth, maxBarThickness);
          y = bandPos + (bandwidth - height) / 2;
        } else {
          const rawSubH = Math.max(
            4,
            (bandwidth - (activeKeys.length - 1) * innerPad) / activeKeys.length
          );
          const subH = Math.min(rawSubH, maxBarThickness);
          const groupSpan =
            activeKeys.length * subH + (activeKeys.length - 1) * innerPad;
          const groupStart = bandPos + (bandwidth - groupSpan) / 2;
          const x0 = Number(valScale(0));
          const x1 = Number(valScale(val));
          const rawW = Math.abs(x1 - x0);
          width = val !== 0 ? Math.max(minBarSpan, rawW) : Math.max(1, rawW);
          x = x1 >= x0 ? x0 : x0 - width;
          y = groupStart + kIdx * (subH + innerPad);
          height = subH;
        }
      } else {
        if (isStacked) {
          const base = val >= 0 ? runningPos : runningNeg;
          const next = base + val;
          if (val >= 0) runningPos = next;
          else runningNeg = next;
          const y0 = Number(valScale(base));
          const y1 = Number(valScale(next));
          const rawH = Math.abs(y0 - y1);
          height = val !== 0 ? Math.max(minBarSpan, rawH) : Math.max(1, rawH);
          y = y1 <= y0 ? y0 - height : y0;
          width = Math.min(bandwidth, maxBarThickness);
          x = bandPos + (bandwidth - width) / 2;
        } else {
          const rawSubW = Math.max(
            4,
            (bandwidth - (activeKeys.length - 1) * innerPad) / activeKeys.length
          );
          const subW = Math.min(rawSubW, maxBarThickness);
          const groupSpan =
            activeKeys.length * subW + (activeKeys.length - 1) * innerPad;
          const groupStart = bandPos + (bandwidth - groupSpan) / 2;
          const y0 = Number(valScale(0));
          const y1 = Number(valScale(val));
          const rawH = Math.abs(y0 - y1);
          height = val !== 0 ? Math.max(minBarSpan, rawH) : Math.max(1, rawH);
          x = groupStart + kIdx * (subW + innerPad);
          y = y1 <= y0 ? y0 - height : y0;
          width = subW;
        }
      }

      const evalResult = ctx.evaluateThresholds(
        val,
        { key, indexValue: cat, value: val, ...row },
        valueAxis,
        originalColor
      );

      const color = evalResult.effectiveColor || originalColor;

      input.recordThresholdItem?.(
        {
          id: `${key}-${cat}`,
          seriesId: key,
          category: cat,
          value: val,
          px: x + width / 2,
          py: y,
          width,
          height,
          originalColor,
          datum: { key, indexValue: cat, value: val, ...row }
        },
        evalResult
      );

      const rectModel: Omit<ComputedBarItemModel, 'index' | 'total'> = {
        id: `${key}-${cat}`,
        key,
        indexValue: cat,
        value: val,
        x,
        y,
        width,
        height,
        rx: Math.min(borderRadius, width / 2, height / 2),
        isHorizontal,
        originalColor,
        color,
        threshold: evalResult,
        datum: row
      };

      rawRects.push(rectModel);
      if (val >= 0) {
        positiveTotal += val;
        posBars.push(rectModel);
      } else {
        negativeTotal += val;
        negBars.push(rectModel);
      }
    });

    rowSummaries.push({
      category: cat,
      row,
      positiveTotal,
      negativeTotal,
      netTotal: positiveTotal + negativeTotal,
      posBars,
      negBars
    });
  });

  const total = rawRects.length;
  const bars: ComputedBarItemModel[] = rawRects.map((b, index) => ({
    ...b,
    index,
    total
  }));

  const effectiveScope: 'bar' | 'stack' =
    outerLabels.scope === 'auto'
      ? isStacked
        ? 'stack'
        : 'bar'
      : outerLabels.scope;

  const outerLabelItems: ComputedBarOuterLabelModel[] = [];

  if (effectiveScope === 'stack') {
    rowSummaries.forEach((summary) => {
      if (
        summary.posBars.length > 0 &&
        (summary.positiveTotal > 0 || summary.negBars.length === 0)
      ) {
        const minX = Math.min(...summary.posBars.map((b) => b.x));
        const minY = Math.min(...summary.posBars.map((b) => b.y));
        const maxX = Math.max(...summary.posBars.map((b) => b.x + b.width));
        const maxY = Math.max(...summary.posBars.map((b) => b.y + b.height));
        outerLabelItems.push({
          id: `bar-outer-stack-pos-${summary.category}`,
          index: outerLabelItems.length,
          scope: 'stack',
          sign: 'positive',
          category: summary.category,
          keys: summary.posBars.map((b) => b.key),
          value: summary.positiveTotal,
          positiveTotal: summary.positiveTotal,
          negativeTotal: summary.negativeTotal,
          netTotal: summary.netTotal,
          barCount: summary.posBars.length,
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
          isHorizontal,
          row: summary.row
        });
      }

      if (summary.negBars.length > 0) {
        const minX = Math.min(...summary.negBars.map((b) => b.x));
        const minY = Math.min(...summary.negBars.map((b) => b.y));
        const maxX = Math.max(...summary.negBars.map((b) => b.x + b.width));
        const maxY = Math.max(...summary.negBars.map((b) => b.y + b.height));
        outerLabelItems.push({
          id: `bar-outer-stack-neg-${summary.category}`,
          index: outerLabelItems.length,
          scope: 'stack',
          sign: 'negative',
          category: summary.category,
          keys: summary.negBars.map((b) => b.key),
          value: summary.negativeTotal,
          positiveTotal: summary.positiveTotal,
          negativeTotal: summary.negativeTotal,
          netTotal: summary.netTotal,
          barCount: summary.negBars.length,
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
          isHorizontal,
          row: summary.row
        });
      }
    });
  } else {
    const summaryByCat = new Map(rowSummaries.map((s) => [s.category, s]));
    bars.forEach((b) => {
      const summary = summaryByCat.get(b.indexValue);
      outerLabelItems.push({
        id: `bar-outer-${b.id}`,
        index: outerLabelItems.length,
        scope: 'bar',
        sign: b.value < 0 ? 'negative' : 'positive',
        category: b.indexValue,
        key: b.key,
        keys: [b.key],
        value: b.value,
        positiveTotal: summary?.positiveTotal ?? Math.max(0, b.value),
        negativeTotal: summary?.negativeTotal ?? Math.min(0, b.value),
        netTotal: summary?.netTotal ?? b.value,
        barCount: 1,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        isHorizontal,
        row: b.datum
      });
    });
  }

  return {
    bars,
    outerLabelItems,
    outerLabels,
    activeKeys,
    indexBy,
    groupMode,
    layout,
    zeroPos,
    innerWidth: ctx.innerWidth,
    innerHeight: ctx.innerHeight,
    xTitle: input.xTitle,
    yTitle: input.yTitle,
    enableLabels: input.enableLabels
  };
}
