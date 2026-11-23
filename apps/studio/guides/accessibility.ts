import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderAccessibilityGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & ARIA Roles Reference
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">Accessibility &amp; W3C ARIA (<code>&lt;mc-aria-layer&gt;</code>)</h2>
    <p class="guide-prose">
      Every chart in <code>modern-charts</code> ships with accessible SVG landmarks, customizable screen-reader
      labels, full keyboard navigation, automatic <code>prefers-reduced-motion</code> support, and a visually hidden
      semantic HTML <code>&lt;table&gt;</code> fallback generated directly from the rendered chart items.
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. Default Roles &amp; Descriptions</h3>
        <p>The SVG root has <code>role="img"</code> wired via <code>aria-labelledby="#mc-svg-title"</code> and <code>aria-describedby="#mc-svg-desc"</code>. Customize with <code>ariaLabel</code>, <code>aria.description</code>, or per-item accessors (<code>barAriaLabel</code>, <code>arcAriaLabel</code>, <code>pointAriaLabel</code>).</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Keyboard Navigation &amp; Focus</h3>
        <p>When <code>isFocusable: true</code> (default), every data item receives <code>tabindex="0"</code>, <code>Arrow</code>/<code>Home</code>/<code>End</code> roving navigation, item-anchored focus tooltips, <code>Enter</code>/<code>Space</code> activation, and <code>Escape</code> dismissal.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Live Announcements &amp; Reduced Motion</h3>
        <p>Focused items announce via a polite <code>role="status" aria-live="polite"</code> region (<code>aria.announceOnFocus</code>). Entry and layer animations automatically respect <code>prefers-reduced-motion: reduce</code>.</p>
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

  const chkFocusable = ex1.querySelector('#a11y-focusable-chk') as HTMLInputElement;
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
    const isFocusable = chkFocusable.checked;
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

  chkFocusable.addEventListener('change', renderA11yChart);
  chkTable.addEventListener('change', renderA11yChart);
  chkReduced.addEventListener('change', renderA11yChart);
  renderA11yChart();

  // Section 2: Keyboard & Reduced Motion Reference Table
  const refCard = document.createElement('section');
  refCard.className = 'panel-card guide-section';
  refCard.innerHTML = `
    <h2 class="panel-title">Keyboard Shortcuts &amp; Accessibility Options</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Key / Option</th>
            <th>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>Tab</code> / <code>Shift + Tab</code></td><td>Moves focus into and out of focusable chart items, legends, and truncated labels (when <code>isFocusable: true</code>).</td></tr>
          <tr><td><code>ArrowRight</code> / <code>ArrowDown</code> / <code>ArrowLeft</code> / <code>ArrowUp</code></td><td>Navigates sequentially between rendered chart data items, showing an item-anchored tooltip and polite live announcement.</td></tr>
          <tr><td><code>Home</code> / <code>End</code></td><td>Jumps directly to the first or last focusable item in the chart.</td></tr>
          <tr><td><code>Enter</code> / <code>Space</code></td><td>Activates the focused item, emitting <code>mc-item-activate</code> and synthesizing a click.</td></tr>
          <tr><td><code>Escape</code></td><td>Dismisses the active keyboard-focused tooltip cleanly.</td></tr>
          <tr><td><code>prefers-reduced-motion: reduce</code></td><td>Automatically disables entry animations and CSS layer reveal transitions (can also be set explicitly via <code>animate: false</code>).</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(refCard);

  return mounted;
}
