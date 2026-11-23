import type * as d3 from 'd3';

export const VERSION = '0.1.0-alpha.2';

export type ChartPaletteName =
  | 'modern'
  | 'nivo'
  | 'echarts'
  | 'emerald'
  | 'sunset'
  | 'ocean'
  | 'cyber';

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: ChartMargin;
}

export type ThemeModePreference = 'light' | 'dark' | 'system';

export interface ChartTheme {
  mode: 'light' | 'dark';
  palette: ChartPaletteName;
  colors: string[];
  background: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: string;
  fontSize: number;
  axisColor: string;
  gridColor: string;
  gridStrokeDasharray: string;
  tooltipBackground: string;
  tooltipTextColor: string;
  tooltipBorderColor: string;
  labelRenderMode: 'svg' | 'foreignObject';
}

export type ScaleType =
  | 'linear'
  | 'point'
  | 'band'
  | 'time'
  | 'log'
  | 'symlog'
  | 'sqrt'
  | 'ordinal'
  | 'sequential';

export interface ScaleAxisConfig {
  type: ScaleType;
  min?: number | 'auto';
  max?: number | 'auto';
  stacked?: boolean;
  reverse?: boolean;
  nice?: boolean;
  clamp?: boolean;
  padding?: number;
  innerPadding?: number;
  outerPadding?: number;
  base?: number;
  constant?: number;
  scheme?: string;
}

export interface ScaleConfig {
  x: ScaleAxisConfig;
  y: ScaleAxisConfig;
  color?: {
    type?: 'ordinal' | 'sequential' | 'diverging';
    scheme?: string;
    domain?: [number, number];
  };
  size?: {
    min?: number;
    max?: number;
  };
}

export interface ViewConfig {
  enabled: boolean;
  zoomable: boolean;
  pannable: boolean;
  minZoom: number;
  maxZoom: number;
  direction: 'xy' | 'x' | 'y';
  showControls: boolean;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
}

export type AnimationEasingName =
  | 'cubic-out'
  | 'linear'
  | 'elastic-out'
  | 'back-out'
  | 'bounce-out'
  | 'quad-out';

export type MotionPresetName =
  | 'default'
  | 'gentle'
  | 'wobbly'
  | 'stiff'
  | 'slow'
  | 'molasses'
  | 'elastic'
  | 'bounce';

export type AnimationEntryMode = 'grow' | 'draw' | 'sweep' | 'scale' | 'fade';

export interface AnimationConfig {
  enabled: boolean;
  preset?: MotionPresetName;
  duration: number;
  easing: AnimationEasingName;
  stagger: number;
  streamDelay: number;
  mode?: AnimationEntryMode;
}

export type AriaItemType =
  | 'bar'
  | 'point'
  | 'series'
  | 'arc'
  | 'cell'
  | 'radar-point'
  | 'radar-polygon'
  | 'sunburst-arc'
  | 'sankey-node'
  | 'sankey-link'
  | 'scatter-node'
  | 'treemap-tile'
  | 'gauge-arc';

export interface AriaItemDescriptor {
  type: AriaItemType;
  index: number;
  total?: number;
  id: string;
  label?: string;
  value?: number | string;
  formattedValue?: string;
  category?: string;
  seriesId?: string;
  percentage?: number;
  source?: string;
  target?: string;
  color?: string;
  /** Optional item anchor rect used for keyboard-focus tooltips (falls back to element bounds when omitted). */
  anchor?: TooltipAnchorRect;
  datum: Record<string, any>;
}

export type AriaItemLabelAccessor =
  | string
  | ((item: AriaItemDescriptor) => string);

export interface AriaConfig {
  enabled: boolean;
  role: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  description?: string;
  isFocusable: boolean;
  announceOnFocus: boolean;
  includeDataTable: boolean;
  itemRole?: string | ((item: AriaItemDescriptor) => string);
  itemRoleDescription?: string | ((item: AriaItemDescriptor) => string);
  itemLabel?: AriaItemLabelAccessor;
  itemDescription?: AriaItemLabelAccessor;
  itemLabelledBy?: string | ((item: AriaItemDescriptor) => string);
  itemDescribedBy?: string | ((item: AriaItemDescriptor) => string);
  itemHidden?: boolean | ((item: AriaItemDescriptor) => boolean);
  itemAttributes?: (
    item: AriaItemDescriptor
  ) => Record<string, string | number | boolean | undefined>;
}

