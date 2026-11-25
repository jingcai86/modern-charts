<div align="center">

<img src="https://raw.githubusercontent.com/jingcai86/modern-charts/main/assets/banner.svg" alt="modern-charts banner" width="100%" />

# 📊 modern-charts (`v0.1.0-alpha.2`)

**Composable, Accessible Web Component Charting Library Inspired by Nivo &amp; Apache ECharts — Powered Exclusively by D3 &amp; Pretext**

<p align="center">
  <a href="https://www.npmjs.com/package/modern-charts"><img src="https://img.shields.io/npm/v/modern-charts/alpha?label=npm&color=cb3837" alt="npm version" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/ci.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/ci.yml/badge.svg" alt="CI Pipeline" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/publish-npm-and-pages.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/publish-npm-and-pages.yml/badge.svg" alt="Publish to npm & Pages" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/lighthouse.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/lighthouse.yml/badge.svg" alt="Lighthouse CI Audit" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/codeql.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/codeql.yml/badge.svg" alt="CodeQL Analysis" /></a>
  <a href="https://github.com/jingcai86/modern-charts"><img src="https://img.shields.io/badge/bundle--size-%3C160kB%20all--deps-blueviolet" alt="Bundle Size Limit" /></a>
  <a href="https://github.com/jingcai86/modern-charts"><img src="https://img.shields.io/badge/tests-208%20passed%20(32%20suites)-brightgreen.svg" alt="Tests" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-7.0-blue.svg" alt="TypeScript" /></a>
</p>

### 🚀 [Explore Live Interactive Studio, Chart Playground &amp; Guides](https://jingcai86.github.io/modern-charts/)

<p align="center">
  <a href="#-features-at-a-glance">Features</a> •
  <a href="#-10-production-grade-chart-components">10 Chart Components</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-universal-sub-component-architecture">Sub-Components</a> •
  <a href="#-interactive-studio-playground--12-live-guides">Studio &amp; Guides</a> •
  <a href="#-ai-context--llm-integration-appscontext">AI Context</a> •
  <a href="#-running-with-docker">Docker</a>
</p>

---

</div>

<br />

<div align="center">
  <img src="https://raw.githubusercontent.com/jingcai86/modern-charts/main/assets/studio-playground.png" alt="modern-charts Live Studio Playground" width="92%" style="border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.35);" />
  <p><em>The modern-charts Studio Playground — Live chart stage with AI layer streaming, searchable chart-specific &amp; common attribute controls, two-way Web Component HTML &amp; <code>chart.config</code> editor, and Live Unified Event Inspector.</em></p>
</div>

<br />

## ✨ Features at a Glance

