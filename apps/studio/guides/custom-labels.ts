import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import { getGlobalPalette } from '../state/theme';
import type {
  LabelDescriptor,
  LabelOverflowConfig,
  LabelOverflowStrategy,
  MCBaseChart,
  MeasuredLabel,
  ThemeModePreference
} from '../../../src/index';
import { guideCallback } from './callback-source';
import { getLabelOverflowCapabilities, LABEL_OVERFLOW_MODES } from './label-overflow-controls';
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

  const customPillRenderer = guideCallback((
    descriptor: LabelDescriptor,
    measured: MeasuredLabel
  ) => {
    if (descriptor.type !== 'data') return;

    const total = Math.max(
      1,
      latestSalesData.reduce((s, d) => s + Number(d.Revenue ?? 0), 0)
    );
    const datum = descriptor.datum as { value?: number } | undefined;
    const val = Number(datum?.value ?? descriptor.text);
    const share = Math.round((val / total) * 100);
    const isTop = val >= 200;
    const label = `${isTop ? '★ ' : ''}$${val}K (${share}%)`;
    const maxPillWidth = descriptor.maxWidth ?? Infinity;
    const paddingX = maxPillWidth < 80 ? 7 : 10;
    const { lines, height } = layoutWithLines(
      prepareWithSegments(label, measured.font),
      Math.max(24, maxPillWidth - 2 * paddingX),
      measured.lineHeight
    );
    const pillW = Math.ceil(Math.max(...lines.map(line => line.width))) + 2 * paddingX;
    const pillH = Math.max(24, height + 8);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Draw around local (0, 0). The label engine translates the group to the label anchor.
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(-pillW / 2));
    rect.setAttribute('y', String(-pillH / 2));
    rect.setAttribute('width', String(pillW));
    rect.setAttribute('height', String(pillH));
    rect.setAttribute('rx', String(pillH / 2));
    rect.setAttribute('fill', isTop ? '#f59e0b' : '#1e293b');
    rect.setAttribute('stroke', isTop ? '#fef3c7' : '#6366f1');
    rect.setAttribute('stroke-width', '1.4');
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('aria-label', label);
    text.style.font = measured.font;
    text.setAttribute('fill', isTop ? '#0f172a' : '#f8fafc');
    lines.forEach((line, index) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', '0');
      tspan.setAttribute('y', String((index - (lines.length - 1) / 2) * measured.lineHeight));
      tspan.textContent = line.text;
      text.appendChild(tspan);
    });
    g.appendChild(text);

    return g;
  }, () => ({ latestSalesData, layoutWithLines, prepareWithSegments }));

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
              formatter: guideCallback((text: string) => (/^\d+$/.test(text) ? `$${text}K` : text))
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
    if (cfg.labelRenderer === undefined && labelChart1.labelRenderer !== undefined) {
      labelChart1.labelRenderer = undefined;
    }
    labelChart1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
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

  // Example 2: Shared overflow controls for axis and bar labels
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Overflow on Axis and Bar Labels</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          The same <code>label.overflow</code> settings apply to the axis labels and the text centered inside each bar.
          Edit a row’s <code>dept</code> or <code>centerLabel</code> to change its text.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        ${LABEL_OVERFLOW_MODES.map(({ strategy, label }) =>
          `<button type="button" data-ov-strat="${strategy}">${label}</button>`
        ).join('')}
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
      <label for="lbl-maxlines-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxLines</code>: <strong id="lbl-maxlines-val">2</strong>
        <input type="range" id="lbl-maxlines-slider" min="0" max="6" step="1" value="2" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label for="lbl-maxrot-slider" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <code>maxRotation</code>: <strong id="lbl-maxrot-val">-45°</strong>
        <input type="range" id="lbl-maxrot-slider" min="-90" max="90" step="5" value="-45" style="vertical-align:middle;margin-left:6px;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;cursor:pointer;">
        <input type="checkbox" id="lbl-tooltip-toggle" checked />
        <code>enableTooltip</code>
      </label>
    </div>
    <div style="overflow-x:auto;">
      <div class="guide-chart-stage" id="guide-label-chart-2" style="min-width:490px;"></div>
    </div>
    <div id="guide-label-code-2" style="margin-top:16px;"></div>
  `;
  container.appendChild(ex2);

  const overflowChart = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-label-chart-2')!.appendChild(overflowChart);
  mounted.push(overflowChart);

  const code2Host = ex2.querySelector('#guide-label-code-2') as HTMLElement;

  let overflowStrategy: LabelOverflowStrategy = 'truncate';
  let labelMaxWidth = 82;
  let labelMaxChars = 0;
  let labelMaxLines = 2;
  let labelMaxRotation = -45;
  let labelEnableTooltip = true;

  const defaultPreview = {
    title: 'Technology spending',
    data: [
      { dept: 'Cloud Platform Engineering', Spend: 214, centerLabel: 'Global Cloud Infrastructure Spending' },
      { dept: 'Applied Machine Learning', Spend: 186, centerLabel: 'Machine Learning Model Training' },
      { dept: 'Security & Compliance Ops', Spend: 129, centerLabel: 'Application Security Operations' },
      { dept: 'Developer Experience Tools', Spend: 158, centerLabel: 'Developer Tools and Build Systems' }
    ],
    label: { fontSize: 11 }
  };
  let activePreview: Record<string, any> = defaultPreview;

  const buildOverflowConfig = () => {
    const capabilities = getLabelOverflowCapabilities(overflowStrategy);
    const overflowCfg: LabelOverflowConfig = { strategy: overflowStrategy };
    if (capabilities.maxWidth) overflowCfg.maxWidth = labelMaxWidth;
    if (capabilities.maxChars && labelMaxChars > 0) overflowCfg.maxChars = labelMaxChars;
    if (capabilities.maxLines && labelMaxLines > 0) overflowCfg.maxLines = labelMaxLines;
    if (capabilities.maxRotation) overflowCfg.maxRotation = labelMaxRotation;
    if (capabilities.enableTooltip) overflowCfg.enableTooltip = labelEnableTooltip;

    return {
      ...activePreview,
      label: {
        ...activePreview.label,
        overflow: overflowCfg
      }
    };
  };

  const applyOverflowConfig = (cfg: Record<string, any>) => {
    activePreview = cfg;
    const { data, label, ...chartOptions } = cfg;
    overflowChart.setConfig({
      autoSize: true,
      animate: false,
      themeMode,
      palette: 'material',
      indexBy: 'dept',
      keys: ['Spend'],
      enableLabels: true,
      borderRadius: 6,
      margin: { top: 44, right: 26, bottom: 160, left: 66 },
      layers: ['grid', 'axes', 'bars', 'labels'],
      ...chartOptions,
      data: Array.isArray(data) ? data : [],
      label: [
        { ...label, target: 'axis-tick' },
        {
          formatter: '{{centerLabel}}',
          background: 'rgba(15, 23, 42, 0.8)',
          color: '#fff',
          borderRadius: 5,
          padding: { top: 3, right: 3, bottom: 3, left: 3 },
          ...label,
          target: 'data'
        }
      ]
    });
  };

  const stratButtons = Array.from(
    ex2.querySelectorAll<HTMLButtonElement>('[data-ov-strat]')
  );
  const mwSlider = ex2.querySelector('#lbl-maxwidth-slider') as HTMLInputElement;
  const mwVal = ex2.querySelector('#lbl-maxwidth-val') as HTMLElement;
  const mcSlider = ex2.querySelector('#lbl-maxchars-slider') as HTMLInputElement;
  const mcVal = ex2.querySelector('#lbl-maxchars-val') as HTMLElement;
  const linesSlider = ex2.querySelector('#lbl-maxlines-slider') as HTMLInputElement;
  const linesVal = ex2.querySelector('#lbl-maxlines-val') as HTMLElement;
  const rotSlider = ex2.querySelector('#lbl-maxrot-slider') as HTMLInputElement;
  const rotVal = ex2.querySelector('#lbl-maxrot-val') as HTMLElement;
  const tipToggle = ex2.querySelector('#lbl-tooltip-toggle') as HTMLInputElement;
  const overflowControls = {
    maxWidth: mwSlider,
    maxChars: mcSlider,
    maxLines: linesSlider,
    maxRotation: rotSlider,
    enableTooltip: tipToggle
  };

  const syncOverflowControls = () => {
    const capabilities = getLabelOverflowCapabilities(overflowStrategy);
    for (const [key, input] of Object.entries(overflowControls)) {
      input.closest('label')!.hidden = !capabilities[key as keyof typeof overflowControls];
    }
    for (const button of stratButtons) {
      const selected = button.dataset.ovStrat === overflowStrategy;
      button.classList.toggle('btn-primary', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    mwSlider.value = String(labelMaxWidth);
    mwVal.textContent = `${labelMaxWidth}px`;
    mcSlider.value = String(labelMaxChars);
    mcVal.textContent = labelMaxChars > 0 ? String(labelMaxChars) : 'off';
    linesSlider.value = String(labelMaxLines);
    linesVal.textContent = labelMaxLines > 0 ? String(labelMaxLines) : 'off';
    rotSlider.value = String(labelMaxRotation);
    rotVal.textContent = `${labelMaxRotation}°`;
    tipToggle.checked = labelEnableTooltip;
  };

  syncOverflowControls();
  const initialOvCfg = buildOverflowConfig();
  applyOverflowConfig(initialOvCfg);

  const editor2 = createLiveConfigEditor({
    title: 'Shared Label Overflow Config (Live)',
    initialConfig: initialOvCfg,
    assignPrefix: 'const config =',
    hint: 'Edit label.overflow to update both sets of labels.',
    onConfigChange: (nextCfg) => {
      const ov = nextCfg.label?.overflow;
      if (ov) {
        if (ov.strategy) overflowStrategy = ov.strategy;
        if (typeof ov.maxWidth === 'number') labelMaxWidth = ov.maxWidth;
        if (typeof ov.maxChars === 'number') labelMaxChars = ov.maxChars;
        if (typeof ov.maxLines === 'number') labelMaxLines = ov.maxLines;
        if (typeof ov.maxRotation === 'number') labelMaxRotation = ov.maxRotation;
        if (typeof ov.enableTooltip === 'boolean') labelEnableTooltip = ov.enableTooltip;
        syncOverflowControls();
      }
      applyOverflowConfig(nextCfg);
    },
    onReset: () => {
      overflowStrategy = 'truncate';
      labelMaxWidth = 82;
      labelMaxChars = 0;
      labelMaxLines = 2;
      labelMaxRotation = -45;
      labelEnableTooltip = true;
      activePreview = defaultPreview;
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
      overflowStrategy = btn.dataset.ovStrat as LabelOverflowStrategy;
      updateFromControls();
    });
  });

  mwSlider.addEventListener('input', () => {
    labelMaxWidth = Number(mwSlider.value);
    updateFromControls();
  });

  mcSlider.addEventListener('input', () => {
    labelMaxChars = Number(mcSlider.value);
    updateFromControls();
  });

  linesSlider.addEventListener('input', () => {
    labelMaxLines = Number(linesSlider.value);
    updateFromControls();
  });

  rotSlider.addEventListener('input', () => {
    labelMaxRotation = Number(rotSlider.value);
    updateFromControls();
  });

  tipToggle.addEventListener('change', () => {
    labelEnableTooltip = tipToggle.checked;
    updateFromControls();
  });

  return mounted;
}
