<div align="center">

<img src="https://raw.githubusercontent.com/jingcai86/modern-charts/main/assets/banner.svg" alt="modern-charts banner" width="100%" />

# modern-charts

Web Component charts built with D3 and Pretext.

<p align="center">
  <a href="https://www.npmjs.com/package/modern-charts"><img src="https://img.shields.io/badge/npm-package-cb3837" alt="npm package" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/ci.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/ci.yml/badge.svg" alt="CI Pipeline" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/lighthouse.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/lighthouse.yml/badge.svg" alt="Lighthouse CI Audit" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/codeql.yml"><img src="https://github.com/jingcai86/modern-charts/actions/workflows/codeql.yml/badge.svg" alt="CodeQL Analysis" /></a>
  <a href="https://github.com/jingcai86/modern-charts/blob/main/.size-limit.json"><img src="https://img.shields.io/badge/bundle%20budget-160kB%20gzip-blueviolet" alt="Bundle size budget: 160 kB gzip with dependencies" /></a>
  <a href="https://github.com/jingcai86/modern-charts/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/tests-210%20passed%20(33%20files)-brightgreen.svg" alt="Tests" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-7.0-blue.svg" alt="TypeScript" /></a>
</p>

[Live Studio](https://jingcai86.github.io/modern-charts/) · [Documentation wiki](https://github.com/jingcai86/modern-charts/wiki) · [npm](https://www.npmjs.com/package/modern-charts)

</div>

## Use

Install the package:

```bash
npm install modern-charts
```

In an application served by a JavaScript bundler, import a chart and assign its configuration:

<p align="center">
  <a href="https://jingcai86.github.io/modern-charts/#/chart/bar"><img src="assets/readme-example.svg" alt="Bar chart showing Cloud and Edge spending for two quarters" width="92%" /></a>
</p>

```html
<mc-bar-chart id="spending" style="display: block; width: 100%; height: 360px;"></mc-bar-chart>

<script type="module">
  import 'modern-charts/bar';

  const chart = document.getElementById('spending');
  chart.config = {
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 94 },
      { quarter: 'Q2', Cloud: 168, Edge: 118 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    title: 'Quarterly spending',
    palette: 'shadcn',
    themeMode: 'system'
  };
</script>
```

Give the chart a sized container. Import `modern-charts` to register every chart, or use a [per-chart entry point](https://github.com/jingcai86/modern-charts/wiki/Chart-Components). Replace `chart.data` or assign a new `chart.config` to update it.

Studio automatically lazy-loads each chart as its gallery preview approaches the viewport or its playground opens. In your app, call `await import('modern-charts/bar')` when you need the bar chart, then assign its config.

Loading and empty overlays and built-in tooltips are enabled by default. To skip their downloads, set `features.chartState: false` or `features.tooltip: false` when registering your charts, and mount custom tooltip UI in `slot="tooltip"`. [Feature Bootstrapping guide](https://jingcai86.github.io/modern-charts/#/guide/bootstrapping).

For server-rendered apps, emit a sized chart host from the server and assign its config after the browser mounts. [Server-side rendering guide](https://jingcai86.github.io/modern-charts/#/guide/ssr).

See the wiki for [features](https://github.com/jingcai86/modern-charts/wiki/Features), [components](https://github.com/jingcai86/modern-charts/wiki/Component-Architecture), [Studio guides](https://github.com/jingcai86/modern-charts/wiki/Studio-and-Guides), [internationalization](https://github.com/jingcai86/modern-charts/wiki/Internationalization), and [AI context](https://github.com/jingcai86/modern-charts/wiki/AI-Context).

## Build

Use Node.js 22.12+ and npm.

```bash
git clone https://github.com/jingcai86/modern-charts.git
cd modern-charts
npm ci
npm run dev
```

Open the Studio at [localhost:5173](http://localhost:5173).

```bash
npm run build         # Library and TypeScript declarations → dist/
npm run build:apps    # Studio and documentation assets → dist-examples/
npm run preview:apps  # Preview the built Studio
```

To run with Docker:

```bash
docker compose up --build                                      # Studio at localhost:8080
docker compose --profile dev up --build modern-charts-dev      # Hot reload at localhost:5173
```

## Contribute

[Report a bug](https://github.com/jingcai86/modern-charts/issues/new?template=bug_report.yml), [propose a feature](https://github.com/jingcai86/modern-charts/issues/new?template=feature_request.yml), or open a pull request against `main`. Include a reproduction for fixes and tests for behavior changes.

Before submitting a pull request, run:

```bash
npm test
npx tsc --noEmit
npm run lint:web
npm run sync:context
npm run build
npm run size
npm run build:apps
```

Review and include any generated context changes when updating chart defaults. CI also runs coverage, CodeQL, bundle-size checks, and a Lighthouse audit.

The library is in [`src/`](src/), the Studio in [`apps/studio/`](apps/studio/), machine-readable documentation in [`apps/context/`](apps/context/), and tests in [`tests/`](tests/).

Made with Gemini Argon and GPT 6.1.

Licensed under [MIT](LICENSE).
