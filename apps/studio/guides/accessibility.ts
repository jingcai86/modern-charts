import { getGlobalPalette } from '../state/theme';
import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createLiveConfigEditor } from './shared';

export function renderAccessibilityGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro: W3C ARIA, Accessibility & Static Charts Overview
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Accessibility, W3C ARIA &amp; Static Charts (<code>&lt;mc-aria-layer&gt;</code> &amp; <code>isInteractive</code>)</h2>
    <p class="guide-prose">
      Every chart in <code>modern-charts</code> ships with accessible SVG landmarks, customizable screen-reader
      labels, full keyboard navigation (<code>Tab</code>, Arrow keys, <code>Home</code>/<code>End</code>, <code>Enter</code>/<code>Space</code>),
      automatic <code>prefers-reduced-motion</code> support, and a visually hidden semantic HTML <code>&lt;table&gt;</code>
      fallback — plus a dedicated <code>isInteractive</code> master switch for fully static charts.
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. Roles &amp; Screen-Reader Labels</h3>
        <p>The SVG root uses <code>role="img"</code> wired via <code>&lt;title&gt;</code>, <code>&lt;desc&gt;</code>, and <code>aria-label</code>. Interactive items receive <code>role="graphics-symbol"</code> and customizable accessors (<code>barAriaLabel</code>, <code>arcAriaLabel</code>, <code>pointAriaLabel</code>).</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Keyboard Navigation &amp; Announcements</h3>
        <p>When <code>isInteractive: true</code> and <code>isFocusable: true</code> (default), every data item receives <code>tabindex="0"</code>, roving <code>Arrow</code>/<code>Home</code>/<code>End</code> navigation, item-anchored focus tooltips, and polite <code>aria-live="polite"</code> announcements.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Reduced Motion &amp; Data-Table Fallback</h3>
        <p>Entry and layer animations respect <code>prefers-reduced-motion: reduce</code> automatically. <code>aria.includeDataTable: true</code> (default) exposes a visually hidden semantic <code>&lt;table&gt;</code> of all chart items for assistive tech.</p>
      </div>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Live Keyboard Focus, Screen-Reader Announcement & Data-Table Fallback Preview
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Keyboard Navigation, Live Screen-Reader Output &amp; Data-Table Fallback</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Click inside the chart and press <strong>Tab</strong> + <strong>Arrow</strong> keys — or edit <code>aria</code>,
          <code>ariaLabel</code>, <code>isFocusable</code>, <code>animate</code>, and <code>data</code> directly in the live config editor.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:12px;">
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="a11y-focusable-chk" checked />
          <code>isFocusable</code>
        </label>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="a11y-table-chk" checked />
          <code>aria.includeDataTable</code>
        </label>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="a11y-reduced-chk" />
          Simulate Reduced Motion (<code>animate: false</code>)
        </label>
      </div>
    </div>

    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-a11y-chart-1"></div>
      <div id="guide-a11y-code-1"></div>
    </div>

    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Screen-Reader Live Region (<code>role="status" aria-live="polite"</code>):</div>
      <div class="inspector-readout" id="a11y-live-preview">
        Press Tab onto the bars above to see live screen-reader announcements...
      </div>
    </div>

    <details style="margin-top:10px;border:1px solid var(--border-subtle);border-radius:10px;padding:10px 14px;background:var(--bg-code);">
      <summary style="cursor:pointer;font-size:0.82rem;font-weight:600;color:var(--pill-cyan-fg);">
        Inspect Generated Accessible HTML Data Table Fallback (<code>.mc-aria-table-container</code>)
      </summary>
      <div id="a11y-table-preview" style="margin-top:10px;overflow-x:auto;font-size:0.82rem;"></div>
    </details>
  `;
  container.appendChild(ex1);

  const bar = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-a11y-chart-1')!.appendChild(bar);
  mounted.push(bar);

  const chkA11yFocusable = ex1.querySelector('#a11y-focusable-chk') as HTMLInputElement;
  const chkTable = ex1.querySelector('#a11y-table-chk') as HTMLInputElement;
  const chkReduced = ex1.querySelector('#a11y-reduced-chk') as HTMLInputElement;
  const livePreview = ex1.querySelector('#a11y-live-preview') as HTMLElement;
  const tablePreview = ex1.querySelector('#a11y-table-preview') as HTMLElement;
  const code1 = ex1.querySelector('#guide-a11y-code-1') as HTMLElement;

  const sampleData = [
    { quarter: 'Q1', Cloud: 142, Edge: 88 },
    { quarter: 'Q2', Cloud: 176, Edge: 112 },
    { quarter: 'Q3', Cloud: 198, Edge: 126 },
    { quarter: 'Q4', Cloud: 244, Edge: 158 }
  ];

  const barAriaLabelFn = (item: any) =>
    `${item.seriesId} revenue in ${item.category}: $${item.value}M (${item.index + 1} of ${item.total})`;

  bar.addEventListener('mc-aria-focus', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    livePreview.textContent = `Announced: "${d.label}${
      d.description ? `. ${d.description}` : ''
    }" (tabindex="0", role="graphics-symbol")`;
  });

  bar.addEventListener('mc-item-activate', (e: Event) => {
    const d = (e as CustomEvent).detail ?? {};
    livePreview.textContent = `Activated via keyboard: "${d.label}"`;
  });

  const buildA11yConfig = () => ({
    title: 'Quarterly Revenue (Keyboard & Screen-Reader Ready)',
    ariaLabel: 'Quarterly Cloud and Edge revenue comparison',
    isFocusable: chkA11yFocusable.checked,
    animate: !chkReduced.checked,
    barAriaLabel: barAriaLabelFn,
    aria: {
      description:
        'Grouped bar chart comparing Cloud and Edge revenue from Q1 to Q4.',
      includeDataTable: chkTable.checked,
      announceOnFocus: true
    },
    data: sampleData
  });

  const syncDataTablePreview = () => {
    const generatedTable = bar.shadowRoot?.querySelector(
      '.mc-aria-table-container table'
    );
    if (generatedTable) {
      tablePreview.replaceChildren(generatedTable.cloneNode(true));
    } else {
      const p = document.createElement('p');
      p.style.cssText = 'color:var(--text-muted);margin:0;';
      p.textContent = 'Data table fallback disabled (aria.includeDataTable: false).';
      tablePreview.replaceChildren(p);
    }
  };

  const applyA11yConfig = (cfg: Record<string, any>) => {
    bar.setConfig({
      autoSize: true,
      themeMode,
      palette: 'bootstrap',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 72, left: 52 },
      layers: ['grid', 'axes', 'bars', 'labels', 'legends'],
      ...cfg
    });
    syncDataTablePreview();
  };

  const initialA11yCfg = buildA11yConfig();
  applyA11yConfig(initialA11yCfg);

  const editor1 = createLiveConfigEditor({
    title: 'W3C ARIA, Keyboard Focus & Data-Table Config (Live)',
    initialConfig: initialA11yCfg,
    hint: 'Edit ariaLabel, isFocusable, animate, aria.includeDataTable, or data — the generated table updates live.',
    onConfigChange: (nextCfg) => {
      if (typeof nextCfg.isFocusable === 'boolean') {
        chkA11yFocusable.checked = nextCfg.isFocusable;
      }
      if (typeof nextCfg.animate === 'boolean') {
        chkReduced.checked = !nextCfg.animate;
      }
      if (typeof nextCfg.aria?.includeDataTable === 'boolean') {
        chkTable.checked = nextCfg.aria.includeDataTable;
      }
      applyA11yConfig(nextCfg);
    },
    onReset: () => {
      chkA11yFocusable.checked = true;
      chkTable.checked = true;
      chkReduced.checked = false;
      const resetCfg = buildA11yConfig();
      applyA11yConfig(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  code1.appendChild(editor1.element);

  const updateA11yFromControls = () => {
    const nextCfg = buildA11yConfig();
    applyA11yConfig(nextCfg);
    editor1.syncConfig(nextCfg);
  };

  chkA11yFocusable.addEventListener('change', updateA11yFromControls);
  chkTable.addEventListener('change', updateA11yFromControls);
  chkReduced.addEventListener('change', updateA11yFromControls);

  // Example 2: Static Charts (isInteractive vs isFocusable) — Live Interactive Demo
  const staticSection = document.createElement('section');
  staticSection.className = 'panel-card guide-section';
  staticSection.id = 'static-charts';
  staticSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Static Charts (<code>isInteractive</code> vs. <code>isFocusable</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Use <code>isInteractive: false</code> for thumbnails, print/PDF exports, or dense dashboards.
          Toggle presets or edit <code>isInteractive</code>, <code>isFocusable</code>, and <code>ariaLabel</code> directly in the live config editor below.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" data-mode-preset="full" class="btn-primary">Full Interactive + Focusable</button>
        <button type="button" data-mode-preset="mouse-only">Mouse-Only (isFocusable: false)</button>
        <button type="button" data-mode-preset="static">Fully Static (isInteractive: false)</button>
      </div>
    </div>

    <div class="guide-controls-row" style="flex-wrap:wrap;gap:16px;margin:0 0 12px;">
      <label style="font-size:0.84rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="chk-is-interactive" checked />
        <code>isInteractive</code>
      </label>
      <label style="font-size:0.84rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="chk-is-focusable" checked />
        <code>isFocusable</code>
      </label>
      <span id="static-dom-badge" style="font-size:0.78rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:4px 10px;border-radius:6px;background:var(--bg-code);border:1px solid var(--border-subtle);color:var(--pill-cyan-fg);"></span>
    </div>

    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-static-chart"></div>
      <div id="guide-static-code"></div>
    </div>
  `;
  container.appendChild(staticSection);

  const staticChart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  staticSection.querySelector('#guide-static-chart')!.appendChild(staticChart);
  mounted.push(staticChart);

  const chkInteractive = staticSection.querySelector(
    '#chk-is-interactive'
  ) as HTMLInputElement;
  const chkStaticFocusable = staticSection.querySelector(
    '#chk-is-focusable'
  ) as HTMLInputElement;
  const domBadge = staticSection.querySelector(
    '#static-dom-badge'
  ) as HTMLElement;
  const staticCodeHost = staticSection.querySelector(
    '#guide-static-code'
  ) as HTMLElement;
  const presetBtns = Array.from(
    staticSection.querySelectorAll<HTMLButtonElement>('[data-mode-preset]')
  );

  let interactiveVal = true;
  let focusableVal = true;

  const syncStaticControls = () => {
    chkInteractive.checked = interactiveVal;
    chkStaticFocusable.checked = focusableVal;
    chkStaticFocusable.disabled = !interactiveVal;

    const activePreset = !interactiveVal
      ? 'static'
      : focusableVal
      ? 'full'
      : 'mouse-only';
    presetBtns.forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.modePreset === activePreset)
    );
  };

  const syncStaticDomBadge = () => {
    const sr = staticChart.shadowRoot;
    const tooltipCount = sr?.querySelectorAll('mc-tooltip').length ?? 0;
    const tabindexCount = sr?.querySelectorAll('[tabindex]').length ?? 0;
    const svgRole =
      sr?.querySelector('.mc-chart-svg')?.getAttribute('role') ?? 'img';
    const itemRoles =
      sr?.querySelectorAll('.mc-aria-item[role]').length ?? 0;

    domBadge.textContent = `Shadow DOM → <mc-tooltip>: ${tooltipCount} | [tabindex]: ${tabindexCount} | item ARIA roles: ${itemRoles} | svg role="${svgRole}"`;
  };

  const buildStaticConfig = () => ({
    title: !interactiveVal
      ? 'Static Chart (isInteractive: false)'
      : focusableVal
      ? 'Interactive + Keyboard Focusable Chart'
      : 'Mouse-Only Interactive Chart (isFocusable: false)',
    ariaLabel: 'Quarterly Cloud and Edge revenue chart',
    isInteractive: interactiveVal,
    isFocusable: focusableVal,
    data: sampleData
  });

  const applyStaticConfig = (cfg: Record<string, any>) => {
    staticChart.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 72, left: 52 },
      layers: ['grid', 'axes', 'bars', 'labels', 'legends'],
      ...cfg
    });
    syncStaticDomBadge();
  };

  const initialStaticCfg = buildStaticConfig();
  syncStaticControls();
  applyStaticConfig(initialStaticCfg);

  const editor2 = createLiveConfigEditor({
    title: 'isInteractive vs. isFocusable Config (Live)',
    initialConfig: initialStaticCfg,
    hint: 'Toggle isInteractive or isFocusable in chart.config — watch the Shadow DOM inspection badge update immediately.',
    onConfigChange: (nextCfg) => {
      if (typeof nextCfg.isInteractive === 'boolean') {
        interactiveVal = nextCfg.isInteractive;
      }
      if (typeof nextCfg.isFocusable === 'boolean') {
        focusableVal = nextCfg.isFocusable;
      }
      syncStaticControls();
      applyStaticConfig(nextCfg);
    },
    onReset: () => {
      interactiveVal = true;
      focusableVal = true;
      syncStaticControls();
      const resetCfg = buildStaticConfig();
      applyStaticConfig(resetCfg);
      editor2.syncConfig(resetCfg);
    }
  });
  staticCodeHost.appendChild(editor2.element);

  const updateStaticFromControls = () => {
    syncStaticControls();
    const nextCfg = buildStaticConfig();
    applyStaticConfig(nextCfg);
    editor2.syncConfig(nextCfg);
  };

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.modePreset;
      if (preset === 'full') {
        interactiveVal = true;
        focusableVal = true;
      } else if (preset === 'mouse-only') {
        interactiveVal = true;
        focusableVal = false;
      } else {
        interactiveVal = false;
      }
      updateStaticFromControls();
    });
  });

  chkInteractive.addEventListener('change', () => {
    interactiveVal = chkInteractive.checked;
    updateStaticFromControls();
  });

  chkStaticFocusable.addEventListener('change', () => {
    focusableVal = chkStaticFocusable.checked;
    updateStaticFromControls();
  });

  // Section 3: Option Matrix & Keyboard Reference Tables
  const refSection = document.createElement('section');
  refSection.className = 'panel-card guide-section';
  refSection.innerHTML = `
    <h2 class="panel-title">Option Matrix (<code>isInteractive</code> × <code>isFocusable</code>) &amp; Keyboard Shortcuts</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Configuration</th>
            <th><code>&lt;mc-tooltip&gt;</code> &amp; Hover</th>
            <th>Keyboard Focus &amp; <code>tabindex</code></th>
            <th>Chart SVG ARIA</th>
            <th>Best Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>isInteractive: true, isFocusable: true</code> <em>(default)</em></td>
            <td>Enabled</td>
            <td>Enabled (Tab + Arrow/Home/End)</td>
            <td><code>role="img"</code> + focusable items + data table</td>
            <td>Standard interactive web dashboards</td>
          </tr>
          <tr>
            <td><code>isInteractive: true, isFocusable: false</code></td>
            <td>Enabled</td>
            <td>Disabled (0 <code>tabindex</code>)</td>
            <td><code>role="img"</code> + semantic item labels</td>
            <td>Mouse-only interactive widgets inside dense tab orders</td>
          </tr>
          <tr>
            <td><code>isInteractive: false</code> <em>(overrides <code>isFocusable</code>)</em></td>
            <td>Not mounted, 0 listeners</td>
            <td>Disabled (0 <code>tabindex</code>)</td>
            <td><code>role="img"</code> + <code>aria-label</code> only (item roles removed)</td>
            <td>Thumbnails, print/PDF exports, email/report snapshots</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Key / Option</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>Tab</code> / <code>Shift + Tab</code></td><td>Moves focus through chart items, legends, and labels with full-text tooltips when <code>isInteractive</code> and <code>isFocusable</code> are enabled.</td></tr>
          <tr><td><code>ArrowRight</code> / <code>ArrowDown</code> / <code>ArrowLeft</code> / <code>ArrowUp</code></td><td>Navigates sequentially between rendered chart data items, showing an item-anchored tooltip and polite live announcement.</td></tr>
          <tr><td><code>Home</code> / <code>End</code></td><td>Jumps directly to the first or last focusable item in the chart.</td></tr>
          <tr><td><code>Enter</code> / <code>Space</code></td><td>Activates the focused item, emitting <code>mc-item-activate</code> and synthesizing a click.</td></tr>
          <tr><td><code>Escape</code></td><td>Dismisses the active keyboard-focused tooltip cleanly.</td></tr>
          <tr><td><code>prefers-reduced-motion: reduce</code></td><td>Automatically disables entry animations and CSS layer reveal transitions (can also be set explicitly via <code>animate: false</code>).</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(refSection);

  return mounted;
}
