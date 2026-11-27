import { getGlobalPalette } from '../state/theme';
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
} from '../sample-data';
import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createFeatureGuideBootstrap } from './bootstrapping';

export function renderViewZoomGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];
  const bootstrap = createFeatureGuideBootstrap({ zoom: true, csvExport: false });

  // Intro & API Reference Table
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Universal Viewport Zoom Controls &amp; Keyboard-Accessible Zoom Toggle</h2>
    <p class="guide-prose">
      Every chart component supports shared viewport zoom and pan via <code>&lt;mc-view-layer&gt;</code>,
      <code>config.view</code>, and <code>chart.toggleZoom()</code>. To keep standalone chart downloads small,
      the zoom feature defaults to <code>false</code> at bootstrap and is enabled via
      <code>registerModernCharts({ features: { zoom: true } })</code> or per-chart
      <code>registerBarChart({ features: { zoom: true } })</code> (see the
      <a href="#/guide/bootstrapping">🚀 Feature Bootstrapping &amp; Lazy Loading guide</a>).
      The examples start with zoom enabled. Edit <code>features.zoom</code> in either example to
      change its availability for both charts.
    </p>
    <div class="guide-table-wrap" style="max-width:100%;overflow-x:auto;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Surface</th>
            <th>API / Option</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>On-Chart Toggle Button</strong></td>
            <td><code>button[data-zoom="toggle"]</code></td>
            <td>Renders inside <code>.mc-view-controls</code> with <code>aria-pressed="true|false"</code> and <code>data-zoom-state="on|off"</code>; keyboard-activatable via <kbd>Enter</kbd> and <kbd>Space</kbd>.</td>
          </tr>
          <tr>
            <td><strong>Programmatic Zoom Toggle</strong></td>
            <td><code>chart.toggleZoom(force?)</code>, <code>chart.setZoomEnabled(bool)</code>, <code>chart.zoomable</code></td>
            <td>Enables or disables zoom gestures (wheel, brush, range slider) and disables <code>+</code>, <code>−</code>, and <code>Reset</code> buttons without resetting the current pan/zoom transform.</td>
          </tr>
          <tr>
            <td><strong>Programmatic Scale &amp; Reset</strong></td>
            <td><code>chart.zoomIn(factor?)</code>, <code>chart.zoomOut(factor?)</code>, <code>chart.resetZoom()</code></td>
            <td>Scales or resets the chart viewport programmatically when <code>chart.zoomable</code> is <code>true</code>.</td>
          </tr>
          <tr>
            <td><strong>View Configuration</strong></td>
            <td><code>config.view</code> / <code>&lt;mc-view-layer&gt;</code></td>
            <td>Configure <code>zoomable</code>, <code>pannable</code>, <code>showControls</code>, <code>brush</code>, <code>slider</code>, <code>direction</code> (<code>'x' | 'y' | 'xy'</code>), <code>minZoom</code>, and <code>maxZoom</code> across all 10 chart types.</td>
          </tr>
          <tr>
            <td><strong>Lifecycle Events</strong></td>
            <td><code>mc-zoom-toggle</code>, <code>mc-zoom</code>, <code>mc-brush</code></td>
            <td>Composed custom events emitted when zoom is toggled (<code>{ zoomable, chartType }</code>) or when the viewport transform changes (<code>{ k, x, y }</code>).</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // ============================================================================
  // Example 1: Interactive Zoom On/Off Toggle & View Lock
  // ============================================================================
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.id = 'vz-zoom-toggle';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Keyboard-Accessible Zoom On/Off Toggle &amp; View Lock</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Toggle zoom on or off using the toolbar button, the on-chart <code>Zoom: On / Off</code> control, or keyboard <kbd>Enter</kbd> / <kbd>Space</kbd>. Disabling zoom locks the view against wheel, brush, slider, and zoom buttons while keeping the current transform intact.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Zoom controls">
        <button type="button" id="vz-zoom-toggle-btn" class="btn-primary" aria-pressed="true" data-zoom-state="on">Zoom: On</button>
        <button type="button" id="vz-zoom-in-btn">+ Zoom In</button>
        <button type="button" id="vz-zoom-out-btn">− Zoom Out</button>
        <button type="button" id="vz-zoom-reset-btn">↺ Reset</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="vz-chart-1"></div>
      <div id="vz-editor-1"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Live Zoom &amp; Viewport State</div>
      <div class="inspector-readout" id="vz-readout-1" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;
  container.appendChild(ex1);

  const radar1 = document.createElement('mc-radar-chart') as MCBaseChart<any>;
  ex1.querySelector('#vz-chart-1')!.appendChild(radar1);
  mounted.push(radar1);

  const zoomToggleBtn1 = ex1.querySelector<HTMLButtonElement>(
    '#vz-zoom-toggle-btn'
  )!;
  const zoomInBtn1 = ex1.querySelector<HTMLButtonElement>('#vz-zoom-in-btn')!;
  const zoomOutBtn1 = ex1.querySelector<HTMLButtonElement>('#vz-zoom-out-btn')!;
  const zoomResetBtn1 = ex1.querySelector<HTMLButtonElement>(
    '#vz-zoom-reset-btn'
  )!;
  const readoutEl1 = ex1.querySelector<HTMLElement>('#vz-readout-1')!;

  const initialCfg1: Record<string, any> = {
    title: 'Benchmark Score (Zoomable Radar)',
    indexBy: 'metric',
    keys: ['ModernCharts', 'TraditionalChart'],
    data: structuredClone(SAMPLE_RADAR_DATA),
    view: {
      zoomable: true,
      pannable: true,
      showControls: true,
      minZoom: 0.5,
      maxZoom: 6
    }
  };

  const syncEx1Readout = () => {
    const zoomable = radar1.zoomable;
    const viewport = radar1.shadowRoot?.querySelector('.mc-chart-viewport');
    const transform =
      viewport?.getAttribute('transform') || 'translate(0, 0) scale(1)';
    zoomToggleBtn1.disabled = !radar1.isFeatureEnabled('zoom');
    zoomToggleBtn1.setAttribute('aria-pressed', String(zoomable));
    zoomToggleBtn1.setAttribute('data-zoom-state', zoomable ? 'on' : 'off');
    zoomToggleBtn1.textContent = zoomable ? 'Zoom: On' : 'Zoom: Off';
    zoomToggleBtn1.classList.toggle('btn-primary', zoomable);
    zoomInBtn1.disabled = !zoomable;
    zoomOutBtn1.disabled = !zoomable;
    zoomResetBtn1.disabled = !zoomable;
    readoutEl1.textContent = `zoomable: ${zoomable} | transform: ${transform}`;
  };

  const applyEx1Config = (cfg: Record<string, any>) => {
    radar1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx1Readout();
  };

  applyEx1Config(initialCfg1);

  const editor1 = bootstrap.createEditor({
    title: 'View & Zoom Toggle Config (Live)',
    initialConfig: initialCfg1,
    chartId: () => 'radar',
    usage: `chart.addEventListener('mc-zoom-toggle', (event) => {
  console.log('Zoom enabled:', event.detail.zoomable);
});`,
    hint: 'Edit features.zoom for both examples or view.zoomable for this chart. The Zoom button logs to the browser console.',
    onConfigChange: (nextCfg) => {
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(initialCfg1);
      applyEx1Config(fresh);
      editor1.syncConfig(fresh);
    }
  });
  ex1.querySelector('#vz-editor-1')!.appendChild(editor1.element);

  zoomToggleBtn1.addEventListener('click', () => radar1.toggleZoom());

  radar1.addEventListener('mc-zoom-toggle', (event) => {
    const { zoomable } = (event as CustomEvent<{ zoomable: boolean }>).detail;
    console.log('Zoom enabled:', zoomable);
    syncEx1Readout();
    editor1.syncConfig({
      ...radar1.config,
      view: {
        ...(radar1.config.view ?? {}),
        zoomable
      }
    });
  });

  radar1.addEventListener('mc-zoom', () => {
    syncEx1Readout();
  });

  zoomInBtn1.addEventListener('click', () => {
    radar1.zoomIn();
    syncEx1Readout();
  });
  zoomOutBtn1.addEventListener('click', () => {
    radar1.zoomOut();
    syncEx1Readout();
  });
  zoomResetBtn1.addEventListener('click', () => {
    radar1.resetZoom();
    syncEx1Readout();
  });

  // ============================================================================
  // Example 2: Universal Zoom & Pan Across All 10 Chart Types
  // ============================================================================
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.id = 'vz-chart-types';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Universal Zoom &amp; Pan Across All 10 Chart Types</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch across all 10 chart types to test on-chart <code>Zoom: On / Off</code>, <code>+</code>, <code>−</code>, and <code>Reset</code> controls on cartesian, radial, hierarchy, and flow charts.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Chart type zoom presets" id="vz-type-buttons"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="vz-chart-2"></div>
      <div id="vz-editor-2"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Active Chart Zoom Status</div>
      <div class="inspector-readout" id="vz-readout-2" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>
  `;
  container.appendChild(ex2);

  interface ChartDemoSpec {
    id: string;
    label: string;
    tag: string;
    config: Record<string, any>;
  }

  const chartSpecs: ChartDemoSpec[] = [
    {
      id: 'bar',
      label: 'Bar',
      tag: 'mc-bar-chart',
      config: {
        title: 'Quarterly Spend',
        indexBy: 'quarter',
        keys: ['Cloud', 'Edge'],
        data: SAMPLE_BAR_DATA.slice(0, 3),
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'line',
      label: 'Line',
      tag: 'mc-line-chart',
      config: {
        title: 'Throughput',
        data: SAMPLE_LINE_DATA.slice(0, 2),
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'pie',
      label: 'Pie',
      tag: 'mc-pie-chart',
      config: {
        title: 'Runtime Footprint',
        innerRadius: 0.52,
        data: SAMPLE_PIE_DATA.slice(0, 4),
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'heatmap',
      label: 'Heatmap',
      tag: 'mc-heatmap-chart',
      config: {
        title: 'CPU Load (%)',
        data: SAMPLE_HEATMAP_DATA.slice(0, 3),
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'radar',
      label: 'Radar',
      tag: 'mc-radar-chart',
      config: {
        title: 'Benchmark Score',
        indexBy: 'metric',
        keys: ['ModernCharts', 'TraditionalChart'],
        data: SAMPLE_RADAR_DATA.slice(0, 5),
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'sunburst',
      label: 'Sunburst',
      tag: 'mc-sunburst-chart',
      config: {
        title: 'Module Hierarchy',
        data: SAMPLE_SUNBURST_DATA,
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'sankey',
      label: 'Sankey',
      tag: 'mc-sankey-chart',
      config: {
        title: 'Pipeline Flow',
        data: SAMPLE_SANKEY_DATA,
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'scatter',
      label: 'Scatter',
      tag: 'mc-scatter-chart',
      config: {
        title: 'FPS vs Size',
        data: SAMPLE_SCATTER_DATA,
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'treemap',
      label: 'Treemap',
      tag: 'mc-treemap-chart',
      config: {
        title: 'Package Footprint',
        data: SAMPLE_SUNBURST_DATA,
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    },
    {
      id: 'gauge',
      label: 'Gauge',
      tag: 'mc-gauge-chart',
      config: {
        title: 'Layout Efficiency',
        data: { ...SAMPLE_GAUGE_DATA },
        view: { zoomable: true, pannable: true, showControls: true, maxZoom: 6 }
      }
    }
  ];

  const stage2 = ex2.querySelector<HTMLElement>('#vz-chart-2')!;
  const typeBtnsWrap = ex2.querySelector<HTMLElement>('#vz-type-buttons')!;
  const readoutEl2 = ex2.querySelector<HTMLElement>('#vz-readout-2')!;
  let activeSpec2 = chartSpecs[2]; // default to Pie
  let activeChart2: MCBaseChart<any> = document.createElement(
    activeSpec2.tag
  ) as MCBaseChart<any>;
  stage2.appendChild(activeChart2);
  mounted.push(activeChart2);

  const syncEx2Readout = () => {
    const viewCfg = activeChart2.resolveViewConfig();
    const pannable = activeChart2.isFeatureEnabled('zoom') && viewCfg.enabled && viewCfg.pannable;
    const vp = activeChart2.shadowRoot?.querySelector('.mc-chart-viewport');
    const transform = vp?.getAttribute('transform') || 'translate(0, 0) scale(1)';
    readoutEl2.textContent = `<${activeSpec2.tag}> | zoomable: ${activeChart2.zoomable} | pannable: ${pannable} | transform: ${transform}`;
  };

  const wireEx2ChartListeners = (chart: MCBaseChart<any>) => {
    chart.addEventListener('mc-zoom-toggle', () => {
      syncEx2Readout();
      editor2.syncConfig({
        ...chart.config,
        view: {
          ...(chart.config.view ?? {}),
          zoomable: chart.zoomable
        }
      });
    });
    chart.addEventListener('mc-zoom', (event) => {
      console.log('Viewport:', (event as CustomEvent<unknown>).detail);
      syncEx2Readout();
    });
  };

  const updateEx2Chart = (spec: ChartDemoSpec, cfg: Record<string, any>) => {
    if (activeChart2.tagName.toLowerCase() !== spec.tag) {
      const nextEl = document.createElement(spec.tag) as MCBaseChart<any>;
      stage2.replaceChildren(nextEl);
      const idx = mounted.indexOf(activeChart2);
      if (idx !== -1) mounted[idx] = nextEl;
      else mounted.push(nextEl);
      activeChart2 = nextEl;
      wireEx2ChartListeners(activeChart2);
    }
    activeChart2.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      animate: false,
      ...cfg
    });
    syncEx2Readout();
  };

  const editor2 = bootstrap.createEditor({
    title: 'Multi-Chart View Config (Live)',
    initialConfig: structuredClone(activeSpec2.config),
    chartId: () => activeSpec2.id,
    usage: `chart.addEventListener('mc-zoom', (event) => {
  console.log('Viewport:', event.detail);
});`,
    hint: 'Edit features.zoom for both examples or the active chart’s view settings. Viewport changes log to the browser console.',
    onConfigChange: (nextCfg) => {
      updateEx2Chart(activeSpec2, nextCfg);
    },
    onReset: () => {
      const fresh = structuredClone(activeSpec2.config);
      updateEx2Chart(activeSpec2, fresh);
      editor2.syncConfig(fresh);
    }
  });
  ex2.querySelector('#vz-editor-2')!.appendChild(editor2.element);

  wireEx2ChartListeners(activeChart2);

  chartSpecs.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.vzChartType = spec.id;
    btn.textContent = spec.label;
    const isSelected = spec.id === activeSpec2.id;
    btn.setAttribute('aria-pressed', String(isSelected));
    btn.classList.toggle('btn-primary', isSelected);
    btn.addEventListener('click', () => {
      activeSpec2 = spec;
      typeBtnsWrap
        .querySelectorAll<HTMLButtonElement>('button[data-vz-chart-type]')
        .forEach((b) => {
          const active = b.dataset.vzChartType === spec.id;
          b.setAttribute('aria-pressed', String(active));
          b.classList.toggle('btn-primary', active);
        });
      const fresh = structuredClone(spec.config);
      updateEx2Chart(spec, fresh);
      editor2.syncConfig(fresh);
    });
    typeBtnsWrap.appendChild(btn);
  });

  updateEx2Chart(activeSpec2, structuredClone(activeSpec2.config));

  bootstrap.onFeaturesChanged(() => {
    syncEx1Readout();
    syncEx2Readout();
  });

  return mounted;
}
