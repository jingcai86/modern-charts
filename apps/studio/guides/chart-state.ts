import type {
  ChartStateChangeDetail,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderChartStateGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Scoped demo styles showcasing ::part() and --mc-state-* custom properties
  const demoStyle = document.createElement('style');
  demoStyle.textContent = `
    .cs-custom-dots {
      display: inline-flex;
      gap: 6px;
      margin-bottom: 4px;
    }
    .cs-custom-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      animation: cs-bounce 0.9s infinite ease-in-out;
    }
    .cs-custom-dots span:nth-child(2) { animation-delay: 0.15s; }
    .cs-custom-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes cs-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }
      40% { transform: scale(1); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cs-custom-dots span { animation: none; opacity: 0.8; }
    }

    mc-pie-chart.cs-preset-glass {
      --mc-state-bg: rgba(30, 27, 75, 0.78);
      --mc-state-color: #e0e7ff;
      --mc-state-spinner-color: #a78bfa;
      --mc-state-spinner-size: 32px;
      --mc-state-font: 600 13px/1.4 ui-sans-serif, system-ui, sans-serif;
    }
    mc-pie-chart.cs-preset-glass::part(state) {
      backdrop-filter: blur(6px);
      border-radius: 12px;
    }
    mc-pie-chart.cs-preset-glass::part(state-message) {
      letter-spacing: 0.02em;
    }

    mc-pie-chart.cs-preset-amber {
      --mc-state-bg: rgba(254, 243, 199, 0.92);
      --mc-state-color: #92400e;
      --mc-state-spinner-color: #d97706;
      --mc-state-spinner-size: 28px;
    }
    mc-pie-chart.cs-preset-amber::part(state-message) {
      font-weight: 700;
    }

    .cs-example-grid {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    }
    @media (max-width: 1024px) {
      .cs-example-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;
  container.appendChild(demoStyle);

  // Intro & Compact Reference
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.style.minWidth = '0';
  intro.innerHTML = `
    <h2 class="panel-title">Shared Loading &amp; Empty States (<code>&lt;mc-chart-state&gt;</code>)</h2>
    <p class="guide-prose">
      All 10 chart components mount a single minimal <code>&lt;mc-chart-state&gt;</code> element inside their Shadow DOM.
      When the chart is <code>ready</code>, it stays hidden via the <code>hidden</code> attribute with zero animation or
      layout overhead. Toggle <code>loading</code> at any time, let empty datasets (<code>[]</code>, <code>null</code>,
      or non-plottable data) trigger automatically, and customize via <strong>slots</strong>, <strong>CSS <code>::part()</code></strong>,
      or <strong><code>--mc-state-*</code> custom properties</strong>.
    </p>
    <div class="guide-table-wrap" style="max-width:100%;overflow-x:auto;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Surface</th>
            <th>API / Selector</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Chart API</strong></td><td><code>loading</code>, <code>config.loadingText</code>, <code>config.emptyText</code></td><td>Boolean attr/prop sets loading (sets <code>aria-busy="true"</code>). Defaults: <code>"Loading…"</code> / <code>"No data"</code>.</td></tr>
          <tr><td><strong>Event</strong></td><td><code>mc-state-change</code></td><td>Composed event emitting <code>{ state: 'loading' | 'empty' | 'ready', previousState, chartType }</code>.</td></tr>
          <tr><td><strong>Slots</strong></td><td><code>slot="loading"</code>, <code>slot="empty"</code></td><td>Replaces default spinner/icon and text inside the chart's <code>&lt;mc-chart-state&gt;</code>.</td></tr>
          <tr><td><strong>CSS Parts</strong></td><td><code>::part(state)</code>, <code>::part(state-indicator)</code>, <code>::part(state-message)</code></td><td>Exported via <code>exportparts</code> on every <code>&lt;mc-*-chart&gt;</code>. Overlay has <code>role="status"</code> &amp; <code>aria-live="polite"</code>.</td></tr>
          <tr><td><strong>CSS Variables</strong></td><td><code>--mc-state-bg</code>, <code>--mc-state-color</code>, <code>--mc-state-font</code>, <code>--mc-state-spinner-color</code>, <code>--mc-state-spinner-size</code></td><td>Pure CSS spinner automatically pauses when hidden and respects <code>prefers-reduced-motion</code>.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Default Loading, Automatic Empty & mc-state-change
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.style.minWidth = '0';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: State Transitions &amp; <code>mc-state-change</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Toggle between <code>ready</code>, <code>loading</code>, automatic <code>empty</code> (<code>data = []</code>),
          and custom text overrides.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" data-cs-mode="ready" class="btn-primary">Ready</button>
        <button type="button" data-cs-mode="loading">Loading</button>
        <button type="button" data-cs-mode="empty">Empty ([])</button>
        <button type="button" data-cs-mode="custom-text">Custom Text</button>
        <span id="cs-event-badge" class="comp-pill">state: ready · aria-busy: false</span>
      </div>
    </div>
    <div class="guide-example-grid cs-example-grid">
      <div class="guide-chart-stage" id="cs-chart-1" style="min-width:0;"></div>
      <div id="cs-code-1" style="min-width:0;"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  const badge1 = ex1.querySelector('#cs-event-badge') as HTMLElement;
  bar1.addEventListener('mc-state-change', (e: Event) => {
    const detail = (e as CustomEvent<ChartStateChangeDetail>).detail;
    const busy = bar1.getAttribute('aria-busy') === 'true';
    badge1.textContent = `mc-state-change → ${detail.state} · aria-busy: ${busy}`;
  });
  ex1.querySelector('#cs-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const sampleBar = [
    { quarter: 'Q1', Cloud: 132, Edge: 84 },
    { quarter: 'Q2', Cloud: 168, Edge: 102 },
    { quarter: 'Q3', Cloud: 194, Edge: 126 },
    { quarter: 'Q4', Cloud: 228, Edge: 148 }
  ];

  const applyEx1 = (mode: 'ready' | 'loading' | 'empty' | 'custom-text') => {
    ex1.querySelectorAll<HTMLButtonElement>('[data-cs-mode]').forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.csMode === mode)
    );
    bar1.setConfig({
      data: mode === 'empty' ? [] : sampleBar,
      loading: mode === 'loading' || mode === 'custom-text',
      loadingText:
        mode === 'custom-text' ? 'Fetching Q4 metrics…' : undefined,
      emptyText:
        mode === 'custom-text' ? 'No metrics for selected range' : undefined,
      autoSize: true,
      themeMode,
      palette: 'modern',
      title: 'Quarterly Revenue ($M)',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      borderRadius: 6
    });
  };
  applyEx1('ready');

  ex1.querySelectorAll<HTMLButtonElement>('[data-cs-mode]').forEach((btn) => {
    btn.addEventListener('click', () =>
      applyEx1(btn.dataset.csMode as 'ready' | 'loading' | 'empty' | 'custom-text')
    );
  });

  ex1.querySelector('#cs-code-1')!.appendChild(
    createCodeBlock(
      `
// Toggle loading state or assign empty data:
chart.loading = true; // sets aria-busy="true", shows "Loading…"
chart.config = {
  data: [],
  loading: false,
  loadingText: 'Fetching Q4 metrics…',
  emptyText: 'No data'
};

// Listen for composed state transitions:
chart.addEventListener('mc-state-change', (e) => {
  console.log(e.detail.state); // 'loading' | 'empty' | 'ready'
});
      `,
      'Loading, Empty & mc-state-change'
    )
  );

  // Example 2: Custom Slots (slot="loading" and slot="empty")
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.style.minWidth = '0';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Custom <code>slot="loading"</code> &amp; <code>slot="empty"</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Provide light DOM children with <code>slot="loading"</code> or <code>slot="empty"</code> to replace the default
          content with custom spinners, illustrations, or action buttons.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" data-slot-mode="loading" class="btn-primary">Loading Slot</button>
        <button type="button" data-slot-mode="empty">Empty Slot</button>
        <button type="button" data-slot-mode="ready">Ready</button>
      </div>
    </div>
    <div class="guide-example-grid cs-example-grid">
      <div class="guide-chart-stage" id="cs-chart-2" style="min-width:0;"></div>
      <div id="cs-code-2" style="min-width:0;"></div>
    </div>
  `;
  container.appendChild(ex2);

  const line2 = document.createElement('mc-line-chart') as MCBaseChart<any>;
  const loadingSlotEl = document.createElement('div');
  loadingSlotEl.setAttribute('slot', 'loading');
  loadingSlotEl.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:6px;';
  loadingSlotEl.innerHTML = `
    <div class="cs-custom-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    <strong style="font-size:0.86rem;">Syncing telemetry stream…</strong>
  `;

  const emptySlotEl = document.createElement('div');
  emptySlotEl.setAttribute('slot', 'empty');
  emptySlotEl.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:8px;';
  emptySlotEl.innerHTML = `
    <div style="font-size:0.86rem;font-weight:600;">Nothing to show for this date range</div>
    <button type="button" id="cs-restore-btn" class="btn-primary" style="font-size:0.78rem;">Restore Sample Data</button>
  `;

  line2.appendChild(loadingSlotEl);
  line2.appendChild(emptySlotEl);
  ex2.querySelector('#cs-chart-2')!.appendChild(line2);
  mounted.push(line2);

  const sampleLine = [
    {
      id: 'Requests/s',
      data: [
        { x: 'Mon', y: 420 },
        { x: 'Tue', y: 510 },
        { x: 'Wed', y: 485 },
        { x: 'Thu', y: 630 },
        { x: 'Fri', y: 590 }
      ]
    }
  ];

  const applyEx2 = (mode: 'loading' | 'empty' | 'ready') => {
    ex2.querySelectorAll<HTMLButtonElement>('[data-slot-mode]').forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.slotMode === mode)
    );
    line2.setConfig({
      data: mode === 'empty' ? [{ id: 'Requests/s', data: [] }] : sampleLine,
      loading: mode === 'loading',
      autoSize: true,
      themeMode,
      palette: 'ocean',
      title: 'API Throughput (Custom Slots)',
      enableArea: true,
      areaOpacity: 0.16
    });
  };
  applyEx2('loading');

  ex2.querySelectorAll<HTMLButtonElement>('[data-slot-mode]').forEach((btn) => {
    btn.addEventListener('click', () =>
      applyEx2(btn.dataset.slotMode as 'loading' | 'empty' | 'ready')
    );
  });
  emptySlotEl
    .querySelector('#cs-restore-btn')!
    .addEventListener('click', () => applyEx2('ready'));

  ex2.querySelector('#cs-code-2')!.appendChild(
    createCodeBlock(
      `
