import type {
  LabelOverflowStrategy,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import { createLiveConfigEditor, escapeHtml } from './shared';

export function renderTruncationGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & API Reference
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Label Truncation, Rotation &amp; Overflow (<code>&lt;mc-truncate&gt;</code> &amp; <code>@chenglou/pretext</code>)</h2>
    <p class="guide-prose">
      Long category names, axis titles, chart headings, pie link labels, and legend items are measured via
      <code>@chenglou/pretext</code> with <strong>zero DOM layout reflow</strong>. Whenever text exceeds
      <code>maxWidth</code> (pixel width) or <code>maxChars</code> (grapheme-safe character count), it defaults to
      ellipsis truncation (<code>'truncate'</code>) and automatically reveals the full text in a tooltip on hover and
      keyboard <code>Tab</code> focus.
    </p>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Option / Attribute</th>
            <th>Type</th>
            <th>Default</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>strategy</code> / <code>label-overflow</code></td><td><code>'truncate' | 'rotate' | 'both' | 'wrap' | 'none'</code></td><td><code>'truncate'</code></td><td>Overflow behavior applied when <code>maxWidth</code> or <code>maxChars</code> is exceeded.</td></tr>
          <tr><td><code>maxWidth</code> / <code>max-width</code></td><td><code>number</code> (px)</td><td>Per-slot budget</td><td>Exact Pretext-measured pixel width threshold before overflow triggers.</td></tr>
          <tr><td><code>maxChars</code> / <code>max-chars</code></td><td><code>number</code></td><td>Unlimited</td><td>Grapheme-safe character threshold (via <code>Intl.Segmenter</code> — safe for emojis &amp; CJK).</td></tr>
          <tr><td><code>ellipsis</code></td><td><code>string</code></td><td><code>'…'</code></td><td>Suffix appended when truncating text.</td></tr>
          <tr><td><code>maxRotation</code> / <code>max-rotation</code></td><td><code>number</code> (deg)</td><td><code>45</code></td><td>Rotation angle for <code>'rotate'</code> and <code>'both'</code> strategies (supports negative angles like <code>-45</code>).</td></tr>
          <tr><td><code>enableTooltip</code> / <code>enable-tooltip</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Shows full untruncated text on hover &amp; keyboard focus; set <code>false</code> to explicitly disable.</td></tr>
          <tr><td><code>tooltip</code></td><td><code>boolean | TooltipConfig</code></td><td>Default solo tooltip</td><td>Customize truncated-label tooltip via <code>formatter</code>, <code>renderer</code>, or nested <code>&lt;mc-tooltip&gt;</code>.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Long Category Names — Strategy, Width, Chars, Ellipsis & Tooltip Playground
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Long Axis Categories, Rotation &amp; Full-Text Tooltips</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Hover or keyboard-<strong>Tab</strong> onto any truncated X-axis tick below to inspect the full label text.
          Use the controls or edit <code>data</code> and <code>label.overflow</code> directly in the live JSON editor.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:6px;">
        <button type="button" data-trunc-strat="truncate" class="btn-primary">truncate</button>
        <button type="button" data-trunc-strat="rotate">rotate</button>
        <button type="button" data-trunc-strat="both">both</button>
        <button type="button" data-trunc-strat="wrap">wrap</button>
        <button type="button" data-trunc-strat="none">none</button>
      </div>
    </div>
    <div class="guide-controls-row" style="flex-wrap:wrap;gap:14px;margin:0 0 12px;">
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxWidth</code>: <strong id="tr-mw-val">78px</strong>
        <input type="range" id="tr-mw-slider" min="48" max="160" step="2" value="78" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxChars</code>: <strong id="tr-mc-val">off</strong>
        <input type="range" id="tr-mc-slider" min="0" max="26" step="1" value="0" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxRotation</code>: <strong id="tr-rot-val">-45°</strong>
        <input type="range" id="tr-rot-slider" min="-90" max="90" step="5" value="-45" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>ellipsis</code>:
        <select id="tr-ellipsis-select" style="margin-left:4px;">
          <option value="…" selected>… (default)</option>
          <option value="...">...</option>
          <option value="→">→</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="tr-tip-toggle" checked />
        <code>enableTooltip</code>
      </label>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-trunc-chart-1"></div>
      <div id="guide-trunc-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-trunc-chart-1')!.appendChild(bar1);
  mounted.push(bar1);

  const code1 = ex1.querySelector('#guide-trunc-code-1') as HTMLElement;
  let strategy: LabelOverflowStrategy = 'truncate';
  let maxWidth = 78;
  let maxChars = 0;
  let maxRotation = -45;
  let ellipsis = '…';
  let enableTooltip = true;

  const longDeptData = [
    { dept: 'Global Cloud Platform Infrastructure', Spend: 245 },
    { dept: 'Applied Machine Learning Research', Spend: 210 },
    { dept: 'Enterprise Security & Compliance Ops', Spend: 162 },
    { dept: 'Developer Productivity & CI Tooling', Spend: 184 },
    { dept: 'Real-Time Data Streaming Pipelines', Spend: 198 }
  ];

  const stratBtns = Array.from(
    ex1.querySelectorAll<HTMLButtonElement>('[data-trunc-strat]')
  );
  const mwSlider = ex1.querySelector('#tr-mw-slider') as HTMLInputElement;
  const mwVal = ex1.querySelector('#tr-mw-val') as HTMLElement;
  const mcSlider = ex1.querySelector('#tr-mc-slider') as HTMLInputElement;
  const mcVal = ex1.querySelector('#tr-mc-val') as HTMLElement;
  const rotSlider = ex1.querySelector('#tr-rot-slider') as HTMLInputElement;
  const rotVal = ex1.querySelector('#tr-rot-val') as HTMLElement;
  const ellSelect = ex1.querySelector('#tr-ellipsis-select') as HTMLSelectElement;
  const tipToggle = ex1.querySelector('#tr-tip-toggle') as HTMLInputElement;

  const syncEx1Controls = () => {
    stratBtns.forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.truncStrat === strategy)
    );
    mwSlider.value = String(maxWidth);
    mwVal.textContent = `${maxWidth}px`;
    mcSlider.value = String(maxChars);
    mcVal.textContent = maxChars > 0 ? String(maxChars) : 'off';
    rotSlider.value = String(maxRotation);
    rotVal.textContent = `${maxRotation}°`;
    if (['…', '...', '→'].includes(ellipsis)) ellSelect.value = ellipsis;
    tipToggle.checked = enableTooltip;
  };

  const buildEx1Config = () => {
    const overflow: Record<string, any> = {
      strategy,
      maxWidth,
      ellipsis,
      maxRotation,
      enableTooltip
    };
    if (maxChars > 0) overflow.maxChars = maxChars;

    return {
      title: `Long Category Labels — strategy="${strategy}"`,
      indexBy: 'dept',
      keys: ['Spend'],
      data: longDeptData,
      label: {
        target: 'axis-tick',
        maxWidth,
        overflow
      }
    };
  };

  const applyEx1Config = (cfg: Record<string, any>) => {
    const strat = cfg.label?.overflow?.strategy ?? strategy;
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: 'shadcn',
      borderRadius: 6,
      margin: {
        top: 44,
        right: 24,
        bottom: strat === 'rotate' || strat === 'both' ? 114 : 74,
        left: 52
      },
      layers: ['grid', 'axes', 'bars', 'labels'],
      ...cfg
    });
  };

  const initialEx1Cfg = buildEx1Config();
  applyEx1Config(initialEx1Cfg);

  const editor1 = createLiveConfigEditor({
    title: 'Axis & Label Truncation Config (Live)',
    initialConfig: initialEx1Cfg,
    hint: 'Edit strategy, maxWidth, maxChars, ellipsis, maxRotation, or category strings live.',
    onConfigChange: (nextCfg) => {
      const ov = nextCfg.label?.overflow;
      if (ov) {
        if (ov.strategy) strategy = ov.strategy;
        if (typeof ov.maxWidth === 'number') maxWidth = ov.maxWidth;
        if (typeof ov.maxChars === 'number') maxChars = ov.maxChars;
        if (typeof ov.maxRotation === 'number') maxRotation = ov.maxRotation;
        if (typeof ov.ellipsis === 'string') ellipsis = ov.ellipsis;
        if (typeof ov.enableTooltip === 'boolean') enableTooltip = ov.enableTooltip;
        syncEx1Controls();
      }
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      strategy = 'truncate';
      maxWidth = 78;
      maxChars = 0;
      maxRotation = -45;
      ellipsis = '…';
      enableTooltip = true;
      syncEx1Controls();
      const resetCfg = buildEx1Config();
      applyEx1Config(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  code1.appendChild(editor1.element);

  const updateEx1FromControls = () => {
    syncEx1Controls();
    const nextCfg = buildEx1Config();
    applyEx1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  };

  stratBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      strategy = btn.dataset.truncStrat as LabelOverflowStrategy;
      updateEx1FromControls();
    });
  });
  mwSlider.addEventListener('input', () => {
    maxWidth = Number(mwSlider.value);
    updateEx1FromControls();
  });
  mcSlider.addEventListener('input', () => {
    maxChars = Number(mcSlider.value);
    updateEx1FromControls();
  });
  rotSlider.addEventListener('input', () => {
    maxRotation = Number(rotSlider.value);
    updateEx1FromControls();
  });
  ellSelect.addEventListener('change', () => {
    ellipsis = ellSelect.value;
    updateEx1FromControls();
  });
  tipToggle.addEventListener('change', () => {
    enableTooltip = tipToggle.checked;
    updateEx1FromControls();
  });

  // Example 2: Legend Truncation & Pie Arc Links
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Truncated Legends &amp; Pie Arc Links</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Set <code>legend.maxItemWidth</code> and <code>label.maxWidth</code> to bound long series names in legends and pie link labels —
          edit either value or segment names in the live JSON editor below.
        </p>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-trunc-chart-2"></div>
      <div id="guide-trunc-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const pie2 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-trunc-chart-2')!.appendChild(pie2);
  mounted.push(pie2);

  const initialPie2Cfg = {
    title: 'Truncated Pie Link Labels & Legend Items',
    palette: 'shadcn',
    innerRadius: 0.52,
    data: [
      { id: 'North America Cloud Infrastructure', value: 420 },
      { id: 'Europe Edge Analytics Platform', value: 315 },
      { id: 'Asia-Pacific Real-Time AI Inference', value: 268 },
      { id: 'Latin America Core Telemetry Mesh', value: 145 }
    ],
    legend: {
      enabled: true,
      position: 'bottom' as const,
      maxItemWidth: 105,
      enableTooltip: true
    },
    label: {
      target: 'arc-link' as const,
      maxWidth: 105,
      overflow: {
        strategy: 'truncate' as const,
        tooltip: {
          formatter: (p: any) =>
            `<strong>Full Segment:</strong> ${escapeHtml(String(p.title ?? ''))}`
        }
      }
    }
  };

  const applyPie2 = (cfg: Record<string, any>) => {
    pie2.setConfig({
      autoSize: true,
      themeMode,
      ...cfg
    });
  };
  applyPie2(initialPie2Cfg);

  const editor2 = createLiveConfigEditor({
    title: 'Legend & Pie Arc-Link Truncation Config (Live)',
    initialConfig: initialPie2Cfg,
    hint: 'Edit legend.maxItemWidth, label.maxWidth, legend.position, or segment names live.',
    onConfigChange: applyPie2
  });
  ex2.querySelector('#guide-trunc-code-2')!.appendChild(editor2.element);

  return mounted;
}
