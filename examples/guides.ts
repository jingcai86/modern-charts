import {
  MCBaseChart,
  PALETTES,
  type ChartPaletteName,
  type ChartRenderContext,
  type ChartTheme,
  type LabelDescriptor,
  type MeasuredLabel,
  type ThemeModePreference
} from '../src/index';

export type GuideId = 'custom-layers' | 'themes' | 'd3' | 'custom-labels';

export interface GuideMeta {
  id: GuideId;
  title: string;
  shortLabel: string;
  icon: string;
  summary: string;
}

export const GUIDES_CATALOG: GuideMeta[] = [
  {
    id: 'custom-layers',
    title: 'Custom Layers',
    shortLabel: 'Custom Layers',
    icon: '🧩',
    summary:
      'Create and inject your own SVG layers into the Nivo-style layer pipeline — inline functions, named layers, and declarative <mc-custom-layer> elements.'
  },
  {
    id: 'themes',
    title: 'Themes & Palettes',
    shortLabel: 'Themes',
    icon: '🎨',
    summary:
      'Work with built-in dark/light/system themes, all 7 bundled palettes, or craft fully custom brand themes and declarative <mc-theme-layer> overrides.'
  },
  {
    id: 'd3',
    title: 'Working with D3',
    shortLabel: 'Working with D3',
    icon: '📐',
    summary:
      'Leverage ctx.d3, computed scales (ctx.xScale / ctx.yScale), SVG generators, statistical helpers, and tooltips directly inside modern-charts.'
  },
  {
    id: 'custom-labels',
    title: 'Custom Labels',
    shortLabel: 'Custom Labels',
    icon: '🏷️',
    summary:
      'Master <mc-label> and @chenglou/pretext zero-reflow typography: formatters, multi-line wrapping, <foreignObject> icons & pills, and custom labelRenderer.'
  }
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createCodeBlock(code: string, title = 'Code Example'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'guide-code-wrap';
  wrap.innerHTML = `
    <div class="guide-code-header">
      <span class="guide-code-title">${escapeHtml(title)}</span>
      <button type="button" class="guide-copy-btn">Copy</button>
    </div>
    <pre class="guide-code-pre"><code>${escapeHtml(code.trim())}</code></pre>
  `;
  const copyBtn = wrap.querySelector('.guide-copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(code.trim()).then(() => {
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    });
  });
  return wrap;
}

function renderGuideHeader(activeId: GuideId): HTMLElement {
  const meta = GUIDES_CATALOG.find((g) => g.id === activeId)!;
  const header = document.createElement('section');
  header.className = 'guide-hero';

  const tabsHtml = GUIDES_CATALOG.map(
    (g) => `
      <a
        href="#/guide/${g.id}"
        class="guide-tab-pill ${g.id === activeId ? 'active' : ''}"
      >
        <span>${g.icon}</span>
        <span>${g.shortLabel}</span>
      </a>
    `
  ).join('');

  header.innerHTML = `
    <div class="guide-tabs-bar" role="navigation" aria-label="Documentation Guides">
      ${tabsHtml}
    </div>
    <div class="guide-hero-copy">
      <h1 class="guide-hero-title">${meta.icon} ${escapeHtml(meta.title)}</h1>
      <p class="guide-hero-summary">${escapeHtml(meta.summary)}</p>
    </div>
  `;
  return header;
}

