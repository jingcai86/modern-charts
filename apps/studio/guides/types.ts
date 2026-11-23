export type GuideId =
  | 'custom-layers'
  | 'themes'
  | 'd3'
  | 'custom-labels'
  | 'tooltips'
  | 'patterns';

export interface GuideMeta {
  id: GuideId;
  title: string;
  shortLabel: string;
  icon: string;
  summary: string;
}

export const GUIDES_CATALOG: GuideMeta[] = [
  {
    id: 'custom-layers',
    title: 'Custom Layers',
    shortLabel: 'Custom Layers',
    icon: '🧩',
    summary:
      'Create and inject your own SVG layers into the Nivo-style layer pipeline — inline functions, named layers, and declarative <mc-custom-layer> elements.'
  },
  {
    id: 'themes',
    title: 'Themes & Palettes',
    shortLabel: 'Themes',
    icon: '🎨',
    summary:
      'Work with built-in dark/light/system themes, all 7 bundled palettes, or craft fully custom brand themes and declarative <mc-theme-layer> overrides.'
  },
  {
    id: 'd3',
    title: 'Working with D3',
    shortLabel: 'Working with D3',
    icon: '📐',
    summary:
      'Leverage ctx.d3, computed scales (ctx.xScale / ctx.yScale), SVG generators, statistical helpers, and tooltips directly inside modern-charts.'
  },
  {
    id: 'custom-labels',
    title: 'Custom Labels',
    shortLabel: 'Custom Labels',
    icon: '🏷️',
    summary:
      'Master <mc-label> and @chenglou/pretext zero-reflow typography: formatters, multi-line wrapping, <foreignObject> icons & pills, and custom labelRenderer.'
  },
  {
    id: 'tooltips',
    title: 'Unified Tooltips (<mc-tooltip>)',
    shortLabel: 'Tooltips',
    icon: '💬',
    summary:
      'One reusable <mc-tooltip> per chart with full structured data access, custom formatter/renderer callbacks, declarative <mc-tooltip> overrides, and CSS ::part() styling.'
  },
  {
    id: 'patterns',
    title: 'Patterns & Gradients (<mc-def>)',
    shortLabel: 'Patterns & Gradients',
    icon: '✨',
    summary:
      'Reusable chart-scoped SVG patterns (dots, lines, squares, crosshatch, custom) and gradients across all 10 charts with color-blind friendly presets and declarative <mc-def>.'
  }
];
