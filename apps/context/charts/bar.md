# `<mc-bar-chart>` — Bar & Stack Chart

- **Tag**: `<mc-bar-chart>`
- **Subpath Import**: `import 'modern-charts/bar';`
- **Class / Item Exports**: `MCBarChart`, `MCBarItem`, `computeBarChartModel`, `registerBarChart`
- **Default Layers**: `['grid', 'axes', 'bars', 'markers', 'labels', 'legends']`
- **Supports Markers/Thresholds**: Yes (`y` axis in vertical layout, `x` axis in horizontal layout)
- **Supports Cartesian Scales & View Zoom**: Yes (`xScale: band`, `yScale: linear`)

## Data Schema (`BarDatum[]`)

Array of flat objects where one key is the category (`indexBy`) and one or more keys hold numeric values (`keys`).

```ts
type BarDatum = Record<string, string | number>;
// Example:
const data: BarDatum[] = [
  { quarter: 'Q1', Cloud: 142, Edge: 94, OnPrem: 78 },
  { quarter: 'Q2', Cloud: 168, Edge: 118, OnPrem: 72 },
  { quarter: 'Q3', Cloud: 196, Edge: 145, OnPrem: 64 },
  { quarter: 'Q4', Cloud: 234, Edge: 172, OnPrem: 58 }
];
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `indexBy` | `index-by` | `string` | `'category'` | Category property key in each datum |
| `keys` | `keys` (comma-separated) | `string[]` | numeric keys inferred from row 0 | Series keys to plot |
| `groupMode` | `group-mode` | `'grouped' \| 'stacked'` | `'grouped'` | Side-by-side or stacked bars |
| `layout` | `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | Bar orientation |
| `borderRadius` | `border-radius` | `number` | `5` | Corner radius (`rx`) in px |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Render value labels centered inside bars (coexists with `outerLabels`) |
| `outerLabels` | `enable-outer-labels`, `outer-label-scope`, `outer-label-position`, `negative-label-position`, `outer-label-padding` | `boolean \| BarOuterLabelConfig` | `{ enabled: false, scope: 'auto', position: 'auto', negativePosition: 'outside-bottom', padding: 8 }` | Outer / stack-summary labels above positive bars/stacks and below negative bars (`outside-bottom` \| `chart-bottom` \| `above-zero`); customizable via `formatter`, `renderer`, or `<mc-label for="bar-outer">` |
| `xTitle` | `x-title` | `string` | `undefined` | X-axis title |
| `yTitle` | `y-title` | `string` | `undefined` | Y-axis title |

## Minimal Working Example

```html
<mc-bar-chart id="bar" style="width: 100%; height: 380px;"></mc-bar-chart>
<script type="module">
  import 'modern-charts/bar';

  document.getElementById('bar').config = {
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 94 },
      { quarter: 'Q2', Cloud: 168, Edge: 118 },
      { quarter: 'Q3', Cloud: 196, Edge: 145 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    groupMode: 'grouped',
    layout: 'vertical',
    title: 'Quarterly Spend ($K)',
    xTitle: 'Quarter',
    yTitle: 'Spend ($K)',
    palette: 'shadcn',
    markers: [
      {
        id: 'floor',
        type: 'line',
        axis: 'y',
        value: 100,
        label: 'Target $100K',
        annotation: { text: '$100K', position: 'right', padding: 8 },
        legend: true,
        stroke: '#ef4444',
        condition: 'below',
        matchStyle: { color: '#ef4444' }
      }
    ],
    ariaLabel: 'Quarterly Cloud vs Edge Spend'
  };
</script>
```

## Common Pitfalls

- Always set `indexBy` to match your category field name (default is `'category'`; omitting it when your rows use `'quarter'` or `'month'` will leave X-axis labels blank).
- For horizontal bars, set `layout: 'horizontal'` — `modern-charts` automatically swaps the band and linear scales.
