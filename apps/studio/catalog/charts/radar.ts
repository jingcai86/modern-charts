import { SAMPLE_RADAR_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const RADAR_CHART_ENTRY: ChartCatalogEntry = {
  id: 'radar',
  title: 'Radar / Spider Chart',
  tagName: 'mc-radar-chart',
  summary:
    'Multi-series polar radar chart with circular or linear concentric grid levels, splitArea shading, rotation startAngle, Pretext perimeter axis labels, blend modes, and customizable vertex dots.',
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
    startAngle: 0,
    gridLabelOffset: 18,
    fillOpacity: 0.25,
    blendMode: 'normal',
    splitArea: false,
    enableDots: true,
    enableDotLabels: true,
    dotSize: 8.4,
    dotBorderWidth: 1.8,
    themeMode,
    palette: 'shadcn',
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
      configPath: 'maxValue',
      attrName: 'max-value',
      category: 'Chart-Specific',
      control: 'number',
      min: 10,
      max: 1000,
      step: 10,
      description: 'Maximum radial scale value (0 or empty = auto-detect from data).',
      defaultValue: 100
    },
    {
      configPath: 'startAngle',
      attrName: 'start-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: -180,
      max: 180,
      step: 15,
      description: 'Rotation offset of the first radar axis in degrees (0° = 12 o’clock).',
      defaultValue: 0
    },
    {
      configPath: 'gridLabelOffset',
      attrName: 'grid-label-offset',
      category: 'Chart-Specific',
      control: 'range',
      min: 6,
      max: 42,
      step: 2,
      description: 'Radial pixel distance between the outer grid ring and axis labels.',
      defaultValue: 18
    },
    {
      configPath: 'splitArea',
      attrName: 'split-area',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders alternating shaded concentric bands between radar grid rings.',
      defaultValue: false
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
      configPath: 'blendMode',
      attrName: 'blend-mode',
      category: 'Chart-Specific',
      control: 'select',
      description: 'CSS mix-blend-mode applied to overlapping radar series polygons.',
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Multiply', value: 'multiply' },
        { label: 'Screen', value: 'screen' },
        { label: 'Overlay', value: 'overlay' },
        { label: 'Darken', value: 'darken' },
        { label: 'Lighten', value: 'lighten' }
      ]
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
      configPath: 'dotSize',
      attrName: 'dot-size',
      category: 'Chart-Specific',
      control: 'range',
      min: 4,
      max: 18,
      step: 1,
      description: 'Diameter of radar vertex dots in pixels.',
      defaultValue: 8.4
    },
    {
      configPath: 'dotBorderWidth',
      attrName: 'dot-border-width',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 5,
      step: 0.5,
      description: 'Stroke border width of radar vertex dots in pixels.',
      defaultValue: 1.8
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
