import { SAMPLE_SCATTER_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SCATTER_CHART_ENTRY: ChartCatalogEntry = {
  id: 'scatter',
  title: 'Scatter & Bubble Chart',
  tagName: 'mc-scatter-chart',
  summary:
    'Continuous X/Y/Size scatter and bubble plot with least-squares linear regression trendline layer, marker thresholds, and zoomable viewport.',
  subComponents: [
    'mc-theme-layer',
    'mc-scale-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-marker-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-scatter-item'
  ],
  defaultLayers: [
    'grid',
    'markers',
    'axes',
    'trendline',
    'nodes',
    'labels',
    'legends'
  ],
  supportsMarkers: true,
  supportsCartesianScales: true,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_SCATTER_DATA,
    autoSize: true,
    title: 'FPS vs Size',
    xTitle: 'Bundle Size (KB)',
    yTitle: 'FPS Score',
    minNodeSize: 7,
    maxNodeSize: 19,
    enableTrendline: true,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    markers: [
      {
        id: 'fps-threshold',
        type: 'line',
        axis: 'y',
        value: 80,
        label: 'Min 80 FPS',
        stroke: '#ef4444',
        condition: 'below',
        matchStyle: {
          color: '#ef4444',
          fill: '#ef4444',
          stroke: '#fda4af'
        }
      }
    ],
    ariaLabel: 'Performance vs Bundle Size Scatter Plot',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'minNodeSize',
      attrName: 'min-node-size',
      category: 'Chart-Specific',
      control: 'range',
      min: 3,
      max: 14,
      step: 1,
      description: 'Minimum bubble radius in pixels.',
      defaultValue: 7
    },
    {
      configPath: 'maxNodeSize',
      attrName: 'max-node-size',
      category: 'Chart-Specific',
      control: 'range',
      min: 10,
      max: 32,
      step: 1,
      description: 'Maximum bubble radius in pixels.',
      defaultValue: 19
    },
    {
      configPath: 'enableTrendline',
      attrName: 'enable-trendline',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Computes and renders a linear regression trendline.',
      defaultValue: true
    },
    {
      configPath: 'enableLabels',
      attrName: 'enable-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders point labels above each scatter bubble.',
      defaultValue: true
    },
    {
      configPath: 'xTitle',
      attrName: 'x-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'X-axis title.',
      defaultValue: 'Bundle Size (KB)'
    },
    {
      configPath: 'yTitle',
      attrName: 'y-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'Y-axis title.',
      defaultValue: 'FPS Score'
    }
  ]
};
