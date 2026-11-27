import { getGlobalPalette } from '../state/theme';
import type {
  BarDatum,
  GaugeDatum,
  HeatmapRow,
  HierarchyNode,
  LegendPosition,
  LineSeries,
  MCBaseChart,
  PieDatum,
  RadarDatum,
  SankeyData,
  ScatterSeries,
  ThemeModePreference,
  TooltipPositionMode
} from '../../../src/index';
import { createCodeBlock, createLiveConfigEditor, escapeHtml } from './shared';

const DYNAMIC_CHART_TAB_STORAGE_KEY = 'modern-charts-studio-dynamic-chart-tab';

type DynamicChartTabId =
  | 'bar'
  | 'pie'
  | 'line'
  | 'heatmap'
  | 'radar'
  | 'sunburst'
  | 'sankey'
  | 'scatter'
  | 'treemap'
  | 'gauge';

function readStoredDynamicChartTab(validIds: readonly DynamicChartTabId[]): DynamicChartTabId {
  try {
    const saved = localStorage.getItem(DYNAMIC_CHART_TAB_STORAGE_KEY) as DynamicChartTabId | null;
    if (saved && validIds.includes(saved)) return saved;
  } catch {
    // Use default when storage is unavailable
  }
  return 'bar';
}

function writeStoredDynamicChartTab(tabId: DynamicChartTabId): void {
  try {
    localStorage.setItem(DYNAMIC_CHART_TAB_STORAGE_KEY, tabId);
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

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

  // Example 2: Tabbed Dynamic Add, Remove, Randomize & Empty State Across All 10 Charts
  interface DynamicChartTabSpec<TData = any> {
    id: DynamicChartTabId;
    label: string;
    tag: string;
    itemSingular: string;
    createDefaultData: () => TData;
    createConfig: (data: TData) => Record<string, any>;
    randomize: (data: TData) => TData;
    addItem: (data: TData) => TData;
    removeItem: (data: TData) => TData;
    canRemove: (data: TData) => boolean;
  }

  const defaultBarRows = (): BarDatum[] => [
    { quarter: 'Q1', Cloud: 138, Edge: 84 },
    { quarter: 'Q2', Cloud: 172, Edge: 108 },
    { quarter: 'Q3', Cloud: 196, Edge: 124 },
    { quarter: 'Q4', Cloud: 234, Edge: 152 }
  ];

  const defaultPieRows = (): PieDatum[] => [
    { id: 'Compute', value: 420 },
    { id: 'Storage', value: 290 },
    { id: 'Network', value: 195 },
    { id: 'AI Ops', value: 310 }
  ];

  const defaultLineSeries = (): LineSeries[] => [
    {
      id: 'Cloud',
      data: [
        { x: 'Q1', y: 128 },
        { x: 'Q2', y: 164 },
        { x: 'Q3', y: 152 },
        { x: 'Q4', y: 214 }
      ]
    },
    {
      id: 'Edge',
      data: [
        { x: 'Q1', y: 82 },
        { x: 'Q2', y: 106 },
        { x: 'Q3', y: 128 },
        { x: 'Q4', y: 158 }
      ]
    }
  ];

  const defaultHeatmapRows = (): HeatmapRow[] => [
    {
      id: 'Mon',
      data: [
        { x: '00:00', y: 24 },
        { x: '08:00', y: 68 },
        { x: '16:00', y: 92 }
      ]
    },
    {
      id: 'Tue',
      data: [
        { x: '00:00', y: 31 },
        { x: '08:00', y: 74 },
        { x: '16:00', y: 88 }
      ]
    },
    {
      id: 'Wed',
      data: [
        { x: '00:00', y: 19 },
        { x: '08:00', y: 62 },
        { x: '16:00', y: 95 }
      ]
    }
  ];

  const defaultRadarRows = (): RadarDatum[] => [
    { metric: 'Speed', Modern: 92, Legacy: 58 },
    { metric: 'Safety', Modern: 88, Legacy: 64 },
    { metric: 'DX', Modern: 95, Legacy: 52 },
    { metric: 'Bundle', Modern: 90, Legacy: 61 }
  ];

  const defaultSunburstTree = (): HierarchyNode => ({
    name: 'Platform',
    children: [
      {
        name: 'Compute',
        children: [
          { name: 'GPU', value: 240 },
          { name: 'CPU', value: 180 }
        ]
      },
      {
        name: 'Storage',
        children: [
          { name: 'NVMe', value: 165 },
          { name: 'Object', value: 130 }
        ]
      }
    ]
  });

  const defaultSankeyData = (): SankeyData => ({
    nodes: [
      { id: 'Ingest', name: 'Ingest' },
      { id: 'Engine', name: 'Engine' },
      { id: 'SVG', name: 'SVG' },
      { id: 'Canvas', name: 'Canvas' }
    ],
    links: [
      { source: 'Ingest', target: 'Engine', value: 360 },
      { source: 'Engine', target: 'SVG', value: 220 },
      { source: 'Engine', target: 'Canvas', value: 140 }
    ]
  });

  const defaultScatterSeries = (): ScatterSeries[] => [
    {
      id: 'Cluster A',
      data: [
        { id: 'A1', x: 14, y: 78, size: 20, label: 'A1' },
        { id: 'A2', x: 28, y: 86, size: 26, label: 'A2' },
        { id: 'A3', x: 42, y: 92, size: 22, label: 'A3' }
      ]
    },
    {
      id: 'Cluster B',
      data: [
        { id: 'B1', x: 18, y: 54, size: 18, label: 'B1' },
        { id: 'B2', x: 34, y: 66, size: 24, label: 'B2' },
        { id: 'B3', x: 48, y: 72, size: 20, label: 'B3' }
      ]
    }
  ];

  const defaultTreemapTree = (): HierarchyNode => ({
    name: 'Clusters',
    children: [
      { name: 'US-East', value: 320 },
      { name: 'EU-West', value: 240 },
      { name: 'AP-South', value: 190 },
      { name: 'US-West', value: 260 }
    ]
  });

  const defaultGaugeSeries = (): GaugeDatum[] => [
    { label: 'Primary', value: 84, min: 0, max: 100, unit: '%' },
    { label: 'Replica', value: 62, min: 0, max: 100, unit: '%' }
  ];

  const CHART_TAB_SPECS: readonly DynamicChartTabSpec[] = [
    {
      id: 'bar',
      label: 'Bar',
      tag: 'mc-bar-chart',
      itemSingular: 'Quarter',
      createDefaultData: defaultBarRows,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Bar Dataset',
        indexBy: 'quarter',
        keys: ['Cloud', 'Edge'],
        borderRadius: 6,
        margin: { top: 44, right: 20, bottom: 70, left: 48 }
      }),
      randomize: (rows: BarDatum[]) =>
        rows.map((row) => ({
          ...row,
          Cloud: Math.round(70 + Math.random() * 210),
          Edge: Math.round(45 + Math.random() * 145)
        })),
      addItem: (rows: BarDatum[]) => [
        ...rows,
        {
          quarter: nextItemId('Q', rows.map((row) => row.quarter)),
          Cloud: Math.round(90 + Math.random() * 190),
          Edge: Math.round(55 + Math.random() * 130)
        }
      ],
      removeItem: (rows: BarDatum[]) => (rows.length > 2 ? rows.slice(0, -1) : rows),
      canRemove: (rows: BarDatum[]) => rows.length > 2
    },
    {
      id: 'pie',
      label: 'Pie',
      tag: 'mc-pie-chart',
      itemSingular: 'Slice',
      createDefaultData: defaultPieRows,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: 'material',
        title: 'Live Donut Dataset',
        innerRadius: 0.5
      }),
      randomize: (rows: PieDatum[]) =>
        rows.map((row) => ({ ...row, value: Math.round(90 + Math.random() * 420) })),
      addItem: (rows: PieDatum[]) => [
        ...rows,
        {
          id: nextItemId('Region ', rows.map((row) => row.id)),
          value: Math.round(100 + Math.random() * 260)
        }
      ],
      removeItem: (rows: PieDatum[]) => (rows.length > 2 ? rows.slice(0, -1) : rows),
      canRemove: (rows: PieDatum[]) => rows.length > 2
    },
    {
      id: 'line',
      label: 'Line',
      tag: 'mc-line-chart',
      itemSingular: 'Point',
      createDefaultData: defaultLineSeries,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Line Series',
        enableArea: true,
        areaOpacity: 0.14,
        curve: 'monotoneX',
        margin: { top: 44, right: 24, bottom: 70, left: 48 }
      }),
      randomize: (series: LineSeries[]) =>
        series.map((s) => ({
          ...s,
          data: s.data.map((pt) => ({
            ...pt,
            y: Math.round(65 + Math.random() * 185)
          }))
        })),
      addItem: (series: LineSeries[]) => {
        const nextX = nextItemId(
          'Q',
          (series[0]?.data ?? []).map((pt) => String(pt.x))
        );
        return series.map((s) => ({
          ...s,
          data: [
            ...s.data,
            { x: nextX, y: Math.round(75 + Math.random() * 175) }
          ]
        }));
      },
      removeItem: (series: LineSeries[]) =>
        (series[0]?.data.length ?? 0) > 2
          ? series.map((s) => ({ ...s, data: s.data.slice(0, -1) }))
          : series,
      canRemove: (series: LineSeries[]) => (series[0]?.data.length ?? 0) > 2
    },
    {
      id: 'heatmap',
      label: 'Heatmap',
      tag: 'mc-heatmap-chart',
      itemSingular: 'Row',
      createDefaultData: defaultHeatmapRows,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Heatmap Matrix',
        margin: { top: 44, right: 24, bottom: 70, left: 54 }
      }),
      randomize: (rows: HeatmapRow[]) =>
        rows.map((row) => ({
          ...row,
          data: row.data.map((cell) => ({
            ...cell,
            y: Math.round(15 + Math.random() * 85)
          }))
        })),
      addItem: (rows: HeatmapRow[]) => {
        const cols = (rows[0]?.data ?? []).map((cell) => cell.x);
        const nextRowId = nextItemId('Day ', rows.map((row) => row.id));
        return [
          ...rows,
          {
            id: nextRowId,
            data: cols.map((x) => ({ x, y: Math.round(15 + Math.random() * 85) }))
          }
        ];
      },
      removeItem: (rows: HeatmapRow[]) => (rows.length > 2 ? rows.slice(0, -1) : rows),
      canRemove: (rows: HeatmapRow[]) => rows.length > 2
    },
    {
      id: 'radar',
      label: 'Radar',
      tag: 'mc-radar-chart',
      itemSingular: 'Metric',
      createDefaultData: defaultRadarRows,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Radar Metrics',
        indexBy: 'metric',
        keys: ['Modern', 'Legacy'],
        maxValue: 100
      }),
      randomize: (rows: RadarDatum[]) =>
        rows.map((row) => ({
          ...row,
          Modern: Math.round(55 + Math.random() * 45),
          Legacy: Math.round(35 + Math.random() * 55)
        })),
      addItem: (rows: RadarDatum[]) => [
        ...rows,
        {
          metric: nextItemId('Axis ', rows.map((row) => row.metric)),
          Modern: Math.round(60 + Math.random() * 40),
          Legacy: Math.round(40 + Math.random() * 50)
        }
      ],
      removeItem: (rows: RadarDatum[]) => (rows.length > 3 ? rows.slice(0, -1) : rows),
      canRemove: (rows: RadarDatum[]) => rows.length > 3
    },
    {
      id: 'sunburst',
      label: 'Sunburst',
      tag: 'mc-sunburst-chart',
      itemSingular: 'Node',
      createDefaultData: defaultSunburstTree,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Sunburst Hierarchy'
      }),
      randomize: (tree: HierarchyNode) => ({
        ...tree,
        children: (tree.children ?? []).map((branch) =>
          branch.children?.length
            ? {
                ...branch,
                children: branch.children.map((leaf) => ({
                  ...leaf,
                  value: Math.round(85 + Math.random() * 240)
                }))
              }
            : { ...branch, value: Math.round(85 + Math.random() * 240) }
        )
      }),
      addItem: (tree: HierarchyNode) => {
        const branches = [...(tree.children ?? [])];
        const first = branches[0];
        if (!first) return tree;
        const leaves = [...(first.children ?? [])];
        const nextName = nextItemId('Node ', leaves.map((l) => l.name));
        branches[0] = {
          ...first,
          children: [...leaves, { name: nextName, value: Math.round(95 + Math.random() * 210) }]
        };
        return { ...tree, children: branches };
      },
      removeItem: (tree: HierarchyNode) => {
        const branches = [...(tree.children ?? [])];
        const first = branches[0];
        if (!first || (first.children?.length ?? 0) <= 1) return tree;
        branches[0] = {
          ...first,
          children: first.children!.slice(0, -1)
        };
        return { ...tree, children: branches };
      },
      canRemove: (tree: HierarchyNode) => ((tree.children?.[0]?.children?.length ?? 0) > 1)
    },
    {
      id: 'sankey',
      label: 'Sankey',
      tag: 'mc-sankey-chart',
      itemSingular: 'Node',
      createDefaultData: defaultSankeyData,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Sankey Flow',
        margin: { top: 44, right: 32, bottom: 32, left: 32 }
      }),
      randomize: (sankey: SankeyData) => {
        const links = sankey.links.map((link) =>
          link.source === 'Engine'
            ? { ...link, value: Math.round(90 + Math.random() * 220) }
            : link
        );
        const totalOut = links
          .filter((link) => link.source === 'Engine')
          .reduce((sum, link) => sum + link.value, 0);
        return {
          nodes: sankey.nodes.map((node) => ({ ...node })),
          links: links.map((link) =>
            link.source === 'Ingest' && link.target === 'Engine'
              ? { ...link, value: totalOut }
              : link
          )
        };
      },
      addItem: (sankey: SankeyData) => {
        const id = nextItemId('Out ', sankey.nodes.map((n) => n.id));
        const val = Math.round(90 + Math.random() * 180);
        const nextLinks = [
          ...sankey.links,
          { source: 'Engine', target: id, value: val }
        ];
        const totalOut = nextLinks
          .filter((l) => l.source === 'Engine')
          .reduce((sum, l) => sum + l.value, 0);
        return {
          nodes: [...sankey.nodes, { id, name: id }],
          links: nextLinks.map((l) =>
            l.source === 'Ingest' && l.target === 'Engine'
              ? { ...l, value: totalOut }
              : l
          )
        };
      },
      removeItem: (sankey: SankeyData) => {
        if (sankey.nodes.length <= 3) return sankey;
        const removedNode = sankey.nodes[sankey.nodes.length - 1];
        const remainingNodes = sankey.nodes.slice(0, -1);
        const remainingLinks = sankey.links.filter(
          (l) => l.target !== removedNode.id && l.source !== removedNode.id
        );
        const totalOut = remainingLinks
          .filter((l) => l.source === 'Engine')
          .reduce((sum, l) => sum + l.value, 0);
        return {
          nodes: remainingNodes,
          links: remainingLinks.map((l) =>
            l.source === 'Ingest' && l.target === 'Engine'
              ? { ...l, value: totalOut }
              : l
          )
        };
      },
      canRemove: (sankey: SankeyData) => sankey.nodes.length > 3
    },
    {
      id: 'scatter',
      label: 'Scatter',
      tag: 'mc-scatter-chart',
      itemSingular: 'Point',
      createDefaultData: defaultScatterSeries,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Scatter Clusters',
        margin: { top: 44, right: 24, bottom: 70, left: 48 }
      }),
      randomize: (series: ScatterSeries[]) =>
        series.map((s) => ({
          ...s,
          data: s.data.map((pt) => ({
            ...pt,
            x: Math.round(10 + Math.random() * 48),
            y: Math.round(45 + Math.random() * 52),
            size: Math.round(16 + Math.random() * 18)
          }))
        })),
      addItem: (series: ScatterSeries[]) =>
        series.map((s, idx) => {
          const prefix = idx === 0 ? 'A' : 'B';
          const id = nextItemId(
            prefix,
            s.data.map((pt) => pt.id ?? pt.label ?? '')
          );
          return {
            ...s,
            data: [
              ...s.data,
              {
                id,
                label: id,
                x: Math.round(12 + Math.random() * 46),
                y: Math.round(48 + Math.random() * 48),
                size: Math.round(16 + Math.random() * 18)
              }
            ]
          };
        }),
      removeItem: (series: ScatterSeries[]) =>
        (series[0]?.data.length ?? 0) > 2
          ? series.map((s) => ({ ...s, data: s.data.slice(0, -1) }))
          : series,
      canRemove: (series: ScatterSeries[]) => (series[0]?.data.length ?? 0) > 2
    },
    {
      id: 'treemap',
      label: 'Treemap',
      tag: 'mc-treemap-chart',
      itemSingular: 'Tile',
      createDefaultData: defaultTreemapTree,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Treemap Tiles'
      }),
      randomize: (tree: HierarchyNode) => ({
        ...tree,
        children: (tree.children ?? []).map((child) => ({
          ...child,
          value: Math.round(90 + Math.random() * 280)
        }))
      }),
      addItem: (tree: HierarchyNode) => {
        const children = [...(tree.children ?? [])];
        const nextName = nextItemId('Tile ', children.map((c) => c.name));
        return {
          ...tree,
          children: [
            ...children,
            { name: nextName, value: Math.round(100 + Math.random() * 230) }
          ]
        };
      },
      removeItem: (tree: HierarchyNode) =>
        (tree.children?.length ?? 0) > 2
          ? { ...tree, children: tree.children!.slice(0, -1) }
          : tree,
      canRemove: (tree: HierarchyNode) => (tree.children?.length ?? 0) > 2
    },
    {
      id: 'gauge',
      label: 'Gauge',
      tag: 'mc-gauge-chart',
      itemSingular: 'Arc',
      createDefaultData: defaultGaugeSeries,
      createConfig: (data) => ({
        data,
        autoSize: true,
        motionConfig: 'stiff',
        themeMode,
        palette: getGlobalPalette(),
        title: 'Live Multi-Arc Gauge'
      }),
      randomize: (series: GaugeDatum[]) =>
        series.map((item) => ({
          ...item,
          value: Math.round(20 + Math.random() * 78)
        })),
      addItem: (series: GaugeDatum[]) => {
        const nextLabel = nextItemId(
          'Node ',
          series.map((s) => s.label ?? '')
        );
        return [
          ...series,
          {
            label: nextLabel,
            value: Math.round(25 + Math.random() * 72),
            min: 0,
            max: 100,
            unit: '%'
          }
        ];
      },
      removeItem: (series: GaugeDatum[]) =>
        series.length > 1 ? series.slice(0, -1) : series,
      canRemove: (series: GaugeDatum[]) => series.length > 1
    }
  ];

  const validTabIds = CHART_TAB_SPECS.map((s) => s.id);
  let activeTabId: DynamicChartTabId = readStoredDynamicChartTab(validTabIds);

  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Dynamic Add, Remove, Randomize &amp; Empty State Across All 10 Charts</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Pick any chart type tab below and use the action buttons or live config editor to add items, remove items, randomize values, or toggle the empty state.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" id="btn-dyn-add">+ Add Quarter</button>
        <button type="button" id="btn-dyn-remove">− Remove Last Quarter</button>
        <button type="button" id="btn-dyn-randomize" class="btn-primary">🎲 Randomize Data</button>
        <button type="button" id="btn-dyn-empty">Toggle Empty (null)</button>
      </div>
    </div>
    <div class="overview-tablist" id="guide-dyn-tablist" role="tablist" focusgroup="tablist nomemory" aria-label="Dynamic dataset chart types"></div>
    <div class="guide-example-grid">
      <div class="overview-tabpanels" id="guide-dyn-tabpanels"></div>
      <div id="guide-dyn-ex2-code"></div>
    </div>
  `;
  container.appendChild(ex2);

  const tablistEl = ex2.querySelector<HTMLElement>('#guide-dyn-tablist')!;
  const tabpanelsEl = ex2.querySelector<HTMLElement>('#guide-dyn-tabpanels')!;
  const btnAdd = ex2.querySelector<HTMLButtonElement>('#btn-dyn-add')!;
  const btnRemove = ex2.querySelector<HTMLButtonElement>('#btn-dyn-remove')!;
  const btnRandomize = ex2.querySelector<HTMLButtonElement>('#btn-dyn-randomize')!;
  const btnEmpty = ex2.querySelector<HTMLButtonElement>('#btn-dyn-empty')!;

  interface MountedTabState {
    spec: DynamicChartTabSpec;
    btn: HTMLButtonElement;
    panel: HTMLElement;
    chart: MCBaseChart<any>;
    savedData: any;
  }

  const tabStates = new Map<DynamicChartTabId, MountedTabState>();

  for (const spec of CHART_TAB_SPECS) {
    const isSelected = spec.id === activeTabId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `dyn-tab-${spec.id}`;
    btn.className = 'overview-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(isSelected));
    btn.tabIndex = isSelected ? 0 : -1;
    btn.toggleAttribute('focusgroupstart', isSelected);
    btn.dataset.chartTab = spec.id;
    btn.textContent = spec.label;
    tablistEl.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'overview-tabpanel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', btn.id);
    if (!isSelected) {
      (panel as any).hidden = 'until-found';
    }

    const stage = document.createElement('div');
    stage.className = 'guide-chart-stage';
    stage.id = `guide-dyn-${spec.id}-chart`;
    panel.appendChild(stage);
    tabpanelsEl.appendChild(panel);

    const chart = document.createElement(spec.tag) as MCBaseChart<any>;
    const savedData = spec.createDefaultData();
    chart.setConfig(spec.createConfig(savedData));
    stage.appendChild(chart);
    mounted.push(chart);

    tabStates.set(spec.id, { spec, btn, panel, chart, savedData });
  }

  const getActiveState = (): MountedTabState => tabStates.get(activeTabId)!;

  const syncActionButtons = () => {
    const state = getActiveState();
    btnAdd.textContent = `+ Add ${state.spec.itemSingular}`;
    btnRemove.textContent = `− Remove Last ${state.spec.itemSingular}`;
    btnRemove.disabled = state.chart.data === null || !state.spec.canRemove(state.savedData);
  };

  const editor2 = createLiveConfigEditor({
    title: `${getActiveState().spec.label} Live Dataset (Live)`,
    assignPrefix: 'chart.config =',
    initialConfig: { data: getActiveState().chart.data },
    hint: 'Edit data items or set data: null / [] to preview empty state transitions on the active chart tab.',
    onConfigChange: ({ data }) => {
      const state = getActiveState();
      state.chart.data = data;
      if (data !== null && data !== undefined) {
        state.savedData = data;
      }
      syncActionButtons();
    },
    onReset: () => {
      const state = getActiveState();
      state.savedData = state.spec.createDefaultData();
      state.chart.data = state.savedData;
      syncActionButtons();
      editor2.syncConfig({ data: state.chart.data });
    }
  });
  ex2.querySelector('#guide-dyn-ex2-code')!.appendChild(editor2.element);
  syncActionButtons();

  const updateActiveChartData = (nextData: any) => {
    const state = getActiveState();
    if (nextData !== null && nextData !== undefined) {
      state.savedData = nextData;
    }
    state.chart.data = nextData;
    syncActionButtons();
    editor2.syncConfig(
      { data: state.chart.data },
      { title: `${state.spec.label} Live Dataset (Live)` }
    );
  };

  const selectDynamicTab = (nextId: DynamicChartTabId) => {
    if (!tabStates.has(nextId)) return;
    activeTabId = nextId;
    writeStoredDynamicChartTab(nextId);
    for (const [id, item] of tabStates.entries()) {
      const isSelected = id === nextId;
      item.btn.setAttribute('aria-selected', String(isSelected));
      item.btn.tabIndex = isSelected ? 0 : -1;
      item.btn.toggleAttribute('focusgroupstart', isSelected);
      if (isSelected) {
        item.panel.hidden = false;
      } else {
        (item.panel as any).hidden = 'until-found';
      }
    }
    const state = getActiveState();
    state.btn.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (typeof state.chart.render === 'function') {
      state.chart.render();
    }
    syncActionButtons();
    editor2.syncConfig(
      { data: state.chart.data },
      { title: `${state.spec.label} Live Dataset (Live)` }
    );
  };

  const tabListArray = Array.from(tabStates.values());
  tabListArray.forEach((item, idx) => {
    item.btn.addEventListener('click', () => {
      selectDynamicTab(item.spec.id);
    });
    item.btn.addEventListener('keydown', (e) => {
      let targetIdx: number | null = null;
      if (e.key === 'ArrowRight') {
        targetIdx = (idx + 1) % tabListArray.length;
      } else if (e.key === 'ArrowLeft') {
        targetIdx = (idx - 1 + tabListArray.length) % tabListArray.length;
      } else if (e.key === 'Home') {
        targetIdx = 0;
      } else if (e.key === 'End') {
        targetIdx = tabListArray.length - 1;
      }
      if (targetIdx !== null) {
        e.preventDefault();
        const target = tabListArray[targetIdx];
        target.btn.focus();
        selectDynamicTab(target.spec.id);
      }
    });
    item.panel.addEventListener('beforematch', () => {
      selectDynamicTab(item.spec.id);
    });
  });

  btnRandomize.addEventListener('click', () => {
    const state = getActiveState();
    updateActiveChartData(state.spec.randomize(state.savedData));
  });

  btnAdd.addEventListener('click', () => {
    const state = getActiveState();
    updateActiveChartData(state.spec.addItem(state.savedData));
  });

  btnRemove.addEventListener('click', () => {
    const state = getActiveState();
    if (state.spec.canRemove(state.savedData)) {
      updateActiveChartData(state.spec.removeItem(state.savedData));
    }
  });

  btnEmpty.addEventListener('click', () => {
    const state = getActiveState();
    updateActiveChartData(state.chart.data === null ? state.savedData : null);
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
