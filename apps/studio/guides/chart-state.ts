import type {
  ChartStateChangeDetail,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import {
  createLiveConfigEditor,
  createLiveCssEditor,
  createLiveHtmlEditor
} from './shared';

export function renderChartStateGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Base animation helpers for custom loading dots in Example 2
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
          Toggle preset buttons or edit <code>loading</code>, <code>loadingText</code>, <code>emptyText</code>, and <code>data</code> directly in the live JSON editor.
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

  const buildEx1Config = (mode: 'ready' | 'loading' | 'empty' | 'custom-text') => ({
    title: 'Quarterly Revenue ($M)',
    loading: mode === 'loading' || mode === 'custom-text',
    loadingText: mode === 'custom-text' ? 'Fetching Q4 metrics…' : 'Loading…',
    emptyText: mode === 'custom-text' ? 'No metrics for selected range' : 'No data',
    data: mode === 'empty' ? [] : sampleBar
  });

  const applyEx1Config = (cfg: Record<string, any>) => {
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: 'shadcn',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      borderRadius: 6,
      ...cfg
    });
  };

  const syncEx1Buttons = (mode: string) => {
    ex1
      .querySelectorAll<HTMLButtonElement>('[data-cs-mode]')
      .forEach((b) => b.classList.toggle('btn-primary', b.dataset.csMode === mode));
  };

  const initialEx1Cfg = buildEx1Config('ready');
  applyEx1Config(initialEx1Cfg);

  const editor1 = createLiveConfigEditor({
    title: 'Loading, Empty & mc-state-change Config (Live)',
    initialConfig: initialEx1Cfg,
    hint: 'Set loading: true, change loadingText / emptyText, or clear data: [] to test state transitions live.',
    onConfigChange: (nextCfg) => {
      const inferredMode = nextCfg.loading
        ? nextCfg.loadingText && nextCfg.loadingText !== 'Loading…'
          ? 'custom-text'
          : 'loading'
        : !Array.isArray(nextCfg.data) || nextCfg.data.length === 0
        ? 'empty'
        : 'ready';
      syncEx1Buttons(inferredMode);
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      syncEx1Buttons('ready');
      const resetCfg = buildEx1Config('ready');
      applyEx1Config(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  ex1.querySelector('#cs-code-1')!.appendChild(editor1.element);

  ex1.querySelectorAll<HTMLButtonElement>('[data-cs-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.csMode as 'ready' | 'loading' | 'empty' | 'custom-text';
      syncEx1Buttons(mode);
      const nextCfg = buildEx1Config(mode);
      applyEx1Config(nextCfg);
      editor1.syncConfig(nextCfg);
    });
  });

  // Example 2: Custom Slots (slot="loading" and slot="empty") — Live Declarative HTML Editor
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.style.minWidth = '0';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Custom <code>slot="loading"</code> &amp; <code>slot="empty"</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Edit the declarative <code>slot="loading"</code> and <code>slot="empty"</code> HTML directly on the right (or toggle the state buttons) to update the chart overlay live.
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

  let activeSlotMode: 'loading' | 'empty' | 'ready' = 'loading';

  const buildEx2Markup = (mode: 'loading' | 'empty' | 'ready') => `<mc-line-chart${
    mode === 'loading' ? ' loading' : ''
  }>
  <div slot="loading" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
    <div class="cs-custom-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    <strong style="font-size:0.86rem;">Syncing telemetry stream…</strong>
  </div>
  <div slot="empty" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
    <div style="font-size:0.86rem;font-weight:600;">Nothing to show for this date range</div>
    <button type="button" data-cs-restore="true" class="btn-primary" style="font-size:0.78rem;">Restore Sample Data</button>
  </div>
</mc-line-chart>`;

  const syncSlotButtons = (mode: 'loading' | 'empty' | 'ready') => {
    ex2
      .querySelectorAll<HTMLButtonElement>('[data-slot-mode]')
      .forEach((b) =>
        b.classList.toggle('btn-primary', b.dataset.slotMode === mode)
      );
  };

  const applyEx2State = (mode: 'loading' | 'empty' | 'ready') => {
    activeSlotMode = mode;
    syncSlotButtons(mode);
    line2.setConfig({
      data: mode === 'empty' ? [{ id: 'Requests/s', data: [] }] : sampleLine,
      loading: mode === 'loading',
      autoSize: true,
      themeMode,
      palette: 'bootstrap',
      title: 'API Throughput (Custom Slots)',
      enableArea: true,
      areaOpacity: 0.16
    });
  };

  const editor2 = createLiveHtmlEditor({
    title: 'Custom loading & empty Slots (Live)',
    chartTag: 'mc-line-chart',
    initialMarkup: buildEx2Markup('loading'),
    hint: 'Edit the loading/empty slot text, styles, or toggle the loading attribute on <mc-line-chart>.',
    onMarkupApply: ({ chartAttrs, children }) => {
      line2.replaceChildren(...children);
      line2
        .querySelector('[data-cs-restore]')
        ?.addEventListener('click', () => {
          applyEx2State('ready');
          editor2.setValue(buildEx2Markup('ready'));
        });

      const hasLoadingAttr =
        'loading' in chartAttrs && chartAttrs.loading !== 'false';
      const nextMode: 'loading' | 'empty' | 'ready' = hasLoadingAttr
        ? 'loading'
        : activeSlotMode === 'empty'
        ? 'empty'
        : 'ready';
      applyEx2State(nextMode);
    },
    onReset: () => {
      const markup = buildEx2Markup('loading');
      editor2.setValue(markup);
      editor2.applyCurrent();
    }
  });
  editor2.applyCurrent();
  ex2.querySelector('#cs-code-2')!.appendChild(editor2.element);

  ex2.querySelectorAll<HTMLButtonElement>('[data-slot-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.slotMode as 'loading' | 'empty' | 'ready';
      applyEx2State(mode);
      editor2.setValue(buildEx2Markup(mode));
    });
  });

  // Example 3: Live CSS ::part() & --mc-state-* Custom Properties
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.style.minWidth = '0';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Styling via CSS <code>::part()</code> &amp; <code>--mc-state-*</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Pick a preset or edit any <code>--mc-state-*</code> variable and <code>::part(state*)</code> rule on the right to restyle the overlay live.
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
  pie3.classList.add('cs-live-target');
  ex3.querySelector('#cs-chart-3')!.appendChild(pie3);
  mounted.push(pie3);

  const samplePie = [
    { id: 'Compute', value: 420 },
    { id: 'Storage', value: 290 },
    { id: 'Network', value: 185 }
  ];

  const cssPresets: Record<string, string> = {
    default: `/* Default chart state overlay tokens */
mc-pie-chart {
  --mc-state-spinner-size: 24px;
}

mc-pie-chart::part(state-message) {
  font-weight: 500;
}`,
    glass: `mc-pie-chart {
  --mc-state-bg: rgba(30, 27, 75, 0.78);
  --mc-state-color: #e0e7ff;
  --mc-state-font: 600 13px/1.4 system-ui, sans-serif;
  --mc-state-spinner-color: #a78bfa;
  --mc-state-spinner-size: 32px;
}

mc-pie-chart::part(state) {
  backdrop-filter: blur(6px);
  border-radius: 12px;
}

mc-pie-chart::part(state-message) {
  letter-spacing: 0.02em;
}`,
    amber: `mc-pie-chart {
  --mc-state-bg: rgba(254, 243, 199, 0.92);
  --mc-state-color: #92400e;
  --mc-state-spinner-color: #d97706;
  --mc-state-spinner-size: 28px;
}

mc-pie-chart::part(state-message) {
  font-weight: 700;
}`
  };

  let activeCssPreset = 'glass';

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
      palette: 'shadcn',
      title: 'Cloud Spend Share',
      innerRadius: 0.54
    });
  };
  applyEx3();

  selState3.addEventListener('change', applyEx3);

  const cssEditor3 = createLiveCssEditor({
    title: 'CSS ::part() & --mc-state-* Styling (Live)',
    scopeKey: 'guide-chart-state-ex3-css',
    hostSelector: 'mc-pie-chart',
    scopedSelector: 'mc-pie-chart.cs-live-target',
    initialCss: cssPresets[activeCssPreset],
    hint: 'Edit --mc-state-bg, --mc-state-spinner-color, --mc-state-spinner-size, or ::part(state*) live.',
    onReset: () => {
      cssEditor3.setValue(cssPresets[activeCssPreset]);
      cssEditor3.applyCurrent();
    }
  });
  ex3.querySelector('#cs-code-3')!.appendChild(cssEditor3.element);

  ex3.querySelectorAll<HTMLButtonElement>('[data-cs-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCssPreset = btn.dataset.csPreset!;
      ex3
        .querySelectorAll<HTMLButtonElement>('[data-cs-preset]')
        .forEach((b) =>
          b.classList.toggle('btn-primary', b.dataset.csPreset === activeCssPreset)
        );
      cssEditor3.setValue(cssPresets[activeCssPreset]);
      cssEditor3.applyCurrent();
    });
  });

  return mounted;
}
