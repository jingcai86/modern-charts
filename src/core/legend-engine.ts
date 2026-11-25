import { createSequentialColorScale, type SequentialColorScale } from './color-schemes';
import { resolveSequentialColorRamp } from './theme';
import { buildMarkerLegendItems } from './marker-engine';
import { allocateUniqueSvgId } from './threshold-clip';
import { createChartI18n } from './i18n';
import type {
  ChartRenderContext,
  ChartTheme,
  LegendConfig,
  LegendItem,
  LegendPadding,
  LegendPosition,
  MeasuredLabel,
  ResolvedLegendConfig,
  TooltipConfig
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const DEFAULT_LEGEND_PADDING: LegendPadding = {
  top: 8,
  right: 12,
  bottom: 12,
  left: 12
};

export function resolveLegendPadding(
  input?: number | Partial<LegendPadding>
): LegendPadding {
  if (typeof input === 'number') {
    if (Number.isFinite(input)) {
      const p = Math.max(0, input);
      return { top: p, right: p, bottom: p, left: p };
    }
    return { ...DEFAULT_LEGEND_PADDING };
  }
  return {
    top:
      input?.top !== undefined && Number.isFinite(input.top)
        ? Math.max(0, input.top)
        : DEFAULT_LEGEND_PADDING.top,
    right:
      input?.right !== undefined && Number.isFinite(input.right)
        ? Math.max(0, input.right)
        : DEFAULT_LEGEND_PADDING.right,
    bottom:
      input?.bottom !== undefined && Number.isFinite(input.bottom)
        ? Math.max(0, input.bottom)
        : DEFAULT_LEGEND_PADDING.bottom,
    left:
      input?.left !== undefined && Number.isFinite(input.left)
        ? Math.max(0, input.left)
        : DEFAULT_LEGEND_PADDING.left
  };
}

export function createDefaultLegendConfig(
  input?: boolean | LegendConfig,
  fallbackPosition: LegendPosition = 'bottom'
): ResolvedLegendConfig {
  if (typeof input === 'boolean') {
    return {
      enabled: input,
      position: fallbackPosition,
      padding: { ...DEFAULT_LEGEND_PADDING },
      wrap: true,
      enableTooltip: true,
      tooltip: { enabled: true },
      itemGap: 14,
      rowGap: 8,
      swatchSize: 10
    };
  }

  const rawTooltip = input?.tooltip;
  const tooltipObj: TooltipConfig<LegendItem> =
    typeof rawTooltip === 'boolean'
      ? { enabled: rawTooltip }
      : { ...(rawTooltip ?? {}) };

  const enableTooltip =
    input?.enableTooltip === false ||
    rawTooltip === false ||
    tooltipObj.enabled === false
      ? false
      : true;

  tooltipObj.enabled = enableTooltip;

  return {
    enabled: input?.enabled !== false,
    type: input?.type,
    position: input?.position ?? fallbackPosition,
    min: input?.min,
    max: input?.max,
    colorScheme: input?.colorScheme,
    steps: input?.steps,
    calculable: input?.calculable,
    padding: resolveLegendPadding(input?.padding),
    wrap: input?.wrap !== false,
    enableTooltip,
    tooltip: tooltipObj,
    itemGap:
      input?.itemGap !== undefined && Number.isFinite(input.itemGap)
        ? Math.max(2, input.itemGap)
        : 14,
    rowGap:
      input?.rowGap !== undefined && Number.isFinite(input.rowGap)
        ? Math.max(2, input.rowGap)
        : 8,
    swatchSize:
      input?.swatchSize !== undefined && Number.isFinite(input.swatchSize)
        ? Math.max(4, input.swatchSize)
        : 10,
    maxItemWidth: input?.maxItemWidth,
    fontSize: input?.fontSize
  };
}

export interface PositionedLegendItem {
  item: LegendItem;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rowIndex: number;
  colIndex: number;
  measured: MeasuredLabel;
}

export interface ComputedLegendLayout {
  position: LegendPosition;
  items: PositionedLegendItem[];
  rowCount: number;
  columnCount: number;
  contentWidth: number;
  contentHeight: number;
  /** Full box dimensions including padding (top/right/bottom/left) */
  boxWidth: number;
  boxHeight: number;
  swatchSize: number;
  swatchGap: number;
  fontSize: number;
}

/**
 * Pure Pretext-powered SVG legend layout engine.
 * Measures every legend item's exact text width & height via `@chenglou/pretext`
 * without DOM reflow, packs items into wrapped rows (top/bottom) or columns
 * (left/right) when `wrap: true`, and centers every row/column symmetrically
 * inside the padded available area.
 */
export function computeLegendLayout(
  items: LegendItem[],
  config: ResolvedLegendConfig,
  availableWidth: number,
  availableHeight: number,
  measureText: (
    text: string,
    options?: { type?: 'legend'; fontSize?: number; maxWidth?: number }
  ) => MeasuredLabel,
  theme: ChartTheme,
  direction: 'ltr' | 'rtl' = 'ltr'
): ComputedLegendLayout {
  const fontSize = config.fontSize ?? Math.max(10, theme.fontSize - 1);
  const swatchSize = config.swatchSize;
  const swatchGap = 5;
  const pad = config.padding;
  const isVertical = config.position === 'left' || config.position === 'right';

  const measuredEntries = items.map((item, index) => {
    const measured = measureText(item.label, {
      type: 'legend',
      fontSize,
      maxWidth: config.maxItemWidth
    });
    const itemSwatchWidth =
      item.swatch === 'line' ? Math.max(swatchSize, 16) : swatchSize;
    const width = Math.ceil(itemSwatchWidth + swatchGap + measured.boxWidth);
    const height = Math.max(swatchSize + 2, Math.ceil(measured.boxHeight));
    return { item, index, measured, width, height };
  });

  if (measuredEntries.length === 0) {
    return {
      position: config.position,
      items: [],
      rowCount: 0,
      columnCount: 0,
      contentWidth: 0,
      contentHeight: 0,
      boxWidth: pad.left + pad.right,
      boxHeight: pad.top + pad.bottom,
      swatchSize,
      swatchGap,
      fontSize
    };
  }

  const positioned: PositionedLegendItem[] = [];

  if (!isVertical) {
    // Horizontal layout ('top' or 'bottom'): pack items into rows, wrapping when wrap !== false
    const usableWidth = Math.max(40, availableWidth - pad.left - pad.right);
    const rows: typeof measuredEntries[] = [];
    let currentRow: typeof measuredEntries = [];
    let currentRowWidth = 0;

    for (const entry of measuredEntries) {
      const nextWidth =
        currentRow.length === 0
          ? entry.width
          : currentRowWidth + config.itemGap + entry.width;

      if (config.wrap && currentRow.length > 0 && nextWidth > usableWidth) {
        rows.push(currentRow);
        currentRow = [entry];
        currentRowWidth = entry.width;
      } else {
        currentRow.push(entry);
        currentRowWidth = nextWidth;
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    let cursorY = 0;
    let maxRowWidth = 0;
    rows.forEach((row, rowIndex) => {
      const rowWidth = row.reduce(
        (acc, e, i) => acc + e.width + (i > 0 ? config.itemGap : 0),
        0
      );
      const rowHeight = Math.max(...row.map((e) => e.height));
      maxRowWidth = Math.max(maxRowWidth, rowWidth);

      // Exact per-row horizontal centering inside [pad.left, availableWidth - pad.right]
      const rowStartX = pad.left + (usableWidth - rowWidth) / 2;
      let cursorX = rowStartX;

      row.forEach((entry, colIndex) => {
        positioned.push({
          item: entry.item,
          index: entry.index,
          x: cursorX,
          y: pad.top + cursorY + rowHeight / 2,
          width: entry.width,
          height: entry.height,
          rowIndex,
          colIndex,
          measured: entry.measured
        });
        cursorX += entry.width + config.itemGap;
      });

      cursorY += rowHeight + (rowIndex < rows.length - 1 ? config.rowGap : 0);
    });

    if (direction === 'rtl') {
      for (const item of positioned) {
        item.x = 2 * pad.left + usableWidth - item.x - item.width;
      }
    }
    const contentHeight = cursorY;
    return {
      position: config.position,
      items: positioned,
      rowCount: rows.length,
      columnCount: Math.max(...rows.map((r) => r.length)),
      contentWidth: maxRowWidth,
      contentHeight,
      boxWidth: maxRowWidth + pad.left + pad.right,
      boxHeight: contentHeight + pad.top + pad.bottom,
      swatchSize,
      swatchGap,
      fontSize
    };
  }

  // Vertical layout ('left' or 'right'): stack items vertically, wrapping into columns when wrap !== false
  const usableHeight = Math.max(40, availableHeight - pad.top - pad.bottom);
  const columns: typeof measuredEntries[] = [];
  let currentCol: typeof measuredEntries = [];
  let currentColHeight = 0;

  for (const entry of measuredEntries) {
    const nextHeight =
      currentCol.length === 0
        ? entry.height
        : currentColHeight + config.rowGap + entry.height;

    if (config.wrap && currentCol.length > 0 && nextHeight > usableHeight) {
      columns.push(currentCol);
      currentCol = [entry];
      currentColHeight = entry.height;
    } else {
      currentCol.push(entry);
      currentColHeight = nextHeight;
    }
  }
  if (currentCol.length > 0) {
    columns.push(currentCol);
  }

  let cursorX = 0;
  let maxColHeight = 0;
  columns.forEach((col, colIndex) => {
    const colWidth = Math.max(...col.map((e) => e.width));
    const colHeight = col.reduce(
      (acc, e, i) => acc + e.height + (i > 0 ? config.rowGap : 0),
      0
    );
    maxColHeight = Math.max(maxColHeight, colHeight);

    // Exact vertical centering inside [pad.top, availableHeight - pad.bottom]
    const colStartY = pad.top + (usableHeight - colHeight) / 2;
    let cursorY = colStartY;

    col.forEach((entry, rowIndex) => {
      positioned.push({
        item: entry.item,
        index: entry.index,
        x: pad.left + cursorX,
        y: cursorY + entry.height / 2,
        width: entry.width,
        height: entry.height,
        rowIndex,
        colIndex,
        measured: entry.measured
      });
      cursorY += entry.height + config.rowGap;
    });

    cursorX += colWidth + (colIndex < columns.length - 1 ? config.itemGap : 0);
  });

  const contentWidth = cursorX;
  if (direction === 'rtl') {
    for (const item of positioned) {
      item.x = 2 * pad.left + contentWidth - item.x - item.width;
    }
  }
  return {
    position: config.position,
    items: positioned,
    rowCount: Math.max(...columns.map((c) => c.length)),
    columnCount: columns.length,
    contentWidth,
    contentHeight: maxColHeight,
    boxWidth: contentWidth + pad.left + pad.right,
    boxHeight: maxColHeight + pad.top + pad.bottom,
    swatchSize,
    swatchGap,
    fontSize
  };
}

/**
 * Renders the unified SVG legend layer shared across charts (`bar`, `line`, `pie`,
 * `radar`, `scatter`, `sunburst`, `treemap`, `sankey`), using `@chenglou/pretext`
 * for exact centering & wrapping and triggering the dedicated legend `<mc-tooltip>`
 * on both pointer hover and keyboard Tab focus.
 */
export function renderUnifiedLegendLayer(
  ctx: ChartRenderContext<any>,
  items: LegendItem[],
  fallbackPosition: LegendPosition = 'bottom'
): void {
  const cfg: ResolvedLegendConfig =
    ctx.legendConfig ??
    createDefaultLegendConfig(ctx.config.legend, fallbackPosition);

  if (!cfg.enabled) return;

  const model = ctx.state?.model as
    | {
        minVal?: number;
        maxVal?: number;
        seqScale?: SequentialColorScale;
      }
    | undefined;
  const effectiveType =
    cfg.type ??
    (ctx.chartType === 'heatmap' && (!items || items.length === 0)
      ? 'continuous'
      : 'categorical');

  const getSequentialScale = (minVal: number, maxVal: number) => {
    if (!cfg.colorScheme && model?.seqScale) {
      if (cfg.min === undefined && cfg.max === undefined) return model.seqScale;
      return model.seqScale.copy().domain([minVal, maxVal]);
    }
    const scheme = cfg.colorScheme || ctx.config.colorScheme || ctx.scaleConfig?.color?.scheme;
    const ramp = resolveSequentialColorRamp(ctx, scheme);
    return createSequentialColorScale(ramp, [minVal, maxVal]).clamp(true);
  };

  if (effectiveType === 'continuous') {
    const minVal =
      cfg.min !== undefined && Number.isFinite(cfg.min)
        ? cfg.min
        : model?.minVal ?? 0;
    const maxVal =
      cfg.max !== undefined && Number.isFinite(cfg.max)
        ? cfg.max
        : model?.maxVal ?? 100;
    const seqScale = getSequentialScale(minVal, maxVal);

    const defs = ctx.svg.querySelector('.mc-chart-defs');
    const gradId = allocateUniqueSvgId('mc-legend-continuous-grad');
    const isVertical = cfg.position === 'left' || cfg.position === 'right';
    if (defs) {
      const grad = document.createElementNS(SVG_NS, 'linearGradient');
      grad.setAttribute('id', gradId);
      grad.setAttribute('x1', '0%');
      grad.setAttribute('y1', isVertical ? '100%' : '0%');
      grad.setAttribute('x2', isVertical ? '0%' : '100%');
      grad.setAttribute('y2', '0%');
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', `${t * 100}%`);
        stop.setAttribute(
          'stop-color',
          seqScale(minVal + t * (maxVal - minVal))
        );
        grad.appendChild(stop);
      }
      defs.appendChild(grad);
    }

    const barLen = isVertical
      ? Math.min(130, Math.max(60, ctx.innerHeight * 0.45))
      : Math.min(140, Math.max(70, ctx.innerWidth * 0.36));
    const barThick = 10;

    let originX = 0;
    let originY = 0;
    if (cfg.position === 'top') {
      originX = ctx.innerWidth - barLen - 28;
      originY = -22;
    } else if (cfg.position === 'bottom') {
      const hasBottomAxis = Boolean(ctx.xScale);
      const hasXTitle = hasBottomAxis && Boolean(ctx.config.xTitle);
      originX = (ctx.innerWidth - barLen) / 2;
      originY = ctx.innerHeight + (hasBottomAxis ? (hasXTitle ? 46 : 28) : 12);
    } else if (cfg.position === 'right') {
      originX = ctx.innerWidth + 16;
      originY = (ctx.innerHeight - barLen) / 2;
    } else {
      originX = -Math.max(36, ctx.margin.left - 18);
      originY = (ctx.innerHeight - barLen) / 2;
    }

    const legendG = document.createElementNS(SVG_NS, 'g');
    legendG.setAttribute(
      'class',
      `mc-legend mc-legend--continuous mc-legend--${cfg.position}`
    );
    legendG.setAttribute('data-legend-type', 'continuous');
    legendG.setAttribute('data-legend-position', cfg.position);
    legendG.setAttribute('data-min', String(minVal));
    legendG.setAttribute('data-max', String(maxVal));
    legendG.setAttribute(
      'transform',
      `translate(${Math.round(originX)}, ${Math.round(originY)})`
    );

    const barRect = document.createElementNS(SVG_NS, 'rect');
    barRect.setAttribute('class', 'mc-legend-gradient-bar');
    barRect.setAttribute('x', '0');
    barRect.setAttribute('y', '0');
    barRect.setAttribute('width', String(isVertical ? barThick : barLen));
    barRect.setAttribute('height', String(isVertical ? barLen : barThick));
    barRect.setAttribute('rx', '4');
    barRect.setAttribute('fill', defs ? `url(#${gradId})` : seqScale(maxVal));
    legendG.appendChild(barRect);

    if (cfg.calculable) {
      legendG.setAttribute('data-calculable', 'true');
      const minHandle = document.createElementNS(SVG_NS, 'circle');
      minHandle.setAttribute(
        'class',
        'mc-legend-handle mc-legend-handle--min'
      );
      minHandle.setAttribute('data-handle', 'min');
      minHandle.setAttribute('cx', isVertical ? String(barThick / 2) : '0');
      minHandle.setAttribute('cy', isVertical ? String(barLen) : String(barThick / 2));
      minHandle.setAttribute('r', '6');
      minHandle.setAttribute('fill', seqScale(minVal));
      minHandle.setAttribute('stroke', '#ffffff');
      minHandle.setAttribute('stroke-width', '2');

      const maxHandle = document.createElementNS(SVG_NS, 'circle');
      maxHandle.setAttribute(
        'class',
        'mc-legend-handle mc-legend-handle--max'
      );
      maxHandle.setAttribute('data-handle', 'max');
      maxHandle.setAttribute('cx', isVertical ? String(barThick / 2) : String(barLen));
      maxHandle.setAttribute('cy', isVertical ? '0' : String(barThick / 2));
      maxHandle.setAttribute('r', '6');
      maxHandle.setAttribute('fill', seqScale(maxVal));
      maxHandle.setAttribute('stroke', '#ffffff');
      maxHandle.setAttribute('stroke-width', '2');

      legendG.append(minHandle, maxHandle);
    }

    ctx.renderLabel(legendG, {
      id: 'legend-continuous-min',
      text: String(minVal),
      x: isVertical ? barThick / 2 : -6,
      y: isVertical ? barLen + 12 : barThick / 2,
      type: 'legend',
      anchor: isVertical ? 'middle' : 'end',
      baseline: 'middle',
      fontSize: cfg.fontSize ?? 10,
      color: ctx.theme.mutedTextColor
    });

    ctx.renderLabel(legendG, {
      id: 'legend-continuous-max',
      text: String(maxVal),
      x: isVertical ? barThick / 2 : barLen + 6,
      y: isVertical ? -10 : barThick / 2,
      type: 'legend',
      anchor: isVertical ? 'middle' : 'start',
      baseline: 'middle',
      fontSize: cfg.fontSize ?? 10,
      color: ctx.theme.mutedTextColor
    });

    ctx.layerGroup.appendChild(legendG);
    return;
  }

  let baseItems: LegendItem[] = items ?? [];
  if (effectiveType === 'piecewise' && baseItems.length === 0) {
    const minVal =
      cfg.min !== undefined && Number.isFinite(cfg.min)
        ? cfg.min
        : model?.minVal ?? 0;
    const maxVal =
      cfg.max !== undefined && Number.isFinite(cfg.max)
        ? cfg.max
        : model?.maxVal ?? 100;
    const steps = Math.max(2, cfg.steps ?? 5);
    const seqScale = getSequentialScale(minVal, maxVal);
    const stepSpan = (maxVal - minVal) / steps;
    baseItems = Array.from({ length: steps }, (_, i) => {
      const lo = Number((minVal + i * stepSpan).toFixed(1));
      const hi = Number((minVal + (i + 1) * stepSpan).toFixed(1));
      const mid = (lo + hi) / 2;
      return {
        id: `piece-${i}`,
        label: `${lo} – ${hi}`,
        color: seqScale(mid),
        value: `${lo} – ${hi}`
      };
    });
  }

  const markerLegendItems = buildMarkerLegendItems(ctx.markers ?? []);
  const existingIds = new Set(baseItems.map((it) => it.id));
  const combinedItems: LegendItem[] = [
    ...baseItems,
    ...markerLegendItems.filter((mItem) => !existingIds.has(mItem.id))
  ];
  if (combinedItems.length === 0) return;

  const i18n = ctx.i18n ?? createChartI18n();
  const isVertical = cfg.position === 'left' || cfg.position === 'right';
  const direction = i18n.direction;
  const availableWidth = isVertical ? ctx.margin[cfg.position] : ctx.innerWidth;
  const availableHeight = ctx.innerHeight;

  const layout = computeLegendLayout(
    combinedItems,
    cfg,
    availableWidth,
    availableHeight,
    (text, opts) => ctx.measureText(text, opts),
    ctx.theme,
    direction
  );

  // Position the legend group relative to rootGroup (which is translated by margin.left, margin.top)
  let originX = 0;
  let originY = 0;
  if (cfg.position === 'bottom') {
    originX = 0;
    const hasBottomAxis = Boolean(ctx.xScale);
    const hasXTitle = hasBottomAxis && Boolean(ctx.config.xTitle);
    const slotTop = hasBottomAxis ? (hasXTitle ? 42 : 24) : 6;
    const bottomOuterGap = 8;
    const slotBottom = ctx.margin.bottom - bottomOuterGap;
    const slotHeight = Math.max(0, slotBottom - slotTop);
    const offsetInSlot = Math.max(0, (slotHeight - layout.boxHeight) / 2);
    originY = ctx.innerHeight + slotTop + offsetInSlot;
  } else if (cfg.position === 'top') {
    originX = 0;
    const hasTitle = Boolean(ctx.config.title);
    originY = -Math.max(layout.boxHeight + 4, ctx.margin.top - (hasTitle ? 28 : 4));
  } else if (cfg.position === 'right') {
    originX = ctx.innerWidth + 8;
    originY = 0;
  } else {
    // 'left'
    originX = -Math.max(layout.boxWidth + 8, ctx.margin.left - 4);
    originY = 0;
  }

  const interactive = ctx.isInteractive !== false;
  const focusable = interactive && ctx.ariaConfig.isFocusable;

  const legendG = document.createElementNS(SVG_NS, 'g');
  legendG.setAttribute('class', `mc-legend mc-legend--${cfg.position}`);
  legendG.setAttribute('direction', direction);
  if (interactive) {
    legendG.setAttribute('role', 'list');
    legendG.setAttribute('aria-label', i18n.messages.legend);
  }
  legendG.setAttribute('data-legend-type', effectiveType);
  legendG.setAttribute('data-legend-position', cfg.position);
  legendG.setAttribute('data-legend-wrap', String(cfg.wrap));
  legendG.setAttribute('data-legend-rows', String(layout.rowCount));
  legendG.setAttribute('data-legend-columns', String(layout.columnCount));
  legendG.setAttribute(
    'transform',
    `translate(${Math.round(originX)}, ${Math.round(originY)})`
  );

  const halfSwatch = layout.swatchSize / 2;

  layout.items.forEach((posItem) => {
    const { item, index, x, y, width, height, rowIndex, colIndex } = posItem;

    const itemG = document.createElementNS(SVG_NS, 'g');
    itemG.setAttribute(
      'class',
      `mc-legend-item${item.kind === 'marker' ? ' mc-legend-item--marker' : ''}`
    );
    if (interactive) {
      itemG.setAttribute('role', 'listitem');
      if (focusable) {
        itemG.setAttribute('tabindex', '0');
      }
      itemG.setAttribute('aria-label', i18n.message('legendItem', { label: item.label }));
    }
    itemG.setAttribute('data-legend-id', item.id);
    itemG.setAttribute('data-legend-kind', item.kind ?? 'series');
    itemG.setAttribute('data-legend-index', String(index));
    itemG.setAttribute('data-legend-row', String(rowIndex));
    itemG.setAttribute('data-legend-col', String(colIndex));
    itemG.setAttribute('transform', `translate(${x}, ${y})`);
    itemG.style.cursor = interactive ? 'pointer' : 'default';
    itemG.style.outline = 'none';

    ctx.registerEventTarget(itemG, {
      target: 'legend',
      category: 'legend',
      id: item.id,
      data: {
        id: item.id,
        label: item.label,
        color: item.color,
        value: item.value,
        index,
        count: combinedItems.length,
        total: combinedItems.length,
        kind: item.kind ?? 'series',
        swatch: item.swatch ?? 'square',
        position: cfg.position,
        datum: item
      }
    });

    // Transparent hit area covering swatch + label for smooth hover & focus
    let hitRect: SVGRectElement | null = null;
    if (interactive) {
      hitRect = document.createElementNS(SVG_NS, 'rect');
      hitRect.setAttribute('class', 'mc-legend-hit');
      hitRect.setAttribute('x', '-3');
      hitRect.setAttribute('y', String(-height / 2 - 2));
      hitRect.setAttribute('width', String(width + 6));
      hitRect.setAttribute('height', String(height + 4));
      hitRect.setAttribute('rx', '4');
      hitRect.setAttribute('fill', 'transparent');
      itemG.appendChild(hitRect);
    }

    const itemSwatchWidth =
      item.swatch === 'line' ? Math.max(layout.swatchSize, 16) : layout.swatchSize;
    const swatchX = direction === 'rtl' ? width - itemSwatchWidth : 0;

    const swatchFill =
      item.kind === 'marker'
        ? item.color
        : (ctx.resolveFill?.({
            id: item.id,
            seriesId: item.id,
            key: item.id,
            category: item.label,
            index,
            color: item.color,
            chartType: ctx.chartType,
            target: 'legend',
            datum: item
          }) ?? item.color);

    if (item.swatch === 'line') {
      const lineSwatch = document.createElementNS(SVG_NS, 'line');
      lineSwatch.setAttribute('class', 'mc-legend-swatch mc-legend-swatch--line');
      lineSwatch.setAttribute('x1', String(swatchX));
      lineSwatch.setAttribute('x2', String(swatchX + itemSwatchWidth));
      lineSwatch.setAttribute('y1', '0');
      lineSwatch.setAttribute('y2', '0');
      lineSwatch.setAttribute('stroke', item.color);
      lineSwatch.setAttribute('stroke-width', '2.5');
      lineSwatch.setAttribute('stroke-linecap', 'round');
      if (item.strokeDasharray) {
        lineSwatch.setAttribute('stroke-dasharray', item.strokeDasharray);
      }
      itemG.appendChild(lineSwatch);
    } else if (item.swatch === 'area') {
      const areaSwatch = document.createElementNS(SVG_NS, 'rect');
      areaSwatch.setAttribute('class', 'mc-legend-swatch mc-legend-swatch--area');
      areaSwatch.setAttribute('x', String(swatchX));
      areaSwatch.setAttribute('y', String(-halfSwatch));
      areaSwatch.setAttribute('width', String(itemSwatchWidth));
      areaSwatch.setAttribute('height', String(layout.swatchSize));
      areaSwatch.setAttribute('rx', '2');
      areaSwatch.setAttribute('fill', swatchFill);
      areaSwatch.setAttribute(
        'fill-opacity',
        String(Math.max(0.22, item.fillOpacity ?? 0.25))
      );
      areaSwatch.setAttribute('stroke', item.color);
      areaSwatch.setAttribute('stroke-width', '1.2');
      itemG.appendChild(areaSwatch);
    } else {
      const swatch = document.createElementNS(SVG_NS, 'rect');
      swatch.setAttribute('class', 'mc-legend-swatch');
      swatch.setAttribute('x', String(swatchX));
      swatch.setAttribute('y', String(-halfSwatch));
      swatch.setAttribute('width', String(itemSwatchWidth));
      swatch.setAttribute('height', String(layout.swatchSize));
      swatch.setAttribute('rx', '2');
      swatch.setAttribute('fill', swatchFill);
      itemG.appendChild(swatch);
    }

    ctx.renderLabel(itemG, {
      id: `legend-${index}`,
      text: item.label,
      x: direction === 'rtl'
        ? swatchX - layout.swatchGap
        : itemSwatchWidth + layout.swatchGap,
      y: 0,
      type: 'legend',
      anchor: 'start',
      baseline: 'middle',
      maxWidth: cfg.maxItemWidth,
      enableTooltip: cfg.enableTooltip ? false : undefined,
      fontSize: layout.fontSize,
      color: ctx.theme.textColor,
      datum: item
    });

    const isMarker = item.kind === 'marker';
    const markerTypeLabel =
      item.meta?.markerType === 'area' ? i18n.messages.areaMarker : i18n.messages.lineMarker;
    const markerConditionBadge =
      isMarker && item.meta?.condition
        ? i18n.message('condition', { condition: item.meta.condition })
        : undefined;
    const formatValue = (value: unknown): string => typeof value === 'number'
      ? i18n.formatNumber(value, { useGrouping: false, maximumFractionDigits: 20 })
      : String(value ?? '');
    const formattedValue = item.tooltipText ?? (isMarker && item.meta?.markerType === 'area'
      ? `${formatValue(item.meta.from ?? 0)} – ${formatValue(item.meta.to ?? 0)}`
      : item.value !== undefined ? formatValue(item.value) : item.label);

    const buildLegendTooltipPayload = () => ({
      title: item.label,
      label: isMarker
        ? markerTypeLabel
        : item.value !== undefined
        ? i18n.messages.value
        : i18n.messages.series,
      seriesId: item.id,
      value: item.value !== undefined ? item.value : item.label,
      formattedValue,
      color: item.color,
      badge: markerConditionBadge,
      datum: {
        id: item.id,
        label: item.label,
        color: item.color,
        value: item.value,
        kind: item.kind ?? 'series',
        swatch: item.swatch ?? 'square',
        index,
        total: combinedItems.length,
        ...(item.meta ?? {})
      }
    });

    if (interactive && cfg.enableTooltip) {
      itemG.addEventListener('mouseenter', (e) => {
        hitRect?.setAttribute(
          'fill',
          ctx.theme.mode === 'dark'
            ? 'rgba(148, 163, 184, 0.14)'
            : 'rgba(15, 23, 42, 0.06)'
        );
        const me = e as MouseEvent;
        ctx.showLegendTooltip(
          buildLegendTooltipPayload(),
          me.clientX,
          me.clientY
        );
      });
      itemG.addEventListener('mouseleave', () => {
        hitRect?.setAttribute('fill', 'transparent');
        ctx.hideLegendTooltip();
      });
      if (focusable) {
        itemG.addEventListener('focus', () => {
          hitRect?.setAttribute(
            'fill',
            ctx.theme.mode === 'dark'
              ? 'rgba(56, 189, 248, 0.18)'
              : 'rgba(2, 132, 199, 0.1)'
          );
          const rect = itemG.getBoundingClientRect();
          const anchorX = rect.left + rect.width / 2;
          const anchorY = rect.top;
          ctx.showLegendTooltip(buildLegendTooltipPayload(), anchorX, anchorY);
        });
        itemG.addEventListener('blur', () => {
          hitRect?.setAttribute('fill', 'transparent');
          ctx.hideLegendTooltip();
        });
        itemG.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key === 'Escape') {
            ctx.hideLegendTooltip();
          }
        });
      }
    }

    legendG.appendChild(itemG);
  });

  ctx.layerGroup.appendChild(legendG);
}
