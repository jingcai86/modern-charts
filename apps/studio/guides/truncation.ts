import type {
  LabelOverflowStrategy,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import { createCodeBlock } from './shared';

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
          Switch strategies between <code>truncate</code>, <code>rotate</code>, <code>both</code>, and <code>wrap</code>.
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

  const renderEx1 = () => {
    const overflow: Record<string, any> = {
      strategy,
      maxWidth,
      maxRotation,
      ellipsis,
      enableTooltip
    };
    if (maxChars > 0) overflow.maxChars = maxChars;

    bar1.setConfig({
      data: longDeptData,
      autoSize: true,
      themeMode,
      palette: 'modern',
      title: `Long Category Labels — strategy="${strategy}"`,
      indexBy: 'dept',
      keys: ['Spend'],
      borderRadius: 6,
      margin: {
        top: 44,
        right: 24,
        bottom: strategy === 'rotate' || strategy === 'both' ? 114 : 74,
        left: 52
      },
      label: {
        target: 'axis-tick',
        maxWidth,
        overflow
      },
      layers: ['grid', 'axes', 'bars', 'labels']
    });

    code1.innerHTML = '';
    code1.appendChild(
      createCodeBlock(
        `
// Scope overflow rules to axis ticks (or set chart-wide labelOverflow):
chart.config = {
  data: longDeptData,
  indexBy: 'dept',
  keys: ['Spend'],
  label: {
    target: 'axis-tick',
    maxWidth: ${maxWidth},
    overflow: {
      strategy: '${strategy}',
      maxWidth: ${maxWidth},${maxChars > 0 ? `\n      maxChars: ${maxChars},` : ''}
      ellipsis: '${ellipsis}',
      maxRotation: ${maxRotation},
      enableTooltip: ${enableTooltip}
    }
  }
};

// Declarative equivalent inside any <mc-*-chart>:
// <mc-bar-chart>
//   <mc-truncate for="axis-tick" strategy="${strategy}" max-width="${maxWidth}"${
          maxChars > 0 ? `\n//     max-chars="${maxChars}"` : ''
        }
//     ellipsis="${ellipsis}" max-rotation="${maxRotation}" enable-tooltip="${enableTooltip}">
//   </mc-truncate>
// </mc-bar-chart>
        `,
        'Axis & Label Truncation Config'
      )
    );
  };
  renderEx1();

  const stratBtns = Array.from(
    ex1.querySelectorAll<HTMLButtonElement>('[data-trunc-strat]')
  );
  stratBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      strategy = btn.dataset.truncStrat as LabelOverflowStrategy;
      stratBtns.forEach((b) =>
        b.classList.toggle('btn-primary', b.dataset.truncStrat === strategy)
      );
      renderEx1();
    });
  });

  const mwSlider = ex1.querySelector('#tr-mw-slider') as HTMLInputElement;
  const mwVal = ex1.querySelector('#tr-mw-val') as HTMLElement;
  mwSlider.addEventListener('input', () => {
    maxWidth = Number(mwSlider.value);
    mwVal.textContent = `${maxWidth}px`;
    renderEx1();
  });

  const mcSlider = ex1.querySelector('#tr-mc-slider') as HTMLInputElement;
  const mcVal = ex1.querySelector('#tr-mc-val') as HTMLElement;
  mcSlider.addEventListener('input', () => {
    maxChars = Number(mcSlider.value);
    mcVal.textContent = maxChars > 0 ? String(maxChars) : 'off';
    renderEx1();
  });

  const rotSlider = ex1.querySelector('#tr-rot-slider') as HTMLInputElement;
  const rotVal = ex1.querySelector('#tr-rot-val') as HTMLElement;
  rotSlider.addEventListener('input', () => {
    maxRotation = Number(rotSlider.value);
    rotVal.textContent = `${maxRotation}°`;
    renderEx1();
  });

  const ellSelect = ex1.querySelector('#tr-ellipsis-select') as HTMLSelectElement;
  ellSelect.addEventListener('change', () => {
    ellipsis = ellSelect.value;
    renderEx1();
  });

  const tipToggle = ex1.querySelector('#tr-tip-toggle') as HTMLInputElement;
  tipToggle.addEventListener('change', () => {
    enableTooltip = tipToggle.checked;
    renderEx1();
  });

  // Example 2: Legend Truncation + Standalone <mc-truncate> Component
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Truncated Legends, Pie Arc Links &amp; Standalone <code>&lt;mc-truncate&gt;</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Set <code>legend.maxItemWidth</code> to bound long series names in legends (hovering any legend reveals the full name via its dedicated legend tooltip),
          or reuse <code>&lt;mc-truncate&gt;</code> standalone anywhere in your application UI.
        </p>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-trunc-chart-2"></div>
      <div id="guide-trunc-code-2"></div>
    </div>
    <div style="margin-top:14px;padding:14px 16px;border:1px solid var(--border-subtle);border-radius:10px;display:flex;flex-wrap:wrap;align-items:center;gap:14px;">
      <span style="font-size:0.82rem;font-weight:600;color:var(--text-muted);">Standalone <code>&lt;mc-truncate&gt;</code> (hover or Tab):</span>
      <mc-truncate
        text="North America Enterprise Cloud Infrastructure &amp; Multi-Region Storage"
        max-width="170"
        font-size="13"
        font-weight="600"
        theme-mode="${themeMode}"
      ></mc-truncate>
      <mc-truncate
        text="🚀 Asia-Pacific Edge Compute Telemetry"
        max-chars="18"
        ellipsis="..."
        font-size="13"
        font-weight="600"
        theme-mode="${themeMode}"
      ></mc-truncate>
    </div>
  `;
  container.appendChild(ex2);

  const pie2 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-trunc-chart-2')!.appendChild(pie2);
  mounted.push(pie2);

  pie2.setConfig({
    data: [
      { id: 'North America Cloud Infrastructure', value: 420 },
      { id: 'Europe Edge Analytics Platform', value: 315 },
      { id: 'Asia-Pacific Real-Time AI Inference', value: 268 },
      { id: 'Latin America Core Telemetry Mesh', value: 145 }
    ],
    autoSize: true,
    themeMode,
    palette: 'emerald',
    title: 'Truncated Pie Link Labels & Legend Items',
    innerRadius: 0.52,
    legend: {
      enabled: true,
      position: 'bottom',
      maxItemWidth: 105,
      enableTooltip: true
    },
    label: {
      target: 'arc-link',
      maxWidth: 105,
      overflow: {
        strategy: 'truncate',
        tooltip: {
          formatter: (p) => `<strong>Full Segment:</strong> ${p.title}`
        }
      }
    }
  });

  ex2.querySelector('#guide-trunc-code-2')!.appendChild(
    createCodeBlock(
      `
// Truncate pie arc-link labels AND legend items with custom full-text tooltips:
pieChart.config = {
  data: regionalSegments,
  legend: {
    enabled: true,
    position: 'bottom',
    maxItemWidth: 105,
    enableTooltip: true // full name shown in dedicated legend tooltip
  },
  label: {
    target: 'arc-link',
    maxWidth: 105,
    overflow: {
      strategy: 'truncate',
      tooltip: {
        formatter: (p) => \`<strong>Full Segment:</strong> \${p.title}\`
      }
    }
  }
};

// Standalone reusable <mc-truncate> anywhere in HTML:
// <mc-truncate
//   text="North America Enterprise Cloud Infrastructure"
//   max-width="170"
//   max-chars="24"
//   enable-tooltip="true"
// ></mc-truncate>
      `,
      'Legend Truncation & Standalone <mc-truncate>'
    )
  );

  return mounted;
}
