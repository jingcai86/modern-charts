import type {
  ChartRenderContext,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import { createLiveConfigEditor } from './shared';

export function renderCustomLayersGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & 3 Injection Patterns
  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">How the Layer Pipeline Works</h2>
    <p class="guide-prose">
      Every chart renders an ordered array of layers defined in <code>chart.config.layers</code>.
      Built-in layers are referenced by string name (such as <code>'grid'</code>, <code>'axes'</code>,
      <code>'bars'</code>, <code>'lines'</code>, <code>'points'</code>, <code>'markers'</code>,
      <code>'labels'</code>, <code>'legends'</code>), rendered back-to-front in SVG paint order.
      You can insert your own custom layer at <strong>any position</strong> in the array in three ways:
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. Inline Function</h3>
        <p>Pass <code>(ctx: ChartRenderContext) =&gt; SVGElement | void</code> directly inside <code>config.layers</code>. Return an SVG node or append into <code>ctx.layerGroup</code>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Named Layer Object</h3>
        <p>Pass <code>{ name: 'peak-callout', render: (ctx) =&gt; ... }</code> for readable debugging and explicit <code>data-layer="peak-callout"</code> SVG group attributes.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Declarative HTML &amp; Streaming</h3>
        <p>Nest <code>&lt;mc-custom-layer name="badge"&gt;</code> as a child element in HTML and attach its <code>.renderer</code> callback — ideal for AI progressive layer streaming.</p>
      </div>
    </div>
  `;
  container.appendChild(introCard);

  // Live Example 1: Peak Callout & Average Band Custom Layer on <mc-line-chart>
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Custom Peak Callout &amp; Average Reference Band</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          A custom layer function computes the series mean and peak point directly from <code>ctx.data</code>,
          positions elements with <code>ctx.xScale</code> / <code>ctx.yScale</code>, and renders a Pretext-measured callout via <code>ctx.renderLabel()</code>.
          Edit <code>data</code> values or reorder <code>layers</code> in the live editor to watch the peak &amp; mean recalculate immediately.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" id="btn-layer-pos-front" class="btn-primary">Place Above Lines</button>
        <button type="button" id="btn-layer-pos-back">Place Behind Lines</button>
        <button type="button" id="btn-layer-toggle">Hide Custom Layer</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-custom-layer-chart-1"></div>
      <div id="guide-custom-layer-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const lineData = [
    {
      id: 'Requests (K)',
      data: [
        { x: 'Mon', y: 42 },
        { x: 'Tue', y: 58 },
        { x: 'Wed', y: 51 },
        { x: 'Thu', y: 94 },
        { x: 'Fri', y: 78 },
        { x: 'Sat', y: 63 },
        { x: 'Sun', y: 71 }
      ]
    }
  ];

  const peakAndMeanLayer = {
    name: 'peak-and-mean',
    render(ctx: ChartRenderContext<typeof lineData>) {
      const points = ctx.data?.[0]?.data ?? [];
      if (!points.length || !ctx.xScale || !ctx.yScale) return;

      const avg = points.reduce((sum, p) => sum + Number(p.y), 0) / points.length;
      const peak = points.reduce(
        (best, p) => (Number(p.y) > Number(best.y) ? p : best),
        points[0]
      );

      const avgY = ctx.yScale(avg);
      const peakX = ctx.xScale(peak.x);
      const peakY = ctx.yScale(peak.y);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Shaded +/- 12% band around the mean
      const bandTop = ctx.yScale(avg * 1.12);
      const bandBot = ctx.yScale(avg * 0.88);
      const band = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      band.setAttribute('x', '0');
      band.setAttribute('y', String(bandTop));
      band.setAttribute('width', String(ctx.innerWidth));
      band.setAttribute('height', String(Math.max(2, bandBot - bandTop)));
      band.setAttribute('fill', '#6366f1');
      band.setAttribute('fill-opacity', '0.12');
      band.setAttribute('pointer-events', 'none');
      g.appendChild(band);

      // Dashed mean line
      const avgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      avgLine.setAttribute('x1', '0');
      avgLine.setAttribute('x2', String(ctx.innerWidth));
      avgLine.setAttribute('y1', String(avgY));
      avgLine.setAttribute('y2', String(avgY));
      avgLine.setAttribute('stroke', '#818cf8');
      avgLine.setAttribute('stroke-width', '1.5');
      avgLine.setAttribute('stroke-dasharray', '5 4');
      avgLine.setAttribute('pointer-events', 'none');
      g.appendChild(avgLine);

      ctx.renderLabel(g, {
        text: `Mean: ${avg.toFixed(1)}K`,
        x: ctx.innerWidth - 6,
        y: avgY - 8,
        type: 'custom',
        anchor: 'end',
        fontSize: 11,
        fontWeight: 700,
        color: '#818cf8'
      });

      // Highlight halo around peak datum
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('cx', String(peakX));
      halo.setAttribute('cy', String(peakY));
      halo.setAttribute('r', '14');
      halo.setAttribute('fill', 'rgba(244, 63, 94, 0.18)');
      halo.setAttribute('stroke', '#f43f5e');
      halo.setAttribute('stroke-width', '2');
      halo.setAttribute('pointer-events', 'none');
      g.appendChild(halo);

      ctx.renderLabel(g, {
        text: `★ Peak: ${peak.y}K (${peak.x})`,
        x: peakX + 18,
        y: peakY - 4,
        type: 'custom',
        anchor: 'start',
        fontSize: 11,
        fontWeight: 700,
        color: '#ffffff',
        background: '#f43f5e',
        borderRadius: 6,
        padding: { top: 3, right: 8, bottom: 3, left: 8 }
      });

      return g;
    }
  };

  const chart1 = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-custom-layer-chart-1')!.appendChild(chart1);
  mounted.push(chart1);

  let customLayerPlacement: 'front' | 'back' | 'hidden' = 'front';
  const buildChart1Config = () => {
    const layers =
      customLayerPlacement === 'front'
        ? ['grid', 'axes', 'areas', 'lines', 'points', peakAndMeanLayer, 'legends']
        : customLayerPlacement === 'back'
        ? ['grid', peakAndMeanLayer, 'axes', 'areas', 'lines', 'points', 'legends']
        : ['grid', 'axes', 'areas', 'lines', 'points', 'legends'];

    return {
      data: lineData,
      title: 'Weekly API Traffic with Custom Layer',
      palette: 'modern',
      enableArea: true,
      areaOpacity: 0.14,
      curve: 'monotoneX',
      yScale: { type: 'linear', min: 0, max: 115 },
      layers
    };
  };

  const applyChart1Config = (cfg: Record<string, any>) => {
    chart1.setConfig({
      autoSize: true,
      themeMode,
      margin: { top: 44, right: 28, bottom: 60, left: 52 },
      ...cfg
    });
  };

  const initialCfg1 = buildChart1Config();
  applyChart1Config(initialCfg1);

  const btnFront = ex1.querySelector('#btn-layer-pos-front') as HTMLButtonElement;
  const btnBack = ex1.querySelector('#btn-layer-pos-back') as HTMLButtonElement;
  const btnToggle = ex1.querySelector('#btn-layer-toggle') as HTMLButtonElement;

  const syncButtons = () => {
    btnFront.classList.toggle('btn-primary', customLayerPlacement === 'front');
    btnBack.classList.toggle('btn-primary', customLayerPlacement === 'back');
    btnToggle.textContent =
      customLayerPlacement === 'hidden' ? 'Show Custom Layer' : 'Hide Custom Layer';
  };

  const editor1 = createLiveConfigEditor({
    title: 'Named Custom Layer Config (Live)',
    initialConfig: initialCfg1,
    layerRegistry: { 'peak-and-mean': peakAndMeanLayer },
    hint: 'Edit data values, yScale, or reorder { "name": "peak-and-mean" } inside layers[].',
    onConfigChange: (nextCfg) => {
      applyChart1Config(nextCfg);
    },
    onReset: () => {
      customLayerPlacement = 'front';
      syncButtons();
      const resetCfg = buildChart1Config();
      applyChart1Config(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  ex1.querySelector('#guide-custom-layer-code-1')!.appendChild(editor1.element);

  btnFront.addEventListener('click', () => {
    customLayerPlacement = 'front';
    syncButtons();
    const nextCfg = buildChart1Config();
    applyChart1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  });
  btnBack.addEventListener('click', () => {
    customLayerPlacement = 'back';
    syncButtons();
    const nextCfg = buildChart1Config();
    applyChart1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  });
  btnToggle.addEventListener('click', () => {
    customLayerPlacement = customLayerPlacement === 'hidden' ? 'front' : 'hidden';
    syncButtons();
    const nextCfg = buildChart1Config();
    applyChart1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  });

  // Live Example 2: Threshold-Aware Custom Layer
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Reading Threshold Matches Inside a Custom Layer</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Custom layers receive <code>ctx.thresholds.matchedItems</code> with each matched bar's pixel coordinates
          (<code>px</code>, <code>py</code>, <code>width</code>, <code>value</code>), letting you attach custom warning badges automatically.
          Edit <code>markers[0].value</code> or regional <code>Uptime</code> numbers in the editor to see badges move live.
        </p>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-custom-layer-chart-2"></div>
      <div id="guide-custom-layer-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const barData = [
    { region: 'US-East', Uptime: 99.9 },
    { region: 'US-West', Uptime: 97.4 },
    { region: 'EU-Central', Uptime: 99.6 },
    { region: 'AP-South', Uptime: 96.2 },
    { region: 'SA-East', Uptime: 99.1 }
  ];

  const slaAlertLayer = {
    name: 'sla-alerts',
    render(ctx: ChartRenderContext<any>) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      for (const item of ctx.thresholds.matchedItems) {
        if (item.px == null || item.py == null) continue;
        const cx = item.px + (item.width ?? 0) / 2;
        ctx.renderLabel(g, {
          text: `⚠ SLA Breach (${item.value}%)`,
          x: cx,
          y: Math.max(18, item.py - 14),
          type: 'custom',
          anchor: 'middle',
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          background: '#dc2626',
          borderRadius: 5,
          padding: { top: 2, right: 6, bottom: 2, left: 6 }
        });
      }
      return g;
    }
  };

  const chart2 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-custom-layer-chart-2')!.appendChild(chart2);
  mounted.push(chart2);

  const initialCfg2 = {
    data: barData,
    title: 'Regional SLA Uptime (%) — Threshold-Aware Layer',
    palette: 'emerald',
    indexBy: 'region',
    keys: ['Uptime'],
    borderRadius: 6,
    yScale: { type: 'linear', min: 94, max: 101 },
    markers: [
      {
        id: 'sla-floor',
        axis: 'y',
        value: 98.5,
        label: 'SLA 98.5%',
        stroke: '#ef4444',
        strokeDasharray: '6 4',
        condition: 'below',
        matchStyle: { fill: '#ef4444', stroke: '#fca5a5' }
      }
    ],
    layers: ['grid', 'axes', 'bars', 'markers', slaAlertLayer]
  };

  const applyChart2Config = (cfg: Record<string, any>) => {
    chart2.setConfig({
      autoSize: true,
      themeMode,
      margin: { top: 44, right: 24, bottom: 52, left: 52 },
      ...cfg
    });
  };
  applyChart2Config(initialCfg2);

  const editor2 = createLiveConfigEditor({
    title: 'Threshold-Aware Custom Layer Config (Live)',
    initialConfig: initialCfg2,
    layerRegistry: { 'sla-alerts': slaAlertLayer },
    hint: 'Change markers[0].value (e.g. 99.5) or Uptime numbers to trigger SLA breach badges live.',
    onConfigChange: (nextCfg) => {
      applyChart2Config(nextCfg);
    }
  });
  ex2.querySelector('#guide-custom-layer-code-2')!.appendChild(editor2.element);

  // Context Reference Table
  const refCard = document.createElement('section');
  refCard.className = 'panel-card guide-section';
  refCard.innerHTML = `
    <h2 class="panel-title">ChartRenderContext Reference</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr><th>Property</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>ctx.data</code></td><td><code>TData</code></td><td>Current dataset bound to the chart.</td></tr>
          <tr><td><code>ctx.xScale</code> / <code>ctx.yScale</code></td><td>D3 Scale</td><td>Computed X/Y scales mapping domain values to inner canvas pixels.</td></tr>
          <tr><td><code>ctx.colorScale</code></td><td><code>(key) =&gt; string</code></td><td>Active ordinal color scale derived from the chart's theme/palette.</td></tr>
          <tr><td><code>ctx.innerWidth</code> / <code>ctx.innerHeight</code></td><td><code>number</code></td><td>Drawable plot area dimensions inside chart margins.</td></tr>
          <tr><td><code>ctx.d3</code></td><td><code>typeof d3</code></td><td>Bundled D3 namespace for selections, generators, and stats.</td></tr>
          <tr><td><code>ctx.layerGroup</code></td><td><code>SVGGElement</code></td><td>Dedicated SVG <code>&lt;g&gt;</code> container for the custom layer.</td></tr>
          <tr><td><code>ctx.renderLabel()</code> / <code>ctx.measureText()</code></td><td>Function</td><td>Pretext-powered zero-reflow text measurement and SVG/HTML label rendering.</td></tr>
          <tr><td><code>ctx.thresholds</code></td><td><code>ThresholdContextInfo</code></td><td>Resolved markers and matched items with pixel positions.</td></tr>
          <tr><td><code>ctx.showTooltip()</code> / <code>ctx.hideTooltip()</code></td><td>Function</td><td>Show/hide the chart's styled floating tooltip at pointer coordinates.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(refCard);

  return mounted;
}
