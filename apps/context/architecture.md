# `modern-charts` Core Architecture & Shared Config Reference

Every chart component (`<mc-bar-chart>`, `<mc-line-chart>`, etc.) extends `MCBaseChart` and shares the exact same unified configuration model, sub-component architecture, label engine, marker/threshold engine, ARIA accessibility system, and composable layer pipeline.

---

## 1. Installation & Imports

```bash
npm install modern-charts
```

Runtime dependencies are strictly `d3` and `@chenglou/pretext`.

```js
// Recommended: standalone per-chart subpath import (registers ONLY that chart + shared core)
import 'modern-charts/bar';
import 'modern-charts/line';
import 'modern-charts/pie';
import 'modern-charts/heatmap';
import 'modern-charts/radar';
import 'modern-charts/sunburst';
import 'modern-charts/sankey';
import 'modern-charts/scatter';
import 'modern-charts/treemap';
import 'modern-charts/gauge';
import 'modern-charts/core'; // BaseChart, engines, and shared capability layers only

// Full library import (registers all 10 charts and supplies the complete `d3` namespace on `ctx.d3`)
import 'modern-charts';
```

---

## 2. Shared `chart.config` Options (All 10 Charts)

Every chart accepts a single Nivo-style `chart.config = { ... }` object:

```ts
interface SharedChartConfig<TData> {
  data: TData;
  width?: number;
  height?: number;
  autoSize?: boolean; // default true (ResizeObserver); set false to use snapshot size + .resize()
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  title?: string;

  // Composable Layer Pipeline (built-in names or custom functions/objects)
  layers?: Array<
    | string
    | ((ctx: ChartRenderContext<TData>) => SVGElement | string | void)
    | { name: string; render: (ctx: ChartRenderContext<TData>) => SVGElement | string | void }
  >;

  // Theme (<mc-theme-layer>)
  themeMode?: 'light' | 'dark' | 'system'; // default 'light'
  palette?: 'shadcn' | 'material' | 'bootstrap' | 'antd' | string; // 20-color design-system palette or seed color string (auto-generates >=20 light-to-dark colors)
  colors?: string[];
  theme?: Partial<ChartTheme>;

  // Scales (<mc-scale-layer>) — applicable to Cartesian charts (bar, line, scatter, heatmap)
  xScale?: {
    type?: 'linear' | 'point' | 'band' | 'time' | 'log' | 'symlog' | 'sqrt';
    min?: number | 'auto';
    max?: number | 'auto';
    reverse?: boolean;
    nice?: boolean;
    clamp?: boolean;
    padding?: number;
    innerPadding?: number;
    outerPadding?: number;
    base?: number;
    constant?: number;
  };
  yScale?: {
    type?: 'linear' | 'point' | 'band' | 'time' | 'log' | 'symlog' | 'sqrt';
    min?: number | 'auto';
    max?: number | 'auto';
    stacked?: boolean;
    reverse?: boolean;
    nice?: boolean;
    clamp?: boolean;
    base?: number;
    constant?: number;
  };

  // Pan & Zoom (<mc-view-layer>)
  view?: {
    enabled?: boolean;
    zoomable?: boolean;
    pannable?: boolean;
    minZoom?: number;
    maxZoom?: number;
    direction?: 'xy' | 'x' | 'y';
    showControls?: boolean;
    initialZoom?: number;
    initialPanX?: number;
    initialPanY?: number;
  };

  // Motion & Animation (<mc-animation-layer>)
  animate?: boolean; // default true (automatically respects prefers-reduced-motion)
  motionConfig?:
    | 'default'
    | 'gentle'
    | 'wobbly'
    | 'stiff'
    | 'slow'
    | 'molasses'
    | 'elastic'
    | 'bounce'
    | Partial<AnimationConfig>;
  animation?: {
    enabled?: boolean;
    duration?: number;
    easing?: 'cubic-out' | 'linear' | 'elastic-out' | 'back-out' | 'bounce-out' | 'quad-out';
    stagger?: number;
    streamDelay?: number;
  };

  // Markers & Thresholds (<mc-marker-layer> / <mc-marker>) — bar, line, scatter
  markers?: MarkerConfig[];

  // Universal Labels & Truncation (<mc-label> & <mc-truncate>, powered by @chenglou/pretext)
  enableLabels?: boolean;
  labelMode?: 'svg' | 'foreignObject' | 'custom';
  label?: Partial<LabelStyleOverride> | Partial<LabelStyleOverride>[];
  labelRenderer?: CustomLabelRenderer;
  labelOverflow?: 'truncate' | 'rotate' | 'both' | 'wrap' | 'none' | {
    strategy?: 'truncate' | 'rotate' | 'both' | 'wrap' | 'none'; // default 'truncate'
    maxWidth?: number;    // Pretext pixel width threshold
    maxChars?: number;    // grapheme character count threshold
    maxLines?: number;    // max lines for multi-line / 'wrap'
    ellipsis?: string;    // default '…'
    maxRotation?: number; // default 45 (supports negative e.g. -45) for 'rotate' | 'both'
    enableTooltip?: boolean; // default true on truncated labels; set false to disable
    tooltip?: boolean | TooltipConfig<LabelDescriptor>; // customizable full-text tooltip
  };

  // Unified Tooltip (<mc-tooltip> — one reusable instance per chart)
  tooltip?: boolean | {
    enabled?: boolean;
    position?: 'item' | 'follow'; // default 'item' (bar/scatter/radar/gauge) or 'follow' (line/pie/sunburst/heatmap/treemap/sankey)
    anchorGap?: number; // default 10 (px gap above/below item in 'item' mode)
    offsetX?: number;
    offsetY?: number;
    className?: string;
    formatter?: (payload: TooltipPayload) => string | null | undefined;
    renderer?: (payload: TooltipPayload, defaultRender: () => HTMLElement) => HTMLElement | DocumentFragment | string | null | undefined;
  };
  tooltipPosition?: 'item' | 'follow'; // shorthand also reflected via tooltip-position HTML attribute

  // Unified SVG Legend (<mc-legend> — shared by bar, line, pie, radar, scatter, sunburst, treemap, sankey)
  legend?: boolean | {
    enabled?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right'; // default 'bottom'
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    wrap?: boolean; // default true (Pretext-measured exact centering + row/column wrapping)
    enableTooltip?: boolean; // default true (hover + keyboard Tab focus dedicated legend tooltip)
    tooltip?: boolean | TooltipConfig<LegendItem>; // same customization shape as chart.config.tooltip
    itemGap?: number;
    rowGap?: number;
    swatchSize?: number;
    maxItemWidth?: number;
    fontSize?: number;
  };

  // Unified Event System (global + target-scoped callbacks for item, axis, legend, marker, title, label, canvas)
  events?: ChartEventsConfig;
  onClick?: ChartEventHandler;
  onFocus?: ChartEventHandler;
  onMouseOver?: ChartEventHandler;
  onMouseEnter?: ChartEventHandler;
  onMouseLeave?: ChartEventHandler;

  // W3C ARIA Accessibility (<mc-aria-layer> / <mc-aria>)
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  isInteractive?: boolean; // default true; false renders a fully static chart (no tooltips, listeners, hover, or tabindex; overrides isFocusable)
  isFocusable?: boolean;   // default true; controls keyboard focus only when isInteractive is true (mouse-only: isInteractive: true, isFocusable: false)
  barAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  pointAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  arcAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  cellAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  nodeAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  linkAriaLabel?: string | ((item: AriaItemDescriptor) => string);
  aria?: Partial<AriaConfig>;
}
```

