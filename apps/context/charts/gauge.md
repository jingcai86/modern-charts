# `<mc-gauge-chart>` — Radial KPI Gauge Chart

- **Tag**: `<mc-gauge-chart>`
- **Subpath Import**: `import 'modern-charts/gauge';`
- **Class / Item Exports**: `MCGaugeChart`, `MCArcItem`, `computeGaugeChartModel`, `registerGaugeChart`
- **Default Layers**: `['track', 'bands', 'valueArc', 'ticks', 'needle', 'center']`
- **Supports Markers/Thresholds**: Uses `bands` (`GaugeBand[]`) on `GaugeDatum`
- **Supports Cartesian Scales**: No (radial 270° arc scale)

## Data Schema (`GaugeDatum`)

Single KPI datum object (NOT an array).

```ts
interface GaugeBand {
  from: number;
  to: number;
  color: string;
  label?: string;
}

interface GaugeDatum {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  target?: number;
  bands?: GaugeBand[];
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `min` | `min` | `number` | `datum.min ?? 0` | Minimum gauge value |
| `max` | `max` | `number` | `datum.max ?? 100` | Maximum gauge value |
| `unit` | `unit` | `string` | `datum.unit ?? ''` | Unit suffix appended to center readout (e.g. `'%'`, `'ms'`) |

## Minimal Working Example

```html
<mc-gauge-chart id="gauge" style="width: 100%; height: 340px;"></mc-gauge-chart>
<script type="module">
  import 'modern-charts/gauge';

  document.getElementById('gauge').config = {
    data: {
      value: 78,
      min: 0,
      max: 100,
      unit: '%',
      label: 'Cluster Health',
      bands: [
        { from: 0, to: 50, color: '#ef4444', label: 'Critical' },
        { from: 50, to: 80, color: '#f59e0b', label: 'Warning' },
        { from: 80, to: 100, color: '#10b981', label: 'Healthy' }
      ]
    },
    title: 'SLO Attainment',
    ariaLabel: 'Cluster health radial gauge at 78%'
  };
</script>
```

## Common Pitfalls

- `data` is a **single `GaugeDatum` object** (NOT an array).
- `value` is automatically clamped to `[min, max]`.
- `bands[].from` and `bands[].to` must lie within `[min, max]`.