// Marker & Threshold System (Nivo markers + ECharts markLine / markArea + visualMap thresholds)

export type MarkerType = 'line' | 'area';

export type MarkerCondition =
  | 'below'
  | 'under'
  | 'lte'
  | 'above'
  | 'over'
  | 'gte'
  | 'between'
  | 'outside'
  | ((value: number, datum?: any) => boolean);

export type MarkerMatchScope = 'partial' | 'item';

export interface MarkerMatchStyle {
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  radius?: number;
  className?: string;
  icon?: string;
  labelColor?: string;
}

export type MarkerLabelPosition =
  | 'start'
  | 'middle'
  | 'end'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type MarkerAnnotationPosition = 'left' | 'right' | 'top' | 'bottom';

export interface MarkerAnnotationConfig {
  /** Text shown in the outside annotation badge/callout. */
  text?: string;
  /** Optional icon (SVG string, emoji, or DOM element) shown outside (can be used with or without text). */
  icon?: string | SVGElement | HTMLElement;
  /**
   * Outside side of the plot where the mark line/area reaches:
   * - Horizontal (`axis: 'y'`) markers default to `'right'` (`'left'` / `'right'` align at the mark's Y).
   * - Vertical (`axis: 'x'`) markers default to `'top'` (`'top'` / `'bottom'` align at the mark's X).
   * All 4 sides (`'left' | 'right' | 'top' | 'bottom'`) are supported.
   */
  position?: MarkerAnnotationPosition;
  /** Gap in px between the plot boundary (where the mark reaches) and the outside annotation. Default `8`. */
  padding?: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  /** Optional inner box padding when `background` or `borderColor` is set. */
  labelPadding?: LabelPadding;
  formatter?: LabelStyleOverride['formatter'];
  renderer?: CustomLabelRenderer;
  /** Show a tooltip on hover and keyboard focus. Default `true`. */
  enableTooltip?: boolean;
  /**
   * Customize or disable the annotation tooltip (`false` disables it; pass a string
   * for custom summary text or a `TooltipConfig` for `formatter`/`renderer`/`offsetX`/`offsetY`).
   */
  tooltip?: boolean | string | TooltipConfig<ResolvedMarker>;
}

export type MarkerLegendSwatch = 'auto' | 'line' | 'area' | 'square';

export interface MarkerLegendConfig {
  /** Include this marker in the chart's unified legend. Default `true` when object is provided. */
  enabled?: boolean;
  /** Legend item text (defaults to `marker.label`, `annotation.text`, or `marker.id`). */
  label?: string;
  /** Swatch color override (defaults to `marker.stroke || marker.fill`). */
  color?: string;
  /** Visual swatch style (`'auto'` uses `'line'` for line markers and `'area'` for area markers). */
  swatch?: MarkerLegendSwatch;
  /** Optional custom tooltip text displayed when hovering or focusing this marker's legend item. */
  tooltip?: string;
}

