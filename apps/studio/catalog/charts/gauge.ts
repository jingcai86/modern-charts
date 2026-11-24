import { SAMPLE_GAUGE_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const GAUGE_CHART_ENTRY: ChartCatalogEntry = {
  id: 'gauge',
  title: 'Radial Gauge Chart',
  tagName: 'mc-gauge-chart',
  summary:
    'ECharts-style radial gauge with configurable start/end angles, major & minor graduation ticks, needle/triangle/pin pointers, rounded or flat progress arcs, and single or multi-ring series.',
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
    startAngle: -135,
    endAngle: 135,
    innerRadius: 0.76,
    cornerRadius: 8,
    splitNumber: 5,
    minorSplitNumber: 4,
    pointerType: 'needle',
    pointerLength: 0.88,
    pointerWidth: 2.5,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
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
      description: 'Current gauge value pointed to by the pointer and progress arc.',
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
      configPath: 'startAngle',
      attrName: 'start-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: -180,
      max: 0,
      step: 15,
      description: 'Start angle of the gauge arc in degrees (0° = 12 o’clock).',
      defaultValue: -135
    },
    {
      configPath: 'endAngle',
      attrName: 'end-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 180,
      step: 15,
      description: 'End angle of the gauge arc in degrees (0° = 12 o’clock).',
      defaultValue: 135
    },
    {
      configPath: 'innerRadius',
      attrName: 'inner-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.45,
      max: 0.9,
      step: 0.02,
      description: 'Inner radius ratio of the gauge track and progress arc.',
      defaultValue: 0.76
    },
    {
      configPath: 'cornerRadius',
      attrName: 'corner-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 20,
      step: 1,
      description: 'Corner radius of the track and progress value arc ends (0 = flat cap).',
      defaultValue: 8
    },
    {
      configPath: 'splitNumber',
      attrName: 'split-number',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 10,
      step: 1,
      description: 'Number of major graduation segments around the gauge arc.',
      defaultValue: 5
    },
    {
      configPath: 'minorSplitNumber',
      attrName: 'minor-split-number',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 10,
      step: 1,
      description: 'Minor graduation subdivisions inside each major split segment (0 = hidden).',
      defaultValue: 4
    },
    {
      configPath: 'pointerType',
      attrName: 'pointer-type',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Shape of the gauge pointer (or "none" for arc-only progress gauges).',
      defaultValue: 'needle',
      options: [
        { label: 'Needle (Line + Pivot)', value: 'needle' },
        { label: 'Triangle (Tapered)', value: 'triangle' },
        { label: 'Pin (Rim Marker)', value: 'pin' },
        { label: 'None (Progress Arc Only)', value: 'none' }
      ]
    },
    {
      configPath: 'pointerLength',
      attrName: 'pointer-length',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.4,
      max: 1.05,
      step: 0.04,
      description: 'Length of the gauge pointer as a ratio of innerRadius.',
      defaultValue: 0.88
    },
    {
      configPath: 'pointerWidth',
      attrName: 'pointer-width',
      category: 'Chart-Specific',
      control: 'range',
      min: 1,
      max: 8,
      step: 0.5,
      description: 'Thickness / base width of the gauge pointer in pixels.',
      defaultValue: 2.5
    },
    {
      configPath: 'enableLabels',
      attrName: 'enable-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders major tick labels and center metric labels.',
      defaultValue: true
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