### Shared HTML Attributes (All `<mc-*-chart>` Elements)

`width`, `height`, `auto-size`, `margin`, `theme-mode`, `palette`, `chart-title`, `layers`, `label-mode`, `label-overflow`, `tooltip-position`, `animate`, `motion-config`, `aria-label`, `is-interactive`, `is-focusable`.

---

## 3. Markers & Threshold Styling (`markers` / `<mc-marker>`)

Supported on Cartesian charts (`<mc-bar-chart>`, `<mc-line-chart>`, `<mc-scatter-chart>`). Marker lines, areas, and inside labels have `pointer-events: none` so tooltips on underlying data items are never blocked, while outside `annotation` callouts have `pointer-events: auto` with interactive hover/focus tooltips enabled by default.

```ts
interface MarkerConfig {
  id?: string;
  type?: 'line' | 'area'; // default 'line'
  axis?: 'x' | 'y';       // default 'y'
  value?: number | string; // for type: 'line'
  from?: number | string;  // for type: 'area'
  to?: number | string;    // for type: 'area'
  label?: string;
  labelPosition?:
    | 'start' | 'middle' | 'end'
    | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';
  labelPadding?: number;     // px away from marker line/area edge for inside labels (default 10)
  labelEdgePadding?: number; // px inset from plot edge for inside labels (default 10)
  labelOffsetX?: number;
  labelOffsetY?: number;
  // Optional per-marker inside label styling (boxless text by default)
  labelStyle?: Partial<Omit<LabelStyleOverride, 'target'>>;
  icon?: string;
  // Outside callout (icon and/or text, boxless by default) placed where the mark line/area reaches the plot boundary
  annotation?: string | {
    text?: string;
    icon?: string | SVGElement | HTMLElement;
    position?: 'left' | 'right' | 'top' | 'bottom'; // defaults to 'right' for axis:'y', 'top' for axis:'x'
    padding?: number;       // px gap outside plot edge (default 8)
    offsetX?: number;
    offsetY?: number;
    color?: string;
    background?: string;
    borderColor?: string;
    borderRadius?: number;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: string;
    labelPadding?: LabelPadding;
    formatter?: LabelStyleOverride['formatter'];
    renderer?: CustomLabelRenderer;
    enableTooltip?: boolean; // default true (hover + keyboard Tab focus)
    tooltip?: boolean | string | TooltipConfig<ResolvedMarker>;
  };
  // Include this line or area marker in the unified <mc-legend> (with hover/focus legend tooltip)
  legend?: boolean | {
    enabled?: boolean;
    label?: string;
    color?: string;
    swatch?: 'auto' | 'line' | 'area' | 'square';
    tooltip?: string;
  };
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
  fillOpacity?: number;
  condition?: 'below' | 'under' | 'lte' | 'above' | 'over' | 'gte' | 'between' | 'outside' | ((value: number, datum?: any) => boolean);
  matchScope?: 'partial' | 'item'; // default 'partial' (clips fill/stroke/dasharray at exact threshold boundary using single ARIA host + aria-hidden segments)
  matchStyle?: {
    color?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    radius?: number;
    icon?: string;
    labelColor?: string;
  };
}
```

