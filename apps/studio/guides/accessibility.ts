import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderAccessibilityGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro: W3C ARIA & Accessibility Overview
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Accessibility, Keyboard Navigation &amp; Static Charts (<code>isInteractive</code> / <code>isFocusable</code>)</h2>
    <p class="guide-prose">
      Every chart in <code>modern-charts</code> ships with built-in W3C ARIA roles, screen-reader descriptions,
      keyboard navigation (<code>Tab</code>, Arrow keys, <code>Home</code>/<code>End</code>, <code>Enter</code>/<code>Space</code>),
      <code>prefers-reduced-motion</code> awareness, and a hidden accessible HTML data-table fallback — plus a
      dedicated <code>isInteractive</code> switch for fully static charts.
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. Roles &amp; Screen-Reader Labels</h3>
        <p>The chart SVG uses <code>role="img"</code> with <code>&lt;title&gt;</code>, <code>&lt;desc&gt;</code>, and <code>aria-label</code>. Interactive items receive <code>role="graphics-symbol"</code> and customizable label accessors (<code>barAriaLabel</code>, <code>arcAriaLabel</code>, <code>aria.itemLabel</code>).</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Keyboard Navigation &amp; Announcements</h3>
        <p>When <code>isInteractive: true</code> and <code>isFocusable: true</code>, every item gets <code>tabindex="0"</code>, roving Arrow/Home/End navigation, item-anchored focus tooltips, and polite <code>aria-live="polite"</code> announcements.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Reduced Motion &amp; Data-Table Fallback</h3>
        <p>Entry animations honor <code>prefers-reduced-motion: reduce</code> automatically. Set <code>aria.includeDataTable: true</code> (enabled by default) to expose a visually hidden semantic <code>&lt;table&gt;</code> of all chart items for assistive tech.</p>
      </div>
    </div>
  `;
  container.appendChild(intro);

  // Section 1: Static Charts (isInteractive vs isFocusable) — Live Interactive Demo
  const staticSection = document.createElement('section');
  staticSection.className = 'panel-card guide-section';
  staticSection.id = 'static-charts';
  staticSection.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Static Charts: <code>isInteractive</code> vs. <code>isFocusable</code></h2>
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
  const chkFocusable = staticSection.querySelector(
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

  const demoData = [
    { quarter: 'Q1', Cloud: 142, Edge: 88 },
    { quarter: 'Q2', Cloud: 168, Edge: 104 },
    { quarter: 'Q3', Cloud: 196, Edge: 122 },
    { quarter: 'Q4', Cloud: 248, Edge: 156 }
  ];

  let interactiveVal = true;
  let focusableVal = true;

  const updateStaticDemo = () => {
    chkInteractive.checked = interactiveVal;
    chkFocusable.checked = focusableVal;
    chkFocusable.disabled = !interactiveVal;

    const activePreset = !interactiveVal
      ? 'static'
      : focusableVal
      ? 'full'
      : 'mouse-only';
    presetBtns.forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.modePreset === activePreset)
    );

    staticChart.setConfig({
      data: demoData,
      autoSize: true,
      themeMode,
      palette: 'ocean',
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

  chkFocusable.addEventListener('change', () => {
    focusableVal = chkFocusable.checked;
    updateStaticDemo();
  });

  updateStaticDemo();

  // Section 2: Comparison Table & Screen-Reader / Keyboard Reference
  const refSection = document.createElement('section');
  refSection.className = 'panel-card guide-section';
  refSection.innerHTML = `
    <h2 class="panel-title">Option Matrix: <code>isInteractive</code> × <code>isFocusable</code></h2>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--border-subtle);text-align:left;">
            <th style="padding:8px 10px;">Configuration</th>
            <th style="padding:8px 10px;"><code>&lt;mc-tooltip&gt;</code> &amp; Hover</th>
            <th style="padding:8px 10px;">Keyboard Focus &amp; <code>tabindex</code></th>
            <th style="padding:8px 10px;">Chart SVG ARIA</th>
            <th style="padding:8px 10px;">Best Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border-subtle);">
            <td style="padding:8px 10px;"><code>isInteractive: true, isFocusable: true</code> <em>(default)</em></td>
            <td style="padding:8px 10px;">Enabled</td>
            <td style="padding:8px 10px;">Enabled (Tab + Arrow/Home/End)</td>
            <td style="padding:8px 10px;"><code>role="img"</code> + focusable items + data table</td>
            <td style="padding:8px 10px;">Standard interactive web dashboards</td>
          </tr>
          <tr style="border-bottom:1px solid var(--border-subtle);">
            <td style="padding:8px 10px;"><code>isInteractive: true, isFocusable: false</code></td>
            <td style="padding:8px 10px;">Enabled</td>
            <td style="padding:8px 10px;">Disabled (0 <code>tabindex</code>)</td>
            <td style="padding:8px 10px;"><code>role="img"</code> + semantic item labels</td>
            <td style="padding:8px 10px;">Mouse-only interactive widgets inside dense tab orders</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;"><code>isInteractive: false</code> <em>(overrides <code>isFocusable</code>)</em></td>
            <td style="padding:8px 10px;">Not mounted, 0 listeners</td>
            <td style="padding:8px 10px;">Disabled (0 <code>tabindex</code>)</td>
            <td style="padding:8px 10px;"><code>role="img"</code> + <code>aria-label</code> only (item roles removed)</td>
            <td style="padding:8px 10px;">Thumbnails, print/PDF exports, email/report snapshots</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(refSection);

  return mounted;
}