<mc-line-chart loading>
  <div slot="loading">
    <my-spinner></my-spinner>
    <span>Syncing telemetry stream…</span>
  </div>
  <div slot="empty">
    <p>Nothing to show for this date range</p>
    <button onclick="restoreData()">Restore Sample Data</button>
  </div>
</mc-line-chart>
      `,
      'Custom loading & empty Slots'
    )
  );

  // Example 3: CSS ::part() & --mc-state-* Custom Properties
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.style.minWidth = '0';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Styling via CSS <code>::part()</code> &amp; <code>--mc-state-*</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Customize overlay surface, spinner color/size, and typography without touching Shadow DOM internals.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" data-cs-preset="default">Default</button>
        <button type="button" data-cs-preset="glass" class="btn-primary">Indigo Glass</button>
        <button type="button" data-cs-preset="amber">Warm Amber</button>
        <select id="cs-preset-state" aria-label="Example 3 state">
          <option value="loading" selected>state: loading</option>
          <option value="empty">state: empty</option>
          <option value="ready">state: ready</option>
        </select>
      </div>
    </div>
    <div class="guide-example-grid cs-example-grid">
      <div class="guide-chart-stage" id="cs-chart-3" style="min-width:0;"></div>
      <div id="cs-code-3" style="min-width:0;"></div>
    </div>
  `;
  container.appendChild(ex3);

  const pie3 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  pie3.classList.add('cs-preset-glass');
  ex3.querySelector('#cs-chart-3')!.appendChild(pie3);
  mounted.push(pie3);

  const samplePie = [
    { id: 'Compute', value: 420 },
    { id: 'Storage', value: 290 },
    { id: 'Network', value: 185 }
  ];

  const selState3 = ex3.querySelector('#cs-preset-state') as HTMLSelectElement;
  const applyEx3 = () => {
    const st = selState3.value as 'loading' | 'empty' | 'ready';
    pie3.setConfig({
      data: st === 'empty' ? [] : samplePie,
      loading: st === 'loading',
      loadingText: 'Calculating cost breakdown…',
      emptyText: 'No billing records found',
      autoSize: true,
      themeMode,
      palette: 'emerald',
      title: 'Cloud Spend Share',
      innerRadius: 0.54
    });
  };
  applyEx3();

  selState3.addEventListener('change', applyEx3);
  ex3.querySelectorAll<HTMLButtonElement>('[data-cs-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.csPreset!;
      ex3
        .querySelectorAll<HTMLButtonElement>('[data-cs-preset]')
        .forEach((b) =>
          b.classList.toggle('btn-primary', b.dataset.csPreset === preset)
        );
      pie3.classList.remove('cs-preset-glass', 'cs-preset-amber');
      if (preset === 'glass') pie3.classList.add('cs-preset-glass');
      if (preset === 'amber') pie3.classList.add('cs-preset-amber');
    });
  });

  ex3.querySelector('#cs-code-3')!.appendChild(
    createCodeBlock(
      `
mc-pie-chart {
  --mc-state-bg: rgba(30, 27, 75, 0.78);
  --mc-state-color: #e0e7ff;
  --mc-state-font: 600 13px/1.4 system-ui, sans-serif;
  --mc-state-spinner-color: #a78bfa;
  --mc-state-spinner-size: 32px;
}

mc-pie-chart::part(state) {
  backdrop-filter: blur(6px);
}
mc-pie-chart::part(state-indicator) {
  /* targets spinner (loading) or icon (empty) */
}
mc-pie-chart::part(state-message) {
  letter-spacing: 0.02em;
}
      `,
      'CSS ::part() & --mc-state-* Styling'
    )
  );

  return mounted;
}
