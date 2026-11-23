import { SAMPLE_SANKEY_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SANKEY_CHART_ENTRY: ChartCatalogEntry = {
  id: 'sankey',
  title: 'Sankey Flow Diagram',
  tagName: 'mc-sankey-chart',
  summary:
    'Directed acyclic flow diagram with topological column ranking, gradient Bezier links, and Pretext node pills (uses flow layout instead of Cartesian scales).',
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
    nodeWidth: 18,
    nodePadding: 16,
    linkOpacity: 0.42,
    enableLabels: true,
    themeMode,
    palette: 'modern',
    view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Rendering Pipeline Sankey Diagram',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'nodeWidth',
      attrName: 'node-width',
      category: 'Chart-Specific',
      control: 'range',
      min: 8,
      max: 40,
      step: 2,
      description: 'Width of each Sankey node bar in pixels.',
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
      description: 'Vertical spacing between nodes in the same column.',
      defaultValue: 16
    },
    {
      configPath: 'linkOpacity',
      attrName: 'link-opacity',
      category: 'Chart-Specific',
      control: 'range',
      min: 0.1,
      max: 0.9,
      step: 0.05,
      description: 'Stroke opacity of cubic Bezier flow links.',
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
