import {
  registerModernCharts,
  MCBaseChart,
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
  LabelEngine,
  createDefaultTheme,
  type ChartPaletteName,
  type ChartRenderContext,
  type MotionPresetName
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
} from './sample-data';

registerModernCharts();

const studioLine = document.getElementById('studio-line-chart') as MCLineChart;
const barChart = document.getElementById('demo-bar-chart') as MCBarChart;
const pieChart = document.getElementById('demo-pie-chart') as MCPieChart;
const heatmapChart = document.getElementById('demo-heatmap-chart') as MCHeatmapChart;
const radarChart = document.getElementById('demo-radar-chart') as MCRadarChart;
const sunburstChart = document.getElementById('demo-sunburst-chart') as MCSunburstChart;
const sankeyChart = document.getElementById('demo-sankey-chart') as MCSankeyChart;
const scatterChart = document.getElementById('demo-scatter-chart') as MCScatterChart;
const treemapChart = document.getElementById('demo-treemap-chart') as MCTreemapChart;
const gaugeChart = document.getElementById('demo-gauge-chart') as MCGaugeChart;
const sandboxChart = document.getElementById('sandbox-size-chart') as MCLineChart;

const allCharts: MCBaseChart<any>[] = [
  studioLine,
  barChart,
  pieChart,
  heatmapChart,
  radarChart,
  sunburstChart,
  sankeyChart,
  scatterChart,
  treemapChart,
  gaugeChart,
  sandboxChart
];

const WARN_SVG_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;

let activeLineThreshold = 135;

function getStudioLineMarkers(threshVal: number) {
  return [
    {
      id: 'danger-area',
      type: 'area' as const,
      axis: 'y' as const,
      from: 0,
      to: threshVal,
      fill: '#ef4444',
      fillOpacity: 0.1
    },
    {
      id: 'sla-min-line',
      type: 'line' as const,
      axis: 'y' as const,
      value: threshVal,
      label: `Min SLA Threshold (${threshVal} req/s)`,
      icon: WARN_SVG_ICON,
      stroke: '#ef4444',
      strokeWidth: 2,
      strokeDasharray: '6 4',
      condition: 'below' as const,
      matchStyle: {
        color: '#ef4444',
        fill: '#ef4444',
        stroke: '#ef4444',
        radius: 6,
        className: 'mc-point--under-sla'
      }
    }
  ];
}

// Configure every chart using Nivo-style single unified `chart.config = { ... }`!
studioLine.config = {
  data: SAMPLE_LINE_DATA,
  autoSize: true,
  title: 'AI Progressive Layer Stream + Marker Thresholds',
  xTitle: 'Month',
  yTitle: 'Throughput (req/s)',
  enableArea: true,
  enablePointLabels: true,
  themeMode: 'dark',
  palette: 'modern',
  xScale: { type: 'point' },
  yScale: { type: 'linear', min: 0, max: 320 },
  view: { zoomable: true, pannable: true, showControls: true, minZoom: 0.5, maxZoom: 5 },
  animate: true,
  motionConfig: 'default',
  markers: getStudioLineMarkers(activeLineThreshold),
  ariaLabel: 'Monthly AI Inference Throughput Line Chart',
  pointAriaLabel: (d) => `${d.seriesId} in ${d.category}: ${d.value} requests per second`,
  isFocusable: true
};

