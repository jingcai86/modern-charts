import type {
  BarDatum,
  ChartConfig,
  ChartRenderContext,
  MCBaseChart,
  MCCustomLayer,
  ThemeModePreference
} from '../../../src/index';
import { CHART_CATALOG, type ChartCatalogEntry } from '../catalog';
import { BAR_CHART_ENTRY } from '../catalog/charts/bar';
import { getGlobalPalette } from '../state/theme';
import { formatConfigAsJsObject } from '../utils/code-sync';
import { createCodeBlock, createLiveConfigEditor } from './shared';

type SizingConfig = Pick<ChartConfig, 'autoSize' | 'width' | 'height' | 'margin'>;

const comparisonImage = new URL('./assets/auto-size-comparison.svg', import.meta.url).href;
const anatomyImage = new URL('./assets/auto-size-anatomy.svg', import.meta.url).href;
const flowImage = new URL('./assets/auto-size-flow.svg', import.meta.url).href;

const legendKeys = ['North America Enterprise Sales', 'Europe Commercial Sales', 'Asia Pacific Online Sales'];
const workedBarConfig: ChartConfig<BarDatum[]> = {
  autoSize: true,
  data: [
    { quarter: 'Q1', [legendKeys[0]]: 50, [legendKeys[1]]: 25, [legendKeys[2]]: 75 },
    { quarter: 'Q2', [legendKeys[0]]: 75, [legendKeys[1]]: 50, [legendKeys[2]]: 100 }
  ],
  indexBy: 'quarter',
  keys: legendKeys,
  colors: ['#2563eb', '#10b981', '#f59e0b'],
  layout: 'vertical',
  groupMode: 'grouped',
  padding: 0.2,
  innerPadding: 2,
  theme: { fontFamily: 'Arial' },
  margin: { top: 24, right: 30, bottom: 112, left: 50 },
  yScale: { type: 'linear', min: 0, max: 100, nice: false, tickCount: 2 },
  legend: {
    position: 'bottom',
    wrap: true,
    fontSize: 12,
    padding: { top: 4, right: 12, bottom: 4, left: 12 },
    maxItemWidth: 110
  },
  label: { target: 'legend', overflow: 'wrap', maxLines: 2 },
  enableLabels: false,
  animate: false,
  layers: ['axes', 'bars', 'legends']
};

const responsiveExample = `
<div id="chart-container" style="width: 600px; height: 320px;">
  <mc-bar-chart id="sales-chart"></mc-bar-chart>
</div>
<button id="resize-chart" type="button">Toggle width between 600 and 360 px</button>

<script type="module">
  import 'modern-charts/bar';

  const container = document.getElementById('chart-container');
  const chart = document.getElementById('sales-chart');
  // Reload with autoSize set to false to compare.
  chart.setConfig(${formatConfigAsJsObject(workedBarConfig, 2)});

  document.getElementById('resize-chart').addEventListener('click', () => {
    container.style.width = container.style.width === '600px' ? '360px' : '600px';
  });
</script>
`;

