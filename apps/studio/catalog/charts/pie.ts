import { SAMPLE_PIE_DATA } from '../../sample-data';
import type { ChartCatalogEntry } from '../types';

export const PIE_CHART_ENTRY: ChartCatalogEntry = {
  id: 'pie',
  title: 'Pie & Donut Chart',
  tagName: 'mc-pie-chart',
  summary:
    'Radial pie, donut, half-donut, and Nightingale Rose chart with configurable start/end angles, slice sorting, hover pop-out offset, and customizable radial polyline link labels.',
  subComponents: [
    'mc-theme-layer',
    'mc-animation-layer',
    'mc-aria-layer',
    'mc-label',
    'mc-arc-item'
  ],
  defaultLayers: ['arcs', 'arcLabels', 'arcLinkLabels', 'center', 'legends'],
  supportsMarkers: false,
  supportsCartesianScales: false,
  supportsViewZoom: false,
  createDefaultConfig: (themeMode) => ({
    data: SAMPLE_PIE_DATA,
    autoSize: true,
    title: 'Runtime Footprint',
    innerRadius: 0.54,
    padAngle: 1.5,
    cornerRadius: 6,
    startAngle: 0,
    endAngle: 360,
    sort: 'none',
    roseType: 'none',
    activeOuterRadiusOffset: 7,
    minAngle: 0,
    enableArcLabels: true,
    enableArcLinkLabels: true,
    arcLinkLabelsSkipAngle: 8,
    arcLinkLabelsDiagonalLength: 14,
    arcLinkLabelsStraightLength: 16,
    centerLabel: '',
    themeMode,
    palette: 'shadcn',
    animate: true,
    motionConfig: 'default',
    ariaLabel: 'Runtime Footprint Breakdown Donut Chart',
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
      max: 0.85,
      step: 0.05,
      description: 'Donut inner hole ratio (0 = solid pie, >0 = donut).',
      defaultValue: 0.54
    },
    {
      configPath: 'padAngle',
      attrName: 'pad-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 8,
      step: 0.5,
      description: 'Angular padding between adjacent slices in degrees.',
      defaultValue: 1.5
    },
    {
      configPath: 'cornerRadius',
      attrName: 'corner-radius',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 16,
      step: 1,
      description: 'Corner radius applied to each arc slice.',
      defaultValue: 6
    },
    {
      configPath: 'startAngle',
      attrName: 'start-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: -180,
      max: 180,
      step: 15,
      description: 'Start angle of the pie sweep in degrees (0° = 12 o’clock).',
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
      description: 'End angle of the pie sweep in degrees.',
      defaultValue: 360
    },
    {
      configPath: 'sort',
      attrName: 'sort',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Slice sort order by value.',
      defaultValue: 'none',
      options: [
        { label: 'None (Preserve Data Order)', value: 'none' },
        { label: 'Descending by Value', value: 'desc' },
        { label: 'Ascending by Value', value: 'asc' }
      ]
    },
    {
      configPath: 'roseType',
      attrName: 'rose-type',
      category: 'Chart-Specific',
      control: 'select',
      description: 'Nightingale Rose mode scaling each slice outer radius by value.',
      defaultValue: 'none',
      options: [
        { label: 'None (Standard Pie / Donut)', value: 'none' },
        { label: 'Radius (Linear Outer Radius)', value: 'radius' },
        { label: 'Area (Area-Proportional Radius)', value: 'area' }
      ]
    },
    {
      configPath: 'activeOuterRadiusOffset',
      attrName: 'active-outer-radius-offset',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 20,
      step: 1,
      description: 'Radial pop-out offset in pixels when hovering a slice.',
      defaultValue: 7
    },
    {
      configPath: 'minAngle',
      attrName: 'min-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 25,
      step: 1,
      description: 'Minimum visible slice angle in degrees for small values.',
      defaultValue: 0
    },
    {
      configPath: 'enableArcLabels',
      attrName: 'enable-arc-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders percentage labels inside slices.',
      defaultValue: true
    },
    {
      configPath: 'enableArcLinkLabels',
      attrName: 'enable-arc-link-labels',
      category: 'Chart-Specific',
      control: 'boolean',
      description: 'Renders external radial polyline leader labels.',
      defaultValue: true
    },
    {
      configPath: 'arcLinkLabelsSkipAngle',
      attrName: 'arc-link-labels-skip-angle',
      category: 'Chart-Specific',
      control: 'range',
      min: 0,
      max: 45,
      step: 2,
      description: 'Skips external leader labels for slices narrower than this angle (degrees).',
      defaultValue: 8
    },
    {
      configPath: 'arcLinkLabelsDiagonalLength',
      attrName: 'arc-link-labels-diagonal-length',
      category: 'Chart-Specific',
      control: 'range',
      min: 4,
      max: 36,
      step: 2,
      description: 'Radial diagonal segment length of external leader lines in pixels.',
      defaultValue: 14
    },
    {
      configPath: 'arcLinkLabelsStraightLength',
      attrName: 'arc-link-labels-straight-length',
      category: 'Chart-Specific',
      control: 'range',
      min: 4,
      max: 40,
      step: 2,
      description: 'Horizontal straight segment length of external leader lines in pixels.',
      defaultValue: 16
    },
    {
      configPath: 'centerLabel',
      attrName: 'center-label',
      category: 'Chart-Specific',
      control: 'text',
      description:
        'Custom text shown in the donut center (leave empty for automatic Total).',
      defaultValue: ''
    }
  ]
};
