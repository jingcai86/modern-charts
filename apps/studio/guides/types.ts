export type GuideId =
  | 'custom-layers'
  | 'themes'
  | 'd3'
  | 'custom-labels'
  | 'tooltips'
  | 'truncation'
  | 'events'
  | 'accessibility'
  | 'dynamic-updates';

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
      'One reusable <mc-tooltip> per chart with item vs. follow positioning, custom formatter/renderer callbacks, declarative <mc-tooltip>, ::part() styling, and lifecycle events.'
  },
  {
    id: 'truncation',
    title: 'Label Truncation & Overflow (<mc-truncate>)',
    shortLabel: 'Truncation',
    icon: '✂️',
    summary:
      'Zero-reflow @chenglou/pretext truncation, character caps, ellipsis, 45°/-45° text rotation, and automatic full-text tooltips across axes, legends, and standalone <mc-truncate>.'
  },
  {
    id: 'events',
    title: 'Events & Interactions',
    shortLabel: 'Events',
    icon: '⚡',
    summary:
      'Listen to composed chart events across items, axes, legends, markers, titles, zoom controls, and empty canvas with a live interactive event log.'
  },
  {
    id: 'accessibility',
    title: 'Accessibility & ARIA',
    shortLabel: 'Accessibility',
    icon: '♿',
    summary:
      'Default W3C ARIA roles, customizable screen-reader labels, Tab/Arrow keyboard navigation, polite live announcements, hidden data-table fallback, and reduced-motion support.'
  },
  {
    id: 'dynamic-updates',
    title: 'Dynamic Updates & Streaming',
    shortLabel: 'Dynamic Updates',
    icon: '🔄',
    summary:
      'Update data and config at runtime: live 1-second sliding-window streaming, randomize/add/remove mutations, batched setConfig(), resize behavior, and React/Vue snippets.'
  }
];