export interface MarkerConfig {
  id?: string;
  type?: MarkerType;
  axis?: 'x' | 'y';
  /** Target value for a marker line (`type: 'line'`), or threshold value */
  value?: number | string;
  /** Lower bound for a marker area (`type: 'area'`) or range threshold */
  from?: number | string;
  /** Upper bound for a marker area (`type: 'area'`) or range threshold */
  to?: number | string;
  label?: string;
  /**
   * Inside marker label placement relative to the marker line/area:
   * `'top-left'`, `'top-center'`, `'top-right'`,
   * `'bottom-left'`, `'bottom-center'`, `'bottom-right'`
   * (plus shorthands `'start'`, `'middle'`, `'end'`).
   * For outside callout icons/text, use `annotation`.
   */
  labelPosition?: MarkerLabelPosition;
  /** Padding (in px) away from the marker line/edge for inside label placement. */
  labelPadding?: number;
  /**
   * Inset padding (in px) away from the left/right or top/bottom plot boundary
   * for inside placements (`'top-left'`, `'bottom-right'`, etc.).
   */
  labelEdgePadding?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  /**
   * Optional per-marker styling & formatting overrides for the inside `label`
   * (e.g. `color`, `background`, `borderColor`, `borderRadius`, `fontSize`, `fontWeight`, `formatter`, `renderer`).
   * By default, marker text renders without a background box.
   */
  labelStyle?: Partial<Omit<LabelStyleOverride, 'target'>>;
  icon?: string;
  /**
   * Optional outside annotation (icon and/or text) placed outside the plot edge
   * where the mark line/area reaches (`left`, `right`, `top`, or `bottom`),
   * with customizable `padding` and hover/focus tooltip (enabled by default).
   */
  annotation?: string | MarkerAnnotationConfig;
  /**
   * Optional legend entry for this line or area marker inside the chart's
   * unified `<mc-legend>` (with marker-styled swatch and hover/focus legend tooltip).
   */
  legend?: boolean | MarkerLegendConfig;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
  fillOpacity?: number;
  /**
   * Threshold condition: if a bar or line item satisfies this condition
   * (e.g., `'below'` / `'under'` when value < marker.value), `matchStyle`
   * is applied to change its color/styles and recorded in `ctx.thresholds`.
   */
  condition?: MarkerCondition;
  /**
   * Controls whether threshold styling applies only to the portion of a bar,
   * line, or area that crosses the marker boundary (`'partial'`, default) or
   * restyles the entire item (`'item'`).
   */
  matchScope?: MarkerMatchScope;
  matchStyle?: MarkerMatchStyle;
}

export interface ThresholdMatchedItem {
  id: string;
  seriesId?: string;
  category?: string;
  value: number;
  px?: number;
  py?: number;
  width?: number;
  height?: number;
  originalColor: string;
  effectiveColor: string;
  isUnderThreshold: boolean;
  isAboveThreshold: boolean;
  matchedMarkerIds: string[];
  style: MarkerMatchStyle;
  datum: any;
}

export interface ThresholdEvaluationResult {
  matched: boolean;
  isUnderThreshold: boolean;
  isAboveThreshold: boolean;
  matchedMarkerIds: string[];
  matchedMarkers: MarkerConfig[];
  style: MarkerMatchStyle;
  effectiveColor?: string;
}

export interface ResolvedMarker extends MarkerConfig {
  id: string;
  type: MarkerType;
  axis: 'x' | 'y';
  /** Pixel position for line markers */
  pixelPos?: number;
  /** Start pixel position for area markers */
  pixelFrom?: number;
  /** End pixel position for area markers */
  pixelTo?: number;
  /** All chart items that matched this marker's threshold condition */
  matchedItems: ThresholdMatchedItem[];
}

export interface ThresholdContextInfo {
  markers: ResolvedMarker[];
  matchedItems: ThresholdMatchedItem[];
  underThresholdItems: ThresholdMatchedItem[];
  aboveThresholdItems: ThresholdMatchedItem[];
  evaluate: (
    value: number,
    datum?: any,
    axis?: 'x' | 'y',
    defaultColor?: string
  ) => ThresholdEvaluationResult;
}

export type LabelTargetType =
  | 'all'
  | 'axis-tick'
  | 'axis-title'
  | 'data'
  | 'bar-outer'
  | 'arc'
  | 'arc-link'
  | 'cell'
  | 'radar-axis'
  | 'radar-point'
  | 'node'
  | 'link'
  | 'legend'
  | 'title'
  | 'center'
  | 'marker'
  | 'custom';

export type LabelRenderMode = 'svg' | 'foreignObject' | 'custom';

export type LabelOverflowStrategy =
  | 'truncate'
  | 'rotate'
  | 'both'
  | 'wrap'
  | 'none';