barChart.config = {
  data: SAMPLE_BAR_DATA,
  autoSize: true,
  title: 'Quarterly Spend ($K) — Bars Under $100K Trigger Marker Threshold',
  indexBy: 'quarter',
  keys: ['Cloud', 'Edge', 'OnPrem'],
  groupMode: 'grouped',
  xTitle: 'Quarter',
  yTitle: 'Spend ($K)',
  themeMode: 'dark',
  palette: 'modern',
  xScale: { type: 'band' },
  yScale: { type: 'linear' },
  view: { zoomable: true, pannable: true, showControls: true },
  animate: true,
  motionConfig: 'default',
  markers: [
    {
      id: 'budget-floor-area',
      type: 'area',
      axis: 'y',
      from: 0,
      to: 100,
      fill: '#ef4444',
      fillOpacity: 0.08
    },
    {
      id: 'budget-floor-line',
      type: 'line',
      axis: 'y',
      value: 100,
      label: 'Min Budget Floor ($100K)',
      icon: WARN_SVG_ICON,
      stroke: '#ef4444',
      strokeWidth: 2,
      strokeDasharray: '5 4',
      condition: 'below',
      matchStyle: {
        color: '#ef4444',
        fill: '#ef4444',
        stroke: '#fda4af',
        strokeWidth: 1.5,
        className: 'mc-bar--under-budget'
      }
    }
  ],
  ariaLabel: 'Quarterly Infrastructure Spend Bar Chart',
  barAriaLabel: (d) => `${d.seriesId} spend in ${d.category}: $${d.value}K`,
  isFocusable: true
};

pieChart.config = {
  data: SAMPLE_PIE_DATA,
  autoSize: true,
  title: 'Runtime Footprint Breakdown',
  innerRadius: 0.54,
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Runtime Footprint Breakdown Donut Chart',
  arcAriaLabel: (d) => `${d.label}: ${d.value} (${d.percentage?.toFixed(1)}%)`
};

heatmapChart.config = {
  data: SAMPLE_HEATMAP_DATA,
  autoSize: true,
  title: 'Cluster Compute Utilization (%)',
  colorScheme: 'viridis',
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Cluster Compute Utilization Heatmap',
  cellAriaLabel: (d) => `${d.seriesId} at ${d.category}: ${d.value}% utilization`
};

radarChart.config = {
  data: SAMPLE_RADAR_DATA,
  autoSize: true,
  title: 'Architecture Benchmark Comparison',
  indexBy: 'metric',
  keys: ['ModernCharts', 'TraditionalChart'],
  enableDotLabels: true,
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Architecture Benchmark Radar Chart',
  pointAriaLabel: (d) => `${d.seriesId} score for ${d.category}: ${d.value} / 100`
};

sunburstChart.config = {
  data: SAMPLE_SUNBURST_DATA,
  autoSize: true,
  title: 'Module Hierarchy (Click Any Arc to Drill Down)',
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Modern Charts Module Hierarchy Sunburst',
  arcAriaLabel: (d) => `${d.label}: ${d.value} (${d.percentage?.toFixed(1)}%)`
};

sankeyChart.config = {
  data: SAMPLE_SANKEY_DATA,
  autoSize: true,
  title: 'AI Prompt → Pretext & D3 Rendering Pipeline Flow',
  themeMode: 'dark',
  palette: 'modern',
  view: { zoomable: true, pannable: true, showControls: true },
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Rendering Pipeline Sankey Diagram',
  nodeAriaLabel: (d) => `Node ${d.label}: total flow ${d.value}`,
  linkAriaLabel: (d) => `Flow from ${d.source} to ${d.target}: ${d.value}`
};

scatterChart.config = {
  data: SAMPLE_SCATTER_DATA,
  autoSize: true,
  title: 'Performance vs Bundle Size Efficiency',
  xTitle: 'Bundle Size (KB)',
  yTitle: 'FPS Score',
  enableTrendline: true,
  themeMode: 'dark',
  palette: 'modern',
  view: { zoomable: true, pannable: true, showControls: true },
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Performance vs Bundle Size Scatter Plot'
};

treemapChart.config = {
  data: SAMPLE_SUNBURST_DATA,
  autoSize: true,
  title: 'Hierarchical Package Size Treemap',
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Package Size Treemap',
  cellAriaLabel: (d) => `${d.category} > ${d.label}: ${d.value}`
};

gaugeChart.config = {
  data: SAMPLE_GAUGE_DATA,
  autoSize: true,
  title: 'Real-Time Text Layout Efficiency',
  themeMode: 'dark',
  palette: 'modern',
  animate: true,
  motionConfig: 'default',
  ariaLabel: 'Real-Time Text Layout Efficiency Gauge'
};

