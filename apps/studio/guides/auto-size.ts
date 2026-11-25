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
const legendImage = new URL('./assets/auto-size-legend.svg', import.meta.url).href;

const workedBarConfig: ChartConfig<BarDatum[]> = {
  autoSize: true,
  data: [
    { quarter: 'Q1', sales: 50 },
    { quarter: 'Q2', sales: 75 }
  ],
  indexBy: 'quarter',
  keys: ['sales'],
  layout: 'vertical',
  groupMode: 'grouped',
  padding: 0.2,
  margin: { top: 24, right: 30, bottom: 56, left: 50 },
  yScale: { type: 'linear', min: 0, max: 100, nice: false, tickCount: 2 },
  legend: { enabled: false },
  enableLabels: false,
  animate: false,
  layers: ['axes', 'bars']
};

const responsiveExample = `
<div id="chart-container" style="width: 600px; height: 320px;">
  <mc-bar-chart id="sales-chart"></mc-bar-chart>
</div>
<button id="shrink-chart" type="button">Shrink to 360 px</button>

<script type="module">
  import 'modern-charts/bar';

  const chart = document.getElementById('sales-chart');
  // Reload with autoSize set to false to compare.
  chart.setConfig(${formatConfigAsJsObject(workedBarConfig, 2)});

  document.getElementById('shrink-chart').addEventListener('click', () => {
    document.getElementById('chart-container').style.width = '360px';
  });
</script>
`;

const legendKeys = ['North America Enterprise Sales', 'Europe Commercial Sales', 'Asia Pacific Online Sales'];
const legendExampleConfig: ChartConfig<BarDatum[]> = {
  ...workedBarConfig,
  data: [
    { quarter: 'Q1', [legendKeys[0]]: 40, [legendKeys[1]]: 55, [legendKeys[2]]: 68 },
    { quarter: 'Q2', [legendKeys[0]]: 53, [legendKeys[1]]: 63, [legendKeys[2]]: 75 }
  ],
  keys: legendKeys,
  themeMode: 'light',
  theme: { fontFamily: 'Arial' },
  margin: { top: 24, right: 30, bottom: 112, left: 50 },
  legend: {
    position: 'bottom',
    wrap: true,
    fontSize: 12,
    padding: { top: 4, right: 12, bottom: 4, left: 12 },
    maxItemWidth: 110
  },
  label: { target: 'legend', overflow: 'wrap', maxLines: 2 },
  layers: ['axes', 'bars', 'legends']
};

