import type { ChartConfig, ThemeModePreference } from '../../src/index';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_GAUGE_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_LINE_DATA,
  SAMPLE_PIE_DATA,
  SAMPLE_RADAR_DATA,
  SAMPLE_SANKEY_DATA,
  SAMPLE_SCATTER_DATA,
  SAMPLE_SUNBURST_DATA
} from './sample-data';

export type AttributeControlType =
  | 'boolean'
  | 'number'
  | 'range'
  | 'select'
  | 'text'
  | 'color';

export interface ChartAttributeSpec {
  /** Path in `chart.config` (e.g. 'enableArea', 'yScale.max', 'view.zoomable') */
  configPath: string;
  /** HTML attribute equivalent on the Web Component or layer tag */
  attrName: string;
  /** Group category shown in the attributes table */
  category:
    | 'Chart-Specific'
    | 'Theme Layer (<mc-theme-layer>)'
    | 'Scale Layer (<mc-scale-layer>)'
    | 'View & Zoom (<mc-view-layer>)'
    | 'Animation (<mc-animation-layer>)'
    | 'Marker & Threshold (<mc-marker-layer>)'
    | 'Legend (<mc-legend>)'
    | 'Universal Label (<mc-label>)'
    | 'Accessibility (<mc-aria-layer>)'
    | 'Sizing & Layout';
  control: AttributeControlType;
  description: string;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface ChartCatalogEntry {
  id: string;
  title: string;
  tagName: string;
  summary: string;
  subComponents: string[];
  defaultLayers: string[];
  supportsMarkers: boolean;
  supportsCartesianScales: boolean;
  supportsViewZoom: boolean;
  createDefaultConfig: (themeMode: ThemeModePreference) => ChartConfig<any>;
  specificAttributes: ChartAttributeSpec[];
}

export const SVG_ICON_PRESETS: Record<string, string | undefined> = {
  none: undefined,
  check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>`,
  warn: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
  bolt: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

export const COMMON_ATTRIBUTES: ChartAttributeSpec[] = [
  // Sizing & Layout
  {
    configPath: 'autoSize',
    attrName: 'auto-size',
    category: 'Sizing & Layout',
    control: 'boolean',
    description:
      'When true, observes parent container resize via ResizeObserver. When false, uses container snapshot size + .resize().',
    defaultValue: true
  },
  {
    configPath: 'title',
    attrName: 'chart-title',
    category: 'Sizing & Layout',
    control: 'text',
    description: 'Chart heading rendered via universal <mc-label>.',
    defaultValue: ''
  },
  {
    configPath: 'margin.top',
    attrName: 'margin (top)',
    category: 'Sizing & Layout',
    control: 'range',
    min: 12,
    max: 90,
    step: 2,
    description: 'Top inner margin in pixels.',
    defaultValue: 36
  },
  {
    configPath: 'margin.right',
    attrName: 'margin (right)',
    category: 'Sizing & Layout',
    control: 'range',
    min: 12,
    max: 110,
    step: 2,
    description: 'Right inner margin in pixels.',
    defaultValue: 28
  },
  {
    configPath: 'margin.bottom',
    attrName: 'margin (bottom)',
    category: 'Sizing & Layout',
    control: 'range',
    min: 20,
    max: 100,
    step: 2,
    description: 'Bottom inner margin in pixels.',
    defaultValue: 64
  },
  {
    configPath: 'margin.left',
    attrName: 'margin (left)',
    category: 'Sizing & Layout',
    control: 'range',
    min: 20,
    max: 110,
    step: 2,
    description: 'Left inner margin in pixels.',
    defaultValue: 56
  },

  // Theme Layer
  {
    configPath: 'themeMode',
    attrName: 'theme-mode',
    category: 'Theme Layer (<mc-theme-layer>)',
    control: 'select',
    options: [
      { label: 'system (OS Default)', value: 'system' },
      { label: 'dark', value: 'dark' },
      { label: 'light', value: 'light' }
    ],
    description: 'Color scheme mode applied to the chart canvas and tooltips.',
    defaultValue: 'system'
  },
  {
    configPath: 'palette',
    attrName: 'palette',
    category: 'Theme Layer (<mc-theme-layer>)',
    control: 'select',
    options: [
      { label: 'modern', value: 'modern' },
      { label: 'nivo', value: 'nivo' },
      { label: 'echarts', value: 'echarts' },
      { label: 'emerald', value: 'emerald' },
      { label: 'sunset', value: 'sunset' },
      { label: 'ocean', value: 'ocean' },
      { label: 'cyber', value: 'cyber' }
    ],
    description: 'Color palette used by D3 ordinal color scale.',
    defaultValue: 'modern'
  },
  {
    configPath: 'theme.fontSize',
    attrName: 'mc-theme-layer[font-size]',
    category: 'Theme Layer (<mc-theme-layer>)',
    control: 'range',
    min: 9,
    max: 18,
    step: 1,
    description: 'Base font size (px) passed to @chenglou/pretext measurement.',
    defaultValue: 12
  },

  // Universal <mc-label>
  {
    configPath: 'labelMode',
    attrName: 'label-mode / mc-label[mode]',
    category: 'Universal Label (<mc-label>)',
    control: 'select',
    options: [
      { label: 'svg (<text> + <tspan>)', value: 'svg' },
      { label: 'foreignObject (HTML + Icons)', value: 'foreignObject' }
    ],
    description:
      'Switches every label in the chart between SVG <text> and Pretext-sized SVG <foreignObject>.',
    defaultValue: 'svg'
  },
  {
    configPath: '__labelIconPreset',
    attrName: 'mc-label[icon]',
    category: 'Universal Label (<mc-label>)',
    control: 'select',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Check SVG Icon (<foreignObject>)', value: 'check' },
      { label: 'Alert Warning SVG Icon (<foreignObject>)', value: 'warn' },
      { label: 'Lightning Bolt SVG Icon (<foreignObject>)', value: 'bolt' }
    ],
    description:
      'Embeds an inline SVG icon inside every chart label <foreignObject>, measured via @chenglou/pretext.',
    defaultValue: 'none'
  },

  // Animation Layer
  {
    configPath: 'animate',
    attrName: 'animate / mc-animation-layer[enabled]',
    category: 'Animation (<mc-animation-layer>)',
    control: 'boolean',
    description: 'Enables or disables entry and transition animations.',
    defaultValue: true
  },
  {
    configPath: 'motionConfig',
    attrName: 'motion-config / mc-animation-layer[preset]',
    category: 'Animation (<mc-animation-layer>)',
    control: 'select',
    options: [
      { label: 'default (520ms cubic-out)', value: 'default' },
      { label: 'gentle (680ms quad-out)', value: 'gentle' },
      { label: 'wobbly (760ms elastic-out)', value: 'wobbly' },
      { label: 'stiff (320ms cubic-out)', value: 'stiff' },
      { label: 'slow (980ms cubic-out)', value: 'slow' },
      { label: 'molasses (1450ms quad-out)', value: 'molasses' },
      { label: 'elastic (820ms elastic-out)', value: 'elastic' },
      { label: 'bounce (780ms bounce-out)', value: 'bounce' }
    ],
    description: 'Nivo-style motionConfig preset driving <mc-animation-layer>.',
    defaultValue: 'default'
  },
  {
    configPath: 'animation.stagger',
    attrName: 'mc-animation-layer[stagger]',
    category: 'Animation (<mc-animation-layer>)',
    control: 'range',
    min: 0,
    max: 120,
    step: 5,
    description: 'Per-item stagger delay in milliseconds.',
    defaultValue: 32
  },

  // Accessibility Layer (<mc-aria-layer>)
  {
    configPath: 'ariaLabel',
    attrName: 'aria-label / mc-aria[label]',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'text',
    description: 'Accessible name applied to the chart SVG figure.',
    defaultValue: 'Interactive Chart Visualization'
  },
  {
    configPath: 'isFocusable',
    attrName: 'is-focusable / mc-aria[is-focusable]',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'boolean',
    description:
      'Makes every chart data item keyboard-focusable (tabindex="0") with Arrow key navigation.',
    defaultValue: true
  },
  {
    configPath: 'aria.itemRole',
    attrName: 'mc-aria[item-role]',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'select',
    options: [
      { label: 'graphics-symbol', value: 'graphics-symbol' },
      { label: 'listitem', value: 'listitem' },
      { label: 'img', value: 'img' },
      { label: 'button', value: 'button' }
    ],
    description: 'ARIA role assigned to each individual chart item.',
    defaultValue: 'graphics-symbol'
  },
  {
    configPath: 'aria.itemLabel',
    attrName: 'mc-aria[item-label]',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'text',
    description:
      'Custom template string (e.g. "{{seriesId}} ({{category}}): {{value}}") for every item aria-label.',
    defaultValue: ''
  }
];

export const LEGEND_ATTRIBUTES: ChartAttributeSpec[] = [
  {
    configPath: 'legend.enabled',
    attrName: 'mc-legend[enabled]',
    category: 'Legend (<mc-legend>)',
    control: 'boolean',
    description:
      'Shows or hides the unified Pretext-measured SVG legend shared across categorical charts.',
    defaultValue: true
  },
  {
    configPath: 'legend.position',
    attrName: 'mc-legend[position]',
    category: 'Legend (<mc-legend>)',
    control: 'select',
    options: [
      { label: 'bottom', value: 'bottom' },
      { label: 'top', value: 'top' },
      { label: 'left', value: 'left' },
      { label: 'right', value: 'right' }
    ],
    description:
      'Places the legend on any of the 4 sides (top, bottom, left, right) with automatic margin reservation.',
    defaultValue: 'bottom'
  },
  {
    configPath: 'legend.wrap',
    attrName: 'mc-legend[wrap]',
    category: 'Legend (<mc-legend>)',
    control: 'boolean',
    description:
      'Wraps legend items onto additional rows (top/bottom) or columns (left/right) by default using @chenglou/pretext measurements.',
    defaultValue: true
  },
  {
    configPath: 'legend.enableTooltip',
    attrName: 'mc-legend[enable-tooltip]',
    category: 'Legend (<mc-legend>)',
    control: 'boolean',
    description:
      'Shows a dedicated legend tooltip on pointer hover or keyboard Tab focus (independently customizable via legend.tooltip and ::part(legend-tooltip)).',
    defaultValue: true
  },
  {
    configPath: 'legend.padding.top',
    attrName: 'mc-legend[padding-top]',
    category: 'Legend (<mc-legend>)',
    control: 'range',
    min: 0,
    max: 48,
    step: 2,
    description: 'Top padding around the SVG legend container in pixels.',
    defaultValue: 8
  },
  {
    configPath: 'legend.padding.right',
    attrName: 'mc-legend[padding-right]',
    category: 'Legend (<mc-legend>)',
    control: 'range',
    min: 0,
    max: 48,
    step: 2,
    description: 'Right padding around the SVG legend container in pixels.',
    defaultValue: 12
  },
  {
    configPath: 'legend.padding.bottom',
    attrName: 'mc-legend[padding-bottom]',
    category: 'Legend (<mc-legend>)',
    control: 'range',
    min: 0,
    max: 48,
    step: 2,
    description: 'Bottom padding around the SVG legend container in pixels.',
    defaultValue: 8
  },
  {
    configPath: 'legend.padding.left',
    attrName: 'mc-legend[padding-left]',
    category: 'Legend (<mc-legend>)',
    control: 'range',
    min: 0,
    max: 48,
    step: 2,
    description: 'Left padding around the SVG legend container in pixels.',
    defaultValue: 12
  }
];

export const VIEW_ZOOM_ATTRIBUTES: ChartAttributeSpec[] = [
  {
    configPath: 'view.zoomable',
    attrName: 'mc-view-layer[zoomable]',
    category: 'View & Zoom (<mc-view-layer>)',
    control: 'boolean',
    description: 'Enables mouse-wheel / pinch zooming via d3-zoom.',
    defaultValue: true
  },
  {
    configPath: 'view.pannable',
    attrName: 'mc-view-layer[pannable]',
    category: 'View & Zoom (<mc-view-layer>)',
    control: 'boolean',
    description: 'Enables click-and-drag panning across the chart viewport.',
    defaultValue: true
  },
  {
    configPath: 'view.showControls',
    attrName: 'mc-view-layer[show-controls]',
    category: 'View & Zoom (<mc-view-layer>)',
    control: 'boolean',
    description: 'Displays on-chart [+], [−], and [Reset] zoom buttons.',
    defaultValue: true
  },
  {
    configPath: 'view.maxZoom',
    attrName: 'mc-view-layer[max-zoom]',
    category: 'View & Zoom (<mc-view-layer>)',
    control: 'range',
    min: 2,
    max: 16,
    step: 1,
    description: 'Maximum zoom scale factor.',
    defaultValue: 6
  }
];

export const MARKER_THRESHOLD_ATTRIBUTES: ChartAttributeSpec[] = [
  {
    configPath: '__markerEnabled',
    attrName: 'mc-marker-layer[enabled]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'boolean',
    description:
      'Enables the threshold marker line & shaded area that restyles items under the threshold.',
    defaultValue: true
  },
  {
    configPath: '__markerThresholdValue',
    attrName: 'mc-marker[value]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'range',
    min: 40,
    max: 240,
    step: 5,
    description:
      'Threshold value: items below (or matching condition) change color and styles automatically.',
    defaultValue: 130
  },
  {
    configPath: '__markerCondition',
    attrName: 'mc-marker[condition]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'select',
    options: [
      { label: 'below (under threshold)', value: 'below' },
      { label: 'above (over threshold)', value: 'above' },
      { label: 'between (0 to threshold)', value: 'between' }
    ],
    description: 'Condition determining which items trigger threshold styling.',
    defaultValue: 'below'
  },
  {
    configPath: '__markerMatchColor',
    attrName: 'mc-marker[match-color]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'color',
    description:
      'Fill/stroke color applied to bars, line segments, or points that trigger the threshold.',
    defaultValue: '#ef4444'
  },
  {
    configPath: '__markerLabelPosition',
    attrName: 'mc-marker[label-position]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'select',
    options: [
      { label: 'top-right (Inside — Above Right)', value: 'top-right' },
      { label: 'top-left (Inside — Above Left)', value: 'top-left' },
      { label: 'top-center (Inside — Above Center)', value: 'top-center' },
      { label: 'bottom-right (Inside — Below Right)', value: 'bottom-right' },
      { label: 'bottom-left (Inside — Below Left)', value: 'bottom-left' },
      { label: 'bottom-center (Inside — Below Center)', value: 'bottom-center' },
      { label: 'outside-right (Outside — Right of Plot)', value: 'outside-right' },
      { label: 'outside-left (Outside — Left of Y-Axis)', value: 'outside-left' },
      { label: 'outside-top (Outside — Above Plot)', value: 'outside-top' },
      { label: 'outside-bottom (Outside — Below X-Axis)', value: 'outside-bottom' }
    ],
    description:
      'Places the marker label inside relative to the dashed line or outside next to the chart axes.',
    defaultValue: 'top-right'
  },
  {
    configPath: '__markerLabelPadding',
    attrName: 'mc-marker[label-padding]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'range',
    min: 0,
    max: 36,
    step: 2,
    description:
      'Distance (px) away from the dashed marker line (inside) or away from the axis (outside).',
    defaultValue: 10
  },
  {
    configPath: '__markerLabelEdgePadding',
    attrName: 'mc-marker[label-edge-padding]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'range',
    min: 0,
    max: 40,
    step: 2,
    description:
      'Inset distance (px) from the left/right or top/bottom plot boundary when placed inside.',
    defaultValue: 10
  }
];

export const CHART_CATALOG: ChartCatalogEntry[] = [
  {
    id: 'line',
    title: 'Line & Area Chart',
    tagName: 'mc-line-chart',
    summary:
      'Multi-series Cartesian line & area chart with threshold gradient splitting, crosshair slice tooltips, pan/zoom view layer, and AI progressive layer streaming.',
    subComponents: [
      'mc-theme-layer',
      'mc-scale-layer',
      'mc-view-layer',
      'mc-animation-layer',
      'mc-marker-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-line-item',
      'mc-point-item'
    ],
    defaultLayers: [
      'grid',
      'markers',
      'axes',
      'areas',
      'lines',
      'points',
      'pointLabels',
      'slices',
      'legends'
    ],
    supportsMarkers: true,
    supportsCartesianScales: true,
    supportsViewZoom: true,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_LINE_DATA,
      autoSize: true,
      title: 'Throughput (req/s)',
      xTitle: 'Month',
      yTitle: 'Throughput (req/s)',
      curve: 'monotoneX',
      enableArea: true,
      areaOpacity: 0.22,
      lineWidth: 2.5,
      pointSize: 9,
      enablePointLabels: true,
      enableSlices: true,
      themeMode,
      palette: 'modern',
      xScale: { type: 'point' },
      yScale: { type: 'linear', min: 0, max: 320, stacked: false },
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      animate: true,
      motionConfig: 'default',
      markers: [
        {
          id: 'sla-danger-area',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 135,
          fill: '#ef4444',
          fillOpacity: 0.09
        },
        {
          id: 'sla-min-line',
          type: 'line',
          axis: 'y',
          value: 135,
          label: 'SLA < 135',
          icon: SVG_ICON_PRESETS.warn,
          stroke: '#ef4444',
          strokeWidth: 2,
          strokeDasharray: '6 4',
          condition: 'below',
          matchStyle: {
            color: '#ef4444',
            fill: '#ef4444',
            stroke: '#ef4444',
            radius: 6
          }
        }
      ],
      ariaLabel: 'Monthly AI Inference Throughput Line Chart',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'curve',
        attrName: 'curve',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'monotoneX', value: 'monotoneX' },
          { label: 'catmullRom', value: 'catmullRom' },
          { label: 'natural', value: 'natural' },
          { label: 'linear', value: 'linear' },
          { label: 'step', value: 'step' },
          { label: 'stepAfter', value: 'stepAfter' },
          { label: 'stepBefore', value: 'stepBefore' }
        ],
        description: 'D3 curve interpolation factory for lines and areas.',
        defaultValue: 'monotoneX'
      },
      {
        configPath: 'enableArea',
        attrName: 'enable-area',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders gradient area fills beneath each line series.',
        defaultValue: true
      },
      {
        configPath: 'areaOpacity',
        attrName: 'area-opacity',
        category: 'Chart-Specific',
        control: 'range',
        min: 0.05,
        max: 0.85,
        step: 0.05,
        description: 'Base opacity for the area fill gradient.',
        defaultValue: 0.22
      },
      {
        configPath: 'lineWidth',
        attrName: 'line-width',
        category: 'Chart-Specific',
        control: 'range',
        min: 1,
        max: 8,
        step: 0.5,
        description: 'Stroke width of each series path in pixels.',
        defaultValue: 2.5
      },
      {
        configPath: 'pointSize',
        attrName: 'point-size',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 20,
        step: 1,
        description: 'Diameter of each data point circle in pixels.',
        defaultValue: 9
      },
      {
        configPath: 'enablePointLabels',
        attrName: 'enable-point-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Renders value labels above data points using <mc-label> and @chenglou/pretext.',
        defaultValue: true
      },
      {
        configPath: 'enableSlices',
        attrName: 'enable-slices',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Enables vertical crosshair slice hover across all series.',
        defaultValue: true
      },
      {
        configPath: 'yScale.stacked',
        attrName: 'mc-scale-layer[y-stacked]',
        category: 'Scale Layer (<mc-scale-layer>)',
        control: 'boolean',
        description: 'Stacks Y values across all line series.',
        defaultValue: false
      },
      {
        configPath: 'yScale.reverse',
        attrName: 'mc-scale-layer[y-reverse]',
        category: 'Scale Layer (<mc-scale-layer>)',
        control: 'boolean',
        description: 'Reverses the Y scale direction.',
        defaultValue: false
      },
      {
        configPath: 'xTitle',
        attrName: 'x-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Bottom X-axis title.',
        defaultValue: 'Month'
      },
      {
        configPath: 'yTitle',
        attrName: 'y-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Left Y-axis title.',
        defaultValue: 'Throughput (req/s)'
      }
    ]
  },
  {
    id: 'bar',
    title: 'Bar & Stack Chart',
    tagName: 'mc-bar-chart',
    summary:
      'Grouped and stacked vertical/horizontal bar chart where each bar is a dumb <mc-bar-item> presentation node with marker threshold restyling and item-level ARIA.',
    subComponents: [
      'mc-theme-layer',
      'mc-scale-layer',
      'mc-view-layer',
      'mc-animation-layer',
      'mc-marker-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-bar-item'
    ],
    defaultLayers: ['grid', 'axes', 'bars', 'markers', 'labels', 'legends'],
    supportsMarkers: true,
    supportsCartesianScales: true,
    supportsViewZoom: true,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_BAR_DATA,
      autoSize: true,
      title: 'Quarterly Spend ($K)',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      groupMode: 'grouped',
      layout: 'vertical',
      borderRadius: 5,
      enableLabels: true,
      outerLabels: {
        enabled: true,
        scope: 'auto',
        position: 'auto',
        negativePosition: 'outside-bottom',
        padding: 8
      },
      xTitle: 'Quarter',
      yTitle: 'Spend ($K)',
      themeMode,
      palette: 'modern',
      xScale: { type: 'band', padding: 0.25 },
      yScale: { type: 'linear' },
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      animate: true,
      motionConfig: 'default',
      markers: [
        {
          id: 'budget-floor-area',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 100,
          fill: '#ef4444',
          fillOpacity: 0.08
        },
        {
          id: 'budget-floor-line',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Floor $100K',
          icon: SVG_ICON_PRESETS.warn,
          stroke: '#ef4444',
          strokeWidth: 2,
          strokeDasharray: '5 4',
          condition: 'below',
          matchStyle: {
            color: '#ef4444',
            fill: '#ef4444',
            stroke: '#fda4af',
            strokeWidth: 1.5
          }
        }
      ],
      ariaLabel: 'Quarterly Infrastructure Spend Bar Chart',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'groupMode',
        attrName: 'group-mode',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'grouped', value: 'grouped' },
          { label: 'stacked', value: 'stacked' }
        ],
        description: 'Arranges multi-series bars side-by-side or stacked.',
        defaultValue: 'grouped'
      },
      {
        configPath: 'layout',
        attrName: 'layout',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'vertical', value: 'vertical' },
          { label: 'horizontal', value: 'horizontal' }
        ],
        description: 'Bar orientation layout.',
        defaultValue: 'vertical'
      },
      {
        configPath: 'borderRadius',
        attrName: 'border-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 16,
        step: 1,
        description: 'Corner radius (rx) of each <mc-bar-item> rectangle.',
        defaultValue: 5
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Renders Pretext-measured value labels centered inside each bar (coexists with Outer / Summary Labels).',
        defaultValue: true
      },
      {
        configPath: 'outerLabels.enabled',
        attrName: 'enable-outer-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Renders outer labels above positive bars/stacks (e.g. stacked totals) and below negative bars.',
        defaultValue: true
      },
      {
        configPath: 'outerLabels.scope',
        attrName: 'outer-label-scope',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'auto (stack totals when stacked, per-bar when grouped)', value: 'auto' },
          { label: 'stack (one summary label per category stack)', value: 'stack' },
          { label: 'bar (one outer label per individual bar)', value: 'bar' }
        ],
        description: 'Granularity of outer bar labels.',
        defaultValue: 'auto'
      },
      {
        configPath: 'outerLabels.position',
        attrName: 'outer-label-position',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'auto (top for positive, negativePosition for negative)', value: 'auto' },
          { label: 'top (above bar / right in horizontal)', value: 'top' },
          { label: 'bottom (below bar / left in horizontal)', value: 'bottom' }
        ],
        description: 'Placement for positive bar/stack outer labels.',
        defaultValue: 'auto'
      },
      {
        configPath: 'outerLabels.negativePosition',
        attrName: 'negative-label-position',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'outside-bottom (just below negative bar)', value: 'outside-bottom' },
          { label: 'chart-bottom (aligned along bottom of chart)', value: 'chart-bottom' },
          { label: 'above-zero (just above zero baseline)', value: 'above-zero' }
        ],
        description: 'Placement for negative bar/stack outer labels.',
        defaultValue: 'outside-bottom'
      },
      {
        configPath: 'outerLabels.padding',
        attrName: 'outer-label-padding',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 32,
        step: 1,
        description: 'Pixel padding away from the bar edge (or chart bottom).',
        defaultValue: 8
      },
      {
        configPath: 'xScale.padding',
        attrName: 'mc-scale-layer[x-padding]',
        category: 'Scale Layer (<mc-scale-layer>)',
        control: 'range',
        min: 0.05,
        max: 0.65,
        step: 0.05,
        description: 'D3 band scale inner/outer padding ratio.',
        defaultValue: 0.25
      },
      {
        configPath: 'xTitle',
        attrName: 'x-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'X-axis title.',
        defaultValue: 'Quarter'
      },
      {
        configPath: 'yTitle',
        attrName: 'y-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Y-axis title.',
        defaultValue: 'Spend ($K)'
      }
    ]
  },
  {
    id: 'pie',
    title: 'Pie & Donut Chart',
    tagName: 'mc-pie-chart',
    summary:
      'Radial pie and donut chart with hover slice expansion, radial polyline link labels, Pretext-fitted arc percentages, and center metric summary.',
    subComponents: [
      'mc-theme-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-arc-item'
    ],
    defaultLayers: ['arcs', 'arcLabels', 'arcLinkLabels', 'center', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_PIE_DATA,
      autoSize: true,
      title: 'Runtime Footprint',
      innerRadius: 0.54,
      padAngle: 1.5,
      cornerRadius: 6,
      centerLabel: '',
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Runtime Footprint Breakdown Donut Chart',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'innerRadius',
        attrName: 'inner-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 0.85,
        step: 0.05,
        description: 'Donut inner hole ratio (0 = solid pie, >0 = donut).',
        defaultValue: 0.54
      },
      {
        configPath: 'padAngle',
        attrName: 'pad-angle',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 8,
        step: 0.5,
        description: 'Angular padding between adjacent slices in degrees.',
        defaultValue: 1.5
      },
      {
        configPath: 'cornerRadius',
        attrName: 'corner-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 16,
        step: 1,
        description: 'Corner radius applied to each arc slice.',
        defaultValue: 6
      },
      {
        configPath: 'centerLabel',
        attrName: 'center-label',
        category: 'Chart-Specific',
        control: 'text',
        description:
          'Custom text shown in the donut center (leave empty for automatic Total).',
        defaultValue: ''
      }
    ]
  },
  {
    id: 'heatmap',
    title: 'Heatmap Matrix Chart',
    tagName: 'mc-heatmap-chart',
    summary:
      '2D matrix heatmap with D3 sequential color interpolators (Viridis, Plasma, Turbo, YlGnBu), rect/circle cells, and auto-contrasted Pretext cell labels.',
    subComponents: [
      'mc-theme-layer',
      'mc-scale-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-cell-item'
    ],
    defaultLayers: ['axes', 'cells', 'labels', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_HEATMAP_DATA,
      autoSize: true,
      title: 'CPU Load (%)',
      colorScheme: 'viridis',
      cellShape: 'rect',
      cellPadding: 0.1,
      borderRadius: 6,
      enableLabels: true,
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Cluster Compute Utilization Heatmap',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'colorScheme',
        attrName: 'color-scheme',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'viridis', value: 'viridis' },
          { label: 'plasma', value: 'plasma' },
          { label: 'inferno', value: 'inferno' },
          { label: 'magma', value: 'magma' },
          { label: 'turbo', value: 'turbo' },
          { label: 'ylGnBu', value: 'ylGnBu' },
          { label: 'rdYlBu', value: 'rdYlBu' },
          { label: 'cool', value: 'cool' },
          { label: 'warm', value: 'warm' }
        ],
        description: 'D3 sequential color interpolator scheme.',
        defaultValue: 'viridis'
      },
      {
        configPath: 'cellShape',
        attrName: 'cell-shape',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'rect', value: 'rect' },
          { label: 'circle', value: 'circle' }
        ],
        description: 'Renders matrix cells as rounded rectangles or circles.',
        defaultValue: 'rect'
      },
      {
        configPath: 'cellPadding',
        attrName: 'cell-padding',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 0.4,
        step: 0.02,
        description: 'Fractional padding between adjacent matrix cells.',
        defaultValue: 0.1
      },
      {
        configPath: 'borderRadius',
        attrName: 'border-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 16,
        step: 1,
        description: 'Corner radius for rectangular heatmap cells.',
        defaultValue: 6
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders numeric values inside each heatmap cell.',
        defaultValue: true
      }
    ]
  },
  {
    id: 'radar',
    title: 'Radar / Spider Chart',
    tagName: 'mc-radar-chart',
    summary:
      'Multi-series polar radar chart with circular or linear concentric grid levels, radial spokes, Pretext perimeter axis labels, and focusable vertex dots.',
    subComponents: [
      'mc-theme-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-radar-item'
    ],
    defaultLayers: ['grid', 'axes', 'layers', 'dots', 'labels', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_RADAR_DATA,
      autoSize: true,
      title: 'Benchmark Score',
      indexBy: 'metric',
      keys: ['ModernCharts', 'TraditionalChart'],
      gridShape: 'circular',
      gridLevels: 5,
      fillOpacity: 0.25,
      enableDots: true,
      enableDotLabels: true,
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Architecture Benchmark Radar Chart',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'gridShape',
        attrName: 'grid-shape',
        category: 'Chart-Specific',
        control: 'select',
        options: [
          { label: 'circular', value: 'circular' },
          { label: 'linear (polygon)', value: 'linear' }
        ],
        description: 'Concentric grid ring geometry.',
        defaultValue: 'circular'
      },
      {
        configPath: 'gridLevels',
        attrName: 'grid-levels',
        category: 'Chart-Specific',
        control: 'range',
        min: 2,
        max: 10,
        step: 1,
        description: 'Number of concentric radar grid rings.',
        defaultValue: 5
      },
      {
        configPath: 'fillOpacity',
        attrName: 'fill-opacity',
        category: 'Chart-Specific',
        control: 'range',
        min: 0.05,
        max: 0.8,
        step: 0.05,
        description: 'Polygon interior fill opacity.',
        defaultValue: 0.25
      },
      {
        configPath: 'enableDots',
        attrName: 'enable-dots',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders interactive ARIA dots at each radar vertex.',
        defaultValue: true
      },
      {
        configPath: 'enableDotLabels',
        attrName: 'enable-dot-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders score labels above each radar vertex dot.',
        defaultValue: true
      }
    ]
  },
  {
    id: 'sunburst',
    title: 'Sunburst Hierarchy Chart',
    tagName: 'mc-sunburst-chart',
    summary:
      'Multi-ring hierarchical partition chart (d3-hierarchy + d3-partition) with interactive click-to-drill-down, center back button, and Pretext arc labels.',
    subComponents: [
      'mc-theme-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-arc-item'
    ],
    defaultLayers: ['arcs', 'labels', 'center', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_SUNBURST_DATA,
      autoSize: true,
      title: 'Module Hierarchy',
      cornerRadius: 4,
      enableLabels: true,
      interactiveDrilldown: true,
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Modern Charts Module Hierarchy Sunburst',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'cornerRadius',
        attrName: 'corner-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 12,
        step: 1,
        description: 'Corner radius of each hierarchical partition arc.',
        defaultValue: 4
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Renders Pretext-clamped labels inside rings that have sufficient arc length.',
        defaultValue: true
      },
      {
        configPath: 'interactiveDrilldown',
        attrName: 'interactive-drilldown',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Allows clicking any parent arc to zoom into its subtree (and center circle to zoom back out).',
        defaultValue: true
      }
    ]
  },
  {
    id: 'sankey',
    title: 'Sankey Flow Diagram',
    tagName: 'mc-sankey-chart',
    summary:
      'Directed acyclic flow diagram with topological column ranking, gradient Bezier links, and Pretext node pills (uses flow layout instead of Cartesian scales).',
    subComponents: [
      'mc-theme-layer',
      'mc-view-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-sankey-node-item',
      'mc-sankey-link-item'
    ],
    defaultLayers: ['links', 'nodes', 'labels', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: true,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_SANKEY_DATA,
      autoSize: true,
      title: 'Pipeline Flow',
      nodeWidth: 18,
      nodePadding: 16,
      linkOpacity: 0.42,
      enableLabels: true,
      themeMode,
      palette: 'modern',
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Rendering Pipeline Sankey Diagram',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'nodeWidth',
        attrName: 'node-width',
        category: 'Chart-Specific',
        control: 'range',
        min: 8,
        max: 40,
        step: 2,
        description: 'Width of each Sankey node bar in pixels.',
        defaultValue: 18
      },
      {
        configPath: 'nodePadding',
        attrName: 'node-padding',
        category: 'Chart-Specific',
        control: 'range',
        min: 6,
        max: 36,
        step: 2,
        description: 'Vertical spacing between nodes in the same column.',
        defaultValue: 16
      },
      {
        configPath: 'linkOpacity',
        attrName: 'link-opacity',
        category: 'Chart-Specific',
        control: 'range',
        min: 0.1,
        max: 0.9,
        step: 0.05,
        description: 'Stroke opacity of cubic Bezier flow links.',
        defaultValue: 0.42
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders node name and total flow badges via <mc-label>.',
        defaultValue: true
      }
    ]
  },
  {
    id: 'scatter',
    title: 'Scatter & Bubble Chart',
    tagName: 'mc-scatter-chart',
    summary:
      'Continuous X/Y/Size scatter and bubble plot with least-squares linear regression trendline layer, marker thresholds, and zoomable viewport.',
    subComponents: [
      'mc-theme-layer',
      'mc-scale-layer',
      'mc-view-layer',
      'mc-animation-layer',
      'mc-marker-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-scatter-item'
    ],
    defaultLayers: [
      'grid',
      'markers',
      'axes',
      'trendline',
      'nodes',
      'labels',
      'legends'
    ],
    supportsMarkers: true,
    supportsCartesianScales: true,
    supportsViewZoom: true,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_SCATTER_DATA,
      autoSize: true,
      title: 'FPS vs Size',
      xTitle: 'Bundle Size (KB)',
      yTitle: 'FPS Score',
      minNodeSize: 7,
      maxNodeSize: 19,
      enableTrendline: true,
      enableLabels: true,
      themeMode,
      palette: 'modern',
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      animate: true,
      motionConfig: 'default',
      markers: [
        {
          id: 'fps-threshold',
          type: 'line',
          axis: 'y',
          value: 80,
          label: 'Min 80 FPS',
          stroke: '#ef4444',
          condition: 'below',
          matchStyle: {
            color: '#ef4444',
            fill: '#ef4444',
            stroke: '#fda4af'
          }
        }
      ],
      ariaLabel: 'Performance vs Bundle Size Scatter Plot',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'minNodeSize',
        attrName: 'min-node-size',
        category: 'Chart-Specific',
        control: 'range',
        min: 3,
        max: 14,
        step: 1,
        description: 'Minimum bubble radius in pixels.',
        defaultValue: 7
      },
      {
        configPath: 'maxNodeSize',
        attrName: 'max-node-size',
        category: 'Chart-Specific',
        control: 'range',
        min: 10,
        max: 32,
        step: 1,
        description: 'Maximum bubble radius in pixels.',
        defaultValue: 19
      },
      {
        configPath: 'enableTrendline',
        attrName: 'enable-trendline',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Computes and renders a linear regression trendline.',
        defaultValue: true
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description: 'Renders point labels above each scatter bubble.',
        defaultValue: true
      },
      {
        configPath: 'xTitle',
        attrName: 'x-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'X-axis title.',
        defaultValue: 'Bundle Size (KB)'
      },
      {
        configPath: 'yTitle',
        attrName: 'y-title',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Y-axis title.',
        defaultValue: 'FPS Score'
      }
    ]
  },
  {
    id: 'treemap',
    title: 'Treemap Hierarchy Chart',
    tagName: 'mc-treemap-chart',
    summary:
      'Squarified hierarchical treemap where @chenglou/pretext wraps and box-clamps every tile label to the exact rectangle dimensions without DOM reflow.',
    subComponents: [
      'mc-theme-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-cell-item'
    ],
    defaultLayers: ['tiles', 'labels', 'legends'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: SAMPLE_SUNBURST_DATA,
      autoSize: true,
      title: 'Package Footprint',
      tilePadding: 4,
      borderRadius: 6,
      enableLabels: true,
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Package Size Treemap',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'tilePadding',
        attrName: 'tile-padding',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 14,
        step: 1,
        description: 'Inner padding between adjacent treemap tiles in pixels.',
        defaultValue: 4
      },
      {
        configPath: 'borderRadius',
        attrName: 'border-radius',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 16,
        step: 1,
        description: 'Corner radius (rx) of each treemap tile rectangle.',
        defaultValue: 6
      },
      {
        configPath: 'enableLabels',
        attrName: 'enable-labels',
        category: 'Chart-Specific',
        control: 'boolean',
        description:
          'Renders Pretext box-fitted multiline labels inside each tile.',
        defaultValue: true
      }
    ]
  },
  {
    id: 'gauge',
    title: 'Radial Gauge Chart',
    tagName: 'mc-gauge-chart',
    summary:
      'ECharts-style radial gauge with threshold color bands, animated needle & progress arc, angular tick labels, and center metric <mc-label>.',
    subComponents: [
      'mc-theme-layer',
      'mc-animation-layer',
      'mc-aria-layer',
      'mc-label',
      'mc-arc-item'
    ],
    defaultLayers: ['track', 'bands', 'valueArc', 'ticks', 'needle', 'center'],
    supportsMarkers: false,
    supportsCartesianScales: false,
    supportsViewZoom: false,
    createDefaultConfig: (themeMode) => ({
      data: { ...SAMPLE_GAUGE_DATA },
      autoSize: true,
      title: 'Layout Efficiency',
      min: 0,
      max: 100,
      unit: '%',
      themeMode,
      palette: 'modern',
      animate: true,
      motionConfig: 'default',
      ariaLabel: 'Real-Time Text Layout Efficiency Gauge',
      isFocusable: true
    }),
    specificAttributes: [
      {
        configPath: 'data.value',
        attrName: 'data.value',
        category: 'Chart-Specific',
        control: 'range',
        min: 0,
        max: 100,
        step: 1,
        description: 'Current gauge value pointed to by the needle and arc.',
        defaultValue: 94
      },
      {
        configPath: 'min',
        attrName: 'min',
        category: 'Chart-Specific',
        control: 'number',
        min: -100,
        max: 90,
        step: 5,
        description: 'Minimum gauge scale domain bound.',
        defaultValue: 0
      },
      {
        configPath: 'max',
        attrName: 'max',
        category: 'Chart-Specific',
        control: 'number',
        min: 10,
        max: 1000,
        step: 10,
        description: 'Maximum gauge scale domain bound.',
        defaultValue: 100
      },
      {
        configPath: 'unit',
        attrName: 'unit',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Unit suffix appended to the center metric value.',
        defaultValue: '%'
      },
      {
        configPath: 'data.label',
        attrName: 'data.label',
        category: 'Chart-Specific',
        control: 'text',
        description: 'Subtitle caption displayed beneath the gauge value.',
        defaultValue: 'Zero-Reflow Layout Score'
      }
    ]
  }
];
