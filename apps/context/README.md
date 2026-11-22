# `modern-charts` AI Context

This directory contains structured, token-efficient, machine-readable documentation designed specifically for **LLMs and AI coding agents** so they can accurately discover, choose, configure, and generate valid `modern-charts` Web Components without hallucinating unsupported props, layer names, or data shapes.

## Recommended Reading Order for AI Agents

1. **Quick Triage & Chart Selection**: Read [`llms.txt`](./llms.txt) first (~120 lines). It maps user intent and data shapes to the exact `<mc-*-chart>` tag and subpath import.
2. **Chart-Specific Spec**: Read only the relevant file in [`charts/`](./charts/) (e.g. [`charts/bar.md`](./charts/bar.md), [`charts/line.md`](./charts/line.md), [`charts/sankey.md`](./charts/sankey.md)) to get the exact data schema, supported layers, HTML attributes, and minimal working example.
3. **Shared Architecture & Advanced Features**: Read [`architecture.md`](./architecture.md) when configuring themes, scales, markers/thresholds, custom `<mc-label>` formatting, custom SVG layers, accessibility (`<mc-aria-layer>`), or AI progressive layer streaming (`streamLayers()`).
4. **Structured Tool / Schema Injection**: Load [`charts.schema.json`](./charts.schema.json) directly into LLM function-calling tools or validators (`import schema from 'modern-charts/context/schema'`).
5. **Single-File Full Dump**: Use [`llms-full.txt`](./llms-full.txt) when injecting the complete library reference into a single system prompt.

## Available Endpoints

- **Repository**: `apps/context/`
- **npm package**: `node_modules/modern-charts/dist/context/` (and `modern-charts/context/schema`, `modern-charts/context/*`)
- **Live Demo / GitHub Pages**:
  - `https://jingcai86.github.io/modern-charts/llms.txt`
  - `https://jingcai86.github.io/modern-charts/llms-full.txt`
  - `https://jingcai86.github.io/modern-charts/charts.schema.json`
  - `https://jingcai86.github.io/modern-charts/charts/<chart>.md`
