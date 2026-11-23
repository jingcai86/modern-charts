import { SAMPLE_HEATMAP_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const HEATMAP_CHART_ENTRY: ChartCatalogEntry = {
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
};