| Feature | Description |
| :--- | :--- |
| 🎯 **Nivo &amp; ECharts Unified `chart.config`** | Configure data, scales, zoom/roam, markers, legends, tooltips, patterns, i18n, ARIA, and custom layer pipelines via declarative HTML attributes, child Web Components, or a single JavaScript `chart.config` object. |
| 🧩 **12 Autonomous Sub-Components** | Shared child Web Components (`<mc-theme-layer>`, `<mc-scale-layer>`, `<mc-view-layer>`, `<mc-marker-layer>`, `<mc-legend>`, `<mc-tooltip>`, `<mc-truncate>`, `<mc-chart-state>`, `<mc-def>`, `<mc-animation-layer>`, `<mc-aria-layer>`, `<mc-label>`) work uniformly across all applicable charts. |
| 📐 **4-Position Scales &amp; 8 Scale Types** | `<mc-scale-layer>` supports `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`, `band`, and `point` scales with 4-side axis placement (`top`, `right`, `bottom`, `left`, `both`, `none`), nice domain rounding, clamp, and reverse. |
| 🔍 **Unified Zoom, Pan, Brush &amp; Slider** | `<mc-view-layer>` delivers wheel/pinch zoom, drag pan (`x`, `y`, `xy`), rectangular `brush` selection zoom, and an interactive ECharts-style bottom `slider` DataZoom range bar with floating zoom controls. |
| 📌 **Statistical Markers &amp; Thresholds** | `<mc-marker-layer>` and `<mc-marker>` support reference lines, shaded bands (`area`), coordinate callouts (`point`), statistical presets (`min`, `max`, `average`, `median`), outside edge annotations, and threshold conditional styling (`below`, `above`, `between`, `outside`). |
| 🗺️ **Categorical, Continuous &amp; Piecewise Legends** | `<mc-legend>` powers interactive series toggling, solo focus, 4-side placement (`top`, `right`, `bottom`, `left`), continuous color ramps, and ECharts-style `piecewise` / `calculable` drag-handle visualMap filtering across all 10 charts. |
| 🎨 **5 Design-System Palettes &amp; Generators** | Built-in 20-color palettes (`shadcn`, `material`, `bootstrap`, `antd`, `neutral`) decoupled from `light`, `dark`, and `system` surface appearance, plus `generateColorPalette()` and directional `generateGradientPalette()`. |
| ✨ **Pretext Zero-Reflow Typography &amp; Truncation** | `<mc-label>` and `<mc-truncate>` use [`@chenglou/pretext`](https://github.com/chenglou/pretext) for zero-DOM-reflow text measurement, multi-line wrapping, middle/tail ellipsis, auto-rotation, and full-text hover tooltips in SVG and `<foreignObject>`. |
| ⚡ **Unified Event Engine** | Subscribe via `chart.on('click' \| 'mouseenter' \| 'focus', fn)` or DOM custom events (`mc-click`, `mc-zoom`, `mc-brush`, `mc-legend-change`, `mc-state-change`) across data items, axes, legends, markers, titles, and empty canvas. |
| 🌐 **Framework-Neutral Internationalization** | Global `configureI18n()` and per-chart `config.i18n` for `Intl` number, percentage, currency, and timezone-aware date formatting, translated message templates, and explicit `ltr` / `rtl` layout direction. |
| ♿ **W3C ARIA, WCAG 2.1 AA &amp; Static Mode** | Roving `tabindex` keyboard navigation, screen-reader live announcements, hidden `<table>` data fallback, and `isInteractive: false` static mode for zero-overhead sparklines and dashboards. |
| 🪶 **Zero-Bloat Runtime** | Strictly two runtime dependencies: [`d3`](https://d3js.org/) and [`@chenglou/pretext`](https://github.com/chenglou/pretext), with tree-shakeable per-chart subpath exports (`modern-charts/bar`, `modern-charts/line`, etc.). |

---

## 🎨 10 Production-Grade Chart Components

| Component Tag | Chart Type | Default Layer Pipeline | Key Nivo &amp; ECharts Capabilities | Live Playground |
| :--- | :--- | :--- | :--- | :---: |
| [`<mc-line-chart>`](https://jingcai86.github.io/modern-charts/#/chart/line) | 📈 **Line &amp; Area Chart** | `grid`, `axes`, `areas`, `lines`, `points`, `labels`, `crosshair`, `markers`, `legends` | Multi-series curves (`monotoneX`, `natural`, `step`, `stepBefore`, `stepAfter`), `connectNulls`, `areaBaselineValue`, symbol shapes, statistical markPoints, brush &amp; slider zoom | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/line) |
| [`<mc-bar-chart>`](https://jingcai86.github.io/modern-charts/#/chart/bar) | 📊 **Bar &amp; Stack Chart** | `grid`, `axes`, `bars`, `labels`, `markers`, `legends` | Grouped, stacked, &amp; `100%` normalized (`stackOffset: 'expand'`), vertical/horizontal layout, `minValue`/`maxValue`, `reverse`, `innerPadding`, per-corner radius, background track (`showBackground`), stack total labels | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/bar) |
| [`<mc-pie-chart>`](https://jingcai86.github.io/modern-charts/#/chart/pie) | 🍩 **Pie, Donut &amp; Rose** | `arcs`, `labels`, `legends` | Pie, donut, &amp; Nightingale rose (`roseType: 'radius' \| 'area'`), custom angle ranges (`startAngle`, `endAngle`), `sortByValue`, `minAngle`, `activeOuterRadiusOffset`, radial link polylines (`enableArcLinkLabels`), center metric summary | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/pie) |
| [`<mc-heatmap-chart>`](https://jingcai86.github.io/modern-charts/#/chart/heatmap) | 🧱 **Heatmap Matrix** | `grid`, `axes`, `cells`, `labels`, `markers`, `legends` | Continuous, quantize, &amp; diverging color interpolators, square cell aspect lock (`forceSquare`), `xInnerPadding`/`yInnerPadding`, `emptyColor`, reference markers &amp; thresholds, `calculable` visualMap legend handles | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/heatmap) |
| [`<mc-radar-chart>`](https://jingcai86.github.io/modern-charts/#/chart/radar) | 🕸️ **Radar / Spider Chart** | `grid`, `axes`, `polygons`, `lines`, `points`, `labels`, `legends` | Polygon or circular (`gridShape: 'polygon' \| 'circle'`) spider grids, alternating split rings (`splitArea`), per-indicator `maxValue`, `startAngle`, CSS `blendMode`, symbol shapes, interactive legend filtering | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/radar) |
| [`<mc-sunburst-chart>`](https://jingcai86.github.io/modern-charts/#/chart/sunburst) | ☀️ **Sunburst Hierarchy** | `arcs`, `labels`, `legends` | Multi-ring radial partition, interactive zoom-to-node drill-down (`nodeClick: 'zoomToNode'`), `cornerRadius`, `padAngle`, parent color inheritance (`inheritColorFromParent`), radial/tangential label rotation, center breadcrumb total | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/sunburst) |
| [`<mc-sankey-chart>`](https://jingcai86.github.io/modern-charts/#/chart/sankey) | 🔀 **Sankey Flow Diagram** | `links`, `nodes`, `labels`, `legends` | Horizontal &amp; vertical (`layout: 'horizontal' \| 'vertical'`) directed acyclic flows, node alignments (`justify`, `left`, `right`, `center`), gradient link blends, `nodeBorderRadius`, connected-path hover highlighting (`focusNodeAdjacency`) | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/sankey) |
| [`<mc-scatter-chart>`](https://jingcai86.github.io/modern-charts/#/chart/scatter) | 🫧 **Scatter &amp; Bubble** | `grid`, `axes`, `points`, `labels`, `markers`, `legends` | Multi-series scatter &amp; bubble sizing (`nodeSize`, `sizeRange`), 6 symbol shapes, 4-position linear/log/time/symlog axes, statistical markLines &amp; markPoints, brush &amp; slider zoom | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/scatter) |
| [`<mc-treemap-chart>`](https://jingcai86.github.io/modern-charts/#/chart/treemap) | 🗂️ **Treemap Hierarchy** | `nodes`, `labels`, `legends` | Squarified, binary, dice, slice, &amp; slice-dice tiling (`tile`), `leavesOnly`, parent group headers (`enableParentLabels`, `parentLabelHeight`), `colorBy` (`depth`, `id`, `index`), drill-down zoom &amp; Pretext label wrapping | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/treemap) |
| [`<mc-gauge-chart>`](https://jingcai86.github.io/modern-charts/#/chart/gauge) | 🧭 **Radial Gauge Chart** | `track`, `ticks`, `valueArc`, `marker`, `labels`, `legends` | Radial progress &amp; speedometer arcs, multi-stop color `segments`, major &amp; minor split ticks (`splitNumber`), pointer styles (`needle`, `triangle`, `circle`, `pin`, `none`), target threshold marker &amp; legend | [**Open Studio** ↗](https://jingcai86.github.io/modern-charts/#/chart/gauge) |

---

## ⚡ Quick Start

### 1. Installation

```bash
npm install modern-charts
```

### 2. Basic Usage

```html
<!-- Include in any HTML, React, Vue, Svelte, Angular, or Solid component -->
<mc-bar-chart id="my-chart" style="width: 100%; height: 420px;"></mc-bar-chart>

<script type="module">
  // Import only the chart you need (tree-shakeable subpath export)
  import 'modern-charts/bar';
  // Or import the entire library to register all 10 charts:
  // import 'modern-charts';

  const chart = document.getElementById('my-chart');

  chart.config = {
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 94 },
      { quarter: 'Q2', Cloud: 168, Edge: 118 },
      { quarter: 'Q3', Cloud: 196, Edge: 145 },
      { quarter: 'Q4', Cloud: 234, Edge: 172 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    groupMode: 'grouped',
    title: 'Quarterly Cloud vs Edge Infrastructure Spend ($K)',

    // Design-System Palette & Surface Appearance (independent)
    palette: 'shadcn',
    themeMode: 'system',

    // 4-Position Scales (top | right | bottom | left | both | none)
    xScale: { type: 'band', position: 'bottom', padding: 0.28 },
    yScale: { type: 'linear', position: 'left', min: 0, max: 'auto', nice: true },

    // Statistical & Threshold Reference Markers
    markers: [
      {
        type: 'line',
        axis: 'y',
        value: 'average',
        label: 'Avg Spend',
        stroke: '#f59e0b',
        lineStyle: 'dashed',
        legend: true
      }
    ],

    // Interactive View Zoom (wheel, pan, brush, slider)
    view: {
      zoom: true,
      pan: true,
      brush: false,
      slider: false
    },

    // Spring Physics & Motion Presets
    animate: true,
    motionConfig: 'gentle',

    // Accessible ARIA Configuration
    ariaLabel: 'Quarterly Cloud vs Edge Spend',
    isInteractive: true,
    isFocusable: true,

    // Pretext Non-Reflow Typography
    labelMode: 'foreignObject',

    // Composable Layer Pipeline (accepts built-in layer names or custom render functions)
    layers: ['grid', 'axes', 'bars', 'labels', 'markers', 'legends']
  };
</script>
```

### 3. Per-Chart Subpath Imports (Tree-Shaking)

Import individual chart entry points so bundlers tree-shake unused charts and D3 modules, registering only the required custom elements:

```js
import 'modern-charts/bar';      // <mc-bar-chart> + core layers only
import 'modern-charts/line';     // <mc-line-chart> + core layers only
import 'modern-charts/pie';      // <mc-pie-chart> + core layers only
import 'modern-charts/heatmap';  // <mc-heatmap-chart> + core layers only
import 'modern-charts/radar';    // <mc-radar-chart> + core layers only
import 'modern-charts/sunburst'; // <mc-sunburst-chart> + core layers only
import 'modern-charts/sankey';   // <mc-sankey-chart> + core layers only
import 'modern-charts/scatter';  // <mc-scatter-chart> + core layers only
import 'modern-charts/treemap';  // <mc-treemap-chart> + core layers only
import 'modern-charts/gauge';    // <mc-gauge-chart> + core layers only
import 'modern-charts/core';     // BaseChart, engines, palettes & shared layers only
```

---

## 🧩 Universal Sub-Component Architecture

Every `modern-charts` component coordinates a declarative tree of autonomous child Web Components that can be configured via HTML attributes, child tags, or `chart.config`:

```
<mc-bar-chart>
  ├── <mc-theme-layer>       (Design-system palettes, color/gradient generators, light/dark tokens)
  ├── <mc-scale-layer>       (Linear, log, pow, sqrt, symlog, time, band, point & 4 axis positions)
  ├── <mc-view-layer>        (Wheel/pinch zoom, pan, rectangular brush zoom, slider DataZoom bar)
  ├── <mc-marker-layer>      (Lines, bands, markPoints, min/max/average/median presets, thresholds)
  │     └── <mc-marker>      (Declarative child marker & threshold rules)
  ├── <mc-legend>            (Categorical, continuous & piecewise visualMap legends, calculable handles)
  ├── <mc-tooltip>           (Follow-cursor, fixed corner & axis crosshair HTML/SVG tooltips)
  ├── <mc-truncate>          (@chenglou/pretext smart truncation, auto-rotation & overflow tooltips)
  ├── <mc-chart-state>       (Shared loading spinner & empty state overlays, slots & CSS ::part())
  ├── <mc-def>               (Declarative SVG patterns: dots, lines, grid, crosshatch & gradients)
  ├── <mc-animation-layer>   (Spring physics presets, staggered entrances & prefers-reduced-motion)
  ├── <mc-aria-layer>        (Item-level focus, keyboard roving, live announcer & static chart mode)
  └── <mc-label>             (@chenglou/pretext zero-reflow SVG & <foreignObject> label renderer)
```

You can also inspect or manipulate sub-components programmatically via `chart.getSubComponents()`:

```ts
const {
  themeLayer,
  scaleLayer,
  viewLayer,
  markerLayer,
  legendLayer,
  tooltipLayer,
  truncateLayer,
  stateLayer,
  animationLayer,
  ariaLayer,
  labelLayer
} = chart.getSubComponents();
```

---

## 🎛️ Interactive Studio Playground &amp; 12 Live Guides

The [Live Studio](https://jingcai86.github.io/modern-charts/) is organized around a clean two-tab home view and dedicated per-chart playgrounds:

- **Home Overview (`#/`)**:
  - **Chart Types (10)**: Live interactive previews of all 10 chart components synchronized with the global **Theme** (`Shadcn`, `Material`, `Bootstrap`, `Ant Design`, `Neutral`) and **Appearance** (`System`, `Light`, `Dark`) dropdowns.
  - **Guides &amp; Resources (13)**: Deep-dive architectural guides with live editable code &amp; chart sandboxes, plus the machine-readable `llms.txt` AI Context catalog.
- **Dedicated Chart Playground (`#/chart/:id`)**:
  - **Live Chart Stage**: Layer toggle chips, **Stream AI Layers** step-by-step animation, and **Replay Animation** controls, with hoverable info icon (`ⓘ`) tooltips on all 4 section headers.
  - **Attributes &amp; Config Customizer**: Searchable accordion controls separated into **Chart-specific** and **Common** layer scopes with **Expand All** / **Minimize All**.
  - **Two-Way Web Component HTML Markup Editor**: Live-editable `<mc-*-chart>` attributes and `chart.config` JavaScript literal with **Randomize Data**, **Copy AI Context**, and **Reset Default**.
  - **Live Unified Event Inspector**: Real-time stream of `click`, `mouseenter`, and `focus` events across data items, axes, legends, markers, titles, and empty canvas.

### 📚 Interactive Documentation Guides

1. 🧩 [**Custom Layers**](https://jingcai86.github.io/modern-charts/#/guide/custom-layers) — Composing custom SVG/D3 render functions inside `config.layers` and reading `ctx.thresholds`.
2. 🎨 [**Themes &amp; Palettes**](https://jingcai86.github.io/modern-charts/#/guide/themes) — Built-in 20-color palettes, `generateColorPalette()`, `generateGradientPalette()`, and custom brand tokens.
3. 📐 [**D3 Integration**](https://jingcai86.github.io/modern-charts/#/guide/d3) — Using `ctx.d3` scales, generators, and statistical overlays directly inside custom layers.
4. 🏷️ [**Universal Labels**](https://jingcai86.github.io/modern-charts/#/guide/custom-labels) — Formatters, `<foreignObject>` badge/icon rendering, and custom `labelRenderer` callbacks.
5. 💬 [**Tooltips**](https://jingcai86.github.io/modern-charts/#/guide/tooltips) — Custom HTML/DOM renderers, placement modes (`followCursor`, `top-left`, `top-right`, `bottom-left`, `bottom-right`), and axis triggers.
6. ✂️ [**Label Truncation**](https://jingcai86.github.io/modern-charts/#/guide/truncation) — Zero-reflow `@chenglou/pretext` truncation (`end`, `middle`, `start`), auto-rotation, and overflow tooltips (`<mc-truncate>`).
7. ⚡ [**Unified Events**](https://jingcai86.github.io/modern-charts/#/guide/events) — Unified `chart.on()` and custom DOM events across items, axes, legends, markers, titles, and canvas.
8. ♿ [**Accessibility &amp; Static Charts**](https://jingcai86.github.io/modern-charts/#/guide/accessibility) — Keyboard navigation, live screen-reader announcements, data-table fallbacks, and `isInteractive: false` static charts.
9. 🌐 [**Internationalization**](https://jingcai86.github.io/modern-charts/#/guide/i18n) — Shared `configureI18n()` service, per-chart `config.i18n`, `Intl` number/date/timezone formatting, translated messages, and `rtl` layout.
10. 🔄 [**Dynamic Data Updates**](https://jingcai86.github.io/modern-charts/#/guide/dynamic-updates) — Real-time sliding-window streaming (`chart.data = next`), batched `setConfig()`, and responsive resizing.
11. ⏳ [**Loading &amp; Empty States**](https://jingcai86.github.io/modern-charts/#/guide/chart-state) — Shared `<mc-chart-state>` overlays, `loading`/`empty` transitions, custom HTML slots, and CSS `::part()` theming.
12. ✨ [**SVG Patterns &amp; Gradients**](https://jingcai86.github.io/modern-charts/#/guide/patterns) — Accessible series patterns (`dots`, `lines`, `grid`, `crosshatch`), directional gradients, declarative `<mc-def>`, and threshold-split fills.

---

## 🌐 Internationalization (`configureI18n` &amp; `config.i18n`)

All 10 chart types share a framework-neutral i18n service exported from `modern-charts` and `modern-charts/core`. Configure application defaults once or override them per chart:

```js
import { configureI18n } from 'modern-charts/core';
import 'modern-charts/bar';

configureI18n({
  locale: 'de-DE',
  timeZone: 'Europe/Berlin',
  messages: {
    loading: 'Wird geladen…',
    empty: 'Keine Daten',
    zoomIn: 'Vergrößern',
    tableValue: 'Wert',
    ariaBarCategory: '{{label}} in {{category}}: {{value}}'
  }
});

chart.config = {
  ...chart.config,
  i18n: { locale: 'ar-EG', direction: 'rtl', timeZone: 'UTC' }
};
```

Numbers, percentages, and date ticks use `Intl` with the resolved chart settings, and custom layers receive `ctx.i18n.formatNumber()`, `ctx.i18n.formatPercent()`, `ctx.i18n.formatDate()`, and `ctx.i18n.message()`.

---

## 🤖 AI Context &amp; LLM Integration (`apps/context/`)

`modern-charts` ships machine-readable specifications inside [`apps/context/`](./apps/context/README.md) (bundled into `dist/context/`, published to GitHub Pages, and automatically verified in CI against all 10 chart components) so AI coding agents can generate accurate chart configurations:

- **Concise Index (`llms.txt`)**: [`apps/context/llms.txt`](./apps/context/llms.txt) • [Live `llms.txt`](https://jingcai86.github.io/modern-charts/llms.txt)
- **Full Single-File Reference**: [`apps/context/llms-full.txt`](./apps/context/llms-full.txt) • [Live `llms-full.txt`](https://jingcai86.github.io/modern-charts/llms-full.txt)
- **Per-Chart Specs**: [`apps/context/charts/*.md`](./apps/context/charts/bar.md) (all 10 charts)
- **JSON Schema Catalog**: `import schema from 'modern-charts/context/schema'` ([`apps/context/charts.schema.json`](./apps/context/charts.schema.json))

---

## 🐳 Running with Docker

Run the entire Studio showcase in Docker with zero local Node.js setup:

### Production Nginx Demo (`http://localhost:8080`)

```bash
docker compose up --build
# Or via npm script:
npm run docker:up
```

### Hot-Reload Development Server (`http://localhost:5173`)

```bash
docker compose --profile dev up --build
# Or via npm script:
npm run docker:dev
```

---

## 🤝 Contributing &amp; Quality Automation

Every Pull Request is automatically verified by `github-actions[bot]`:
- 📦 **Bundle Size Limit Report** (`npm run size` across all 12 entry points in brotli &amp; gzip)
- 📊 **Vitest Coverage Summary Table** (`npm run test:coverage` with `@vitest/coverage-v8`)
- 🔦 **Lighthouse CI Audit Score Table** (Performance, Accessibility, Best Practices &amp; SEO scores + hosted HTML report)
- 🌐 **Modern Web Guidance Lint &amp; Inline Annotations** (`npm run lint:web`)
- 🤖 **AI Context Schema Sync Verification** (`npm run sync:context`)
- 🏷️ **Path-Based PR Auto-Labeler** (`core`, `studio`, `ai-context`, `ci`, `tests`, `chart:<name>`)

Contributions, issue reports, and feature proposals are warmly welcome:
- 🐛 [**Report a Bug**](https://github.com/jingcai86/modern-charts/issues/new?template=bug_report.yml)
- 💡 [**Request a Feature**](https://github.com/jingcai86/modern-charts/issues/new?template=feature_request.yml)
- 📥 [**Open a Pull Request**](https://github.com/jingcai86/modern-charts/pulls)

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.