const legendExample = `
<div id="legend-container" style="width: 600px; height: 320px;">
  <mc-bar-chart id="legend-chart"></mc-bar-chart>
</div>
<button id="resize-legend" type="button">Toggle width between 600 and 360 px</button>

<script type="module">
  import 'modern-charts/bar';

  const container = document.getElementById('legend-container');
  const chart = document.getElementById('legend-chart');
  chart.setConfig(${formatConfigAsJsObject(legendExampleConfig, 2)});

  document.getElementById('resize-legend').addEventListener('click', () => {
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
    <h2 class="panel-title">Same bar chart, narrower container</h2>
    <p class="guide-prose">
      Q1 is 50 and Q2 is 75. Both charts first draw in a 600 × 320 px container.
      Then the container shrinks to 360 × 320 px, with the data and height held constant.
    </p>
    <figure class="auto-size-figure">
      <a href="${comparisonImage}" target="_blank" rel="noopener">
        <img src="${comparisonImage}" alt="Both charts start at 600 by 320. In a 360 by 320 container, autoSize on redraws the plot at 280 by 240. AutoSize off keeps the starting geometry and fits it at 60 percent scale." />
      </a>
      <figcaption class="guide-prose">
        The CSS box is the screen space available to the chart. The SVG <code>viewBox</code>
        defines the coordinates used to draw it. Open the image to see the annotations at full size.
      </figcaption>
    </figure>
    <ul class="guide-prose auto-size-steps">
      <li><strong>On.</strong> The chart recalculates the <code>viewBox</code> at 360 × 320.
        The plot narrows from 520 to 280 units while its height stays 240.</li>
      <li><strong>Off.</strong> On a CSS resize alone, the previous 600 × 320 <code>viewBox</code>
        and bar coordinates stay in place. The browser fits that geometry into 360 × 192 px
        at <code>360 ÷ 600 = 0.6</code> scale, centered with 64 px above and below.
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
    <h2 class="panel-title">Calculate the resized bar chart</h2>
    <figure class="auto-size-figure">
      <a href="${anatomyImage}" target="_blank" rel="noopener">
        <img src="${anatomyImage}" alt="The resized chart has a 360 by 320 SVG and a 280 by 240 plot starting at SVG coordinate 50, 24. Q1 starts 14 units from the plot's left edge and 120 from the top. The bar is 112 units wide and 120 high." />
      </a>
      <figcaption class="guide-prose">
        The annotated chart uses the 360 × 320 layout with <code>autoSize</code> on.
        Coordinates for axes and bars are measured from the plot origin unless marked as SVG coordinates.
      </figcaption>
    </figure>
    <ol class="guide-prose auto-size-steps">
      <li><strong>Measure the SVG.</strong> The chart host fills its container, so the
        outside dimensions resolve to 360 × 320. The SVG uses <code>viewBox="0 0 360 320"</code>.</li>
      <li><strong>Reserve margins.</strong> Top 24, right 30, bottom 56, and left 50 give a
        plot of <code>360 − 50 − 30 = 280</code> by <code>320 − 24 − 56 = 240</code>.
        Plot <code>(0, 0)</code> is SVG <code>(50, 24)</code>.</li>
      <li><strong>Map the categories.</strong> The X band scale maps Q1 and Q2 across
        <code>[0, 280]</code>. Inner padding is 0.2 and outer padding is 0.1.
        The step is <code>280 ÷ (2 − 0.2 + 2 × 0.1) = 140</code>. Each band is
        <code>140 × 0.8 = 112</code> wide. Q1 starts at <code>140 × 0.1 = 14</code>.
        Q2 starts at <code>14 + 140 = 154</code>. Their X ticks sit at band centers, 70 and 210.</li>
      <li><strong>Map the values.</strong> The Y scale maps <code>[0, 100]</code> onto
        <code>[240, 0]</code>. SVG Y increases downward, so <code>y(v) = 240 × (1 − v ÷ 100)</code>.
        The left axis is at <code>x = 0</code> with 100, 50, and 0 at Y positions 0, 120, and 240.
        The bottom axis and zero baseline sit at <code>y = 240</code>.</li>
      <li><strong>Calculate each rectangle.</strong> With one series, each bar fills its band.
        Its top is <code>y(value)</code> and its height is <code>240 − y(value)</code>.
        Add the left and top margins to get the SVG position.</li>
    </ol>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th scope="col">Bar</th><th scope="col">Plot (x, y)</th><th scope="col">SVG (x, y)</th><th scope="col">Width × height</th></tr></thead>
        <tbody>
          <tr><th scope="row">Q1 = 50</th><td>(14, 120)</td><td>(64, 144)</td><td>112 × 120</td></tr>
          <tr><th scope="row">Q2 = 75</th><td>(154, 60)</td><td>(204, 84)</td><td>112 × 180</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const flow = document.createElement('section');
  flow.className = 'panel-card guide-section';
  flow.innerHTML = `
    <h2 class="panel-title">When calculations run</h2>
    <figure class="auto-size-figure">
      <a href="${flowImage}" target="_blank" rel="noopener">
        <img src="${flowImage}" alt="Flow chart. On first render or an explicit redraw, resolve the SVG size and margins, derive the plot bounds, build scales, compute geometry, and draw layers. On CSS resize alone, autoSize checks the resolved size before redrawing." />
      </a>
      <figcaption class="guide-prose">
        Both settings calculate on the first draw. On later CSS resizes, <code>autoSize</code>
        uses <code>ResizeObserver</code> to check the host and its parent. A change in resolved
        width or height repeats the layout. Explicit redraws such as <code>chart.resize()</code>
        work with either setting. In this example the model computes the scales and bar
        rectangles, then the renderer draws the axes followed by the bars.
      </figcaption>
    </figure>
  `;

  const legend = document.createElement('section');
  legend.className = 'panel-card guide-section';
  legend.innerHTML = `
    <h2 class="panel-title">How legends wrap when the chart resizes</h2>
    <p class="guide-prose">
      A categorical legend can wrap a label's words into lines and move entire entries
      onto new rows or columns. The engine measures the labels first, then packs each
      swatch and its label as one entry.
    </p>
    <figure class="auto-size-figure">
      <a href="${legendImage}" target="_blank" rel="noopener">
        <img src="${legendImage}" alt="Three two-line legend entries fit on one row in the 600-pixel chart. With autoSize on, the narrower 360-pixel chart moves the third entry to a second row. With autoSize off, the original row scales with the SVG." />
      </a>
      <figcaption class="guide-prose">
        The example keeps the label width limit at 110 units. The words keep their
        line breaks as the legend moves entries between rows.
      </figcaption>
    </figure>
    <ol class="guide-prose auto-size-steps">
      <li><strong>Wrap the label text.</strong> Set <code>legend.maxItemWidth</code> to 110 and use
        <code>label: { target: 'legend', overflow: 'wrap', maxLines: 2 }</code>.
        Pretext measures each label with the configured font and uses up to two lines.
        With the width limit alone, long labels use a single line with an ellipsis.
        In this example, the entry width also includes a 10-unit swatch and a 5-unit gap.</li>
      <li><strong>Pack the entries.</strong> With <code>legend.wrap: true</code> (the default),
        top and bottom legends start a new row when the next entry would exceed the
        plot width minus horizontal legend padding. Left and right legends start a new
        column using the plot height minus vertical padding. Set <code>legend.wrap: false</code>
        to keep one row or column while retaining multi-line labels.</li>
      <li><strong>Repack after a resize.</strong> After subtracting 12 units of padding on
        each side, the available width drops from <code>520 − 24 = 496</code> to
        <code>280 − 24 = 256</code>. In the illustrated run with Arial at 12 px, the
        entries measure 104, 122, and 116 units. All three and two 14-unit gaps take
        370 units. The narrower legend fits <code>104 + 14 + 122 = 240</code> on the
        first row and centers the third entry below. With <code>autoSize</code> off,
        the existing single row scales with the SVG until the next redraw.</li>
    </ol>
    <p class="guide-prose">
      The initial margin calculation reserves a baseline allowance. Give a multi-row
      legend enough room with <code>margin.bottom</code> or <code>margin.top</code>.
      This example uses a 112-unit bottom margin for the axis and two rows.
    </p>
    <details class="auto-size-example">
      <summary>Copy the legend example</summary>
    </details>
  `;
  legend.querySelector('details')!.append(createCodeBlock(legendExample, 'Bar chart with a wrapping legend'));

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
      The example starts with the same Q1 and Q2 values and adapts to the space here.
      The dotted outline marks the plot area. Set <code>autoSize</code> to
      <code>false</code> in the editor, then move a slider to see the SVG keep its last layout.
    </p>
    <div class="guide-controls-row auto-size-controls">
      <label for="auto-size-chart">
        Chart <select id="auto-size-chart"></select>
      </label>
      <label for="auto-size-width">
        Width <input id="auto-size-width" type="range" min="45" max="100" step="5" value="100" />
        <span id="auto-size-width-value" aria-hidden="true">100%</span>
      </label>
      <label for="auto-size-height">
        Height <input id="auto-size-height" type="range" min="240" max="520" step="20" value="360" />
        <span id="auto-size-height-value" aria-hidden="true">360 px</span>
      </label>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage auto-size-stage" id="auto-size-stage"></div>
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

  container.append(comparison, calculations, flow, legend, demo, layout, positioning);

  const chartSelect = demo.querySelector<HTMLSelectElement>('#auto-size-chart')!;
  const widthInput = demo.querySelector<HTMLInputElement>('#auto-size-width')!;
  const heightInput = demo.querySelector<HTMLInputElement>('#auto-size-height')!;
  const widthValue = demo.querySelector('#auto-size-width-value')!;
  const heightValue = demo.querySelector('#auto-size-height-value')!;
  const stage = demo.querySelector<HTMLElement>('#auto-size-stage')!;
  const readout = demo.querySelector('#auto-size-dimensions')!;

  const resizeStage = () => {
    stage.style.width = widthInput.value + '%';
    stage.style.height = heightInput.value + 'px';
    widthValue.textContent = stage.style.width;
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
