import { describe, it, expect, beforeEach } from 'vitest';
import pkg from '../package.json';
import {
  VERSION,
  LabelEngine,
  MOTION_PRESETS,
  createDefaultTheme,
  MCLineChart,
  MCBarChart,
  MCPieChart,
  MCHeatmapChart,
  MCRadarChart,
  MCSunburstChart,
  MCSankeyChart,
  MCScatterChart,
  MCTreemapChart,
  MCGaugeChart,
  MCLabelElement,
  MCAnimationLayer,
  MCAriaLayer,
  MCMarkerLayer
} from '../src/index';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_GAUGE_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_LINE_DATA,
  SAMPLE_PIE_DATA,
  SAMPLE_RADAR_DATA,
  SAMPLE_SANKEY_DATA,
  SAMPLE_SCATTER_DATA,
  SAMPLE_SUNBURST_DATA
} from '../examples/sample-data';

describe('modern-charts v0.1.0-alpha.0 architecture & dependencies', () => {
  it('exports version 0.1.0-alpha.0 and relies only on d3 and @chenglou/pretext', () => {
    expect(VERSION).toBe('0.1.0-alpha.0');
    expect(pkg.name).toBe('modern-charts');
    expect(pkg.version).toBe('0.1.0-alpha.0');
    const runtimeDeps = Object.keys(pkg.dependencies).sort();
    expect(runtimeDeps).toEqual(['@chenglou/pretext', 'd3']);
  });

  it('registers all chart, layer, animation, aria, marker, presentation item, and label Web Components in customElements', () => {
    const expectedTags = [
      'mc-label',
      'mc-theme-layer',
      'mc-scale-layer',
      'mc-view-layer',
      'mc-animation-layer',
      'mc-animation',
      'mc-aria-layer',
      'mc-aria',
      'mc-marker-layer',
      'mc-marker',
      'mc-chart-layer',
      'mc-custom-layer',
      'mc-bar-item',
      'mc-line-item',
      'mc-point-item',
      'mc-arc-item',
      'mc-cell-item',
      'mc-radar-item',
      'mc-sankey-node-item',
      'mc-sankey-link-item',
      'mc-scatter-item',
      'mc-line-chart',
      'mc-bar-chart',
      'mc-pie-chart',
      'mc-heatmap-chart',
      'mc-radar-chart',
      'mc-sunburst-chart',
      'mc-sankey-chart',
      'mc-scatter-chart',
      'mc-treemap-chart',
      'mc-gauge-chart'
    ];
    for (const tag of expectedTags) {
      expect(customElements.get(tag)).toBeDefined();
    }
  });

  it('separates pure Model Layer computation from dumb Presentation Item components', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);
    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 600,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge']
    };

    const barItems = bar.shadowRoot?.querySelectorAll(
      '[data-item-component="mc-bar-item"]'
    );
    expect(barItems?.length).toBe(8);
  });
});

