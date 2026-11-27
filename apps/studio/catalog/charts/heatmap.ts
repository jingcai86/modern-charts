import { SAMPLE_HEATMAP_DATA } from '../../sample-data';
import { LEGEND_ATTRIBUTES } from '../shared-attributes';
import type { ChartAttributeSpec, ChartCatalogEntry } from '../types';

const discreteLegend: NonNullable<ChartAttributeSpec['visibleWhen']> = ({ legend }) =>
  typeof legend === 'object' && legend?.type === 'discrete';

function colorLegendSelect(
  key: string,
  attribute: string,
  choices: [value: string, label: string][],
  defaultValue: string,
  description: string
): Omit<ChartAttributeSpec, 'category'> {
  return {
    configPath: `legend.${key}`,
    attrName: `mc-legend[${attribute}]`,
    control: 'select',
    options: choices.map(([value, label]) => ({ label, value })),
    defaultValue,
    description
  };
}

const colorLegendAttributes = ([
  colorLegendSelect(
    'type', 'type',
    [['continuous', 'Continuous'], ['discrete', 'Discrete']],
    'continuous',
    'Choose a smooth gradient or quantize the cells and legend into matching color blocks.'
  ),
  {
    configPath: 'legend.enabled',
    attrName: 'mc-legend[enabled]',
    control: 'boolean',
    description: 'Show the color legend. Hiding it preserves the cell colors.',
    defaultValue: true
  },
  colorLegendSelect(
    'position', 'position',
    [['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']],
    'bottom',
    'Choose the side of the chart where the legend appears.'
  ),
  colorLegendSelect(
    'align', 'align',
    [['start', 'Start'], ['middle', 'Middle'], ['end', 'End']],
    'middle',
    'Align along the chosen side. Start is left for a horizontal legend and top for a vertical legend.'
  ),
  {
    configPath: 'legend.min',
    attrName: 'mc-legend[min]',
    control: 'number',
    description: 'Set the lower bound of the color scale. Leave it blank to use the smallest cell value.',
    defaultValue: undefined
  },
  {
    configPath: 'legend.max',
    attrName: 'mc-legend[max]',
    control: 'number',
    description: 'Set the upper bound of the color scale. Leave it blank to use the largest cell value.',
    defaultValue: undefined
  },
  {
    configPath: 'legend.steps',
    attrName: 'mc-legend[steps]',
    control: 'range',
    min: 1,
    max: 100,
    description: 'Number of equally sized value ranges for discrete coloring.',
    defaultValue: 10,
    visibleWhen: discreteLegend
  },
  {
    configPath: 'legend.width',
    attrName: 'mc-legend[width]',
    control: 'number',
    min: 1,
    description: 'Legend width in pixels. Leave it blank to size automatically for the position.',
    defaultValue: undefined
  },
  {
    configPath: 'legend.height',
    attrName: 'mc-legend[height]',
    control: 'number',
    min: 1,
    description: 'Legend height in pixels. Leave it blank to size automatically for the position.',
    defaultValue: undefined
  },
  {
    configPath: 'legend.borderRadius',
    attrName: 'mc-legend[border-radius]',
    control: 'range',
    min: 0,
    max: 20,
    description: 'Corner radius in pixels for the gradient or each color block.',
    defaultValue: 4
  },
  {
    configPath: 'legend.blockGap',
    attrName: 'mc-legend[block-gap]',
    control: 'range',
    min: 0,
    max: 16,
    description: 'Gap in pixels between adjacent discrete color blocks.',
    defaultValue: 2,
    visibleWhen: discreteLegend
  },
  colorLegendSelect(
    'labelPlacement', 'label-placement',
    [['ends', 'Endpoints'], ['ticks', 'Ticks (discrete)'], ['none', 'None']],
    'ends',
    'Label the endpoints, show discrete range ticks, or hide all labels.'
  ),
  {
    configPath: 'legend.minLabel',
    attrName: 'mc-legend[min-label]',
    control: 'text',
    description: 'Custom text at the low end of the color scale. Leave it blank to show the lower bound.',
    defaultValue: ''
  },
  {
    configPath: 'legend.maxLabel',
    attrName: 'mc-legend[max-label]',
    control: 'text',
    description: 'Custom text at the high end of the color scale. Leave it blank to show the upper bound.',
    defaultValue: ''
  },
  colorLegendSelect(
    'tickFormat.style', 'tick-format',
    [['', 'Chart default'], ['decimal', 'Decimal'], ['percent', 'Percent']],
    '',
    'Format the legend values using the chart locale. Percent displays 0.5 as 50%.'
  ),
  {
    configPath: 'legend.tickFormat.maximumFractionDigits',
    attrName: 'mc-legend[tick-format]',
    control: 'number',
    min: 0,
    max: 20,
    step: 1,
    description: 'Limit decimal places in legend values. Leave it blank to use automatic precision.',
    defaultValue: undefined
  },
  {
    configPath: 'legend.fontSize',
    attrName: 'mc-legend[font-size]',
    control: 'range',
    min: 8,
    max: 24,
    description: 'Legend label font size in pixels.',
    defaultValue: 10
  }
] satisfies Omit<ChartAttributeSpec, 'category'>[]).map((spec): ChartAttributeSpec => ({
  ...spec,
  category: 'Legend (<mc-legend>)'
}));