sandboxChart.config = {
  data: SAMPLE_LINE_DATA.slice(0, 2),
  autoSize: true,
  title: 'Container Sizing & Explicit autoSize Flag Demo',
  themeMode: 'dark',
  palette: 'emerald',
  animate: true,
  motionConfig: 'default'
};

// Studio Layer Toggles & Unified Config Code View
const studioLayerToggles = document.getElementById('studio-layer-toggles')!;
const streamCodeOutput = document.getElementById('stream-code-output')!;
const streamStatusBadge = document.getElementById('stream-status-badge')!;
const ariaFocusReadout = document.getElementById('aria-focus-readout')!;

const ALL_STUDIO_LAYERS = [
  'grid',
  'markers',
  'axes',
  'areas',
  'lines',
  'points',
  'pointLabels',
  'slices',
  'legends'
];
let activeStudioLayers = [...ALL_STUDIO_LAYERS];

function renderStudioLayerChips(): void {
  studioLayerToggles.innerHTML = '';
  ALL_STUDIO_LAYERS.forEach((layerName) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = activeStudioLayers.includes(layerName);
    btn.className = `layer-chip ${isActive ? 'active' : ''}`;
    btn.textContent = `${isActive ? '✓ ' : '+ '}${layerName}`;
    btn.addEventListener('click', () => {
      if (activeStudioLayers.includes(layerName)) {
        activeStudioLayers = activeStudioLayers.filter((l) => l !== layerName);
      } else {
        activeStudioLayers.push(layerName);
      }
      studioLine.layers = [...activeStudioLayers];
      renderStudioLayerChips();
      updateStreamCodeView(activeStudioLayers);
    });
    studioLayerToggles.appendChild(btn);
  });
}

function updateStreamCodeView(layers: string[]): void {
  const cfg = studioLine.config;
  streamCodeOutput.textContent = `// Single Nivo-style chart.config driving theme, scale, view, animation, markers, aria & label:
chart.config = {
  data: SAMPLE_LINE_DATA,
  autoSize: true,
  themeMode: "${cfg.themeMode ?? 'dark'}",
  palette: "${cfg.palette ?? 'modern'}",
  animate: true,
  motionConfig: "${typeof cfg.motionConfig === 'string' ? cfg.motionConfig : 'default'}",
  markers: [
    { type: "area", axis: "y", from: 0, to: ${activeLineThreshold}, fill: "#ef4444" },
    {
      type: "line", axis: "y", value: ${activeLineThreshold},
      label: "Min SLA (${activeLineThreshold} req/s)",
      condition: "below",
      matchStyle: { color: "#ef4444", fill: "#ef4444", radius: 6 }
    }
  ],
  layers: [${layers.map((l) => `"${l}"`).join(', ')}]
};`;
}

renderStudioLayerChips();
updateStreamCodeView(activeStudioLayers);

// Live Threshold Slider
document.getElementById('threshold-slider')?.addEventListener('input', (e) => {
  activeLineThreshold = Number((e.target as HTMLInputElement).value);
  document.getElementById('threshold-val-label')!.textContent =
    String(activeLineThreshold);
  studioLine.setConfig({
    ...studioLine.config,
    markers: getStudioLineMarkers(activeLineThreshold)
  });
  updateStreamCodeView(activeStudioLayers);
});

// Listen for ARIA focus events from any chart!
document.addEventListener('mc-aria-focus', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  ariaFocusReadout.textContent = `[${detail.chartType.toUpperCase()} ARIA ITEM #${
    detail.item.index + 1
  }] role="graphics-symbol" aria-label="${detail.label}"${
    detail.item.datum?.isUnderThreshold ? ' [⚠ UNDER THRESHOLD]' : ''
  }`;
});

document.addEventListener('mouseover', (e: Event) => {
  const path = e.composedPath();
  const ariaEl = path.find(
    (node) =>
      node instanceof SVGElement && node.classList?.contains('mc-aria-item')
  ) as SVGElement | undefined;
  if (ariaEl) {
    const role = ariaEl.getAttribute('role');
    const roleDesc = ariaEl.getAttribute('aria-roledescription');
    const label = ariaEl.getAttribute('aria-label');
    const isUnder = ariaEl.getAttribute('data-under-threshold') === 'true';
    ariaFocusReadout.textContent = `role="${role}" aria-roledescription="${roleDesc}" aria-label="${label}"${
      isUnder ? ' [data-under-threshold="true"]' : ''
    }`;
  }
});

