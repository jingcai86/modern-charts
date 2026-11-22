# modern-charts (`v0.1.0-alpha.0`)

A framework-agnostic, composable **Web Component** charting library inspired by **Nivo** and **Apache ECharts**, relying **exclusively** on [`d3`](https://d3js.org/) and [`@chenglou/pretext`](https://github.com/chenglou/pretext).

---

## Core Design Principles

1. **Nivo-Style Single Unified `chart.config` Driving Sub-Components Underneath**:
   - Configure everything (`data`, `layers`, `theme`, `palette`, `xScale`, `yScale`, `view`, `animate`, `motionConfig`, `label`, `aria`, `barAriaLabel`, `pointAriaLabel`, `arcAriaLabel`, `cellAriaLabel`, `nodeAriaLabel`, `linkAriaLabel`, `isFocusable`, etc.) through one unified `chart.config = { ... }` object (or `chart.setConfig({ ... })`).
   - **Underneath**, the chart automatically populates and drives its composable Web Component sub-components (`<mc-theme-layer>`, `<mc-scale-layer>`, `<mc-view-layer>`, `<mc-animation-layer>`, `<mc-aria-layer>`, `<mc-label>`), which can also be inspected via `chart.getSubComponents()` or overridden declaratively in HTML.
2. **Dedicated `<mc-animation-layer>` (`<mc-animation>`) & `AnimationEngine`**:
   - Supports Nivo's `motionConfig` presets (`default`, `gentle`, `wobbly`, `stiff`, `slow`, `molasses`, `elastic`, `bounce`) as well as custom `{ duration, easing, stagger, streamDelay }`.
   - Animates individual chart items (bars growing from baseline, lines drawing, pie/sunburst arcs sweeping open, radar polygons expanding from center, heatmap/treemap cells popping with stagger, sankey links flowing, and gauge needles sweeping) while respecting `@media (prefers-reduced-motion)`.
3. **Universal `<mc-aria-layer>` (`<mc-aria>`) & `AriaEngine` for Every Chart & Every Item**:
   - **Every visual data item in every chart** (each bar in `<mc-bar-chart>`, point in `<mc-line-chart>`, slice in `<mc-pie-chart>`, cell in `<mc-heatmap-chart>`, dot in `<mc-radar-chart>`, arc in `<mc-sunburst-chart>`, node & flow link in `<mc-sankey-chart>`, bubble in `<mc-scatter-chart>`, tile in `<mc-treemap-chart>`, and value arc in `<mc-gauge-chart>`) is decorated as an accessible ARIA item (`.mc-aria-item`).
   - Clients can customize `aria-label`, `aria-description`, `role`, `aria-roledescription`, and arbitrary `aria-*` attributes per item via Nivo-style callbacks (`barAriaLabel`, `pointAriaLabel`, `arcAriaLabel`, `cellAriaLabel`, `nodeAriaLabel`, `linkAriaLabel`, `aria.itemLabel`) or template strings (`"Bar {{seriesId}} in {{category}}: ${{value}}K"`).
   - Supports full keyboard navigation (<kbd>Tab</kbd>, <kbd>ArrowRight</kbd>/<kbd>ArrowLeft</kbd>, <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>Enter</kbd>/<kbd>Space</kbd>), a polite screen-reader live region announcer, and an auto-generated semantic fallback `<table>`.
4. **Universal `<mc-label>` Component Powered by `@chenglou/pretext`**:
   - **Every single label in every chart** is measured by `@chenglou/pretext` (`prepareWithSegments`, `layoutWithLines`, `measureLineStats`, `measureNaturalWidth`) with **zero DOM layout reflow** and rendered in either SVG `<text>`/`<tspan>` mode, Pretext-sized SVG `<foreignObject>` HTML mode, or custom renderer mode.
5. **Nivo-Style Layer Pipeline & AI Progressive Layer-by-Layer Streaming**:
   - Supports both programmatic layer arrays (`layers: ['grid', 'axes', 'lines', customLayerFn]`) and live DOM layer-by-layer streaming (`<mc-chart-layer>`, `<mc-custom-layer>`, `chart.streamLayers()`).

---

## Single Unified `chart.config` Example

```ts
const barChart = document.querySelector('mc-bar-chart');

barChart.config = {
  data: [
    { quarter: 'Q1', Cloud: 142, Edge: 94 },
    { quarter: 'Q2', Cloud: 168, Edge: 118 },
    { quarter: 'Q3', Cloud: 196, Edge: 145 },
    { quarter: 'Q4', Cloud: 234, Edge: 172 }
  ],
  autoSize: true,
  title: 'Quarterly Infrastructure Spend ($K)',
  indexBy: 'quarter',
  keys: ['Cloud', 'Edge'],
  groupMode: 'grouped',

  // 1. Theme Layer
  themeMode: 'dark',
  palette: 'nivo',

  // 2. Scale Layer
  xScale: { type: 'band', padding: 0.28 },
  yScale: { type: 'linear', min: 0, max: 'auto' },

  // 3. View / Zoom Layer (ECharts-style Roam)
  view: { zoomable: true, pannable: true, showControls: true },

  // 4. Animation Layer (Nivo-style motionConfig)
  animate: true,
  motionConfig: 'wobbly',

  // 5. Universal Label Component (@chenglou/pretext)
  labelMode: 'foreignObject',

  // 6. Universal ARIA Component (Every bar is an accessible, focusable ARIA item)
  ariaLabel: 'Quarterly Cloud vs Edge Infrastructure Spend',
  isFocusable: true,
  barAriaLabel: (d) => `${d.seriesId} spend in ${d.category}: $${d.value}K`,
  aria: {
    itemRole: 'graphics-symbol',
    itemRoleDescription: 'spend bar',
    itemDescription: 'Bar {{number}} of {{total}}'
  },

  // 7. Nivo-style Layer Pipeline (Built-in + Custom Layers)
  layers: ['grid', 'axes', 'bars', 'labels', 'legends']
};
```

---

## Running with Docker

You can run the interactive demo site and playground in Docker in either **Production** mode (Nginx on port `8080`) or **Live Development** mode (Vite with hot-reload on port `5173`).

### Option 1: Docker Compose (Production Demo on `http://localhost:8080`)

```bash
docker compose up --build
# Or via npm script:
npm run docker:up
```

Then open [http://localhost:8080](http://localhost:8080).

### Option 2: Docker Compose (Development Mode with Hot-Reload on `http://localhost:5173`)

```bash
docker compose --profile dev up --build
# Or via npm script:
npm run docker:dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Option 3: Standalone Docker CLI

```bash
# Build and run the production Nginx container
docker build -t modern-charts .
docker run --rm -p 8080:80 modern-charts

# Or build and run the development container
docker build --target dev -t modern-charts:dev .
docker run --rm -p 5173:5173 modern-charts:dev
```