export interface LabelOverflowConfig {
  /**
   * Overflow strategy applied when text exceeds `maxWidth` or `maxChars`:
   * - `'truncate'` (default): truncates with ellipsis using `@chenglou/pretext`.
   * - `'rotate'`: rotates the label up to `maxRotation` (default `45°`; supports negative values like `-45`).
   * - `'both'`: rotates (`maxRotation`) AND truncates to fit `maxWidth` / `maxChars`.
   * - `'wrap'`: multi-line `@chenglou/pretext` wrapping (`layoutWithLines`).
   * - `'none'`: disables truncation and automatic overflow rotation.
   */
  strategy?: LabelOverflowStrategy;
  /** Maximum available pixel width measured via `@chenglou/pretext` before overflow triggers. */
  maxWidth?: number;
  /** Maximum character (grapheme) count before overflow triggers. */
  maxChars?: number;
  /** Maximum line count (applies to multi-line text and `'wrap'` strategy). */
  maxLines?: number;
  /** Ellipsis suffix appended when truncating. Default `'…'`. */
  ellipsis?: string;
  /**
   * Maximum rotation angle in degrees when strategy is `'rotate'` or `'both'`.
   * Default `45`. Supports negative values (e.g. `-45`).
   */
  maxRotation?: number;
  /**
   * Show full untruncated text in a tooltip on hover and keyboard focus when
   * truncated. Enabled (`true`) by default; set `false` to explicitly disable.
   */
  enableTooltip?: boolean;
  /**
   * Customize or explicitly disable (`false`) the truncated-label tooltip using
   * the standard `TooltipConfig` API.
   */
  tooltip?: boolean | TooltipConfig<LabelDescriptor>;
}

export interface ResolvedLabelOverflowConfig {
  strategy: LabelOverflowStrategy;
  maxWidth?: number;
  maxChars?: number;
  maxLines?: number;
  ellipsis: string;
  maxRotation: number;
  enableTooltip: boolean;
  tooltip?: TooltipConfig<LabelDescriptor>;
}

export interface LabelTruncateResult {
  text: string;
  originalText: string;
  lines: MeasuredLabelLine[];
  truncated: boolean;
  overflowTriggered: boolean;
  appliedStrategy: LabelOverflowStrategy;
  appliedRotation: number;
  naturalWidth: number;
  width: number;
}

export interface LabelPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LabelDescriptor {
  id?: string;
  text: string;
  x: number;
  y: number;
  type: Exclude<LabelTargetType, 'all'>;
  anchor?: 'start' | 'middle' | 'end';
  baseline?: 'auto' | 'middle' | 'hanging' | 'central' | 'alphabetic';
  rotation?: number;
  maxWidth?: number;
  maxChars?: number;
  maxHeight?: number;
  maxLines?: number;
  ellipsis?: string;
  overflow?: LabelOverflowStrategy | LabelOverflowConfig;
  maxRotation?: number;
  enableTooltip?: boolean;
  tooltip?: boolean | TooltipConfig<LabelDescriptor>;
  lineHeight?: number;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: LabelPadding;
  renderMode?: LabelRenderMode;
  templateHtml?: string;
  /** Optional SVG/HTML/emoji icon to render inside the label (especially in `<foreignObject>` mode) */
  icon?: string | SVGElement | HTMLElement;
  iconPosition?: 'start' | 'end';
  iconSize?: number;
  iconGap?: number;
  className?: string;
  renderer?: CustomLabelRenderer;
  datum?: unknown;
  meta?: Record<string, unknown>;
}

export interface MeasuredLabelLine {
  text: string;
  width: number;
}

export interface MeasuredLabel {
  text: string;
  originalText: string;
  displayText: string;
  font: string;
  lines: MeasuredLabelLine[];
  lineCount: number;
  width: number;
  height: number;
  naturalWidth: number;
  lineHeight: number;
  truncated: boolean;
  overflowTriggered: boolean;
  appliedStrategy: LabelOverflowStrategy;
  appliedRotation: number;
  iconExtraWidth: number;
  boxWidth: number;
  boxHeight: number;
}

export interface LabelStyleOverride {
  target: LabelTargetType;
  renderMode?: LabelRenderMode;
  maxWidth?: number;
  maxChars?: number;
  maxLines?: number;
  ellipsis?: string;
  overflow?: LabelOverflowStrategy | LabelOverflowConfig;
  maxRotation?: number;
  enableTooltip?: boolean;
  tooltip?: boolean | TooltipConfig<LabelDescriptor>;
  lineHeight?: number;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: LabelPadding;
  rotation?: number;
  templateHtml?: string;
  icon?: string | SVGElement | HTMLElement;
  iconPosition?: 'start' | 'end';
  iconSize?: number;
  iconGap?: number;
  formatter?: ((text: string, descriptor: LabelDescriptor) => string) | string;
  renderer?: CustomLabelRenderer;
}

