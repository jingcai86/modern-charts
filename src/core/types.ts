import type * as d3 from 'd3';

export const VERSION = '0.1.0-alpha.0';

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
  labelPosition?: 'start' | 'middle' | 'end';
  labelOffsetX?: number;
  labelOffsetY?: number;
  icon?: string;
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
  maxHeight?: number;
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
  datum?: unknown;
  meta?: Record<string, unknown>;
}

export interface MeasuredLabelLine {
  text: string;
  width: number;
}

export interface MeasuredLabel {
  text: string;
  font: string;
  lines: MeasuredLabelLine[];
  lineCount: number;
  width: number;
  height: number;
  naturalWidth: number;
  lineHeight: number;
  truncated: boolean;
  iconExtraWidth: number;
  boxWidth: number;
  boxHeight: number;
}

export interface LabelStyleOverride {
  target: LabelTargetType;
  renderMode?: LabelRenderMode;
  maxWidth?: number;
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

/**
 * Single unified Nivo-style chart configuration object (`chart.config = { ... }`).
 * Underneath, the chart maps this single config onto its composable sub-components:
 * `<mc-theme-layer>`, `<mc-scale-layer>`, `<mc-view-layer>`, `<mc-animation-layer>`,
 * `<mc-aria-layer>`, `<mc-marker-layer>`, `<mc-label>`, and the `layers` rendering pipeline.
 */
export interface ChartConfig<TData = any> {
  data?: TData;
  width?: number;
  height?: number;
  autoSize?: boolean;
  margin?: Partial<ChartMargin>;
  title?: string;

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

  // Universal <mc-label> config
  label?: Partial<LabelStyleOverride> | Partial<LabelStyleOverride>[];
  labelMode?: LabelRenderMode;
  labelRenderer?: CustomLabelRenderer;
  enableLabels?: boolean;

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
  showTooltip: (html: string, clientX: number, clientY: number) => void;
  hideTooltip: () => void;
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
