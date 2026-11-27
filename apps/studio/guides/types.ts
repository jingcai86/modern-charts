export type GuideId =
  | 'custom-layers'
  | 'themes'
  | 'd3'
  | 'custom-labels'
  | 'tooltips'
  | 'truncation'
  | 'events'
  | 'accessibility'
  | 'auto-size'
  | 'ssr'
  | 'i18n'
  | 'dynamic-updates'
  | 'chart-state'
  | 'patterns'
  | 'view-zoom'
  | 'csv-export'
  | 'selection'
  | 'bootstrapping';

export interface GuideMeta {
  id: GuideId;
  title: string;
  featureDefault?: boolean;
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
      'Choose a built-in chart palette or Studio’s generated Neutral. Set light or dark appearance, or create custom colors, gradients, and declarative <mc-theme-layer> overrides.'
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
    featureDefault: true,
    shortLabel: 'Tooltips',
    icon: '💬',
    summary:
      'Lazy-loaded built-in <mc-tooltip> (enabled by default) with item vs. follow positioning, custom formatter/renderer callbacks, declarative <mc-tooltip>, ::part() styling, features.tooltip: false opt-out, and custom slot="tooltip" UI.'
  },
  {
    id: 'truncation',
    title: 'Label Truncation & Overflow (<mc-truncate>)',
    shortLabel: 'Truncation',
    icon: '✂️',
    summary:
      'Explore wrapping, character and line limits, ellipses, rotation, and full-text tooltips across axes, legends, and standalone <mc-truncate>.'
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
    id: 'auto-size',
    title: 'Responsive Sizing (autoSize)',
    shortLabel: 'AutoSize',
    icon: '↔',
    summary:
      'Resize a live chart and see how container dimensions, margins, and the plot area determine where each chart draws its data.'
  },
  {
    id: 'ssr',
    title: 'Server-Side Rendering (SSR)',
    shortLabel: 'Server-Side Rendering',
    icon: '🖥️',
    summary:
      'Render a chart host and data table on the server, then load the chart in the browser. Includes plain HTML and a Next.js lazy-loading example.'
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
    featureDefault: true,
    shortLabel: 'Chart States',
    icon: '⏳',
    summary:
      'Lazy-loaded loading and empty state overlay with an opt-out, custom slots and styles, and chart state events.'
  },
  {
    id: 'patterns',
    title: 'Patterns & Gradients (<mc-def>)',
    shortLabel: 'Patterns & Gradients',
    icon: '✨',
    summary:
      'Reusable chart-scoped SVG patterns (dots, lines, squares, crosshatch, custom) and gradients across all 10 charts with color-blind friendly presets and declarative <mc-def>.'
  },
  {
    id: 'view-zoom',
    title: 'Zoom Controls & Viewport Lock',
    featureDefault: false,
    shortLabel: 'Zoom Controls',
    icon: '🔍',
    summary:
      'Viewport zoom and pan across all 10 chart types, with customizable toolbar icons, extra actions, and programmatic zoom locking.'
  },
  {
    id: 'csv-export',
    title: 'Customizable CSV Data Export',
    featureDefault: false,
    shortLabel: 'CSV Export',
    icon: '📥',
    summary:
      'Export chart data to RFC 4180 CSV with built-in serialization across all 10 chart types, custom columns, headers, value formatting, filenames, custom serializers, and export handlers.'
  },
  {
    id: 'selection',
    title: 'Interactive Item Selection',
    featureDefault: false,
    shortLabel: 'Item Selection',
    icon: '🎯',
    summary:
      'Opt-in single-select and multi-select item selection across all 10 chart types with pointer and keyboard support, visual highlighting, and mc-selection-change events.'
  },
  {
    id: 'bootstrapping',
    title: 'Feature Bootstrapping & Lazy Loading',
    shortLabel: 'Bootstrapping',
    icon: '🚀',
    summary:
      'Choose which feature chunks to load at registration. Zoom, CSV export, and item selection are opt-in; the loading/empty overlay and built-in tooltips are enabled by default.'
  }
];

export const DEFAULT_OPEN_GUIDE_GROUP_COUNT = 4;
export const GUIDE_GROUPS_STORAGE_KEY = 'modern-charts-studio-guide-groups';

export function readStoredGuideGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GUIDE_GROUPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function isGuideGroupOpen(groupId: string, defaultOpen: boolean): boolean {
  const stored = readStoredGuideGroups();
  return typeof stored[groupId] === 'boolean' ? stored[groupId] : defaultOpen;
}

export function writeStoredGuideGroupOpen(groupId: string, open: boolean): void {
  try {
    const stored = readStoredGuideGroups();
    stored[groupId] = open;
    localStorage.setItem(GUIDE_GROUPS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

export function wireGuideGroupPersistence(
  group: HTMLDetailsElement,
  summary: HTMLElement,
  groupId: string,
  defaultOpen: boolean
): void {
  let lastOpen = isGuideGroupOpen(groupId, defaultOpen);
  group.dataset.guideGroupId = groupId;
  group.open = lastOpen;

  const syncOpenState = () => {
    if (group.open === lastOpen) return;
    lastOpen = group.open;
    writeStoredGuideGroupOpen(groupId, lastOpen);
  };

  group.addEventListener('toggle', syncOpenState);
  summary.addEventListener('click', () => {
    queueMicrotask(syncOpenState);
    setTimeout(syncOpenState, 0);
  });
}

const GUIDE_GROUP_ORDER = [
  ['integrations', 'Integrations & Extensions', ['ssr', 'd3', 'custom-layers']],
  ['colors-patterns-and-gradients', 'Colors, Patterns & Gradients', ['themes', 'patterns']],
  ['labels-and-layout', 'Labels & Layout', ['auto-size', 'custom-labels', 'truncation']],
  ['data-and-interaction', 'Data & Interaction', ['dynamic-updates', 'chart-state', 'tooltips', 'events']],
  ['optional-features', 'Optional Features', ['bootstrapping', 'view-zoom', 'csv-export', 'selection']],
  ['accessibility-and-localization', 'Accessibility & Localization', ['accessibility', 'i18n']]
] satisfies Array<[id: string, title: string, guides: GuideId[]]>;

export const GUIDE_GROUPS = GUIDE_GROUP_ORDER.map(([id, title, guideIds]) => ({
  id,
  title,
  guides: guideIds.map((guideId) => GUIDES_CATALOG.find((guide) => guide.id === guideId)!)
}));