Note: When any marker defines an outside `annotation` (`left`, `right`, `top`, or `bottom`), `MCBaseChart` automatically expands the corresponding chart margin so the annotation never clips.

---

## 4. Universal Labels & Truncation (`<mc-label>`, `<mc-truncate>` & `LabelEngine`)

Every text label in every chart (ticks, titles, bar/point/arc/cell values, markers, legends, center labels) renders via `@chenglou/pretext` with zero DOM reflow.

When a label exceeds `maxWidth` or `maxChars`, overflow defaults to `'truncate'` (ellipsis with an automatic hover/keyboard tooltip revealing the full text, customizable via `tooltip` and disableable via `enableTooltip: false`). Clients can also select `'rotate'` (45° default max rotation, customizable including negative angles like `-45`), `'both'` (rotate + truncate), `'wrap'` (multi-line Pretext wrapping), or `'none'`.

Target types (`for` attribute on `<mc-label>` / `<mc-truncate>` or `target` in `config.label`):
`'all' | 'axis-tick' | 'axis-title' | 'data' | 'bar-outer' | 'arc' | 'arc-link' | 'cell' | 'radar-axis' | 'radar-point' | 'node' | 'link' | 'legend' | 'title' | 'center' | 'marker' | 'custom'`.

```html
<mc-bar-chart>
  <mc-label for="data" mode="foreignObject" bg-color="#0f172a" color="#f8fafc" border-radius="6" padding="4" icon="✨"></mc-label>
  <mc-truncate for="axis-tick" max-width="72" max-chars="14" strategy="both" max-rotation="-45"></mc-truncate>
</mc-bar-chart>

<!-- Reusable standalone component -->
<mc-truncate text="Quarterly Cloud Infrastructure Analysis" max-width="120" max-chars="20"></mc-truncate>
```

---

## 5. Custom Layers (`layers` & `<mc-custom-layer>`)

Insert custom SVG or D3 visuals at any z-index in `config.layers`:

