import { describe, it, expect, beforeEach } from 'vitest';
import pkg from '../package.json';
import {
  VERSION,
  AnimationEngine,
  LabelEngine,
  MOTION_PRESETS,
  buildAxisScale,
  createDefaultTheme,
  createSequentialColorScale,
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
  MCLegendElement,
  MCTooltipElement,
  computeLegendLayout,
  createDefaultLegendConfig,
  MCAnimationLayer,
  MCAriaLayer,
  MCMarkerLayer,
  type LegendItem,
  type TooltipPayload
} from '../src/index';
import {
  extent,
  scaleBand,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scaleSqrt,
  scaleSymlog
} from '../src/core/scales';
import {
  formatAxisDate,
  formatAxisNumber,
  formatGroupedNumber
} from '../src/core/format';
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
} from '../apps/studio/sample-data';

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
      'mc-legend',
      'mc-tooltip',
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
    const barTooltip = bar.shadowRoot?.querySelector(
      '.mc-tooltip'
    ) as MCTooltipElement;
    expect(barTooltip.hidden).toBe(false);
    expect(barTooltip.renderedHtml).toContain('Under Threshold');

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
          id: 'ann-r',
          type: 'line',
          axis: 'y',
          value: 100,
          annotation: {
            text: 'SLA 100',
            position: 'right',
            padding: 12
          }
        },
        {
          id: 'ann-l',
          type: 'line',
          axis: 'y',
          value: 100,
          annotation: {
            text: 'Left Target',
            position: 'left',
            padding: 15
          }
        },
        {
          id: 'ann-top',
          type: 'line',
          axis: 'x',
          value: 'Q2',
          annotation: {
            text: 'Launch',
            position: 'top',
            padding: 10
          }
        },
        {
          id: 'ann-bot',
          type: 'line',
          axis: 'x',
          value: 'Q3',
          annotation: {
            icon: '⚠️',
            position: 'bottom',
            padding: 14
          }
        }
      ]
    };

    const lineEl = bar.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="tl"] .mc-marker-line'
    );
    const lineY = Number(lineEl?.getAttribute('y1'));
    const innerWidth = Number(lineEl?.getAttribute('x2'));
    const xLineEl = bar.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="ann-top"] .mc-marker-line'
    );
    const innerHeight = Number(xLineEl?.getAttribute('y2'));

    const tlPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-tl"]') ?? null
    );
    const brPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-label-br"]') ?? null
    );
    const annRPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-annotation-ann-r"]') ?? null
    );
    const annLPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-annotation-ann-l"]') ?? null
    );
    const annTopPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-annotation-ann-top"]') ?? null
    );
    const annBotPos = parseTranslate(
      bar.shadowRoot?.querySelector('[data-label-id="marker-annotation-ann-bot"]') ?? null
    );

    // Inside top-left sits above the line by labelPadding (14) and inset from left by labelEdgePadding (16)
    expect(tlPos.x).toBe(16);
    expect(tlPos.y).toBeCloseTo(lineY - 14, 1);

    // Inside bottom-right sits below the line by labelPadding (18) and inset from right by labelEdgePadding (12)
    expect(brPos.x).toBeCloseTo(innerWidth - 12, 1);
    expect(brPos.y).toBeCloseTo(lineY + 18, 1);

    // Outside right annotation sits to the right of innerWidth by padding (12)
    expect(annRPos.x).toBeCloseTo(innerWidth + 12, 1);
    expect(annRPos.y).toBeCloseTo(lineY, 1);

    // Outside left annotation sits to the left of the Y-axis by padding (15)
    expect(annLPos.x).toBe(-15);
    expect(annLPos.y).toBeCloseTo(lineY, 1);

    // Outside top annotation sits above top edge by padding (10)
    expect(annTopPos.y).toBe(-10);

    // Outside bottom icon-only annotation sits below bottom edge by padding (14)
    expect(annBotPos.y).toBeCloseTo(innerHeight + 14, 1);

    // Margins automatically expanded to fit outside annotations
    const resolvedDims = bar.resolveDimensions();
    expect(resolvedDims.margin.right).toBeGreaterThan(24);
    expect(resolvedDims.margin.left).toBeGreaterThan(52);

    // Declarative <mc-marker> attributes forward inside label + annotation + legend cleanly
    const declMarker = document.createElement('mc-marker') as any;
    declMarker.setAttribute('axis', 'y');
    declMarker.setAttribute('value', '100');
    declMarker.setAttribute('label', 'Goal');
    declMarker.setAttribute('label-position', 'bottom-left');
    declMarker.setAttribute('label-padding', '16');
    declMarker.setAttribute('label-edge-padding', '20');
    declMarker.setAttribute('annotation-text', 'SLA');
    declMarker.setAttribute('annotation-icon', '⚡');
    declMarker.setAttribute('annotation-position', 'right');
    declMarker.setAttribute('annotation-padding', '12');
    declMarker.setAttribute('legend', 'true');
    declMarker.setAttribute('legend-label', 'SLA Floor');
    const parsed = declMarker.toMarkerConfig();
    expect(parsed.labelPosition).toBe('bottom-left');
    expect(parsed.labelPadding).toBe(16);
    expect(parsed.labelEdgePadding).toBe(20);
    expect(parsed.annotation).toMatchObject({
      text: 'SLA',
      icon: '⚡',
      position: 'right',
      padding: 12
    });
    expect(parsed.legend).toMatchObject({
      enabled: true,
      label: 'SLA Floor'
    });
  });

  it('supports marker legends (line & area) with dedicated legend tooltips and interactive outside annotation tooltips (default true)', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(line);

    line.config = {
      data: SAMPLE_LINE_DATA,
      width: 680,
      height: 360,
      markers: [
        {
          id: 'alert-zone',
          type: 'area',
          axis: 'y',
          from: 0,
          to: 120,
          fill: '#f59e0b',
          fillOpacity: 0.14,
          annotation: {
            text: 'Alert Band',
            position: 'left',
            padding: 10,
            tooltip: 'Values under 120 trigger alerts'
          },
          legend: {
            label: 'Alert Band (0-120)',
            tooltip: 'Highlighted area marker band'
          }
        },
        {
          id: 'sla-line',
          type: 'line',
          axis: 'y',
          value: 120,
          stroke: '#ef4444',
          strokeDasharray: '6 4',
          condition: 'below',
          annotation: {
            icon: '⚠️',
            text: 'SLA 120',
            position: 'right',
            padding: 10
          },
          legend: true
        },
        {
          id: 'no-tip-ann',
          type: 'line',
          axis: 'x',
          value: 'Mar',
          stroke: '#38bdf8',
          annotation: {
            text: 'Silent',
            position: 'top',
            enableTooltip: false
          }
        }
      ]
    };

    // 1. Marker lines & areas keep pointer-events: none while annotations have pointer-events: auto
    const markerLine = line.shadowRoot?.querySelector(
      '.mc-marker[data-marker-id="sla-line"] .mc-marker-line'
    );
    expect(markerLine?.getAttribute('pointer-events')).toBe('none');

    const slaAnn = line.shadowRoot?.querySelector(
      '.mc-marker-annotation[data-marker-id="sla-line"]'
    ) as SVGGElement | null;
    expect(slaAnn).not.toBeNull();
    expect(slaAnn?.getAttribute('pointer-events')).toBe('auto');
    expect(slaAnn?.getAttribute('data-annotation-position')).toBe('right');

    // 2. Hovering & focusing outside annotation shows unified chart tooltip by default
    const itemTip = line.getTooltipElement()!;
    slaAnn!.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 600, clientY: 180 })
    );
    expect(itemTip.hidden).toBe(false);
    expect(itemTip.renderedHtml).toContain('SLA 120');
    expect(itemTip.renderedHtml).toContain('Line Marker');
    slaAnn!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(itemTip.hidden).toBe(true);

    // Area annotation with custom tooltip string also works on keyboard focus & hides on Escape
    const areaAnn = line.shadowRoot?.querySelector(
      '.mc-marker-annotation[data-marker-id="alert-zone"]'
    ) as SVGGElement;
    areaAnn.dispatchEvent(new FocusEvent('focus'));
    expect(itemTip.hidden).toBe(false);
    expect(itemTip.renderedHtml).toContain('Values under 120 trigger alerts');
    areaAnn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(itemTip.hidden).toBe(true);

    // Annotation with enableTooltip: false does not open tooltip and disables pointer-events
    const silentAnn = line.shadowRoot?.querySelector(
      '.mc-marker-annotation[data-marker-id="no-tip-ann"]'
    ) as SVGGElement;
    expect(silentAnn.getAttribute('pointer-events')).toBe('none');
    silentAnn.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 250, clientY: 20 })
    );
    expect(itemTip.hidden).toBe(true);

    // Line slice hit bands must stay strictly within [0, innerWidth] so they never overlap right-side outside annotations
    const lineDims = line.resolveDimensions();
    const sliceRects = Array.from(
      line.shadowRoot?.querySelectorAll('.mc-slice-hit') ?? []
    );
    expect(sliceRects.length).toBeGreaterThan(0);
    for (const sr of sliceRects) {
      const sx = Number(sr.getAttribute('x'));
      const sw = Number(sr.getAttribute('width'));
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx + sw).toBeLessThanOrEqual(lineDims.innerWidth + 0.01);
    }

    // 3. Both line and area markers appear in the unified legend with distinct swatches + legend tooltips
    const markerLegendItems = line.shadowRoot?.querySelectorAll(
      '.mc-legend-item[data-legend-kind="marker"]'
    );
    expect(markerLegendItems?.length).toBe(2);

    const areaLegendItem = line.shadowRoot?.querySelector(
      '.mc-legend-item[data-legend-id="marker:alert-zone"]'
    ) as SVGGElement | null;
    const lineLegendItem = line.shadowRoot?.querySelector(
      '.mc-legend-item[data-legend-id="marker:sla-line"]'
    ) as SVGGElement | null;
    expect(areaLegendItem?.querySelector('.mc-legend-swatch--area')).not.toBeNull();
    expect(lineLegendItem?.querySelector('.mc-legend-swatch--line')).not.toBeNull();

    // Hovering and Tab-focusing marker legend items shows the dedicated legend tooltip
    const legendTip = line.getLegendTooltipElement()!;
    areaLegendItem!.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 220, clientY: 340 })
    );
    expect(legendTip.hidden).toBe(false);
    expect(legendTip.renderedHtml).toContain('Alert Band (0-120)');
    expect(legendTip.renderedHtml).toContain('Highlighted area marker band');
    areaLegendItem!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(legendTip.hidden).toBe(true);

    lineLegendItem!.dispatchEvent(new FocusEvent('focus'));
    expect(legendTip.hidden).toBe(false);
    expect(legendTip.renderedHtml).toContain('Line Marker');
    lineLegendItem!.dispatchEvent(new FocusEvent('blur'));
    expect(legendTip.hidden).toBe(true);

    // 4. Marker labels & annotations render boxless by default (both SVG and foreignObject with SVG icon!),
    //    and accept explicit background/border/color/formatter via labelStyle or annotation
    expect(
      line.shadowRoot?.querySelector(
        '[data-label-id="marker-annotation-alert-zone"] .mc-label-bg'
      )
    ).toBeNull();

    // Verify foreignObject marker label & annotation (triggered by inline <svg> icon) have transparent bg & no border by default
    line.config = {
      ...line.config,
      markers: [
        {
          id: 'svg-icon-marker',
          type: 'line',
          axis: 'y',
          value: 120,
          label: 'Warn 120',
          icon: '<svg width="11" height="11" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
          annotation: {
            text: '120',
            icon: '<svg width="11" height="11" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
            position: 'right'
          }
        }
      ]
    };
    const foLabelDiv = line.shadowRoot?.querySelector(
      '[data-label-id="marker-label-svg-icon-marker"] .mc-fo-label'
    ) as HTMLElement | null;
    const foAnnDiv = line.shadowRoot?.querySelector(
      '[data-label-id="marker-annotation-svg-icon-marker"] .mc-fo-label'
    ) as HTMLElement | null;
    expect(foLabelDiv?.style.background).toBe('');
    expect(foLabelDiv?.style.border).toBe('');
    expect(foAnnDiv?.style.background).toBe('');
    expect(foAnnDiv?.style.border).toBe('');

    line.config = {
      ...line.config,
      markers: [
        {
          id: 'styled-marker',
          type: 'line',
          axis: 'y',
          value: 120,
          label: '120',
          labelStyle: {
            color: '#ffffff',
            background: '#0f172a',
            borderColor: '#ef4444',
            borderRadius: 6,
            formatter: (t) => `Target: ${t}`
          },
          annotation: {
            text: 'SLA',
            position: 'right',
            background: '#1e293b',
            borderColor: '#38bdf8'
          }
        }
      ]
    };

    const styledLabel = line.shadowRoot?.querySelector(
      '[data-label-id="marker-label-styled-marker"]'
    );
    expect(styledLabel?.querySelector('.mc-label-bg')).not.toBeNull();
    expect(styledLabel?.textContent).toContain('Target: 120');

    const styledAnn = line.shadowRoot?.querySelector(
      '[data-label-id="marker-annotation-styled-marker"]'
    );
    expect(styledAnn?.querySelector('.mc-label-bg')).not.toBeNull();
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

