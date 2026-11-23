import { SAMPLE_SUNBURST_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SUNBURST_CHART_ENTRY: ChartCatalogEntry = {
  id: 'sunburst',
  title: 'Sunburst Hierarchy Chart',
  tagName: 'mc-sunburst-chart',
  summary:
    'Multi-ring hierarchical partition chart (d3-hierarchy + d3-partition) with interactive click-to-drill-down, center back button, and Pretext arc labels.',
  subComponents: [
    'mc-theme-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-arc-item'
  ],
  defaultLayers: ['arcs', 'labels', 'center', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: false,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_SUNBURST_DATA,
    autoSize: true,
    title: 'Module Hierarchy',
    cornerRadius: 4,
    enableLabels: true,
    interactiveDrilldown: true,
    themeMode,
    palette: 'modern',
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Modern Charts Module Hierarchy Sunburst',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'cornerRadius',
      attrName: 'corner-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 12,
      step: 1,
      description: 'Corner radius of each hierarchical partition arc.',
      defaultValue: 4
    },
    {
      configPath: 'enableLabels',
      attrName: 'enable-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Renders Pretext-clamped labels inside rings that have sufficient arc length.',
      defaultValue: true
    },
    {
      configPath: 'interactiveDrilldown',
      attrName: 'interactive-drilldown',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Allows clicking any parent arc to zoom into its subtree (and center circle to zoom back out).',
      defaultValue: true
    }
  ]
};