// Live ARIA Template / Callback switcher
document
  .getElementById('aria-template-select')
  ?.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value;
    allCharts.forEach((chart) => {
      if (mode === 'default') {
        chart.ariaConfig = {
          ...chart.ariaConfig,
          itemLabel: undefined,
          itemDescription: undefined
        };
      } else if (mode === 'executive') {
        chart.setConfig({
          ...chart.config,
          barAriaLabel: undefined,
          pointAriaLabel: undefined,
          arcAriaLabel: undefined,
          cellAriaLabel: undefined,
          aria: {
            ...chart.config.aria,
            itemLabel:
              'Executive Metric: {{seriesId}} ({{category}}) recorded {{formattedValue}}',
            itemDescription: 'Item {{number}} of {{total}} in series'
          }
        });
      } else if (mode === 'scientific') {
        chart.setConfig({
          ...chart.config,
          barAriaLabel: undefined,
          pointAriaLabel: undefined,
          arcAriaLabel: undefined,
          cellAriaLabel: undefined,
          aria: {
            ...chart.config.aria,
            itemLabel: (item) =>
              `[${item.type.toUpperCase()} #${item.index + 1}/${
                item.total ?? '?'
              }] ${item.seriesId || item.label} = ${item.value}`,
            itemDescription: (item) =>
              `Keyboard navigable ${item.type} datum id=${item.id}`
          }
        });
      }
    });
    const sampleBar = barChart.shadowRoot?.querySelector('.mc-aria-item');
    if (sampleBar) {
      ariaFocusReadout.textContent = `Updated all charts! Sample Bar aria-label="${sampleBar.getAttribute(
        'aria-label'
      )}"`;
    }
  });

studioLine.addEventListener('mc-layer-rendered', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  streamStatusBadge.textContent = `Rendered layer: ${detail.layerName} (${
    detail.index + 1
  }/${detail.total})`;
  updateStreamCodeView(studioLine.getActiveLayers());
});

document
  .getElementById('btn-ai-stream')
  ?.addEventListener('click', async () => {
    streamStatusBadge.textContent = 'AI Streaming layers...';
    await studioLine.streamLayers(ALL_STUDIO_LAYERS, 240);
    activeStudioLayers = [...ALL_STUDIO_LAYERS];
    renderStudioLayerChips();
    streamStatusBadge.textContent = 'Stream Complete (All Layers Active)';
  });

let customThresholdSummaryInjected = false;
document
  .getElementById('btn-inject-custom-layer')
  ?.addEventListener('click', () => {
    if (customThresholdSummaryInjected) return;
    customThresholdSummaryInjected = true;

    // Client Custom Layer that reads `ctx.thresholds.underThresholdItems` and `ctx.markers`!
    const thresholdAuditCustomLayer = (ctx: ChartRenderContext<any>) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'mc-custom-threshold-audit');
      const underItems = ctx.thresholds.underThresholdItems;

      // Highlight every point that fell under the marker threshold with a pulsing halo
      underItems.forEach((item) => {
        if (item.px === undefined || item.py === undefined) return;
        const ring = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle'
        );
        ring.setAttribute('cx', String(item.px));
        ring.setAttribute('cy', String(item.py));
        ring.setAttribute('r', '11');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', item.effectiveColor);
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('stroke-dasharray', '3 2');
        g.appendChild(ring);
      });

      ctx.renderLabel(g, {
        id: 'custom-threshold-summary-badge',
        text: `Custom Layer Audit: ${underItems.length} pts under SLA`,
        x: 12,
        y: 16,
        type: 'custom',
        anchor: 'start',
        baseline: 'middle',
        icon: WARN_SVG_ICON,
        renderMode: 'foreignObject',
        color: '#fecdd3',
        background: 'rgba(136, 19, 55, 0.9)',
        borderColor: '#f43f5e',
        borderRadius: 6
      });
      return g;
    };

    studioLine.appendLayer({
      name: 'threshold-audit',
      render: thresholdAuditCustomLayer
    });
    ALL_STUDIO_LAYERS.push('threshold-audit');
    activeStudioLayers.push('threshold-audit');
    renderStudioLayerChips();
    updateStreamCodeView(activeStudioLayers);
  });

