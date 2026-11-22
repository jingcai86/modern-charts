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
} from '../apps/sample-data';

describe('modern-charts architecture & dependencies', () => {
  it('exports package version matching package.json and relies only on d3 and @chenglou/pretext', () => {
    expect(pkg.name).toBe('modern-charts');
    expect(VERSION).toBe(pkg.version);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
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

    // Switch to light mode via setConfig and verify SVG & theme switch cleanly
    bar.setConfig({ ...bar.config, themeMode: 'light' });
    expect(bar.resolveTheme().mode).toBe('light');
    expect(bar.resolveTheme().background).toBe('#ffffff');
    expect(subs.themeLayer?.getAttribute('mode')).toBe('light');
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

    // 4. Removing 'markers' from active layers removes the marker visual layer
    bar.config = {
      ...bar.config,
      layers: []
    };
    expect(bar.shadowRoot?.querySelector('.mc-marker-line')).toBeNull();
    expect(bar.shadowRoot?.querySelector('.mc-marker-area')).toBeNull();
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

  it('keeps markers non-blocking (pointer-events: none) so tooltips work on items under markers across bar, line, and scatter charts', () => {
    // 1. Bar Chart: markers layer sits on top of bars
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);
    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 600,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      markers: [
        {
          id: 'floor-area',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 100,
          label: 'Risk Zone',
          fill: '#ef4444'
        },
        {
          id: 'floor-line',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Floor $100K',
          condition: 'below',
          matchStyle: { fill: '#ef4444' }
        }
      ],
      layers: ['grid', 'axes', 'bars', 'markers', 'labels', 'legends']
    };

    const barMarkerLayer = bar.shadowRoot?.querySelector('.mc-layer--markers');
    expect(barMarkerLayer?.getAttribute('pointer-events')).toBe('none');
    bar.shadowRoot
      ?.querySelectorAll('.mc-marker, .mc-marker-area, .mc-marker-line, .mc-label--marker')
      .forEach((el) => {
        expect(el.getAttribute('pointer-events')).toBe('none');
      });

    const underBar = bar.shadowRoot?.querySelector(
      '.mc-bar-rect[data-under-threshold="true"]'
    ) as SVGRectElement | null;
    expect(underBar).not.toBeNull();
    underBar!.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 120, clientY: 220 })
    );
    const barTooltip = bar.shadowRoot?.querySelector('.mc-tooltip') as HTMLElement;
    expect(barTooltip.hidden).toBe(false);
    expect(barTooltip.innerHTML).toContain('Under Threshold');

    // 2. Line Chart: markers layer placed above points & slices
    const line = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(line);
    line.config = {
      data: SAMPLE_LINE_DATA,
      width: 600,
      height: 360,
      enableSlices: false,
      markers: [
        {
          id: 'line-zone',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 120,
          label: 'Below Target',
          condition: 'below',
          matchStyle: { color: '#ef4444' }
        }
      ],
      layers: ['grid', 'axes', 'areas', 'lines', 'points', 'markers', 'legends']
    };

    const lineMarkerLayer = line.shadowRoot?.querySelector('.mc-layer--markers');
    expect(lineMarkerLayer?.getAttribute('pointer-events')).toBe('none');
    const linePoint = line.shadowRoot?.querySelector(
      '.mc-line-point'
    ) as SVGCircleElement | null;
    expect(linePoint).not.toBeNull();
    linePoint!.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 140, clientY: 180 })
    );
    const lineTooltip = line.shadowRoot?.querySelector('.mc-tooltip') as HTMLElement;
    expect(lineTooltip.hidden).toBe(false);

    // 3. Scatter Chart: markers layer placed above nodes
    const scatter = document.createElement('mc-scatter-chart') as MCScatterChart;
    document.body.appendChild(scatter);
    scatter.config = {
      data: SAMPLE_SCATTER_DATA,
      width: 600,
      height: 360,
      markers: [
        {
          id: 'scatter-band',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 75,
          label: 'Target Band'
        }
      ],
      layers: ['grid', 'axes', 'nodes', 'markers', 'labels', 'legends']
    };

    const scatterMarkerLayer = scatter.shadowRoot?.querySelector('.mc-layer--markers');
    expect(scatterMarkerLayer?.getAttribute('pointer-events')).toBe('none');
    const scatterNode = scatter.shadowRoot?.querySelector(
      '.mc-scatter-node'
    ) as SVGCircleElement | null;
    expect(scatterNode).not.toBeNull();
    scatterNode!.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 160, clientY: 160 })
    );
    const scatterTooltip = scatter.shadowRoot?.querySelector('.mc-tooltip') as HTMLElement;
    expect(scatterTooltip.hidden).toBe(false);
  });

  it('supports inside (top/bottom x left/center/right) and outside (left/right/top/bottom) marker label positions with labelPadding and auto-expanded margins', () => {
    const parseTranslate = (el: Element | null): { x: number; y: number } => {
      const t = el?.getAttribute('transform') ?? '';
      const m = /translate\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)/.exec(t);
      return { x: Number(m?.[1] ?? NaN), y: Number(m?.[2] ?? NaN) };
    };

    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);
    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'OnPrem'],
      margin: { top: 36, right: 24, bottom: 56, left: 52 },
      markers: [
        {
          id: 'tl',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Top Left',
          labelPosition: 'top-left',
          labelPadding: 14,
          labelEdgePadding: 16
        },
        {
          id: 'br',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Bottom Right',
          labelPosition: 'bottom-right',
          labelPadding: 18,
          labelEdgePadding: 12
        },
        {
          id: 'out-r',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Outside Right',
          labelPosition: 'outside-right',
          labelPadding: 12
        },
        {
          id: 'out-l',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Outside Left',
          labelPosition: 'outside-left',
          labelPadding: 15
        },
        {
          id: 'out-top',
          type: 'line',
          axis: 'x',
          value: 'Q2',
          label: 'Outside Top',
          labelPosition: 'outside-top',
          labelPadding: 10
        },
        {
          id: 'out-bot',
          type: 'line',
          axis: 'x',
          value: 'Q3',
          label: 'Outside Bottom',
          labelPosition: 'outside-bottom',
          labelPadding: 14
        }
      ]
    };

    const lineEl = bar.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="tl"] .mc-marker-line'
    );
    const lineY = Number(lineEl?.getAttribute('y1'));
    const innerWidth = Number(lineEl?.getAttribute('x2'));
    const xLineEl = bar.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="out-top"] .mc-marker-line'
    );
    const innerHeight = Number(xLineEl?.getAttribute('y2'));

    const tlPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-tl"]') ?? null
    );
    const brPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-br"]') ?? null
    );
    const outRPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-out-r"]') ?? null
    );
    const outLPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-out-l"]') ?? null
    );
    const outTopPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-out-top"]') ?? null
    );
    const outBotPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-out-bot"]') ?? null
    );

    // Inside top-left sits above the line by labelPadding (14) and inset from left by labelEdgePadding (16)
    expect(tlPos.x).toBe(16);
    expect(tlPos.y).toBeCloseTo(lineY - 14, 1);

    // Inside bottom-right sits below the line by labelPadding (18) and inset from right by labelEdgePadding (12)
    expect(brPos.x).toBeCloseTo(innerWidth - 12, 1);
    expect(brPos.y).toBeCloseTo(lineY + 18, 1);

    // Outside right sits to the right of innerWidth by labelPadding (12)
    expect(outRPos.x).toBeCloseTo(innerWidth + 12, 1);
    expect(outRPos.y).toBeCloseTo(lineY, 1);

    // Outside left sits to the left of the Y-axis by labelPadding (15)
    expect(outLPos.x).toBe(-15);
    expect(outLPos.y).toBeCloseTo(lineY, 1);

    // Outside top sits above top edge by labelPadding (10)
    expect(outTopPos.y).toBe(-10);

    // Outside bottom sits below bottom X-axis by labelPadding (14)
    expect(outBotPos.y).toBeCloseTo(innerHeight + 14, 1);

    // Margins automatically expanded to fit outside-left and outside-right labels
    const resolvedDims = bar.resolveDimensions();
    expect(resolvedDims.margin.right).toBeGreaterThan(24);
    expect(resolvedDims.margin.left).toBeGreaterThan(52);

    // Declarative <mc-marker> attributes forward label-position & label-padding cleanly
    const declMarker = document.createElement('mc-marker') as any;
    declMarker.setAttribute('axis', 'y');
    declMarker.setAttribute('value', '100');
    declMarker.setAttribute('label', 'Goal');
    declMarker.setAttribute('label-position', 'bottom-left');
    declMarker.setAttribute('label-padding', '16');
    declMarker.setAttribute('label-edge-padding', '20');
    const parsed = declMarker.toMarkerConfig();
    expect(parsed.labelPosition).toBe('bottom-left');
    expect(parsed.labelPadding).toBe(16);
    expect(parsed.labelEdgePadding).toBe(20);
  });
});

