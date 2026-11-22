import type {
  MCBaseChart,
  MCTooltipElement,
  ThemeModePreference,
  TooltipPayload
} from '../../../src/index';
import { createCodeBlock } from './shared';

export function renderTooltipsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Architecture & CSS ::part() Reference Card
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="guide-section-title">How Unified <code>&lt;mc-tooltip&gt;</code> Works</h2>
    <p class="guide-prose">
      Every single chart in <code>modern-charts</code> (all 10 chart components) shares one unified
      <code>&lt;mc-tooltip&gt;</code> Web Component. For maximum runtime performance, each chart creates
      <strong>strictly one <code>&lt;mc-tooltip&gt;</code> instance</strong> inside its Shadow DOM and reuses it
      in-place as the pointer moves across items — avoiding DOM churn even on dense charts.
    </p>
    <p class="guide-prose">
      Whenever an item or slice is hovered, the chart passes a complete structured <code>TooltipPayload</code>
      (<code>chartType</code>, <code>title</code>, <code>label</code>, <code>seriesId</code>, <code>category</code>,
      <code>value</code>, <code>formattedValue</code>, <code>color</code>, <code>percentage</code>, <code>items[]</code>,
      <code>threshold</code>, <code>datum</code>, and the full chart <code>data</code>) to your custom
      <code>tooltip.formatter</code>, <code>tooltip.renderer</code>, declarative <code>&lt;mc-tooltip&gt;</code>, and
      <code>mc-tooltip-show</code> event listeners.
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

  // Example 1: Styling via CSS ::part() (Zero JavaScript!)
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <style>
      .guide-css-part-bar::part(tooltip) {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
        border: 1px solid #38bdf8;
        border-radius: 12px;
        padding: 10px 14px;
        box-shadow: 0 14px 36px rgba(56, 189, 248, 0.25);
        color: #f8fafc;
      }
      .guide-css-part-bar::part(tooltip-header) {
        color: #38bdf8;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(56, 189, 248, 0.22);
        padding-bottom: 4px;
        margin-bottom: 6px;
      }
      .guide-css-part-bar::part(tooltip-swatch) {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }
      .guide-css-part-bar::part(tooltip-value) {
        color: #fbbf24;
        font-size: 13px;
      }
      .guide-css-part-bar::part(tooltip-badge) {
        background: rgba(239, 68, 68, 0.16);
        border: 1px solid rgba(239, 68, 68, 0.35);
        border-radius: 6px;
        padding: 2px 6px;
        margin-top: 6px;
      }
    </style>
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 1: Pure CSS Styling via <code>::part()</code></h3>
        <p class="guide-prose">
          Hover any bar below. All visual styling — cyan border glow, uppercase header, square swatches, amber values,
          and threshold pill — is applied purely via standard CSS <code>::part(...)</code> selectors with zero custom JS.
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
    palette: 'modern',
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

  ex1.querySelector('#guide-tooltip-code-1')!.appendChild(
    createCodeBlock(
      `
/* Style any chart's unified <mc-tooltip> directly from CSS */
mc-bar-chart::part(tooltip) {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid #38bdf8;
  border-radius: 12px;
  padding: 10px 14px;
  color: #f8fafc;
}

mc-bar-chart::part(tooltip-header) {
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

mc-bar-chart::part(tooltip-swatch) {
  border-radius: 3px;
}

mc-bar-chart::part(tooltip-value) {
  color: #fbbf24;
}

mc-bar-chart::part(tooltip-badge) {
  background: rgba(239, 68, 68, 0.16);
  border-radius: 6px;
  padding: 2px 6px;
}
      `,
      'Pure CSS ::part() Styling'
    )
  );

  // Example 2: Custom tooltip.renderer receiving ALL chart & slice data
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 2: Custom <code>tooltip.renderer</code> with Full Data Access</h3>
        <p class="guide-prose">
          Hover across the line chart below. The custom <code>tooltip.renderer(payload, defaultRender)</code> receives
          all series points in <code>payload.items</code> plus <code>payload.datum</code>, letting you compute derived
          metrics (Total &amp; YoY Spread) on the fly and return a custom DOM element (or wrap <code>defaultRender()</code>).
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
  line2.config = {
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
    curve: 'monotoneX',
    enableArea: true,
    enableSlices: true,
    themeMode,
    palette: 'ocean',
    title: 'Hover Across Months for Computed KPI Tooltip',
    tooltip: {
      offsetX: 16,
      offsetY: 10,
      renderer: (payload: TooltipPayload, defaultRender) => {
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
          val.textContent = `${delta >= 0 ? '+' : ''}${delta} (+${pct}%)`;
          footer.append(lbl, val);
          card.appendChild(footer);
        }
        return card;
      }
    }
  };
  mounted.push(line2);

  ex2.querySelector('#guide-tooltip-code-2')!.appendChild(
    createCodeBlock(
      `
chart.config = {
  data: seriesData,
  enableSlices: true,
  tooltip: {
    offsetX: 16,
    offsetY: 10,
    // Receives full TooltipPayload + defaultRender() helper
    renderer: (payload, defaultRender) => {
      const card = document.createElement('div');
      card.appendChild(defaultRender());

      const [actual, baseline] = payload.items ?? [];
      const delta = Number(actual.value) - Number(baseline.value);
      const footer = document.createElement('div');
      footer.textContent = \`YoY Lift: +\${delta}\`;
      card.appendChild(footer);
      return card;
    }
  }
};
      `,
      'Extending defaultRender() with Custom Data'
    )
  );

  // Example 3: Declarative <mc-tooltip> Child Element + Template / Formatter
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.innerHTML = `
    <div class="guide-example-head">
      <div>
        <h3 class="guide-example-title">Example 3: Declarative <code>&lt;mc-tooltip&gt;</code> Child &amp; <code>&lt;template&gt;</code></h3>
        <p class="guide-prose">
          Drop an <code>&lt;mc-tooltip&gt;</code> element directly inside any chart tag with a <code>&lt;template&gt;</code>
          (using safe HTML-escaped <code>{{title}}</code>, <code>{{value}}</code>, <code>{{percentage}}</code>, and
          <code>{{datum.*}}</code> tokens) or assign <code>.formatter</code> / <code>enabled="false"</code>.
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
  const declTip = document.createElement('mc-tooltip') as MCTooltipElement;
  declTip.setAttribute('offset-x', '18');
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <div style="font-weight:700;margin-bottom:2px;">{{title}}</div>
    <div style="font-size:12px;">Allocation: <strong>\${{value}}K</strong> ({{percentage}})</div>
    <div style="font-size:11px;opacity:0.75;margin-top:2px;">Owner: {{datum.owner}}</div>
  `;
  declTip.appendChild(tpl);
  pie3.appendChild(declTip);
  ex3.querySelector('#guide-tooltip-chart-3')!.appendChild(pie3);
  pie3.config = {
    data: [
      { id: 'Compute', label: 'Compute', value: 420, owner: 'Infra Team' } as any,
      { id: 'AI', label: 'AI / GPU', value: 360, owner: 'ML Platform' } as any,
      { id: 'Storage', label: 'Storage', value: 210, owner: 'Data Core' } as any,
      { id: 'Network', label: 'Network', value: 140, owner: 'Edge Ops' } as any
    ],
    innerRadius: 0.56,
    themeMode,
    palette: 'sunset',
    title: 'Declarative <mc-tooltip> with {{datum.owner}}'
  };
  mounted.push(pie3);

  ex3.querySelector('#guide-tooltip-code-3')!.appendChild(
    createCodeBlock(
      `
<mc-pie-chart id="cost-pie" inner-radius="0.56">
  <mc-tooltip offset-x="18">
    <template>
      <div style="font-weight:700">{{title}}</div>
      <div>Allocation: <strong>\${{value}}K</strong> ({{percentage}})</div>
      <div>Owner: {{datum.owner}}</div>
    </template>
  </mc-tooltip>
</mc-pie-chart>

<!-- Or disable tooltips entirely: -->
<!-- chart.config = { ..., tooltip: false }; -->
<!-- <mc-tooltip enabled="false"></mc-tooltip> -->
      `,
      'Declarative <mc-tooltip> with <template>'
    )
  );

  // Example 4: Configurable Tooltip Positioning ('item' vs 'follow' + Keyboard Tab/Arrow)
  const ex4 = document.createElement('section');
  ex4.className = 'panel-card guide-section';
  ex4.innerHTML = `
    <div class="guide-example-header">
      <div>
        <h3 class="guide-example-title">4. Configurable Positioning: Item-Anchored vs. Follow Mouse</h3>
        <p class="guide-prose">
          Toggle between <code>position: 'item'</code> (snaps cleanly on top of each bar/point/cell and flips below near the top edge)
          and <code>position: 'follow'</code> (glides with the mouse pointer with automatic edge flipping).
          Try pressing <strong>Tab</strong> and <strong>Arrow</strong> keys on the chart — keyboard focus always anchors cleanly to the active item.
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
  const bar4BaseConfig = {
    data: [
      { quarter: 'Q1', Cloud: 142, Edge: 88, AI: 64 },
      { quarter: 'Q2', Cloud: 168, Edge: 104, AI: 96 },
      { quarter: 'Q3', Cloud: 190, Edge: 118, AI: 132 },
      { quarter: 'Q4', Cloud: 215, Edge: 136, AI: 168 }
    ],
    indexBy: 'quarter',
    keys: ['Cloud', 'Edge', 'AI'],
    themeMode,
    palette: 'modern' as const,
    title: 'Hover or Tab through bars — Tooltip Position: item',
    tooltip: {
      position: 'item' as 'item' | 'follow',
      anchorGap: 10
    }
  };
  bar4.config = bar4BaseConfig;
  mounted.push(bar4);

  ex4.querySelectorAll('button[data-pos-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-pos-mode') as 'item' | 'follow';
      ex4
        .querySelectorAll('button[data-pos-mode]')
        .forEach((b) => b.classList.toggle('active', b === btn));
      bar4.config = {
        ...bar4.config,
        title: `Hover or Tab through bars — Tooltip Position: ${mode}`,
        tooltip: {
          position: mode,
          anchorGap: 10
        }
      };
    });
  });

  ex4.querySelector('#guide-tooltip-code-4')!.appendChild(
    createCodeBlock(
      `
// 1. Config API (per-chart defaults: 'item' for bar/scatter/radar/gauge, 'follow' for line/pie/sunburst/heatmap/treemap/sankey)
chart.config = {
  ...config,
  tooltip: {
    position: 'item',  // or 'follow'
    anchorGap: 10      // gap in px above/below anchored item
  }
};

// 2. HTML attribute shorthand on any chart
// <mc-bar-chart tooltip-position="follow"></mc-bar-chart>

// 3. Declarative <mc-tooltip> child
// <mc-heatmap-chart>
//   <mc-tooltip position="item" anchor-gap="8"></mc-tooltip>
// </mc-heatmap-chart>
      `,
      'Tooltip Positioning Modes (item vs. follow)'
    )
  );

  return mounted;
}