describe('Nivo-style Single Unified chart.config & Underlying Sub-Components', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('configures data, layers, theme, scales, view, animation, markers, label, and aria from a single chart.config and syncs sub-components underneath', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 720,
      height: 400,
      title: 'Unified Config Spend Chart',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      groupMode: 'stacked',
      themeMode: 'dark',
      palette: 'nivo',
      xScale: { type: 'band', padding: 0.3 },
      yScale: { type: 'linear', min: 0, max: 500, stacked: true },
      view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 },
      animate: true,
      motionConfig: 'wobbly',
      markers: [
        {
          id: 'target-floor',
          type: 'line',
          axis: 'y',
          value: 150,
          label: 'Floor (150)',
          condition: 'below',
          matchStyle: { color: '#ef4444' }
        }
      ],
      labelMode: 'foreignObject',
      ariaLabel: 'Unified Bar Chart Accessible Name',
      barAriaLabel: (d) =>
        `Custom Bar ARIA: ${d.seriesId} in ${d.category} is $${d.value}K`,
      isFocusable: true
    };

    const subs = bar.getSubComponents();
    expect(subs.themeLayer).toBeInstanceOf(HTMLElement);
    expect(subs.scaleLayer).toBeInstanceOf(HTMLElement);
    expect(subs.viewLayer).toBeInstanceOf(HTMLElement);
    expect(subs.animationLayer).toBeInstanceOf(MCAnimationLayer);
    expect(subs.ariaLayer).toBeInstanceOf(MCAriaLayer);
    expect(subs.markerLayer).toBeInstanceOf(MCMarkerLayer);

    expect(subs.themeLayer?.getAttribute('mode')).toBe('dark');
    expect(subs.themeLayer?.getAttribute('palette')).toBe('nivo');
    expect(subs.scaleLayer?.getAttribute('y-max')).toBe('500');
    expect(subs.viewLayer?.getAttribute('max-zoom')).toBe('6');
    expect(subs.animationLayer?.getAttribute('preset')).toBe('wobbly');
    expect(subs.ariaLayer?.getAttribute('label')).toBe(
      'Unified Bar Chart Accessible Name'
    );
    expect(subs.markerLayer?.getMarkers().length).toBe(1);

    const bars = bar.shadowRoot?.querySelectorAll('.mc-bar-rect') ?? [];
    expect(bars.length).toBe(8);
    expect(bars[0].getAttribute('aria-label')).toBe(
      'Custom Bar ARIA: Cloud in Q1 is $142K'
    );
    expect(bars[0].getAttribute('data-animated')).toBe('true');
    expect(bars[0].getAttribute('data-animation-duration')).toBe(
      String(MOTION_PRESETS.wobbly.duration)
    );
    const foLabels =
      bar.shadowRoot?.querySelectorAll('.mc-label foreignObject') ?? [];
    expect(foLabels.length).toBeGreaterThan(0);
  });
});

describe('Dedicated <mc-marker-layer> / <mc-marker> Thresholds & Client Custom Layer Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders marker lines and marker areas, restyles bars and line points under threshold, and passes full threshold info to client custom layers', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    let customLayerReceivedMarkersCount = 0;
    let customLayerUnderThresholdCount = 0;
    let customLayerEvaluatedBelow = false;

    const clientAuditLayer = (ctx: any) => {
      customLayerReceivedMarkersCount = ctx.markers.length;
      customLayerUnderThresholdCount =
        ctx.thresholds.underThresholdItems.length;
      customLayerEvaluatedBelow = ctx.evaluateThresholds(75, {}, 'y').isUnderThreshold;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'client-threshold-layer');
      g.setAttribute(
        'data-under-count',
        String(ctx.thresholds.underThresholdItems.length)
      );
      return g;
    };

    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      markers: [
        {
          id: 'under-100-band',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 100,
          label: 'Low Spend Zone',
          fill: '#ef4444',
          fillOpacity: 0.1
        },
        {
          id: 'min-spend-line',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Min Threshold ($100K)',
          stroke: '#ef4444',
          condition: 'below',
          matchStyle: {
            color: '#ef4444',
            fill: '#ef4444',
            stroke: '#fda4af',
            className: 'bar-under-threshold'
          }
        }
      ],
      layers: ['grid', 'axes', 'bars', 'markers', 'labels', clientAuditLayer]
    };

    // 1. Marker line and marker area rendered
    expect(bar.shadowRoot?.querySelector('.mc-marker-line')).not.toBeNull();
    expect(bar.shadowRoot?.querySelector('.mc-marker-area')).not.toBeNull();

    // 2. Bars under 100 (Q1 Edge=94, Q1 OnPrem=58, Q2 OnPrem=52, Q3 OnPrem=49, Q4 OnPrem=44 -> 5 bars) changed color & style
    const underBars =
      bar.shadowRoot?.querySelectorAll(
        '.mc-bar-rect[data-under-threshold="true"]'
      ) ?? [];
    expect(underBars.length).toBe(5);
    expect(underBars[0].getAttribute('fill')).toBe('#ef4444');
    expect(underBars[0].classList.contains('bar-under-threshold')).toBe(true);

    // 3. Client custom layer received full marker & threshold info
    expect(customLayerReceivedMarkersCount).toBe(2);
    expect(customLayerUnderThresholdCount).toBe(5);
    expect(customLayerEvaluatedBelow).toBe(true);
    expect(
      bar.shadowRoot
        ?.querySelector('.client-threshold-layer')
        ?.getAttribute('data-under-count')
    ).toBe('5');
  });

  it('supports declarative <mc-marker-layer> and <mc-marker> elements on <mc-line-chart> and splits line path gradient at threshold', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    line.innerHTML = `
      <mc-marker-layer>
        <mc-marker
          id="sla-line"
          type="line"
          axis="y"
          value="130"
          label="SLA 130"
          condition="below"
          match-color="#ef4444"
          match-radius="7"
          match-class="point-under-sla"
        ></mc-marker>
      </mc-marker-layer>
    `;
    document.body.appendChild(line);
    line.config = {
      data: SAMPLE_LINE_DATA,
      width: 640,
      height: 360
    };

    const underPoints =
      line.shadowRoot?.querySelectorAll(
        '.mc-line-point[data-under-threshold="true"]'
      ) ?? [];
    expect(underPoints.length).toBeGreaterThan(0);
    expect(underPoints[0].getAttribute('fill')).toBe('#ef4444');
    expect(underPoints[0].getAttribute('r')).toBe('7');
    expect(underPoints[0].classList.contains('point-under-sla')).toBe(true);

    const threshPaths =
      line.shadowRoot?.querySelectorAll(
        '.mc-line-path[data-has-threshold-matches="true"]'
      ) ?? [];
    expect(threshPaths.length).toBeGreaterThan(0);
  });
});

