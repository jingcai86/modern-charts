import { getGlobalPalette } from '../state/theme';
import {
  defineCustomElement,
  type MCBaseChart,
  type MCTooltipElement,
  type ThemeModePreference,
  type TooltipPayload,
  type TooltipTarget
} from '../../../src/index';
import { createFeatureGuideBootstrap } from './bootstrapping';
import { guideCallback } from './callback-source';
import {
  createLiveConfigEditor,
  createLiveCssEditor,
  createLiveHtmlEditor
} from './shared';

export class DashboardTooltipElement extends HTMLElement {
  #lastPayload: TooltipPayload | null = null;
  #activeTarget: TooltipTarget | null = null;

  connectedCallback(): void {
    this.style.cssText =
      'position:absolute;top:10px;right:12px;z-index:22;pointer-events:none;max-width:260px;padding:8px 12px;border-radius:10px;background:rgba(15,23,42,0.94);color:#f8fafc;border:1px solid #38bdf8;font-size:12px;line-height:1.4;box-shadow:0 10px 24px rgba(0,0,0,0.26);';
    if (!this.#lastPayload) {
      this.hidden = true;
    }
  }

  get lastPayload(): TooltipPayload | null {
    return this.#lastPayload;
  }

  get activeTarget(): TooltipTarget | null {
    return this.#activeTarget;
  }

  public show(payload: TooltipPayload): boolean {
    const target: TooltipTarget = payload.target ?? 'item';
    this.#lastPayload = payload;
    this.#activeTarget = target;
    this.dataset.target = target;
    this.dataset.source = payload.source ?? 'pointer';

    const badge = document.createElement('div');
    badge.className = 'dashboard-tooltip-kind';
    badge.style.cssText =
      'font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:2px;color:' +
      (target === 'legend' ? '#a78bfa' : '#38bdf8');
    badge.textContent = target === 'legend' ? 'Legend Tooltip' : 'Item Tooltip';

    const detail = document.createElement('div');
    detail.className = 'dashboard-tooltip-detail';
    const title = payload.title ?? payload.category ?? '';
    const label = payload.label ?? payload.seriesId ?? '';
    const value =
      payload.formattedValue ??
      (payload.value !== undefined ? String(payload.value) : '');
    detail.textContent =
      target === 'legend'
        ? [title || label, value].filter(Boolean).join(' · ')
        : [title, label && value ? `${label}: ${value}` : label || value]
            .filter(Boolean)
            .join(' — ');

    this.replaceChildren(badge, detail);
    this.hidden = false;
    return true;
  }

  public hide(target?: TooltipTarget): void {
    if (!target || !this.#activeTarget || this.#activeTarget === target) {
      this.hidden = true;
      this.#activeTarget = null;
    }
  }
}

defineCustomElement('dashboard-tooltip', DashboardTooltipElement);

