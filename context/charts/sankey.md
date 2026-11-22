# `<mc-sankey-chart>` — Sankey Flow Diagram

- **Tag**: `<mc-sankey-chart>`
- **Subpath Import**: `import 'modern-charts/sankey';`
- **Class / Item Exports**: `MCSankeyChart`, `MCSankeyNodeItem`, `MCSankeyLinkItem`, `computeSankeyChartModel`, `registerSankeyChart`
- **Default Layers**: `['links', 'nodes', 'labels', 'legends']`
- **Supports Markers/Thresholds**: No
- **Supports Cartesian Scales**: No (directed acyclic graph column layout)

## Data Schema (`SankeyData`)

Object with `nodes` and `links`. Every `link.source` and `link.target` MUST match an `id` in `nodes`.

```ts
interface SankeyData {
  nodes: Array<{ id: string; name?: string; color?: string }>;
  links: Array<{ source: string; target: string; value: number; color?: string }>;
}
```

## Chart-Specific Config Options & Attributes

| `chart.config` Key | HTML Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `nodeWidth` | `node-width` | `number` | `18` | Node rectangle width in px |
| `nodePadding` | `node-padding` | `number` | `16` | Vertical gap between nodes in px |
| `linkOpacity` | `link-opacity` | `number` (`0`–`1`) | `0.42` | Default stroke opacity of gradient flow links |
| `enableLabels` | `enable-labels` | `boolean` | `true` | Render node labels next to each node |

## Minimal Working Example

```html
<mc-sankey-chart id="sankey" style="width: 100%; height: 400px;"></mc-sankey-chart>
<script type="module">
  import 'modern-charts/sankey';

  document.getElementById('sankey').config = {
    data: {
      nodes: [
        { id: 'organic', name: 'Organic Search' },
        { id: 'paid', name: 'Paid Ads' },
        { id: 'signup', name: 'Signups' },
        { id: 'pro', name: 'Pro Plan' },
        { id: 'free', name: 'Free Tier' }
      ],
      links: [
        { source: 'organic', target: 'signup', value: 420 },
        { source: 'paid', target: 'signup', value: 280 },
        { source: 'signup', target: 'pro', value: 210 },
        { source: 'signup', target: 'free', value: 490 }
      ]
    },
    nodeWidth: 18,
    nodePadding: 16,
    linkOpacity: 0.45,
    title: 'User Acquisition Funnel',
    ariaLabel: 'User acquisition Sankey flow diagram'
  };
</script>
```

## Common Pitfalls

- `links` must form a **DAG** (no cycles) and every `source` / `target` must reference an existing `nodes[].id`.
- `link.value` must be positive (`> 0`).