// Global Theme, Palette, Motion Preset, and Universal <mc-label> Controls
function applyGlobalThemeMode(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
  allCharts.forEach((chart) => {
    const nextTheme = chart.config.theme
      ? { ...chart.config.theme, mode }
      : undefined;
    chart.setConfig({
      ...chart.config,
      themeMode: mode,
      theme: nextTheme
    });
    const lightDomTheme = chart.querySelector('mc-theme-layer');
    if (lightDomTheme) {
      lightDomTheme.setAttribute('mode', mode);
    }
  });

  // Also update standalone <mc-label> preview badges
  const standaloneLabels = document.querySelectorAll('mc-label[standalone]');
  if (standaloneLabels[0]) {
    standaloneLabels[0].setAttribute(
      'bg-color',
      mode === 'dark' ? '#0f172a' : '#e0f2fe'
    );
    standaloneLabels[0].setAttribute(
      'color',
      mode === 'dark' ? '#e0f2fe' : '#0369a1'
    );
  }
  if (standaloneLabels[1]) {
    standaloneLabels[1].setAttribute(
      'bg-color',
      mode === 'dark' ? 'rgba(136, 19, 55, 0.85)' : '#ffe4e6'
    );
    standaloneLabels[1].setAttribute(
      'color',
      mode === 'dark' ? '#fecdd3' : '#be123c'
    );
  }

  updateStreamCodeView(activeStudioLayers);
}

document
  .getElementById('global-theme-select')
  ?.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value as 'light' | 'dark';
    applyGlobalThemeMode(mode);
  });

document
  .getElementById('global-palette-select')
  ?.addEventListener('change', (e) => {
    const palette = (e.target as HTMLSelectElement).value as ChartPaletteName;
    allCharts.forEach((chart) => {
      chart.setConfig({ ...chart.config, palette });
    });
    updateStreamCodeView(activeStudioLayers);
  });

document
  .getElementById('global-motion-select')
  ?.addEventListener('change', (e) => {
    const preset = (e.target as HTMLSelectElement).value as MotionPresetName;
    allCharts.forEach((chart) => {
      chart.setConfig({ ...chart.config, animate: true, motionConfig: preset });
      chart.replayAnimation();
    });
    updateStreamCodeView(activeStudioLayers);
  });

document
  .getElementById('btn-replay-animations')
  ?.addEventListener('click', () => {
    allCharts.forEach((chart) => chart.replayAnimation());
  });