describe('Dedicated <mc-animation-layer> & AnimationEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('supports Nivo motionConfig presets and animates individual items across charts with stagger', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    bar.innerHTML = `
      <mc-animation-layer preset="elastic" duration="820" stagger="45"></mc-animation-layer>
    `;
    document.body.appendChild(bar);
    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 600,
      height: 350,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge']
    };

    const rects = bar.shadowRoot?.querySelectorAll('.mc-bar-rect') ?? [];
    expect(rects.length).toBe(8);
    expect(rects[0].getAttribute('data-animated')).toBe('true');
    expect(rects[0].getAttribute('data-animation-type')).toBe('bar-vertical');
    expect(rects[0].getAttribute('data-animation-duration')).toBe('820');
    expect(rects[0].getAttribute('data-animation-delay')).toBe('0');
    expect(rects[1].getAttribute('data-animation-delay')).toBe('45');
    expect(rects[2].getAttribute('data-animation-delay')).toBe('90');

    bar.setConfig({ ...bar.config, animate: false });
    const staticRects = bar.shadowRoot?.querySelectorAll('.mc-bar-rect') ?? [];
    expect(staticRects[0].getAttribute('data-animated')).toBe('false');
  });
});

describe('Universal <mc-aria-layer> / <mc-aria> Item-Level Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('decorates every item in every chart as an ARIA item with customizable labels, keyboard navigation, and live announcements', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      aria: {
        label: 'Cloud and Edge Spend',
        isFocusable: true,
        itemRole: 'graphics-symbol',
        itemRoleDescription: 'spend bar',
        itemLabel: 'Series {{seriesId}} in {{category}}: ${{value}}K',
        itemDescription: 'Bar {{number}} of {{total}}',
        itemAttributes: (item) => ({
          'aria-valuetext': `$${item.value} thousand`
        })
      }
    };

    const items = Array.from(
      bar.shadowRoot?.querySelectorAll('.mc-bar-rect.mc-aria-item') ?? []
    ) as SVGElement[];
    expect(items.length).toBe(8);

    const first = items[0];
    expect(first.getAttribute('role')).toBe('graphics-symbol');
    expect(first.getAttribute('aria-roledescription')).toBe('spend bar');
    expect(first.getAttribute('aria-label')).toBe('Series Cloud in Q1: $142K');
    expect(first.getAttribute('aria-description')).toBe('Bar 1 of 8');
    expect(first.getAttribute('aria-valuenow')).toBe('142');
    expect(first.getAttribute('aria-valuetext')).toBe('$142 thousand');
    expect(first.getAttribute('tabindex')).toBe('0');

    let focusedLabel = '';
    bar.addEventListener('mc-aria-focus', (e: Event) => {
      focusedLabel = (e as CustomEvent).detail.label;
    });
    first.dispatchEvent(new FocusEvent('focus'));
    expect(focusedLabel).toBe('Series Cloud in Q1: $142K');

    const liveRegion = bar.shadowRoot?.querySelector('.mc-aria-live');
    expect(liveRegion?.textContent).toContain('Series Cloud in Q1: $142K');

    const dataTable = bar.shadowRoot?.querySelector('table.mc-aria-table');
    expect(dataTable).not.toBeNull();
    expect(dataTable?.querySelectorAll('tbody tr').length).toBe(8);
  });

  it('supports declarative <mc-aria> child element customization across charts', () => {
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    pie.innerHTML = `
      <mc-aria
        label="Footprint Donut"
        item-role="listitem"
        item-label="Slice {{label}} accounts for {{percentage}}"
      ></mc-aria>
    `;
    document.body.appendChild(pie);
    pie.data = SAMPLE_PIE_DATA;

    const slices =
      pie.shadowRoot?.querySelectorAll('.mc-pie-arc.mc-aria-item') ?? [];
    expect(slices.length).toBe(5);
    expect(slices[0].getAttribute('role')).toBe('listitem');
    expect(slices[0].getAttribute('aria-label')).toContain(
      'Slice D3 Scales & Layout accounts for 32.3%'
    );
  });
});

describe('Universal <mc-label> & @chenglou/pretext LabelEngine (Including <foreignObject> Icons)', () => {
  const theme = createDefaultTheme('dark', 'modern');

  it('calculates natural width and wraps multiline text via @chenglou/pretext without DOM reflow', () => {
    const engine = new LabelEngine();
    const single = engine.measure('Revenue', { maxWidth: 200 }, theme);
    expect(single.lineCount).toBe(1);
    expect(single.naturalWidth).toBeGreaterThan(20);

    const multi = engine.measure(
      'Quarterly Infrastructure Throughput Growth Analysis',
      { maxWidth: 95 },
      theme
    );
    expect(multi.lineCount).toBeGreaterThan(1);
    expect(multi.lines.length).toBe(multi.lineCount);
    expect(multi.boxHeight).toBeGreaterThan(single.boxHeight);
  });

  it('renders <foreignObject> containing inline SVG icons and accounts for icon dimensions via @chenglou/pretext', () => {
    const engine = new LabelEngine();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svgIcon = `<svg class="alert-icon" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;

    const textOnly = engine.measure('Server Latency', {}, theme);
    const withIcon = engine.measure(
      'Server Latency',
      { icon: svgIcon, iconSize: 14, iconGap: 6 },
      theme
    );
    expect(withIcon.iconExtraWidth).toBe(20);
    expect(withIcon.boxWidth).toBeGreaterThanOrEqual(textOnly.boxWidth + 20);

    const foGroup = engine.renderLabel(
      svg,
      {
        text: 'Server Latency',
        x: 100,
        y: 60,
        type: 'data',
        renderMode: 'foreignObject',
        icon: svgIcon,
        iconSize: 14,
        iconGap: 6
      },
      theme
    );
    expect(foGroup).not.toBeNull();
    const fo = foGroup?.querySelector('foreignObject');
    expect(fo).not.toBeNull();
    expect(fo?.querySelector('.mc-fo-label-icon svg.alert-icon')).not.toBeNull();
    expect(fo?.querySelector('.mc-fo-label-text')?.textContent).toBe(
      'Server Latency'
    );
  });

  it('allows injecting a raw <foreignObject> containing icons via <mc-label> or labelRenderer', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    bar.setAttribute('width', '600');
    bar.setAttribute('height', '360');
    bar.setAttribute('index-by', 'quarter');
    bar.setAttribute('keys', 'Cloud,Edge');

    const labelConfig = document.createElement('mc-label') as MCLabelElement;
    labelConfig.setAttribute('for', 'all');
    labelConfig.setAttribute('mode', 'foreignObject');
    labelConfig.innerHTML = `
      <template>
        <foreignObject>
          <div class="custom-fo-with-icon">
            <svg class="injected-svg-icon" width="12" height="12" viewBox="0 0 12 12"><rect width="12" height="12"/></svg>
            <b class="fo-universal">{{text}}</b>
          </div>
        </foreignObject>
      </template>
    `;
    bar.appendChild(labelConfig);

    container.appendChild(bar);
    bar.data = SAMPLE_BAR_DATA;

    const allLabels = bar.shadowRoot?.querySelectorAll('.mc-label') ?? [];
    expect(allLabels.length).toBeGreaterThan(5);

    const foLabels =
      bar.shadowRoot?.querySelectorAll('.mc-label foreignObject') ?? [];
    expect(foLabels.length).toBe(allLabels.length);
    expect(
      foLabels[0].querySelector('svg.injected-svg-icon')
    ).not.toBeNull();
    expect(Number(foLabels[0].getAttribute('width'))).toBeGreaterThan(20);

    container.remove();
  });
});