```js
chart.config = {
  ...baseConfig,
  layers: [
    'grid',
    'axes',
    'bars',
    {
      name: 'avg-callout',
      render: (ctx) => {
        // Available on ctx: innerWidth, innerHeight, xScale, yScale, colorScale,
        // theme, data, markers, thresholds, layerGroup, svg, d3, renderLabel,
        // measureText, animateItem, decorateAriaItem, showTooltip, hideTooltip, state
        const y = ctx.yScale(150);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('x2', String(ctx.innerWidth));
        line.setAttribute('y1', String(y));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', '#f59e0b');
        line.setAttribute('stroke-dasharray', '6 4');
        ctx.layerGroup.appendChild(line);
      }
    },
    'labels',
    'legends'
  ]
};
```

---

## 6. AI Progressive Layer Streaming

For LLM interfaces that generate visualizations progressively:

```js
// Programmatic layer-by-layer reveal using animation.streamDelay (default 200ms)
await chart.streamLayers();

// Or stream specific layers one at a time via declarative children:
const layer = document.createElement('mc-chart-layer');
layer.setAttribute('name', 'bars');
chart.appendChild(layer);
```

---

## 7. Unified Tooltip (`<mc-tooltip>`) & CSS `::part()` Styling

Every chart owns strictly **one** `<mc-tooltip>` instance inside its Shadow DOM (reused in-place on pointer hover/move) and passes a structured `TooltipPayload` (`chartType`, `title`, `label`, `seriesId`, `category`, `value`, `formattedValue`, `color`, `percentage`, `badge`, `items[]`, `threshold`, `datum`, `data`).

- **Positioning modes (`item` vs `follow`)**: Configure via `chart.config.tooltip.position`, `chart.config.tooltipPosition`, HTML attribute `tooltip-position="item|follow"`, or `<mc-tooltip position="item|follow" anchor-gap="10">`. Per-chart defaults anchor on top of discrete items (`bar`, `scatter`, `radar`, `gauge`) and follow the cursor on continuous/radial/matrix/flow charts (`line`, `pie`, `sunburst`, `heatmap`, `treemap`, `sankey`), with automatic viewport/container edge flipping & clamping. Keyboard `Tab`/`Arrow` focus always anchors cleanly to the active item and dismisses on `Escape`/`blur`.
- **Customize via `chart.config.tooltip`**: `{ enabled, position, anchorGap, offsetX, offsetY, formatter, renderer }`.
- **Customize declaratively**: `<mc-tooltip position="item" offset-x="16"><template>{{title}}: {{value}}</template></mc-tooltip>`.
- **Style via CSS `::part()`**: `::part(tooltip)`, `::part(tooltip-header)`, `::part(tooltip-body)`, `::part(tooltip-row)`, `::part(tooltip-swatch)`, `::part(tooltip-label)`, `::part(tooltip-value)`, `::part(tooltip-badge)`.

---

## 8. Unified SVG Legend (`<mc-legend>`) & Dedicated Legend Tooltip

Shared across all 8 categorical-legend charts (`bar`, `line`, `pie`, `radar`, `scatter`, `sunburst`, `treemap`, `sankey`; `heatmap` keeps its continuous color bar and `gauge` has no categorical legend).

- **4 positions & 4-side padding**: `position: 'top' | 'bottom' | 'left' | 'right'` and `padding: number | { top, right, bottom, left }` (with automatic margin reservation).
- **Exact Pretext centering & wrapping**: `@chenglou/pretext` measures every legend label's exact dimensions so SVG legend rows (`top`/`bottom`) and columns (`left`/`right`) are centered accurately and wrap automatically by default (`wrap: false` disables wrapping).
- **Dedicated legend tooltip (hover + keyboard Tab)**: Hovering or Tab-focusing a legend item shows a separate singleton `<mc-tooltip class="mc-legend-tooltip">` (distinct from the chart item tooltip `.mc-tooltip`), disabled via `legend.enableTooltip: false` or `legend.tooltip: false`, and customizable via `chart.config.legend.tooltip` (`formatter`, `renderer`, `offsetX`, `offsetY`) or declarative `<mc-legend><mc-tooltip>...</mc-tooltip></mc-legend>`.
- **Style via CSS `::part()`**: `::part(legend-tooltip)`, `::part(legend-tooltip-header)`, `::part(legend-tooltip-body)`, `::part(legend-tooltip-row)`, `::part(legend-tooltip-swatch)`, `::part(legend-tooltip-label)`, `::part(legend-tooltip-value)`, `::part(legend-tooltip-badge)`.