describe('Unified <mc-tooltip> Web Component (Issue #30)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts strictly one reusable <mc-tooltip> per chart across all 10 charts with CSS exportparts', () => {
    const charts: Array<{ tag: string; config: any; hoverSelector: string }> = [
      {
        tag: 'mc-bar-chart',
        config: { data: SAMPLE_BAR_DATA, indexBy: 'quarter', keys: ['Cloud', 'Edge'], width: 500, height: 320 },
        hoverSelector: '.mc-bar-rect'
      },
      {
        tag: 'mc-line-chart',
        config: { data: SAMPLE_LINE_DATA, enableSlices: false, width: 500, height: 320 },
        hoverSelector: '.mc-line-point'
      },
      {
        tag: 'mc-pie-chart',
        config: { data: SAMPLE_PIE_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-pie-arc'
      },
      {
        tag: 'mc-heatmap-chart',
        config: { data: SAMPLE_HEATMAP_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-heatmap-cell'
      },
      {
        tag: 'mc-radar-chart',
        config: { data: SAMPLE_RADAR_DATA, indexBy: 'metric', keys: ['ModelA', 'ModelB'], width: 500, height: 320 },
        hoverSelector: '.mc-radar-dot'
      },
      {
        tag: 'mc-sunburst-chart',
        config: { data: SAMPLE_SUNBURST_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-sunburst-arc'
      },
      {
        tag: 'mc-sankey-chart',
        config: { data: SAMPLE_SANKEY_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-sankey-node'
      },
      {
        tag: 'mc-scatter-chart',
        config: { data: SAMPLE_SCATTER_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-scatter-node'
      },
      {
        tag: 'mc-treemap-chart',
        config: { data: SAMPLE_SUNBURST_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-treemap-tile'
      },
      {
        tag: 'mc-gauge-chart',
        config: { data: SAMPLE_GAUGE_DATA, width: 500, height: 320 },
        hoverSelector: '.mc-gauge-value-arc'
      }
    ];

    for (const c of charts) {
      const el = document.createElement(c.tag) as any;
      document.body.appendChild(el);
      el.config = c.config;

      // Strictly ONE item <mc-tooltip> and ONE dedicated legend <mc-tooltip> per chart
      const tooltipNodes =
        el.shadowRoot?.querySelectorAll('mc-tooltip.mc-tooltip') ?? [];
      expect(tooltipNodes.length).toBe(1);
      const legendTooltipNodes =
        el.shadowRoot?.querySelectorAll('mc-tooltip.mc-legend-tooltip') ?? [];
      expect(legendTooltipNodes.length).toBe(1);

      const tip = tooltipNodes[0] as MCTooltipElement;
      const exportparts = tip.getAttribute('exportparts') ?? '';
      expect(exportparts).toContain('tooltip');
      expect(exportparts).toContain('header: tooltip-header');
      expect(exportparts).toContain('body: tooltip-body');
      expect(exportparts).toContain('row: tooltip-row');
      expect(exportparts).toContain('swatch: tooltip-swatch');
      expect(exportparts).toContain('value: tooltip-value');
      expect(exportparts).toContain('badge: tooltip-badge');

      // Hovering item populates the SAME singleton <mc-tooltip> with structured payload
      const items = el.shadowRoot?.querySelectorAll(c.hoverSelector) ?? [];
      expect(items.length).toBeGreaterThan(0);
      items[0].dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, clientX: 180, clientY: 140 })
      );
      expect(tip.hidden).toBe(false);
      expect(tip.lastPayload?.chartType).toBe(el.chartType);
      expect(tip.lastPayload?.datum).toBeDefined();
      expect(tip.lastPayload?.data).toBe(c.config.data);

      // Hovering a second item (when present) reuses the exact same <mc-tooltip> instance
      if (items.length > 1) {
        items[1].dispatchEvent(
          new MouseEvent('mouseenter', { bubbles: true, clientX: 220, clientY: 160 })
        );
        expect(
          el.shadowRoot?.querySelectorAll('mc-tooltip.mc-tooltip').length
        ).toBe(1);
        expect(el.getTooltipElement()).toBe(tip);
      }

      items[0].dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(tip.hidden).toBe(true);
    }
  });

  it('passes full structured data to tooltip.renderer, tooltip.formatter, declarative <mc-tooltip>, and mc-tooltip-show events', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    let receivedPayload: TooltipPayload | null = null;
    let eventPayload: TooltipPayload | null = null;
    bar.addEventListener('mc-tooltip-show', (e: Event) => {
      eventPayload = (e as CustomEvent).detail;
    });

    bar.config = {
      data: [
        { quarter: 'Q1', Cloud: 142, Edge: 94 },
        { quarter: 'Q2', Cloud: 168, Edge: 118 }
      ],
      width: 600,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      tooltip: {
        offsetX: 20,
        offsetY: 12,
        renderer: (payload, defaultRender) => {
          receivedPayload = payload;
          const wrap = document.createElement('div');
          wrap.className = 'custom-tip-card';
          wrap.appendChild(defaultRender());
          const extra = document.createElement('span');
          extra.className = 'custom-tip-extra';
          extra.textContent = `Custom:${payload.category}:${payload.seriesId}:${payload.value}`;
          wrap.appendChild(extra);
          return wrap;
        }
      }
    };

    const firstBar = bar.shadowRoot?.querySelector('.mc-bar-rect')!;
    firstBar.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 150, clientY: 150 })
    );

    const tip = bar.getTooltipElement()!;
    expect(tip.hidden).toBe(false);
    const p = receivedPayload as TooltipPayload | null;
    const ep = eventPayload as TooltipPayload | null;
    expect(p?.chartType).toBe('bar');
    expect(p?.category).toBe('Q1');
    expect(p?.seriesId).toBe('Cloud');
    expect(p?.value).toBe(142);
    expect(p?.datum).toMatchObject({ quarter: 'Q1', Cloud: 142 });
    expect(ep?.value).toBe(142);
    expect(tip.shadowRoot?.querySelector('.custom-tip-extra')?.textContent).toBe(
      'Custom:Q1:Cloud:142'
    );

    // tooltip: false suppresses tooltip display
    bar.config = { ...bar.config, tooltip: false };
    bar.shadowRoot
      ?.querySelector('.mc-bar-rect')
      ?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, clientX: 150, clientY: 150 })
      );
    expect(bar.getTooltipElement()?.hidden).toBe(true);

    // Declarative <mc-tooltip> child with <template> escapes HTML safely
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    const declTip = document.createElement('mc-tooltip') as MCTooltipElement;
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>{{title}} | {{value}} | {{datum.owner}}</div>';
    declTip.appendChild(tpl);
    pie.appendChild(declTip);
    document.body.appendChild(pie);

    pie.config = {
      data: [
        { id: 'A', label: 'Alpha', value: 100, owner: '<script>xss</script>' } as any,
        { id: 'B', label: 'Beta', value: 300, owner: 'Platform' } as any
      ],
      width: 500,
      height: 320
    };
    const slice = pie.shadowRoot?.querySelector('.mc-pie-arc')!;
    slice.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 160, clientY: 160 })
    );
    const pieTip = pie.getTooltipElement()!;
    expect(pieTip.hidden).toBe(false);
    expect(pieTip.renderedHtml).toContain('Alpha | 100 | &lt;script&gt;xss&lt;/script&gt;');
    expect(pieTip.shadowRoot?.querySelector('script')).toBeNull();
  });
});

