import { SAMPLE_SUNBURST_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const TREEMAP_CHART_ENTRY: ChartCatalogEntry = {
  id: 'treemap',
  title: 'Treemap Hierarchy Chart',
  tagName: 'mc-treemap-chart',
  summary:
    'Squarified hierarchical treemap where @chenglou/pretext wraps and box-clamps every tile label to the exact rectangle dimensions without DOM reflow.',
  subComponents: [
    'mc-theme-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-cell-item'
  ],
  defaultLayers: ['tiles', 'labels', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: false,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_SUNBURST_DATA,
    autoSize: true,
    title: 'Package Footprint',
    tilePadding: 4,
    borderRadius: 6,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Package Size Treemap',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
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
