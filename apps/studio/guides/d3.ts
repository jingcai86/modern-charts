import type { MCBaseChart, ChartRenderContext, ThemeModePreference } from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderD3Guide(
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

