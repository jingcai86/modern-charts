import {
  PALETTES,
  type ChartPaletteName,
  type ChartTheme,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createLiveConfigEditor } from './shared';

export function renderThemesGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  // Intro & Built-in Palettes Swatches
  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Default Themes &amp; Built-In Palettes</h2>
    <p class="guide-prose">
      Every chart resolves its visual tokens through <code>&lt;mc-theme-layer&gt;</code> and
      <code>createDefaultTheme(mode, palette)</code>. Pick from <strong>3 theme modes</strong>
      (<code>'system'</code>, <code>'dark'</code>, <code>'light'</code>) and <strong>7 bundled palettes</strong>,
      or edit <code>themeMode</code>, <code>palette</code>, or custom <code>colors</code> directly in the live JSON editor below.
    </p>
    <div class="guide-palette-grid" id="guide-palette-picker"></div>
    <div class="guide-controls-row" style="margin-top:4px;">
      <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">Preview Mode:</span>
      <button type="button" id="btn-theme-mode-system" class="${themeMode === 'system' ? 'btn-primary' : ''}">System</button>
      <button type="button" id="btn-theme-mode-dark" class="${themeMode === 'dark' ? 'btn-primary' : ''}">Dark</button>
      <button type="button" id="btn-theme-mode-light" class="${themeMode === 'light' ? 'btn-primary' : ''}">Light</button>
    </div>
    <div class="guide-dual-chart-grid">
      <div class="guide-chart-stage" id="guide-theme-bar"></div>
      <div class="guide-chart-stage" id="guide-theme-pie"></div>
    </div>
    <div id="guide-theme-code-1"></div>
  `;
  container.appendChild(introCard);

  let selectedPalette: ChartPaletteName = 'modern';
  let selectedMode: ThemeModePreference = themeMode;

  const palettePicker = introCard.querySelector('#guide-palette-picker') as HTMLElement;
  const codeSlot1 = introCard.querySelector('#guide-theme-code-1') as HTMLElement;

  const barEl = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  const pieEl = document.createElement('mc-pie-chart') as MCBaseChart<any>;
  introCard.querySelector('#guide-theme-bar')!.appendChild(barEl);
  introCard.querySelector('#guide-theme-pie')!.appendChild(pieEl);
  mounted.push(barEl, pieEl);

  const barData = [
    { q: 'Q1', Compute: 120, Storage: 84, Network: 54 },
    { q: 'Q2', Compute: 148, Storage: 96, Network: 68 },
    { q: 'Q3', Compute: 165, Storage: 112, Network: 79 },
    { q: 'Q4', Compute: 192, Storage: 130, Network: 92 }
  ];
  const pieData = [
    { id: 'Compute', value: 44 },
    { id: 'Storage', value: 28 },
    { id: 'Network', value: 18 },
    { id: 'Edge', value: 10 }
  ];

  const applyPaletteConfig = (cfg: {
    themeMode?: ThemeModePreference;
    palette?: ChartPaletteName;
    colors?: string[];
    theme?: Partial<ChartTheme>;
  }) => {
    const mode = cfg.themeMode ?? selectedMode;
    const palette = cfg.palette ?? selectedPalette;
    const hasColors = Array.isArray(cfg.colors) && cfg.colors.length > 0;
    const labelSuffix = hasColors ? 'custom colors' : `"${palette}"`;

    barEl.setConfig({
      data: barData,
      autoSize: true,
      themeMode: mode,
      palette,
      colors: hasColors ? cfg.colors : undefined,
      theme: cfg.theme,
      title: `Palette: ${labelSuffix} (${mode})`,
      indexBy: 'q',
      keys: ['Compute', 'Storage', 'Network'],
      groupMode: 'grouped',
      borderRadius: 5,
      margin: { top: 44, right: 20, bottom: 64, left: 48 }
    });

    pieEl.setConfig({
      data: pieData,
      autoSize: true,
      themeMode: mode,
      palette,
      colors: hasColors ? cfg.colors : undefined,
      theme: cfg.theme,
      title: `Donut — ${labelSuffix}`,
      innerRadius: 0.56,
      padAngle: 0.03,
      cornerRadius: 6,
      centerLabel: '100%'
    });
  };

  const syncModeButtons = (mode: ThemeModePreference) => {
    (['system', 'dark', 'light'] as ThemeModePreference[]).forEach((other) => {
      introCard
        .querySelector(`#btn-theme-mode-${other}`)
        ?.classList.toggle('btn-primary', other === mode);
    });
  };

  const syncPaletteButtons = (palette: string) => {
    palettePicker
      .querySelectorAll<HTMLButtonElement>('.guide-palette-card')
      .forEach((el) =>
        el.classList.toggle('active', el.dataset.paletteName === palette)
      );
  };

  const buildPaletteEditorConfig = () => ({
    themeMode: selectedMode,
    palette: selectedPalette,
    colors: [] as string[]
  });

  const editor1 = createLiveConfigEditor({
    title: 'Default Themes & Built-In Palettes (Live)',
    initialConfig: buildPaletteEditorConfig(),
    hint: 'Change palette ("ocean", "sunset", "cyber"), themeMode, or add hex codes to colors[] — updates both charts live.',
    onConfigChange: (nextCfg) => {
      if (nextCfg.themeMode) {
        selectedMode = nextCfg.themeMode;
        syncModeButtons(selectedMode);
      }
      if (nextCfg.palette && nextCfg.palette in PALETTES) {
        selectedPalette = nextCfg.palette;
        syncPaletteButtons(selectedPalette);
      }
      applyPaletteConfig(nextCfg);
    },
    onReset: () => {
      selectedPalette = 'modern';
      selectedMode = themeMode;
      syncPaletteButtons(selectedPalette);
      syncModeButtons(selectedMode);
      const resetCfg = buildPaletteEditorConfig();
      applyPaletteConfig(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  codeSlot1.appendChild(editor1.element);

  (Object.keys(PALETTES) as ChartPaletteName[]).forEach((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.paletteName = name;
    btn.className = `guide-palette-card ${name === selectedPalette ? 'active' : ''}`;
    const swatches = PALETTES[name]
      .slice(0, 6)
      .map((c) => `<span class="guide-swatch-dot" style="background:${c}"></span>`)
      .join('');
    btn.innerHTML = `
      <span class="guide-palette-name">${name}</span>
      <span class="guide-swatch-row">${swatches}</span>
    `;
    btn.addEventListener('click', () => {
      selectedPalette = name;
      syncPaletteButtons(name);
      const nextCfg = buildPaletteEditorConfig();
      applyPaletteConfig(nextCfg);
      editor1.syncConfig(nextCfg);
    });
    palettePicker.appendChild(btn);
  });

  (['system', 'dark', 'light'] as ThemeModePreference[]).forEach((m) => {
    const b = introCard.querySelector(`#btn-theme-mode-${m}`) as HTMLButtonElement;
    b.addEventListener('click', () => {
      selectedMode = m;
      syncModeButtons(m);
      const nextCfg = buildPaletteEditorConfig();
      applyPaletteConfig(nextCfg);
      editor1.syncConfig(nextCfg);
    });
  });

  applyPaletteConfig(buildPaletteEditorConfig());

  // Example 2: Fully Custom Brand Themes
  const customThemes: Record<
    string,
    {
      label: string;
      theme: Partial<ChartTheme>;
      colors: string[];
      themeMode: 'light' | 'dark';
    }
  > = {
    editorial: {
      label: 'Editorial Print (Warm Paper)',
      themeMode: 'light',
      colors: ['#b91c1c', '#1d4ed8', '#15803d'],
      theme: {
        background: '#faf6ef',
        textColor: '#1c1917',
        mutedTextColor: '#57534e',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 13,
        axisColor: '#78716c',
        gridColor: 'rgba(120, 113, 108, 0.22)',
        gridStrokeDasharray: '2 4',
        tooltipBackground: '#1c1917',
        tooltipTextColor: '#faf6ef',
        tooltipBorderColor: '#44403c'
      }
    },
    terminal: {
      label: 'Retro Terminal (Phosphor Amber)',
      themeMode: 'dark',
      colors: ['#f59e0b', '#22c55e', '#38bdf8'],
      theme: {
        background: '#090d0a',
        textColor: '#fde68a',
        mutedTextColor: '#a3e635',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        axisColor: '#3f6212',
        gridColor: 'rgba(163, 230, 53, 0.16)',
        gridStrokeDasharray: '1 5',
        tooltipBackground: '#111811',
        tooltipTextColor: '#fde68a',
        tooltipBorderColor: '#84cc16'
      }
    },
    enterprise: {
      label: 'High-Contrast Enterprise',
      themeMode: 'light',
      colors: ['#0f172a', '#0284c7', '#d97706'],
      theme: {
        background: '#ffffff',
        textColor: '#020617',
        mutedTextColor: '#334155',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        axisColor: '#0f172a',
        gridColor: 'rgba(15, 23, 42, 0.12)',
        gridStrokeDasharray: 'none',
        tooltipBackground: '#0f172a',
        tooltipTextColor: '#ffffff',
        tooltipBorderColor: '#0284c7'
      }
    }
  };

  const ex2 = document.createElement('section');
  ex2.className = 'panel-card guide-section';
  ex2.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Crafting Your Own Custom Brand Theme</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Pass a partial <code>theme</code> object and custom <code>colors</code> array to override typography, surfaces, grid dash patterns, axes, and tooltips — edit any token below to preview live.
        </p>
      </div>
      <div class="guide-controls-row" id="guide-custom-theme-btns"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-custom-theme-chart"></div>
      <div id="guide-custom-theme-code"></div>
    </div>
  `;
  container.appendChild(ex2);

  const customLineEl = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex2.querySelector('#guide-custom-theme-chart')!.appendChild(customLineEl);
  mounted.push(customLineEl);

  const customThemeBtns = ex2.querySelector('#guide-custom-theme-btns') as HTMLElement;
  const customThemeCode = ex2.querySelector('#guide-custom-theme-code') as HTMLElement;
  let activeCustomKey = 'editorial';

  const brandLineData = [
    {
      id: 'Revenue',
      data: [
        { x: 'Jan', y: 112 },
        { x: 'Feb', y: 129 },
        { x: 'Mar', y: 141 },
        { x: 'Apr', y: 136 },
        { x: 'May', y: 162 },
        { x: 'Jun', y: 184 }
      ]
    },
    {
      id: 'Forecast',
      data: [
        { x: 'Jan', y: 105 },
        { x: 'Feb', y: 120 },
        { x: 'Mar', y: 132 },
        { x: 'Apr', y: 148 },
        { x: 'May', y: 158 },
        { x: 'Jun', y: 175 }
      ]
    }
  ];

  const buildCustomThemeConfig = (key: string) => {
    const preset = customThemes[key];
    return {
      title: preset.label,
      themeMode: preset.themeMode,
      colors: [...preset.colors],
      theme: { ...preset.theme },
      enableArea: true,
      areaOpacity: 0.14,
      curve: 'monotoneX'
    };
  };

  const applyCustomLineConfig = (cfg: Record<string, any>) => {
    customLineEl.setConfig({
      data: brandLineData,
      autoSize: true,
      yScale: { type: 'linear', min: 80, max: 205 },
      margin: { top: 44, right: 24, bottom: 64, left: 52 },
      ...cfg
    });
  };

  const initialBrandCfg = buildCustomThemeConfig(activeCustomKey);
  applyCustomLineConfig(initialBrandCfg);

  const editor2 = createLiveConfigEditor({
    title: `Custom Theme — ${customThemes[activeCustomKey].label}`,
    initialConfig: initialBrandCfg,
    hint: 'Edit background, textColor, colors[], fontFamily, or gridStrokeDasharray to restyle live.',
    onConfigChange: (nextCfg) => {
      applyCustomLineConfig(nextCfg);
    },
    onReset: () => {
      const resetCfg = buildCustomThemeConfig(activeCustomKey);
      applyCustomLineConfig(resetCfg);
      editor2.syncConfig(resetCfg, {
        title: `Custom Theme — ${customThemes[activeCustomKey].label}`
      });
    }
  });
  customThemeCode.appendChild(editor2.element);

  Object.entries(customThemes).forEach(([key, preset]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.className = key === activeCustomKey ? 'btn-primary' : '';
    btn.addEventListener('click', () => {
      activeCustomKey = key;
      customThemeBtns
        .querySelectorAll('button')
        .forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      const nextCfg = buildCustomThemeConfig(key);
      applyCustomLineConfig(nextCfg);
      editor2.syncConfig(nextCfg, { title: `Custom Theme — ${preset.label}` });
    });
    customThemeBtns.appendChild(btn);
  });

  // Theme Token Table
  const tokenCard = document.createElement('section');
  tokenCard.className = 'panel-card guide-section';
  tokenCard.innerHTML = `
    <h2 class="panel-title">ChartTheme Token Reference</h2>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th>Token</th><th>Type</th><th>Controls</th></tr></thead>
        <tbody>
          <tr><td><code>colors</code></td><td><code>string[]</code></td><td>Series color cycle (overrides <code>palette</code>).</td></tr>
          <tr><td><code>background</code></td><td><code>string</code></td><td>Chart SVG canvas background fill.</td></tr>
          <tr><td><code>textColor</code> / <code>mutedTextColor</code></td><td><code>string</code></td><td>Titles, data labels, and secondary axis tick labels.</td></tr>
          <tr><td><code>fontFamily</code> / <code>fontSize</code></td><td><code>string | number</code></td><td>Base font passed to both SVG labels and <code>@chenglou/pretext</code> measurement.</td></tr>
          <tr><td><code>axisColor</code></td><td><code>string</code></td><td>Axis baselines and tick marks.</td></tr>
          <tr><td><code>gridColor</code> / <code>gridStrokeDasharray</code></td><td><code>string</code></td><td>Gridline stroke color and dash pattern (e.g. <code>'4 4'</code> or <code>'none'</code>).</td></tr>
          <tr><td><code>tooltipBackground</code> / <code>tooltipTextColor</code> / <code>tooltipBorderColor</code></td><td><code>string</code></td><td>Floating interactive tooltip surface styling.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(tokenCard);

  return mounted;
}