describe('Bar Outer & Stack-Summary Labels (Issue #21)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const parseTranslate = (el: Element | null): { x: number; y: number } => {
    const t = el?.getAttribute('transform') ?? '';
    const m = t.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
    return { x: Number(m?.[1] ?? NaN), y: Number(m?.[2] ?? NaN) };
  };

  it('supports coexisting centered inner bar labels and above-bar stacked total outer labels simultaneously, as well as either independently', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    // 1. Both inner labels AND stacked outer totals enabled simultaneously
    bar.config = {
      data: [
        { quarter: 'Q1', Cloud: 120, Edge: 80 },
        { quarter: 'Q2', Cloud: 150, Edge: 100 }
      ],
      width: 640,
      height: 400,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      groupMode: 'stacked',
      enableLabels: true,
      outerLabels: {
        enabled: true,
        padding: 10
      }
    };

    const innerLabels = bar.shadowRoot?.querySelectorAll(
      '.mc-label--data'
    ) as NodeListOf<SVGGElement>;
    const outerLabels = bar.shadowRoot?.querySelectorAll(
      '.mc-label--bar-outer'
    ) as NodeListOf<SVGGElement>;

    // 4 stacked segments have inner labels AND 2 categories have stack-total outer labels
    expect(innerLabels.length).toBe(4);
    expect(outerLabels.length).toBe(2);
    expect(outerLabels[0].textContent?.trim()).toBe('200');
    expect(outerLabels[1].textContent?.trim()).toBe('250');

    // Outer stack label sits strictly above the highest bar rect in that stack
    const q1Rects = Array.from(
      bar.shadowRoot?.querySelectorAll('.mc-bar-rect[data-index="Q1"]') ?? []
    );
    expect(q1Rects.length).toBe(2);
    const q1TopY = Math.min(
      ...q1Rects.map((r) => Number(r.getAttribute('y')))
    );
    const q1OuterPos = parseTranslate(outerLabels[0]);
    expect(q1OuterPos.y).toBeLessThan(q1TopY);

    // 2. Outer labels only (enableLabels: false)
    bar.config = {
      ...bar.config,
      enableLabels: false,
      outerLabels: { enabled: true, padding: 10 }
    };
    expect(bar.shadowRoot?.querySelectorAll('.mc-label--data').length).toBe(0);
    expect(bar.shadowRoot?.querySelectorAll('.mc-label--bar-outer').length).toBe(
      2
    );

    // 3. Inner labels only (outerLabels disabled)
    bar.config = {
      ...bar.config,
      enableLabels: true,
      outerLabels: false
    };
    expect(bar.shadowRoot?.querySelectorAll('.mc-label--data').length).toBe(4);
    expect(bar.shadowRoot?.querySelectorAll('.mc-label--bar-outer').length).toBe(
      0
    );
  });

  it('positions negative bar/stack outer labels with outside-bottom, chart-bottom, above-zero, and custom padding', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    const mixedData = [
      { quarter: 'Q1', Revenue: 120, Cost: -40 },
      { quarter: 'Q2', Revenue: 80, Cost: -110 }
    ];

    // 1. Diverging stacked bars with outside-bottom and padding = 8
    bar.config = {
      data: mixedData,
      width: 640,
      height: 420,
      indexBy: 'quarter',
      keys: ['Revenue', 'Cost'],
      groupMode: 'stacked',
      enableLabels: true,
      outerLabels: {
        enabled: true,
        negativePosition: 'outside-bottom',
        padding: 8
      }
    };

    const q1PosOuter8 = bar.shadowRoot?.querySelector(
      '[data-label-id="bar-outer-stack-pos-Q1"]'
    );
    const q1NegOuter8 = bar.shadowRoot?.querySelector(
      '[data-label-id="bar-outer-stack-neg-Q1"]'
    );
    const q2NegOuter8 = bar.shadowRoot?.querySelector(
      '[data-label-id="bar-outer-stack-neg-Q2"]'
    );
    expect(q1PosOuter8?.textContent?.trim()).toBe('120');
    expect(q1NegOuter8?.textContent?.trim()).toBe('-40');
    expect(q2NegOuter8?.textContent?.trim()).toBe('-110');

    const getBarEdge = (cat: string, seriesKey: string) => {
      const rect = bar.shadowRoot?.querySelector(
        `.mc-bar-rect[data-index="${cat}"][data-key="${seriesKey}"]`
      );
      expect(rect).not.toBeNull();
      const y = Number(rect?.getAttribute('y'));
      const h = Number(rect?.getAttribute('height'));
      return { top: y, bottom: y + h };
    };

    const pos8 = parseTranslate(q1PosOuter8!);
    const negQ1Out8 = parseTranslate(q1NegOuter8!);
    const negQ2Out8 = parseTranslate(q2NegOuter8!);
    const q1PosEdge8 = getBarEdge('Q1', 'Revenue');
    const q1NegEdge8 = getBarEdge('Q1', 'Cost');
    const posGap8 = q1PosEdge8.top - pos8.y;
    const negGap8 = negQ1Out8.y - q1NegEdge8.bottom;

    // In outside-bottom mode, Q2 (-110) extends further down than Q1 (-40)
    expect(negQ2Out8.y).toBeGreaterThan(negQ1Out8.y);

    // Increasing padding from 8 -> 20 increases distance away from bar edges by 12px
    // AND automatically expands top margin to prevent clipping
    const topMargin8 = bar.resolveDimensions().margin.top;
    bar.config = {
      ...bar.config,
      outerLabels: {
        enabled: true,
        negativePosition: 'outside-bottom',
        padding: 20
      }
    };
    const pos20 = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="bar-outer-stack-pos-Q1"]')!
    );
    const neg20 = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="bar-outer-stack-neg-Q1"]')!
    );
    const q1PosEdge20 = getBarEdge('Q1', 'Revenue');
    const q1NegEdge20 = getBarEdge('Q1', 'Cost');
    const posGap20 = q1PosEdge20.top - pos20.y;
    const negGap20 = neg20.y - q1NegEdge20.bottom;
    expect(posGap20 - posGap8).toBeCloseTo(12, 1);
    expect(negGap20 - negGap8).toBeCloseTo(12, 1);
    expect(bar.resolveDimensions().margin.top).toBeGreaterThan(topMargin8);

    // 2. negativePosition: 'chart-bottom' aligns both Q1 and Q2 negative labels on the same horizontal row
    bar.config = {
      ...bar.config,
      outerLabels: {
        enabled: true,
        negativePosition: 'chart-bottom',
        padding: 8
      }
    };
    const q1ChartBottom = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="bar-outer-stack-neg-Q1"]')!
    );
    const q2ChartBottom = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="bar-outer-stack-neg-Q2"]')!
    );
    expect(q1ChartBottom.y).toBeCloseTo(q2ChartBottom.y, 1);

    // 3. negativePosition: 'above-zero' places negative label above the zero baseline
    bar.config = {
      data: [
        { quarter: 'Q1', Loss: -45 },
        { quarter: 'Q2', Loss: -95 }
      ],
      width: 640,
      height: 380,
      indexBy: 'quarter',
      keys: ['Loss'],
      groupMode: 'grouped',
      outerLabels: {
        enabled: true,
        negativePosition: 'above-zero',
        padding: 8
      }
    };
    const lossBarRect = bar.shadowRoot?.querySelector(
      '.mc-bar-rect[data-index="Q1"]'
    );
    expect(lossBarRect).not.toBeNull();
    const lossBarTopY = Number(lossBarRect?.getAttribute('y'));
    const aboveZeroPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="bar-outer-Loss-Q1"]')!
    );
    expect(aboveZeroPos.y).toBeLessThan(lossBarTopY);
  });

  it('supports custom formatting, <mc-label for="bar-outer"> overrides, foreignObject icons, custom renderer, horizontal layout, and HTML attributes', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    const outerLabelOverride = document.createElement('mc-label') as MCLabelElement;
    outerLabelOverride.setAttribute('for', 'bar-outer');
    outerLabelOverride.setAttribute('mode', 'foreignObject');
    outerLabelOverride.setAttribute('bg-color', '#0f172a');
    outerLabelOverride.setAttribute('color', '#f8fafc');
    outerLabelOverride.setAttribute('icon', '⭐');
    bar.appendChild(outerLabelOverride);
    document.body.appendChild(bar);

    bar.config = {
      data: [
        { quarter: 'Q1', Cloud: 100, Edge: 50 },
        { quarter: 'Q2', Cloud: 140, Edge: 60 }
      ],
      width: 640,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      groupMode: 'stacked',
      enableLabels: true,
      outerLabels: {
        enabled: true,
        padding: 10,
        formatter: (d) => `Σ $${d.positiveTotal}K`
      }
    };

    const outerFo = bar.shadowRoot?.querySelectorAll(
      '.mc-label--bar-outer foreignObject'
    );
    expect(outerFo?.length).toBe(2);
    expect(outerFo?.[0].textContent).toContain('Σ $150K');
    expect(outerFo?.[0].textContent).toContain('⭐');
    // Inner labels remain SVG and unaffected by <mc-label for="bar-outer">
    const innerSvgLabels = bar.shadowRoot?.querySelectorAll(
      '.mc-label--data text'
    );
    expect(innerSvgLabels?.length).toBe(4);

    // Custom renderer on outerLabels
    bar.removeChild(outerLabelOverride);
    bar.config = {
      ...bar.config,
      layout: 'horizontal',
      outerLabels: {
        enabled: true,
        padding: 12,
        renderer: (desc) => `<text class="custom-outer-sum">${desc.text}!</text>`
      }
    };
    const customNodes = bar.shadowRoot?.querySelectorAll('.custom-outer-sum');
    expect(customNodes?.length).toBe(2);
    expect(customNodes?.[0].textContent).toBe('150!');

    // Declarative HTML attributes on <mc-bar-chart>
    const declBar = document.createElement('mc-bar-chart') as MCBarChart;
    declBar.setAttribute('enable-outer-labels', 'true');
    declBar.setAttribute('outer-label-scope', 'stack');
    declBar.setAttribute('outer-label-position', 'top');
    declBar.setAttribute('negative-label-position', 'chart-bottom');
    declBar.setAttribute('outer-label-padding', '14');
    const resolved = declBar.resolveOuterLabelsConfig();
    expect(resolved.enabled).toBe(true);
    expect(resolved.scope).toBe('stack');
    expect(resolved.position).toBe('top');
    expect(resolved.negativePosition).toBe('chart-bottom');
    expect(resolved.padding).toBe(14);
  });
});