export function renderTooltipsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];
  const bootstrap = createFeatureGuideBootstrap({ tooltip: true });

  // Architecture & CSS ::part() Reference Card
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="guide-section-title">How Unified <code>&lt;mc-tooltip&gt;</code> Works</h2>
    <p class="guide-prose">
      Every chart in <code>modern-charts</code> (all 10 chart components) shares a unified
      <code>&lt;mc-tooltip&gt;</code> Web Component. By default (<code>features.tooltip: true</code>),
      registration lazy-loads the built-in tooltip renderer as a separate chunk, and each interactive chart mounts
      one item <code>&lt;mc-tooltip&gt;</code> and one dedicated legend <code>&lt;mc-tooltip&gt;</code> inside its Shadow DOM —
      reusing them in-place on pointer hover and keyboard focus.
    </p>
    <p class="guide-prose">
      Pass <code>registerModernCharts({ features: { tooltip: false } })</code> (or a per-chart registrar such as
      <code>registerBarChart({ features: { tooltip: false } })</code>) to skip downloading and mounting the chart-owned
      <code>&lt;mc-tooltip&gt;</code> elements while keeping chart interactions and tooltip events active. Mount caller-owned
      tooltip markup or a custom element in <code>slot="tooltip"</code> (for example
      <code>&lt;dashboard-tooltip slot="tooltip"&gt;&lt;/dashboard-tooltip&gt;</code>) to render your own tooltip UI.
      Item and legend requests are distinguished via <code>payload.target</code> (<code>'item' | 'legend'</code>),
      the <code>target</code> argument passed to custom <code>hide(target)</code> methods, and separate
      <code>mc-tooltip-show</code> / <code>mc-tooltip-hide</code> vs.
      <code>mc-legend-tooltip-show</code> / <code>mc-legend-tooltip-hide</code> events.
      See the <a href="#/guide/bootstrapping">Feature Bootstrapping &amp; Lazy Loading guide</a>.
    </p>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>CSS Shadow Part</th>
            <th>Target Element</th>
            <th>Common Customizations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>::part(tooltip)</code></td>
            <td>Outer tooltip surface container</td>
            <td><code>background</code>, <code>border</code>, <code>border-radius</code>, <code>box-shadow</code>, <code>padding</code>, <code>backdrop-filter</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-header)</code></td>
            <td>Header / category / title line</td>
            <td><code>color</code>, <code>font-size</code>, <code>text-transform</code>, <code>border-bottom</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-body)</code></td>
            <td>Body stack holding metric rows</td>
            <td><code>gap</code>, <code>font-family</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-row)</code></td>
            <td>Single metric row (flex container)</td>
            <td><code>justify-content</code>, <code>padding</code>, <code>border-bottom</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-swatch)</code></td>
            <td>Series color dot indicator</td>
            <td><code>width</code>, <code>height</code>, <code>border-radius</code> (e.g. square badge)</td>
          </tr>
          <tr>
            <td><code>::part(tooltip-label)</code></td>
            <td>Metric / series label text</td>
            <td><code>color</code>, <code>opacity</code>, <code>font-weight</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-value)</code></td>
            <td>Formatted numeric value</td>
            <td><code>color</code>, <code>font-size</code>, <code>font-variant-numeric</code></td>
          </tr>
          <tr>
            <td><code>::part(tooltip-badge)</code></td>
            <td>Threshold / warning callout badge</td>
            <td><code>background</code>, <code>color</code>, <code>border-radius</code>, <code>padding</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Live CSS Styling via ::part() (Zero JavaScript!)
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 1: Pure CSS Styling via <code>::part()</code></h3>
        <p class="guide-prose">
          Edit the CSS rules on the right (colors, borders, border-radius, typography), then hover any bar on the left —
          changes apply live via standard CSS <code>::part(...)</code> selectors.
        </p>
      </div>
    </div>
    <div class="guide-split">
      <div class="guide-chart-box" id="guide-tooltip-chart-1"></div>
      <div id="guide-tooltip-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  bar1.className = 'guide-css-part-bar';
  bar1.style.width = '100%';
  bar1.style.height = '340px';
  ex1.querySelector('#guide-tooltip-chart-1')!.appendChild(bar1);
  bar1.config = {
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 88 },
      { quarter: 'Q2', Cloud: 176, Edge: 112 },
      { quarter: 'Q3', Cloud: 194, Edge: 78 },
      { quarter: 'Q4', Cloud: 228, Edge: 154 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    groupMode: 'grouped',
    themeMode,
    palette: getGlobalPalette(),
    title: 'Hover Bars to Inspect ::part() Styled Tooltip',
    markers: [
      {
        id: 'sla-floor',
        type: 'line',
        axis: 'y',
        value: 100,
        label: 'Floor $100K',
        stroke: '#ef4444',
        condition: 'below',
        matchStyle: { color: '#ef4444' }
      }
    ]
  };
  mounted.push(bar1);

  const initialTooltipCss = `/* Style any chart's unified <mc-tooltip> directly from CSS */
mc-bar-chart::part(tooltip) {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
  border: 1px solid #38bdf8;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 14px 36px rgba(56, 189, 248, 0.25);
  color: #f8fafc;
}

mc-bar-chart::part(tooltip-header) {
  color: #38bdf8;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(56, 189, 248, 0.22);
  padding-bottom: 4px;
  margin-bottom: 6px;
}

mc-bar-chart::part(tooltip-swatch) {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

mc-bar-chart::part(tooltip-value) {
  color: #fbbf24;
  font-size: 13px;
}

mc-bar-chart::part(tooltip-badge) {
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 6px;
  padding: 2px 6px;
  margin-top: 6px;
}`;

  const cssEditor1 = createLiveCssEditor({
    title: 'Pure CSS ::part() Styling (Live)',
    scopeKey: 'guide-tooltips-ex1-css',
    hostSelector: 'mc-bar-chart',
    scopedSelector: 'mc-bar-chart.guide-css-part-bar',
    initialCss: initialTooltipCss,
    hint: 'Edit colors, border, padding, or border-radius — hover bars on the left to see live styling.'
  });
  ex1.querySelector('#guide-tooltip-code-1')!.appendChild(cssEditor1.element);

  // Example 2: Custom tooltip.renderer receiving ALL chart & slice data
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 2: Custom <code>tooltip.renderer</code> with Full Data Access</h3>
        <p class="guide-prose">
          Hover across the line chart below. The custom <code>tooltip.renderer(payload, defaultRender)</code> computes
          YoY Lift from <code>payload.items</code>. Edit <code>data</code>, <code>tooltip.offsetX</code>/<code>offsetY</code>,
          or <code>enableSlices</code> in the live editor to watch both the line and computed YoY tooltip update.
        </p>
      </div>
    </div>
    <div class="guide-split">
      <div class="guide-chart-box" id="guide-tooltip-chart-2"></div>
      <div id="guide-tooltip-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const line2 = document.createElement('mc-line-chart') as MCBaseChart<any>;
  line2.style.width = '100%';
  line2.style.height = '340px';
  ex2.querySelector('#guide-tooltip-chart-2')!.appendChild(line2);

  const kpiTooltipRenderer = guideCallback((
    payload: TooltipPayload,
    defaultRender: () => Node
  ) => {
    const card = document.createElement('div');
    card.appendChild(defaultRender());

    if (payload.items && payload.items.length >= 2) {
      const actual = Number(payload.items[0].value ?? 0);
      const baseline = Number(payload.items[1].value ?? 0);
      const delta = actual - baseline;
      const pct = baseline > 0 ? ((delta / baseline) * 100).toFixed(1) : '0';

      const footer = document.createElement('div');
      footer.style.cssText =
        'margin-top:6px;padding-top:6px;border-top:1px solid rgba(148,163,184,0.25);font-size:11px;display:flex;justify-content:space-between;gap:12px;';
      const lbl = document.createElement('span');
      lbl.textContent = 'YoY Lift:';
      const val = document.createElement('strong');
      val.style.color = delta >= 0 ? '#10b981' : '#ef4444';
      val.textContent = `${delta >= 0 ? '+' : ''}${delta} (${delta >= 0 ? '+' : ''}${pct}%)`;
      footer.append(lbl, val);
      card.appendChild(footer);
    }
    return card;
  });

  const initialLine2Cfg = {
    title: 'Hover Across Months for Computed KPI Tooltip',
    palette: 'bootstrap',
    curve: 'monotoneX',
    enableArea: true,
    enableSlices: true,
    data: [
      {
        id: '2026 Actual',
        data: [
          { x: 'Jan', y: 140 },
          { x: 'Feb', y: 168 },
          { x: 'Mar', y: 192 },
          { x: 'Apr', y: 224 },
          { x: 'May', y: 248 }
        ]
      },
      {
        id: '2025 Baseline',
        data: [
          { x: 'Jan', y: 118 },
          { x: 'Feb', y: 132 },
          { x: 'Mar', y: 148 },
          { x: 'Apr', y: 170 },
          { x: 'May', y: 185 }
        ]
      }
    ],
    tooltip: {
      offsetX: 16,
      offsetY: 10,
      renderer: kpiTooltipRenderer
    }
  };

  const applyLine2 = (cfg: Record<string, any>) => {
    line2.config = {
      themeMode,
      ...cfg
    };
  };
  applyLine2(initialLine2Cfg);
  mounted.push(line2);

  const editor2 = createLiveConfigEditor({
    title: 'Custom tooltip.renderer Config (Live)',
    initialConfig: initialLine2Cfg,
    hint: 'Edit series values or tooltip offsets — YoY Lift recalculates live on hover.',
    onConfigChange: applyLine2
  });
  ex2.querySelector('#guide-tooltip-code-2')!.appendChild(editor2.element);

  // Example 3: Live Declarative <mc-tooltip> Child Element + <template>
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.innerHTML = `
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 3: Declarative <code>&lt;mc-tooltip&gt;</code> Child &amp; <code>&lt;template&gt;</code></h3>
        <p class="guide-prose">
          Edit the declarative <code>&lt;mc-pie-chart&gt;</code> and <code>&lt;mc-tooltip&gt;</code> markup below
          (try changing the <code>&lt;template&gt;</code> text, <code>offset-x</code>, <code>inner-radius</code>, or setting <code>enabled="false"</code>)
          and hover any slice to inspect your changes live.
        </p>
      </div>
    </div>
    <div class="guide-split">
      <div class="guide-chart-box" id="guide-tooltip-chart-3"></div>
      <div id="guide-tooltip-code-3"></div>
    </div>
  `;
  container.appendChild(ex3);

  const pie3 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  pie3.style.width = '100%';
  pie3.style.height = '340px';
  ex3.querySelector('#guide-tooltip-chart-3')!.appendChild(pie3);
  mounted.push(pie3);

  const pie3BaseData = [
    { id: 'Compute', label: 'Compute', value: 420, owner: 'Infra Team' } as any,
    { id: 'AI', label: 'AI / GPU', value: 360, owner: 'ML Platform' } as any,
    { id: 'Storage', label: 'Storage', value: 210, owner: 'Data Core' } as any,
    { id: 'Network', label: 'Network', value: 140, owner: 'Edge Ops' } as any
  ];

  const initialPie3Markup = `<mc-pie-chart inner-radius="0.56">
  <mc-tooltip offset-x="18">
    <template>
      <div style="font-weight:700;margin-bottom:2px;">{{title}}</div>
      <div style="font-size:12px;">Allocation: <strong>\${{value}}K</strong> ({{percentage}})</div>
      <div style="font-size:11px;opacity:0.75;margin-top:2px;">Owner: {{datum.owner}}</div>
    </template>
  </mc-tooltip>
</mc-pie-chart>`;

  const applyPie3Markup = (
    chartAttrs: Record<string, string>,
    children: Node[]
  ) => {
    pie3.replaceChildren(...children);
    const parsedInner = Number(chartAttrs['inner-radius']);
    const innerRadius = Number.isFinite(parsedInner)
      ? Math.max(0, Math.min(0.9, parsedInner))
      : 0.56;
    const tipEl = pie3.querySelector('mc-tooltip') as MCTooltipElement | null;
    const tipDisabled = tipEl?.getAttribute('enabled') === 'false';

    pie3.setConfig({
      data: pie3BaseData,
      innerRadius,
      themeMode,
      palette: 'material',
      tooltip: tipDisabled ? false : undefined,
      title: 'Declarative <mc-tooltip> with {{datum.owner}}'
    });
  };

  const editor3 = createLiveHtmlEditor({
    title: 'Declarative <mc-tooltip> Markup (Live)',
    chartTag: 'mc-pie-chart',
    initialMarkup: initialPie3Markup,
    hint: 'Edit <template> tokens ({{title}}, {{value}}, {{percentage}}, {{datum.owner}}), offset-x, enabled="false", or inner-radius.',
    onMarkupApply: ({ chartAttrs, children }) => {
      applyPie3Markup(chartAttrs, children);
    }
  });
  editor3.applyCurrent();
  ex3.querySelector('#guide-tooltip-code-3')!.appendChild(editor3.element);

  // Example 4: Configurable Tooltip Positioning ('item' vs 'follow' + Keyboard Tab/Arrow)
  const ex4 = document.createElement('section');
  ex4.className = 'panel-card guide-section';
  ex4.innerHTML = `
    <div class="guide-example-header">
      <div>
        <h3 class="guide-example-title">Example 4: Configurable Positioning — Item-Anchored vs. Follow Mouse</h3>
        <p class="guide-prose">
          Toggle between <code>position: 'item'</code> and <code>position: 'follow'</code>, or edit <code>tooltip</code>
          settings and <code>data</code> directly in the live config editor below.
        </p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button type="button" class="btn-chip active" data-pos-mode="item">Anchored on Item (item)</button>
        <button type="button" class="btn-chip" data-pos-mode="follow">Follow Mouse (follow)</button>
      </div>
    </div>
    <div class="guide-split">
      <div class="guide-chart-box" id="guide-tooltip-chart-4"></div>
      <div id="guide-tooltip-code-4"></div>
    </div>
  `;
  container.appendChild(ex4);

  const bar4 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  bar4.style.width = '100%';
  bar4.style.height = '340px';
  ex4.querySelector('#guide-tooltip-chart-4')!.appendChild(bar4);
  mounted.push(bar4);

  let posMode: 'item' | 'follow' = 'item';

  const buildBar4Config = (mode: 'item' | 'follow') => ({
    title: `Hover or Tab through bars — Tooltip Position: ${mode}`,
    palette: getGlobalPalette(),
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'AI'],
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 88, AI: 64 },
      { quarter: 'Q2', Cloud: 168, Edge: 104, AI: 96 },
      { quarter: 'Q3', Cloud: 190, Edge: 118, AI: 132 },
      { quarter: 'Q4', Cloud: 215, Edge: 136, AI: 168 }
    ],
    tooltip: {
      position: mode,
      anchorGap: 10,
      offsetX: 14,
      offsetY: 14
    }
  });

  const syncPosButtons = (mode: 'item' | 'follow') => {
    ex4
      .querySelectorAll('button[data-pos-mode]')
      .forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-pos-mode') === mode)
      );
  };

  const applyBar4 = (cfg: Record<string, any>) => {
    bar4.config = {
      themeMode,
      ...cfg
    };
  };

  const initialBar4Cfg = buildBar4Config(posMode);
  applyBar4(initialBar4Cfg);

  const editor4 = createLiveConfigEditor({
    title: 'Tooltip Positioning Config (Live)',
    initialConfig: initialBar4Cfg,
    hint: 'Edit tooltip.position ("item" | "follow"), anchorGap, offsetX/offsetY, or enabled: false.',
    onConfigChange: (nextCfg) => {
      const nextPos = nextCfg.tooltip?.position;
      if (nextPos === 'item' || nextPos === 'follow') {
        posMode = nextPos;
        syncPosButtons(posMode);
      }
      applyBar4(nextCfg);
    },
    onReset: () => {
      posMode = 'item';
      syncPosButtons(posMode);
      const resetCfg = buildBar4Config(posMode);
      applyBar4(resetCfg);
      editor4.syncConfig(resetCfg);
    }
  });
  ex4.querySelector('#guide-tooltip-code-4')!.appendChild(editor4.element);

  ex4.querySelectorAll('button[data-pos-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      posMode = btn.getAttribute('data-pos-mode') as 'item' | 'follow';
      syncPosButtons(posMode);
      const nextCfg = buildBar4Config(posMode);
      applyBar4(nextCfg);
      editor4.syncConfig(nextCfg);
    });
  });

  // Live mc-tooltip-show / mc-tooltip-hide Event Log Strip inside Example 4
  const tipEventBar = document.createElement('div');
  tipEventBar.className = 'inspector-box';
  tipEventBar.style.marginTop = '12px';
  tipEventBar.innerHTML = `
    <div class="inspector-title">Live <code>mc-tooltip-show</code> / <code>mc-tooltip-hide</code> Event Monitor (hover or Tab through bars above):</div>
    <div class="inspector-readout" id="guide-tooltip-event-readout">Waiting for tooltip event...</div>
  `;
  ex4.appendChild(tipEventBar);

  const tipEventReadout = tipEventBar.querySelector(
    '#guide-tooltip-event-readout'
  ) as HTMLElement;
  bar4.addEventListener('mc-tooltip-show', (e: Event) => {
    const p = (e as CustomEvent<TooltipPayload>).detail;
    tipEventReadout.textContent = `mc-tooltip-show → mode="${p.positionMode}" | source="${
      p.source ?? 'pointer'
    }" | series="${p.seriesId ?? p.label ?? ''}" | category="${
      p.category ?? ''
    }" | value=${p.formattedValue ?? p.value ?? ''}`;
  });
  bar4.addEventListener('mc-tooltip-hide', () => {
    tipEventReadout.textContent = 'mc-tooltip-hide → tooltip dismissed';
  });

  // Example 5: Custom Tooltip Slot (slot="tooltip") & features.tooltip: false Opt-Out
  const ex5 = document.createElement('section');
  ex5.className = 'panel-card guide-section';
  ex5.innerHTML = `
    <div class="guide-example-header">
      <div>
        <h3 class="guide-example-title">Example 5: Custom <code>slot="tooltip"</code> &amp; <code>features.tooltip: false</code> Opt-Out</h3>
        <p class="guide-prose">
          Uncomment <code>tooltip: false</code> in the live bootstrap editor (or toggle the checkbox) to disable and unmount the chart-owned
          <code>&lt;mc-tooltip&gt;</code> hosts while keeping <code>&lt;dashboard-tooltip slot="tooltip"&gt;</code> active for both item
          (<code>payload.target === 'item'</code>) and legend (<code>payload.target === 'legend'</code>) interactions.
        </p>
      </div>
      <div class="guide-controls-row">
        <label><input type="checkbox" id="tp-builtin-enabled" checked> Built-in <code>&lt;mc-tooltip&gt;</code> enabled</label>
        <span id="tp-slot-badge" class="comp-pill">built-in: enabled · slot: idle</span>
      </div>
    </div>
    <div class="guide-split">
      <div class="guide-chart-box" id="guide-tooltip-chart-5"></div>
      <div id="guide-tooltip-code-5"></div>
    </div>
  `;
  container.appendChild(ex5);

  const bar5 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  bar5.style.width = '100%';
  bar5.style.height = '340px';
  const customSlotTooltip = document.createElement(
    'dashboard-tooltip'
  ) as DashboardTooltipElement;
  customSlotTooltip.slot = 'tooltip';
  bar5.appendChild(customSlotTooltip);
  ex5.querySelector('#guide-tooltip-chart-5')!.appendChild(bar5);
  mounted.push(bar5);

  const builtinToggle = ex5.querySelector<HTMLInputElement>('#tp-builtin-enabled')!;
  const slotBadge = ex5.querySelector<HTMLElement>('#tp-slot-badge')!;

  const updateSlotBadge = (status = 'slot: idle') => {
    const enabled = bar5.isFeatureEnabled('tooltip');
    const hosts = bar5.shadowRoot?.querySelectorAll('mc-tooltip').length ?? 0;
    slotBadge.textContent = `built-in: ${enabled ? 'enabled' : 'disabled'} (${hosts} hosts) · ${status}`;
  };

  bar5.addEventListener('mc-tooltip-show', (e: Event) => {
    const p = (e as CustomEvent<TooltipPayload>).detail;
    updateSlotBadge(
      `target: ${p.target ?? 'item'} · ${p.category ?? p.title ?? ''}: ${
        p.formattedValue ?? p.value ?? ''
      }`
    );
  });
  bar5.addEventListener('mc-legend-tooltip-show', (e: Event) => {
    const p = (e as CustomEvent<TooltipPayload>).detail;
    updateSlotBadge(
      `target: ${p.target ?? 'legend'} · ${p.title ?? p.label ?? ''}`
    );
  });
  bar5.addEventListener('mc-tooltip-hide', () => updateSlotBadge('slot: idle'));
  bar5.addEventListener('mc-legend-tooltip-hide', () =>
    updateSlotBadge('slot: idle')
  );

  const initialBar5Cfg = {
    title: 'Hover Bars (target="item") or Legend (target="legend")',
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge'],
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 88 },
      { quarter: 'Q2', Cloud: 168, Edge: 104 },
      { quarter: 'Q3', Cloud: 194, Edge: 118 },
      { quarter: 'Q4', Cloud: 228, Edge: 148 }
    ]
  };

  const applyBar5 = (cfg: Record<string, any>) => {
    bar5.setConfig({
      themeMode,
      palette: getGlobalPalette(),
      ...cfg
    });
    updateSlotBadge();
  };
  applyBar5(initialBar5Cfg);

  const editor5 = bootstrap.createEditor({
    title: 'Bootstrap tooltip opt-out & slot="tooltip"',
    initialConfig: initialBar5Cfg,
    chartId: () => 'bar',
    showTooltipOptOut: true,
    usage: `const customTooltip = document.createElement('dashboard-tooltip');
customTooltip.slot = 'tooltip';
chart.appendChild(customTooltip);`,
    hint: 'Uncomment tooltip: false to skip mounting the built-in <mc-tooltip> hosts and use only <dashboard-tooltip slot="tooltip">.',
    onConfigChange: applyBar5,
    onReset: () => {
      applyBar5(initialBar5Cfg);
      editor5.syncConfig(initialBar5Cfg);
    }
  });
  ex5.querySelector('#guide-tooltip-code-5')!.appendChild(editor5.element);

  bootstrap.onFeaturesChanged(() => {
    builtinToggle.checked = bar5.isFeatureEnabled('tooltip');
    updateSlotBadge();
  });
  builtinToggle.addEventListener('change', () => {
    void bootstrap
      .updateFeatures({ tooltip: builtinToggle.checked })
      .then(() => updateSlotBadge());
  });

  // Section 6: TooltipConfig & TooltipPayload Reference Table
  const apiRef = document.createElement('section');
  apiRef.className = 'panel-card guide-section';
  apiRef.innerHTML = `
    <h2 class="guide-section-title">API Reference: <code>TooltipConfig</code> &amp; <code>TooltipPayload</code></h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Option / Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>features.tooltip</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Bootstrap flag on <code>registerModernCharts()</code> / <code>register*Chart()</code>. Set <code>false</code> to skip downloading and mounting the built-in <code>&lt;mc-tooltip&gt;</code> implementation.</td></tr>
          <tr><td><code>slot="tooltip"</code></td><td><code>HTML slot</code></td><td>—</td><td>Public named slot inside every chart container for caller-owned tooltip markup or a custom element receiving <code>show(payload, ...)</code> / <code>hide(target)</code> and tooltip events.</td></tr>
          <tr><td><code>payload.target</code></td><td><code>'item' | 'legend'</code></td><td>—</td><td>Distinguishes chart item tooltip requests (<code>'item'</code>) from legend tooltip requests (<code>'legend'</code>). Also passed to custom <code>hide(target)</code> and <code>mc-*-tooltip-hide</code> event <code>detail.target</code>.</td></tr>
          <tr><td><code>tooltip.enabled</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show or hide the unified chart tooltip singleton.</td></tr>
          <tr><td><code>tooltip.position</code></td><td><code>'item' | 'follow'</code></td><td>Per-chart default</td><td>Anchor cleanly above/below active items (<code>'item'</code>) or follow the pointer (<code>'follow'</code>). Keyboard focus always uses <code>'item'</code>.</td></tr>
          <tr><td><code>tooltip.anchorGap</code></td><td><code>number</code></td><td><code>10</code></td><td>Pixel gap between the anchored item and tooltip surface in <code>'item'</code> mode.</td></tr>
          <tr><td><code>tooltip.offsetX / offsetY</code></td><td><code>number</code></td><td><code>14</code></td><td>Horizontal and vertical pixel offset from cursor in <code>'follow'</code> mode.</td></tr>
          <tr><td><code>tooltip.className</code></td><td><code>string</code></td><td>—</td><td>Extra CSS class name(s) applied to the internal <code>&lt;mc-tooltip&gt;</code> host.</td></tr>
          <tr><td><code>tooltip.formatter</code></td><td><code>(payload) =&gt; string | null</code></td><td>—</td><td>Returns custom HTML/text string (or <code>null</code> to suppress).</td></tr>
          <tr><td><code>tooltip.renderer</code></td><td><code>(payload, defaultRender) =&gt; Node | string | null</code></td><td>—</td><td>Full DOM renderer; call <code>defaultRender()</code> to extend default structured markup.</td></tr>
          <tr><td><code>TooltipPayload</code></td><td><code>object</code></td><td>—</td><td>Provides <code>chartType</code>, <code>target</code> (<code>'item' | 'legend'</code>), <code>title</code>, <code>label</code>, <code>seriesId</code>, <code>category</code>, <code>value</code>, <code>formattedValue</code>, <code>color</code>, <code>percentage</code>, <code>badge</code>, <code>items[]</code>, <code>threshold</code>, <code>datum</code>, <code>data</code>, <code>positionMode</code>, <code>source</code>, <code>clientX</code>, <code>clientY</code>, and <code>anchor</code>.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(apiRef);

  return mounted;
}
