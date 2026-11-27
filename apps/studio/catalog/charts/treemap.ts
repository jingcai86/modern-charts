import { SAMPLE_SUNBURST_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const TREEMAP_CHART_ENTRY: ChartCatalogEntry = {
  id: 'treemap',
  title: 'Treemap Hierarchy Chart',
  tagName: 'mc-treemap-chart',
  summary:
    'Hierarchical treemap supporting 6 D3 tiling algorithms, parent group headers, automatic vertical label orientation for narrow tiles, colorBy modes, and interactive subtree drilldown.',
  subComponents: [
    'mc-theme-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-cell-item'
  ],
  defaultLayers: ['tiles', 'labels', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_SUNBURST_DATA,
    autoSize: true,
    title: 'Package Footprint',
    tile: 'squarify',
    tilePadding: 4,
    borderRadius: 6,
    leavesOnly: false,
    parentLabelHeight: 22,
    orientLabel: true,
    colorBy: 'parent',
    nodeOpacity: 1,
    interactiveDrilldown: true,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Package Size Treemap',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'tile',
      attrName: 'tile',
      category: 'Chart-Specific',
      control: 'select',
      description: 'D3 treemap subdivision tiling algorithm.',
      defaultValue: 'squarify',
      options: [
        { label: 'Squarify (Golden Ratio)', value: 'squarify' },
        { label: 'Binary (Balanced Tree)', value: 'binary' },
        { label: 'Slice (Horizontal Strips)', value: 'slice' },
        { label: 'Dice (Vertical Strips)', value: 'dice' },
        { label: 'Slice & Dice (Alternating by Depth)', value: 'sliceDice' },
        { label: 'Resquarify (Stable Updates)', value: 'resquarify' }
      ]
    },
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
      configPath: 'leavesOnly',
      attrName: 'leaves-only',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'When true, hides parent group containers and header bands so only leaf tiles are rendered.',
      defaultValue: false
    },
    {
      configPath: 'parentLabelHeight',
      attrName: 'parent-label-height',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 36,
      step: 2,
      description: 'Height in pixels of the top header band on parent group containers.',
      defaultValue: 22
    },
    {
      configPath: 'orientLabel',
      attrName: 'orient-label',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Automatically rotates labels -90° vertically inside tall, narrow tiles.',
      defaultValue: true
    },
    {
      configPath: 'colorBy',
      attrName: 'color-by',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Dimension used to assign palette colors to treemap tiles.',
      defaultValue: 'parent',
      options: [
        { label: 'Parent Category', value: 'parent' },
        { label: 'Hierarchy Depth', value: 'depth' },
        { label: 'Individual Leaf Name', value: 'name' }
      ]
    },
    {
      configPath: 'nodeOpacity',
      attrName: 'node-opacity',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.2,
      max: 1,
      step: 0.05,
      description: 'Fill opacity of treemap leaf tile rectangles.',
      defaultValue: 1
    },
    {
      configPath: 'interactiveDrilldown',
      attrName: 'interactive-drilldown',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Allows clicking a category to zoom into its subtree with a top breadcrumb back bar.',
      defaultValue: true
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
};