export type CustomLabelRenderer = (
  descriptor: LabelDescriptor,
  measured: MeasuredLabel,
  defaultRender: () => SVGGElement
) => SVGElement | SVGForeignObjectElement | HTMLElement | string | null | undefined;

export interface ItemAnimationSpec {
  type:
    | 'bar-vertical'
    | 'bar-horizontal'
    | 'line-draw'
    | 'area-fade'
    | 'point-pop'
    | 'arc-sweep'
    | 'cell-pop'
    | 'radar-expand'
    | 'sankey-flow'
    | 'needle-sweep';
  index?: number;
  originX?: number;
  originY?: number;
  targetY?: number;
  targetHeight?: number;
  targetWidth?: number;
  targetRadius?: number;
}

export type BarOuterLabelScope = 'auto' | 'bar' | 'stack';
export type BarOuterLabelPosition = 'auto' | 'top' | 'bottom';
export type BarNegativeLabelPosition =
  | 'outside-bottom'
  | 'chart-bottom'
  | 'above-zero';

export interface BarOuterLabelDatum {
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
  row: BarDatum;
}

/**
 * Configuration for outer bar labels (e.g. stack totals above positive bars
 * and/or below negative bars, or per-bar outer labels in grouped mode).
 * Coexists independently with centered inside bar labels (`enableLabels`).
 */
export interface BarOuterLabelConfig {
  /** Enable outer / summary labels. Default `false`. */
  enabled?: boolean;
  /**
   * Granularity of outer labels:
   * - `'auto'` (default): stack totals in stacked mode, per-bar labels in grouped mode.
   * - `'stack'`: one summary label per category stack (positive and/or negative).
   * - `'bar'`: one outer label per individual bar item.
   */
  scope?: BarOuterLabelScope;
  /**
   * Placement for positive bars/stacks (default `'auto'` -> `'top'` for positive,
   * follows `negativePosition` for negative).
   */
  position?: BarOuterLabelPosition;
  /**
   * Placement for negative bars/stacks (default `'outside-bottom'`):
   * - `'outside-bottom'`: just outside the negative end of the bar.
   * - `'chart-bottom'`: aligned along the bottom of the plot area (or left edge in horizontal layout).
   * - `'above-zero'`: placed just above the zero baseline (or right of zero in horizontal layout).
   */
  negativePosition?: BarNegativeLabelPosition;
  /** Pixel padding away from the bar edge (or plot edge for `'chart-bottom'`). Default `8`. */
  padding?: number;
  /** Optional custom formatter receiving the outer label datum (stack totals or bar value). */
  formatter?: (datum: BarOuterLabelDatum) => string;
  renderMode?: LabelRenderMode;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  color?: string;
  background?: string;
  borderColor?: string;
  borderRadius?: number;
  boxPadding?: LabelPadding;
  maxWidth?: number;
  maxChars?: number;
  ellipsis?: string;
  overflow?: LabelOverflowStrategy | LabelOverflowConfig;
  maxRotation?: number;
  enableTooltip?: boolean;
  tooltip?: boolean | TooltipConfig<LabelDescriptor>;
  icon?: string | SVGElement | HTMLElement;
  iconPosition?: 'start' | 'end';
  iconSize?: number;
  iconGap?: number;
  templateHtml?: string;
  renderer?: CustomLabelRenderer;
}

export interface TooltipItemEntry {
  id?: string;
  label: string;
  value: number | string;
  formattedValue?: string;
  color?: string;
  percentage?: number;
  badge?: string;
  datum?: Record<string, any>;
}

export type TooltipPositionMode = 'follow' | 'item';

export interface TooltipAnchorRect {
  /** Anchor left coordinate (viewport client px, or container-relative px when `relative: true`). */
  left: number;
  /** Anchor top coordinate (viewport client px, or container-relative px when `relative: true`). */
  top: number;
  /** Anchor width in pixels. */
  width: number;
  /** Anchor height in pixels. */
  height: number;
  /** When true, `left`/`top` are relative to `.mc-chart-container` instead of viewport client coords. */
  relative?: boolean;
}

/**
 * Unified structured payload passed to `<mc-tooltip>` and client
 * `tooltip.formatter` / `tooltip.renderer` callbacks across all 10 charts.
 */