export const HEATMAP_CHART_ENTRY: ChartCatalogEntry = {
  id: 'heatmap',
  title: 'Heatmap Matrix Chart',
  tagName: 'mc-heatmap-chart',
  summary:
    'Matrix heatmap with continuous gradients or discrete color ranges, customizable cell geometry, and Pretext labels.',
  subComponents: [
    'mc-theme-layer',
    'mc-scale-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-legend',
    'mc-label',
    'mc-cell-item'
  ],
  defaultLayers: ['axes', 'cells', 'labels', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_HEATMAP_DATA,
    autoSize: true,
    title: 'CPU Load (%)',
    colorScheme: 'theme',
    legend: { type: 'continuous', position: 'bottom', align: 'middle' },
    cellShape: 'rect',
    cellPadding: 0.1,
    sizeVariation: 0,
    forceSquare: false,
    emptyColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 6,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Cluster Compute Utilization Heatmap',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'colorScheme',
      attrName: 'color-scheme',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'theme (active palette)', value: 'theme' },
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
      description: 'Sequential color ramp (follows active theme palette by default, or fixed D3 scheme).',
      defaultValue: 'theme'
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
      description: 'Default fractional padding between adjacent matrix cells.',
      defaultValue: 0.1
    },
    {
      configPath: 'xInnerPadding',
      attrName: 'x-inner-padding',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 0.5,
      step: 0.02,
      description: 'Horizontal column gap override between matrix cells.',
      defaultValue: 0.1
    },
    {
      configPath: 'yInnerPadding',
      attrName: 'y-inner-padding',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 0.5,
      step: 0.02,
      description: 'Vertical row gap override between matrix cells.',
      defaultValue: 0.1
    },
    {
      configPath: 'sizeVariation',
      attrName: 'size-variation',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 0.75,
      step: 0.05,
      description:
        'Scales cell dimensions proportionally to value in addition to color (0 = uniform size).',
      defaultValue: 0
    },
    {
      configPath: 'forceSquare',
      attrName: 'force-square',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Constrains every matrix cell to a 1:1 square aspect ratio.',
      defaultValue: false
    },
    {
      configPath: 'emptyColor',
      attrName: 'empty-color',
      category: 'Chart-Specific',
      control: 'text',
      description: 'Fill color used for missing or null matrix cells.',
      defaultValue: 'rgba(148, 163, 184, 0.16)'
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
    },
    ...colorLegendAttributes,
    ...LEGEND_ATTRIBUTES.filter(({ configPath }) =>
      configPath === 'legend.enableTooltip' || configPath.startsWith('legend.padding.')
    )
  ]
};
