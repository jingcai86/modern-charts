# `<mc-scatter-chart>` — Scatter & Bubble Chart

- **Tag**: `<mc-scatter-chart>`
- **Subpath Import**: `import 'modern-charts/scatter';`
- **Class / Item Exports**: `MCScatterChart`, `MCScatterItem`, `computeScatterChartModel`, `registerScatterChart`
- **Default Layers**: `['grid', 'markers', 'axes', 'trendline', 'nodes', 'labels', 'legends']`
- **Supports Markers/Thresholds**: Yes (`y` axis threshold restyling)
- **Supports Cartesian Scales & View Zoom**: Yes (`xScale: linear`, `yScale: linear`)

## Data Schema (`ScatterSeries[]`)

Array of series objects; each point has numeric `x`, `y`, optional `size` (maps via `scaleSqrt` to bubble radius), and optional `label` / `id`.

```ts
interface ScatterSeries {
  id: string;
  color?: string;
  data: Array<{ x: number; y: number; size?: number; label?: string; id?: string }>;
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `minNodeSize` | `min-node-size` | `number` | `6` | Minimum circle radius in px |
| `maxNodeSize` | `max-node-size` | `number` | `18` | Maximum circle radius in px (used when `point.size` is provided) |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Show point labels when `point.label` or `point.id` is set |
| `enableTrendline` | `enable-trendline` | `boolean` | `false` | Overlay ordinary least-squares linear regression line |
| `xTitle` | `x-title` | `string` | `undefined` | X-axis title |
| `yTitle` | `y-title` | `string` | `undefined` | Y-axis title |

## Minimal Working Example

```html
<mc-scatter-chart id="scatter" style="width: 100%; height: 400px;"></mc-scatter-chart>
<script type="module">
  import 'modern-charts/scatter';

  document.getElementById('scatter').config = {
    data: [
      {
        id: 'Cluster A',
        data: [
          { x: 18, y: 42, size: 120, label: 'Svc-1' },
          { x: 35, y: 68, size: 240, label: 'Svc-2' },
          { x: 52, y: 84, size: 190, label: 'Svc-3' }
        ]
      },
      {
        id: 'Cluster B',
        data: [
          { x: 26, y: 31, size: 90, label: 'Svc-4' },
          { x: 64, y: 76, size: 310, label: 'Svc-5' }
        ]
      }
    ],
    enableTrendline: true,
    minNodeSize: 6,
    maxNodeSize: 18,
    title: 'Latency vs Throughput',
    xTitle: 'Throughput (kRPS)',
    yTitle: 'P95 Latency (ms)',
    ariaLabel: 'Latency vs throughput scatter bubble chart'
  };
</script>
```

## Common Pitfalls

- Both `x` and `y` must be numeric (`number`).
- To render a uniform scatter plot (fixed radii), omit `size` on points or set `minNodeSize === maxNodeSize`.