describe('Unified SVG <mc-legend> Component (Issue #16)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('supports all 4 positions (top, bottom, left, right) and 4-side padding with automatic margin reservation', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const;

    for (const position of positions) {
      const bar = document.createElement('mc-bar-chart') as MCBarChart;
      document.body.appendChild(bar);
      bar.config = {
        data: SAMPLE_BAR_DATA,
        width: 640,
        height: 360,
        indexBy: 'quarter',
        keys: ['Cloud', 'Edge', 'AI'],
        legend: {
          position,
          padding: { top: 14, right: 18, bottom: 16, left: 20 }
        }
      };

      const legendG = bar.shadowRoot?.querySelector('.mc-legend') as SVGGElement | null;
      expect(legendG).not.toBeNull();
      expect(legendG?.getAttribute('data-legend-position')).toBe(position);
      expect(legendG?.getAttribute('role')).toBe('list');
      expect(legendG?.classList.contains(`mc-legend--${position}`)).toBe(true);

      const items = legendG?.querySelectorAll('.mc-legend-item') ?? [];
      expect(items.length).toBe(3);

      const dims = bar.resolveDimensions();
      if (position === 'top') {
        expect(dims.margin.top).toBeGreaterThanOrEqual(48);
      } else if (position === 'bottom') {
        expect(dims.margin.bottom).toBeGreaterThanOrEqual(76);
      } else if (position === 'left') {
        expect(dims.margin.left).toBeGreaterThanOrEqual(136);
      } else if (position === 'right') {
        expect(dims.margin.right).toBeGreaterThanOrEqual(136);
      }
    }

    // legend: false disables the legend completely
    const hiddenBar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(hiddenBar);
    hiddenBar.config = {
      data: SAMPLE_BAR_DATA,
      width: 600,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      legend: false
    };
    expect(hiddenBar.shadowRoot?.querySelector('.mc-legend')).toBeNull();
  });

  it('uses @chenglou/pretext to center each legend row accurately and wraps by default (disableable via wrap: false)', () => {
    const labelEngine = new LabelEngine();
    const theme = createDefaultTheme('light', 'modern');
    const items: LegendItem[] = [
      { id: 'North America Enterprise', label: 'North America Enterprise', color: '#38bdf8' },
      { id: 'Europe & UK Commercial', label: 'Europe & UK Commercial', color: '#a855f7' },
      { id: 'Asia-Pacific Cloud', label: 'Asia-Pacific Cloud', color: '#10b981' },
      { id: 'Latin America Growth', label: 'Latin America Growth', color: '#f59e0b' }
    ];

    const measure = (text: string, opts?: { type?: 'legend'; fontSize?: number; maxWidth?: number }) =>
      labelEngine.measure(text, opts ?? { type: 'legend' }, theme);

    // Narrow width with default wrap: true -> wraps onto multiple rows, each centered symmetrically
    const wrappedCfg = createDefaultLegendConfig({
      position: 'bottom',
      padding: { top: 10, right: 16, bottom: 12, left: 20 }
    });
    const wrapped = computeLegendLayout(items, wrappedCfg, 280, 200, measure, theme);
    expect(wrapped.rowCount).toBeGreaterThan(1);

    // Verify exact horizontal centering inside [pad.left, availableWidth - pad.right] for every row
    const usableLeft = 20;
    const usableRight = 280 - 16;
    for (let r = 0; r < wrapped.rowCount; r++) {
      const rowItems = wrapped.items.filter((i) => i.rowIndex === r);
      const minX = rowItems[0].x;
      const last = rowItems[rowItems.length - 1];
      const maxX = last.x + last.width;
      const leftGap = minX - usableLeft;
      const rightGap = usableRight - maxX;
      expect(Math.abs(leftGap - rightGap)).toBeLessThan(0.5);
    }

    // With wrap: false -> all items remain on a single row (rowIndex === 0)
    const noWrapCfg = createDefaultLegendConfig({
      position: 'bottom',
      wrap: false,
      padding: { top: 10, right: 16, bottom: 12, left: 20 }
    });
    const singleRow = computeLegendLayout(items, noWrapCfg, 280, 200, measure, theme);
    expect(singleRow.rowCount).toBe(1);
    expect(singleRow.items.every((i) => i.rowIndex === 0)).toBe(true);

    // Verify DOM attributes on an actual narrow chart
    const line = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(line);
    line.config = {
      data: items.map((it) => ({
        id: it.id,
        data: [
          { x: 'Jan', y: 10 },
          { x: 'Feb', y: 20 }
        ]
      })),
      width: 300,
      height: 280,
      legend: { position: 'bottom', wrap: true }
    };
    const wrappedLegend = line.shadowRoot?.querySelector('.mc-legend')!;
    expect(Number(wrappedLegend.getAttribute('data-legend-rows'))).toBeGreaterThan(1);

    line.config = { ...line.config, legend: { position: 'bottom', wrap: false } };
    const noWrapLegend = line.shadowRoot?.querySelector('.mc-legend')!;
    expect(Number(noWrapLegend.getAttribute('data-legend-rows'))).toBe(1);
  });

  it('shows a dedicated legend tooltip on hover and keyboard Tab focus, separate from item tooltip, with custom config & disable flag', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    let legendEventDetail: TooltipPayload<LegendItem> | null = null;
    bar.addEventListener('mc-legend-tooltip-show', (e: Event) => {
      legendEventDetail = (e as CustomEvent).detail;
    });

    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 620,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'AI'],
      legend: {
        position: 'top',
        tooltip: {
          offsetX: 16,
          renderer: (payload, defaultRender) => {
            const box = document.createElement('div');
            box.appendChild(defaultRender());
            const note = document.createElement('span');
            note.className = 'custom-legend-tip';
            note.textContent = `LegendCustom:${payload.title}:${payload.datum?.index}`;
            box.appendChild(note);
            return box;
          }
        }
      }
    };

    const itemTip = bar.getTooltipElement()!;
    const legendTip = bar.getLegendTooltipElement()!;
    expect(legendTip).not.toBeNull();
    expect(legendTip).not.toBe(itemTip);
    expect(legendTip.getAttribute('exportparts')).toContain('tooltip: legend-tooltip');
    expect(legendTip.getAttribute('exportparts')).toContain('header: legend-tooltip-header');

    const legendItems = bar.shadowRoot?.querySelectorAll('.mc-legend-item') ?? [];
    expect(legendItems.length).toBe(3);
    const firstLegend = legendItems[0] as SVGGElement;
    expect(firstLegend.getAttribute('tabindex')).toBe('0');

    // 1. Hover triggers dedicated legend tooltip ONLY (chart item tooltip remains hidden)
    firstLegend.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 200, clientY: 50 })
    );
    expect(legendTip.hidden).toBe(false);
    expect(itemTip.hidden).toBe(true);
    expect(legendTip.shadowRoot?.querySelector('.custom-legend-tip')?.textContent).toBe(
      'LegendCustom:Cloud:0'
    );
    expect((legendEventDetail as TooltipPayload<LegendItem> | null)?.title).toBe('Cloud');

    firstLegend.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(legendTip.hidden).toBe(true);

    // 2. Keyboard Tab focus triggers the same dedicated legend tooltip, and Escape / blur hides it
    const secondLegend = legendItems[1] as SVGGElement;
    secondLegend.dispatchEvent(new FocusEvent('focus'));
    expect(legendTip.hidden).toBe(false);
    expect(itemTip.hidden).toBe(true);
    expect(legendTip.shadowRoot?.querySelector('.custom-legend-tip')?.textContent).toBe(
      'LegendCustom:Edge:1'
    );

    secondLegend.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(legendTip.hidden).toBe(true);

    secondLegend.dispatchEvent(new FocusEvent('focus'));
    expect(legendTip.hidden).toBe(false);
    secondLegend.dispatchEvent(new FocusEvent('blur'));
    expect(legendTip.hidden).toBe(true);

    // 3. Disabling legend tooltip via enableTooltip: false suppresses both hover and focus
    bar.config = {
      ...bar.config,
      legend: { position: 'top', enableTooltip: false }
    };
    const disabledItem = bar.shadowRoot?.querySelector('.mc-legend-item') as SVGGElement;
    disabledItem.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 200, clientY: 50 })
    );
    expect(legendTip.hidden).toBe(true);
    disabledItem.dispatchEvent(new FocusEvent('focus'));
    expect(legendTip.hidden).toBe(true);

    // 4. Disabling via legend.tooltip: false also suppresses legend tooltip
    bar.config = {
      ...bar.config,
      legend: { position: 'top', tooltip: false }
    };
    const disabledItem2 = bar.shadowRoot?.querySelector('.mc-legend-item') as SVGGElement;
    disabledItem2.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 200, clientY: 50 })
    );
    expect(legendTip.hidden).toBe(true);
  });

  it('supports declarative <mc-legend> with nested <mc-tooltip> and renders across all 8 categorical-legend charts', () => {
    // Declarative <mc-legend> with nested <mc-tooltip>
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    const declLegend = document.createElement('mc-legend') as MCLegendElement;
    declLegend.setAttribute('position', 'right');
    declLegend.setAttribute('wrap', 'false');
    declLegend.setAttribute('padding-top', '16');
    declLegend.setAttribute('padding-left', '22');

    const nestedTip = document.createElement('mc-tooltip') as MCTooltipElement;
    const tpl = document.createElement('template');
    tpl.innerHTML = '<div>Series: {{title}} ({{datum.color}})</div>';
    nestedTip.appendChild(tpl);
    declLegend.appendChild(nestedTip);
    pie.appendChild(declLegend);
    document.body.appendChild(pie);

    pie.config = {
      data: SAMPLE_PIE_DATA,
      width: 600,
      height: 360
    };

    const resolvedLegend = pie.resolveLegendConfig();
    expect(resolvedLegend.position).toBe('right');
    expect(resolvedLegend.wrap).toBe(false);
    expect(resolvedLegend.padding.top).toBe(16);
    expect(resolvedLegend.padding.left).toBe(22);

    const legendItem = pie.shadowRoot?.querySelector('.mc-legend-item') as SVGGElement;
    legendItem.dispatchEvent(new FocusEvent('focus'));
    const legendTip = pie.getLegendTooltipElement()!;
    expect(legendTip.hidden).toBe(false);
    expect(legendTip.renderedHtml).toContain('Series:');

    // Verify all 8 categorical-legend charts use the unified SVG legend
    const legendCharts: { tag: string; config: any }[] = [
      { tag: 'mc-bar-chart', config: { data: SAMPLE_BAR_DATA, width: 520, height: 320, indexBy: 'quarter', keys: ['Cloud', 'Edge'], legend: { position: 'top' } } },
      { tag: 'mc-line-chart', config: { data: SAMPLE_LINE_DATA, width: 520, height: 320, legend: { position: 'bottom' } } },
      { tag: 'mc-pie-chart', config: { data: SAMPLE_PIE_DATA, width: 520, height: 320, legend: { position: 'right' } } },
      { tag: 'mc-radar-chart', config: { data: SAMPLE_RADAR_DATA, width: 520, height: 320, indexBy: 'metric', keys: ['PlatformA', 'PlatformB'], legend: { position: 'left' } } },
      { tag: 'mc-scatter-chart', config: { data: SAMPLE_SCATTER_DATA, width: 520, height: 320, legend: { position: 'top' } } },
      { tag: 'mc-sunburst-chart', config: { data: SAMPLE_SUNBURST_DATA, width: 520, height: 320, legend: { position: 'bottom' } } },
      { tag: 'mc-treemap-chart', config: { data: SAMPLE_SUNBURST_DATA, width: 520, height: 320, legend: { position: 'bottom' } } },
      { tag: 'mc-sankey-chart', config: { data: SAMPLE_SANKEY_DATA, width: 520, height: 320, legend: { position: 'bottom' } } }
    ];

    for (const c of legendCharts) {
      const el = document.createElement(c.tag) as any;
      document.body.appendChild(el);
      el.config = c.config;
      const g = el.shadowRoot?.querySelector('.mc-legend');
      expect(g, `${c.tag} should render unified .mc-legend`).not.toBeNull();
      expect(g?.getAttribute('data-legend-position')).toBe(c.config.legend.position);
      expect(g?.querySelectorAll('.mc-legend-item').length).toBeGreaterThan(0);
    }
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
    const tooltip = bar.shadowRoot?.querySelector('.mc-tooltip') as MCTooltipElement;
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.renderedHtml).toContain('Crosses Threshold');

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

describe('Lightweight Core Primitives & Native Pan/Zoom Controller', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('computes accurate numeric, time, band, point, and ordinal scales without heavy D3 subpackages', () => {
    expect(extent([10, null, 2, undefined, NaN, 42])).toEqual([2, 42]);
    expect(extent([])).toEqual([undefined, undefined]);

    const linear = scaleLinear().domain([0, 100]).range([0, 500]);
    expect(linear(50)).toBe(250);
    expect(linear.invert(250)).toBe(50);
    expect(linear.clamp(true)(150)).toBe(500);
    expect(linear.ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);

    const niceLinear = scaleLinear().domain([3, 97]).nice(5);
    expect(niceLinear.domain()).toEqual([0, 100]);

    const sqrt = scaleSqrt().domain([0, 100]).range([0, 10]);
    expect(sqrt(25)).toBeCloseTo(5, 6);
    expect(sqrt.invert(5)).toBeCloseTo(25, 6);

    const log = scaleLog().base(10).domain([1, 1000]).range([0, 300]);
    expect(log(10)).toBeCloseTo(100, 6);
    expect(log(100)).toBeCloseTo(200, 6);
    expect(log.invert(200)).toBeCloseTo(100, 6);

    const sym = scaleSymlog().constant(1).domain([-10, 10]).range([0, 200]);
    expect(sym(0)).toBeCloseTo(100, 6);
    expect(sym.invert(100)).toBeCloseTo(0, 6);

    const band = scaleBand<string>()
      .domain(['A', 'B', 'C', 'D'])
      .range([0, 400])
      .paddingInner(0.2)
      .paddingOuter(0.1);
    expect(band.bandwidth()).toBeGreaterThan(0);
    expect(band('A')).toBeDefined();
    expect(band('D')!).toBeGreaterThan(band('A')!);

    const point = scalePoint<string>()
      .domain(['X', 'Y', 'Z'])
      .range([0, 200])
      .padding(0.5);
    expect(point.bandwidth()).toBe(0);
    expect(point('Y')).toBeCloseTo(100, 6);

    const ord = scaleOrdinal<string, string>(['#111', '#222']).domain(['a', 'b']);
    expect(ord('a')).toBe('#111');
    expect(ord('b')).toBe('#222');
    expect(ord('c')).toBe('#111');

    const timeScale = buildAxisScale(
      { type: 'time', nice: true },
      [new Date(2026, 0, 1), new Date(2026, 0, 11)],
      [0, 200]
    );
    const ticks = timeScale.ticks(5);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBeInstanceOf(Date);
    expect(timeScale.invert(100)).toBeInstanceOf(Date);
  });

  it('formats grouped numbers, axis ticks, dates, sequential color ramps, and all 6 easings cleanly', () => {
    expect(formatGroupedNumber(1234567)).toBe('1,234,567');
    expect(formatAxisNumber(2000)).toBe('2k');
    expect(formatAxisNumber(1500000)).toBe('1.5M');
    expect(formatAxisNumber(42)).toBe('42');
    expect(formatAxisNumber(1.256)).toBe('1.26');
    expect(formatAxisDate(new Date(2026, 0, 5))).toBe('Jan 05');

    const seq = createSequentialColorScale('viridis', [0, 100]);
    expect(seq(0)).toBe('rgb(68, 1, 84)');
    expect(seq(100)).toBe('rgb(253, 231, 37)');
    expect(seq.domain()).toEqual([0, 100]);

    const anim = new AnimationEngine();
    for (const name of [
      'linear',
      'quad-out',
      'cubic-out',
      'back-out',
      'elastic-out',
      'bounce-out'
    ] as const) {
      const fn = anim.getD3Easing(name);
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
      expect(Number.isFinite(fn(0.5))).toBe(true);
    }
  });

  it('handles native zoom controls (+, −, Reset), initialZoom, and direction locking without d3-zoom', () => {
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);

    const events: Array<{ k: number; x: number; y: number }> = [];
    bar.addEventListener('mc-zoom', (e) => {
      events.push((e as CustomEvent).detail);
    });

    bar.config = {
      data: SAMPLE_BAR_DATA,
      width: 600,
      height: 360,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      view: {
        zoomable: true,
        pannable: true,
        showControls: true,
        minZoom: 0.5,
        maxZoom: 4,
        direction: 'x',
        initialZoom: 1.5,
        initialPanX: 20,
        initialPanY: 50
      }
    };

    const viewport = bar.shadowRoot?.querySelector('.mc-chart-viewport');
    // initialZoom applied and direction:'x' locks y=0
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].k).toBeCloseTo(1.5, 5);
    expect(events[events.length - 1].y).toBe(0);
    expect(viewport?.getAttribute('transform')).toContain('scale(1.5)');

    const zoomInBtn = bar.shadowRoot?.querySelector(
      'button[data-zoom="in"]'
    ) as HTMLButtonElement;
    const resetBtn = bar.shadowRoot?.querySelector(
      'button[data-zoom="reset"]'
    ) as HTMLButtonElement;

    zoomInBtn.click();
    expect(events[events.length - 1].k).toBeCloseTo(1.875, 5);
    expect(events[events.length - 1].y).toBe(0);

    resetBtn.click();
    expect(events[events.length - 1]).toEqual({ k: 1, x: 0, y: 0 });
    expect(viewport?.getAttribute('transform')).toBe('translate(0, 0) scale(1)');
  });
});