export interface TooltipPayload<TDatum = any> {
  chartType: string;
  title?: string;
  label?: string;
  seriesId?: string;
  category?: string;
  value?: number | string;
  formattedValue?: string;
  color?: string;
  percentage?: number;
  badge?: string;
  items?: TooltipItemEntry[];
  datum?: TDatum;
  data?: unknown;
  threshold?: ThresholdEvaluationResult;
  clientX: number;
  clientY: number;
  /** Optional item bounding box or point anchor used when `tooltip.position` is `'item'` (or on keyboard focus). */
  anchor?: TooltipAnchorRect;
  /** Resolved positioning mode applied for this tooltip display (`'item'` or `'follow'`). */
  positionMode?: TooltipPositionMode;
  /** Trigger source (`'pointer'` hover/move vs `'keyboard'` focus navigation). */
  source?: 'pointer' | 'keyboard';
  defaultHtml?: string;
}

export type TooltipInput<TDatum = any> =
  | string
  | Omit<TooltipPayload<TDatum>, 'chartType' | 'clientX' | 'clientY' | 'data'>;

export type TooltipRenderer<TDatum = any> = (
  payload: TooltipPayload<TDatum>,
  defaultRender: () => HTMLElement
) => HTMLElement | DocumentFragment | string | null | undefined;

export interface TooltipConfig<TDatum = any> {
  /** Enable or disable the unified chart tooltip. Default `true`. */
  enabled?: boolean;
  /**
   * Tooltip positioning mode:
   * - `'item'`: anchors centered on top of the active item (flips below when near the top edge).
   * - `'follow'`: follows the mouse/pointer with edge flipping and boundary clamping.
   * Defaults to a per-chart sensible mode (`'item'` for bar/scatter/radar/gauge; `'follow'` for line/pie/sunburst/heatmap/treemap/sankey).
   */
  position?: TooltipPositionMode;
  /** Gap in pixels between the anchored item and the tooltip in `'item'` mode. Default `10`. */
  anchorGap?: number;
  /** Horizontal pixel offset from pointer in `'follow'` mode. Default `14`. */
  offsetX?: number;
  /** Vertical pixel offset from pointer in `'follow'` mode. Default `14`. */
  offsetY?: number;
  /** Optional custom CSS class added to `<mc-tooltip>`. */
  className?: string;
  /** Custom formatter returning an HTML/text string (or null to hide). */
  formatter?: (payload: TooltipPayload<TDatum>) => string | null | undefined;
  /**
   * Full custom renderer returning an `HTMLElement`, `DocumentFragment`,
   * HTML string, or `null` (to suppress). Receives `defaultRender()` to
   * wrap or extend the default structured tooltip DOM.
   */
  renderer?: TooltipRenderer<TDatum>;
  /** Optional declarative HTML template string (populated from `<mc-tooltip><template>...</template></mc-tooltip>`). */
  templateHtml?: string;
}

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

export interface LegendPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  value?: number | string;
  index?: number;
  total?: number;
  /** Swatch shape (`'square'` default, `'line'` for line markers, `'area'` for area markers). */
  swatch?: 'square' | 'line' | 'area';
  strokeDasharray?: string;
  fillOpacity?: number;
  kind?: 'series' | 'marker';
  tooltipText?: string;
  meta?: Record<string, any>;
}

/**
 * Configuration for the unified SVG `<mc-legend>` component shared across charts.
 */
export interface LegendConfig {
  /** Enable or disable the legend layer. Default `true`. */
  enabled?: boolean;
  /** Legend placement around the plot area. Default `'bottom'`. */
  position?: LegendPosition;
  /** Padding around the legend box (number for uniform padding or per-side object). */
  padding?: number | Partial<LegendPadding>;
  /** Wrap items onto additional rows (top/bottom) or columns (left/right) when exceeding available space. Default `true`. */
  wrap?: boolean;
  /** Show a dedicated legend tooltip on hover and keyboard Tab focus. Default `true`. */
  enableTooltip?: boolean;
  /**
   * Dedicated legend tooltip configuration (separate from chart item `config.tooltip`),
   * following the exact same `TooltipConfig` API (`enabled`, `formatter`, `renderer`, `offsetX`, `offsetY`, `className`).
   */
  tooltip?: boolean | TooltipConfig<LegendItem>;
  /** Horizontal gap between adjacent items in px. Default `14`. */
  itemGap?: number;
  /** Vertical gap between wrapped rows (or vertical items) in px. Default `8`. */
  rowGap?: number;
  /** Swatch rectangle size in px. Default `10`. */
  swatchSize?: number;
  /** Optional max width per legend label before Pretext wraps/truncates it. */
  maxItemWidth?: number;
  /** Font size override for legend item labels. */
  fontSize?: number;
}