// ============================================================================
// GUIDE 1: HOW TO CREATE AND INJECT YOUR OWN LAYERS
// ============================================================================
function renderCustomLayersGuide(
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

      const avg = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const peak = points.reduce((best, p) => (p.y > best.y ? p : best), points[0]);

      const avgY = ctx.yScale(avg);
      const peakX = ctx.xScale(peak.x);
      const peakY = ctx.yScale(peak.y);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Shaded +/- 10% band around the mean
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
  const applyChart1 = () => {
    const layers =
      customLayerPlacement === 'front'
        ? ['grid', 'axes', 'areas', 'lines', 'points', peakAndMeanLayer, 'legends']
        : customLayerPlacement === 'back'
        ? ['grid', peakAndMeanLayer, 'axes', 'areas', 'lines', 'points', 'legends']
        : ['grid', 'axes', 'areas', 'lines', 'points', 'legends'];

    chart1.setConfig({
      data: lineData,
      autoSize: true,
      themeMode,
      palette: 'modern',
      title: 'Weekly API Traffic with Custom Layer',
      enableArea: true,
      areaOpacity: 0.14,
      curve: 'monotoneX',
      yScale: { type: 'linear', min: 0, max: 115 },
      margin: { top: 44, right: 28, bottom: 60, left: 52 },
      layers
    });
  };
  applyChart1();

  const btnFront = ex1.querySelector('#btn-layer-pos-front') as HTMLButtonElement;
  const btnBack = ex1.querySelector('#btn-layer-pos-back') as HTMLButtonElement;
  const btnToggle = ex1.querySelector('#btn-layer-toggle') as HTMLButtonElement;

  const syncButtons = () => {
    btnFront.classList.toggle('btn-primary', customLayerPlacement === 'front');
    btnBack.classList.toggle('btn-primary', customLayerPlacement === 'back');
    btnToggle.textContent =
      customLayerPlacement === 'hidden' ? 'Show Custom Layer' : 'Hide Custom Layer';
  };

  btnFront.addEventListener('click', () => {
    customLayerPlacement = 'front';
    syncButtons();
    applyChart1();
  });
  btnBack.addEventListener('click', () => {
    customLayerPlacement = 'back';
    syncButtons();
    applyChart1();
  });
  btnToggle.addEventListener('click', () => {
    customLayerPlacement = customLayerPlacement === 'hidden' ? 'front' : 'hidden';
    syncButtons();
    applyChart1();
  });

  ex1.querySelector('#guide-custom-layer-code-1')!.appendChild(
    createCodeBlock(
      `
const peakAndMeanLayer = {
  name: 'peak-and-mean',
  render(ctx) {
    const points = ctx.data[0].data;
    const avg = points.reduce((s, p) => s + p.y, 0) / points.length;
    const peak = points.reduce((b, p) => (p.y > b.y ? p : b), points[0]);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Position using the chart's computed scales
    const avgY = ctx.yScale(avg);
    const peakX = ctx.xScale(peak.x);
    const peakY = ctx.yScale(peak.y);

    // Draw mean line, halo ring, and Pretext-measured pill badge
    ctx.renderLabel(g, {
      text: \`★ Peak: \${peak.y}K (\${peak.x})\`,
      x: peakX + 18,
      y: peakY - 4,
      type: 'custom',
      color: '#ffffff',
      background: '#f43f5e',
      borderRadius: 6,
      padding: { top: 3, right: 8, bottom: 3, left: 8 }
    });

    return g;
  }
};

chart.config = {
  data: lineData,
  // Control z-order simply by positioning peakAndMeanLayer in the array
  layers: ['grid', 'axes', 'areas', 'lines', 'points', peakAndMeanLayer, 'legends']
};
      `,
      'Named Custom Layer (TypeScript)'
    )
  );

  // Live Example 2: Threshold-Aware Custom Layer + Declarative <mc-custom-layer>
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Reading Threshold Matches Inside a Custom Layer</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Custom layers receive <code>ctx.thresholds.matchedItems</code> with each matched bar's pixel coordinates
          (<code>px</code>, <code>py</code>, <code>width</code>, <code>value</code>), letting you attach custom warning badges or callouts automatically.
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

  const slaAlertLayer = (ctx: ChartRenderContext<any>) => {
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
  };

  const chart2 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-custom-layer-chart-2')!.appendChild(chart2);
  mounted.push(chart2);
  chart2.setConfig({
    data: barData,
    autoSize: true,
    themeMode,
    palette: 'emerald',
    title: 'Regional SLA Uptime (%) — Threshold-Aware Layer',
    indexBy: 'region',
    keys: ['Uptime'],
    borderRadius: 6,
    yScale: { type: 'linear', min: 94, max: 101 },
    margin: { top: 44, right: 24, bottom: 52, left: 52 },
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
  });

  ex2.querySelector('#guide-custom-layer-code-2')!.appendChild(
    createCodeBlock(
      `
// Declarative HTML alternative with <mc-custom-layer>
// <mc-bar-chart id="sla-chart">
//   <mc-chart-layer name="grid"></mc-chart-layer>
//   <mc-chart-layer name="axes"></mc-chart-layer>
//   <mc-chart-layer name="bars"></mc-chart-layer>
//   <mc-custom-layer id="alerts" name="sla-alerts"></mc-custom-layer>
// </mc-bar-chart>

const slaAlertLayer = (ctx) => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Inspect items flagged by any <mc-marker> threshold rule
  for (const item of ctx.thresholds.matchedItems) {
    const cx = item.px + (item.width ?? 0) / 2;
    ctx.renderLabel(g, {
      text: \`⚠ SLA Breach (\${item.value}%)\`,
      x: cx,
      y: Math.max(18, item.py - 14),
      type: 'custom',
      anchor: 'middle',
      color: '#ffffff',
      background: '#dc2626',
      borderRadius: 5,
      padding: { top: 2, right: 6, bottom: 2, left: 6 }
    });
  }
  return g;
};

barChart.config = {
  data: barData,
  markers: [{ axis: 'y', value: 98.5, condition: 'below', matchStyle: { fill: '#ef4444' } }],
  layers: ['grid', 'axes', 'bars', 'markers', slaAlertLayer]
};
      `,
      'Threshold-Aware Custom Layer'
    )
  );

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

// ============================================================================
// GUIDE 2: HOW TO WORK WITH YOUR OWN THEMES AND DEFAULT THEMES
// ============================================================================
function renderThemesGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & Built-in Palettes Swatches
  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Default Themes &amp; Built-In Palettes</h2>
    <p class="guide-prose">
      Every chart resolves its visual tokens through <code>&lt;mc-theme-layer&gt;</code> and
      <code>createDefaultTheme(mode, palette)</code>. You can pick from <strong>3 theme modes</strong>
      (<code>'system'</code>, <code>'dark'</code>, <code>'light'</code>) and <strong>7 bundled palettes</strong>,
      or override any individual token in <code>chart.config.theme</code> and <code>chart.config.colors</code>.
    </p>
    <div class="guide-palette-grid" id="guide-palette-picker"></div>
    <div class="guide-controls-row" style="margin-top:4px;">
      <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">Preview Mode:</span>
      <button type="button" id="btn-theme-mode-system" class="${themeMode === 'system' ? 'btn-primary' : ''}">System</button>
      <button type="button" id="btn-theme-mode-dark" class="${themeMode === 'dark' ? 'btn-primary' : ''}">Dark</button>
      <button type="button" id="btn-theme-mode-light" class="${themeMode === 'light' ? 'btn-primary' : ''}">Light</button>
    </div>
    <div class="guide-dual-chart-grid">
      <div class="guide-chart-stage" id="guide-theme-bar"></div>
      <div class="guide-chart-stage" id="guide-theme-pie"></div>
    </div>
    <div id="guide-theme-code-1"></div>
  `;
  container.appendChild(introCard);

  let selectedPalette: ChartPaletteName = 'modern';
  let selectedMode: ThemeModePreference = themeMode;

  const palettePicker = introCard.querySelector('#guide-palette-picker') as HTMLElement;
  const codeSlot1 = introCard.querySelector('#guide-theme-code-1') as HTMLElement;

  const barEl = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  const pieEl = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  introCard.querySelector('#guide-theme-bar')!.appendChild(barEl);
  introCard.querySelector('#guide-theme-pie')!.appendChild(pieEl);
  mounted.push(barEl, pieEl);

  const renderPaletteCharts = () => {
    barEl.setConfig({
      data: [
        { q: 'Q1', Compute: 120, Storage: 84, Network: 54 },
        { q: 'Q2', Compute: 148, Storage: 96, Network: 68 },
        { q: 'Q3', Compute: 165, Storage: 112, Network: 79 },
        { q: 'Q4', Compute: 192, Storage: 130, Network: 92 }
      ],
      autoSize: true,
      themeMode: selectedMode,
      palette: selectedPalette,
      title: `Palette: "${selectedPalette}" (${selectedMode})`,
      indexBy: 'q',
      keys: ['Compute', 'Storage', 'Network'],
      groupMode: 'grouped',
      borderRadius: 5,
      margin: { top: 44, right: 20, bottom: 64, left: 48 }
    });

    pieEl.setConfig({
      data: [
        { id: 'Compute', value: 44 },
        { id: 'Storage', value: 28 },
        { id: 'Network', value: 18 },
        { id: 'Edge', value: 10 }
      ],
      autoSize: true,
      themeMode: selectedMode,
      palette: selectedPalette,
      title: `Donut — "${selectedPalette}"`,
      innerRadius: 0.56,
      padAngle: 0.03,
      cornerRadius: 6,
      centerLabel: '100%'
    });

    codeSlot1.innerHTML = '';
    codeSlot1.appendChild(
      createCodeBlock(
        `
chart.config = {
  data,
  themeMode: '${selectedMode}', // 'system' | 'dark' | 'light'
  palette: '${selectedPalette}', // 'modern' | 'nivo' | 'echarts' | 'emerald' | 'sunset' | 'ocean' | 'cyber'
  // Or supply your own color array directly:
  // colors: ['#2563eb', '#14b8a6', '#f59e0b']
};
        `,
        'Using Default Themes & Built-In Palettes'
      )
    );
  };

  (Object.keys(PALETTES) as ChartPaletteName[]).forEach((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `guide-palette-card ${name === selectedPalette ? 'active' : ''}`;
    const swatches = PALETTES[name]
      .slice(0, 6)
      .map((c) => `<span class="guide-swatch-dot" style="background:${c}"></span>`)
      .join('');
    btn.innerHTML = `
      <span class="guide-palette-name">${name}</span>
      <span class="guide-swatch-row">${swatches}</span>
    `;
    btn.addEventListener('click', () => {
      selectedPalette = name;
      palettePicker.querySelectorAll('.guide-palette-card').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      renderPaletteCharts();
    });
    palettePicker.appendChild(btn);
  });

  (['system', 'dark', 'light'] as ThemeModePreference[]).forEach((m) => {
    const b = introCard.querySelector(`#btn-theme-mode-${m}`) as HTMLButtonElement;
    b.addEventListener('click', () => {
      selectedMode = m;
      (['system', 'dark', 'light'] as ThemeModePreference[]).forEach((other) => {
        introCard
          .querySelector(`#btn-theme-mode-${other}`)
          ?.classList.toggle('btn-primary', other === m);
      });
      renderPaletteCharts();
    });
  });

  renderPaletteCharts();

  // Example 2: Fully Custom Brand Themes
  const customThemes: Record<
    string,
    { label: string; theme: Partial<ChartTheme>; colors: string[]; themeMode: 'light' | 'dark' }
  > = {
    editorial: {
      label: 'Editorial Print (Warm Paper)',
      themeMode: 'light',
      colors: ['#b91c1c', '#1d4ed8', '#15803d'],
      theme: {
        background: '#faf6ef',
        textColor: '#1c1917',
        mutedTextColor: '#57534e',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 13,
        axisColor: '#78716c',
        gridColor: 'rgba(120, 113, 108, 0.22)',
        gridStrokeDasharray: '2 4',
        tooltipBackground: '#1c1917',
        tooltipTextColor: '#faf6ef',
        tooltipBorderColor: '#44403c'
      }
    },
    terminal: {
      label: 'Retro Terminal (Phosphor Amber)',
      themeMode: 'dark',
      colors: ['#f59e0b', '#22c55e', '#38bdf8'],
      theme: {
        background: '#090d0a',
        textColor: '#fde68a',
        mutedTextColor: '#a3e635',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        axisColor: '#3f6212',
        gridColor: 'rgba(163, 230, 53, 0.16)',
        gridStrokeDasharray: '1 5',
        tooltipBackground: '#111811',
        tooltipTextColor: '#fde68a',
        tooltipBorderColor: '#84cc16'
      }
    },
    enterprise: {
      label: 'High-Contrast Enterprise',
      themeMode: 'light',
      colors: ['#0f172a', '#0284c7', '#d97706'],
      theme: {
        background: '#ffffff',
        textColor: '#020617',
        mutedTextColor: '#334155',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        axisColor: '#0f172a',
        gridColor: 'rgba(15, 23, 42, 0.12)',
        gridStrokeDasharray: 'none',
        tooltipBackground: '#0f172a',
        tooltipTextColor: '#ffffff',
        tooltipBorderColor: '#0284c7'
      }
    }
  };

  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Crafting Your Own Custom Brand Theme</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Pass a partial <code>theme</code> object and custom <code>colors</code> array to override typography, surfaces, grid dash patterns, axes, and tooltips.
        </p>
      </div>
      <div class="guide-controls-row" id="guide-custom-theme-btns"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-custom-theme-chart"></div>
      <div id="guide-custom-theme-code"></div>
    </div>
  `;
  container.appendChild(ex2);

  const customLineEl = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-custom-theme-chart')!.appendChild(customLineEl);
  mounted.push(customLineEl);

  const customThemeBtns = ex2.querySelector('#guide-custom-theme-btns') as HTMLElement;
  const customThemeCode = ex2.querySelector('#guide-custom-theme-code') as HTMLElement;
  let activeCustomKey = 'editorial';

  const applyCustomTheme = (key: string) => {
    activeCustomKey = key;
    const preset = customThemes[key];
    customLineEl.setConfig({
      data: [
        {
          id: 'Revenue',
          data: [
            { x: 'Jan', y: 112 },
            { x: 'Feb', y: 129 },
            { x: 'Mar', y: 141 },
            { x: 'Apr', y: 136 },
            { x: 'May', y: 162 },
            { x: 'Jun', y: 184 }
          ]
        },
        {
          id: 'Forecast',
          data: [
            { x: 'Jan', y: 105 },
            { x: 'Feb', y: 120 },
            { x: 'Mar', y: 132 },
            { x: 'Apr', y: 148 },
            { x: 'May', y: 158 },
            { x: 'Jun', y: 175 }
          ]
        }
      ],
      autoSize: true,
      title: preset.label,
      themeMode: preset.themeMode,
      colors: preset.colors,
      theme: preset.theme,
      enableArea: true,
      areaOpacity: 0.14,
      curve: 'monotoneX',
      yScale: { type: 'linear', min: 80, max: 205 },
      margin: { top: 44, right: 24, bottom: 64, left: 52 }
    });

    customThemeCode.innerHTML = '';
    customThemeCode.appendChild(
      createCodeBlock(
        `