---

## 9. Unified Event System (`config.events`, `.on()` / `.off()`, & `mc-*` CustomEvents)

Every chart region is interactive and emits consistent `ChartEventPayload` objects across 13 event types (`click`, `dblclick`, `contextmenu`, `focus`, `blur`, `mouseover`, `mouseout`, `mouseenter`, `mouseleave`, `mousemove`, `pointerdown`, `pointerup`, `keydown`):

- **Data Items (`category: 'item'`)**: `barItem`, `linePoint`, `lineSeries`, `lineSlice`, `pieSlice`, `sunburstArc`, `sunburstCenter`, `heatmapCell`, `treemapTile`, `radarDot`, `radarPolygon`, `scatterPoint`, `sankeyNode`, `sankeyLink`, `gaugeArc`, `gaugeNeedle` — pass full datum, value, index, count, bounds, percentage/stack totals, and threshold state in `event.data`.
- **Axes (`target: 'axis'`, `category: 'axis'`)**: ticks, axis titles, and domain lines (`axis: 'x' | 'y' | 'radial'`, `part: 'tick' | 'title' | 'line'`, `value`, `label`, `index`, `count`).
- **Legends (`target: 'legend'`, `category: 'legend'`)**: series & marker legend entries (`id`, `label`, `color`, `index`, `count`, `kind`, `position`, `datum`).
- **Markers (`target: 'marker'`, `category: 'marker'`)**: outside marker annotations (`id`, `type`, `axis`, `value`/`from`/`to`, `matchedCount`, `matchedItems`).
- **Title & Labels (`target: 'title' | 'label'`)**: chart title and interactive labels.
- **Empty Chart Area (`target: 'canvas'`, `category: 'canvas'`)**: returns target and coordinates with `event.data === undefined`.

```js
// 1. Unified chart.config.events (global + scoped namespaces)
chart.config = {
  ...baseConfig,
  events: {
    onClick: (e) => console.log(e.target, e.data),
    item: { onClick: (e) => console.log(e.target, e.data.count, e.data.datum) },
    axis: { onClick: (e) => console.log(e.data.axis, e.data.value) },
    legend: { onMouseEnter: (e) => console.log(e.data.label) },
    canvas: { onClick: (e) => console.log(e.target, e.data) } // data === undefined
  }
};

// 2. Programmatic .on() / .off() (returns unsubscribe function)
const off = chart.on('barItem:click', (e) => console.log(e.data));
chart.on('axis:click', (e) => console.log(e.data));

// 3. Composed DOM CustomEvents
chart.addEventListener('mc-axis-click', (e) => console.log(e.detail));
chart.addEventListener('mc-click', (e) => console.log(e.detail));
chart.addEventListener('mc-event', (e) => console.log(e.detail));
```

---

## 10. Key Methods & Events

- `chart.render()` — Re-renders immediately.
- `chart.resize(width?, height?)` — Explicitly updates dimensions (especially when `autoSize: false`).
- `chart.on(eventName, handler)` / `chart.off(eventName, handler)` — Subscribe/unsubscribe to unified chart events (`'click'`, `'item:click'`, `'barItem:click'`, `'axis:click'`, `'legend:mouseenter'`, `'canvas:click'`, `'*'`).
- `chart.streamLayers(delayMs?)` — Streams layers progressively, firing `mc-layer-stream` per layer and `mc-stream-complete` on finish.
- `chart.getTooltipElement()` — Returns the chart's singleton item `<mc-tooltip>` instance.
- `chart.getLegendTooltipElement()` — Returns the chart's dedicated singleton legend `<mc-tooltip>` instance.
- Events: `mc-event`, `mc-click`, `mc-focus`, `mc-blur`, `mc-mouseover`, `mc-mouseenter`, `mc-mouseleave`, `mc-item-*`, `mc-axis-*`, `mc-legend-*`, `mc-marker-*`, `mc-title-*`, `mc-canvas-*`, `mc-zoom`, `mc-aria-focus`, `mc-item-activate`, `mc-tooltip-show`, `mc-tooltip-hide`, `mc-legend-tooltip-show`, `mc-legend-tooltip-hide`, `mc-layer-stream`, `mc-stream-complete`.
