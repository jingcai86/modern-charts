# `<mc-sunburst-chart>` — Sunburst Hierarchy Chart

- **Tag**: `<mc-sunburst-chart>`
- **Subpath Import**: `import 'modern-charts/sunburst';`
- **Class / Item Exports**: `MCSunburstChart`, `MCArcItem`, `computeSunburstChartModel`, `registerSunburstChart`
- **Default Layers**: `['arcs', 'labels', 'center', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Interactive Drilldown**: Yes (click any parent arc to drill in; click center circle to drill up, or call `chart.resetDrilldown()`)

## Data Schema (`HierarchyNode`)

Single root tree node. Leaf nodes carry numeric `value`; parent nodes derive their value from the sum of descendants.

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
| `cornerRadius` | `corner-radius` | `number` | `3` | Corner radius on partition arcs |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Render Pretext-wrapped labels inside arcs that have enough room |
| `interactiveDrilldown` | `interactive-drilldown` | `boolean` | `true` | Allow clicking arcs / center circle to zoom hierarchy |

## Minimal Working Example

```html
<mc-sunburst-chart id="sunburst" style="width: 100%; height: 420px;"></mc-sunburst-chart>
<script type="module">
  import 'modern-charts/sunburst';

  document.getElementById('sunburst').config = {
    data: {
      name: 'Cloud',
      children: [
        {
          name: 'Compute',
          children: [
            { name: 'GPU', value: 320 },
            { name: 'CPU', value: 180 }
          ]
        },
        {
          name: 'Storage',
          children: [
            { name: 'Object', value: 140 },
            { name: 'Block', value: 95 }
          ]
        }
      ]
    },
    cornerRadius: 4,
    interactiveDrilldown: true,
    title: 'Infrastructure Hierarchy',
    ariaLabel: 'Cloud infrastructure sunburst hierarchy'
  };
</script>
```

## Common Pitfalls

- `data` is a **single `HierarchyNode` object** (NOT an array).
- Put `value` on **leaf nodes** only; parent nodes with `children` ignore their own `value` so totals are never double-counted.
