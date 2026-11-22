import { SAMPLE_PIE_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const PIE_CHART_ENTRY: ChartCatalogEntry = {
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
};
