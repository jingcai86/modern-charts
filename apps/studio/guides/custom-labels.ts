import type {
  LabelDescriptor,
  MCBaseChart,
  MeasuredLabel,
  ThemeModePreference
} from '../../../src/index';
import { createLiveConfigEditor } from './shared';

export function renderCustomLabelsGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Universal Label Architecture (<code>&lt;mc-label&gt;</code> &amp; <code>@chenglou/pretext</code>)</h2>
    <p class="guide-prose">
      Every single text element in <code>modern-charts</code> — titles, axis ticks, bar/point values, donut arcs,
      marker callouts, and legends — flows through <code>LabelEngine</code> and is measured via
      <code>@chenglou/pretext</code> with <strong>zero DOM layout reflow</strong>. You can customize labels at three levels:
    </p>
    <div class="guide-pillars-grid">
      <div class="guide-pillar-card">
        <h3>1. SVG Mode (<code>'svg'</code>)</h3>
        <p>Renders crisp SVG <code>&lt;text&gt;</code>/<code>&lt;tspan&gt;</code> with automatic Pretext line wrapping, custom <code>formatter</code> strings/functions, backgrounds, and padding.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>2. Rich HTML Mode (<code>'foreignObject'</code>)</h3>
        <p>Renders Pretext-sized SVG <code>&lt;foreignObject&gt;</code> HTML pills with inline SVG icons (<code>icon</code>, <code>iconPosition</code>) and custom <code>templateHtml</code>.</p>
      </div>
      <div class="guide-pillar-card">
        <h3>3. Full Custom Renderer (<code>labelRenderer</code>)</h3>
        <p>Take complete programmatic control via <code>(descriptor, measured, defaultRender) =&gt; SVGElement | HTMLElement</code> with exact Pretext dimensions pre-computed for you.</p>
      </div>
    </div>
  `;
  container.appendChild(introCard);

  // Example 1: Interactive 3-Mode Label Switcher on <mc-bar-chart>
  const ex1 = document.createElement('section');
  ex1.className = 'panel-card guide-section';
  ex1.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 1: Formatters, Rich <code>&lt;foreignObject&gt;</code> Icons &amp; Custom <code>labelRenderer</code></h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Switch between the 3 label customization approaches — or edit <code>formatter</code> (e.g. <code>'\${{text}}K'</code>), <code>background</code>, <code>icon</code>, and <code>data</code> directly in the live config editor.
        </p>
      </div>
      <div class="guide-controls-row">
        <button type="button" id="btn-lbl-svg" class="btn-primary">SVG Formatter</button>
        <button type="button" id="btn-lbl-fo">foreignObject + Icons</button>
        <button type="button" id="btn-lbl-custom">Custom labelRenderer</button>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-1"></div>
      <div id="guide-label-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);

  const labelChart1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex1.querySelector('#guide-label-chart-1')!.appendChild(labelChart1);
  mounted.push(labelChart1);

  const labelCode1 = ex1.querySelector('#guide-label-code-1') as HTMLElement;

  const defaultSalesData = [
    { quarter: 'Q1', Revenue: 142 },
    { quarter: 'Q2', Revenue: 168 },
    { quarter: 'Q3', Revenue: 196 },
    { quarter: 'Q4', Revenue: 248 }
  ];

  const TREND_UP_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 11L12 4M12 4H6M12 4V10"/></svg>`;

  type DemoLabelMode = 'svg' | 'foreignObject' | 'custom';
  let activeLabelDemo: DemoLabelMode = 'svg';
  let latestSalesData = defaultSalesData;

  const customPillRenderer = (
    descriptor: LabelDescriptor,
    measured: MeasuredLabel,
    defaultRender: () => SVGGElement
  ) => {
    if (descriptor.type !== 'data') return defaultRender();

    const total = Math.max(
      1,
      latestSalesData.reduce((s, d) => s + Number(d.Revenue ?? 0), 0)
    );
    const val = Number(descriptor.text);
    const share = Math.round((val / total) * 100);
    const isTop = val >= 200;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const pillW = Math.max(measured.boxWidth + 32, 74);
    const pillH = 24;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(descriptor.x - pillW / 2));
    rect.setAttribute('y', String(descriptor.y - pillH / 2));
    rect.setAttribute('width', String(pillW));
    rect.setAttribute('height', String(pillH));
    rect.setAttribute('rx', '12');
    rect.setAttribute('fill', isTop ? '#f59e0b' : '#1e293b');
    rect.setAttribute('stroke', isTop ? '#fef3c7' : '#6366f1');
    rect.setAttribute('stroke-width', '1.4');
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(descriptor.x));
    text.setAttribute('y', String(descriptor.y + 4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', isTop ? '#0f172a' : '#f8fafc');
    text.textContent = `${isTop ? '★ ' : ''}$${val}K (${share}%)`;
    g.appendChild(text);

    return g;
  };

  const buildLabelDemo1Config = (mode: DemoLabelMode): { title: string; cfg: Record<string, any> } => {
    if (mode === 'svg') {
      return {
        title: 'SVG Label Overrides & Formatters (Live)',
        cfg: {
          title: 'Mode 1: SVG Formatter + Pill Background',
          data: defaultSalesData,
          labelMode: 'svg',
          label: [
            {
              target: 'data',
              formatter: '${{text}}K',
              fontWeight: 700,
              fontSize: 12,
              color: '#ffffff',
              background: 'rgba(15, 23, 42, 0.55)',
              borderRadius: 5,
              padding: { top: 2, right: 6, bottom: 2, left: 6 }
            },
            {
              target: 'axis-tick',
              formatter: (text: string) => (/^\d+$/.test(text) ? `$${text}K` : text)
            }
          ]
        }
      };
    }

    if (mode === 'foreignObject') {
      return {
        title: 'Rich <foreignObject> Labels with Icons (Live)',
        cfg: {
          title: 'Mode 2: Pretext-Measured <foreignObject> with SVG Icons',
          data: defaultSalesData,
          labelMode: 'foreignObject',
          label: {
            target: 'data',
            renderMode: 'foreignObject',
            formatter: '${{text}}K',
            icon: TREND_UP_SVG,
            iconPosition: 'start',
            iconSize: 12,
            iconGap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: '#ecfdf5',
            background: 'rgba(5, 150, 105, 0.85)',
            borderRadius: 999,
            padding: { top: 3, right: 8, bottom: 3, left: 7 }
          }
        }
      };
    }

    return {
      title: 'Custom Programmatic labelRenderer Config (Live)',
      cfg: {
        title: 'Mode 3: Custom labelRenderer (Pretext Measured)',
        data: defaultSalesData,
        labelMode: 'custom',
        labelRenderer: customPillRenderer
      }
    };
  };

  const applyLabelChart1 = (cfg: Record<string, any>) => {
    if (Array.isArray(cfg.data)) {
      latestSalesData = cfg.data;
    }
    labelChart1.setConfig({
      autoSize: true,
      themeMode,
      palette: 'shadcn',
      indexBy: 'quarter',
      keys: ['Revenue'],
      enableLabels: true,
      borderRadius: 8,
      yScale: { type: 'linear', min: 0, max: 290 },
      margin: { top: 44, right: 24, bottom: 52, left: 54 },
      layers: ['grid', 'axes', 'bars', 'labels'],
      labelRenderer: undefined,
      label: undefined,
      ...cfg
    });
  };

  const initial1 = buildLabelDemo1Config('svg');
  applyLabelChart1(initial1.cfg);

  const editor1 = createLiveConfigEditor({
    title: initial1.title,
    initialConfig: initial1.cfg,
    hint: 'Edit formatter ("${{text}}K"), colors, icon, background, or data values — updates chart live.',
    onConfigChange: (nextCfg) => {
      applyLabelChart1(nextCfg);
    },
    onReset: () => {
      const next = buildLabelDemo1Config(activeLabelDemo);
      applyLabelChart1(next.cfg);
      editor1.syncConfig(next.cfg, { title: next.title });
    }
  });
  labelCode1.appendChild(editor1.element);

  const btnSvg = ex1.querySelector('#btn-lbl-svg') as HTMLButtonElement;
  const btnFo = ex1.querySelector('#btn-lbl-fo') as HTMLButtonElement;
  const btnCustom = ex1.querySelector('#btn-lbl-custom') as HTMLButtonElement;

  const syncLabelBtns = () => {
    btnSvg.classList.toggle('btn-primary', activeLabelDemo === 'svg');
    btnFo.classList.toggle('btn-primary', activeLabelDemo === 'foreignObject');
    btnCustom.classList.toggle('btn-primary', activeLabelDemo === 'custom');
  };

  const selectDemo1Mode = (mode: DemoLabelMode) => {
    activeLabelDemo = mode;
    syncLabelBtns();
    const next = buildLabelDemo1Config(mode);
    applyLabelChart1(next.cfg);
    editor1.syncConfig(next.cfg, { title: next.title });
  };

  btnSvg.addEventListener('click', () => selectDemo1Mode('svg'));
  btnFo.addEventListener('click', () => selectDemo1Mode('foreignObject'));
  btnCustom.addEventListener('click', () => selectDemo1Mode('custom'));

  // Example 2: Interactive Pretext Truncation, Rotation & Tooltip Playground (<mc-truncate>)
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Pretext Label Truncation, Rotation &amp; Tooltips (<code>&lt;mc-truncate&gt;</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Every <code>&lt;mc-label&gt;</code> uses the shared <code>@chenglou/pretext</code> truncation engine.
          Use the controls or edit <code>label.overflow</code> &amp; <code>data</code> directly in the live config editor below.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" data-ov-strat="truncate" class="btn-primary">truncate</button>
        <button type="button" data-ov-strat="rotate">rotate</button>
        <button type="button" data-ov-strat="both">both</button>
        <button type="button" data-ov-strat="wrap">wrap</button>
        <button type="button" data-ov-strat="none">none</button>
      </div>
    </div>
    <div class="guide-controls-row" style="flex-wrap:wrap;gap:14px;margin:0 0 12px;">
      <label for="lbl-maxwidth-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxWidth</code>: <strong id="lbl-maxwidth-val">82px</strong>
        <input type="range" id="lbl-maxwidth-slider" min="48" max="170" step="2" value="82" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label for="lbl-maxchars-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxChars</code>: <strong id="lbl-maxchars-val">off</strong>
        <input type="range" id="lbl-maxchars-slider" min="0" max="26" step="1" value="0" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label for="lbl-maxrot-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxRotation</code>: <strong id="lbl-maxrot-val">-45°</strong>
        <input type="range" id="lbl-maxrot-slider" min="-90" max="90" step="5" value="-45" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="lbl-tooltip-toggle" checked />
        <code>enableTooltip</code> (hover/Tab truncated labels)
      </label>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-label-chart-2"></div>
      <div id="guide-label-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const wrapChart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-label-chart-2')!.appendChild(wrapChart);
  mounted.push(wrapChart);

  const code2Host = ex2.querySelector('#guide-label-code-2') as HTMLElement;

  let ovStrategy: 'truncate' | 'rotate' | 'both' | 'wrap' | 'none' = 'truncate';
  let tickMaxWidth = 82;
  let tickMaxChars = 0;
  let tickMaxRotation = -45;
  let tickEnableTooltip = true;

  const deptData = [
    { dept: 'Cloud Platform Engineering', Spend: 214 },
    { dept: 'Applied Machine Learning', Spend: 186 },
    { dept: 'Security & Compliance Ops', Spend: 129 },
    { dept: 'Developer Experience Tools', Spend: 158 }
  ];

  const buildOverflowConfig = () => {
    const overflowCfg: Record<string, any> = {
      strategy: ovStrategy,
      maxWidth: tickMaxWidth,
      maxRotation: tickMaxRotation,
      enableTooltip: tickEnableTooltip
    };
    if (tickMaxChars > 0) overflowCfg.maxChars = tickMaxChars;

    return {
      title: `Pretext Overflow: strategy="${ovStrategy}" (maxWidth: ${tickMaxWidth}px${
        tickMaxChars > 0 ? `, maxChars: ${tickMaxChars}` : ''
      })`,
      data: deptData,
      label: {
        target: 'axis-tick',
        overflow: overflowCfg,
        fontSize: 11
      }
    };
  };

  const applyOverflowConfig = (cfg: Record<string, any>) => {
    const strat = cfg.label?.overflow?.strategy ?? ovStrategy;
    wrapChart.setConfig({
      autoSize: true,
      themeMode,
      palette: 'material',
      indexBy: 'dept',
      keys: ['Spend'],
      borderRadius: 6,
      margin: {
        top: 44,
        right: 24,
        bottom: strat === 'rotate' || strat === 'both' ? 116 : 84,
        left: 50
      },
      layers: ['grid', 'axes', 'bars', 'labels'],
      ...cfg
    });
  };

  const stratButtons = Array.from(
    ex2.querySelectorAll<HTMLButtonElement>('[data-ov-strat]')
  );
  const mwSlider = ex2.querySelector('#lbl-maxwidth-slider') as HTMLInputElement;
  const mwVal = ex2.querySelector('#lbl-maxwidth-val') as HTMLElement;
  const mcSlider = ex2.querySelector('#lbl-maxchars-slider') as HTMLInputElement;
  const mcVal = ex2.querySelector('#lbl-maxchars-val') as HTMLElement;
  const rotSlider = ex2.querySelector('#lbl-maxrot-slider') as HTMLInputElement;
  const rotVal = ex2.querySelector('#lbl-maxrot-val') as HTMLElement;
  const tipToggle = ex2.querySelector('#lbl-tooltip-toggle') as HTMLInputElement;

  const syncOverflowControls = () => {
    stratButtons.forEach((b) =>
      b.classList.toggle('btn-primary', b.dataset.ovStrat === ovStrategy)
    );
    mwSlider.value = String(tickMaxWidth);
    mwVal.textContent = `${tickMaxWidth}px`;
    mcSlider.value = String(tickMaxChars);
    mcVal.textContent = tickMaxChars > 0 ? String(tickMaxChars) : 'off';
    rotSlider.value = String(tickMaxRotation);
    rotVal.textContent = `${tickMaxRotation}°`;
    tipToggle.checked = tickEnableTooltip;
  };

  const initialOvCfg = buildOverflowConfig();
  applyOverflowConfig(initialOvCfg);

  const editor2 = createLiveConfigEditor({
    title: 'Pretext Truncation, Rotation & Tooltip Config (Live)',
    initialConfig: initialOvCfg,
    hint: 'Edit strategy, maxWidth, maxChars, maxRotation, enableTooltip, or category text live.',
    onConfigChange: (nextCfg) => {
      const ov = nextCfg.label?.overflow;
      if (ov) {
        if (ov.strategy) ovStrategy = ov.strategy;
        if (typeof ov.maxWidth === 'number') tickMaxWidth = ov.maxWidth;
        if (typeof ov.maxChars === 'number') tickMaxChars = ov.maxChars;
        if (typeof ov.maxRotation === 'number') tickMaxRotation = ov.maxRotation;
        if (typeof ov.enableTooltip === 'boolean') tickEnableTooltip = ov.enableTooltip;
        syncOverflowControls();
      }
      applyOverflowConfig(nextCfg);
    },
    onReset: () => {
      ovStrategy = 'truncate';
      tickMaxWidth = 82;
      tickMaxChars = 0;
      tickMaxRotation = -45;
      tickEnableTooltip = true;
      syncOverflowControls();
      const resetCfg = buildOverflowConfig();
      applyOverflowConfig(resetCfg);
      editor2.syncConfig(resetCfg);
    }
  });
  code2Host.appendChild(editor2.element);

  const updateFromControls = () => {
    syncOverflowControls();
    const nextCfg = buildOverflowConfig();
    applyOverflowConfig(nextCfg);
    editor2.syncConfig(nextCfg);
  };

  stratButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      ovStrategy = btn.dataset.ovStrat as typeof ovStrategy;
      updateFromControls();
    });
  });

  mwSlider.addEventListener('input', () => {
    tickMaxWidth = Number(mwSlider.value);
    updateFromControls();
  });

  mcSlider.addEventListener('input', () => {
    tickMaxChars = Number(mcSlider.value);
    updateFromControls();
  });

  rotSlider.addEventListener('input', () => {
    tickMaxRotation = Number(rotSlider.value);
    updateFromControls();
  });

  tipToggle.addEventListener('change', () => {
    tickEnableTooltip = tipToggle.checked;
    updateFromControls();
  });

  return mounted;
}
