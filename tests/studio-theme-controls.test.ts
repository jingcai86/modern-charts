import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PALETTES, type MCBaseChart } from '../src/index';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

const paletteKey = 'modern-charts-palette';
const appearanceKey = 'modern-charts-theme-mode';
let paletteSelect: HTMLSelectElement;
let appearanceSelect: HTMLSelectElement;
let systemIsDark = false;
let onSystemAppearanceChange: (() => void) | undefined;

function select(control: HTMLSelectElement, value: string) {
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function route(hash: string) {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new Event('hashchange'));
}

function detailChart() {
  return document.querySelector<MCBaseChart<any>>('#detail-chart-stage > *')!;
}

beforeAll(async () => {
  const fsModule = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fsModule);
  const html = readFileSync('apps/studio/index.html', 'utf8');
  const template = document.createElement('template');
  template.innerHTML = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  template.content.querySelectorAll('script').forEach((script) => script.remove());
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
  document.body.replaceChildren(template.content.cloneNode(true));
  localStorage.clear();
  localStorage.setItem(paletteKey, 'bootstrap');
  localStorage.setItem(appearanceKey, 'dark');
  history.replaceState(null, '', '#/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    get matches() { return query.includes('prefers-color-scheme') ? systemIsDark : true; },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (query.includes('prefers-color-scheme')) onSystemAppearanceChange = listener;
    },
    removeEventListener: () => {}
  }) as unknown as MediaQueryList);
  await import('../apps/studio/main');
  paletteSelect = document.querySelector('#global-palette-select')!;
  appearanceSelect = document.querySelector('#global-appearance-select')!;
}, 15_000);

afterEach(() => {
  route('#/');
  select(paletteSelect, 'shadcn');
  select(appearanceSelect, 'system');
});

afterAll(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Studio Theme and Appearance controls', () => {
  it('restores independent preferences and explains both controls with a guide link', () => {
    expect(paletteSelect.value).toBe('bootstrap');
    expect(appearanceSelect.value).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(Array.from(paletteSelect.options, (option) => option.value)).toEqual(['shadcn', 'material', 'bootstrap', 'antd']);
    expect(document.querySelector('label[for="global-palette-select"]')!.textContent).toBe('Theme:');
    expect(document.querySelector('label[for="global-appearance-select"]')!.textContent).toBe('Appearance:');
    expect(paletteSelect.compareDocumentPosition(appearanceSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const help = document.getElementById(paletteSelect.getAttribute('aria-describedby')!)!;
    expect(help.textContent).toContain('chart colors');
    expect(help.querySelector('a')!.getAttribute('href')).toBe('#/guide/themes');
  }, 15_000);

  it('updates mounted gallery charts while preserving appearance, data, and other chart settings', () => {
    const charts = Array.from(document.querySelectorAll<MCBaseChart<any>>('.overview-preview-stage > *'));
    const bar = charts.find((chart) => chart.chartType === 'bar')!;
    const { data, markers, layers } = bar.config;
    select(paletteSelect, 'material');
    expect(charts.every((chart) => chart.config.palette === 'material')).toBe(true);
    expect(bar.resolveTheme().colors).toEqual(PALETTES.material);
    expect(bar.config.data).toBe(data);
    expect(bar.config.markers).toBe(markers);
    expect(bar.config.layers).toBe(layers);
    expect(appearanceSelect.value).toBe('system');
    expect(localStorage.getItem(paletteKey)).toBe('material');
    select(appearanceSelect, 'dark');
    expect(bar.resolveTheme().mode).toBe('dark');
    expect(bar.resolveTheme().colors).toEqual(PALETTES.material);
    expect(localStorage.getItem(appearanceKey)).toBe('dark');
  }, 15_000);

  it('retains the chosen theme across detail navigation and reset while respecting custom colors', () => {
    select(paletteSelect, 'bootstrap');
    route('#/chart/bar');
    expect(detailChart().config.palette).toBe('bootstrap');
    const editor = document.querySelector<HTMLTextAreaElement>('#detail-html-preview')!;
    editor.value = formatConfigAssignment({
      ...detailChart().config,
      title: 'My saved chart',
      i18n: { locale: 'de-DE' },
      colors: ['#123456']
    });
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(detailChart().config.title).toBe('My saved chart');
    const data = detailChart().config.data;
    select(paletteSelect, 'antd');
    expect(detailChart().config.title).toBe('My saved chart');
    expect(detailChart().config.data).toBe(data);
    expect(detailChart().resolveI18n().locale).toBe('de-DE');
    expect(detailChart().resolveTheme().colors).toEqual(['#123456']);
    route('#/');
    route('#/chart/bar');
    expect(detailChart().config.palette).toBe('antd');
    document.querySelector<HTMLButtonElement>('#btn-reset-config')!.click();
    expect(detailChart().config.palette).toBe('antd');
    expect(detailChart().resolveTheme().colors).toEqual(PALETTES.antd);
  }, 15_000);

  it('keeps guide editors consistent with the selected default and preserves custom theme examples', () => {
    select(paletteSelect, 'bootstrap');
    route('#/guide/themes');
    const guideBar = () => document.querySelector<MCBaseChart<any>>('#guide-theme-bar > *')!;
    const editor = () => document.querySelector<HTMLTextAreaElement>('#guide-theme-code-1 textarea')!;
    expect(guideBar().config.palette).toBe('bootstrap');
    expect(document.querySelector<HTMLSelectElement>('#grad-palette-select')!.value).toBe('bootstrap');
    expect(parseConfigObjectLiteral(editor().value).palette).toBe('bootstrap');
    select(appearanceSelect, 'dark');
    expect(guideBar().config.palette).toBe('bootstrap');
    expect(guideBar().resolveTheme().mode).toBe('dark');
    select(paletteSelect, 'material');
    expect(document.querySelector<HTMLSelectElement>('#grad-palette-select')!.value).toBe('material');
    const custom = document.querySelector<MCBaseChart<any>>('#guide-custom-theme-chart > *')!;
    expect(custom.config.colors).toEqual(['#b91c1c', '#1d4ed8', '#15803d']);
    expect(custom.config.theme?.background).toBe('#faf6ef');
    route('#/guide/i18n');
    const localizedChart = document.querySelector<MCBaseChart<any>>('#i18n-numbers mc-bar-chart')!;
    const localizedEditor = document.querySelector<HTMLTextAreaElement>('#i18n-numbers textarea')!;
    expect(localizedChart.config.palette).toBe('material');
    expect(parseConfigObjectLiteral(localizedEditor.value).palette).toBe('material');
    expect(localizedChart.resolveI18n().locale).toBe('de-DE');
  }, 15_000);

  it('synchronizes palette changes across tabs and keeps OS appearance updates independent', () => {
    localStorage.setItem(paletteKey, 'antd');
    window.dispatchEvent(new StorageEvent('storage', { key: paletteKey, newValue: 'antd' }));
    expect(paletteSelect.value).toBe('antd');
    select(appearanceSelect, 'system');
    systemIsDark = true;
    onSystemAppearanceChange!();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(appearanceSelect.value).toBe('system');
    expect(paletteSelect.value).toBe('antd');
    localStorage.setItem(paletteKey, 'unknown-theme');
    window.dispatchEvent(new StorageEvent('storage', { key: paletteKey, newValue: 'unknown-theme' }));
    expect(paletteSelect.value).toBe('shadcn');
    expect(appearanceSelect.value).toBe('system');
    systemIsDark = false;
  }, 15_000);
});