describe('Nivo-style Custom Layers & AI Layer-by-Layer Progressive Streaming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('supports declarative <mc-chart-layer> and <mc-custom-layer> streaming one by one', () => {
    const chart = document.createElement('mc-line-chart') as MCLineChart;
    chart.setAttribute('width', '640');
    chart.setAttribute('height', '360');
    document.body.appendChild(chart);
    chart.data = SAMPLE_LINE_DATA;

    const gridLayer = document.createElement('mc-chart-layer');
    gridLayer.setAttribute('name', 'grid');
    chart.appendChild(gridLayer);
    chart.render();
    expect(chart.getActiveLayers()).toEqual(['grid']);

    const axesLayer = document.createElement('mc-chart-layer');
    axesLayer.setAttribute('name', 'axes');
    chart.appendChild(axesLayer);
    chart.render();
    expect(chart.getActiveLayers()).toEqual(['grid', 'axes']);

    const linesLayer = document.createElement('mc-chart-layer');
    linesLayer.setAttribute('name', 'lines');
    chart.appendChild(linesLayer);
    chart.render();
    expect(chart.getActiveLayers()).toEqual(['grid', 'axes', 'lines']);

    const customLayer = document.createElement('mc-custom-layer');
    customLayer.setAttribute('name', 'ai-annotation');
    customLayer.innerHTML = `
      <line data-y="180" stroke="#ef4444" stroke-width="2"></line>
      <mc-label text="AI Threshold" data-y="170"></mc-label>
    `;
    chart.appendChild(customLayer);
    chart.render();

    expect(chart.getActiveLayers()).toEqual([
      'grid',
      'axes',
      'lines',
      'ai-annotation'
    ]);
    const customGroup = chart.shadowRoot?.querySelector(
      '.mc-layer--ai-annotation'
    );
    expect(customGroup).not.toBeNull();
    expect(customGroup?.querySelector('line')).not.toBeNull();
    expect(customGroup?.querySelector('.mc-label')).not.toBeNull();
  });

  it('supports programmatic Nivo-style custom layer functions in chart.layers and chart.streamLayers()', async () => {
    const chart = document.createElement('mc-line-chart') as MCLineChart;
    chart.setAttribute('width', '600');
    chart.setAttribute('height', '340');
    document.body.appendChild(chart);
    chart.data = SAMPLE_LINE_DATA;

    const customBannerLayer = (ctx: any) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'custom-fn-banner');
      ctx.renderLabel(g, {
        text: 'Custom Layer Function Label',
        x: ctx.innerWidth / 2,
        y: 20,
        type: 'custom'
      });
      return g;
    };

    await chart.streamLayers(['grid', 'lines', customBannerLayer], 10);
    expect(
      chart.shadowRoot?.querySelector('.custom-fn-banner .mc-label')
    ).not.toBeNull();
  });
});

