import {
  linearGradientDef,
  patternCrosshatch,
  patternDots,
  patternLines,
  patternSquares,
  radialGradientDef,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createLiveConfigEditor, createLiveHtmlEditor } from './shared';

export function renderPatternsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const style = document.createElement('style');
  style.textContent = `
    .pat-example-grid {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    }
    .pat-dual-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      min-width: 0;
    }
    @media (max-width: 1024px) {
      .pat-example-grid,
      .pat-dual-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .pat-grayscale-sim {
      filter: grayscale(1);
    }
  `;
  container.appendChild(style);

  // Intro & Built-in Reference
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.style.minWidth = '0';
  intro.innerHTML = `
    <h2 class="panel-title">SVG Patterns &amp; Gradients (<code>defs</code>, <code>fill</code> &amp; <code>&lt;mc-def&gt;</code>)</h2>
    <p class="guide-prose">
      Define reusable SVG patterns and gradients in <code>chart.config.defs</code> (or declaratively via
      <code>&lt;mc-def&gt;</code>) and apply them across <strong>all 10 chart types</strong> and matching legend swatches
      with rule-based <code>fill</code> matchers. Every <code>&lt;defs&gt;</code> ID is automatically scoped per chart
      instance so multiple charts on the same page never collide, and <code>'inherit'</code> adopts each item's palette color.
    </p>
    <div class="guide-table-wrap" style="max-width:100%;overflow-x:auto;">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Def Type / Helper</th>
            <th>Key Options</th>
            <th>Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>'dots'</code> / <code>patternDots()</code></td><td><code>background</code>, <code>color</code>, <code>size</code>, <code>padding</code>, <code>stagger</code></td><td>Color-blind accessible series distinction &amp; soft texture.</td></tr>
          <tr><td><code>'lines'</code> / <code>patternLines()</code></td><td><code>rotation</code> (<code>0</code>/<code>90</code>/<code>-45</code>), <code>spacing</code>, <code>lineWidth</code></td><td>Horizontal, vertical, or diagonal stripes &amp; threshold warning hatching.</td></tr>
          <tr><td><code>'squares'</code> / <code>patternSquares()</code></td><td><code>size</code>, <code>padding</code>, <code>stagger</code></td><td>Checkerboard &amp; geometric fills for bars, tiles, and slices.</td></tr>
          <tr><td><code>'crosshatch'</code> / <code>patternCrosshatch()</code></td><td><code>rotation</code>, <code>spacing</code>, <code>lineWidth</code></td><td>High-contrast grayscale &amp; print-friendly series fills.</td></tr>
          <tr><td><code>'linearGradient'</code> / <code>linearGradientDef()</code></td><td><code>colors</code> (strings or stops), <code>angle</code>, <code>x1/y1/x2/y2</code></td><td>Smooth multi-stop or <code>'inherit'</code> fading gradients.</td></tr>
          <tr><td><code>'radialGradient'</code> / <code>radialGradientDef()</code></td><td><code>colors</code>, <code>cx/cy/r/fx/fy</code></td><td>Luminous pie slices, scatter bubbles, and gauge arcs.</td></tr>
          <tr><td><code>'custom'</code></td><td><code>svg</code> markup or <code>render(scopedId, baseColor)</code></td><td>Arbitrary custom SVG <code>&lt;pattern&gt;</code> or gradient elements.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  // Example 1: Interactive Bar Playground + Grayscale Accessibility Simulator
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.style.minWidth = '0';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Accessible Series Patterns, Gradients &amp; Threshold Splits</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Toggle presets or edit <code>defs</code> (<code>rotation</code>, <code>spacing</code>, <code>colors</code>, <code>angle</code>),
          <code>fill</code> rules, and <code>markers</code> live in the JSON editor — notice legend swatches update automatically.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" data-pat-preset="accessible" class="btn-primary">Accessible Patterns</button>
        <button type="button" data-pat-preset="gradients">Gradients</button>
        <button type="button" data-pat-preset="threshold">Threshold Split</button>
        <button type="button" data-pat-preset="predicate">Peak Predicate</button>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="pat-grayscale-toggle" />
          Simulate Grayscale
        </label>
      </div>
    </div>
    <div class="guide-example-grid pat-example-grid">
      <div class="guide-chart-stage" id="pat-chart-1" style="min-width:0;"></div>
      <div id="pat-code-1" style="min-width:0;"></div>
    </div>
  `;
  container.appendChild(ex1);

  const stage1 = ex1.querySelector('#pat-chart-1') as HTMLElement;
  const code1 = ex1.querySelector('#pat-code-1') as HTMLElement;
  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  stage1.appendChild(bar1);
  mounted.push(bar1);

  const barData = [
    { quarter: 'Q1', Cloud: 145, Edge: 96, AI: 78 },
    { quarter: 'Q2', Cloud: 182, Edge: 118, AI: 112 },
    { quarter: 'Q3', Cloud: 215, Edge: 134, AI: 164 },
    { quarter: 'Q4', Cloud: 248, Edge: 156, AI: 218 }
  ];

  type PresetKey = 'accessible' | 'gradients' | 'threshold' | 'predicate';
  let activePreset: PresetKey = 'accessible';

  const buildEx1Preset = (preset: PresetKey): { title: string; cfg: Record<string, any> } => {
    if (preset === 'accessible') {
      return {
        title: 'Accessible Patterns with Inherited Colors (Live)',
        cfg: {
          title: 'Accessible Pattern Fills',
          palette: 'modern',
          indexBy: 'quarter',
          keys: ['Cloud', 'Edge', 'AI'],
          markers: [],
          defs: [
            patternLines('stripes', { background: 'inherit', rotation: -45, spacing: 7, lineWidth: 2 }),
            patternDots('dots', { background: 'inherit', size: 3.5, padding: 4.5, stagger: true }),
            patternCrosshatch('hatch', { background: 'inherit', spacing: 8, lineWidth: 1.5 })
          ],
          fill: [
            { match: 'Cloud', id: 'stripes' },
            { match: 'Edge', id: 'dots' },
            { match: 'AI', id: 'hatch' }
          ],
          data: barData
        }
      };
    }

    if (preset === 'gradients') {
      return {
        title: 'Linear Gradients Config (Live)',
        cfg: {
          title: 'Linear Gradients (Multi-Stop & Inherit)',
          palette: 'ocean',
          indexBy: 'quarter',
          keys: ['Cloud', 'Edge', 'AI'],
          markers: [],
          defs: [
            linearGradientDef('cloud-grad', ['#6366f1', '#38bdf8']),
            linearGradientDef('edge-grad', ['#10b981', '#06b6d4'], { angle: 30 }),
            linearGradientDef('inherit-fade', [
              { offset: 0, color: 'inherit', opacity: 1 },
              { offset: 100, color: 'inherit', opacity: 0.32 }
            ])
          ],
          fill: [
            { match: 'Cloud', id: 'cloud-grad' },
            { match: 'Edge', id: 'edge-grad' },
            { match: '*', id: 'inherit-fade' }
          ],
          data: barData
        }
      };
    }

    if (preset === 'threshold') {
      return {
        title: 'Patterns + Partial Thresholds Config (Live)',
        cfg: {
          title: 'Threshold Split with Striped Cap',
          palette: 'modern',
          indexBy: 'quarter',
          keys: ['Cloud', 'Edge'],
          defs: [
            linearGradientDef('base-soft', [
              { offset: 0, color: 'inherit', opacity: 0.95 },
              { offset: 100, color: 'inherit', opacity: 0.55 }
            ]),
            patternLines('alert-stripes', {
              background: '#ef4444',
              color: 'rgba(255,255,255,0.55)',
              rotation: -45,
              spacing: 6,
              lineWidth: 2
            })
          ],
          fill: [{ match: '*', id: 'base-soft' }],
          markers: [
            {
              id: 'sla-cap',
              axis: 'y',
              value: 175,
              label: 'Target Cap (175)',
              condition: 'above',
              matchStyle: {
                fill: 'alert-stripes',
                stroke: '#dc2626'
              }
            }
          ],
          data: barData
        }
      };
    }

    return {
      title: 'Rule-Based Datum Predicate Config (Live)',
      cfg: {
        title: 'Datum Predicate (Bars >= 200)',
        palette: 'sunset',
        indexBy: 'quarter',
        keys: ['Cloud', 'Edge', 'AI'],
        markers: [],
        defs: [
          linearGradientDef('peak-gold', ['#fbbf24', '#f97316']),
          patternSquares('subtle-grid', {
            background: 'inherit',
            color: 'rgba(255,255,255,0.28)',
            size: 3,
            padding: 4
          })
        ],
        fill: [
          { match: (d: any) => Number(d.value) >= 200, id: 'peak-gold' },
          { match: '*', id: 'subtle-grid' }
        ],
        data: barData
      }
    };
  };

  const applyBar1Config = (cfg: Record<string, any>) => {
    bar1.setConfig({
      autoSize: true,
      themeMode,
      borderRadius: 6,
      ...cfg
    });
  };

  const initialPat1 = buildEx1Preset('accessible');
  applyBar1Config(initialPat1.cfg);

  const editor1 = createLiveConfigEditor({
    title: initialPat1.title,
    initialConfig: initialPat1.cfg,
    hint: 'Edit defs (rotation, spacing, size, colors, angle), fill matchers, markers, or data live.',
    onConfigChange: applyBar1Config,
    onReset: () => {
      const next = buildEx1Preset(activePreset);
      applyBar1Config(next.cfg);
      editor1.syncConfig(next.cfg, { title: next.title });
    }
  });
  code1.appendChild(editor1.element);

  ex1.querySelectorAll<HTMLButtonElement>('[data-pat-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activePreset = btn.dataset.patPreset as PresetKey;
      ex1
        .querySelectorAll<HTMLButtonElement>('[data-pat-preset]')
        .forEach((b) =>
          b.classList.toggle('btn-primary', b.dataset.patPreset === activePreset)
        );
      const next = buildEx1Preset(activePreset);
      applyBar1Config(next.cfg);
      editor1.syncConfig(next.cfg, { title: next.title });
    });
  });

  (ex1.querySelector('#pat-grayscale-toggle') as HTMLInputElement).addEventListener(
    'change',
    (e) => {
      stage1.classList.toggle(
        'pat-grayscale-sim',
        (e.target as HTMLInputElement).checked
      );
    }
  );

  // Example 2: Multi-Chart Gallery (Pie Patterns & Radial Gradients + Line Area Patterns) + Live Editor
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.style.minWidth = '0';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Pie Slices, Area Fills &amp; Custom SVG Patterns</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Both charts reuse IDs like <code>dots</code> independently — <code>PatternEngine</code> scopes every
          <code>&lt;defs&gt;</code> ID per chart instance. Switch between Pie &amp; Line below to live-edit either chart's patterns.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" data-pat2-tab="pie" class="btn-primary">Edit Pie Config</button>
        <button type="button" data-pat2-tab="line">Edit Line Area Config</button>
      </div>
    </div>
    <div class="pat-dual-grid">
      <div class="guide-chart-stage" id="pat-chart-pie" style="min-width:0;"></div>
      <div class="guide-chart-stage" id="pat-chart-line" style="min-width:0;"></div>
    </div>
    <div id="pat-code-2" style="margin-top:14px;"></div>
  `;
  container.appendChild(ex2);

  const pie2 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  const line2 = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex2.querySelector('#pat-chart-pie')!.appendChild(pie2);
  ex2.querySelector('#pat-chart-line')!.appendChild(line2);
  mounted.push(pie2, line2);

  const defaultPie2Cfg = {
    title: 'Pie: Gradient, Dots, Squares & Wave',
    palette: 'modern',
    innerRadius: 0.5,
    data: [
      { id: 'Compute', value: 420 },
      { id: 'Storage', value: 310 },
      { id: 'AI Ops', value: 245 },
      { id: 'Network', value: 165 }
    ],
    defs: [
      radialGradientDef('glow', ['#818cf8', '#4338ca']),
      patternDots('dots', { background: 'inherit', size: 4, padding: 4, stagger: true }),
      patternSquares('squares', { background: 'inherit', size: 4, padding: 4 }),
      {
        id: 'wave',
        type: 'custom' as const,
        width: 12,
        height: 8,
        svg: '<rect width="12" height="8" fill="inherit"/><path d="M0,4 Q3,0 6,4 T12,4" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.6"/>'
      }
    ],
    fill: [
      { match: 'Compute', id: 'glow' },
      { match: 'Storage', id: 'dots' },
      { match: 'AI Ops', id: 'squares' },
      { match: 'Network', id: 'wave' }
    ]
  };

  const defaultLine2Cfg = {
    title: 'Line Area: Striped & Dotted Area Fills',
    palette: 'emerald',
    enableArea: true,
    areaOpacity: 0.42,
    data: [
      {
        id: 'Organic',
        data: [
          { x: 'Jan', y: 42 },
          { x: 'Feb', y: 58 },
          { x: 'Mar', y: 66 },
          { x: 'Apr', y: 74 },
          { x: 'May', y: 92 }
        ]
      },
      {
        id: 'Paid',
        data: [
          { x: 'Jan', y: 24 },
          { x: 'Feb', y: 31 },
          { x: 'Mar', y: 29 },
          { x: 'Apr', y: 45 },
          { x: 'May', y: 54 }
        ]
      }
    ],
    defs: [
      patternLines('area-stripes', {
        background: 'transparent',
        color: 'inherit',
        rotation: -45,
        spacing: 7,
        lineWidth: 2,
        opacity: 0.55
      }),
      patternDots('dots', {
        background: 'transparent',
        color: 'inherit',
        size: 3.5,
        padding: 4.5,
        opacity: 0.65
      })
    ],
    fill: [
      { match: 'Organic', id: 'area-stripes' },
      { match: 'Paid', id: 'dots' }
    ]
  };

  let currentPie2Cfg: Record<string, any> = defaultPie2Cfg;
  let currentLine2Cfg: Record<string, any> = defaultLine2Cfg;
  let activePat2Tab: 'pie' | 'line' = 'pie';

  const applyPie2 = (cfg: Record<string, any>) => {
    currentPie2Cfg = cfg;
    pie2.setConfig({ autoSize: true, themeMode, ...cfg });
  };
  const applyLine2 = (cfg: Record<string, any>) => {
    currentLine2Cfg = cfg;
    line2.setConfig({ autoSize: true, themeMode, ...cfg });
  };

  applyPie2(defaultPie2Cfg);
  applyLine2(defaultLine2Cfg);

  const editor2 = createLiveConfigEditor<Record<string, any>>({
    title: 'Pie Patterns & Custom SVG Defs (Live)',
    initialConfig: defaultPie2Cfg,
    hint: 'Edit radialGradient colors, pattern sizes, custom wave SVG, or switch tab to edit the Line Area chart.',
    onConfigChange: (nextCfg) => {
      if (activePat2Tab === 'pie') applyPie2(nextCfg);
      else applyLine2(nextCfg);
    },
    onReset: () => {
      if (activePat2Tab === 'pie') {
        applyPie2(defaultPie2Cfg);
        editor2.syncConfig(defaultPie2Cfg, {
          title: 'Pie Patterns & Custom SVG Defs (Live)'
        });
      } else {
        applyLine2(defaultLine2Cfg);
        editor2.syncConfig(defaultLine2Cfg, {
          title: 'Line Area Pattern Fills (Live)'
        });
      }
    }
  });
  ex2.querySelector('#pat-code-2')!.appendChild(editor2.element);

  ex2.querySelectorAll<HTMLButtonElement>('[data-pat2-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activePat2Tab = btn.dataset.pat2Tab as 'pie' | 'line';
      ex2
        .querySelectorAll<HTMLButtonElement>('[data-pat2-tab]')
        .forEach((b) =>
          b.classList.toggle('btn-primary', b.dataset.pat2Tab === activePat2Tab)
        );
      if (activePat2Tab === 'pie') {
        editor2.syncConfig(currentPie2Cfg, {
          title: 'Pie Patterns & Custom SVG Defs (Live)'
        });
      } else {
        editor2.syncConfig(currentLine2Cfg, {
          title: 'Line Area Pattern Fills (Live)'
        });
      }
    });
  });

  // Example 3: Live Declarative <mc-def> HTML Support
  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.style.minWidth = '0';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Declarative <code>&lt;mc-def&gt;</code> Web Component</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Edit the <code>&lt;mc-def&gt;</code> attributes below (change <code>colors</code>, <code>angle</code>, or switch
          <code>type</code> to <code>"lines"</code> / <code>"dots"</code> / <code>"crosshatch"</code>) to update the gauge live.
        </p>
      </div>
    </div>
    <div class="guide-example-grid pat-example-grid">
      <div class="guide-chart-stage" id="pat-chart-3" style="min-width:0;"></div>
      <div id="pat-code-3" style="min-width:0;"></div>
    </div>
  `;
  container.appendChild(ex3);

  const gauge3 = document.createElement('mc-gauge-chart') as MCBaseChart<any>;
  ex3.querySelector('#pat-chart-3')!.appendChild(gauge3);
  mounted.push(gauge3);

  const initialGaugeMarkup = `<mc-gauge-chart>
  <mc-def
    def-id="gauge-grad"
    type="linearGradient"
    match="*"
    colors="#38bdf8,#6366f1,#a855f7"
    angle="90"
  ></mc-def>
</mc-gauge-chart>`;

  const editor3 = createLiveHtmlEditor({
    title: 'Declarative <mc-def> Markup (Live)',
    chartTag: 'mc-gauge-chart',
    initialMarkup: initialGaugeMarkup,
    hint: 'Try changing colors="#10b981,#f59e0b,#ef4444", angle="45", or type="lines" spacing="7" rotation="-45".',
    onMarkupApply: ({ children }) => {
      gauge3.replaceChildren(...children);
      gauge3.setConfig({
        data: { value: 84, min: 0, max: 100, unit: '%', label: 'Throughput' },
        autoSize: true,
        themeMode,
        palette: 'modern',
        title: 'Gauge with Declarative <mc-def>'
      });
    }
  });
  editor3.applyCurrent();
  ex3.querySelector('#pat-code-3')!.appendChild(editor3.element);

  return mounted;
}