export function renderAutoSizeGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const comparison = document.createElement('section');
  comparison.className = 'panel-card guide-section';
  comparison.innerHTML = `
    <h2 class="panel-title">Resize the same chart and legend</h2>
    <p class="guide-prose">
      The grouped bar chart shows three sales series for Q1 and Q2. Both settings
      first draw it in a 600 × 320 px container. The width then shrinks to 360 px.
    </p>
    <figure class="auto-size-figure">
      <a href="${comparisonImage}" target="_blank" rel="noopener">
        <img src="${comparisonImage}" alt="The same grouped bar chart and legend at 600 and 360 pixels. AutoSize narrows the bars and moves the third legend entry to a second row. With AutoSize off, the browser scales the original bars and one-row legend to 60 percent." />
      </a>
      <figcaption class="guide-prose">
        The CSS box is the screen space available to the chart. The SVG <code>viewBox</code>
        defines the coordinates used to draw it. Open the image to see the annotations at full size.
      </figcaption>
    </figure>
    <ul class="guide-prose auto-size-steps">
      <li><strong>On.</strong> The chart recalculates the <code>viewBox</code> at 360 × 320.
        The plot goes from 520 × 184 to 280 × 184, the bars get narrower, and the
        legend reflows from one row to two.</li>
      <li><strong>Off.</strong> The browser fits the original 600 × 320 drawing, including
        the one-row legend, into 360 × 192 px at <code>360 ÷ 600 = 0.6</code> scale.
        It centers that drawing with 64 px above and below.
        Call <code>chart.resize()</code> to redraw at the new size.</li>
    </ul>
    <details class="auto-size-example">
      <summary>Copy the example</summary>
    </details>
  `;
  comparison.querySelector('details')!.append(createCodeBlock(responsiveExample, 'Bar chart resize example'));

  const calculations = document.createElement('section');
  calculations.className = 'panel-card guide-section';
  calculations.innerHTML = `
    <h2 class="panel-title">Calculate the resized chart and legend</h2>
    <figure class="auto-size-figure">
      <a href="${anatomyImage}" target="_blank" rel="noopener">
        <img src="${anatomyImage}" alt="The 360 by 320 SVG with its 280 by 184 plot, two groups of three bars, and two centered legend rows in the 112-unit bottom margin. The first Q1 bar starts at plot coordinates 14, 92 and measures 36 by 92." />
      </a>
      <figcaption class="guide-prose">
        The annotated chart uses the 360 × 320 layout with <code>autoSize</code> on.
        Coordinates for axes and bars are measured from the plot origin unless marked as SVG coordinates.
      </figcaption>
    </figure>
    <ol class="guide-prose auto-size-steps">
      <li><strong>Measure the SVG.</strong> The chart host fills its container, so the
        outside dimensions resolve to 360 × 320. The SVG uses <code>viewBox="0 0 360 320"</code>.</li>
      <li><strong>Reserve margins.</strong> Top 24, right 30, bottom 112, and left 50 give
        a plot of <code>360 − 50 − 30 = 280</code> by <code>320 − 24 − 112 = 184</code>.
        Plot <code>(0, 0)</code> is SVG <code>(50, 24)</code>. The bottom margin reserves
        24 units for the axis, 80 for two legend rows, and 8 below the legend.</li>
      <li><strong>Map the categories.</strong> The X band scale maps Q1 and Q2 across
        <code>[0, 280]</code>. Inner padding is 0.2 and outer padding is 0.1.
        The step is <code>280 ÷ (2 − 0.2 + 2 × 0.1) = 140</code>. Each band is
        <code>140 × 0.8 = 112</code> wide. Q1 starts at <code>140 × 0.1 = 14</code>.
        Q2 starts at <code>14 + 140 = 154</code>. Their X ticks sit at band centers, 70 and 210.</li>
      <li><strong>Map the values.</strong> The Y scale maps <code>[0, 100]</code> onto
        <code>[184, 0]</code>. SVG Y increases downward, so <code>y(v) = 184 × (1 − v ÷ 100)</code>.
        The left axis puts 100, 50, and 0 at Y positions 0, 92, and 184.
        The bottom axis and zero baseline sit at <code>y = 184</code>.</li>
      <li><strong>Calculate the bar rectangles.</strong> Each band holds three bars and two
        2-unit gaps. Bar width changes from <code>(208 − 4) ÷ 3 = 68</code> to
        <code>(112 − 4) ÷ 3 = 36</code>. At 360 px, each group starts at its band position
        and each successive bar starts 38 units later. A bar's top is <code>y(value)</code>
        and its height is <code>184 − y(value)</code>.</li>
    </ol>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th scope="col">Quarter and series</th><th scope="col">Value</th><th scope="col">Plot (x, y)</th><th scope="col">Width × height</th></tr></thead>
        <tbody>
          <tr><th scope="row">Q1 North America</th><td>50</td><td>(14, 92)</td><td>36 × 92</td></tr>
          <tr><th scope="row">Q1 Europe</th><td>25</td><td>(52, 138)</td><td>36 × 46</td></tr>
          <tr><th scope="row">Q1 Asia Pacific</th><td>75</td><td>(90, 46)</td><td>36 × 138</td></tr>
          <tr><th scope="row">Q2 North America</th><td>75</td><td>(154, 46)</td><td>36 × 138</td></tr>
          <tr><th scope="row">Q2 Europe</th><td>50</td><td>(192, 92)</td><td>36 × 92</td></tr>
          <tr><th scope="row">Q2 Asia Pacific</th><td>100</td><td>(230, 0)</td><td>36 × 184</td></tr>
        </tbody>
      </table>
    </div>
    <ol class="guide-prose auto-size-steps" start="6">
      <li><strong>Measure and wrap the legend labels.</strong> With <code>legend.maxItemWidth</code>
        set to 110 and <code>label: { target: 'legend', overflow: 'wrap', maxLines: 2 }</code>,
        Pretext measures each label and wraps it to up to two lines. The fixed width
        limit gives the same line breaks at both chart widths. Adding the 10-unit swatch
        and 5-unit gap gives measured entry widths of 104, 122, and 116 units with Arial at 12 px.</li>
      <li><strong>Pack and place the legend.</strong> Subtracting 12 units of padding on each
        side leaves 496 units at 600 px and 256 at 360 px. With <code>legend.wrap: true</code>,
        the three entries and their gaps fit in one 370-unit row at 600 px. At 360 px the
        first row takes <code>104 + 14 + 122 = 240</code> units, and the third entry sits in
        a centered second row. The rows use <code>32 + 8 + 32 + 8 = 80</code> units,
        including the gap and vertical padding. They fill the legend slot starting at SVG
        <code>(50, 232)</code>. At 600 px the single row fits at SVG <code>(50, 252)</code>,
        centered vertically in the same slot.</li>
    </ol>
    <p class="guide-prose">
      Whole-entry wrapping uses the plot width for top and bottom legends and the
      plot height for left and right legends. <code>legend.wrap: false</code> keeps the
      entries in one row or column while the label overflow setting still controls
      line breaks. Reserve enough margin for the rows or columns your chart needs.
    </p>
  `;

  const flow = document.createElement('section');
  flow.className = 'panel-card guide-section';
  flow.innerHTML = `
    <h2 class="panel-title">When calculations run</h2>
    <figure class="auto-size-figure">
      <a href="${flowImage}" target="_blank" rel="noopener">
        <img src="${flowImage}" alt="Flow chart from a resize or manual redraw through size, margins, scales, and bar rectangles. Then the legend wraps the labels, packs and centers the entries in rows, and draws the result." />
      </a>
      <figcaption class="guide-prose">
        Both settings calculate on the first draw. On later CSS resizes, <code>autoSize</code>
        uses <code>ResizeObserver</code> to check the host and its parent. A change in resolved
        width or height repeats the layout. Explicit redraws such as <code>chart.resize()</code>
        work with either setting. In this example the model computes the scales and bar
        rectangles. The renderer draws axes and bars, then measures the legend text,
        packs the rows, and draws the legend in the reserved bottom margin.
      </figcaption>
    </figure>
  `;

  const layout = document.createElement('section');
  layout.className = 'panel-card guide-section';
  layout.innerHTML = `
    <h2 class="panel-title">Sizing rules for any chart</h2>
    <p class="guide-prose">
      Set <code>autoSize: true</code> in the chart config or add the HTML
      <code>auto-size</code> attribute. Give the container a width and a height
      with CSS. All ten chart types share these rules.
    </p>
    <ul class="guide-prose auto-size-steps">
      <li>Resolve width and height independently. Use the first positive value from
        config, a numeric attribute, the measured host, or the measured parent.</li>
      <li>When none of those provides a size, width falls back to 640 px. Height falls
        back to the greater of 280 px and 56% of width with <code>autoSize</code> on, or
        380 px with it off. The SVG dimensions are rounded and clamped to at least
        160 × 140. The host has a separate 240 px CSS minimum height by default.</li>
      <li>Merge default margins with <code>config.margin</code>, then apply the HTML
        <code>margin</code> attribute. Top or right axes, outside marker annotations,
        and legends can reserve extra space. Plot width and height each have a
        40-unit minimum.</li>
    </ul>
  `;

  const demo = document.createElement('section');
  demo.className = 'panel-card guide-section';
  demo.innerHTML = `
    <h2 class="panel-title">Resize the container</h2>
    <p class="guide-prose">
      The bar chart starts at 600 × 320 px with the data and legend shown above.
      Move the width slider to 360 px to see the third entry wrap to a second row.
      To compare, return to 600 px and set <code>autoSize: false</code> in the editor
      before moving the slider again. The dotted outline marks the plot area.
    </p>
    <div class="guide-controls-row auto-size-controls">
      <label for="auto-size-chart">
        Chart <select id="auto-size-chart"></select>
      </label>
      <label for="auto-size-width">
        Width <input id="auto-size-width" type="range" min="360" max="600" step="20" value="600" />
        <span id="auto-size-width-value" aria-hidden="true">600 px</span>
      </label>
      <label for="auto-size-height">
        Height <input id="auto-size-height" type="range" min="240" max="520" step="20" value="320" />
        <span id="auto-size-height-value" aria-hidden="true">320 px</span>
      </label>
    </div>
    <div class="guide-example-grid">
      <div class="auto-size-preview" role="region" aria-label="Chart preview" tabindex="0">
        <div class="guide-chart-stage auto-size-stage" id="auto-size-stage"></div>
      </div>
      <div id="auto-size-editor"></div>
    </div>
    <output id="auto-size-dimensions" class="guide-prose"
      for="auto-size-chart auto-size-width auto-size-height"></output>
  `;

  const positioning = document.createElement('section');
  positioning.className = 'panel-card guide-section';
  positioning.innerHTML = `
    <h2 class="panel-title">How each chart uses the plot</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th scope="col">Chart</th><th scope="col">Positioning</th></tr></thead>
        <tbody>
          <tr><th scope="row">Line and Scatter</th><td>X scales map across the plot width. Y scales map from the bottom to the top. Lines connect points in those coordinates.</td></tr>
          <tr><th scope="row">Bar</th><td>A band scale allocates categories. A value scale positions each bar from its baseline or stacked offset. Horizontal bars swap the category and value axes.</td></tr>
          <tr><th scope="row">Heatmap</th><td>Column and row bands span the width and height. Cells are centered in their bands. Square cells use the smaller bandwidth for both sides.</td></tr>
          <tr><th scope="row">Pie</th><td>Slices meet at the plot midpoint. The smaller plot dimension sets the basis for the outer radius, and each value contributes to a slice's angle.</td></tr>
          <tr><th scope="row">Radar</th><td>Spokes start at the plot midpoint. Axes are evenly spaced by angle. Values map to distances along the spokes, with room for grid labels reserved from the radius.</td></tr>
          <tr><th scope="row">Sunburst</th><td>The hierarchy is partitioned into angles by value and rings by depth, centered on the plot midpoint.</td></tr>
          <tr><th scope="row">Gauge</th><td>Values map to angles. Width and height constrain the dial radius. The sweep, bands, and subtitle determine the vertical fit.</td></tr>
          <tr><th scope="row">Treemap</th><td>The hierarchy is tiled into rectangles within the plot. A drill-down breadcrumb uses vertical space before tiling the remaining height.</td></tr>
          <tr><th scope="row">Sankey</th><td>Stages spread along the flow axis. Nodes stack across the other axis with padding, and node spans and link widths scale with flow values.</td></tr>
        </tbody>
      </table>
    </div>
    <p class="guide-prose">
      <a href="https://github.com/jingcai86/modern-charts/wiki/AutoSize">AutoSize reference</a>
      · <a href="#/guide/custom-layers">Custom layers guide</a>
    </p>
  `;

  container.append(comparison, calculations, flow, demo, layout, positioning);

  const chartSelect = demo.querySelector<HTMLSelectElement>('#auto-size-chart')!;
  const widthInput = demo.querySelector<HTMLInputElement>('#auto-size-width')!;
  const heightInput = demo.querySelector<HTMLInputElement>('#auto-size-height')!;
  const widthValue = demo.querySelector('#auto-size-width-value')!;
  const heightValue = demo.querySelector('#auto-size-height-value')!;
  const stage = demo.querySelector<HTMLElement>('#auto-size-stage')!;
  const readout = demo.querySelector('#auto-size-dimensions')!;

  const resizeStage = () => {
    stage.style.width = widthInput.value + 'px';
    stage.style.height = heightInput.value + 'px';
    widthValue.textContent = widthInput.value + ' px';
    heightValue.textContent = heightInput.value + ' px';
    widthInput.setAttribute('aria-valuetext', widthValue.textContent);
    heightInput.setAttribute('aria-valuetext', heightValue.textContent);
  };
  widthInput.addEventListener('input', resizeStage);
  heightInput.addEventListener('input', resizeStage);
  resizeStage();

  const renderPlotBounds = (ctx: ChartRenderContext) => {
    const { width, height, innerWidth, innerHeight, margin } = ctx;
    const measurement =
      `SVG ${width} × ${height} px · Plot ${innerWidth} × ${innerHeight} px · ` +
      `Margins (top/right/bottom/left) ${margin.top}/${margin.right}/${margin.bottom}/${margin.left} px`;
    if (readout.textContent !== measurement) readout.textContent = measurement;

    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('width', String(innerWidth));
    outline.setAttribute('height', String(innerHeight));
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', ctx.theme.mutedTextColor);
    outline.setAttribute('stroke-dasharray', '3 3');
    outline.setAttribute('vector-effect', 'non-scaling-stroke');
    outline.setAttribute('pointer-events', 'none');
    outline.setAttribute('aria-hidden', 'true');
    return outline;
  };

  const charts: MCBaseChart<any>[] = [];
  let entry = BAR_CHART_ENTRY;
  let sizing: SizingConfig = { autoSize: true };
  const applySizing = () => {
    const chartConfig = entry === BAR_CHART_ENTRY ? workedBarConfig : entry.createDefaultConfig(themeMode);
    charts[0].setConfig({
      ...chartConfig,
      width: sizing.width,
      height: sizing.height,
      margin: sizing.margin ?? chartConfig.margin,
      autoSize: sizing.autoSize === true,
      animate: false,
      isInteractive: false,
      themeMode,
      palette: getGlobalPalette()
    });
  };

  const mountChart = (nextEntry: ChartCatalogEntry) => {
    entry = nextEntry;
    const chart = document.createElement(entry.tagName) as MCBaseChart<any>;
    const boundsLayer = document.createElement('mc-custom-layer') as MCCustomLayer;
    boundsLayer.setAttribute('name', 'plot-bounds');
    boundsLayer.renderer = renderPlotBounds;
    chart.append(boundsLayer);
    chart.setAttribute('data-defer-initial-render', '');
    charts[0] = chart;
    stage.replaceChildren(chart);
    applySizing();
    chart.removeAttribute('data-defer-initial-render');
    chart.render();
  };

  for (const option of CHART_CATALOG) {
    const element = document.createElement('option');
    element.value = option.id;
    element.textContent = option.title;
    chartSelect.append(element);
  }
  chartSelect.value = entry.id;
  chartSelect.addEventListener('change', () => {
    const nextEntry = CHART_CATALOG.find((option) => option.id === chartSelect.value);
    if (nextEntry) mountChart(nextEntry);
  });

  const editor = createLiveConfigEditor({
    title: 'Chart sizing',
    initialConfig: sizing,
    hint: 'Edit autoSize, width, height, or margin to compare layout behavior.',
    onConfigChange(nextSizing) {
      sizing = nextSizing;
      applySizing();
    }
  });
  demo.querySelector('#auto-size-editor')!.append(editor.element);
  mountChart(entry);
  return charts;
}
