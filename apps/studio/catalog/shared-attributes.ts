import type { ChartAttributeSpec } from './types';

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
    max: 120,
    step: 2,
    description: 'Bottom inner margin in pixels.',
    defaultValue: 76
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

  // Unified Tooltip (<mc-tooltip>)
  {
    configPath: 'tooltip.enabled',
    attrName: 'mc-tooltip[enabled]',
    category: 'Tooltip (<mc-tooltip>)',
    control: 'boolean',
    description:
      'Shows or hides the unified chart tooltip singleton (<mc-tooltip>).',
    defaultValue: true
  },
  {
    configPath: 'tooltip.position',
    attrName: 'tooltip-position / mc-tooltip[position]',
    category: 'Tooltip (<mc-tooltip>)',
    control: 'select',
    options: [
      { label: 'Auto (chart default)', value: '' },
      { label: 'item (anchored on top)', value: 'item' },
      { label: 'follow (follow mouse)', value: 'follow' }
    ],
    description:
      'Choose whether the tooltip anchors cleanly on top of each active item ("item") or tracks the mouse cursor ("follow"). Keyboard Tab/Arrow focus always anchors to the focused item.',
    defaultValue: ''
  },
  {
    configPath: 'tooltip.anchorGap',
    attrName: 'mc-tooltip[anchor-gap]',
    category: 'Tooltip (<mc-tooltip>)',
    control: 'range',
    min: 0,
    max: 32,
    step: 2,
    description:
      'Pixel gap between the active chart item and the tooltip in "item" anchor mode.',
    defaultValue: 10
  },
  {
    configPath: 'tooltip.offsetX',
    attrName: 'mc-tooltip[offset-x]',
    category: 'Tooltip (<mc-tooltip>)',
    control: 'range',
    min: 0,
    max: 40,
    step: 2,
    description:
      'Horizontal pixel offset from the cursor in "follow" mode.',
    defaultValue: 14
  },
  {
    configPath: 'tooltip.offsetY',
    attrName: 'mc-tooltip[offset-y]',
    category: 'Tooltip (<mc-tooltip>)',
    control: 'range',
    min: 0,
    max: 40,
    step: 2,
    description:
      'Vertical pixel offset from the cursor in "follow" mode.',
    defaultValue: 14
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
  {
    configPath: 'labelOverflow.strategy',
    attrName: 'label-overflow / mc-truncate[strategy]',
    category: 'Universal Label (<mc-label>)',
    control: 'select',
    options: [
      { label: 'truncate (default ellipsis)', value: 'truncate' },
      { label: 'rotate (tilt up to maxRotation)', value: 'rotate' },
      { label: 'both (rotate + truncate)', value: 'both' },
      { label: 'wrap (multi-line Pretext)', value: 'wrap' },
      { label: 'none (no overflow handling)', value: 'none' }
    ],
    description:
      'Overflow strategy applied via @chenglou/pretext whenever a label exceeds maxWidth or maxChars.',
    defaultValue: 'truncate'
  },
  {
    configPath: 'labelOverflow.maxWidth',
    attrName: 'mc-truncate[max-width]',
    category: 'Universal Label (<mc-label>)',
    control: 'range',
    min: 0,
    max: 180,
    step: 4,
    description:
      'Maximum pixel width for labels before overflow triggers (0 = auto per-slot width).',
    defaultValue: 0
  },
  {
    configPath: 'labelOverflow.maxChars',
    attrName: 'mc-truncate[max-chars]',
    category: 'Universal Label (<mc-label>)',
    control: 'range',
    min: 0,
    max: 32,
    step: 1,
    description:
      'Maximum grapheme character count before overflow triggers (0 = unlimited).',
    defaultValue: 0
  },
  {
    configPath: 'labelOverflow.maxRotation',
    attrName: 'mc-truncate[max-rotation]',
    category: 'Universal Label (<mc-label>)',
    control: 'range',
    min: -90,
    max: 90,
    step: 5,
    description:
      'Maximum rotation angle in degrees when strategy is "rotate" or "both" (default 45; supports negative angles like -45).',
    defaultValue: 45
  },
  {
    configPath: 'labelOverflow.enableTooltip',
    attrName: 'mc-truncate[enable-tooltip]',
    category: 'Universal Label (<mc-label>)',
    control: 'boolean',
    description:
      'Reveals full untruncated label text in a tooltip on hover and keyboard focus (enabled by default).',
    defaultValue: true
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
    configPath: 'isInteractive',
    attrName: 'is-interactive',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'boolean',
    description:
      'Master interactivity switch (default true). When false, renders a fully static chart: no <mc-tooltip>, no hover styles/cursors, no listeners/events, no tabindex (overrides isFocusable), keeping role="img" and aria-label on the SVG.',
    defaultValue: true
  },
  {
    configPath: 'isFocusable',
    attrName: 'is-focusable / mc-aria[is-focusable]',
    category: 'Accessibility (<mc-aria-layer>)',
    control: 'boolean',
    description:
      'Controls keyboard focus (tabindex="0" and Arrow key navigation) when isInteractive is true. Set isInteractive: true, isFocusable: false for mouse-only interactive charts.',
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
    defaultValue: 12
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
    configPath: '__markerMatchScope',
    attrName: 'mc-marker[match-scope]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'select',
    options: [
      { label: 'partial (split color/stroke at threshold boundary)', value: 'partial' },
      { label: 'item (restyle entire bar/line when matched)', value: 'item' }
    ],
    description:
      'Controls whether threshold restyling splits partially across the marker boundary or applies to the whole item.',
    defaultValue: 'partial'
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
      { label: 'top-right', value: 'top-right' },
      { label: 'top-left', value: 'top-left' },
      { label: 'top-center', value: 'top-center' },
      { label: 'bottom-right', value: 'bottom-right' },
      { label: 'bottom-left', value: 'bottom-left' },
      { label: 'bottom-center', value: 'bottom-center' }
    ],
    description:
      'Places the marker label relative to the marker line/area.',
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
      'Distance (px) away from the marker line/area edge for inside label placement.',
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
  },
  {
    configPath: '__markerLineLegend',
    attrName: 'mc-marker[type="line"][legend]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'boolean',
    description:
      'Shows the threshold line marker inside the unified chart legend with its own dashed line swatch and legend tooltip.',
    defaultValue: false
  },
  {
    configPath: '__markerBandLegend',
    attrName: 'mc-marker[type="area"][legend]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'boolean',
    description:
      'Shows the threshold band (area) marker inside the unified chart legend with its own shaded swatch and legend tooltip.',
    defaultValue: false
  },
  {
    configPath: '__markerAnnotationEnabled',
    attrName: 'mc-marker[annotation]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'boolean',
    description:
      'Displays an outside annotation callout (icon/text) where the mark line reaches the plot edge.',
    defaultValue: false
  },
  {
    configPath: '__markerAnnotationPosition',
    attrName: 'mc-marker[annotation-position]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'select',
    options: [
      { label: 'right', value: 'right' },
      { label: 'left', value: 'left' },
      { label: 'top', value: 'top' },
      { label: 'bottom', value: 'bottom' }
    ],
    description:
      'Plot edge where the outside marker annotation sits.',
    defaultValue: 'right'
  },
  {
    configPath: '__markerAnnotationPadding',
    attrName: 'mc-marker[annotation-padding]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'range',
    min: 0,
    max: 36,
    step: 2,
    description:
      'Gap (px) between the plot edge where the mark line reaches and the outside annotation.',
    defaultValue: 8
  },
  {
    configPath: '__markerAnnotationTooltip',
    attrName: 'mc-marker[annotation-enable-tooltip]',
    category: 'Marker & Threshold (<mc-marker-layer>)',
    control: 'boolean',
    description:
      'Enables interactive hover & focus tooltip on the outside marker annotation (default true).',
    defaultValue: true
  }
];
