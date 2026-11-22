# `apps/` — Applications & Documentation Sites

This directory hosts standalone web applications built on top of `modern-charts`:

```
apps/
├── context/                      # Structured AI Context (llms.txt, llms-full.txt, charts/*.md, charts.schema.json)
│                                 # Copied into dist/context/ during `npm run build` and served by Studio via Vite publicDir
└── studio/                       # Interactive Studio Playground & Documentation Site (published to GitHub Pages)
    ├── index.html                # App shell & top navigation (Gallery + Guides + AI Context)
    ├── main.ts                   # Slim entry point: registers charts, hash router & global theme switcher
    ├── sample-data.ts            # Sample datasets & random data generators
    ├── state/
    │   ├── theme.ts              # Global theme preference (localStorage + OS prefers-color-scheme)
    │   └── config-store.ts       # Per-chart config persistence, reset & virtual marker state builder
    ├── utils/
    │   ├── object-path.ts        # Prototype-safe nested getByPath / setByPath helpers
    │   └── code-sync.ts          # JSON formatting, Web Component HTML generator & two-way markup parser
    ├── catalog/
    │   ├── types.ts              # ChartAttributeSpec & ChartCatalogEntry types
    │   ├── shared-attributes.ts  # Shared attribute controls (Common, Legend, View/Zoom, Markers)
    │   ├── charts/               # One focused spec file per chart (bar, line, pie, heatmap, radar, ...)
    │   └── index.ts              # CHART_CATALOG & getAllAttributesForChart()
    ├── pages/
    │   ├── overview.ts           # Home Overview Gallery (#/)
    │   └── chart-detail/
    │       ├── index.ts          # Chart Detail Playground (#/chart/:id) coordinator
    │       ├── attribute-panel.ts# Searchable collapsible attribute control accordions
    │       └── code-editor.ts    # Live two-way HTML / chart.config markup editor
    ├── guides/
    │   ├── types.ts              # GuideId, GuideMeta & GUIDES_CATALOG
    │   ├── shared.ts             # Copyable code blocks & guide header tabs
    │   ├── custom-layers.ts      # Custom Layers guide (#/guide/custom-layers)
    │   ├── themes.ts             # Themes & Palettes guide (#/guide/themes)
    │   ├── d3.ts                 # Working with D3 guide (#/guide/d3)
    │   ├── custom-labels.ts      # Custom Labels guide (#/guide/custom-labels)
    │   ├── tooltips.ts           # Unified Tooltips guide (#/guide/tooltips)
    │   └── index.ts              # renderGuidePage() dispatcher
    └── styles/
        ├── index.css             # Stylesheet entry importing partials below
        ├── tokens.css            # Dark/light CSS custom properties & base reset
        ├── layout.css            # Site header, navigation & overview gallery
        ├── playground.css        # Chart detail workspace, attribute controls & code editor
        └── guides.css            # Documentation guide cards & code block styling
```

## Related Top-Level Directories

- [`src/`](../src/) — Core `modern-charts` library & Web Components (published to npm under `dist/`).
- [`tests/`](../tests/) — Unit, integration, subpath tree-shaking, and AI schema validation suites.

## Scripts

```bash
npm run dev           # Start Studio Playground dev server (http://localhost:5173)
npm run build:apps    # Build Studio Playground + copy context/ into static output
npm run preview:apps  # Preview the built Studio app locally
```
