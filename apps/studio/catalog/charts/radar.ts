import { SAMPLE_RADAR_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const RADAR_CHART_ENTRY: ChartCatalogEntry = {
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
    isInteractive: true,
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
};
