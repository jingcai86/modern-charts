import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createCodeBlock } from './shared';

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
          Click inside the chart and press <strong>Tab</strong> followed by <strong>ArrowLeft / ArrowRight / Home / End</strong>
          (or <strong>Enter</strong>) to inspect the exact screen-reader announcement and generated accessible HTML table below.
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

  const renderA11yChart = () => {
    const isFocusable = chkA11yFocusable.checked;
    const includeDataTable = chkTable.checked;
    const animate = !chkReduced.checked;

    bar.setConfig({
      data: sampleData,
      autoSize: true,
      themeMode,
      palette: 'ocean',
      title: 'Quarterly Revenue (Keyboard & Screen-Reader Ready)',
      ariaLabel: 'Quarterly Cloud and Edge revenue comparison',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      isFocusable,
      animate,
      barAriaLabel: (item) =>
        `${item.seriesId} revenue in ${item.category}: $${item.value}M (${item.index + 1} of ${item.total})`,
      aria: {
        description:
          'Grouped bar chart comparing Cloud and Edge revenue from Q1 to Q4.',
        includeDataTable,
        announceOnFocus: true
      },
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 72, left: 52 },
      layers: ['grid', 'axes', 'bars', 'labels', 'legends']
    });

    const generatedTable = bar.shadowRoot?.querySelector(
      '.mc-aria-table-container table'
    );
    if (generatedTable) {
      tablePreview.replaceChildren(generatedTable.cloneNode(true));
    } else {
      tablePreview.innerHTML =
        '<p style="color:var(--text-muted);margin:0;">Data table fallback disabled (<code>aria.includeDataTable: false</code>).</p>';
    }

    code1.innerHTML = '';
    code1.appendChild(
      createCodeBlock(
        `
chart.config = {
  data: quarterlyData,
  ariaLabel: 'Quarterly Cloud and Edge revenue comparison',
  isFocusable: ${isFocusable},
  animate: ${animate}, // honors prefers-reduced-motion automatically
  barAriaLabel: (item) =>
    \`\${item.seriesId} revenue in \${item.category}: $\${item.value}M (\${item.index + 1} of \${item.total})\`,
  aria: {
    description: 'Grouped bar chart comparing Cloud and Edge revenue from Q1 to Q4.',
    includeDataTable: ${includeDataTable},
    announceOnFocus: true
  }
};
        `,
        'W3C ARIA, Keyboard Focus & Data-Table Fallback'
      )
    );
  };

  chkA11yFocusable.addEventListener('change', renderA11yChart);
  chkTable.addEventListener('change', renderA11yChart);
  chkReduced.addEventListener('change', renderA11yChart);
  renderA11yChart();

  // Example 2: Static Charts (isInteractive vs isFocusable) — Live Interactive Demo
  const staticSection = document.createElement('section');
  staticSection.className = 'panel-card guide-section';
  staticSection.id = 'static-charts';
  staticSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Static Charts (<code>isInteractive</code> vs. <code>isFocusable</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Use <code>isInteractive: false</code> (or HTML attribute <code>is-interactive="false"</code>) for thumbnails,
          print/PDF exports, report snapshots, or dense dashboards. <code>isInteractive</code> is the master switch:
          when <code>false</code>, no <code>&lt;mc-tooltip&gt;</code> is created, no hover/pointer/keyboard listeners or
          <code>tabindex</code> attributes are attached, interactive item ARIA roles are removed, and the chart SVG still
          preserves <code>role="img"</code> with its <code>aria-label</code> and description.
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

  const updateStaticDemo = () => {
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

    staticChart.setConfig({
      data: sampleData,
      autoSize: true,
      themeMode,
      palette: 'modern',
      title: !interactiveVal
        ? 'Static Chart (isInteractive: false)'
        : focusableVal
        ? 'Interactive + Keyboard Focusable Chart'
        : 'Mouse-Only Interactive Chart (isFocusable: false)',
      ariaLabel: 'Quarterly Cloud and Edge revenue chart',
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      isInteractive: interactiveVal,
      isFocusable: focusableVal,
      borderRadius: 6,
      margin: { top: 44, right: 24, bottom: 72, left: 52 },
      layers: ['grid', 'axes', 'bars', 'labels', 'legends']
    });

    const sr = staticChart.shadowRoot;
    const tooltipCount = sr?.querySelectorAll('mc-tooltip').length ?? 0;
    const tabindexCount = sr?.querySelectorAll('[tabindex]').length ?? 0;
    const svgRole =
      sr?.querySelector('.mc-chart-svg')?.getAttribute('role') ?? 'img';
    const itemRoles =
      sr?.querySelectorAll('.mc-aria-item[role]').length ?? 0;

    domBadge.textContent = `Shadow DOM → <mc-tooltip>: ${tooltipCount} | [tabindex]: ${tabindexCount} | item ARIA roles: ${itemRoles} | svg role="${svgRole}"`;

    staticCodeHost.innerHTML = '';
    staticCodeHost.appendChild(
      createCodeBlock(
        `
<!-- HTML attribute syntax -->
<mc-bar-chart
  aria-label="Quarterly Cloud and Edge revenue chart"
  is-interactive="${interactiveVal}"
  is-focusable="${focusableVal}"
></mc-bar-chart>

// JS config syntax (can be toggled dynamically at runtime)
chart.config = {
  data: quarterlyData,
  ariaLabel: 'Quarterly Cloud and Edge revenue chart',
  isInteractive: ${interactiveVal}, // master switch (default true)
  isFocusable: ${focusableVal}    // keyboard focus when isInteractive is true
};

// Runtime toggle cleanly attaches/detaches tooltips & listeners:
chart.isInteractive = ${!interactiveVal};
        `,
        'isInteractive vs. isFocusable'
      )
    );
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
      updateStaticDemo();
    });
  });

  chkInteractive.addEventListener('change', () => {
    interactiveVal = chkInteractive.checked;
    updateStaticDemo();
  });

  chkStaticFocusable.addEventListener('change', () => {
    focusableVal = chkStaticFocusable.checked;
    updateStaticDemo();
  });

  updateStaticDemo();

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
          <tr><td><code>Tab</code> / <code>Shift + Tab</code></td><td>Moves focus into and out of focusable chart items, legends, and truncated labels (when <code>isInteractive: true</code> and <code>isFocusable: true</code>).</td></tr>
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
