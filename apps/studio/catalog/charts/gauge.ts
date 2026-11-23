import { SAMPLE_GAUGE_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const GAUGE_CHART_ENTRY: ChartCatalogEntry = {
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
    isInteractive: true,
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
};