describe('Partial / Split Threshold Styling — Option B Semantic <g> ARIA Host + Clipped Shapes (Issue #18)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('splits bars crossing a threshold into a single semantic <g> ARIA host with aria-hidden clipped segments supporting fill, stroke, dasharray, and opacity', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    bar.config = {
      data: [
        { quarter: 'Q1', Spend: 60 },
        { quarter: 'Q2', Spend: 150 },
        { quarter: 'Q3', Spend: 200 }
      ],
      width: 640,
      height: 380,
      indexBy: 'quarter',
      keys: ['Spend'],
      borderRadius: 6,
      markers: [
        {
          id: 'cap-100',
          type: 'line',
          axis: 'y',
          value: 100,
          label: 'Cap $100K',
          condition: 'above',
          matchStyle: {
            color: '#ef4444',
            stroke: '#991b1b',
            strokeWidth: 2,
            strokeDasharray: '4 2',
            opacity: 0.85
          }
        }
      ]
    };

    // ARIA invariant: 3 bars -> strictly 3 focusable .mc-aria-item elements (NEVER doubled!)
    const ariaItems = bar.shadowRoot?.querySelectorAll('.mc-aria-item') ?? [];
    expect(ariaItems.length).toBe(3);

    // Q1 (60): 0% above 100 -> single normal <rect> with original color
    const q1 = bar.shadowRoot?.querySelector(
      '[data-item-component="mc-bar-item"][data-index="Q1"]'
    );
    expect(q1?.tagName.toLowerCase()).toBe('rect');
    expect(q1?.getAttribute('data-threshold-split')).toBeNull();

    // Q2 (150) & Q3 (200): cross 100 -> Option B single <g> ARIA host + 2 aria-hidden clipped <rect>s
    const q2 = bar.shadowRoot?.querySelector(
      '[data-item-component="mc-bar-item"][data-index="Q2"]'
    );
    expect(q2?.tagName.toLowerCase()).toBe('g');
    expect(q2?.getAttribute('data-threshold-split')).toBe('partial');
    expect(q2?.getAttribute('role')).toBe('graphics-symbol');
    expect(q2?.hasAttribute('tabindex')).toBe(true);
    expect(q2?.getAttribute('aria-label')).toContain('Q2');
    expect(q2?.getAttribute('aria-description')).toContain('Cap $100K');

    const baseSeg = q2?.querySelector('.mc-bar-segment--base');
    const threshSeg = q2?.querySelector('.mc-bar-segment--threshold');
    expect(baseSeg).not.toBeNull();
    expect(threshSeg).not.toBeNull();

    // Decorative clipped children are hidden from screen readers and non-focusable
    for (const child of [baseSeg, threshSeg]) {
      expect(child?.getAttribute('aria-hidden')).toBe('true');
      expect(child?.getAttribute('role')).toBe('presentation');
      expect(child?.hasAttribute('tabindex')).toBe(false);
      expect(child?.classList.contains('mc-aria-item')).toBe(false);
      expect(child?.getAttribute('rx')).toBe('6');
    }

    // Threshold segment applies full partial styling (fill + stroke + dasharray + opacity)
    expect(threshSeg?.getAttribute('fill')).toBe('#ef4444');
    expect(threshSeg?.getAttribute('stroke')).toBe('#991b1b');
    expect(threshSeg?.getAttribute('stroke-dasharray')).toBe('4 2');
    expect(threshSeg?.getAttribute('fill-opacity')).toBe('0.85');
    expect(baseSeg?.getAttribute('fill')).not.toBe('#ef4444');

    // Both segments reference valid unique <clipPath> definitions in <defs>
    const baseClipMatch = baseSeg
      ?.getAttribute('clip-path')
      ?.match(/url\(#([^)]+)\)/);
    const threshClipMatch = threshSeg
      ?.getAttribute('clip-path')
      ?.match(/url\(#([^)]+)\)/);
    expect(baseClipMatch?.[1]).toBeTruthy();
    expect(threshClipMatch?.[1]).toBeTruthy();
    expect(baseClipMatch?.[1]).not.toBe(threshClipMatch?.[1]);
    expect(bar.shadowRoot?.querySelector(`#${baseClipMatch![1]}`)).not.toBeNull();
    expect(
      bar.shadowRoot?.querySelector(`#${threshClipMatch![1]}`)
    ).not.toBeNull();

    // Hovering the semantic <g> triggers the tooltip cleanly
    q2?.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 200, clientY: 160 })
    );
    const tooltip = bar.shadowRoot?.querySelector('.mc-tooltip') as HTMLElement;
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.innerHTML).toContain('Crosses Threshold');

    // Switching matchScope to 'item' falls back to whole-bar single <rect> restyling
    bar.config = {
      ...bar.config,
      markers: [
        {
          id: 'cap-100',
          type: 'line',
          axis: 'y',
          value: 100,
          condition: 'above',
          matchScope: 'item',
          matchStyle: { color: '#ef4444' }
        }
      ]
    };
    const q2ItemScope = bar.shadowRoot?.querySelector(
      '[data-item-component="mc-bar-item"][data-index="Q2"]'
    );
    expect(q2ItemScope?.tagName.toLowerCase()).toBe('rect');
    expect(q2ItemScope?.getAttribute('fill')).toBe('#ef4444');
    expect(q2ItemScope?.getAttribute('data-threshold-split')).toBe('item');
  });

  it('supports partial threshold splits across horizontal bars, between-bands, stacked bars, and <mc-marker match-scope>', () => {
    // 1. Horizontal bar crossing an x-axis threshold
    const hBar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(hBar);
    hBar.config = {
      data: [
        { team: 'Core', Score: 40 },
        { team: 'AI', Score: 140 }
      ],
      width: 600,
      height: 300,
      indexBy: 'team',
      keys: ['Score'],
      layout: 'horizontal',
      markers: [
        {
          id: 'x-cap',
          type: 'line',
          axis: 'x',
          value: 100,
          condition: 'above',
          matchStyle: { color: '#f59e0b' }
        }
      ]
    };
    expect(hBar.shadowRoot?.querySelectorAll('.mc-aria-item').length).toBe(2);
    const aiBar = hBar.shadowRoot?.querySelector(
      '[data-item-component="mc-bar-item"][data-index="AI"]'
    );
    expect(aiBar?.tagName.toLowerCase()).toBe('g');
    expect(aiBar?.getAttribute('data-threshold-split')).toBe('partial');

    // 2. Stacked bar with between band: only crossing segment splits; base clipPath unions top & bottom unmatched bands
    const sBar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(sBar);
    sBar.config = {
      data: [{ quarter: 'Q1', Base: 50, Peak: 150 }],
      width: 500,
      height: 360,
      indexBy: 'quarter',
      keys: ['Base', 'Peak'],
      groupMode: 'stacked',
      markers: [
        {
          id: 'mid-band',
          type: 'area',
          axis: 'y',
          from: 80,
          to: 140,
          condition: 'between',
          matchStyle: { color: '#ec4899' }
        }
      ]
    };
    const peakBar = sBar.shadowRoot?.querySelector(
      '[data-item-component="mc-bar-item"][data-key="Peak"]'
    );
    expect(peakBar?.tagName.toLowerCase()).toBe('g');
    const baseClipId = peakBar
      ?.querySelector('.mc-bar-segment--base')
      ?.getAttribute('clip-path')
      ?.match(/url\(#([^)]+)\)/)?.[1];
    // Peak spans [50, 200] while band is [80, 140], so base clipPath has 2 disjoint rects ([50,80] and [140,200])
    const baseClipRects = sBar.shadowRoot?.querySelectorAll(`#${baseClipId} rect`);
    expect(baseClipRects?.length).toBe(2);

    // 3. Declarative <mc-marker match-scope="item">
    const declMarker = document.createElement('mc-marker') as any;
    declMarker.setAttribute('axis', 'y');
    declMarker.setAttribute('value', '100');
    declMarker.setAttribute('condition', 'above');
    declMarker.setAttribute('match-scope', 'item');
    expect(declMarker.toMarkerConfig().matchScope).toBe('item');
  });

  it('splits both line path stroke and area fill at threshold boundaries with unique per-chart clipPath IDs across multiple charts', () => {
    const makeLineChart = () => {
      const el = document.createElement('mc-line-chart') as MCLineChart;
      document.body.appendChild(el);
      el.config = {
        data: [
          {
            id: 'Traffic',
            data: [
              { x: 'Jan', y: 60 },
              { x: 'Feb', y: 180 },
              { x: 'Mar', y: 90 },
              { x: 'Apr', y: 210 }
            ]
          }
        ],
        width: 600,
        height: 340,
        enableArea: true,
        markers: [
          {
            id: 'high-alert',
            type: 'line',
            axis: 'y',
            value: 150,
            condition: 'above',
            matchStyle: {
              color: '#ef4444',
              stroke: '#ef4444',
              strokeDasharray: '5 3'
            }
          }
        ]
      };
      return el;
    };

    const line1 = makeLineChart();
    const line2 = makeLineChart();

    const pathGroup1 = line1.shadowRoot?.querySelector(
      '.mc-line-path[data-threshold-split="partial"]'
    );
    const areaGroup1 = line1.shadowRoot?.querySelector(
      '.mc-line-area[data-threshold-split="partial"]'
    );
    expect(pathGroup1?.tagName.toLowerCase()).toBe('g');
    expect(areaGroup1?.tagName.toLowerCase()).toBe('g');

    const lineThreshSeg = pathGroup1?.querySelector('.mc-line-segment--threshold');
    expect(lineThreshSeg?.getAttribute('stroke')).toBe('#ef4444');
    expect(lineThreshSeg?.getAttribute('stroke-dasharray')).toBe('5 3');
    expect(lineThreshSeg?.getAttribute('aria-hidden')).toBe('true');

    const areaThreshSeg = areaGroup1?.querySelector(
      '.mc-line-area-segment--threshold'
    );
    expect(areaThreshSeg?.getAttribute('aria-hidden')).toBe('true');
    expect(areaThreshSeg?.getAttribute('clip-path')).toMatch(/^url\(#mc-thresh-clip-\d+\)$/);

    // ClipPath IDs across two separate charts never collide
    const clip1 = lineThreshSeg?.getAttribute('clip-path');
    const clip2 = line2.shadowRoot
      ?.querySelector('.mc-line-segment--threshold')
      ?.getAttribute('clip-path');
    expect(clip1).toBeTruthy();
    expect(clip2).toBeTruthy();
    expect(clip1).not.toBe(clip2);
  });
});