chart.config = {
  data,
  themeMode: '${preset.themeMode}',
  colors: ${JSON.stringify(preset.colors)},
  theme: ${JSON.stringify(preset.theme, null, 2)}
};

// Or declaratively via <mc-theme-layer>:
// <mc-line-chart>
//   <mc-theme-layer
//     mode="${preset.themeMode}"
//     background="${preset.theme.background}"
//     text-color="${preset.theme.textColor}"
//     font-family="${preset.theme.fontFamily}"
//   ></mc-theme-layer>
// </mc-line-chart>
        `,
        `Custom Theme — ${preset.label}`
      )
    );
  };

  Object.entries(customThemes).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.className = key === activeCustomKey ? 'btn-primary' : '';
    btn.addEventListener('click', () => {
      customThemeBtns.querySelectorAll('button').forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      applyCustomTheme(key);
    });
    customThemeBtns.appendChild(btn);
  });

  applyCustomTheme(activeCustomKey);

  // Theme Token Table
  const tokenCard = document.createElement('section');
  tokenCard.className = 'panel-card guide-section';
  tokenCard.innerHTML = `
    <h2 class="panel-title">ChartTheme Token Reference</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th>Token</th><th>Type</th><th>Controls</th></tr></thead>
        <tbody>
          <tr><td><code>colors</code></td><td><code>string[]</code></td><td>Series color cycle (overrides <code>palette</code>).</td></tr>
          <tr><td><code>background</code></td><td><code>string</code></td><td>Chart SVG canvas background fill.</td></tr>
          <tr><td><code>textColor</code> / <code>mutedTextColor</code></td><td><code>string</code></td><td>Titles, data labels, and secondary axis tick labels.</td></tr>
          <tr><td><code>fontFamily</code> / <code>fontSize</code></td><td><code>string | number</code></td><td>Base font passed to both SVG labels and <code>@chenglou/pretext</code> measurement.</td></tr>
          <tr><td><code>axisColor</code></td><td><code>string</code></td><td>Axis baselines and tick marks.</td></tr>
          <tr><td><code>gridColor</code> / <code>gridStrokeDasharray</code></td><td><code>string</code></td><td>Gridline stroke color and dash pattern (e.g. <code>'4 4'</code> or <code>'none'</code>).</td></tr>
          <tr><td><code>tooltipBackground</code> / <code>tooltipTextColor</code> / <code>tooltipBorderColor</code></td><td><code>string</code></td><td>Floating interactive tooltip surface styling.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(tokenCard);

  return mounted;
}