describe('autoSize explicit flag vs Container/Parent sizing', () => {
  it('uses container/parent dimensions when autoSize is false and responds to explicit autoSize flag', () => {
    const parent = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', {
      value: 780,
      configurable: true
    });
    Object.defineProperty(parent, 'clientHeight', {
      value: 420,
      configurable: true
    });
    document.body.appendChild(parent);

    const chart = document.createElement('mc-line-chart') as MCLineChart;
    parent.appendChild(chart);
    chart.data = SAMPLE_LINE_DATA;

    expect(chart.autoSize).toBe(false);
    const dims = chart.resolveDimensions();
    expect(dims.width).toBe(780);
    expect(dims.height).toBe(420);

    chart.autoSize = true;
    expect(chart.hasAttribute('auto-size')).toBe(true);

    chart.resize(900, 480);
    const resizedDims = chart.resolveDimensions();
    expect(resizedDims.width).toBe(900);
    expect(resizedDims.height).toBe(480);

    parent.remove();
  });
});

describe('All 10 Chart Web Components render animated ARIA items & composable layers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders <mc-line-chart> with animated lines and ARIA points', () => {
    const el = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(el);
    el.config = {
      data: SAMPLE_LINE_DATA,
      width: 640,
      height: 360,
      enableArea: true,
      themeMode: 'dark',
      palette: 'nivo',
      view: { zoomable: true, pannable: true, showControls: true }
    };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-line-path[data-animated="true"]')
        .length
    ).toBe(3);
    expect(
      el.shadowRoot?.querySelectorAll('.mc-line-point.mc-aria-item').length
    ).toBe(21);
    const controls = el.shadowRoot?.querySelector(
      '.mc-view-controls'
    ) as HTMLElement;
    expect(controls.hidden).toBe(false);
  });

  it('renders <mc-bar-chart> in both grouped and stacked modes with ARIA bars', () => {
    const el = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(el);
    el.config = {
      data: SAMPLE_BAR_DATA,
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem']
    };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-bar-rect.mc-aria-item').length
    ).toBe(12);
    el.groupMode = 'stacked';
    expect(
      el.shadowRoot?.querySelectorAll('.mc-bar-rect.mc-aria-item').length
    ).toBe(12);
  });

  it('renders <mc-pie-chart> with animated ARIA arcs, radial link labels, and center label', () => {
    const el = document.createElement('mc-pie-chart') as MCPieChart;
    document.body.appendChild(el);
    el.config = { data: SAMPLE_PIE_DATA, width: 540, height: 360 };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-pie-arc.mc-aria-item').length
    ).toBe(5);
    expect(el.shadowRoot?.querySelectorAll('.mc-pie-link-line').length).toBe(5);
    expect(el.shadowRoot?.querySelector('.mc-label--center')).not.toBeNull();
  });

  it('renders <mc-heatmap-chart> with animated ARIA matrix cells and Pretext cell labels', () => {
    const el = document.createElement('mc-heatmap-chart') as MCHeatmapChart;
    document.body.appendChild(el);
    el.config = { data: SAMPLE_HEATMAP_DATA, width: 600, height: 360 };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-heatmap-cell.mc-aria-item').length
    ).toBe(20);
    expect(el.shadowRoot?.querySelectorAll('.mc-label--cell').length).toBe(20);
  });

  it('renders <mc-radar-chart> with animated polygons and ARIA radar dots', () => {
    const el = document.createElement('mc-radar-chart') as MCRadarChart;
    document.body.appendChild(el);
    el.config = {
      data: SAMPLE_RADAR_DATA,
      width: 540,
      height: 380,
      indexBy: 'metric',
      keys: ['ModernCharts', 'TraditionalChart']
    };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-radar-polygon[data-animated="true"]')
        .length
    ).toBe(2);
    expect(
      el.shadowRoot?.querySelectorAll('.mc-radar-dot.mc-aria-item').length
    ).toBe(12);
    expect(
      el.shadowRoot?.querySelectorAll('.mc-label--radar-axis').length
    ).toBe(6);
  });

  it('renders <mc-sunburst-chart> with animated ARIA partition arcs and click drilldown', () => {
    const el = document.createElement('mc-sunburst-chart') as MCSunburstChart;
    document.body.appendChild(el);
    el.config = { data: SAMPLE_SUNBURST_DATA, width: 540, height: 380 };

    const initialArcs =
      el.shadowRoot?.querySelectorAll('.mc-sunburst-arc.mc-aria-item') ?? [];
    expect(initialArcs.length).toBeGreaterThan(6);

    const firstArc = initialArcs[0] as SVGPathElement;
    firstArc.dispatchEvent(new MouseEvent('click'));
    const drilledArcs =
      el.shadowRoot?.querySelectorAll('.mc-sunburst-arc.mc-aria-item') ?? [];
    expect(drilledArcs.length).toBeGreaterThan(0);

    el.resetDrilldown();
    expect(
      el.shadowRoot?.querySelectorAll('.mc-sunburst-arc.mc-aria-item').length
    ).toBe(initialArcs.length);
  });

  it('renders <mc-sankey-chart> with animated ARIA flow links and ARIA nodes', () => {
    const el = document.createElement('mc-sankey-chart') as MCSankeyChart;
    document.body.appendChild(el);
    el.config = { data: SAMPLE_SANKEY_DATA, width: 640, height: 360 };

    expect(
      el.shadowRoot?.querySelectorAll('.mc-sankey-node.mc-aria-item').length
    ).toBe(7);
    expect(
      el.shadowRoot?.querySelectorAll('.mc-sankey-link.mc-aria-item').length
    ).toBe(8);
    expect(el.shadowRoot?.querySelectorAll('.mc-label--node').length).toBe(7);
  });

  it('renders <mc-scatter-chart>, <mc-treemap-chart>, and <mc-gauge-chart> with ARIA items', () => {
    const scatter = document.createElement(
      'mc-scatter-chart'
    ) as MCScatterChart;
    document.body.appendChild(scatter);
    scatter.config = {
      data: SAMPLE_SCATTER_DATA,
      width: 560,
      height: 340,
      enableTrendline: true
    };
    expect(
      scatter.shadowRoot?.querySelectorAll('.mc-scatter-node.mc-aria-item')
        .length
    ).toBe(7);
    expect(
      scatter.shadowRoot?.querySelector('.mc-scatter-trendline')
    ).not.toBeNull();

    const treemap = document.createElement(
      'mc-treemap-chart'
    ) as MCTreemapChart;
    document.body.appendChild(treemap);
    treemap.config = { data: SAMPLE_SUNBURST_DATA, width: 560, height: 340 };
    expect(
      treemap.shadowRoot?.querySelectorAll('.mc-treemap-tile.mc-aria-item')
        .length
    ).toBeGreaterThan(5);

    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    document.body.appendChild(gauge);
    gauge.config = { data: SAMPLE_GAUGE_DATA, width: 460, height: 320 };
    expect(
      gauge.shadowRoot?.querySelector('.mc-gauge-value-arc.mc-aria-item')
    ).not.toBeNull();
    expect(
      gauge.shadowRoot?.querySelector('.mc-gauge-needle[data-animated="true"]')
    ).not.toBeNull();
  });
});
