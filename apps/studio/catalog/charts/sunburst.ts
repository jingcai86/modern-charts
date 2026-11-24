import { SAMPLE_SUNBURST_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const SUNBURST_CHART_ENTRY: ChartCatalogEntry = {
  id: 'sunburst',
  title: 'Sunburst Hierarchy Chart',
  tagName: 'mc-sunburst-chart',
  summary:
    'Multi-ring hierarchical partition chart (d3-hierarchy + d3-partition) with configurable start/end angles, ancestor/descendant focus highlighting, radial/tangential labels, and interactive drilldown.',
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
    innerRadius: 0.22,
    padAngle: 0.5,
    cornerRadius: 4,
    startAngle: 0,
    endAngle: 360,
    sort: 'desc',
    inheritColorFromParent: true,
    focusMode: 'none',
    labelOrientation: 'horizontal',
    minArcAngleForLabel: 8,
    enableLabels: true,
    interactiveDrilldown: true,
    themeMode,
    palette: 'shadcn',
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Modern Charts Module Hierarchy Sunburst',
    isInteractive: true,
    isFocusable: true
  }),
  specificAttributes: [
    {
      configPath: 'innerRadius',
      attrName: 'inner-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 0.6,
      step: 0.02,
      description: 'Center hole inner radius ratio of the sunburst chart.',
      defaultValue: 0.22
    },
    {
      configPath: 'padAngle',
      attrName: 'pad-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 4,
      step: 0.25,
      description: 'Angular padding between adjacent sunburst arcs in degrees.',
      defaultValue: 0.5
    },
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
      configPath: 'startAngle',
      attrName: 'start-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: -180,
      max: 180,
      step: 15,
      description: 'Start angle of the sunburst sweep in degrees (0° = 12 o’clock).',
      defaultValue: 0
    },
    {
      configPath: 'endAngle',
      attrName: 'end-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 90,
      max: 360,
      step: 15,
      description: 'End angle of the sunburst sweep in degrees.',
      defaultValue: 360
    },
    {
      configPath: 'sort',
      attrName: 'sort',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Sibling arc ordering within each parent group.',
      defaultValue: 'desc',
      options: [
        { label: 'Descending by Value', value: 'desc' },
        { label: 'Ascending by Value', value: 'asc' },
        { label: 'None (Preserve Data Order)', value: 'none' }
      ]
    },
    {
      configPath: 'inheritColorFromParent',
      attrName: 'inherit-color-from-parent',
      category: 'Chart-Specific',
      control: 'boolean',
      description:
        'When true, child rings inherit and progressively brighten their top-level parent color.',
      defaultValue: true
    },
    {
      configPath: 'focusMode',
      attrName: 'focus-mode',
      category: 'Chart-Specific',
      control: 'select',
      description:
        'Hover/focus highlight scope (ancestor = root path, descendant = subtree).',
      defaultValue: 'none',
      options: [
        { label: 'None (Hovered Arc Only)', value: 'none' },
        { label: 'Ancestor (Path to Root)', value: 'ancestor' },
        { label: 'Descendant (Entire Subtree)', value: 'descendant' }
      ]
    },
    {
      configPath: 'labelOrientation',
      attrName: 'label-orientation',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Orientation of text labels rendered inside sunburst rings.',
      defaultValue: 'horizontal',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Radial (Ray from Center)', value: 'radial' },
        { label: 'Tangential (Along Ring)', value: 'tangential' }
      ]
    },
    {
      configPath: 'minArcAngleForLabel',
      attrName: 'min-arc-angle-for-label',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 45,
      step: 2,
      description: 'Minimum arc sweep angle in degrees required to display an arc label.',
      defaultValue: 8
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