// ============================================================================
// GUIDE 3: HOW TO WORK WITH D3 GIVEN (ctx.d3 & SCALES)
// ============================================================================
function renderD3Guide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Direct Access to D3 via <code>ctx.d3</code></h2>
    <p class="guide-prose">
      <code>modern-charts</code> is built directly on top of <strong>D3 v7</strong> and hands you the live
      <code>d3</code> namespace on every custom layer's render context (<code>ctx.d3</code>), along with
      the chart's already-computed <code>ctx.xScale</code>, <code>ctx.yScale</code>, <code>ctx.colorScale</code>,
      <code>ctx.layerGroup</code>, and tooltip helpers (<code>ctx.showTooltip</code> / <code>ctx.hideTooltip</code>).
      You never have to re-implement resize observers, margins, axes, or ARIA — just drop into D3 for
      statistical overlays, confidence bands, brush annotations, or bespoke geometries.
    </p>
  `;
  container.appendChild(introCard);

  // Example 1: D3 Area Confidence Band + Linear Trendline using ctx.d3.area() & ctx.d3.line()
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: D3 Confidence Ribbon &amp; Interactive Mean Overlay</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Uses <code>ctx.d3.area()</code>, <code>ctx.d3.curveMonotoneX</code>, <code>ctx.d3.select(ctx.layerGroup)</code>,
          and <code>ctx.d3.format('.1f')</code> to draw a dynamic confidence interval around the primary line series.
        </p>
      </div>
      <div class="guide-controls-row">
        <label for="d3-band-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
          Confidence Band: <strong id="d3-band-val">±15%</strong>
        </label>
        <input type="range" id="d3-band-slider" min="5" max="30" step="1" value="15" />
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-d3-chart-1"></div>
      <div id="guide-d3-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const forecastData = [
    {
      id: 'Forecast Demand',
      data: [
        { x: 'W1', y: 64 },
        { x: 'W2', y: 78 },
        { x: 'W3', y: 72 },
        { x: 'W4', y: 95 },
        { x: 'W5', y: 108 },
        { x: 'W6', y: 102 },
        { x: 'W7', y: 124 }
      ]
    }
  ];

  let bandPct = 15;
  const makeConfidenceLayer = (pct: number) => ({
    name: 'd3-confidence-band',
    render(ctx: ChartRenderContext<typeof forecastData>) {
      const { d3, xScale, yScale, layerGroup } = ctx;
      const pts = ctx.data?.[0]?.data ?? [];
      if (!pts.length || !xScale || !yScale) return;

      const ratio = pct / 100;
      const root = d3.select(layerGroup);

      // 1. D3 area generator for upper/lower confidence envelope
      const ribbon = d3
        .area<{ x: string; y: number }>()
        .x((d) => xScale(d.x))
        .y0((d) => yScale(d.y * (1 - ratio)))
        .y1((d) => yScale(d.y * (1 + ratio)))
        .curve(d3.curveMonotoneX);

      root
        .append('path')
        .datum(pts)
        .attr('d', ribbon)
        .attr('fill', '#06b6d4')
        .attr('fill-opacity', 0.2)
        .attr('stroke', '#06b6d4')
        .attr('stroke-opacity', 0.45)
        .attr('stroke-dasharray', '3 3')
        .style('cursor', 'pointer')
        .on('pointermove', (event: PointerEvent) => {
          const mean = d3.mean(pts, (d) => d.y) ?? 0;
          ctx.showTooltip(
            `<strong>D3 Confidence Band (±${pct}%)</strong><br/>Series Mean: ${d3.format('.1f')(mean)}`,
            event.clientX,
            event.clientY
          );
        })
        .on('pointerleave', () => ctx.hideTooltip());

      // 2. D3 linear trendline from first to last least-squares estimate
      const n = pts.length;
      const meanX = (n - 1) / 2;
      const meanY = d3.mean(pts, (d) => d.y) ?? 0;
      let num = 0;
      let den = 0;
      pts.forEach((p, i) => {
        num += (i - meanX) * (p.y - meanY);
        den += (i - meanX) ** 2;
      });
      const slope = den ? num / den : 0;
      const intercept = meanY - slope * meanX;

      const trendLine = d3
        .line<{ x: string; y: number }>()
        .x((d) => xScale(d.x))
        .y((_, i) => yScale(intercept + slope * i));

      root
        .append('path')
        .datum(pts)
        .attr('d', trendLine)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')
        .attr('pointer-events', 'none');
    }
  });

  const d3Chart1 = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-d3-chart-1')!.appendChild(d3Chart1);
  mounted.push(d3Chart1);

  const renderD3Chart1 = () => {
    d3Chart1.setConfig({
      data: forecastData,
      autoSize: true,
      themeMode,
      palette: 'ocean',
      title: `Demand Forecast with D3 ±${bandPct}% Ribbon & OLS Trend`,
      enableArea: false,
      curve: 'monotoneX',
      yScale: { type: 'linear', min: 30, max: 175 },
      margin: { top: 44, right: 24, bottom: 60, left: 52 },
      layers: ['grid', makeConfidenceLayer(bandPct), 'axes', 'lines', 'points', 'legends']
    });
  };
  renderD3Chart1();

  const slider = ex1.querySelector('#d3-band-slider') as HTMLInputElement;
  const sliderVal = ex1.querySelector('#d3-band-val') as HTMLElement;
  slider.addEventListener('input', () => {
    bandPct = Number(slider.value);
    sliderVal.textContent = `±${bandPct}%`;
    renderD3Chart1();
  });

  ex1.querySelector('#guide-d3-code-1')!.appendChild(
    createCodeBlock(
      `
