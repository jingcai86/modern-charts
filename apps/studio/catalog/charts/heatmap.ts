import { SAMPLE_HEATMAP_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const HEATMAP_CHART_ENTRY: ChartCatalogEntry = {
  id: 'heatmap',
  title: 'Heatmap Matrix Chart',
  tagName: 'mc-heatmap-chart',
  summary:
    '2D matrix heatmap with D3 sequential color interpolators, independent x/y inner padding, value-driven sizeVariation, forceSquare 1:1 cells, emptyColor null handling, and Pretext cell labels.',
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
    sizeVariation: 0,
    forceSquare: false,
    emptyColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 6,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
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
    }
  ]
};
