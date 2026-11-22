# `<mc-radar-chart>` — Radar / Spider Chart

- **Tag**: `<mc-radar-chart>`
- **Subpath Import**: `import 'modern-charts/radar';`
- **Class / Item Exports**: `MCRadarChart`, `MCRadarItem`, `computeRadarChartModel`, `registerRadarChart`
- **Default Layers**: `['grid', 'axes', 'layers', 'dots', 'labels', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Cartesian Scales**: No (polar radial scale)

## Data Schema (`RadarDatum[]`)

Array of metric rows where `indexBy` names the radial spoke/axis and `keys` are the series compared across every spoke.

```ts
type RadarDatum = Record<string, string | number>;
// Example:
const data: RadarDatum[] = [
  { metric: 'Speed', ModelA: 92, ModelB: 78 },
  { metric: 'Accuracy', ModelA: 88, ModelB: 94 },
  { metric: 'Cost', ModelA: 84, ModelB: 70 },
  { metric: 'Context', ModelA: 95, ModelB: 82 },
  { metric: 'Safety', ModelA: 90, ModelB: 89 }
];
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `indexBy` | `index-by` | `string` | `'metric'` | Property naming each spoke axis |
| `keys` | `keys` (comma-separated) | `string[]` | numeric keys inferred from row 0 | Series polygons to plot |
| `gridLevels` | `grid-levels` | `number` | `5` | Concentric grid rings |
| `gridShape` | `grid-shape` | `'circular' \| 'linear'` | `'circular'` | Circular rings vs polygonal web |
| `fillOpacity` | `fill-opacity` | `number` (`0`–`1`) | `0.24` | Polygon fill opacity |
| `enableDots` | `enable-dots` | `boolean` | `true` | Render dots at polygon vertices |
| `enableDotLabels` | `enable-dot-labels` | `boolean` | `false` | Render numeric value labels at dots |
| — | `max-value` | `number` | auto max | Fixed outer radial max value |

## Minimal Working Example

```html
<mc-radar-chart id="radar" style="width: 100%; height: 400px;"></mc-radar-chart>
<script type="module">
  import 'modern-charts/radar';

  document.getElementById('radar').config = {
    data: [
      { metric: 'Speed', Alpha: 92, Beta: 76 },
      { metric: 'Quality', Alpha: 88, Beta: 95 },
      { metric: 'Efficiency', Alpha: 85, Beta: 72 },
      { metric: 'Reliability', Alpha: 94, Beta: 89 },
      { metric: 'UX', Alpha: 90, Beta: 84 }
    ],
    indexBy: 'metric',
    keys: ['Alpha', 'Beta'],
    gridShape: 'circular',
    gridLevels: 5,
    fillOpacity: 0.25,
    title: 'Benchmark Profile',
    ariaLabel: 'Alpha vs Beta radar benchmark'
  };
</script>
```

## Common Pitfalls

- The polygon layer is named `'layers'` (NOT `'polygons'`) in `defaultLayers`: `['grid', 'axes', 'layers', 'dots', 'labels', 'legends']`.
- Always provide at least 3 rows (axes) for a readable polygon.
