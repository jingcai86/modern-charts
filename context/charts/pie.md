# `<mc-pie-chart>` — Pie & Donut Chart

- **Tag**: `<mc-pie-chart>`
- **Subpath Import**: `import 'modern-charts/pie';`
- **Class / Item Exports**: `MCPieChart`, `MCArcItem`, `computePieChartModel`, `registerPieChart`
- **Default Layers**: `['arcs', 'arcLabels', 'arcLinkLabels', 'center', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Cartesian Scales**: No

## Data Schema (`PieDatum[]`)

```ts
interface PieDatum {
  id: string;
  label?: string;
  value: number;
  color?: string;
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `innerRadius` | `inner-radius` | `number` (`0`–`0.9`) | `0.52` | Inner hole ratio (`0` = full pie, `0.52` = donut) |
| `padAngle` | `pad-angle` | `number` (degrees) | `~1.15` (`0.02 rad`) | Angular gap between slices |
| `cornerRadius` | `corner-radius` | `number` | `5` | Rounded corner radius on slice arcs |
| `centerLabel` | `center-label` | `string` | `'Total\n<sum>'` | Center text inside donut hole (shown when inner radius >= 25px) |
| — | `enable-arc-labels` | `boolean` | `true` | Percentage labels inside slices |
| — | `enable-arc-link-labels` | `boolean` | `true` | External callout leader lines & labels |

## Minimal Working Example

```html
<mc-pie-chart id="pie" style="width: 100%; height: 380px;"></mc-pie-chart>
<script type="module">
  import 'modern-charts/pie';

  document.getElementById('pie').config = {
    data: [
      { id: 'Compute', label: 'Compute', value: 420 },
      { id: 'Storage', label: 'Storage', value: 260 },
      { id: 'Network', label: 'Network', value: 180 },
      { id: 'AI', label: 'AI / GPU', value: 340 }
    ],
    innerRadius: 0.56,
    cornerRadius: 6,
    padAngle: 2,
    title: 'Cloud Cost Breakdown',
    palette: 'modern',
    ariaLabel: 'Cloud cost breakdown donut chart'
  };
</script>
```

## Common Pitfalls

- `innerRadius` is a **ratio** between `0` and `0.9` (not pixels). Use `0` for a solid pie or `0.5`–`0.7` for a donut.
- Ensure negative values are not passed (slices clamp `value` at `>= 0`).
