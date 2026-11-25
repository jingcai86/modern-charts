# `<mc-heatmap-chart>` — Matrix Heatmap Chart

- **Tag**: `<mc-heatmap-chart>`
- **Subpath Import**: `import 'modern-charts/heatmap';`
- **Class / Item Exports**: `MCHeatmapChart`, `MCCellItem`, `computeHeatmapChartModel`, `registerHeatmapChart`
- **Default Layers**: `['axes', 'cells', 'labels', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Cartesian Scales**: Band X & Band Y + sequential color scale

## Data Schema (`HeatmapRow[]`)

Array of row objects where `id` is the Y-axis row label and `data` contains `{ x, y }` cells (`x` = column key, `y` = numeric intensity).

```ts
interface HeatmapRow {
  id: string;
  data: Array<{ x: string; y: number }>;
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `colorScheme` | `color-scheme` | `'theme'` or a named scheme | `'viridis'` | Use the active theme or a fixed color ramp |
| `cellShape` | `cell-shape` | `'rect' \| 'circle'` | `'rect'` | Cell marker geometry |
| `cellPadding` | `cell-padding` | `number` (`0`–`0.5`) | `0.1` | Padding ratio between cells |
| `borderRadius` | `border-radius` | `number` | `6` | Corner radius for `'rect'` cells |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Render numeric value inside each cell |

## Minimal Working Example

```html
<mc-heatmap-chart id="hm" style="width: 100%; height: 380px;"></mc-heatmap-chart>
<script type="module">
  import 'modern-charts/heatmap';

  document.getElementById('hm').config = {
    data: [
      { id: 'Mon', data: [{ x: '09:00', y: 24 }, { x: '12:00', y: 78 }, { x: '15:00', y: 65 }] },
      { id: 'Tue', data: [{ x: '09:00', y: 31 }, { x: '12:00', y: 92 }, { x: '15:00', y: 54 }] },
      { id: 'Wed', data: [{ x: '09:00', y: 18 }, { x: '12:00', y: 61 }, { x: '15:00', y: 88 }] }
    ],
    colorScheme: 'viridis',
    cellShape: 'rect',
    borderRadius: 6,
    enableLabels: true,
    title: 'API Load by Day & Hour',
    ariaLabel: 'API load heatmap matrix'
  };
</script>
```

## Common Pitfalls

- Each cell uses `{ x: '<column>', y: <number> }` (NOT `value`).
- Studio defaults to `'theme'`. It derives a ramp from the primary theme color or uses explicit `colors` as stops (hex, RGB, or HSL). Named ramps include `'viridis'`, `'plasma'`, `'inferno'`, `'magma'`, `'cividis'`, `'turbo'`, `'warm'`, `'cool'`, `'blues'`, `'greens'`, `'oranges'`, `'purples'`, `'ylGnBu'`, `'rdYlBu'`, and `'spectral'`.
- `colorScheme` is case-sensitive for `'ylGnBu'` and `'rdYlBu'`.