export interface ResolvedLegendConfig {
  enabled: boolean;
  position: LegendPosition;
  padding: LegendPadding;
  wrap: boolean;
  enableTooltip: boolean;
  tooltip: TooltipConfig<LegendItem>;
  itemGap: number;
  rowGap: number;
  swatchSize: number;
  maxItemWidth?: number;
  fontSize?: number;
}

/**
 * Single unified Nivo-style chart configuration object (`chart.config = { ... }`).
 * Underneath, the chart maps this single config onto its composable sub-components:
 * `<mc-theme-layer>`, `<mc-scale-layer>`, `<mc-view-layer>`, `<mc-animation-layer>`,
 * `<mc-aria-layer>`, `<mc-marker-layer>`, `<mc-label>`, and the `layers` rendering pipeline.
 */
export type ChartStateKind = 'loading' | 'empty' | 'ready';
export type ChartDisplayState = 'loading' | 'empty';

export interface ChartStateChangeDetail {
  state: ChartStateKind;
  previousState: ChartStateKind | null;
  chartType: string;
}

export interface ChartConfig<TData = any> {
  data?: TData;
  width?: number;
  height?: number;
  autoSize?: boolean;
  margin?: Partial<ChartMargin>;
  title?: string;

  // Shared <mc-chart-state> loading & empty overlay config
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;

  // Nivo-style layers list (built-in layer names or custom layer functions)
  layers?: LayerInput<TData>[];

  // Theme layer config
  theme?: Partial<ChartTheme>;
  themeMode?: ThemeModePreference;
  palette?: ChartPaletteName;
  colors?: string[];

  // Scale layer config (Nivo-style xScale, yScale, scales, colorScheme)
  xScale?: Partial<ScaleAxisConfig>;
  yScale?: Partial<ScaleAxisConfig>;
  scales?: Partial<ScaleConfig>;
  colorScheme?: string;

  // ECharts-style View / Roam / Zoom layer config
  view?: Partial<ViewConfig>;

  // Nivo-style Animation layer config (animate + motionConfig + animation)
  animate?: boolean;
  motionConfig?: MotionPresetName | Partial<AnimationConfig>;
  animation?: Partial<AnimationConfig>;

  // Marker & Threshold layer config (Nivo markers + ECharts markLine/markArea + conditional threshold styling)
  markers?: MarkerConfig[];

  // Universal <mc-label> & <mc-truncate> overflow config
  label?: Partial<LabelStyleOverride> | Partial<LabelStyleOverride>[];
  labelMode?: LabelRenderMode;
  labelRenderer?: CustomLabelRenderer;
  labelOverflow?: LabelOverflowStrategy | LabelOverflowConfig;
  enableLabels?: boolean;

  // Unified <mc-tooltip> config (one singleton <mc-tooltip> per chart)
  tooltip?: boolean | TooltipConfig<any>;
  /** Convenience shorthand for `tooltip.position` (`'item' | 'follow'`), also reflected by the `tooltip-position` HTML attribute. */
  tooltipPosition?: TooltipPositionMode;

  // Unified SVG <mc-legend> config (shared across categorical charts)
  legend?: boolean | LegendConfig;

  // Universal <mc-aria-layer> config + Nivo-style ARIA shorthands
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  isFocusable?: boolean;
  barAriaLabel?: AriaItemLabelAccessor;
  pointAriaLabel?: AriaItemLabelAccessor;
  arcAriaLabel?: AriaItemLabelAccessor;
  cellAriaLabel?: AriaItemLabelAccessor;
  nodeAriaLabel?: AriaItemLabelAccessor;
  linkAriaLabel?: AriaItemLabelAccessor;
  aria?: Partial<AriaConfig>;

