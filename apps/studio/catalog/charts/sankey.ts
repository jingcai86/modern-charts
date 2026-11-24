import { SAMPLE_SANKEY_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SANKEY_CHART_ENTRY: ChartCatalogEntry = {
  id: 'sankey',
  title: 'Sankey Flow Diagram',
  tagName: 'mc-sankey-chart',
  summary:
    'Directed acyclic flow diagram with horizontal or vertical topological stages, configurable node alignment, variable-curveness gradient Bezier links, and adjacency/trajectory hover focus.',
  subComponents: [
    'mc-theme-layer',
    'mc-view-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-sankey-node-item',
    'mc-sankey-link-item'
  ],
  defaultLayers: ['links', 'nodes', 'labels', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: true,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_SANKEY_DATA,
    autoSize: true,
    title: 'Pipeline Flow',
    layout: 'horizontal',
    align: 'justify',
    nodeWidth: 18,
    nodePadding: 16,
    nodeBorderRadius: 4,
    curveness: 0.5,
    focusMode: 'adjacency',
    linkOpacity: 0.42,
    enableLabels: true,
    themeMode,
    palette: 'shadcn',
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Rendering Pipeline Sankey Diagram',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'layout',
      attrName: 'layout',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Flow direction: horizontal (left → right) or vertical (top → bottom).',
      defaultValue: 'horizontal',
      options: [
        { label: 'Horizontal (Left → Right)', value: 'horizontal' },
        { label: 'Vertical (Top → Bottom)', value: 'vertical' }
      ]
    },
    {
      configPath: 'align',
      attrName: 'align',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Topological stage alignment for nodes without outgoing or incoming links.',
      defaultValue: 'justify',
      options: [
        { label: 'Justify (push sinks to end)', value: 'justify' },
        { label: 'Center', value: 'center' },
        { label: 'Start / Left', value: 'start' },
        { label: 'End / Right', value: 'end' }
      ]
    },
    {
      configPath: 'nodeWidth',
      attrName: 'node-width',
      category: 'Chart-Specific',
      control: 'range',
      min: 8,
      max: 40,
      step: 2,
      description: 'Thickness of each Sankey node bar in pixels.',
      defaultValue: 18
    },
    {
      configPath: 'nodePadding',
      attrName: 'node-padding',
      category: 'Chart-Specific',
      control: 'range',
      min: 6,
      max: 36,
      step: 2,
      description: 'Spacing (nodePadding / nodeGap) between sibling nodes in the same stage.',
      defaultValue: 16
    },
    {
      configPath: 'nodeBorderRadius',
      attrName: 'node-border-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 16,
      step: 1,
      description: 'Corner border radius (rx) of Sankey node rectangles.',
      defaultValue: 4
    },
    {
      configPath: 'curveness',
      attrName: 'curveness',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 1,
      step: 0.05,
      description: 'Cubic Bezier link curvature (0 = straight lines, 0.5 = classic S-curve, 1 = deep curve).',
      defaultValue: 0.5
    },
    {
      configPath: 'focusMode',
      attrName: 'focus-mode',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Hover/focus highlight scope (adjacency = 1-hop neighbors, trajectory = full upstream/downstream flow chain).',
      defaultValue: 'adjacency',
      options: [
        { label: 'Adjacency (1-hop neighbors)', value: 'adjacency' },
        { label: 'Trajectory (full flow chain)', value: 'trajectory' },
        { label: 'None (hovered item only)', value: 'none' }
      ]
    },
    {
      configPath: 'linkOpacity',
      attrName: 'link-opacity',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      description: 'Base stroke opacity of cubic Bezier flow links.',
      defaultValue: 0.42
    },
    {
      configPath: 'enableLabels',
      attrName: 'enable-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders node name and total flow badges via <mc-label>.',
      defaultValue: true
    }
  ]
};
