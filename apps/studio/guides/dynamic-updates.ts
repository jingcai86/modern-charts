import type {
  LegendPosition,
  MCBaseChart,
  ThemeModePreference,
  TooltipPositionMode
} from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderDynamicUpdatesGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Dynamic Data Updates &amp; Runtime Chart Updates</h2>
    <p class="guide-prose">
      Every <code>&lt;mc-*-chart&gt;</code> element supports live post-render updates without unmounting or recreating
      the Web Component. Understanding how property assignments, <code>setConfig()</code>, attributes, and animations
      interact ensures silky-smooth dashboards and real-time streams.
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. Immutable Assignment vs. In-Place Mutation</h3>
        <p>Assigning <code>chart.data = newData</code> or <code>chart.config = { ... }</code> triggers an immediate re-render. In-place array mutations (like <code>arr.push(...)</code>) are <strong>not</strong> auto-observed — assign a new reference or call <code>chart.render()</code>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Batching Runtime Changes</h3>
        <p>When updating multiple options (data, palette, legend, layout) together, pass a single object to <code>chart.setConfig({ ... })</code> so the chart computes layout and renders strictly <strong>once</strong>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. High-Frequency Feeds &amp; State</h3>
        <p>For 1s+ dashboards keep animations on; for rapid sub-second feeds set <code>animate: false</code> to skip transition timers. Active tooltips dismiss cleanly and <code>chart.data = null</code> switches to <code>:state(empty)</code>.</p>
      </div>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Live 1-Second Sliding-Window Streaming Line Chart
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Real-Time Sliding-Window Streaming (<code>chart.data = nextSeries</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Appends a new telemetry point every second and drops the oldest point once the window exceeds 12 samples.
          Toggle <code>animate</code> off to compare smooth high-frequency streaming vs. animated updates.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" id="btn-stream-toggle" class="btn-primary">▶ Start 1s Stream</button>
        <button type="button" id="btn-stream-step">+ Push 1 Point</button>
        <button type="button" id="btn-stream-reset">↻ Reset</button>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="chk-stream-animate" />
          <code>animate</code>
        </label>
        <span id="stream-window-badge" class="comp-pill">Window: 8/12 · Latest: t8</span>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-dyn-stream-chart"></div>
      <div id="guide-dyn-stream-code"></div>
    </div>
  `;
  container.appendChild(ex1);

  const streamChart = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-dyn-stream-chart')!.appendChild(streamChart);
  mounted.push(streamChart);

  const WINDOW_SIZE = 12;
  let tickSeq = 0;
  let cpuVal = 48;
  let memVal = 62;

  const makeInitialSeries = () => {
    tickSeq = 0;
    cpuVal = 48;
    memVal = 62;
    const cpuPts: Array<{ x: string; y: number }> = [];
    const memPts: Array<{ x: string; y: number }> = [];
    for (let i = 0; i < 8; i++) {
      tickSeq += 1;
      cpuVal = Math.max(15, Math.min(92, Math.round(cpuVal + (Math.random() - 0.48) * 14)));
      memVal = Math.max(25, Math.min(95, Math.round(memVal + (Math.random() - 0.5) * 8)));
      cpuPts.push({ x: `t${tickSeq}`, y: cpuVal });
      memPts.push({ x: `t${tickSeq}`, y: memVal });
    }
    return [
      { id: 'CPU %', data: cpuPts },
      { id: 'Memory %', data: memPts }
    ];
  };

  let streamSeries = makeInitialSeries();
  let streamTimer: ReturnType<typeof setInterval> | null = null;

  const chkStreamAnim = ex1.querySelector('#chk-stream-animate') as HTMLInputElement;
  const btnStreamToggle = ex1.querySelector('#btn-stream-toggle') as HTMLButtonElement;
  const btnStreamStep = ex1.querySelector('#btn-stream-step') as HTMLButtonElement;
  const btnStreamReset = ex1.querySelector('#btn-stream-reset') as HTMLButtonElement;
  const streamBadge = ex1.querySelector('#stream-window-badge') as HTMLElement;

  const updateStreamBadge = () => {
    const pts = streamSeries[0].data;
    const latest = pts[pts.length - 1]?.x ?? '—';
    streamBadge.textContent = `Window: ${pts.length}/${WINDOW_SIZE} · Latest: ${latest}`;
  };

  const renderStreamChart = () => {
    updateStreamBadge();
    streamChart.setConfig({
      data: streamSeries,
      autoSize: true,
      themeMode,
      palette: 'cyber',
      title: `Live Telemetry Feed (${WINDOW_SIZE}-Sample Sliding Window)`,
      animate: chkStreamAnim.checked,
      enableArea: true,
      areaOpacity: 0.16,
      curve: 'monotoneX',
      yScale: { type: 'linear', min: 0, max: 100 },
      margin: { top: 44, right: 24, bottom: 72, left: 48 },
      layers: ['grid', 'axes', 'areas', 'lines', 'points', 'slices', 'legends']
    });
  };

  const pushNextPoint = () => {
    tickSeq += 1;
    cpuVal = Math.max(12, Math.min(95, Math.round(cpuVal + (Math.random() - 0.48) * 16)));
    memVal = Math.max(22, Math.min(96, Math.round(memVal + (Math.random() - 0.5) * 9)));
    streamSeries = [
      {
        id: 'CPU %',
        data: [...streamSeries[0].data, { x: `t${tickSeq}`, y: cpuVal }].slice(
          -WINDOW_SIZE
        )
      },
      {
        id: 'Memory %',
        data: [...streamSeries[1].data, { x: `t${tickSeq}`, y: memVal }].slice(
          -WINDOW_SIZE
        )
      }
    ];
    updateStreamBadge();
    // Reassign .data with a fresh reference to trigger an immediate update
    streamChart.data = streamSeries;
  };

  const stopStream = () => {
    if (streamTimer !== null) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
    btnStreamToggle.textContent = '▶ Start 1s Stream';
    btnStreamToggle.classList.add('btn-primary');
  };

  btnStreamToggle.addEventListener('click', () => {
    if (streamTimer !== null) {
      stopStream();
      return;
    }
    btnStreamToggle.textContent = '⏸ Pause Stream';
    btnStreamToggle.classList.remove('btn-primary');
    pushNextPoint();
    streamTimer = setInterval(() => {
      if (!streamChart.isConnected) {
        stopStream();
        return;
      }
      pushNextPoint();
    }, 1000);
  });

  btnStreamStep.addEventListener('click', pushNextPoint);
  btnStreamReset.addEventListener('click', () => {
    stopStream();
    streamSeries = makeInitialSeries();
    renderStreamChart();
  });
  chkStreamAnim.addEventListener('change', renderStreamChart);

  renderStreamChart();

  ex1.querySelector('#guide-dyn-stream-code')!.appendChild(
    createCodeBlock(
      `
// Sliding-window real-time update (recommended immutable pattern):
const WINDOW = 12;

function pushSample(nextLabel, cpu, mem) {
  series = [
    { id: 'CPU %',    data: [...series[0].data, { x: nextLabel, y: cpu }].slice(-WINDOW) },
    { id: 'Memory %', data: [...series[1].data, { x: nextLabel, y: mem }].slice(-WINDOW) }
  ];
  // Assigning .data triggers a fast re-render (set animate: false for high-frequency feeds)
  lineChart.data = series;
}

// Note: mutating in place (series[0].data.push(...)) is NOT auto-detected;
// either assign a new array reference or explicitly call lineChart.render().
      `,
      'Sliding-Window Streaming Updates'
    )
  );

  // Example 2: Randomize / Add-Remove Points on Bar & Pie Charts
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Randomize, Add/Remove Points &amp; Empty State</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Replace datasets dynamically on <code>&lt;mc-bar-chart&gt;</code> and <code>&lt;mc-pie-chart&gt;</code>,
          add/remove items, or assign <code>chart.data = null</code> to switch cleanly to the empty state (<code>:state(empty)</code>).
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" id="btn-dyn-randomize" class="btn-primary">🎲 Randomize Data</button>
        <button type="button" id="btn-dyn-add">+ Add Quarter</button>
        <button type="button" id="btn-dyn-remove">− Remove Last</button>
        <button type="button" id="btn-dyn-empty">Toggle Empty (null)</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-dyn-bar-chart"></div>
      <div class="guide-chart-stage" id="guide-dyn-pie-chart"></div>
    </div>
  `;
  container.appendChild(ex2);

  const dynBar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  const dynPie = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-dyn-bar-chart')!.appendChild(dynBar);
  ex2.querySelector('#guide-dyn-pie-chart')!.appendChild(dynPie);
  mounted.push(dynBar, dynPie);

  let barRows = [
    { quarter: 'Q1', Cloud: 138, Edge: 84 },
    { quarter: 'Q2', Cloud: 172, Edge: 108 },
    { quarter: 'Q3', Cloud: 196, Edge: 124 },
    { quarter: 'Q4', Cloud: 234, Edge: 152 }
  ];
  let pieRows = [
    { id: 'Compute', value: 420 },
    { id: 'Storage', value: 290 },
    { id: 'Network', value: 195 },
    { id: 'AI Ops', value: 310 }
  ];
  let isEmptyDemo = false;

  const syncBarPie = () => {
    dynBar.setConfig({
      data: isEmptyDemo ? null : barRows,
      autoSize: true,
      themeMode,
      palette: 'modern',
      title: isEmptyDemo ? 'Empty State (data = null)' : 'Live Bar Dataset',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      borderRadius: 6,
      margin: { top: 44, right: 20, bottom: 70, left: 48 }
    });
    dynPie.setConfig({
      data: isEmptyDemo ? null : pieRows,
      autoSize: true,
      themeMode,
      palette: 'sunset',
      title: isEmptyDemo ? 'Empty State (data = null)' : 'Live Pie Dataset',
      innerRadius: 0.5
    });
  };
  syncBarPie();

  ex2.querySelector('#btn-dyn-randomize')!.addEventListener('click', () => {
    isEmptyDemo = false;
    barRows = barRows.map((r) => ({
      quarter: r.quarter,
      Cloud: Math.round(70 + Math.random() * 210),
      Edge: Math.round(45 + Math.random() * 145)
    }));
    pieRows = pieRows.map((p) => ({
      id: p.id,
      value: Math.round(90 + Math.random() * 420)
    }));
    dynBar.data = barRows;
    dynPie.data = pieRows;
  });

  ex2.querySelector('#btn-dyn-add')!.addEventListener('click', () => {
    isEmptyDemo = false;
    const nextIdx = barRows.length + 1;
    barRows = [
      ...barRows,
      {
        quarter: `Q${nextIdx}`,
        Cloud: Math.round(90 + Math.random() * 190),
        Edge: Math.round(55 + Math.random() * 130)
      }
    ];
    pieRows = [
      ...pieRows,
      { id: `Region ${pieRows.length + 1}`, value: Math.round(100 + Math.random() * 260) }
    ];
    syncBarPie();
  });

  ex2.querySelector('#btn-dyn-remove')!.addEventListener('click', () => {
    if (barRows.length > 2) barRows = barRows.slice(0, -1);
    if (pieRows.length > 2) pieRows = pieRows.slice(0, -1);
    isEmptyDemo = false;
    syncBarPie();
  });

  ex2.querySelector('#btn-dyn-empty')!.addEventListener('click', () => {
    isEmptyDemo = !isEmptyDemo;
    syncBarPie();
  });

  // Example 3: Batched Runtime Config Updates (Theme, Layout, Stacked/Grouped, Legend, Tooltip, Resize)
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Batched Runtime Config Changes (<code>setConfig</code>) &amp; Resize</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Change palette, orientation, stacking, legend placement, and tooltip mode dynamically in a single batched
          <code>chart.setConfig({...})</code> call without recreating the element.
        </p>
      </div>
    </div>
    <div class="guide-controls-row" style="flex-wrap:wrap;gap:12px;margin:0 0 12px;">
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Palette:
        <select id="dyn-palette">
          <option value="modern">modern</option>
          <option value="emerald">emerald</option>
          <option value="sunset">sunset</option>
          <option value="ocean">ocean</option>
          <option value="cyber">cyber</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Mode:
        <select id="dyn-group-mode">
          <option value="grouped">grouped</option>
          <option value="stacked">stacked</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Layout:
        <select id="dyn-layout">
          <option value="vertical">vertical</option>
          <option value="horizontal">horizontal</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Legend:
        <select id="dyn-legend-pos">
          <option value="bottom">bottom</option>
          <option value="top">top</option>
          <option value="left">left</option>
          <option value="right">right</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Tooltip:
        <select id="dyn-tooltip-pos">
          <option value="item">item</option>
          <option value="follow">follow</option>
        </select>
      </label>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-dyn-cfg-chart"></div>
      <div id="guide-dyn-cfg-code"></div>
    </div>
  `;
  container.appendChild(ex3);

  const cfgBar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex3.querySelector('#guide-dyn-cfg-chart')!.appendChild(cfgBar);
  mounted.push(cfgBar);

  const selPalette = ex3.querySelector('#dyn-palette') as HTMLSelectElement;
  const selGroup = ex3.querySelector('#dyn-group-mode') as HTMLSelectElement;
  const selLayout = ex3.querySelector('#dyn-layout') as HTMLSelectElement;
  const selLegend = ex3.querySelector('#dyn-legend-pos') as HTMLSelectElement;
  const selTip = ex3.querySelector('#dyn-tooltip-pos') as HTMLSelectElement;
  const cfgCodeHost = ex3.querySelector('#guide-dyn-cfg-code') as HTMLElement;

  const renderCfgBar = () => {
    const palette = selPalette.value as any;
    const groupMode = selGroup.value as 'grouped' | 'stacked';
    const layout = selLayout.value as 'vertical' | 'horizontal';
    const legendPos = selLegend.value as LegendPosition;
    const tooltipPos = selTip.value as TooltipPositionMode;

    cfgBar.setConfig({
      data: [
        { quarter: 'Q1', Cloud: 120, Edge: 85, AI: 64 },
        { quarter: 'Q2', Cloud: 158, Edge: 102, AI: 94 },
        { quarter: 'Q3', Cloud: 184, Edge: 118, AI: 128 },
        { quarter: 'Q4', Cloud: 226, Edge: 142, AI: 164 }
      ],
      autoSize: true,
      themeMode,
      palette,
      groupMode,
      layout,
      title: `Batched Update (${groupMode} · ${layout} · legend:${legendPos})`,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'AI'],
      legend: { enabled: true, position: legendPos },
      tooltip: { position: tooltipPos },
      borderRadius: 5,
      margin: { top: 44, right: 24, bottom: 72, left: 56 }
    });

    cfgCodeHost.innerHTML = '';
    cfgCodeHost.appendChild(
      createCodeBlock(
        `
// Batch multiple changes into ONE setConfig() call (single render pass):
chart.setConfig({
  ...chart.config,
  palette: '${palette}',
  groupMode: '${groupMode}',
  layout: '${layout}',
  legend: { enabled: true, position: '${legendPos}' },
  tooltip: { position: '${tooltipPos}' }
});

// Container resizing:
// • autoSize: true (default) observes parent size automatically via ResizeObserver
// • autoSize: false -> call chart.resize(width, height) explicitly after layout changes
        `,
        'Batched Runtime Config Updates'
      )
    );
  };

  [selPalette, selGroup, selLayout, selLegend, selTip].forEach((el) =>
    el.addEventListener('change', renderCfgBar)
  );
  renderCfgBar();

  // Section 4: Framework Integration (React & Vue 3) + Performance & State Behavior
  const fwCard = document.createElement('section');
  fwCard.className = 'panel-card guide-section';
  fwCard.innerHTML = `
    <h2 class="panel-title">Attributes vs. Properties, Performance Tips &amp; Framework Snippets</h2>
    <div class="guide-table-wrap" style="margin-bottom:14px;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Recommended Pattern</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>HTML Attributes vs. JS Properties</strong></td><td>Simple strings/booleans work via HTML attributes (<code>palette="ocean"</code>, <code>tooltip-position="item"</code>). Arrays, objects, and callbacks (<code>data</code>, <code>config</code>, <code>tooltip.formatter</code>) should always be passed via JS properties or <code>setConfig()</code> to avoid JSON serialization overhead.</td></tr>
          <tr><td><strong>Batching Multiple Changes</strong></td><td>Prefer one <code>chart.setConfig({ ...prev, data, palette, groupMode })</code> call over setting 4 separate attributes/properties sequentially (each attribute mutation triggers its own <code>render()</code>).</td></tr>
          <tr><td><strong>High-Frequency Feeds</strong></td><td>Set <code>animate: false</code> and pass sliced immutable arrays (<code>[...pts, next].slice(-N)</code>) for smooth 10–60fps updates.</td></tr>
          <tr><td><strong>Tooltips, Focus &amp; Empty States</strong></td><td>Re-rendering rebuilds SVG layers cleanly. Setting <code>chart.data = null</code> clears the plot and toggles CSS custom state <code>:state(empty)</code> (ideal for loading skeletons or empty placeholders).</td></tr>
        </tbody>
      </table>
    </div>
    <div class="guide-example-grid" id="guide-dyn-fw-snippets"></div>
  `;
  container.appendChild(fwCard);

  const fwGrid = fwCard.querySelector('#guide-dyn-fw-snippets') as HTMLElement;
  fwGrid.appendChild(
    createCodeBlock(
      `
// React 18 / 19 reactive wrapper
import { useEffect, useRef } from 'react';
import 'modern-charts/bar';

export function RevenueBarChart({ data, groupMode }: { data: any[]; groupMode: 'grouped' | 'stacked' }) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Batched into a single render pass whenever props change
    ref.current.setConfig({
      data,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      groupMode,
      autoSize: true
    });
  }, [data, groupMode]);

  return <mc-bar-chart ref={ref} style={{ height: 340, display: 'block' }} />;
}
      `,
      'React Reactive Integration'
    )
  );
  fwGrid.appendChild(
    createCodeBlock(
      `
<!-- Vue 3 Composition API reactive wrapper -->
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import 'modern-charts/line';

const props = defineProps<{ series: any[]; animate?: boolean }>();
const chartEl = ref<any>(null);

watchEffect(() => {
  if (!chartEl.value) return;
  chartEl.value.setConfig({
    data: props.series,
    animate: props.animate ?? false,
    autoSize: true
  });
});
</script>

<template>
  <mc-line-chart ref="chartEl" style="display: block; height: 340px" />
</template>
      `,
      'Vue 3 Reactive Integration'
    )
  );

  return mounted;
}
