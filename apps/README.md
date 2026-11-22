# `apps/` — Applications & Documentation Sites

This directory hosts standalone web applications built on top of `modern-charts`:

```
apps/
└── studio/             # Interactive Studio Playground & Documentation Site (published to GitHub Pages)
    ├── index.html      # App shell & top navigation (Gallery + Guides + AI Context)
    ├── main.ts         # Router, Overview Gallery, Live Chart Playground & two-way HTML editor
    ├── chart-catalog.ts# Metadata, default configs & attribute controls for all 10 charts
    ├── guides.ts       # Interactive documentation guides (Custom Layers, Themes, D3, Labels, Tooltips)
    ├── sample-data.ts  # Sample datasets & random data generators
    └── styles.css      # Studio light/dark theme styling
```

## Related Top-Level Directories

- [`src/`](../src/) — Core `modern-charts` library & Web Components (published to npm under `dist/`).
- [`context/`](../context/) — Structured AI Context (`llms.txt`, `llms-full.txt`, `charts/*.md`, `charts.schema.json`). Kept at the repo root because it is shipped directly inside the published `modern-charts` npm package and served into the Studio build via Vite's `publicDir`.
- [`tests/`](../tests/) — Unit, integration, subpath tree-shaking, and AI schema validation suites.

## Scripts

```bash
npm run dev           # Start Studio Playground dev server (http://localhost:5173)
npm run build:apps    # Build Studio Playground + copy context/ into static output
npm run preview:apps  # Preview the built Studio app locally
```
