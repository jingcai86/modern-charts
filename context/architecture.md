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
  palette?: 'modern' | 'nivo' | 'echarts' | 'emerald' | 'sunset' | 'ocean' | 'cyber';
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

  // Universal Labels (<mc-label>, powered by @chenglou/pretext)
  enableLabels?: boolean;
  labelMode?: 'svg' | 'foreignObject' | 'custom';
  label?: Partial<LabelStyleOverride> | Partial<LabelStyleOverride>[];
  labelRenderer?: CustomLabelRenderer;

  // W3C ARIA Accessibility (<mc-aria-layer> / <mc-aria>)
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  isFocusable?: boolean;
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

`width`, `height`, `auto-size`, `margin`, `theme-mode`, `palette`, `chart-title`, `layers`, `label-mode`, `animate`, `motion-config`, `aria-label`, `is-focusable`.

---

## 3. Markers & Threshold Styling (`markers` / `<mc-marker>`)

Supported on Cartesian charts (`<mc-bar-chart>`, `<mc-line-chart>`, `<mc-scatter-chart>`). Markers have `pointer-events: none` so tooltips on underlying data items are never blocked.

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
    | 'bottom-left' | 'bottom-center' | 'bottom-right'
    | 'outside-left' | 'outside-right' | 'outside-top' | 'outside-bottom';
  labelPadding?: number;     // px away from marker line or axis (default 8)
  labelEdgePadding?: number; // px inset from plot edge for inside labels (default 8)
  labelOffsetX?: number;
  labelOffsetY?: number;
  icon?: string;
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

Note: When any marker uses `outside-left`, `outside-right`, `outside-top`, or `outside-bottom`, `MCBaseChart` automatically expands the corresponding chart margin so the label never clips.

---

## 4. Universal Labels (`<mc-label>` & `LabelEngine`)

Every text label in every chart (ticks, titles, bar/point/arc/cell values, markers, legends, center labels) renders via `@chenglou/pretext` with zero DOM reflow.

Target types (`for` attribute on `<mc-label>` or `target` in `config.label`):
`'all' | 'axis-tick' | 'axis-title' | 'data' | 'bar-outer' | 'arc' | 'arc-link' | 'cell' | 'radar-axis' | 'radar-point' | 'node' | 'link' | 'legend' | 'title' | 'center' | 'marker' | 'custom'`.

```html
<mc-bar-chart>
  <mc-label for="data" mode="foreignObject" bg-color="#0f172a" color="#f8fafc" border-radius="6" padding="4" icon="✨"></mc-label>
</mc-bar-chart>
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

## 7. Key Methods & Events

- `chart.render()` — Re-renders immediately.
- `chart.resize(width?, height?)` — Explicitly updates dimensions (especially when `autoSize: false`).
- `chart.streamLayers(delayMs?)` — Streams layers progressively, firing `mc-layer-stream` per layer and `mc-stream-complete` on finish.
- Events: `mc-rendered`, `mc-zoom`, `mc-aria-focus`, `mc-aria-activate`, `mc-layer-stream`, `mc-stream-complete`.
