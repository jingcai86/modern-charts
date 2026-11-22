import { SAMPLE_LINE_DATA } from '../../sample-data';
import { SVG_ICON_PRESETS } from '../shared-attributes';
import type { ChartCatalogEntry } from '../types';

export const LINE_CHART_ENTRY: ChartCatalogEntry = {
  id: 'line',
  title: 'Line & Area Chart',
  tagName: 'mc-line-chart',
  summary:
    'Multi-series Cartesian line & area chart with threshold gradient splitting, crosshair slice tooltips, pan/zoom view layer, and AI progressive layer streaming.',
  subComponents: [
    'mc-theme-layer',
    'mc-scale-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-marker-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-line-item',
    'mc-point-item'
  ],
  defaultLayers: [
    'grid',
    'markers',
    'axes',
    'areas',
    'lines',
    'points',
    'pointLabels',
    'slices',
    'legends'
  ],
  supportsMarkers: true,
  supportsCartesianScales: true,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_LINE_DATA,
    autoSize: true,
    title: 'Throughput (req/s)',
    xTitle: 'Month',
    yTitle: 'Throughput (req/s)',
    curve: 'monotoneX',
    enableArea: true,
    areaOpacity: 0.22,
    lineWidth: 2.5,
    pointSize: 9,
    enablePointLabels: true,
    enableSlices: true,
    themeMode,
    palette: 'modern',
    xScale: { type: 'point' },
    yScale: { type: 'linear', min: 0, max: 320, stacked: false },
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    markers: [
      {
        id: 'sla-danger-area',
        type: 'area',
        axis: 'y',
        from: 0,
        to: 135,
        fill: '#ef4444',
        fillOpacity: 0.09
      },
      {
        id: 'sla-min-line',
        type: 'line',
        axis: 'y',
        value: 135,
        label: 'SLA < 135',
        icon: SVG_ICON_PRESETS.warn,
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '6 4',
        condition: 'below',
        matchStyle: {
          color: '#ef4444',
          fill: '#ef4444',
          stroke: '#ef4444',
          radius: 6
        }
      }
    ],
    ariaLabel: 'Monthly AI Inference Throughput Line Chart',
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'curve',
      attrName: 'curve',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'monotoneX', value: 'monotoneX' },
        { label: 'catmullRom', value: 'catmullRom' },
        { label: 'natural', value: 'natural' },
        { label: 'linear', value: 'linear' },
        { label: 'step', value: 'step' },
        { label: 'stepAfter', value: 'stepAfter' },
        { label: 'stepBefore', value: 'stepBefore' }
      ],
      description: 'D3 curve interpolation factory for lines and areas.',
      defaultValue: 'monotoneX'
    },
    {
      configPath: 'enableArea',
      attrName: 'enable-area',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders gradient area fills beneath each line series.',
      defaultValue: true
    },
    {
      configPath: 'areaOpacity',
      attrName: 'area-opacity',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.05,
      max: 0.85,
      step: 0.05,
      description: 'Base opacity for the area fill gradient.',
      defaultValue: 0.22
    },
    {
      configPath: 'lineWidth',
      attrName: 'line-width',
      category: 'Chart-Specific',
      control: 'range',
      min: 1,
      max: 8,
      step: 0.5,
      description: 'Stroke width of each series path in pixels.',
      defaultValue: 2.5
    },
    {
      configPath: 'pointSize',
      attrName: 'point-size',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 20,
      step: 1,
      description: 'Diameter of each data point circle in pixels.',
      defaultValue: 9
    },
    {
      configPath: 'enablePointLabels',
      attrName: 'enable-point-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Renders value labels above data points using <mc-label> and @chenglou/pretext.',
      defaultValue: true
    },
    {
      configPath: 'enableSlices',
      attrName: 'enable-slices',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Enables vertical crosshair slice hover across all series.',
      defaultValue: true
    },
    {
      configPath: 'yScale.stacked',
      attrName: 'mc-scale-layer[y-stacked]',
      category: 'Scale Layer (<mc-scale-layer>)',
      control: 'boolean',
      description: 'Stacks Y values across all line series.',
      defaultValue: false
    },
    {
      configPath: 'yScale.reverse',
      attrName: 'mc-scale-layer[y-reverse]',
      category: 'Scale Layer (<mc-scale-layer>)',
      control: 'boolean',
      description: 'Reverses the Y scale direction.',
      defaultValue: false
    },
    {
      configPath: 'xTitle',
      attrName: 'x-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'Bottom X-axis title.',
      defaultValue: 'Month'
    },
    {
      configPath: 'yTitle',
      attrName: 'y-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'Left Y-axis title.',
      defaultValue: 'Throughput (req/s)'
    }
  ]
};
