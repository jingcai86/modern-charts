import { buildAxisScale } from '../core/scale-manager';
import { createOrdinalColorScale } from '../core/theme';
import type {
  BarDatum,
  ChartRenderContext,
  ThresholdEvaluationResult,
  ThresholdMatchedItem
} from '../core/types';

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

export interface BarChartModel {
  bars: ComputedBarItemModel[];
  activeKeys: string[];
  indexBy: string;
  groupMode: 'grouped' | 'stacked';
  layout: 'vertical' | 'horizontal';
  xTitle?: string;
  yTitle?: string;
  enableLabels: boolean;
}

export interface BarModelInput {
  indexBy: string;
  keys: string[];
  groupMode: 'grouped' | 'stacked';
  layout: 'vertical' | 'horizontal';
  borderRadius: number;
  enableLabels: boolean;
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
 * Computes D3 band/linear scales, grouped/stacked bar geometry, and threshold state
 * without creating any DOM nodes.
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

  if (isHorizontal) {
    ctx.xScale = buildAxisScale(
      { ...ctx.scaleConfig.y, type: 'linear' },
      numericValues,
      [0, ctx.innerWidth]
    );
    ctx.yScale = buildAxisScale(
      { ...ctx.scaleConfig.x, type: 'band' },
      categories,
      [0, ctx.innerHeight]
    );
  } else {
    ctx.xScale = buildAxisScale(
      { ...ctx.scaleConfig.x, type: 'band' },
      categories,
      [0, ctx.innerWidth]
    );
    ctx.yScale = buildAxisScale(
      ctx.scaleConfig.y,
      numericValues,
      [ctx.innerHeight, 0]
    );
  }

  ctx.colorScale = createOrdinalColorScale(ctx.theme, activeKeys);
  input.setupThresholds(ctx);

  const rawRects: Omit<ComputedBarItemModel, 'index' | 'total'>[] = [];
  const bandScale = isHorizontal ? ctx.yScale : ctx.xScale;
  const valScale = isHorizontal ? ctx.xScale : ctx.yScale;
  const bandwidth =
    typeof bandScale.bandwidth === 'function' ? bandScale.bandwidth() : 32;
  const valueAxis: 'x' | 'y' = isHorizontal ? 'x' : 'y';

  rows.forEach((row) => {
    const cat = String(row[indexBy] ?? '');
    const bandPos = Number(bandScale(cat) ?? 0);
    let runningValue = 0;

    activeKeys.forEach((key, kIdx) => {
      const val = Number(row[key] ?? 0);
      const originalColor = ctx.colorScale(key);

      let x = 0;
      let y = 0;
      let width = 0;
      let height = 0;

      if (isHorizontal) {
        if (isStacked) {
          const x0 = Number(valScale(runningValue));
          const x1 = Number(valScale(runningValue + val));
          runningValue += val;
          x = Math.min(x0, x1);
          y = bandPos;
          width = Math.max(1, Math.abs(x1 - x0));
          height = bandwidth;
        } else {
          const subH = Math.max(
            4,
            (bandwidth - (activeKeys.length - 1) * 3) / activeKeys.length
          );
          const x0 = Number(valScale(0));
          const x1 = Number(valScale(val));
          x = Math.min(x0, x1);
          y = bandPos + kIdx * (subH + 3);
          width = Math.max(1, Math.abs(x1 - x0));
          height = subH;
        }
      } else {
        if (isStacked) {
          const y0 = Number(valScale(runningValue));
          const y1 = Number(valScale(runningValue + val));
          runningValue += val;
          x = bandPos;
          y = Math.min(y0, y1);
          width = bandwidth;
          height = Math.max(1, Math.abs(y0 - y1));
        } else {
          const subW = Math.max(
            4,
            (bandwidth - (activeKeys.length - 1) * 3) / activeKeys.length
          );
          const y0 = Number(valScale(0));
          const y1 = Number(valScale(val));
          x = bandPos + kIdx * (subW + 3);
          y = Math.min(y0, y1);
          width = subW;
          height = Math.max(1, Math.abs(y0 - y1));
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

      rawRects.push({
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
      });
    });
  });

  const total = rawRects.length;
  const bars: ComputedBarItemModel[] = rawRects.map((b, index) => ({
    ...b,
    index,
    total
  }));

  return {
    bars,
    activeKeys,
    indexBy,
    groupMode,
    layout,
    xTitle: input.xTitle,
    yTitle: input.yTitle,
    enableLabels: input.enableLabels
  };
}
