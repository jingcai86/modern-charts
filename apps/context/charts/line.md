# `<mc-line-chart>` — Line & Area Chart

- **Tag**: `<mc-line-chart>`
- **Subpath Import**: `import 'modern-charts/line';`
- **Class / Item Exports**: `MCLineChart`, `MCLineItem`, `MCPointItem`, `computeLineChartModel`, `registerLineChart`
- **Default Layers**: `['grid', 'markers', 'axes', 'areas', 'lines', 'points', 'pointLabels', 'slices', 'legends']`
- **Supports Markers/Thresholds**: Yes (including SVG gradient threshold split along the line path!)
- **Supports Cartesian Scales & View Zoom**: Yes (`xScale: point | time | linear`, `yScale: linear | log | symlog | sqrt`)

## Data Schema (`LineSeries[]`)

Array of series objects; each has `id`, optional `color`, and `data` array of `{ x, y, label? }` points.

```ts
interface LineSeries {
  id: string;
  color?: string;
  data: Array<{ x: string | number | Date; y: number; label?: string }>;
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `curve` | `curve` | `'monotoneX' \| 'linear' \| 'catmullRom' \| 'natural' \| 'step' \| 'stepAfter' \| 'stepBefore'` | `'monotoneX'` | D3 curve interpolation |
| `enableArea` | `enable-area` | `boolean` | `false` | Fill area beneath lines |
| `areaOpacity` | `area-opacity` | `number` (`0`–`1`) | `0.18` | Area fill opacity |
| `lineWidth` | `line-width` | `number` | `2.5` | Stroke width of lines in px |
| `pointSize` | `point-size` | `number` | `8` | Diameter of data point circles in px (`0` hides dots) |
| `enablePointLabels` | `enable-point-labels` | `boolean` | `false` | Show value labels above points |
| `enableSlices` | `enable-slices` | `boolean` | `true` | Vertical hover crosshair comparing all series at X |
| `xTitle` | `x-title` | `string` | `undefined` | X-axis title |
| `yTitle` | `y-title` | `string` | `undefined` | Y-axis title |

## Minimal Working Example

```html
<mc-line-chart id="line" style="width: 100%; height: 380px;"></mc-line-chart>
<script type="module">
  import 'modern-charts/line';

  document.getElementById('line').config = {
    data: [
      {
        id: 'Revenue',
        data: [
          { x: 'Jan', y: 120 },
          { x: 'Feb', y: 145 },
          { x: 'Mar', y: 162 },
          { x: 'Apr', y: 190 }
        ]
      },
      {
        id: 'Forecast',
        data: [
          { x: 'Jan', y: 110 },
          { x: 'Feb', y: 138 },
          { x: 'Mar', y: 155 },
          { x: 'Apr', y: 175 }
        ]
      }
    ],
    curve: 'monotoneX',
    enableArea: true,
    areaOpacity: 0.2,
    yScale: { type: 'linear', stacked: false },
    title: 'Monthly Revenue vs Forecast',
    xTitle: 'Month',
    yTitle: 'USD ($K)',
    ariaLabel: 'Monthly revenue and forecast line chart'
  };
</script>
```

## Common Pitfalls

- Data MUST be grouped by series (`LineSeries[]`), NOT flat rows like `<mc-bar-chart>`.
- For stacked area charts, set both `enableArea: true` and `yScale: { stacked: true }`.
- For `Date` X values, set `xScale: { type: 'time' }`.
