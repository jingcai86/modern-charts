import { getGlobalPalette, STUDIO_PALETTES, type StudioPaletteName } from '../state/theme';
import {
  generateColorPalette,
  generateGradientPalette,
  resolveGradientAngles,
  type ChartPaletteName,
  type ChartTheme,
  type GradientDirection,
  type GradientStop,
  type LinearGradientDef,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import {
  createCodeBlock,
  createLiveConfigEditor,
  escapeHtml
} from './shared';

const PALETTE_LABELS: Record<StudioPaletteName, { label: string; subtitle: string }> = {
  shadcn: { label: 'shadcn / ui', subtitle: 'Tailwind / Radix (20 colors)' },
  material: { label: 'Angular Material', subtitle: 'Material Design (20 colors)' },
  bootstrap: { label: 'Bootstrap', subtitle: 'Bootstrap 5 (20 colors)' },
  antd: { label: 'Ant Design', subtitle: 'Ant Design 5 (20 colors)' },
  neutral: { label: 'Neutral (generated)', subtitle: 'Mid gray (#737373, 20 colors)' }
};

export function renderThemesGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const mounted: MCBaseChart<any>[] = [];

  const explanation = document.createElement('section');
  explanation.className = 'panel-card guide-section';
  explanation.innerHTML = `
    <h2 class="panel-title">Theme and Appearance are independent</h2>
    <p class="guide-prose">The Studio header's <strong>Theme</strong> menu chooses the default chart palette:
      Shadcn, Material, Bootstrap, Ant Design, or Neutral (generated). <strong>Appearance</strong> chooses System, Light, or Dark for Studio and chart surfaces.
      Both preferences are saved separately. Use Theme to change chart colors while keeping the current light/dark appearance.</p>
    <p class="guide-prose">The examples below let you override that default with their own palette, custom colors, or gradients.
      Their live editors show the exact chart configuration. Change <code>palette</code> for design-system colors or Neutral grayscale,
      <code>themeMode</code> for appearance, and <code>colors</code> or <code>theme</code> for custom styling.</p>
  `;
  container.appendChild(explanation);

  // Example 1: Built-in and generated palettes
  const introCard = document.createElement('section');
  introCard.className = 'panel-card guide-section';
  introCard.innerHTML = `
    <h2 class="panel-title">Example 1: Built-In and Generated Palettes</h2>
    <p class="guide-prose">
      <code>modern-charts</code> ships four built-in palettes with 20 colors each.
      Studio generates its Neutral palette from mid gray <code>#737373</code>.
      In your app, pass <code>palette: '#737373'</code> to generate a grayscale ramp.
    </p>
    <div class="guide-palette-grid" id="guide-palette-picker"></div>
    <div class="guide-controls-row" style="margin-top:4px;">
      <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">Appearance:</span>
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

  let selectedPalette: ChartPaletteName = getGlobalPalette();
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
    title: 'Palette Config (Live)',
    initialConfig: buildPaletteEditorConfig(),
    hint: 'Choose a palette or edit palette with a seed color such as "#1677ff". Use colors[] to supply your own shades.',
    onConfigChange: (nextCfg) => {
      if (nextCfg.themeMode) {
        selectedMode = nextCfg.themeMode;
        syncModeButtons(selectedMode);
      }
      if (typeof nextCfg.palette === 'string') {
        selectedPalette = nextCfg.palette;
        syncPaletteButtons(selectedPalette);
      }
      applyPaletteConfig(nextCfg);
    },
    onReset: () => {
      selectedPalette = getGlobalPalette();
      selectedMode = themeMode;
      syncPaletteButtons(selectedPalette);
      syncModeButtons(selectedMode);
      const resetCfg = buildPaletteEditorConfig();
      applyPaletteConfig(resetCfg);
      editor1.syncConfig(resetCfg);
    }
  });
  codeSlot1.appendChild(editor1.element);

  (Object.keys(STUDIO_PALETTES) as StudioPaletteName[]).forEach((name) => {
    const meta = PALETTE_LABELS[name];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.paletteName = name;
    btn.className = `guide-palette-card ${name === selectedPalette ? 'active' : ''}`;
    const swatches = STUDIO_PALETTES[name]
      .map(
        (c) =>
          `<span class="guide-swatch-dot" style="background:${c}" title="${c}"></span>`
      )
      .join('');
    btn.innerHTML = `
      <span class="guide-palette-name">${escapeHtml(meta.label)}</span>
      <span style="font-size:0.7rem;color:var(--text-muted);">${escapeHtml(meta.subtitle)}</span>
      <span class="guide-swatch-row" style="flex-wrap:wrap;">${swatches}</span>
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

  // Example 2: Single-Color Light-to-Dark Palette Generator (generateColorPalette)
  const genCard = document.createElement('section');
  genCard.className = 'panel-card guide-section';
  genCard.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 2: Single-Color Light-to-Dark Generator (<code>generateColorPalette</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Pass any brand color to <code>generateColorPalette(baseColor, count = 20)</code> (or directly to <code>config.palette</code>).
          Your seed color is anchored as the exact <strong>middle value</strong>, generating a smooth light-to-dark scale (default <strong>20 colors</strong>, customizable from 5 to 50).
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:10px;">
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;">
          Seed Color:
          <input type="color" id="gen-seed-picker" value="#2563eb" style="width:32px;height:26px;border:none;background:transparent;cursor:pointer;" />
          <input type="text" id="gen-seed-text" value="#2563eb" aria-label="Seed color hex" style="width:86px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.78rem;padding:4px 6px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-code);color:var(--text-main);" />
        </label>
        <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">
          Colors: <strong id="gen-count-val">20</strong>
          <input type="range" id="gen-count-slider" min="5" max="50" step="1" value="20" style="vertical-align:middle;margin-left:6px;" />
        </label>
        <button type="button" data-seed-preset="#2563eb">#2563eb</button>
        <button type="button" data-seed-preset="#10b981">#10b981</button>
        <button type="button" data-seed-preset="#e91e63">#e91e63</button>
        <button type="button" data-seed-preset="#fa8c16">#fa8c16</button>
      </div>
    </div>
    <div id="gen-swatch-strip" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(28px,1fr));gap:4px;"></div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-gen-chart"></div>
      <div id="guide-gen-code"></div>
    </div>
    <div id="guide-gen-usage"></div>
  `;
  container.appendChild(genCard);

  const genChartEl = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  genCard.querySelector('#guide-gen-chart')!.appendChild(genChartEl);
  mounted.push(genChartEl);

  const seedPicker = genCard.querySelector('#gen-seed-picker') as HTMLInputElement;
  const seedText = genCard.querySelector('#gen-seed-text') as HTMLInputElement;
  const countSlider = genCard.querySelector('#gen-count-slider') as HTMLInputElement;
  const countVal = genCard.querySelector('#gen-count-val') as HTMLElement;
  const swatchStrip = genCard.querySelector('#gen-swatch-strip') as HTMLElement;
  const genCodeHost = genCard.querySelector('#guide-gen-code') as HTMLElement;
  const genUsageHost = genCard.querySelector('#guide-gen-usage') as HTMLElement;

  let seedColor = '#2563eb';
  let genCount = 20;

  const getSampleIndices = (len: number): [number, number, number, number, number] => {
    if (len <= 5) return [0, 1, 2, 3, Math.min(4, len - 1)];
    const mid = Math.floor((len - 1) / 2);
    return [
      Math.max(0, Math.round(len * 0.1)),
      Math.max(1, Math.round(len * 0.28)),
      mid,
      Math.min(len - 2, Math.round(len * 0.72)),
      Math.min(len - 1, Math.round(len * 0.9))
    ];
  };

  const renderUsageSnippet = (seed: string, count: number, ramp: string[]) => {
    const [i0, i1, midIdx, i3, i4] = getSampleIndices(ramp.length);
    const snippet = `
import { generateColorPalette } from 'modern-charts';

// 1. Generate ${ramp.length} colors ordered light → dark (exact midpoint at index ${midIdx} = '${ramp[midIdx]}')
const ramp = generateColorPalette('${seed}', ${count});
// ramp[0]  = '${ramp[0]}' (lightest)
// ramp[${midIdx}]  = '${ramp[midIdx]}' (exact seed color)
// ramp[${ramp.length - 1}] = '${ramp[ramp.length - 1]}' (darkest)

// A) Use all ${ramp.length} colors directly (great for charts with many slices/series):
chart.config = { data, colors: ramp };

// B) Or pick evenly spaced stops when you have 5 series:
chart.config = {
  data,
  indexBy: 'tier',
  keys: ['Light', 'Soft', 'Mid (Seed)', 'Rich', 'Deep'],
  colors: [ramp[${i0}], ramp[${i1}], ramp[${midIdx}], ramp[${i3}], ramp[${i4}]]
};

// 2. Zero-import shorthand — pass any seed color directly to palette:
// chart.config = { data, palette: '${seed}' };
// <mc-bar-chart palette="${seed}"></mc-bar-chart>
`;
    genUsageHost.replaceChildren(
      createCodeBlock(snippet, 'How to Use generateColorPalette() & palette Shorthand')
    );
  };

  const renderSwatchStrip = (colors: string[]) => {
    const midIdx = Math.floor((colors.length - 1) / 2);
    const frag = document.createDocumentFragment();
    colors.forEach((hex, idx) => {
      const cell = document.createElement('div');
      cell.style.cssText =
        'display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;';
      const box = document.createElement('div');
      box.title = `${idx + 1}/${colors.length}: ${hex}${idx === midIdx ? ' (midpoint seed)' : ''}`;
      box.style.cssText = `width:100%;height:26px;border-radius:5px;background:${hex};border:${
        idx === midIdx ? '2px solid var(--text-main)' : '1px solid rgba(148,163,184,0.28)'
      };box-sizing:border-box;`;
      const cap = document.createElement('span');
      cap.style.cssText =
        'font-size:0.62rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-muted);';
      cap.textContent = idx === midIdx ? 'MID' : String(idx + 1);
      cell.append(box, cap);
      frag.appendChild(cell);
    });
    swatchStrip.replaceChildren(frag);
  };

  const buildGenConfig = (seed: string, count: number) => {
    const generated = generateColorPalette(seed, count);
    const stepKeys = ['Light', 'Soft', 'Mid (Seed)', 'Rich', 'Deep'];
    const sampleIdx = getSampleIndices(generated.length);
    return {
      title: `Generated ${generated.length}-Color Scale (Midpoint: ${seed})`,
      palette: seed,
      colors: sampleIdx.map((i) => generated[i]),
      indexBy: 'tier',
      keys: stepKeys,
      data: [
        { tier: 'Tier A', Light: 42, Soft: 64, 'Mid (Seed)': 96, Rich: 78, Deep: 58 },
        { tier: 'Tier B', Light: 55, Soft: 74, 'Mid (Seed)': 112, Rich: 88, Deep: 66 },
        { tier: 'Tier C', Light: 38, Soft: 58, 'Mid (Seed)': 84, Rich: 72, Deep: 52 }
      ]
    };
  };

  const applyGenConfig = (cfg: Record<string, any>) => {
    const nextSeed = typeof cfg.palette === 'string' ? cfg.palette : seedColor;
    const ramp = generateColorPalette(nextSeed, genCount);
    renderSwatchStrip(ramp);
    renderUsageSnippet(nextSeed, genCount, ramp);

    genChartEl.setConfig({
      autoSize: true,
      themeMode,
      groupMode: 'grouped',
      borderRadius: 5,
      margin: { top: 44, right: 20, bottom: 68, left: 48 },
      ...cfg
    });
  };

  const initialGenCfg = buildGenConfig(seedColor, genCount);
  applyGenConfig(initialGenCfg);

  const genEditor = createLiveConfigEditor({
    title: 'Live Chart Config (real chart.config)',
    initialConfig: initialGenCfg,
    hint: 'Edit palette (any hex/rgb/hsl seed), colors[], or data — or delete colors[] to use palette directly.',
    onConfigChange: (nextCfg) => {
      if (typeof nextCfg.palette === 'string') {
        const val = nextCfg.palette.trim();
        if (/^#[0-9a-fA-F]{3,6}$/.test(val) || /^(rgb|hsl)a?\(/i.test(val)) {
          seedColor = val;
          seedText.value = seedColor;
          if (/^#[0-9a-fA-F]{6}$/.test(seedColor)) seedPicker.value = seedColor;
        }
      }
      applyGenConfig(nextCfg);
    },
    onReset: () => {
      seedColor = '#2563eb';
      genCount = 20;
      seedPicker.value = seedColor;
      seedText.value = seedColor;
      countSlider.value = '20';
      countVal.textContent = '20';
      const resetCfg = buildGenConfig(seedColor, genCount);
      applyGenConfig(resetCfg);
      genEditor.syncConfig(resetCfg);
    }
  });
  genCodeHost.appendChild(genEditor.element);

  const updateGenFromControls = () => {
    countVal.textContent = String(genCount);
    const nextCfg = buildGenConfig(seedColor, genCount);
    applyGenConfig(nextCfg);
    genEditor.syncConfig(nextCfg);
  };

  seedPicker.addEventListener('input', () => {
    seedColor = seedPicker.value;
    seedText.value = seedColor;
    updateGenFromControls();
  });
  seedText.addEventListener('input', () => {
    const val = seedText.value.trim();
    if (/^#[0-9a-fA-F]{3,6}$/.test(val) || /^(rgb|hsl)a?\(/i.test(val)) {
      seedColor = val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) seedPicker.value = val;
      updateGenFromControls();
    }
  });
  countSlider.addEventListener('input', () => {
    genCount = Number(countSlider.value);
    updateGenFromControls();
  });
  genCard.querySelectorAll<HTMLButtonElement>('[data-seed-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      seedColor = btn.dataset.seedPreset!;
      seedPicker.value = seedColor;
      seedText.value = seedColor;
      updateGenFromControls();
    });
  });

  // Example 3: Directional Gradient Generator (generateGradientPalette & config.gradient)
  const gradCard = document.createElement('section');
  gradCard.className = 'panel-card guide-section';
  gradCard.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 3: Directional Gradient Generator (<code>generateGradientPalette</code> &amp; <code>gradient</code>)</h2>
        <p class="guide-prose" style="margin:4px 0 0;">
          Generate smooth SVG linear gradients from any <strong>theme palette</strong>, <strong>custom <code>colors[]</code> array</strong>,
          or <strong>single seed color</strong> (auto-expanded light → dark just like <code>generateColorPalette</code>).
          Automatically adapts to <strong>vertical vs. horizontal</strong> layouts and <strong>flips direction on negative bars</strong>
          so both positive and negative items radiate outward from the zero axis.
        </p>
      </div>
      <div class="guide-controls-row" style="flex-wrap:wrap;gap:8px;">
        <button type="button" data-grad-source="theme" class="btn-primary">Theme Palette</button>
        <button type="button" data-grad-source="seed">Single Color</button>
        <button type="button" data-grad-source="array">Custom colors[]</button>
        <span style="width:1px;height:20px;background:var(--border-subtle);margin:0 2px;"></span>
        <button type="button" data-grad-layout="vertical" class="btn-primary">Vertical Bars</button>
        <button type="button" data-grad-layout="horizontal">Horizontal Bars</button>
      </div>
    </div>
    <div class="guide-controls-row" style="flex-wrap:wrap;gap:10px;align-items:center;">
      <label id="grad-palette-wrap" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;">
        Palette:
        <select id="grad-palette-select" style="font-size:0.8rem;padding:4px 8px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-code);color:var(--text-main);">
          <option value="shadcn" selected>shadcn (20 colors)</option>
          <option value="material">material (20 colors)</option>
          <option value="bootstrap">bootstrap (20 colors)</option>
          <option value="antd">antd (20 colors)</option>
          <option value="neutral">Neutral (generated)</option>
        </select>
      </label>
      <label id="grad-seed-wrap" style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:none;align-items:center;gap:6px;">
        Seed Color:
        <input type="color" id="grad-seed-picker" value="#2563eb" style="width:30px;height:24px;border:none;background:transparent;cursor:pointer;" />
        <input type="text" id="grad-seed-text" value="#2563eb" aria-label="Gradient seed color hex" style="width:84px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.78rem;padding:4px 6px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-code);color:var(--text-main);" />
        <span style="margin-left:4px;">Count: <strong id="grad-count-val">20</strong></span>
        <input type="range" id="grad-count-slider" min="5" max="50" step="1" value="20" style="vertical-align:middle;" />
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;">
        Direction:
        <select id="grad-direction-select" style="font-size:0.8rem;padding:4px 8px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-code);color:var(--text-main);">
          <option value="auto" selected>Auto (matches layout)</option>
          <option value="vertical">Vertical (0° / 180°)</option>
          <option value="horizontal">Horizontal (270° / 90°)</option>
          <option value="left-to-right">Left → Right (90° / 270°)</option>
          <option value="bottom-to-top">Bottom → Top (180° / 0°)</option>
          <option value="diagonal">Diagonal (45° / 225°)</option>
        </select>
      </label>
      <label style="font-size:0.82rem;color:var(--text-muted);font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="grad-reverse-neg" checked />
        Flip negative bar direction
      </label>
      <span id="grad-angle-badge" style="font-size:0.75rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-muted);padding:3px 8px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-code);"></span>
    </div>
    <div id="grad-swatch-strip" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(32px,1fr));gap:4px;"></div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage" id="guide-grad-chart"></div>
      <div id="guide-grad-code"></div>
    </div>
    <div id="guide-grad-usage"></div>
  `;
  container.appendChild(gradCard);

  const gradChartEl = document.createElement('mc-bar-chart') as MCBaseChart<any>;
  gradCard.querySelector('#guide-grad-chart')!.appendChild(gradChartEl);
  mounted.push(gradChartEl);

  const gradPaletteWrap = gradCard.querySelector('#grad-palette-wrap') as HTMLElement;
  const gradPaletteSelect = gradCard.querySelector('#grad-palette-select') as HTMLSelectElement;
  const gradSeedWrap = gradCard.querySelector('#grad-seed-wrap') as HTMLElement;
  const gradSeedPicker = gradCard.querySelector('#grad-seed-picker') as HTMLInputElement;
  const gradSeedText = gradCard.querySelector('#grad-seed-text') as HTMLInputElement;
  const gradCountSlider = gradCard.querySelector('#grad-count-slider') as HTMLInputElement;
  const gradCountVal = gradCard.querySelector('#grad-count-val') as HTMLElement;
  const gradDirectionSelect = gradCard.querySelector('#grad-direction-select') as HTMLSelectElement;
  const gradReverseNeg = gradCard.querySelector('#grad-reverse-neg') as HTMLInputElement;
  const gradAngleBadge = gradCard.querySelector('#grad-angle-badge') as HTMLElement;
  const gradSwatchStrip = gradCard.querySelector('#grad-swatch-strip') as HTMLElement;
  const gradCodeHost = gradCard.querySelector('#guide-grad-code') as HTMLElement;
  const gradUsageHost = gradCard.querySelector('#guide-grad-usage') as HTMLElement;

  type GradSourceMode = 'theme' | 'seed' | 'array';
  let gradSourceMode: GradSourceMode = 'theme';
  let gradPaletteName: StudioPaletteName = getGlobalPalette();
  gradPaletteSelect.value = gradPaletteName;
  let gradSeedColor = '#2563eb';
  let gradCount = 20;
  let gradCustomColors = ['#2563eb', '#10b981', '#f59e0b'];
  let gradLayout: 'vertical' | 'horizontal' = 'vertical';
  let gradDirection: GradientDirection = 'auto';
  let gradFlipNegative = true;

  const divergingBarData = [
    { q: 'Q1', Operating: 128, 'Net Cash': -48, Variance: 62 },
    { q: 'Q2', Operating: 94, 'Net Cash': 76, Variance: -54 },
    { q: 'Q3', Operating: -64, 'Net Cash': 112, Variance: 85 },
    { q: 'Q4', Operating: 146, 'Net Cash': -38, Variance: -72 }
  ];

  const describeAngle = (deg: number): string => {
    if (deg === 0) return '0° top→bottom';
    if (deg === 180) return '180° bottom→top';
    if (deg === 270) return '270° right→left';
    if (deg === 90) return '90° left→right';
    if (deg === 45) return '45° diagonal';
    if (deg === 225) return '225° rev-diagonal';
    return `${deg}°`;
  };

  const gradientDefToCss = (def: LinearGradientDef, cssDeg: number): string => {
    const stops = (def.colors ?? []).map((entry) => {
      if (typeof entry === 'string') return entry;
      const stop = entry as GradientStop;
      return `${stop.color} ${typeof stop.offset === 'number' ? `${stop.offset}%` : stop.offset}`;
    });
    return `linear-gradient(${cssDeg}deg, ${stops.join(', ')})`;
  };

  const renderGradSwatchStrip = (
    gradients: LinearGradientDef[],
    posAngle: number,
    highlightMid: boolean
  ) => {
    // Convert PatternEngine angle (0 = top->bottom, 270 = right->left) to CSS linear-gradient angle
    const cssDeg = (posAngle + 180) % 360;
    const midIdx = Math.floor((gradients.length - 1) / 2);
    const frag = document.createDocumentFragment();
    gradients.forEach((gradDef, idx) => {
      const cell = document.createElement('div');
      cell.style.cssText =
        'display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;';
      const box = document.createElement('div');
      const isMid = highlightMid && idx === midIdx;
      const midStop = gradDef.colors?.[1];
      const baseHex =
        typeof midStop === 'object' && midStop ? midStop.color : gradDef.id;
      box.title = `${gradDef.id}: ${baseHex}${isMid ? ' (midpoint seed)' : ''}`;
      box.style.cssText = `width:100%;height:28px;border-radius:5px;background:${gradientDefToCss(
        gradDef,
        cssDeg
      )};border:${
        isMid ? '2px solid var(--text-main)' : '1px solid rgba(148,163,184,0.28)'
      };box-sizing:border-box;`;
      const cap = document.createElement('span');
      cap.style.cssText =
        'font-size:0.62rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-muted);';
      cap.textContent = isMid ? 'MID' : String(idx + 1);
      cell.append(box, cap);
      frag.appendChild(cell);
    });
    gradSwatchStrip.replaceChildren(frag);
  };

  const renderGradUsageSnippet = () => {
    const dirLiteral = `'${gradDirection}'`;
    const palette = gradSourceMode === 'seed' ? gradSeedColor : gradPaletteName;
    const sourceColors =
      gradSourceMode === 'array'
        ? gradCustomColors
        : gradSourceMode === 'theme' && gradPaletteName === 'neutral'
          ? STUDIO_PALETTES.neutral
          : undefined;
    const sourceExpr = JSON.stringify(sourceColors ?? palette);
    const countLine = gradSourceMode === 'seed' ? `\n  count: ${gradCount},` : '';

    const snippet = `
import { generateGradientPalette } from 'modern-charts';

// 1. Programmatic utility — works with theme palette names, a single seed color, or colors[]:
const grad = generateGradientPalette(${sourceExpr}, {${countLine}
  direction: ${dirLiteral},       // 'auto' | 'vertical' | 'horizontal' | 'left-to-right' | 'diagonal' | deg
  layout: '${gradLayout}',       // used when direction is 'auto'
  reverseOnNegative: ${gradFlipNegative}, // flips gradient +180° when datum.value < 0
  intensity: 0.3,
  endOpacity: 0.72
});

// Spread { colors, defs, fill } directly into chart.config:
chart.config = {
  data,
  layout: '${gradLayout}',
  ...grad
};

// 2. Zero-import shorthand — set gradient directly on chart.config (or HTML attribute):
// chart.config = {
//   data,
//   layout: '${gradLayout}',
//   ${sourceColors ? 'colors' : 'palette'}: ${sourceExpr},
//   gradient: { direction: ${dirLiteral}, reverseOnNegative: ${gradFlipNegative} }
// };
${sourceColors ? '' : `// <mc-bar-chart palette="${palette}" layout="${gradLayout}" gradient="auto"></mc-bar-chart>`}
`;
    gradUsageHost.replaceChildren(
      createCodeBlock(snippet, 'How to Use generateGradientPalette() & config.gradient')
    );
  };

  const buildGradChartConfig = () => {
    const cfg: Record<string, any> = {
      title: `Directional Gradients (${gradLayout}, ${gradDirection}${
        gradFlipNegative ? ', flip negative' : ''
      })`,
      layout: gradLayout,
      indexBy: 'q',
      keys: ['Operating', 'Net Cash', 'Variance'],
      gradient: {
        direction: gradDirection,
        reverseOnNegative: gradFlipNegative,
        intensity: 0.3,
        endOpacity: 0.72
      },
      data: divergingBarData.map((r) => ({ ...r }))
    };

    if (gradSourceMode === 'theme') {
      cfg.palette = gradPaletteName;
    } else if (gradSourceMode === 'seed') {
      const ramp = generateColorPalette(gradSeedColor, gradCount);
      const mid = Math.floor((ramp.length - 1) / 2);
      const lightIdx = Math.max(0, Math.round(ramp.length * 0.22));
      const deepIdx = Math.min(ramp.length - 1, Math.round(ramp.length * 0.78));
      cfg.palette = gradSeedColor;
      cfg.colors = [ramp[lightIdx], ramp[mid], ramp[deepIdx]];
      cfg.gradient.count = gradCount;
    } else {
      cfg.colors = [...gradCustomColors];
    }

    return cfg;
  };

  const syncGradControlVisibility = () => {
    gradPaletteWrap.style.display = gradSourceMode === 'theme' ? 'inline-flex' : 'none';
    gradSeedWrap.style.display = gradSourceMode === 'seed' ? 'inline-flex' : 'none';
    gradCard.querySelectorAll<HTMLButtonElement>('[data-grad-source]').forEach((b) => {
      b.classList.toggle('btn-primary', b.dataset.gradSource === gradSourceMode);
    });
    gradCard.querySelectorAll<HTMLButtonElement>('[data-grad-layout]').forEach((b) => {
      b.classList.toggle('btn-primary', b.dataset.gradLayout === gradLayout);
    });
  };

  const applyGradConfig = (cfg: Record<string, any>) => {
    const activeLayout: 'vertical' | 'horizontal' =
      cfg.layout === 'horizontal' ? 'horizontal' : 'vertical';
    const rawGrad = cfg.gradient;
    const activeDir: GradientDirection | number =
      typeof rawGrad === 'string' || typeof rawGrad === 'number'
        ? rawGrad
        : rawGrad && typeof rawGrad === 'object' && rawGrad.direction !== undefined
          ? rawGrad.direction
          : 'auto';
    const activeFlip =
      rawGrad && typeof rawGrad === 'object' && rawGrad.reverseOnNegative !== undefined
        ? Boolean(rawGrad.reverseOnNegative)
        : true;
    const activeIntensity =
      rawGrad && typeof rawGrad === 'object' && typeof rawGrad.intensity === 'number'
        ? rawGrad.intensity
        : 0.3;
    const activeEndOpacity =
      rawGrad && typeof rawGrad === 'object' && typeof rawGrad.endOpacity === 'number'
        ? rawGrad.endOpacity
        : 0.72;

    const { positiveAngle, negativeAngle } = resolveGradientAngles(
      activeDir,
      activeLayout
    );
    gradAngleBadge.textContent = activeFlip
      ? `Pos: ${describeAngle(positiveAngle)} · Neg: ${describeAngle(negativeAngle)}`
      : `All bars: ${describeAngle(positiveAngle)}`;

    const previewSource =
      gradSourceMode === 'seed'
        ? typeof cfg.palette === 'string'
          ? cfg.palette
          : gradSeedColor
        : Array.isArray(cfg.colors) && cfg.colors.length > 0
          ? cfg.colors
          : typeof cfg.palette === 'string'
            ? cfg.palette
            : gradPaletteName;
    const previewGenerated = generateGradientPalette(previewSource, {
      count: gradCount,
      direction: activeDir,
      layout: activeLayout,
      reverseOnNegative: activeFlip,
      intensity: activeIntensity,
      endOpacity: activeEndOpacity
    });
    renderGradSwatchStrip(
      previewGenerated.gradients,
      positiveAngle,
      gradSourceMode === 'seed'
    );
    renderGradUsageSnippet();

    gradChartEl.setConfig({
      autoSize: true,
      themeMode,
      groupMode: 'grouped',
      borderRadius: 5,
      markers: [
        {
          id: 'zero-axis',
          type: 'line',
          axis: activeLayout === 'horizontal' ? 'x' : 'y',
          value: 0,
          stroke: 'rgba(148, 163, 184, 0.55)',
          strokeWidth: 1.5,
          strokeDasharray: '4 3'
        }
      ],
      margin:
        activeLayout === 'horizontal'
          ? { top: 44, right: 42, bottom: 68, left: 56 }
          : { top: 44, right: 20, bottom: 68, left: 48 },
      ...cfg
    });
  };

  syncGradControlVisibility();
  const initialGradCfg = buildGradChartConfig();
  applyGradConfig(initialGradCfg);

  const gradEditor = createLiveConfigEditor({
    title: 'Directional Gradient Config (Live)',
    initialConfig: initialGradCfg,
    hint: 'Edit layout ("vertical" | "horizontal"), gradient.direction, reverseOnNegative, palette, colors[], or negative data values.',
    onConfigChange: (nextCfg) => {
      if (nextCfg.layout === 'vertical' || nextCfg.layout === 'horizontal') {
        gradLayout = nextCfg.layout;
        syncGradControlVisibility();
      }
      if (nextCfg.gradient && typeof nextCfg.gradient === 'object') {
        if (typeof nextCfg.gradient.direction === 'string') {
          gradDirection = nextCfg.gradient.direction as GradientDirection;
          gradDirectionSelect.value = gradDirection;
        }
        if (typeof nextCfg.gradient.reverseOnNegative === 'boolean') {
          gradFlipNegative = nextCfg.gradient.reverseOnNegative;
          gradReverseNeg.checked = gradFlipNegative;
        }
      }
      if (Array.isArray(nextCfg.colors) && nextCfg.colors.length > 0 && gradSourceMode === 'array') {
        gradCustomColors = [...nextCfg.colors];
      }
      if (typeof nextCfg.palette === 'string' && gradSourceMode === 'seed') {
        const val = nextCfg.palette.trim();
        if (/^#[0-9a-fA-F]{3,6}$/.test(val) || /^(rgb|hsl)a?\(/i.test(val)) {
          gradSeedColor = val;
          gradSeedText.value = gradSeedColor;
          if (/^#[0-9a-fA-F]{6}$/.test(gradSeedColor)) gradSeedPicker.value = gradSeedColor;
        }
      }
      applyGradConfig(nextCfg);
    },
    onReset: () => {
      gradSourceMode = 'theme';
      gradPaletteName = getGlobalPalette();
      gradSeedColor = '#2563eb';
      gradCount = 20;
      gradCustomColors = ['#2563eb', '#10b981', '#f59e0b'];
      gradLayout = 'vertical';
      gradDirection = 'auto';
      gradFlipNegative = true;
      gradPaletteSelect.value = gradPaletteName;
      gradSeedPicker.value = gradSeedColor;
      gradSeedText.value = gradSeedColor;
      gradCountSlider.value = '20';
      gradCountVal.textContent = '20';
      gradDirectionSelect.value = gradDirection;
      gradReverseNeg.checked = true;
      syncGradControlVisibility();
      const resetCfg = buildGradChartConfig();
      applyGradConfig(resetCfg);
      gradEditor.syncConfig(resetCfg);
    }
  });
  gradCodeHost.appendChild(gradEditor.element);

  const updateGradFromControls = () => {
    gradCountVal.textContent = String(gradCount);
    syncGradControlVisibility();
    const nextCfg = buildGradChartConfig();
    applyGradConfig(nextCfg);
    gradEditor.syncConfig(nextCfg);
  };

  gradCard.querySelectorAll<HTMLButtonElement>('[data-grad-source]').forEach((btn) => {
    btn.addEventListener('click', () => {
      gradSourceMode = btn.dataset.gradSource as GradSourceMode;
      updateGradFromControls();
    });
  });

  gradCard.querySelectorAll<HTMLButtonElement>('[data-grad-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      gradLayout = btn.dataset.gradLayout as 'vertical' | 'horizontal';
      updateGradFromControls();
    });
  });

  gradPaletteSelect.addEventListener('change', () => {
    gradPaletteName = gradPaletteSelect.value as StudioPaletteName;
    updateGradFromControls();
  });

  gradSeedPicker.addEventListener('input', () => {
    gradSeedColor = gradSeedPicker.value;
    gradSeedText.value = gradSeedColor;
    updateGradFromControls();
  });

  gradSeedText.addEventListener('input', () => {
    const val = gradSeedText.value.trim();
    if (/^#[0-9a-fA-F]{3,6}$/.test(val) || /^(rgb|hsl)a?\(/i.test(val)) {
      gradSeedColor = val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) gradSeedPicker.value = val;
      updateGradFromControls();
    }
  });

  gradCountSlider.addEventListener('input', () => {
    gradCount = Number(gradCountSlider.value);
    updateGradFromControls();
  });

  gradDirectionSelect.addEventListener('change', () => {
    gradDirection = gradDirectionSelect.value as GradientDirection;
    updateGradFromControls();
  });

  gradReverseNeg.addEventListener('change', () => {
    gradFlipNegative = gradReverseNeg.checked;
    updateGradFromControls();
  });

  // Example 4: Fully Custom Brand Themes
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

  const ex3 = document.createElement('section');
  ex3.className = 'panel-card guide-section';
  ex3.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Example 4: Crafting Your Own Custom Brand Theme</h2>
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
  container.appendChild(ex3);

  const customLineEl = document.createElement('mc-line-chart') as MCBaseChart<any>;
  ex3.querySelector('#guide-custom-theme-chart')!.appendChild(customLineEl);
  mounted.push(customLineEl);

  const customThemeBtns = ex3.querySelector('#guide-custom-theme-btns') as HTMLElement;
  const customThemeCode = ex3.querySelector('#guide-custom-theme-code') as HTMLElement;
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

  const editor3 = createLiveConfigEditor({
    title: `Custom Theme — ${customThemes[activeCustomKey].label}`,
    initialConfig: initialBrandCfg,
    hint: 'Edit background, textColor, colors[], fontFamily, or gridStrokeDasharray to restyle live.',
    onConfigChange: (nextCfg) => {
      applyCustomLineConfig(nextCfg);
    },
    onReset: () => {
      const resetCfg = buildCustomThemeConfig(activeCustomKey);
      applyCustomLineConfig(resetCfg);
      editor3.syncConfig(resetCfg, {
        title: `Custom Theme — ${customThemes[activeCustomKey].label}`
      });
    }
  });
  customThemeCode.appendChild(editor3.element);

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
      editor3.syncConfig(nextCfg, { title: `Custom Theme — ${preset.label}` });
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
          <tr><td><code>palette</code></td><td><code>'shadcn' | 'material' | 'bootstrap' | 'antd' | string</code></td><td>20-color built-in palette name or a seed color string such as <code>'#2563eb'</code> for a generated light-to-dark ramp.</td></tr>
          <tr><td><code>colors</code></td><td><code>string[]</code></td><td>Explicit series color array (e.g. <code>generateColorPalette('#2563eb', 20)</code>). Overrides <code>palette</code>.</td></tr>
          <tr><td><code>gradient</code></td><td><code>boolean | GradientDirection | ChartGradientConfig</code></td><td>Auto-generates directional SVG linear gradients from <code>palette</code>, <code>colors[]</code>, or a seed color — adapting to vertical/horizontal layouts and flipping direction on negative bars (<code>reverseOnNegative: true</code>).</td></tr>
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
