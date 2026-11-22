# `<mc-treemap-chart>` — Squarified Treemap Chart

- **Tag**: `<mc-treemap-chart>`
- **Subpath Import**: `import 'modern-charts/treemap';`
- **Class / Item Exports**: `MCTreemapChart`, `MCCellItem`, `computeTreemapChartModel`, `registerTreemapChart`
- **Default Layers**: `['tiles', 'labels', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Cartesian Scales**: No (D3 squarified hierarchical tiling)

## Data Schema (`HierarchyNode`)

Single root tree node (same `HierarchyNode` schema as `<mc-sunburst-chart>`). Leaf nodes carry numeric `value`.

```ts
interface HierarchyNode {
  name: string;
  value?: number;
  color?: string;
  children?: HierarchyNode[];
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `tilePadding` | `tile-padding` | `number` | `4` | Inner padding in px between tiles |
| `borderRadius` | `border-radius` | `number` | `6` | Corner radius (`rx`) of each tile |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Render Pretext-wrapped labels inside tiles (`width >= 36 && height >= 22`) |

## Minimal Working Example

```html
<mc-treemap-chart id="treemap" style="width: 100%; height: 400px;"></mc-treemap-chart>
<script type="module">
  import 'modern-charts/treemap';

  document.getElementById('treemap').config = {
    data: {
      name: 'Budget',
      children: [
        {
          name: 'Engineering',
          children: [
            { name: 'Platform', value: 420 },
            { name: 'AI Research', value: 380 },
            { name: 'Security', value: 190 }
          ]
        },
        {
          name: 'Product',
          children: [
            { name: 'Design', value: 210 },
            { name: 'Analytics', value: 160 }
          ]
        }
      ]
    },
    tilePadding: 4,
    borderRadius: 6,
    enableLabels: true,
    title: 'Department Budget Allocation',
    ariaLabel: 'Department budget allocation treemap'
  };
</script>
```

## Common Pitfalls

- `data` is a **single `HierarchyNode` object** (NOT an array).
- The tile layer is named `'tiles'` in `defaultLayers`: `['tiles', 'labels', 'legends']`.
- Put `value` on leaf nodes only.
