import { getGlobalPalette } from '../state/theme';
import { LabelEngine } from '../../../src/core/label-engine';
import { normalizeOverflowInput, normalizeOverflowStrategy } from '../../../src/core/label-truncate';
import type {
  LabelOverflowConfig,
  LabelOverflowStrategy,
  MCBaseChart,
  ThemeModePreference
} from '../../../src/index';
import { renderSectionInfoTooltip, wireSectionInfoTooltips } from '../pages/chart-detail/section-info';
import { getLabelOverflowCapabilities, LABEL_OVERFLOW_MODES } from './label-overflow-controls';
import { createLiveConfigEditor, escapeHtml } from './shared';

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
          <tr><td><code>strategy</code> / <code>label-overflow</code></td><td>${LABEL_OVERFLOW_MODES.map(({ strategy }) => `<code>'${strategy}'</code>`).join(' | ')}</td><td><code>'truncate'</code></td><td><code>'wrap'</code> keeps all text. <code>'wrap-truncate'</code> can shorten wrapped text. <code>'rotate-wrap-truncate'</code> also rotates it. <code>'both'</code> rotates and truncates.</td></tr>
          <tr><td><code>maxWidth</code> / <code>max-width</code></td><td><code>number</code> (px)</td><td>Per-slot budget</td><td>Exact Pretext-measured pixel width threshold before overflow triggers.</td></tr>
          <tr><td><code>maxChars</code> / <code>max-chars</code></td><td><code>number</code></td><td>Unlimited</td><td>Grapheme-safe character threshold for rotation and truncation.</td></tr>
          <tr><td><code>maxLines</code> / <code>max-lines</code></td><td><code>number</code></td><td>Unlimited</td><td>Limits the visible lines in the truncation strategies.</td></tr>
          <tr><td><code>ellipsis</code></td><td><code>string</code></td><td><code>'…'</code></td><td>Suffix appended when truncating text.</td></tr>
          <tr><td><code>maxRotation</code> / <code>max-rotation</code></td><td><code>number</code> (deg)</td><td><code>45</code></td><td>Rotation angle for <code>'rotate'</code>, <code>'both'</code>, and <code>'rotate-wrap-truncate'</code>. Negative angles are supported.</td></tr>
          <tr><td><code>enableTooltip</code> / <code>enable-tooltip</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Shows full text when hovering or focusing a label that overflow handling rotated or truncated.</td></tr>
          <tr><td><code>tooltip</code></td><td><code>boolean | TooltipConfig</code></td><td>Default label tooltip</td><td>Customize the full-text tooltip via <code>formatter</code>, <code>renderer</code>, or a nested <code>&lt;mc-tooltip&gt;</code>.</td></tr>
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
          Use the controls or edit <code>data</code> and <code>label.overflow</code> in the live config editor.
        </p>
      </div>
      <div class="guide-controls-row" role="group" aria-label="Axis label overflow" style="gap:6px;">
        ${LABEL_OVERFLOW_MODES.map(({ strategy, label }) => `<button type="button" data-trunc-strat="${strategy}">${label}</button>`).join('')}
      </div>
    </div>
    <div id="tr-overflow-controls">
      <div class="guide-controls-row" style="gap:14px;margin:0 0 12px;font-size:0.82rem;color:var(--text-muted);font-weight:600;">
        <label data-trunc-control="maxWidth">
          <code>maxWidth</code> <strong id="tr-mw-val"></strong>
          <input type="range" id="tr-mw-slider" min="48" max="160" step="2" style="vertical-align:middle;margin-left:6px;" />
        </label>
        <label data-trunc-control="maxChars">
          <code>maxChars</code> <strong id="tr-mc-val"></strong>
          <input type="range" id="tr-mc-slider" min="0" max="26" step="1" style="vertical-align:middle;margin-left:6px;" />
        </label>
        <label data-trunc-control="maxLines">
          <code>maxLines</code> <strong id="tr-ml-val"></strong>
          <input type="range" id="tr-ml-slider" min="0" max="8" step="1" style="vertical-align:middle;margin-left:6px;" />
        </label>
        <label data-trunc-control="maxRotation">
          <code>maxRotation</code> <strong id="tr-rot-val"></strong>
          <input type="range" id="tr-rot-slider" min="-90" max="90" step="5" style="vertical-align:middle;margin-left:6px;" />
        </label>
        <div data-trunc-control="ellipsis" class="guide-control-with-help">
          <label>
            <code>ellipsis</code>
            <select id="tr-ellipsis-select" aria-describedby="tr-ellipsis-info" style="margin-left:4px;">
              <option value="…">… (default)</option>
              <option value="...">... (three periods)</option>
              <option value="→">→</option>
            </select>
          </label>
          ${renderSectionInfoTooltip(
            'tr-ellipsis-info',
            'About ellipsis choices',
            `<table class="guide-table guide-help-table">
              <thead><tr><th scope="col">Suffix</th><th scope="col"><code>maxChars</code> used</th></tr></thead>
              <tbody>
                <tr><td><code>…</code> (default)</td><td>1</td></tr>
                <tr><td><code>...</code> (three periods)</td><td>3</td></tr>
                <tr><td><code>→</code> (arrow)</td><td>1</td></tr>
              </tbody>
            </table>`
          )}
        </div>
        <label data-trunc-control="enableTooltip">
          <input type="checkbox" id="tr-tip-toggle" />
          <code>enableTooltip</code>
        </label>
      </div>
      <p id="tr-tooltip-hint" class="guide-prose">
        Hover or press <strong>Tab</strong> to read the full text of rotated or truncated labels.
      </p>
    </div>
    <div class="guide-example-grid">
      <div style="overflow-x:auto;">
        <div class="guide-chart-stage" id="guide-trunc-chart-1"></div>
      </div>
      <div id="guide-trunc-code-1"></div>
    </div>
  `;
  container.appendChild(ex1);
  wireSectionInfoTooltips(ex1);

  const bar1 = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  const chartStage = ex1.querySelector<HTMLElement>('#guide-trunc-chart-1')!;
  chartStage.appendChild(bar1);
  mounted.push(bar1);

  const defaultOptions = {
    maxWidth: 78,
    maxChars: 0,
    maxLines: 2,
    maxRotation: -45,
    ellipsis: '…',
    enableTooltip: true
  };
  const defaultConfig = {
    title: 'Long Category Labels',
    indexBy: 'dept',
    keys: ['Spend'],
    data: [
      { dept: 'Global Cloud Platform Infrastructure', Spend: 245 },
      { dept: 'Applied Machine Learning Research', Spend: 210 },
      { dept: 'Enterprise Security & Compliance Ops', Spend: 162 },
      { dept: 'Developer Productivity & CI Tooling', Spend: 184 },
      { dept: 'Real-Time Data Streaming Pipelines', Spend: 198 }
    ],
    label: { target: 'axis-tick' }
  };
  let strategy: LabelOverflowStrategy = 'truncate';
  let options = { ...defaultOptions };
  let currentConfig: Record<string, any> = defaultConfig;
  let tooltip: LabelOverflowConfig['tooltip'];

  const stratBtns = Array.from(
    ex1.querySelectorAll<HTMLButtonElement>('[data-trunc-strat]')
  );
  const controlRow = ex1.querySelector<HTMLElement>('#tr-overflow-controls')!;
  const controls = controlRow.querySelectorAll<HTMLElement>('[data-trunc-control]');
  const tooltipHint = ex1.querySelector<HTMLElement>('#tr-tooltip-hint')!;
  const ellSelect = ex1.querySelector<HTMLSelectElement>('#tr-ellipsis-select')!;
  const tipToggle = ex1.querySelector<HTMLInputElement>('#tr-tip-toggle')!;
  const numericControls = ([
    { key: 'maxWidth', id: 'mw', unit: 'px' },
    { key: 'maxChars', id: 'mc', offAtZero: true },
    { key: 'maxLines', id: 'ml', offAtZero: true },
    { key: 'maxRotation', id: 'rot', unit: '°' }
  ] as const).map((control) => ({
    ...control,
    slider: ex1.querySelector<HTMLInputElement>(`#tr-${control.id}-slider`)!,
    value: ex1.querySelector<HTMLElement>(`#tr-${control.id}-val`)!
  }));

  const syncEx1Controls = () => {
    const capabilities = getLabelOverflowCapabilities(strategy);
    for (const button of stratBtns) {
      const selected = button.dataset.truncStrat === strategy;
      button.classList.toggle('btn-primary', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    for (const control of controls) {
      control.hidden = !capabilities[control.dataset.truncControl as keyof typeof capabilities];
    }
    controlRow.hidden = strategy === 'none';
    tooltipHint.hidden = !capabilities.enableTooltip || !options.enableTooltip;
    for (const control of numericControls) {
      const value = options[control.key];
      control.slider.value = String(value);
      control.value.textContent = ('offAtZero' in control && value === 0)
        ? 'off'
        : `${value}${'unit' in control ? control.unit : ''}`;
    }
    // Custom suffixes from the live editor leave the presets unselected.
    ellSelect.value = options.ellipsis;
    tipToggle.checked = options.enableTooltip;
  };

  const getAxisLabel = (cfg: Record<string, any>) => Array.isArray(cfg.label)
    ? cfg.label.find((label) => label?.target === 'axis-tick')
    : cfg.label;

  const buildEx1Config = () => {
    const capabilities = getLabelOverflowCapabilities(strategy);
    const overflow: LabelOverflowConfig = { strategy };
    if (capabilities.maxWidth) overflow.maxWidth = options.maxWidth;
    if (capabilities.maxChars && options.maxChars > 0) overflow.maxChars = options.maxChars;
    if (capabilities.maxLines && options.maxLines > 0) overflow.maxLines = options.maxLines;
    if (capabilities.maxRotation) overflow.maxRotation = options.maxRotation;
    if (capabilities.ellipsis) overflow.ellipsis = options.ellipsis;
    if (capabilities.enableTooltip) {
      overflow.enableTooltip = options.enableTooltip;
      overflow.tooltip = tooltip;
    }

    const previous = getAxisLabel(currentConfig);
    const label = { ...previous, target: previous?.target ?? 'axis-tick', overflow };
    // Keep the guide's controls in overflow so an edited top-level option never shadows them.
    for (const key of Object.keys(defaultOptions)) delete label[key];
    delete label.tooltip;
    return {
      ...currentConfig,
      label: Array.isArray(currentConfig.label)
        ? [...currentConfig.label.filter((entry) => entry !== previous), label]
        : label
    };
  };

  const labelEngine = new LabelEngine();
  const applyEx1Config = (cfg: Record<string, any>) => {
    const label = getAxisLabel(cfg);
    const theme = { ...bar1.resolveTheme(), ...cfg.theme };
    const fontSize = Math.max(10, theme.fontSize - 1);
    const margin = { top: 44, right: 24, bottom: 74, left: 52 };
    const categories = Array.isArray(cfg.data) ? cfg.data : [];
    let tickSpacing = 42;

    for (const datum of categories) {
      const text = String(datum?.[cfg.indexBy ?? 'dept'] ?? '');
      const measured = labelEngine.measure(text, { fontSize, ...label }, theme);
      const angle = measured.appliedRotation * Math.PI / 180;
      const sin = Math.abs(Math.sin(angle));
      const cos = Math.abs(Math.cos(angle));
      const down = measured.boxWidth * sin + measured.boxHeight * cos;
      const width = measured.boxWidth * cos;
      const crossWidth = measured.boxHeight * sin;
      const left = measured.appliedRotation < 0 ? width : crossWidth;
      const right = measured.appliedRotation > 0 ? width : crossWidth;
      margin.bottom = Math.max(margin.bottom, Math.ceil(down) + 18);
      margin.left = Math.max(margin.left, Math.ceil(left) + 12);
      margin.right = Math.max(margin.right, Math.ceil(right) + 12);
      if (strategy !== 'none') {
        tickSpacing = Math.max(tickSpacing, Math.ceil(angle === 0 ? width : crossWidth) + 8);
      }
    }

    const finalMargin = { ...margin, ...cfg.margin };
    chartStage.style.minWidth = `${finalMargin.left + finalMargin.right + tickSpacing * categories.length}px`;
    chartStage.style.height = `${Math.max(380, finalMargin.top + finalMargin.bottom + 175)}px`;
    bar1.setConfig({
      autoSize: true,
      themeMode,
      palette: getGlobalPalette(),
      borderRadius: 6,
      layers: ['grid', 'axes', 'bars', 'labels'],
      ...cfg,
      margin: finalMargin
    });
  };

  const initialEx1Cfg = buildEx1Config();
  syncEx1Controls();
  applyEx1Config(initialEx1Cfg);

  const editor1 = createLiveConfigEditor({
    title: 'Axis & Label Truncation Config (Live)',
    initialConfig: initialEx1Cfg,
    hint: 'Edit the overflow strategy, its limits, or the category strings live.',
    onConfigChange: (nextCfg) => {
      const label = getAxisLabel(nextCfg);
      const overflow = normalizeOverflowInput(label?.overflow);
      strategy = normalizeOverflowStrategy(overflow.strategy) ?? 'truncate';
      const capabilities = getLabelOverflowCapabilities(strategy);
      for (const { key } of numericControls) {
        const value = overflow[key] ?? label?.[key];
        if (typeof value === 'number') options[key] = value;
        else if (capabilities[key]) options[key] = key === 'maxLines' ? 0 : defaultOptions[key];
      }
      const ellipsis = label?.ellipsis ?? overflow.ellipsis;
      const enabled = label?.enableTooltip ?? overflow.enableTooltip;
      if (typeof ellipsis === 'string' || capabilities.ellipsis) options.ellipsis = ellipsis ?? defaultOptions.ellipsis;
      if (typeof enabled === 'boolean' || capabilities.enableTooltip) options.enableTooltip = enabled ?? defaultOptions.enableTooltip;
      tooltip = label?.tooltip ?? overflow.tooltip ?? (capabilities.enableTooltip ? undefined : tooltip);
      currentConfig = nextCfg;
      syncEx1Controls();
      applyEx1Config(nextCfg);
    },
    onReset: () => {
      strategy = 'truncate';
      options = { ...defaultOptions };
      tooltip = undefined;
      currentConfig = defaultConfig;
      updateEx1FromControls();
    }
  });
  ex1.querySelector('#guide-trunc-code-1')!.appendChild(editor1.element);

  const updateEx1FromControls = () => {
    syncEx1Controls();
    const nextCfg = buildEx1Config();
    applyEx1Config(nextCfg);
    editor1.syncConfig(nextCfg);
  };

  stratBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      strategy = btn.dataset.truncStrat as LabelOverflowStrategy;
      updateEx1FromControls();
    });
  });
  for (const { key, slider } of numericControls) {
    slider.addEventListener('input', () => {
      options[key] = Number(slider.value);
      updateEx1FromControls();
    });
  }
  ellSelect.addEventListener('change', () => {
    options.ellipsis = ellSelect.value;
    updateEx1FromControls();
  });
  tipToggle.addEventListener('change', () => {
    options.enableTooltip = tipToggle.checked;
    updateEx1FromControls();
  });

  // Example 2: Legend Truncation & Pie Arc Links
  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Truncated Legends &amp; Pie Arc Links</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Set <code>legend.maxItemWidth</code> and <code>label.maxWidth</code> to bound long series names in legends and pie link labels —
          edit either value or segment names in the live config editor below.
        </p>
      </div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-trunc-chart-2"></div>
      <div id="guide-trunc-code-2"></div>
    </div>
  `;
  container.appendChild(ex2);

  const pie2 = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-trunc-chart-2')!.appendChild(pie2);
  mounted.push(pie2);

  const initialPie2Cfg = {
    title: 'Truncated Pie Link Labels & Legend Items',
    palette: getGlobalPalette(),
    innerRadius: 0.52,
    data: [
      { id: 'North America Cloud Infrastructure', value: 420 },
      { id: 'Europe Edge Analytics Platform', value: 315 },
      { id: 'Asia-Pacific Real-Time AI Inference', value: 268 },
      { id: 'Latin America Core Telemetry Mesh', value: 145 }
    ],
    legend: {
      enabled: true,
      position: 'bottom' as const,
      maxItemWidth: 105,
      enableTooltip: true
    },
    label: {
      target: 'arc-link' as const,
      maxWidth: 105,
      overflow: {
        strategy: 'truncate' as const,
        tooltip: {
          formatter: (p: any) =>
            `<strong>Full Segment:</strong> ${escapeHtml(String(p.title ?? ''))}`
        }
      }
    }
  };

  const applyPie2 = (cfg: Record<string, any>) => {
    pie2.setConfig({
      autoSize: true,
      themeMode,
      ...cfg
    });
  };
  applyPie2(initialPie2Cfg);

  const editor2 = createLiveConfigEditor({
    title: 'Legend & Pie Arc-Link Truncation Config (Live)',
    initialConfig: initialPie2Cfg,
    hint: 'Edit legend.maxItemWidth, label.maxWidth, legend.position, or segment names live.',
    onConfigChange: applyPie2
  });
  ex2.querySelector('#guide-trunc-code-2')!.appendChild(editor2.element);

  return mounted;
}