  // Chart-specific options
  keys?: string[];
  indexBy?: string;
  groupMode?: 'grouped' | 'stacked';
  layout?: 'vertical' | 'horizontal';
  outerLabels?: boolean | BarOuterLabelConfig;
  curve?: string;
  enableArea?: boolean;
  areaOpacity?: number;
  lineWidth?: number;
  pointSize?: number;
  enablePointLabels?: boolean;
  enableSlices?: boolean;
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  centerLabel?: string;
  cellShape?: 'rect' | 'circle';
  cellPadding?: number;
  borderRadius?: number;
  gridShape?: 'circular' | 'linear';
  gridLevels?: number;
  fillOpacity?: number;
  enableDots?: boolean;
  enableDotLabels?: boolean;
  enableTrendline?: boolean;
  interactiveDrilldown?: boolean;
  nodeWidth?: number;
  nodePadding?: number;
  linkOpacity?: number;
  minNodeSize?: number;
  maxNodeSize?: number;
  tilePadding?: number;
  xTitle?: string;
  yTitle?: string;
  min?: number;
  max?: number;
  unit?: string;
}

export interface ChartRenderContext<TData = unknown> {
  chartType: string;
  config: ChartConfig<TData>;
  data: TData;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: ChartMargin;
  theme: ChartTheme;
  scaleConfig: ScaleConfig;
  viewConfig: ViewConfig;
  animationConfig: AnimationConfig;
  ariaConfig: AriaConfig;
  legendConfig: ResolvedLegendConfig;
  /** Resolved marker lines and marker areas with pixel positions and matched threshold items */
  markers: ResolvedMarker[];
  /** Threshold evaluation state and helpers passed to both built-in layers and client custom layers */
  thresholds: ThresholdContextInfo;
  xScale?: any;
  yScale?: any;
  colorScale: (key: string | number) => string;
  svg: SVGSVGElement;
  rootGroup: SVGGElement;
  layerGroup: SVGGElement;
  d3: typeof d3;
  renderLabel: (
    parent: SVGElement,
    descriptor: LabelDescriptor
  ) => SVGGElement | null;
  measureText: (
    text: string,
    options?: Partial<LabelDescriptor>
  ) => MeasuredLabel;
  decorateAriaItem: (
    element: SVGElement,
    descriptor: AriaItemDescriptor
  ) => SVGElement;
  animateItem: (
    element: SVGElement,
    spec: ItemAnimationSpec
  ) => void;
  evaluateThresholds: (
    value: number,
    datum?: any,
    axis?: 'x' | 'y',
    defaultColor?: string
  ) => ThresholdEvaluationResult;
  showTooltip: (
    content: TooltipInput,
    clientX: number,
    clientY: number,
    overrideConfig?: TooltipConfig<any>
  ) => void;
  hideTooltip: () => void;
  showLegendTooltip: (
    content: TooltipInput<LegendItem>,
    clientX: number,
    clientY: number
  ) => void;
  hideLegendTooltip: () => void;
  state: Record<string, any>;
}

export type CustomLayerRenderer<TData = unknown> = (
  ctx: ChartRenderContext<TData>
) => SVGElement | string | void;

export type LayerInput<TData = unknown> =
  | string
  | CustomLayerRenderer<TData>
  | {
      name: string;
      render: CustomLayerRenderer<TData>;
    };

// Chart Data Models

export interface LineDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  [key: string]: unknown;
}

export interface LineSeries {
  id: string;
  color?: string;
  data: LineDataPoint[];
}

export interface BarDatum {
  [key: string]: string | number;
}

export interface PieDatum {
  id: string;
  label?: string;
  value: number;
  color?: string;
}

export interface HeatmapCell {
  x: string;
  y: number;
}

export interface HeatmapRow {
  id: string;
  data: HeatmapCell[];
}

export interface RadarDatum {
  [key: string]: string | number;
}

export interface HierarchyNode {
  name: string;
  value?: number;
  color?: string;
  children?: HierarchyNode[];
}

export interface SankeyNode {
  id: string;
  name?: string;
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface ScatterPoint {
  x: number;
  y: number;
  size?: number;
  label?: string;
  id?: string;
}

export interface ScatterSeries {
  id: string;
  color?: string;
  data: ScatterPoint[];
}

export interface GaugeBand {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface GaugeDatum {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  target?: number;
  bands?: GaugeBand[];
}
