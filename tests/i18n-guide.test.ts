import { afterEach, describe, expect, it } from 'vitest';
import { configureI18n, getI18nConfig } from '../src/index';
import { GUIDES_CATALOG, renderGuidePage } from '../apps/studio/guides';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

afterEach(() => {
  document.body.replaceChildren();
  configureI18n({});
});

function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  const charts = renderGuidePage(root, 'i18n', 'dark');
  const section = (id: string) => root.querySelector<HTMLElement>(`#i18n-${id}`)!;
  const button = (id: string, label: string) => Array.from(section(id).querySelectorAll('button'))
    .find((element) => element.textContent === label)!;
  const editor = (id: string) => section(id).querySelector<HTMLTextAreaElement>('textarea')!;
  const edit = (id: string, change: (config: Record<string, any>) => void) => {
    const textarea = editor(id);
    const config = parseConfigObjectLiteral(textarea.value);
    change(config);
    textarea.value = formatConfigAssignment(config);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return textarea;
  };
  return { root, charts, section, button, editor, edit };
}

describe('Internationalization Studio guide', () => {
  it('is discoverable and keeps application defaults unchanged when mounted and removed', async () => {
    const fsModule = 'node:fs';
    const { readFileSync } = await import(/* @vite-ignore */ fsModule);
    configureI18n({ locale: 'ja-JP', messages: { loading: '読込中' } });
    const globalConfig = getI18nConfig();
    const { root, charts } = mount();
    expect(GUIDES_CATALOG.find((guide) => guide.id === 'i18n')?.title).toContain('Internationalization');
    const navigation = document.createElement('template');
    navigation.innerHTML = readFileSync('apps/studio/index.html', 'utf8');
    expect(navigation.content.querySelector('[data-nav-route="guide:i18n"]')?.getAttribute('href')).toBe('#/guide/i18n');
    expect(root.querySelector('h1')!.textContent).toContain('Internationalization');
    expect(charts).toHaveLength(3);
    expect(charts.every((chart) => chart.config.themeMode === 'dark')).toBe(true);
    expect(root.querySelectorAll('textarea')).toHaveLength(3);
    expect(getI18nConfig()).toEqual(globalConfig);
    root.remove();
    expect(getI18nConfig()).toEqual(globalConfig);
  });

  it('switches locales, preserves editor changes, and rejects incomplete locales without losing the preview', () => {
    const { charts: [numbers], section, button, editor, edit } = mount();
    const label = () => numbers.shadowRoot!.querySelector('[data-label-id="bar-label-0"]')!.textContent;
    expect(label()).toBe('1234,56');
    button('numbers', 'en-US').click();
    expect(label()).toBe('1234.56');
    expect(button('numbers', 'en-US').getAttribute('aria-pressed')).toBe('true');
    expect(numbers.config.data[0].Revenue).toBe(1234.56);

    edit('numbers', (config) => { config.i18n.messages = { value: 'Montant' }; });
    button('numbers', 'fr-FR').click();
    expect(numbers.resolveI18n().messages.value).toBe('Montant');
    expect(parseConfigObjectLiteral(editor('numbers').value).i18n.locale).toBe('fr-FR');
    expect(section('numbers').querySelector('.inspector-readout')!.textContent).toContain('12,5');

    edit('numbers', (config) => { config.loading = true; });
    expect(numbers.chartState).toBe('loading');
    const textarea = edit('numbers', (config) => { config.i18n.locale = 'de-'; });
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(numbers.resolveI18n().locale).toBe('fr-FR');
    section('numbers').querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(textarea.getAttribute('aria-invalid')).toBe('false');
    expect(numbers.chartState).toBe('ready');
    expect(numbers.resolveI18n().locale).toBe('de-DE');
    expect(numbers.resolveI18n().messages.value).toBe('Value');
  });

  it('shows the same instant on different dates and preserves the ISO timestamp in point tooltips', () => {
    const { charts: [, dates], section, button, edit } = mount();
    const output = () => section('dates').querySelector('.inspector-readout')!.textContent;
    expect(output()).toContain('January 5, 2026');
    button('dates', 'America/Los_Angeles').click();
    expect(output()).toContain('January 4, 2026');
    const point = dates.shadowRoot!.querySelector('.mc-line-point')!;
    point.dispatchEvent(new MouseEvent('mouseenter', { clientX: 100, clientY: 100 }));
    expect(dates.getTooltipElement()!.lastPayload!.label).toBe('Jan 04');
    expect(dates.getTooltipElement()!.lastPayload!.datum!.x).toBe('2026-01-05T00:00:00.000Z');

    edit('dates', (config) => { config.i18n.timeZone = 'Invalid/Zone'; });
    expect(dates.resolveI18n().timeZone).toBe('America/Los_Angeles');
    button('dates', 'Asia/Tokyo').click();
    expect(output()).toContain('January 5, 2026');
  });

  it('previews RTL HTML labels, translated states, and custom message edits, then resets', () => {
    const { charts: [, , rtl], section, button, edit } = mount();
    const preview = section('rtl');
    button('rtl', 'RTL · HTML').click();
    expect(rtl.shadowRoot!.querySelector('.mc-chart-container')!.getAttribute('dir')).toBe('rtl');
    expect(rtl.shadowRoot!.querySelector('[data-label-id="pie-center-label"] foreignObject')).not.toBeNull();
    expect(preview.querySelector('.inspector-readout')!.getAttribute('lang')).toBe('ar-EG');
    expect(preview.querySelector('.inspector-readout')!.getAttribute('dir')).toBe('rtl');
    expect(preview.querySelector('.inspector-readout')!.textContent).toContain('١٢٣٤٫٥');

    edit('rtl', (config) => { config.i18n.messages.total = 'المجموع'; });
    expect(rtl.shadowRoot!.querySelector('[data-label-id="pie-center-label"]')!.textContent).toContain('المجموع');
    edit('rtl', (config) => { config.loading = true; });
    expect(rtl.getStateElement()!.loadingText).toBe('جار التحميل…');
    expect(preview.querySelector('.inspector-readout')!.textContent).toBe('جار التحميل…');
    edit('rtl', (config) => { config.loading = false; config.data = []; });
    expect(preview.querySelector('.inspector-readout')!.textContent).toBe('لا توجد بيانات');
    preview.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
    expect(rtl.chartState).toBe('ready');
    expect(rtl.config.labelMode).toBe('svg');
    expect(rtl.shadowRoot!.querySelector('[data-label-id="pie-center-label"]')!.textContent).toContain('الإجمالي');
  });
});
