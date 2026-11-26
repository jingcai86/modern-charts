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

## Heatmap Color Legend

Set `chart.config.legend` or add a direct `<mc-legend>` child. Continuous mode uses a smooth gradient. Discrete mode divides the color domain into `steps` equal ranges and gives the cells and their legend blocks the same colors.

| Config key under `legend` | `<mc-legend>` attribute | Behavior |
| :--- | :--- | :--- |
| `type` | `type` | `'continuous'` (default) or `'discrete'`. |
| `enabled` | `enabled` | Show the color legend. Defaults to `true`. |
| `steps` | `steps` | Number of discrete color blocks (`1`–`100`). Defaults to `10`. |
| `min`, `max` | `min`, `max` | Override the shared color domain. Otherwise, the chart bounds or the data bounds apply. |
| `colorScheme` | `color-scheme` | Override the ramp for both the cells and the legend. |
| `position` | `position` | `'top'` (default), `'bottom'`, `'left'`, or `'right'`. |
| `width`, `height` | `width`, `height` | Requested SVG dimensions in pixels, bounded by available space. Omit for position-specific sizing. |
| `borderRadius`, `blockGap` | `border-radius`, `block-gap` | Corner radius (default `4px`) and spacing between discrete blocks (default `2px`). Both accept `0`. |
| `labelPlacement` | `label-placement` | `'ends'` (default), `'ticks'` for discrete range boundaries, or `'none'`. Continuous mode uses end labels unless set to `'none'`. |
| `minLabel`, `maxLabel` | `min-label`, `max-label` | Custom text at the ends of the legend. |
| `tickFormat` | `tick-format` | Locale-aware `Intl.NumberFormatOptions`, such as `{ maximumFractionDigits: 1 }`. Use a JSON object in HTML. JavaScript also accepts `(value) => string`. |
| `fontSize`, `padding` | `font-size`, `padding` | Label font size (default `10px`) and outer spacing in pixels. Config padding accepts a number or an object with `top`, `right`, `bottom`, and `left`. |
| `enableTooltip`, `tooltip` | `enable-tooltip`, nested `<mc-tooltip>` | Show a dedicated legend tooltip on hover and keyboard focus. Set `enableTooltip: false` or `tooltip: false` to hide it. |

Each discrete range includes its lower bound and excludes its upper bound. The last range also includes the domain maximum. Values outside the domain take the nearest end color. Set `legend.enabled: false` or remove `'legends'` from `layers` to hide the legend while keeping the cell colors.

Each discrete legend tooltip receives the range on `datum.meta`, with numeric `min`, `max`, and boolean `maxInclusive`.

```ts
chart.config = {
  ...chart.config,
  legend: {
    type: 'discrete',
    position: 'bottom',
    min: 0,
    max: 100,
    steps: 5,
    width: 240,
    height: 14,
    borderRadius: 3,
    blockGap: 2,
    labelPlacement: 'ticks',
    tickFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
    tooltip: {
      formatter: ({ datum }) => {
        const range = datum?.meta;
        if (!range) return undefined;
        return `${range.min}% ≤ load ${range.maxInclusive ? '≤' : '<'} ${range.max}%`;
      }
    }
  }
};
```

The corresponding declarative legend goes inside `<mc-heatmap-chart>`.

```html
<mc-legend type="discrete" position="bottom" min="0" max="100" steps="5"
  width="240" height="14" border-radius="3" block-gap="2"
  label-placement="ticks"
  tick-format='{"minimumFractionDigits":1,"maximumFractionDigits":1}'></mc-legend>
```

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
