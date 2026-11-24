import { SAMPLE_SCATTER_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SCATTER_CHART_ENTRY: ChartCatalogEntry = {
  id: 'scatter',
  title: 'Scatter & Bubble Chart',
  tagName: 'mc-scatter-chart',
  summary:
    'Continuous X/Y/Size scatter and bubble plot with 9 symbol shapes, rotation, blendMode, deterministic jitter, nearest-point mesh hover, linear regression trendline, and zoomable viewport.',
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
    symbol: 'circle',
    symbolRotate: 0,
    blendMode: 'normal',
    jitter: 0,
    useMesh: false,
    clip: false,
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
      configPath: 'symbol',
      attrName: 'symbol',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Marker symbol shape (circle, rect, roundRect, triangle, diamond, pin, arrow, cross, star).',
      defaultValue: 'circle',
      options: [
        { label: 'Circle', value: 'circle' },
        { label: 'Diamond', value: 'diamond' },
        { label: 'Triangle', value: 'triangle' },
        { label: 'Rect / Square', value: 'rect' },
        { label: 'Rounded Rect', value: 'roundRect' },
        { label: 'Star (5-point)', value: 'star' },
        { label: 'Pin', value: 'pin' },
        { label: 'Arrow', value: 'arrow' },
        { label: 'Cross / Plus', value: 'cross' }
      ]
    },
    {
      configPath: 'symbolRotate',
      attrName: 'symbol-rotate',
      category: 'Chart-Specific',
      control: 'range',
      min: -180,
      max: 180,
      step: 15,
      description: 'Rotation angle of scatter symbols in degrees.',
      defaultValue: 0
    },
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
      configPath: 'blendMode',
      attrName: 'blend-mode',
      category: 'Chart-Specific',
      control: 'select',
      description: 'CSS mix-blend-mode applied to overlapping scatter bubbles.',
      defaultValue: 'normal',
      options: [
        { label: 'normal', value: 'normal' },
        { label: 'multiply', value: 'multiply' },
        { label: 'screen', value: 'screen' },
        { label: 'overlay', value: 'overlay' },
        { label: 'lighten', value: 'lighten' },
        { label: 'darken', value: 'darken' },
        { label: 'difference', value: 'difference' }
      ]
    },
    {
      configPath: 'jitter',
      attrName: 'jitter',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 24,
      step: 1,
      description: 'Deterministic 2D pixel jitter radius to separate overlapping points.',
      defaultValue: 0
    },
    {
      configPath: 'useMesh',
      attrName: 'use-mesh',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Enables nearest-point spatial mesh hover across the entire plot canvas.',
      defaultValue: false
    },
    {
      configPath: 'clip',
      attrName: 'clip',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Clips scatter nodes strictly to the inner plot box.',
      defaultValue: false
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
