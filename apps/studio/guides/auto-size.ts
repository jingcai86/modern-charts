import type {
  ChartConfig,
  ChartRenderContext,
  MCBaseChart,
  MCCustomLayer,
  ThemeModePreference
} from '../../../src/index';
import { CHART_CATALOG, type ChartCatalogEntry } from '../catalog';
import { getGlobalPalette } from '../state/theme';
import { createCodeBlock, createLiveConfigEditor } from './shared';

type SizingConfig = Pick<ChartConfig, 'autoSize' | 'width' | 'height' | 'margin'>;

const responsiveExample = `
<div style="width: 100%; height: 360px;">
  <mc-bar-chart id="spending-chart" auto-size></mc-bar-chart>
</div>

<script type="module">
  import 'modern-charts/bar';

  document.getElementById('spending-chart').setConfig({
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 94 },
      { quarter: 'Q2', Cloud: 168, Edge: 118 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge']
  });
</script>
`;

export function renderAutoSizeGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Make a chart fit its container</h2>
    <p class="guide-prose">
      Set <code>autoSize: true</code> in the chart config or add the HTML
      <code>auto-size</code> attribute. Give the container a width and a height
      with CSS. In browsers with <code>ResizeObserver</code>, the chart observes
      its host and its parent when present at setup. It redraws when its
      resolved width or height changes. All ten chart types share this behavior.
    </p>
    <p class="guide-prose">
      The host has a 240 px CSS minimum height by default. Override its
      <code>min-height</code> if you need a shorter host.
    </p>
  `;
  intro.append(createCodeBlock(responsiveExample, 'Responsive bar chart'));

  const demo = document.createElement('section');
  demo.className = 'panel-card guide-section';
  demo.innerHTML = `
    <h2 class="panel-title">Resize the container</h2>
    <p class="guide-prose">
      The dotted outline marks the plot area. Set <code>autoSize</code> to
      <code>false</code> in the editor to see the SVG keep its last layout when
      the container changes.
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

  const layout = document.createElement('section');
  layout.className = 'panel-card guide-section';
  layout.innerHTML = `
    <h2 class="panel-title">From container to plot area</h2>
    <ol class="guide-prose auto-size-steps">
      <li>Resolve each dimension in order from a positive config value, a positive
        numeric attribute, the host's measured size, the parent's measured size,
        or a fallback. The fallback width is 640 px. Fallback height is the
        greater of 280 px or 56% of width rounded to a pixel with
        <code>autoSize</code>, and 380 px otherwise.</li>
      <li>Round the outside dimensions to whole pixels and clamp them to at least
        160 × 140 px. Set the SVG <code>viewBox</code> to <code>0 0 width height</code>.</li>
      <li>Merge the chart's default margins with <code>config.margin</code>, then
        apply any HTML <code>margin</code> attribute. The layout can reserve more
        room for top or right axes, outside marker annotations, and legends.</li>
      <li>Subtract left and right margins from width and top and bottom margins
        from height, with a 40 px minimum on each plot dimension. The plot origin
        is <code>(margin.left, margin.top)</code> in the SVG and
        <code>(0, 0)</code> inside a custom layer.</li>
    </ol>
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

  container.append(intro, demo, layout, positioning);

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
  let entry = CHART_CATALOG[0];
  let sizing: SizingConfig = { autoSize: true };
  const applySizing = () => {
    charts[0].setConfig({
      ...entry.createDefaultConfig(themeMode),
      width: sizing.width,
      height: sizing.height,
      margin: sizing.margin,
      autoSize: sizing.autoSize === true,
      animate: false,
      isInteractive: false,
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
