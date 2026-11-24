import { getGlobalPalette } from '../state/theme';
import {
  createChartI18n,
  type MCBaseChart,
  type ThemeModePreference
} from '../../../src/index';
import { createCodeBlock, createLiveConfigEditor } from './shared';

interface ExampleOptions {
  id: string;
  title: string;
  description: string;
  tag: string;
  config: Record<string, any>;
  presets: Array<{ label: string; config: Record<string, any> }>;
  inspect: (chart: MCBaseChart<any>) => string;
  localizedReadout?: boolean;
}

function mountExample(container: HTMLElement, options: ExampleOptions): MCBaseChart<any> {
  const section = document.createElement('section');
  section.className = 'panel-card guide-section';
  section.id = `i18n-${options.id}`;
  section.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-title"></h2>
        <p class="guide-prose" style="margin:4px 0 0;"></p>
      </div>
      <div class="guide-controls-row" role="group"></div>
    </div>
    <div class="guide-example-grid">
      <div class="guide-chart-stage"></div>
      <div class="i18n-editor"></div>
    </div>
    <div class="inspector-box" style="margin-top:12px;">
      <div class="inspector-title">Live formatter and accessibility output</div>
      <div class="inspector-readout" role="status" aria-live="polite" aria-atomic="true" style="white-space:pre-line;"></div>
    </div>
  `;
  section.querySelector('h2')!.textContent = options.title;
  section.querySelector('p')!.textContent = options.description;
  const controls = section.querySelector('.guide-controls-row')!;
  controls.setAttribute('aria-label', `${options.title} presets`);
  container.appendChild(section);

  const chart = document.createElement(options.tag) as MCBaseChart<any>;
  chart.style.cssText = 'display:block;width:100%;height:100%;';
  section.querySelector('.guide-chart-stage')!.appendChild(chart);
  const readout = section.querySelector<HTMLElement>('.inspector-readout')!;
  const defaultConfig = () => ({ palette: getGlobalPalette(), ...structuredClone(options.config) });
  let currentConfig: Record<string, any> = defaultConfig();

  const apply = (nextConfig: Record<string, any>) => {
    // Validate before updating the chart so incomplete locale/timezone edits keep the last preview.
    createChartI18n(nextConfig.i18n);
    chart.config = { loading: false, layers: chart.defaultLayers, markers: [], labelMode: 'svg', ...nextConfig };
    currentConfig = nextConfig;
    readout.textContent = options.inspect(chart);
    if (options.localizedReadout) {
      const i18n = chart.resolveI18n();
      readout.lang = i18n.locale;
      readout.dir = i18n.direction;
    }
    options.presets.forEach((preset, index) => {
      const active = Object.entries(preset.config).every(([key, expected]) =>
        key === 'i18n'
          ? Object.entries(expected).every(([setting, value]) => nextConfig.i18n?.[setting] === value)
          : nextConfig[key] === expected
      );
      const button = controls.children[index] as HTMLButtonElement;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('btn-primary', active);
    });
  };

  const editor = createLiveConfigEditor({
    title: `${options.title} Config`,
    initialConfig: currentConfig,
    hint: 'Edit chart.config to update the preview. Invalid locale or timezone input keeps the last valid chart; Reset restores this example.',
    onConfigChange: apply,
    onReset: () => {
      const defaults = defaultConfig();
      apply(defaults);
      editor.syncConfig(defaults);
    }
  });
  section.querySelector('.i18n-editor')!.appendChild(editor.element);
  for (const preset of options.presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      const config = {
        ...currentConfig,
        ...preset.config,
        i18n: { ...currentConfig.i18n, ...preset.config.i18n }
      };
      apply(config);
      editor.syncConfig(config);
    });
    controls.appendChild(button);
  }
  apply(currentConfig);
  return chart;
}

export function renderI18nGuide(
  container: HTMLElement,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  const intro = document.createElement('section');
  intro.className = 'panel-card guide-section';
  intro.innerHTML = `
    <h2 class="panel-title">One shared i18n context for every chart</h2>
    <p class="guide-prose">
      Use <code>config.i18n</code> to format chart numbers, percentages, and dates; translate built-in messages;
      and set text direction. These examples update only their own charts, so experimenting here keeps your application defaults intact.
    </p>
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead><tr><th>Setting</th><th>Default</th><th>Behavior</th></tr></thead>
        <tbody>
          <tr><td><code>locale</code></td><td><code>en-US</code></td><td>BCP 47 tag such as <code>de-DE</code>, <code>fr-FR</code>, or <code>ar-EG</code>. Uses the browser's <code>Intl</code> formatters.</td></tr>
          <tr><td><code>timeZone</code></td><td>Runtime local timezone</td><td>Use an explicit timezone such as <code>UTC</code> for reproducible date labels across computers.</td></tr>
          <tr><td><code>direction</code></td><td><code>ltr</code></td><td>Choose <code>rtl</code> explicitly. Text anchors and legends adapt; data and scale order stay the same.</td></tr>
          <tr><td><code>messages</code></td><td>English</td><td>Partial <code>ChartMessages</code> overrides for tooltips, states, zoom buttons, legends, ARIA labels, and accessible table headers.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(intro);

  const numbers = mountExample(container, {
    id: 'numbers',
    title: 'Example 1: Numbers, percentages, and currency',
    description: 'Switch locale or edit i18n.locale. Hover a bar to inspect its localized tooltip; the numeric data stays unchanged. Custom currency and percent formatting appears below.',
    tag: 'mc-bar-chart',
    config: {
      autoSize: true, themeMode, animate: false,
      title: 'Quarterly revenue and costs',
      margin: { top: 44, right: 24, bottom: 76, left: 60 },
      indexBy: 'quarter', keys: ['Revenue', 'Costs'],
      data: [
        { quarter: 'Q1', Revenue: 1234.56, Costs: 840.3 },
        { quarter: 'Q2', Revenue: 1580.5, Costs: 920.8 }
      ],
      i18n: { locale: 'de-DE', timeZone: 'UTC' }
    },
    presets: ['en-US', 'de-DE', 'fr-FR'].map((locale) => ({ label: locale, config: { i18n: { locale } } })),
    inspect: (chart) => {
      const i18n = chart.resolveI18n();
      return `Number: ${i18n.formatNumber(1234.56)}\nPercent (ratio 0.125): ${i18n.formatPercent(0.125, { maximumFractionDigits: 1 })}\nCurrency: ${i18n.formatNumber(1234.56, { style: 'currency', currency: 'EUR' })}`;
    }
  });

  const instant = new Date('2026-01-05T00:00:00Z');
  const dates = mountExample(container, {
    id: 'dates',
    title: 'Example 2: One instant, different timezones',
    description: 'The first timestamp is 2026-01-05T00:00:00Z. It falls on January 4 in Los Angeles and January 5 in UTC and Tokyo. Axis ticks and point tooltips use the selected timezone; the ISO input stays unchanged.',
    tag: 'mc-line-chart',
    config: {
      autoSize: true, themeMode, animate: false,
      title: 'Daily readings',
      margin: { top: 44, right: 28, bottom: 76, left: 56 },
      xScale: { type: 'time' },
      data: [{ id: 'Readings', data: [
        { x: instant.toISOString(), y: 12.5 },
        { x: '2026-01-06T00:00:00Z', y: 18.75 },
        { x: '2026-01-07T00:00:00Z', y: 15.25 }
      ] }],
      i18n: { locale: 'en-US', timeZone: 'UTC' }
    },
    presets: ['UTC', 'America/Los_Angeles', 'Asia/Tokyo'].map((timeZone) => ({ label: timeZone, config: { i18n: { timeZone } } })),
    inspect: (chart) => {
      const i18n = chart.resolveI18n();
      return `${i18n.timeZone}: ${i18n.formatDate(instant, { year: 'numeric', month: 'long', day: 'numeric' })}\nInput: ${instant.toISOString()}`;
    }
  });

  const rtl = mountExample(container, {
    id: 'rtl',
    localizedReadout: true,
    title: 'Example 3: RTL, translated messages, and accessibility',
    description: 'Compare SVG and HTML labels or switch direction. Hover a slice to see the translated Value label; Tab onto a slice to hear its Arabic ARIA label. Edit loading: true or data: [] to preview translated chart states.',
    tag: 'mc-pie-chart',
    config: {
      autoSize: true, themeMode, animate: false,
      title: 'المبيعات والتكاليف', innerRadius: 0.5,
      margin: { top: 44, right: 28, bottom: 64, left: 28 },
      loading: false, labelMode: 'svg',
      data: [{ id: 'المبيعات', value: 1234.5 }, { id: 'التكاليف', value: 840.3 }],
      i18n: {
        locale: 'ar-EG', timeZone: 'UTC', direction: 'rtl',
        messages: {
          total: 'الإجمالي', value: 'القيمة', loading: 'جار التحميل…', empty: 'لا توجد بيانات',
          legend: 'مفتاح الرسم', legendItem: 'المفتاح: {{label}}',
          tableSeries: 'الفئة', tableCategory: 'التصنيف', tableValue: 'القيمة', tableSummary: 'الملخص',
          ariaRoleArc: 'قطاع دائري', ariaArcPercentage: '{{label}}: {{value}} ({{percentage}})',
          chartDescription: 'رسم بياني تفاعلي',
          zoomIn: 'تكبير', zoomOut: 'تصغير', resetZoom: 'إعادة ضبط التكبير', resetZoomLabel: 'إعادة ضبط'
        }
      }
    },
    presets: [
      { label: 'RTL · SVG', config: { i18n: { direction: 'rtl' }, labelMode: 'svg' } },
      { label: 'RTL · HTML', config: { i18n: { direction: 'rtl' }, labelMode: 'foreignObject' } },
      { label: 'LTR · SVG', config: { i18n: { direction: 'ltr' }, labelMode: 'svg' } }
    ],
    inspect: (chart) => chart.chartState === 'loading' ? chart.loadingText
      : chart.chartState === 'empty' ? chart.emptyText
      : chart.shadowRoot?.querySelector('.mc-pie-arc')?.getAttribute('aria-label') ?? ''
  });

  const reference = document.createElement('section');
  reference.className = 'panel-card guide-section';
  reference.innerHTML = `
    <h2 class="panel-title">Application defaults and custom formatters</h2>
    <p class="guide-prose">
      Import the shared service from <code>modern-charts</code> or <code>modern-charts/core</code>.
      <code>configureI18n()</code> replaces global overrides and refreshes connected charts; <code>configureI18n({})</code> restores defaults.
      Per-chart settings override global settings. Missing message keys fall back to global messages, then English.
      Explicit text overrides and custom label, tooltip, and ARIA callbacks keep precedence.
    </p>
  `;
  reference.appendChild(createCodeBlock(`
import { configureI18n, createChartI18n } from 'modern-charts/core';
import 'modern-charts/bar';

configureI18n({
  locale: 'de-DE',
  timeZone: 'UTC',
  messages: {
    loading: 'Wird geladen…',
    empty: 'Keine Daten',
    value: 'Wert',
    tableValue: 'Wert',
    ariaBarCategory: '{{label}} in {{category}}: {{value}}'
  }
});

// This chart inherits global messages and timezone.
const chart = document.createElement('mc-bar-chart');
document.body.appendChild(chart);
chart.config = {
  width: 600, height: 360,
  indexBy: 'quarter', keys: ['Revenue'],
  data: [{ quarter: 'Q1', Revenue: 1234.56 }],
  i18n: { locale: 'ar-EG', direction: 'rtl' }
};

// Use the same formatters outside a chart.
const i18n = createChartI18n({ locale: 'de-DE', timeZone: 'UTC' });
i18n.formatNumber(1234.56);               // '1.234,56'
i18n.formatPercent(0.25);                 // 25 percent; the input is a ratio
i18n.formatDate(new Date('2026-01-05T00:00:00Z'));

// Custom layers receive ctx.i18n with these same formatter methods.
// Use ctx.i18n.formatNumber(value, { style: 'currency', currency: 'EUR' })
// when rendering a currency label; keep raw numeric data for scales and events.
`, 'Global defaults and shared Intl helpers'));
  const note = document.createElement('p');
  note.className = 'guide-prose';
  note.textContent = 'Messages use {{name}} placeholders. ChartMessages lists every supported key. Translate user-provided titles, categories, series names, and units in your application. Locale selection formats values; it does not automatically translate chart content or the Studio interface, choose a currency, or enable RTL.';
  reference.appendChild(note);
  container.appendChild(reference);
  return [numbers, dates, rtl];
}
