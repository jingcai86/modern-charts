<!-- Use a scoped Conventional Commit title such as feat(studio): add chart export, fix(core): correct axis labels, or ci(release): verify bundle sizes. -->

## Summary & Motivation

<!-- Brief summary of what this PR does and why it was created -->

Closes # <!-- Link related issue, e.g. Fixes #12 -->

---

## Type of Change

- [ ] 🐛 Bug fix (non-breaking fix for observed issue)
- [ ] ✨ New feature (non-breaking enhancement)
- [ ] 💥 Breaking change (fix or feature requiring API / config changes)
- [ ] 🎨 Refactoring / Code style / Performance improvement
- [ ] 📝 Documentation / Catalog examples update
- [ ] ⚙️ CI/CD / Build tooling / Dependencies

---

## Chart Components & Layers Affected

<!-- Check all that apply -->
- [ ] `<mc-line-chart>`
- [ ] `<mc-bar-chart>`
- [ ] `<mc-pie-chart>`
- [ ] `<mc-heatmap-chart>`
- [ ] `<mc-radar-chart>`
- [ ] `<mc-sunburst-chart>`
- [ ] `<mc-sankey-chart>`
- [ ] `<mc-scatter-chart>`
- [ ] `<mc-treemap-chart>`
- [ ] `<mc-gauge-chart>`
- [ ] Core Layer Pipeline / Engine (`<mc-label>`, `<mc-aria-layer>`, `<mc-animation-layer>`, `<mc-scale-layer>`, `<mc-theme-layer>`)
- [ ] Catalog / Demo Site / Docker

---

## Visual Comparison (Before vs. After)

<!-- If this PR changes chart visuals, legend layout, themes, or controls, please attach screenshots or GIFs -->

| Before | After |
| :---: | :---: |
| *(attach screenshot)* | *(attach screenshot)* |

---

## Verification & Quality Checklist

- [ ] `npm test` passes with zero failures (`vitest run`).
- [ ] `npm run build` succeeds (`tsc --noEmit && vite build`).
- [ ] `npm run build:examples` succeeds without bundle errors.
- [ ] Verified with both **Dark Mode** and **Light Mode**.
- [ ] No regression on ARIA items, screen-reader readout, or keyboard navigation.
- [ ] No external runtime dependencies introduced beyond `d3` and `@chenglou/pretext`.