const d3ConfidenceLayer = {
  name: 'd3-confidence-band',
  render(ctx) {
    const { d3, xScale, yScale, layerGroup } = ctx;
    const pts = ctx.data[0].data;

    // Build a D3 area generator using the chart's own scales
    const ribbon = d3.area()
      .x((d) => xScale(d.x))
      .y0((d) => yScale(d.y * 0.85))
      .y1((d) => yScale(d.y * 1.15))
      .curve(d3.curveMonotoneX);

    d3.select(layerGroup)
      .append('path')
      .datum(pts)
      .attr('d', ribbon)
      .attr('fill', '#06b6d4')
      .attr('fill-opacity', 0.2)
      .on('pointermove', (event) => {
        const mean = d3.mean(pts, (d) => d.y);
        ctx.showTooltip(\`Mean: \${d3.format('.1f')(mean)}\`, event.clientX, event.clientY);
      })
      .on('pointerleave', () => ctx.hideTooltip());
  }
};

lineChart.config = {
  data: forecastData,
  layers: ['grid', d3ConfidenceLayer, 'axes', 'lines', 'points', 'legends']
};
      `,
      'Using ctx.d3.area(), ctx.d3.select(), and ctx.showTooltip()'
    )
  );

  // Example 2: D3 Statistical IQR Box + Centroid Crosshair on <mc-scatter-chart>
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: D3 Statistical IQR Box &amp; Centroid on Scatter Chart</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Uses <code>ctx.d3.quantile()</code> and <code>ctx.d3.mean()</code> across all scatter points to render an
          interquartile range (25th–75th percentile) bounding box and centroid crosshair directly in SVG.
        </p>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-d3-chart-2"></div>
      <div id="guide-d3-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const scatterData = [
    {
      id: 'Cluster A',
      data: [
        { x: 24, y: 42, size: 12 },
        { x: 31, y: 55, size: 16 },
        { x: 39, y: 61, size: 14 },
        { x: 46, y: 52, size: 18 },
        { x: 52, y: 69, size: 20 },
        { x: 64, y: 74, size: 15 }
      ]
    },
    {
      id: 'Cluster B',
      data: [
        { x: 42, y: 38, size: 11 },
        { x: 58, y: 49, size: 14 },
        { x: 71, y: 63, size: 19 },
        { x: 79, y: 81, size: 22 },
        { x: 86, y: 77, size: 16 }
      ]
    }
  ];

  const d3QuartileLayer = (ctx: ChartRenderContext<typeof scatterData>) => {
    const { d3, xScale, yScale, layerGroup } = ctx;
    const allPts = (ctx.data ?? []).flatMap((s) => s.data);
    if (allPts.length < 4 || !xScale || !yScale) return;

    const xs = allPts.map((p) => p.x).sort(d3.ascending);
    const ys = allPts.map((p) => p.y).sort(d3.ascending);

    const q1x = d3.quantile(xs, 0.25) ?? xs[0];
    const q3x = d3.quantile(xs, 0.75) ?? xs[xs.length - 1];
    const q1y = d3.quantile(ys, 0.25) ?? ys[0];
    const q3y = d3.quantile(ys, 0.75) ?? ys[ys.length - 1];
    const mx = d3.mean(xs) ?? 0;
    const my = d3.mean(ys) ?? 0;

    const root = d3.select(layerGroup);

    // IQR shaded region
    root
      .append('rect')
      .attr('x', xScale(q1x))
      .attr('y', yScale(q3y))
      .attr('width', Math.max(0, xScale(q3x) - xScale(q1x)))
      .attr('height', Math.max(0, yScale(q1y) - yScale(q3y)))
      .attr('rx', 6)
      .attr('fill', '#a855f7')
      .attr('fill-opacity', 0.14)
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 3')
      .attr('pointer-events', 'none');

    // Centroid crosshair
    const cx = xScale(mx);
    const cy = yScale(my);
    root
      .append('line')
      .attr('x1', cx - 10)
      .attr('x2', cx + 10)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', '#ec4899')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none');
    root
      .append('line')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', cy - 10)
      .attr('y2', cy + 10)
      .attr('stroke', '#ec4899')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none');

    ctx.renderLabel(layerGroup, {
      text: `IQR Box • Mean (${mx.toFixed(0)}, ${my.toFixed(0)})`,
      x: xScale(q1x) + 6,
      y: yScale(q3y) - 8,
      type: 'custom',
      anchor: 'start',
      fontSize: 11,
      fontWeight: 700,
      color: '#c084fc'
    });
  };

  const d3Chart2 = document.createElement('mc-scatter-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-d3-chart-2')!.appendChild(d3Chart2);
  mounted.push(d3Chart2);
  d3Chart2.setConfig({
    data: scatterData,
    autoSize: true,
    themeMode,
    palette: 'cyber',
    title: 'Scatter Clusters with D3 Quantile IQR Box',
    xTitle: 'Latency (ms)',
    yTitle: 'Throughput (req/s)',
    xScale: { type: 'linear', min: 10, max: 100 },
    yScale: { type: 'linear', min: 20, max: 100 },
    margin: { top: 44, right: 24, bottom: 64, left: 54 },
    layers: ['grid', d3QuartileLayer, 'axes', 'points', 'legends']
  });

  ex2.querySelector('#guide-d3-code-2')!.appendChild(
    createCodeBlock(
      `
const d3QuartileLayer = (ctx) => {
  const { d3, xScale, yScale, layerGroup } = ctx;
  const pts = ctx.data.flatMap((s) => s.data);
  const xs = pts.map((p) => p.x).sort(d3.ascending);
  const ys = pts.map((p) => p.y).sort(d3.ascending);

  const q1x = d3.quantile(xs, 0.25), q3x = d3.quantile(xs, 0.75);
  const q1y = d3.quantile(ys, 0.25), q3y = d3.quantile(ys, 0.75);

  d3.select(layerGroup)
    .append('rect')
    .attr('x', xScale(q1x))
    .attr('y', yScale(q3y))
    .attr('width', xScale(q3x) - xScale(q1x))
    .attr('height', yScale(q1y) - yScale(q3y))
    .attr('fill', '#a855f7')
    .attr('fill-opacity', 0.14)
    .attr('stroke', '#a855f7');
};
      `,
      'D3 Statistical Overlays with ctx.d3.quantile()'
    )
  );

  return mounted;
}

// ============================================================================
// GUIDE 4: HOW TO WORK WITH CUSTOM LABELS (<mc-label> & @chenglou/pretext)
// ============================================================================
function renderCustomLabelsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Universal Label Architecture (<code>&lt;mc-label&gt;</code> &amp; <code>@chenglou/pretext</code>)</h2>
    <p class="guide-prose">
      Every single text element in <code>modern-charts</code> — titles, axis ticks, bar/point values, donut arcs,
      marker callouts, and legends — flows through <code>LabelEngine</code> and is measured via
      <code>@chenglou/pretext</code> with <strong>zero DOM layout reflow</strong>. You can customize labels at three levels:
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. SVG Mode (<code>'svg'</code>)</h3>
        <p>Renders crisp SVG <code>&lt;text&gt;</code>/<code>&lt;tspan&gt;</code> with automatic Pretext line wrapping, custom <code>formatter</code> functions, backgrounds, and padding.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Rich HTML Mode (<code>'foreignObject'</code>)</h3>
        <p>Renders Pretext-sized SVG <code>&lt;foreignObject&gt;</code> HTML pills with inline SVG icons (<code>icon</code>, <code>iconPosition</code>) and custom <code>templateHtml</code>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Full Custom Renderer (<code>labelRenderer</code>)</h3>
        <p>Take complete programmatic control via <code>(descriptor, measured, defaultRender) =&gt; SVGElement | HTMLElement</code> with exact Pretext dimensions pre-computed for you.</p>
      </div>
    </div>
  `;
  container.appendChild(introCard);

  // Example 1: Interactive 3-Mode Label Switcher on <mc-bar-chart>
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Formatters, Rich <code>&lt;foreignObject&gt;</code> Icons &amp; Custom <code>labelRenderer</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch between the 3 label customization approaches on the same live bar chart and compare the generated code.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" id="btn-lbl-svg" class="btn-primary">SVG Formatter</button>
        <button type="button" id="btn-lbl-fo">foreignObject + Icons</button>
        <button type="button" id="btn-lbl-custom">Custom labelRenderer</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-1"></div>
      <div id="guide-label-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const labelChart1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-label-chart-1')!.appendChild(labelChart1);
  mounted.push(labelChart1);

  const labelCode1 = ex1.querySelector('#guide-label-code-1') as HTMLElement;

  const salesData = [
    { quarter: 'Q1', Revenue: 142 },
    { quarter: 'Q2', Revenue: 168 },
    { quarter: 'Q3', Revenue: 196 },
    { quarter: 'Q4', Revenue: 248 }
  ];

  const TREND_UP_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 11L12 4M12 4H6M12 4V10"/></svg>`;

  type DemoLabelMode = 'svg' | 'foreignObject' | 'custom';
  let activeLabelDemo: DemoLabelMode = 'svg';

  const renderLabelDemo1 = (mode: DemoLabelMode) => {
    activeLabelDemo = mode;

    const baseConfig: Record<string, any> = {
      data: salesData,
      autoSize: true,
      themeMode,
      palette: 'modern',
      indexBy: 'quarter',
      keys: ['Revenue'],
      enableLabels: true,
      borderRadius: 8,
      yScale: { type: 'linear', min: 0, max: 290 },
      margin: { top: 44, right: 24, bottom: 52, left: 54 },
      layers: ['grid', 'axes', 'bars', 'labels']
    };

    if (mode === 'svg') {
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 1: SVG Formatter + Pill Background',
        labelMode: 'svg',
        label: [
          {
            target: 'data',
            formatter: (text: string) => `$${text}K`,
            fontWeight: 700,
            fontSize: 12,
            color: '#ffffff',
            background: 'rgba(15, 23, 42, 0.55)',
            borderRadius: 5,
            padding: { top: 2, right: 6, bottom: 2, left: 6 }
          },
          {
            target: 'axis-tick',
            formatter: (text: string) => (/^\d+$/.test(text) ? `$${text}K` : text)
          }
        ]
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
chart.config = {
  data: salesData,
  labelMode: 'svg',
  label: [
    {
      target: 'data',
      formatter: (text) => \`$\${text}K\`,
      fontWeight: 700,
      color: '#ffffff',
      background: 'rgba(15, 23, 42, 0.55)',
      borderRadius: 5,
      padding: { top: 2, right: 6, bottom: 2, left: 6 }
    },
    {
      target: 'axis-tick',
      formatter: (t) => (/^\\d+$/.test(t) ? \`$\${t}K\` : t)
    }
  ]
};
          `,
          'SVG Label Overrides & Formatters'
        )
      );
    } else if (mode === 'foreignObject') {
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 2: Pretext-Measured <foreignObject> with SVG Icons',
        labelMode: 'foreignObject',
        label: {
          target: 'data',
          renderMode: 'foreignObject',
          formatter: (text: string) => `$${text}K`,
          icon: TREND_UP_SVG,
          iconPosition: 'start',
          iconSize: 12,
          iconGap: 4,
          fontSize: 12,
          fontWeight: 700,
          color: '#ecfdf5',
          background: 'rgba(5, 150, 105, 0.85)',
          borderRadius: 999,
          padding: { top: 3, right: 8, bottom: 3, left: 7 }
        }
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
const TREND_UP_SVG = \`<svg viewBox="0 0 16 16" width="12" height="12"
  fill="none" stroke="currentColor" stroke-width="2.2">
  <path d="M3 11L12 4M12 4H6M12 4V10"/>
</svg>\`;

chart.config = {
  data: salesData,
  labelMode: 'foreignObject',
  label: {
    target: 'data',
    renderMode: 'foreignObject',
    formatter: (text) => \`$\${text}K\`,
    icon: TREND_UP_SVG,
    iconPosition: 'start',
    iconSize: 12,
    iconGap: 4,
    color: '#ecfdf5',
    background: 'rgba(5, 150, 105, 0.85)',
    borderRadius: 999,
    padding: { top: 3, right: 8, bottom: 3, left: 7 }
  }
};
          `,
          'Rich <foreignObject> Labels with Inline SVG Icons'
        )
      );
    } else {
      const total = salesData.reduce((s, d) => s + d.Revenue, 0);
      labelChart1.setConfig({
        ...baseConfig,
        title: 'Mode 3: Custom labelRenderer (Pretext Measured)',
        labelMode: 'custom',
        labelRenderer: (
          descriptor: LabelDescriptor,
          measured: MeasuredLabel,
          defaultRender: () => SVGGElement
        ) => {
          if (descriptor.type !== 'data') return defaultRender();

          const val = Number(descriptor.text);
          const share = Math.round((val / total) * 100);
          const isTop = val >= 200;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const pillW = Math.max(measured.boxWidth + 32, 74);
          const pillH = 24;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(descriptor.x - pillW / 2));
          rect.setAttribute('y', String(descriptor.y - pillH / 2));
          rect.setAttribute('width', String(pillW));
          rect.setAttribute('height', String(pillH));
          rect.setAttribute('rx', '12');
          rect.setAttribute('fill', isTop ? '#f59e0b' : '#1e293b');
          rect.setAttribute('stroke', isTop ? '#fef3c7' : '#6366f1');
          rect.setAttribute('stroke-width', '1.4');
          g.appendChild(rect);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(descriptor.x));
          text.setAttribute('y', String(descriptor.y + 4));
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '11');
          text.setAttribute('font-weight', '700');
          text.setAttribute('fill', isTop ? '#0f172a' : '#f8fafc');
          text.textContent = `${isTop ? '★ ' : ''}$${val}K (${share}%)`;
          g.appendChild(text);

          return g;
        }
      });

      labelCode1.innerHTML = '';
      labelCode1.appendChild(
        createCodeBlock(
          `
chart.config = {
  data: salesData,
  labelMode: 'custom',
  labelRenderer: (descriptor, measured, defaultRender) => {
    // Fall back to default Pretext rendering for titles & axis ticks
    if (descriptor.type !== 'data') return defaultRender();

    const val = Number(descriptor.text);
    const share = Math.round((val / total) * 100);
    const isTop = val >= 200;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const pillW = Math.max(measured.boxWidth + 32, 74);
    // Append custom SVG pill + text using descriptor.x / descriptor.y...
    return g;
  }
};
          `,
          'Custom Programmatic labelRenderer'
        )
      );
    }
  };

  const btnSvg = ex1.querySelector('#btn-lbl-svg') as HTMLButtonElement;
  const btnFo = ex1.querySelector('#btn-lbl-fo') as HTMLButtonElement;
  const btnCustom = ex1.querySelector('#btn-lbl-custom') as HTMLButtonElement;

  const syncLabelBtns = () => {
    btnSvg.classList.toggle('btn-primary', activeLabelDemo === 'svg');
    btnFo.classList.toggle('btn-primary', activeLabelDemo === 'foreignObject');
    btnCustom.classList.toggle('btn-primary', activeLabelDemo === 'custom');
  };

  btnSvg.addEventListener('click', () => {
    renderLabelDemo1('svg');
    syncLabelBtns();
  });
  btnFo.addEventListener('click', () => {
    renderLabelDemo1('foreignObject');
    syncLabelBtns();
  });
  btnCustom.addEventListener('click', () => {
    renderLabelDemo1('custom');
    syncLabelBtns();
  });

  renderLabelDemo1('svg');

  // Example 2: Multi-Line Pretext Wrapping with Live maxWidth Slider
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Zero-Reflow Multi-Line Wrapping via <code>maxWidth</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Drag the <code>maxWidth</code> slider to watch <code>@chenglou/pretext</code> break long category labels cleanly into multiple lines without touching the DOM layout engine.
        </p>
      </div>
      <div class="guide-controls-row">
        <label for="lbl-maxwidth-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
          Axis Tick <code>maxWidth</code>: <strong id="lbl-maxwidth-val">82px</strong>
        </label>
        <input type="range" id="lbl-maxwidth-slider" min="48" max="170" step="2" value="82" />
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-2"></div>
      <div id="guide-label-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const wrapChart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-label-chart-2')!.appendChild(wrapChart);
  mounted.push(wrapChart);

  let tickMaxWidth = 82;
  const renderWrapChart = () => {
    wrapChart.setConfig({
      data: [
        { dept: 'Cloud Platform Engineering', Spend: 214 },
        { dept: 'Applied Machine Learning', Spend: 186 },
        { dept: 'Security & Compliance Ops', Spend: 129 },
        { dept: 'Developer Experience Tools', Spend: 158 }
      ],
      autoSize: true,
      themeMode,
      palette: 'sunset',
      title: `Pretext Wrapping (axis-tick maxWidth: ${tickMaxWidth}px)`,
      indexBy: 'dept',
      keys: ['Spend'],
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 88, left: 50 },
      label: {
        target: 'axis-tick',
        maxWidth: tickMaxWidth,
        fontSize: 11
      },
      layers: ['grid', 'axes', 'bars', 'labels']
    });
  };
  renderWrapChart();

  const maxWidthSlider = ex2.querySelector('#lbl-maxwidth-slider') as HTMLInputElement;
  const maxWidthVal = ex2.querySelector('#lbl-maxwidth-val') as HTMLElement;
  maxWidthSlider.addEventListener('input', () => {
    tickMaxWidth = Number(maxWidthSlider.value);
    maxWidthVal.textContent = `${tickMaxWidth}px`;
    renderWrapChart();
  });

  ex2.querySelector('#guide-label-code-2')!.appendChild(
    createCodeBlock(
      `
// Works both via chart.config.label AND declaratively via <mc-label>:
chart.config = {
  data: departmentData,
  label: {
    target: 'axis-tick', // 'all' | 'data' | 'axis-tick' | 'arc' | 'title' | 'marker' | ...
    maxWidth: 82,
    fontSize: 11
  }
};

// Declarative Web Component equivalent:
// <mc-bar-chart>
//   <mc-label target="axis-tick" max-width="82" font-size="11"></mc-label>
// </mc-bar-chart>
      `,
      'Multi-Line Wrapping with maxWidth'
    )
  );

  return mounted;
}

// ============================================================================
// ENTRY POINT: RENDER ANY GUIDE PAGE
// ============================================================================
export function renderGuidePage(
  root: HTMLElement,
  guideId: GuideId,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  root.innerHTML = '';
  root.appendChild(renderGuideHeader(guideId));

  const body = document.createElement('div');
  body.className = 'guide-body-stack';
  root.appendChild(body);

  switch (guideId) {
    case 'custom-layers':
      return renderCustomLayersGuide(body, themeMode);
    case 'themes':
      return renderThemesGuide(body, themeMode);
    case 'd3':
      return renderD3Guide(body, themeMode);
    case 'custom-labels':
      return renderCustomLabelsGuide(body, themeMode);
  }
}