document
  .getElementById('global-label-mode')
  ?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const sparkIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>`;
    allCharts.forEach((chart) => {
      if (val === 'svg') {
        chart.setConfig({
          ...chart.config,
          labelMode: 'svg',
          label: undefined
        });
      } else if (val === 'foreignObject') {
        chart.setConfig({
          ...chart.config,
          labelMode: 'foreignObject',
          label: undefined
        });
      } else if (val === 'foreignObject-icons') {
        chart.setConfig({
          ...chart.config,
          labelMode: 'foreignObject',
          label: {
            target: 'all',
            renderMode: 'foreignObject',
            icon: sparkIcon,
            iconSize: 12,
            iconGap: 4
          }
        });
      }
    });
  });

// Individual chart interactive controls
document.getElementById('btn-bar-mode')?.addEventListener('click', () => {
  barChart.groupMode =
    barChart.groupMode === 'grouped' ? 'stacked' : 'grouped';
});

document.getElementById('btn-bar-layout')?.addEventListener('click', () => {
  barChart.layout = barChart.layout === 'vertical' ? 'horizontal' : 'vertical';
});

document.getElementById('btn-pie-stream')?.addEventListener('click', () => {
  pieChart.streamLayers();
});

document
  .getElementById('heatmap-scheme-select')
  ?.addEventListener('change', (e) => {
    heatmapChart.setConfig({
      ...heatmapChart.config,
      colorScheme: (e.target as HTMLSelectElement).value
    });
  });

document.getElementById('btn-radar-shape')?.addEventListener('click', () => {
  const curr = radarChart.config.gridShape || 'circular';
  radarChart.setConfig({
    ...radarChart.config,
    gridShape: curr === 'circular' ? 'linear' : 'circular'
  });
});

document
  .getElementById('btn-sunburst-reset')
  ?.addEventListener('click', () => {
    sunburstChart.resetDrilldown();
  });

document.getElementById('btn-sankey-stream')?.addEventListener('click', () => {
  sankeyChart.streamLayers();
});

document.getElementById('btn-scatter-trend')?.addEventListener('click', () => {
  scatterChart.setConfig({
    ...scatterChart.config,
    enableTrendline: !scatterChart.config.enableTrendline
  });
});

document.getElementById('btn-gauge-random')?.addEventListener('click', () => {
  const nextVal = Math.floor(45 + Math.random() * 54);
  gaugeChart.data = { ...SAMPLE_GAUGE_DATA, value: nextVal };
});

// AutoSize vs Container Sizing Sandbox
const sandboxStage = document.getElementById('resizable-sandbox-stage')!;
const btnToggleAutoSize = document.getElementById('btn-toggle-autosize')!;
let isNarrowContainer = false;

btnToggleAutoSize.addEventListener('click', () => {
  sandboxChart.autoSize = !sandboxChart.autoSize;
  btnToggleAutoSize.textContent = `autoSize: ${sandboxChart.autoSize} (${
    sandboxChart.autoSize ? 'ResizeObserver Active' : 'Container Snapshot'
  })`;
});

document
  .getElementById('btn-shrink-container')
  ?.addEventListener('click', () => {
    isNarrowContainer = !isNarrowContainer;
    sandboxStage.style.width = isNarrowContainer ? '68%' : '100%';
    if (!sandboxChart.autoSize) {
      setTimeout(() => sandboxChart.resize(), 280);
    }
  });

// Live In-Browser Automated Verification Suite
function runLiveVerificationTests(): void {
  const grid = document.getElementById('test-results-grid')!;
  const summaryPill = document.getElementById('test-summary-pill')!;
  grid.innerHTML = '';

  const engine = new LabelEngine();
  const theme = createDefaultTheme('dark', 'modern');
  const measuredWithIcon = engine.measure(
    'Icon Badge',
    { maxWidth: 180, icon: WARN_SVG_ICON, iconSize: 14, iconGap: 5 },
    theme
  );

  const subComponents = barChart.getSubComponents();
  const barAriaItems =
    barChart.shadowRoot?.querySelectorAll('.mc-bar-rect.mc-aria-item') ?? [];
  const firstBarAria = barAriaItems[0];
  const underThresholdBars =
    barChart.shadowRoot?.querySelectorAll(
      '.mc-bar-rect[data-under-threshold="true"]'
    ) ?? [];
  const underThresholdPoints =
    studioLine.shadowRoot?.querySelectorAll(
      '.mc-line-point[data-under-threshold="true"]'
    ) ?? [];

  const checks: { name: string; pass: boolean }[] = [
    {
      name: 'Single Nivo-style chart.config drives internal sub-components (including <mc-marker-layer>)',
      pass:
        Boolean(subComponents.themeLayer) &&
        Boolean(subComponents.scaleLayer) &&
        Boolean(subComponents.viewLayer) &&
        Boolean(subComponents.animationLayer) &&
        Boolean(subComponents.ariaLayer) &&
        Boolean(subComponents.markerLayer)
    },
    {
      name: '<mc-label> supports <foreignObject> containing SVG icons with Pretext icon-aware box sizing',
      pass:
        measuredWithIcon.iconExtraWidth === 19 &&
        measuredWithIcon.boxWidth > measuredWithIcon.width
    },
    {
      name: '<mc-marker-layer> renders marker lines & marker areas and restyles bars/points under threshold',
      pass:
        Boolean(barChart.shadowRoot?.querySelector('.mc-marker-line')) &&
        Boolean(barChart.shadowRoot?.querySelector('.mc-marker-area')) &&
        underThresholdBars.length === 5 &&
        underThresholdBars[0].getAttribute('fill') === '#ef4444' &&
        underThresholdPoints.length > 0
    },
    {
      name: 'Dedicated <mc-animation-layer> animates items with motionConfig presets',
      pass:
        Boolean(customElements.get('mc-animation-layer')) &&
        firstBarAria?.getAttribute('data-animated') === 'true' &&
        firstBarAria?.getAttribute('data-animation-type') === 'bar-vertical'
    },
    {
      name: 'Dedicated <mc-aria-layer> decorates EVERY chart item with customized aria-label & tabindex',
      pass:
        barAriaItems.length === 12 &&
        firstBarAria?.getAttribute('role') === 'graphics-symbol' &&
        Boolean(firstBarAria?.getAttribute('aria-label')?.includes('Cloud')) &&
        firstBarAria?.getAttribute('tabindex') === '0'
    },
    {
      name: 'All 10 chart & 11 layer/label/aria/animation/marker Custom Elements registered',
      pass: [
        'mc-line-chart',
        'mc-bar-chart',
        'mc-pie-chart',
        'mc-heatmap-chart',
        'mc-radar-chart',
        'mc-sunburst-chart',
        'mc-sankey-chart',
        'mc-scatter-chart',
        'mc-treemap-chart',
        'mc-gauge-chart',
        'mc-label',
        'mc-theme-layer',
        'mc-scale-layer',
        'mc-view-layer',
        'mc-animation-layer',
        'mc-aria-layer',
        'mc-marker-layer',
        'mc-marker',
        'mc-chart-layer',
        'mc-custom-layer'
      ].every((tag) => Boolean(customElements.get(tag)))
    },
    {
      name: 'Line Chart splits line path gradient at threshold & marks under-threshold points',
      pass:
        Boolean(
          studioLine.shadowRoot?.querySelector(
            '.mc-line-path[data-has-threshold-matches="true"]'
          )
        ) &&
        (studioLine.shadowRoot?.querySelectorAll('.mc-line-point.mc-aria-item')
          .length ?? 0) === 21
    },
    {
      name: 'Pie, Heatmap & Radar render animated ARIA items & Pretext labels',
      pass:
        (pieChart.shadowRoot?.querySelectorAll('.mc-pie-arc.mc-aria-item')
          .length ?? 0) === 5 &&
        (heatmapChart.shadowRoot?.querySelectorAll(
          '.mc-heatmap-cell.mc-aria-item'
        ).length ?? 0) === 20 &&
        (radarChart.shadowRoot?.querySelectorAll('.mc-radar-dot.mc-aria-item')
          .length ?? 0) === 12
    },
    {
      name: 'Sunburst, Sankey, Treemap, Scatter & Gauge render animated ARIA items',
      pass:
        (sunburstChart.shadowRoot?.querySelectorAll(
          '.mc-sunburst-arc.mc-aria-item'
        ).length ?? 0) > 5 &&
        (sankeyChart.shadowRoot?.querySelectorAll(
          '.mc-sankey-node.mc-aria-item'
        ).length ?? 0) === 7 &&
        Boolean(
          gaugeChart.shadowRoot?.querySelector(
            '.mc-gauge-value-arc.mc-aria-item'
          )
        )
    }
  ];

  let passedCount = 0;
  checks.forEach((chk) => {
    if (chk.pass) passedCount++;
    const div = document.createElement('div');
    div.className = `test-item ${chk.pass ? '' : 'fail'}`;
    div.innerHTML = `<span>${chk.pass ? '✅' : '❌'}</span><span>${
      chk.name
    }</span>`;
    grid.appendChild(div);
  });

  summaryPill.textContent = `${passedCount} / ${checks.length} Passed`;
}

document
  .getElementById('btn-run-tests')
  ?.addEventListener('click', runLiveVerificationTests);

setTimeout(runLiveVerificationTests, 120);
