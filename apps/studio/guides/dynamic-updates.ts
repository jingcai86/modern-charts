import { getGlobalPalette } from '../state/theme';
import type {
  BarDatum,
  LegendPosition,
  MCBaseChart,
  PieDatum,
  ThemeModePreference,
  TooltipPositionMode
} from '../../../src/index';
import { createCodeBlock, createLiveConfigEditor } from './shared';

function nextItemId(prefix: string, currentIds: Array<string | number>): string {
  const ids = new Set(currentIds.map(String));
  let sequence = currentIds.length + 1;
  while (ids.has(`${prefix}${sequence}`)) sequence++;
  return `${prefix}${sequence}`;
}

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
          Appends a new telemetry point every second and drops the oldest once the window exceeds 12 samples —
          or edit <code>data</code>, <code>animate</code>, and <code>curve</code> directly in the live config editor.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" id="btn-stream-toggle" class="btn-primary">▶ Start 1s Stream</button>
        <button type="button" id="btn-stream-step">+ Push 1 Point</button>
        <button type="button" id="btn-stream-reset">↻ Reset</button>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="chk-stream-animate" checked />
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
    const pts = streamSeries[0]?.data ?? [];
    const latest = pts[pts.length - 1]?.x ?? '—';
    streamBadge.textContent = `Window: ${pts.length}/${WINDOW_SIZE} · Latest: ${latest}`;
  };

  const buildStreamConfig = () => ({
    title: `Live Telemetry Feed (${WINDOW_SIZE}-Sample Sliding Window)`,
    palette: 'antd',
    animate: chkStreamAnim.checked,
    motionConfig: 'default',
    enableArea: true,
    areaOpacity: 0.16,
    curve: 'monotoneX',
    data: streamSeries
  });
  let streamConfig: Record<string, any> = buildStreamConfig();

  const applyStreamConfig = (cfg: Record<string, any>) => {
    streamConfig = cfg;
    if (Array.isArray(cfg.data)) {
      streamSeries = cfg.data;
    }
    updateStreamBadge();
    streamChart.setConfig({
      autoSize: true,
      themeMode,
      yScale: { type: 'linear', min: 0, max: 100 },
      margin: { top: 44, right: 24, bottom: 72, left: 48 },
      layers: ['grid', 'axes', 'areas', 'lines', 'points', 'slices', 'legends'],
      ...cfg
    });
  };

  const streamObserver = new MutationObserver(() => {
    if (!streamChart.isConnected) stopStream();
  });

  const stopStream = () => {
    if (streamTimer !== null) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
    streamObserver.disconnect();
    btnStreamToggle.textContent = '▶ Start 1s Stream';
    btnStreamToggle.classList.add('btn-primary');
  };

  applyStreamConfig(streamConfig);

  const editor1 = createLiveConfigEditor({
    title: 'Sliding-Window Stream Config (Live)',
    initialConfig: streamConfig,
    hint: 'Edit data points, animate, curve, or palette — stream updates sync back automatically when editor is unfocused.',
    onConfigChange: (nextCfg) => {
      if (typeof nextCfg.animate === 'boolean') {
        chkStreamAnim.checked = nextCfg.animate;
      }
      applyStreamConfig(nextCfg);
    },
    onReset: () => {
      stopStream();
      chkStreamAnim.checked = true;
      streamSeries = makeInitialSeries();
      const resetCfg = buildStreamConfig();
      applyStreamConfig(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  ex1.querySelector('#guide-dyn-stream-code')!.appendChild(editor1.element);

  const pushNextPoint = () => {
    tickSeq += 1;
    cpuVal = Math.max(12, Math.min(95, Math.round(cpuVal + (Math.random() - 0.48) * 16)));
    memVal = Math.max(22, Math.min(96, Math.round(memVal + (Math.random() - 0.5) * 9)));
    const prev0 = streamSeries[0]?.data ?? [];
    const prev1 = streamSeries[1]?.data ?? [];
    streamSeries = [
      {
        id: streamSeries[0]?.id ?? 'CPU %',
        data: [...prev0, { x: `t${tickSeq}`, y: cpuVal }].slice(-WINDOW_SIZE)
      },
      {
        id: streamSeries[1]?.id ?? 'Memory %',
        data: [...prev1, { x: `t${tickSeq}`, y: memVal }].slice(-WINDOW_SIZE)
      }
    ];
    updateStreamBadge();
    streamChart.data = streamSeries;
    streamConfig = { ...streamConfig, data: streamSeries };
    editor1.syncConfig(streamConfig, {
      preserveFocus: true,
      resetBaseline: false
    });
  };

  const startStream = () => {
    btnStreamToggle.textContent = '⏸ Pause Stream';
    btnStreamToggle.classList.remove('btn-primary');
    // Replacing the guide or its contents clears the timer during navigation.
    streamObserver.observe(container, { childList: true });
    if (container.parentNode) streamObserver.observe(container.parentNode, { childList: true });
    streamTimer = setInterval(() => {
      if (!streamChart.isConnected) {
        stopStream();
        return;
      }
      pushNextPoint();
    }, 1000);
  };

  btnStreamToggle.addEventListener('click', () => {
    if (streamTimer !== null) {
      stopStream();
      return;
    }
    pushNextPoint();
    startStream();
  });

  btnStreamStep.addEventListener('click', pushNextPoint);
  btnStreamReset.addEventListener('click', () => {
    stopStream();
    streamSeries = makeInitialSeries();
    const resetCfg = buildStreamConfig();
    applyStreamConfig(resetCfg);
    editor1.syncConfig(resetCfg);
  });
  chkStreamAnim.addEventListener('change', () => {
    const nextCfg = { ...streamConfig, animate: chkStreamAnim.checked };
    applyStreamConfig(nextCfg);
    editor1.syncConfig(nextCfg);
  });
  startStream();

  // Example 2: Randomize / Add-Remove Points on Bar & Pie Charts + Live Dataset Editor
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Randomize, Add/Remove Points &amp; Empty State</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Set <code>itemTransitions: true</code> in a bar or pie chart’s config, then assign <code>chart.data</code>.
          Each added or removed quarter or slice animates on its own.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" id="btn-dyn-randomize" class="btn-primary">🎲 Randomize Data</button>
        <button type="button" id="btn-dyn-empty">Toggle Empty (null)</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div>
        <div class="guide-controls-row" style="margin-bottom:8px;" role="group" aria-label="Bar dataset">
          <button type="button" id="btn-dyn-add">+ Add Quarter</button>
          <button type="button" id="btn-dyn-remove">− Remove Last Quarter</button>
        </div>
        <div class="guide-chart-stage" id="guide-dyn-bar-chart"></div>
      </div>
      <div>
        <div class="guide-controls-row" style="margin-bottom:8px;" role="group" aria-label="Donut dataset">
          <button type="button" id="btn-dyn-pie-add">+ Add Slice</button>
          <button type="button" id="btn-dyn-pie-remove">− Remove Last Slice</button>
        </div>
        <div class="guide-chart-stage" id="guide-dyn-pie-chart"></div>
      </div>
    </div>
    <div id="guide-dyn-ex2-code" style="margin-top:14px;"></div>
  `;
  container.appendChild(ex2);

  const dynBar = document.createElement('mc-bar-chart') as MCBaseChart<BarDatum[]>;
  const dynPie = document.createElement('mc-pie-chart') as MCBaseChart<PieDatum[]>;
  ex2.querySelector('#guide-dyn-bar-chart')!.appendChild(dynBar);
  ex2.querySelector('#guide-dyn-pie-chart')!.appendChild(dynPie);
  mounted.push(dynBar, dynPie);

  const defaultBarRows = [
    { quarter: 'Q1', Cloud: 138, Edge: 84 },
    { quarter: 'Q2', Cloud: 172, Edge: 108 },
    { quarter: 'Q3', Cloud: 196, Edge: 124 },
    { quarter: 'Q4', Cloud: 234, Edge: 152 }
  ];
  const defaultPieRows = [
    { id: 'Compute', value: 420 },
    { id: 'Storage', value: 290 },
    { id: 'Network', value: 195 },
    { id: 'AI Ops', value: 310 }
  ];

  let barRows: BarDatum[] = defaultBarRows;
  let pieRows: PieDatum[] = defaultPieRows;

  dynBar.setConfig({
    data: barRows,
    autoSize: true,
    itemTransitions: true,
    motionConfig: 'stiff',
    themeMode,
    palette: getGlobalPalette(),
    title: 'Live Bar Dataset',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    borderRadius: 6,
    margin: { top: 44, right: 20, bottom: 70, left: 48 }
  });
  dynPie.setConfig({
    data: pieRows,
    autoSize: true,
    itemTransitions: true,
    motionConfig: 'stiff',
    themeMode,
    palette: 'material',
    title: 'Live Donut Dataset',
    innerRadius: 0.5
  });

  type Datasets = { barData: BarDatum[] | null; pieData: PieDatum[] | null };
  const readDatasets = (): Datasets => ({ barData: dynBar.data, pieData: dynPie.data });

  const updateDataset = <T>(chart: MCBaseChart<T[]>, next: T[] | null | undefined, savedRows: T[]): T[] => {
    const previous = chart.data;
    if (next === undefined || next === previous) return savedRows;
    // Editing the combined snippet parses both arrays again, even when one is unchanged.
    if (next?.length === previous?.length && JSON.stringify(next) === JSON.stringify(previous)) return savedRows;
    chart.data = next;
    return next ?? savedRows;
  };

  const applyDatasets = ({ barData, pieData }: Partial<Datasets>) => {
    barRows = updateDataset(dynBar, barData, barRows);
    pieRows = updateDataset(dynPie, pieData, pieRows);
  };

  const editor2 = createLiveConfigEditor({
    title: 'Bar & Pie Live Datasets (Live)',
    assignPrefix: 'const datasets =',
    initialConfig: readDatasets(),
    hint: 'Add/remove items or set barData / pieData to null or [] to trigger empty states live.',
    onConfigChange: ({ barData, pieData }) => {
      for (const [name, dataset] of Object.entries({ barData, pieData })) {
        if (dataset != null && !Array.isArray(dataset)) throw new Error(`Set ${name} to an array or null.`);
      }
      applyDatasets({ barData, pieData });
    },
    onReset: () => {
      updatePreview({ barData: defaultBarRows, pieData: defaultPieRows });
    }
  });
  ex2.querySelector('#guide-dyn-ex2-code')!.appendChild(editor2.element);

  const updatePreview = (datasets: Partial<Datasets>) => {
    applyDatasets(datasets);
    editor2.syncConfig(readDatasets());
  };

  const barAdd = ex2.querySelector<HTMLButtonElement>('#btn-dyn-add')!;
  const barRemove = ex2.querySelector<HTMLButtonElement>('#btn-dyn-remove')!;
  const pieAdd = ex2.querySelector<HTMLButtonElement>('#btn-dyn-pie-add')!;
  const pieRemove = ex2.querySelector<HTMLButtonElement>('#btn-dyn-pie-remove')!;

  ex2.querySelector('#btn-dyn-randomize')!.addEventListener('click', () => {
    updatePreview({
      barData: barRows.map((row) => ({
        ...row,
        Cloud: Math.round(70 + Math.random() * 210),
        Edge: Math.round(45 + Math.random() * 145)
      })),
      pieData: pieRows.map((row) => ({ ...row, value: Math.round(90 + Math.random() * 420) }))
    });
  });

  barAdd.addEventListener('click', () => {
    const nextQuarter = {
      quarter: nextItemId('Q', barRows.map(row => row.quarter)),
      Cloud: Math.round(90 + Math.random() * 190),
      Edge: Math.round(55 + Math.random() * 130)
    };
    updatePreview({ barData: [...barRows, nextQuarter] });
  });

  barRemove.addEventListener('click', () => {
    if (barRows.length > 2) updatePreview({ barData: barRows.slice(0, -1) });
  });

  pieAdd.addEventListener('click', () => {
    const nextSlice = {
      id: nextItemId('Region ', pieRows.map(row => row.id)),
      value: Math.round(100 + Math.random() * 260)
    };
    updatePreview({ pieData: [...pieRows, nextSlice] });
  });

  pieRemove.addEventListener('click', () => {
    if (pieRows.length > 2) updatePreview({ pieData: pieRows.slice(0, -1) });
  });

  ex2.querySelector('#btn-dyn-empty')!.addEventListener('click', () => {
    const bothEmpty = dynBar.data === null && dynPie.data === null;
    updatePreview(bothEmpty
      ? { barData: barRows, pieData: pieRows }
      : { barData: null, pieData: null });
  });

  // Example 3: Batched Runtime Config Updates
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Batched Runtime Config Changes (<code>setConfig</code>) &amp; Resize</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Change palette, orientation, stacking, legend placement, and tooltip mode via the dropdowns or directly in the live config editor below.
        </p>
      </div>
    </div>
    <div class="guide-controls-row" style="flex-wrap:wrap;gap:12px;margin:0 0 12px;">
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        Palette:
        <select id="dyn-palette">
          <option value="shadcn">shadcn</option>
          <option value="material">material</option>
          <option value="bootstrap">bootstrap</option>
          <option value="antd">antd</option>
          <option value="neutral">Neutral (generated)</option>
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

  const batchedData = [
    { quarter: 'Q1', Cloud: 120, Edge: 85, AI: 64 },
    { quarter: 'Q2', Cloud: 158, Edge: 102, AI: 94 },
    { quarter: 'Q3', Cloud: 184, Edge: 118, AI: 128 },
    { quarter: 'Q4', Cloud: 226, Edge: 142, AI: 164 }
  ];

  const buildCfgBarConfig = () => {
    const palette = selPalette.value as any;
    const groupMode = selGroup.value as 'grouped' | 'stacked';
    const layout = selLayout.value as 'vertical' | 'horizontal';
    const legendPos = selLegend.value as LegendPosition;
    const tooltipPos = selTip.value as TooltipPositionMode;

    return {
      title: `Batched Update (${groupMode} · ${layout} · legend:${legendPos})`,
      palette,
      groupMode,
      layout,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge', 'AI'],
      borderRadius: 5,
      legend: { enabled: true, position: legendPos },
      tooltip: { position: tooltipPos },
      data: batchedData
    };
  };

  const applyCfgBar = (cfg: Record<string, any>) => {
    cfgBar.setConfig({
      autoSize: true,
      themeMode,
      margin: { top: 44, right: 24, bottom: 72, left: 56 },
      ...cfg
    });
  };

  const initialCfg3 = buildCfgBarConfig();
  applyCfgBar(initialCfg3);

  const editor3 = createLiveConfigEditor({
    title: 'Batched Runtime Config Updates (Live)',
    initialConfig: initialCfg3,
    hint: 'Edit palette, groupMode, layout, legend.position, tooltip.position, or data in a single batched setConfig().',
    onConfigChange: (nextCfg) => {
      if (['shadcn', 'material', 'bootstrap', 'antd', 'neutral'].includes(nextCfg.palette)) {
        selPalette.value = nextCfg.palette;
      }
      if (nextCfg.groupMode === 'grouped' || nextCfg.groupMode === 'stacked') {
        selGroup.value = nextCfg.groupMode;
      }
      if (nextCfg.layout === 'vertical' || nextCfg.layout === 'horizontal') {
        selLayout.value = nextCfg.layout;
      }
      if (['top', 'bottom', 'left', 'right'].includes(nextCfg.legend?.position)) {
        selLegend.value = nextCfg.legend.position;
      }
      if (nextCfg.tooltip?.position === 'item' || nextCfg.tooltip?.position === 'follow') {
        selTip.value = nextCfg.tooltip.position;
      }
      applyCfgBar(nextCfg);
    },
    onReset: () => {
      selPalette.value = 'shadcn';
      selGroup.value = 'grouped';
      selLayout.value = 'vertical';
      selLegend.value = 'bottom';
      selTip.value = 'item';
      const resetCfg = buildCfgBarConfig();
      applyCfgBar(resetCfg);
      editor3.syncConfig(resetCfg);
    }
  });
  cfgCodeHost.appendChild(editor3.element);

  [selPalette, selGroup, selLayout, selLegend, selTip].forEach((el) =>
    el.addEventListener('change', () => {
      const nextCfg = buildCfgBarConfig();
      applyCfgBar(nextCfg);
      editor3.syncConfig(nextCfg);
    })
  );

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
          <tr><td><strong>HTML Attributes vs. JS Properties</strong></td><td>Simple strings/booleans work via HTML attributes (<code>palette="bootstrap"</code>, <code>tooltip-position="item"</code>). Arrays, objects, and callbacks (<code>data</code>, <code>config</code>, <code>tooltip.formatter</code>) should always be passed via JS properties or <code>setConfig()</code> to avoid JSON serialization overhead.</td></tr>
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
