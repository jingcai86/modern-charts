import type {
  BarDatum,
  GaugeDatum,
  HeatmapRow,
  HierarchyNode,
  LineSeries,
  PieDatum,
  RadarDatum,
  SankeyData,
  ScatterSeries
} from '../src/index';

export const SAMPLE_LINE_DATA: LineSeries[] = [
  {
    id: 'AI Inference Cluster',
    color: '#6366f1',
    data: [
      { x: 'Jan', y: 120 },
      { x: 'Feb', y: 148 },
      { x: 'Mar', y: 142 },
      { x: 'Apr', y: 189 },
      { x: 'May', y: 214 },
      { x: 'Jun', y: 248 },
      { x: 'Jul', y: 276 }
    ]
  },
  {
    id: 'Edge Web Components',
    color: '#06b6d4',
    data: [
      { x: 'Jan', y: 82 },
      { x: 'Feb', y: 96 },
      { x: 'Mar', y: 118 },
      { x: 'Apr', y: 135 },
      { x: 'May', y: 162 },
      { x: 'Jun', y: 184 },
      { x: 'Jul', y: 210 }
    ]
  },
  {
    id: 'Legacy Bundle',
    color: '#f59e0b',
    data: [
      { x: 'Jan', y: 150 },
      { x: 'Feb', y: 138 },
      { x: 'Mar', y: 125 },
      { x: 'Apr', y: 110 },
      { x: 'May', y: 94 },
      { x: 'Jun', y: 85 },
      { x: 'Jul', y: 72 }
    ]
  }
];

export const SAMPLE_BAR_DATA: BarDatum[] = [
  { quarter: 'Q1', Cloud: 142, Edge: 94, OnPrem: 58 },
  { quarter: 'Q2', Cloud: 168, Edge: 118, OnPrem: 52 },
  { quarter: 'Q3', Cloud: 196, Edge: 145, OnPrem: 49 },
  { quarter: 'Q4', Cloud: 234, Edge: 172, OnPrem: 44 }
];

export const SAMPLE_PIE_DATA: PieDatum[] = [
  { id: 'D3 Scales & Layout', value: 420 },
  { id: 'Pretext Text Engine', value: 310 },
  { id: 'Shadow DOM Layers', value: 245 },
  { id: 'AI Stream Controller', value: 185 },
  { id: 'View Zoom Roam', value: 140 }
];

export const SAMPLE_HEATMAP_DATA: HeatmapRow[] = [
  {
    id: 'Mon',
    data: [
      { x: '00:00', y: 18 },
      { x: '06:00', y: 42 },
      { x: '12:00', y: 88 },
      { x: '18:00', y: 74 }
    ]
  },
  {
    id: 'Tue',
    data: [
      { x: '00:00', y: 24 },
      { x: '06:00', y: 51 },
      { x: '12:00', y: 95 },
      { x: '18:00', y: 81 }
    ]
  },
  {
    id: 'Wed',
    data: [
      { x: '00:00', y: 29 },
      { x: '06:00', y: 58 },
      { x: '12:00', y: 99 },
      { x: '18:00', y: 86 }
    ]
  },
  {
    id: 'Thu',
    data: [
      { x: '00:00', y: 22 },
      { x: '06:00', y: 49 },
      { x: '12:00', y: 91 },
      { x: '18:00', y: 78 }
    ]
  },
  {
    id: 'Fri',
    data: [
      { x: '00:00', y: 15 },
      { x: '06:00', y: 38 },
      { x: '12:00', y: 79 },
      { x: '18:00', y: 63 }
    ]
  }
];

export const SAMPLE_RADAR_DATA: RadarDatum[] = [
  { metric: 'Zero Reflow Text', ModernCharts: 98, TraditionalChart: 52 },
  { metric: 'AI Layer Streaming', ModernCharts: 96, TraditionalChart: 38 },
  { metric: 'Custom SVG Layers', ModernCharts: 94, TraditionalChart: 84 },
  { metric: 'Bundle Lightness', ModernCharts: 95, TraditionalChart: 61 },
  { metric: 'Label Customization', ModernCharts: 99, TraditionalChart: 55 },
  { metric: 'Framework Agnostic', ModernCharts: 100, TraditionalChart: 45 }
];

export const SAMPLE_SUNBURST_DATA: HierarchyNode = {
  name: 'modern-charts',
  children: [
    {
      name: 'Core Engine',
      children: [
        { name: 'Pretext LabelEngine', value: 320 },
        { name: 'D3 ScaleManager', value: 240 },
        { name: 'Layer Pipeline', value: 210 }
      ]
    },
    {
      name: 'Chart Components',
      children: [
        {
          name: 'Cartesian',
          children: [
            { name: 'Line & Area', value: 190 },
            { name: 'Bar & Stack', value: 175 },
            { name: 'Scatter Bubble', value: 130 }
          ]
        },
        {
          name: 'Radial & Flow',
          children: [
            { name: 'Sunburst', value: 165 },
            { name: 'Sankey DAG', value: 180 },
            { name: 'Radar & Gauge', value: 145 }
          ]
        }
      ]
    },
    {
      name: 'Capability Layers',
      children: [
        { name: 'mc-view-layer', value: 150 },
        { name: 'mc-theme-layer', value: 120 },
        { name: 'mc-custom-layer', value: 160 }
      ]
    }
  ]
};

export const SAMPLE_SANKEY_DATA: SankeyData = {
  nodes: [
    { id: 'AI Prompt', name: 'AI Stream Prompt' },
    { id: 'DOM Stream', name: 'DOM Layer Stream' },
    { id: 'JS API', name: 'Client Layer API' },
    { id: 'Pretext', name: 'Pretext Text Layout' },
    { id: 'D3 Engine', name: 'D3 Scale & Path' },
    { id: 'SVG Output', name: 'SVG <text> Canvas' },
    { id: 'FO Output', name: 'SVG <foreignObject>' }
  ],
  links: [
    { source: 'AI Prompt', target: 'DOM Stream', value: 460 },
    { source: 'JS API', target: 'D3 Engine', value: 280 },
    { source: 'DOM Stream', target: 'Pretext', value: 250 },
    { source: 'DOM Stream', target: 'D3 Engine', value: 210 },
    { source: 'Pretext', target: 'SVG Output', value: 140 },
    { source: 'Pretext', target: 'FO Output', value: 210 },
    { source: 'D3 Engine', target: 'SVG Output', value: 290 },
    { source: 'D3 Engine', target: 'FO Output', value: 100 }
  ]
};

export const SAMPLE_SCATTER_DATA: ScatterSeries[] = [
  {
    id: 'Web Components',
    data: [
      { x: 12, y: 88, size: 22, label: 'mc-line' },
      { x: 24, y: 92, size: 28, label: 'mc-sunburst' },
      { x: 35, y: 95, size: 32, label: 'mc-sankey' },
      { x: 48, y: 97, size: 26, label: 'mc-label' }
    ]
  },
  {
    id: 'Framework Wrappers',
    data: [
      { x: 18, y: 64, size: 18, label: 'V1 Chart' },
      { x: 32, y: 71, size: 24, label: 'V2 Chart' },
      { x: 52, y: 78, size: 20, label: 'V3 Chart' }
    ]
  }
];

export const SAMPLE_GAUGE_DATA: GaugeDatum = {
  value: 94,
  min: 0,
  max: 100,
  unit: '%',
  label: 'Zero-Reflow Layout Score',
  bands: [
    { from: 0, to: 50, color: '#ef4444' },
    { from: 50, to: 80, color: '#f59e0b' },
    { from: 80, to: 100, color: '#10b981' }
  ]
};
