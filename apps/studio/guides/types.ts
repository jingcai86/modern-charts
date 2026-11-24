export type GuideId =
  | 'custom-layers'
  | 'themes'
  | 'd3'
  | 'custom-labels'
  | 'tooltips'
  | 'truncation'
  | 'events'
  | 'accessibility'
  | 'i18n'
  | 'dynamic-updates'
  | 'chart-state'
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
      'Choose among five built-in chart palettes, including mid gray Neutral, set light/dark appearance, or create custom colors, gradients, and declarative <mc-theme-layer> overrides.'
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
    title: 'Accessibility, ARIA & Static Charts',
    shortLabel: 'Accessibility',
    icon: '♿',
    summary:
      'W3C ARIA roles, screen-reader labels, Tab/Arrow keyboard navigation, polite live announcements, hidden data-table fallback, reduced-motion, and static charts via isInteractive vs. isFocusable.'
  },
  {
    id: 'i18n',
    title: 'Internationalization (i18n)',
    shortLabel: 'Internationalization',
    icon: '🌐',
    summary:
      'Format numbers, dates, percentages, and currency; set chart timezones; translate built-in and ARIA messages; and preview RTL labels and legends with live editable examples.'
  },
  {
    id: 'dynamic-updates',
    title: 'Dynamic Updates & Streaming',
    shortLabel: 'Dynamic Updates',
    icon: '🔄',
    summary:
      'Update data and config at runtime: live 1-second sliding-window streaming, randomize/add/remove mutations, batched setConfig(), resize behavior, and React/Vue snippets.'
  },
  {
    id: 'chart-state',
    title: 'Loading & Empty States (<mc-chart-state>)',
    shortLabel: 'Chart States',
    icon: '⏳',
    summary:
      'Shared minimal <mc-chart-state> overlay across all 10 charts with automatic empty detection, loading/empty slots, CSS ::part() hooks, and mc-state-change events.'
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
