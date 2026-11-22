import { SAMPLE_BAR_DATA } from '../../sample-data';
import { SVG_ICON_PRESETS } from '../shared-attributes';
import type { ChartCatalogEntry } from '../types';

export const BAR_CHART_ENTRY: ChartCatalogEntry = {
  id: 'bar',
  title: 'Bar & Stack Chart',
  tagName: 'mc-bar-chart',
  summary:
    'Grouped and stacked vertical/horizontal bar chart where each bar is a dumb <mc-bar-item> presentation node with marker threshold restyling and item-level ARIA.',
  subComponents: [
    'mc-theme-layer',
    'mc-scale-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-marker-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-bar-item'
  ],
  defaultLayers: ['grid', 'axes', 'bars', 'markers', 'labels', 'legends'],
  supportsMarkers: true,
  supportsCartesianScales: true,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_BAR_DATA,
    autoSize: true,
    title: 'Quarterly Spend ($K)',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'OnPrem'],
    groupMode: 'grouped',
    layout: 'vertical',
    borderRadius: 5,
    enableLabels: true,
    outerLabels: {
      enabled: true,
      scope: 'auto',
      position: 'auto',
      negativePosition: 'outside-bottom',
      padding: 8
    },
    xTitle: 'Quarter',
    yTitle: 'Spend ($K)',
    themeMode,
    palette: 'modern',
    xScale: { type: 'band', padding: 0.25 },
    yScale: { type: 'linear' },
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    markers: [
      {
        id: 'budget-floor-area',
        type: 'area',
        axis: 'y',
        from: 0,
        to: 100,
        fill: '#ef4444',
        fillOpacity: 0.08
      },
      {
        id: 'budget-floor-line',
        type: 'line',
        axis: 'y',
        value: 100,
        label: 'Floor $100K',
        icon: SVG_ICON_PRESETS.warn,
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '5 4',
        condition: 'below',
        matchStyle: {
          color: '#ef4444',
          fill: '#ef4444',
          stroke: '#fda4af',
          strokeWidth: 1.5
        }
      }
    ],
    ariaLabel: 'Quarterly Infrastructure Spend Bar Chart',
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'groupMode',
      attrName: 'group-mode',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'grouped', value: 'grouped' },
        { label: 'stacked', value: 'stacked' }
      ],
      description: 'Arranges multi-series bars side-by-side or stacked.',
      defaultValue: 'grouped'
    },
    {
      configPath: 'layout',
      attrName: 'layout',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'vertical', value: 'vertical' },
        { label: 'horizontal', value: 'horizontal' }
      ],
      description: 'Bar orientation layout.',
      defaultValue: 'vertical'
    },
    {
      configPath: 'borderRadius',
      attrName: 'border-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 16,
      step: 1,
      description: 'Corner radius (rx) of each <mc-bar-item> rectangle.',
      defaultValue: 5
    },
    {
      configPath: 'enableLabels',
      attrName: 'enable-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Renders Pretext-measured value labels centered inside each bar (coexists with Outer / Summary Labels).',
      defaultValue: true
    },
    {
      configPath: 'outerLabels.enabled',
      attrName: 'enable-outer-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'Renders outer labels above positive bars/stacks (e.g. stacked totals) and below negative bars.',
      defaultValue: true
    },
    {
      configPath: 'outerLabels.scope',
      attrName: 'outer-label-scope',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'auto (stack totals when stacked, per-bar when grouped)', value: 'auto' },
        { label: 'stack (one summary label per category stack)', value: 'stack' },
        { label: 'bar (one outer label per individual bar)', value: 'bar' }
      ],
      description: 'Granularity of outer bar labels.',
      defaultValue: 'auto'
    },
    {
      configPath: 'outerLabels.position',
      attrName: 'outer-label-position',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'auto (top for positive, negativePosition for negative)', value: 'auto' },
        { label: 'top (above bar / right in horizontal)', value: 'top' },
        { label: 'bottom (below bar / left in horizontal)', value: 'bottom' }
      ],
      description: 'Placement for positive bar/stack outer labels.',
      defaultValue: 'auto'
    },
    {
      configPath: 'outerLabels.negativePosition',
      attrName: 'negative-label-position',
      category: 'Chart-Specific',
      control: 'select',
      options: [
        { label: 'outside-bottom (just below negative bar)', value: 'outside-bottom' },
        { label: 'chart-bottom (aligned along bottom of chart)', value: 'chart-bottom' },
        { label: 'above-zero (just above zero baseline)', value: 'above-zero' }
      ],
      description: 'Placement for negative bar/stack outer labels.',
      defaultValue: 'outside-bottom'
    },
    {
      configPath: 'outerLabels.padding',
      attrName: 'outer-label-padding',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 32,
      step: 1,
      description: 'Pixel padding away from the bar edge (or chart bottom).',
      defaultValue: 8
    },
    {
      configPath: 'xScale.padding',
      attrName: 'mc-scale-layer[x-padding]',
      category: 'Scale Layer (<mc-scale-layer>)',
      control: 'range',
      min: 0.05,
      max: 0.65,
      step: 0.05,
      description: 'D3 band scale inner/outer padding ratio.',
      defaultValue: 0.25
    },
    {
      configPath: 'xTitle',
      attrName: 'x-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'X-axis title.',
      defaultValue: 'Quarter'
    },
    {
      configPath: 'yTitle',
      attrName: 'y-title',
      category: 'Chart-Specific',
      control: 'text',
      description: 'Y-axis title.',
      defaultValue: 'Spend ($K)'
    }
  ]
};
