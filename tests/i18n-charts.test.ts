import { afterEach, describe, expect, it } from 'vitest';
import {
  configureI18n,
  type MCBarChart,
  type MCLineChart,
  type MCPieChart,
  type ChartI18n,
  type TooltipPayload
} from '../src/index';

afterEach(() => {
  document.body.replaceChildren();
  configureI18n({});
});

function bar(locale?: string): MCBarChart {
  const chart = document.createElement('mc-bar-chart') as MCBarChart;
  chart.config = {
    data: [{ quarter: 'Q1', revenue: 1234.5 }],
    indexBy: 'quarter',
    keys: ['revenue'],
    width: 600,
    height: 360,
    animate: false,
    i18n: locale ? { locale } : undefined
  };
  document.body.append(chart);
  return chart;
}

describe('chart internationalization', () => {
  it('updates connected charts with global defaults while keeping per-chart overrides', () => {
    const inherited = bar();
    const japanese = bar('ja-JP');
    const text = (chart: MCBarChart) => chart.shadowRoot!.querySelector('[data-label-id="bar-label-0"]')!.textContent;
    expect(text(inherited)).toBe('1234.5');

    configureI18n({ locale: 'de-DE', messages: { zoomIn: 'Vergrößern' } });
    expect(text(inherited)).toBe('1234,5');
    expect(text(japanese)).toBe('1234.5');
    expect(japanese.shadowRoot!.querySelector('[data-zoom="in"]')!.getAttribute('aria-label')).toBe('Vergrößern');
    expect(inherited.shadowRoot!.querySelector('.mc-chart-container')!.getAttribute('lang')).toBe('de-DE');

    inherited.remove();
    configureI18n({ locale: 'fr-FR' });
    expect(inherited.shadowRoot!.querySelector('.mc-chart-container')!.getAttribute('lang')).toBe('de-DE');
    document.body.append(inherited);
    expect(inherited.shadowRoot!.querySelector('.mc-chart-container')!.getAttribute('lang')).toBe('fr-FR');
  });

  it('uses translated messages for controls, states, chart descriptions, and accessible tables', () => {
    const chart = bar();
    chart.config = {
      ...chart.config,
      i18n: {
        locale: 'de-DE',
        messages: {
          resetZoom: 'Zoom zurücksetzen', resetZoomLabel: 'Zurück',
          chartTitle: 'Diagramm {{chartType}}', chartDescription: 'Interaktiv: {{chartType}}',
          loading: 'Wird geladen', empty: 'Keine Daten', tableValue: 'Wert',
          ariaBarCategory: '{{label}} / {{category}} = {{value}}'
        }
      }
    };
    const shadow = chart.shadowRoot!;
    expect(shadow.querySelector('#mc-svg-title')!.textContent).toBe('Diagramm bar');
    expect(shadow.querySelector('#mc-svg-desc')!.textContent).toBe('Interaktiv: bar');
    expect(shadow.querySelector('[data-zoom="reset"]')!.textContent).toBe('Zurück');
    expect(shadow.querySelector('[data-zoom="reset"]')!.getAttribute('aria-label')).toBe('Zoom zurücksetzen');
    expect(shadow.querySelector('.mc-bar-rect')!.getAttribute('aria-label')).toBe('revenue / Q1 = 1234,5');
    expect(shadow.querySelector('.mc-aria-table')!.textContent).toContain('Wert');

    chart.loading = true;
    expect(chart.getStateElement()!.loadingText).toBe('Wird geladen');
    chart.loadingText = 'Custom loading';
    expect(chart.getStateElement()!.loadingText).toBe('Custom loading');
    chart.config = { ...chart.config, loading: false, data: [] };
    expect(chart.getStateElement()!.emptyText).toBe('Keine Daten');
  });

  it('localizes pie percentages and totals in labels, focus text, and pointer tooltips', () => {
    const pie = document.createElement('mc-pie-chart') as MCPieChart;
    pie.config = {
      data: [{ id: 'A', value: 1234.5 }, { id: 'B', value: 1234.5 }],
      width: 600, height: 360, innerRadius: 0.5, animate: false,
      i18n: { locale: 'de-DE', messages: { total: 'Gesamt', value: 'Wert' } }
    };
    document.body.append(pie);
    const shadow = pie.shadowRoot!;
    expect(shadow.querySelector('[data-label-id="pie-center-label"]')!.textContent).toContain('Gesamt');
    expect(shadow.textContent).toContain('2.469');
    const slice = shadow.querySelector('.mc-pie-arc')!;
    expect(slice.getAttribute('aria-label')).toContain('1234,5 (50,0\u00a0%)');
    slice.dispatchEvent(new MouseEvent('mouseenter', { clientX: 120, clientY: 120 }));
    const tooltip = pie.getTooltipElement()!;
    expect(tooltip.renderedHtml).toContain('Wert:');
    expect(tooltip.shadowRoot!.textContent).toContain('1234,5 (50,0\u00a0%)');
    expect(tooltip.lastPayload!.value).toBe(1234.5);
  });

  it('passes resolved formatters to custom layers and preserves raw callback/template values', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    let context: ChartI18n | undefined;
    let payload: TooltipPayload | undefined;
    line.config = {
      data: [{ id: 'S', data: [{ x: 'Q1', y: 1234.5 }] }],
      width: 600, height: 360, animate: false,
      i18n: { locale: 'de-DE', direction: 'rtl', timeZone: 'UTC' },
      layers: ['points', { name: 'capture', render: (ctx) => { context = ctx.i18n; } }],
      tooltip: { formatter: (item) => { payload = item; return undefined; } }
    };
    document.body.append(line);
    expect(context!.formatDate(new Date('2026-01-05T00:00:00Z'), { year: 'numeric' })).toBe('2026');
    expect(context!.direction).toBe('rtl');
    line.showTooltip({ value: 1234.5, percentage: 12.5, datum: { 販売: '<b>名前</b>' } }, 10, 10);
    expect(payload!.value).toBe(1234.5);
    line.config = { ...line.config, tooltip: { templateHtml: '{{value}}|{{formattedValue}}|{{percentage}}|{{datum.販売}}' } };
    line.showTooltip({ value: 1234.5, percentage: 12.5, datum: { 販売: '<b>名前</b>' } }, 10, 10);
    expect(line.getTooltipElement()!.shadowRoot!.textContent).toContain('1234.5|1234,5|12,5\u00a0%|<b>名前</b>');
    expect(line.getTooltipElement()!.shadowRoot!.querySelector('b')).toBeNull();
    expect(line.getTooltipElement()!.dir).toBe('rtl');
  });

  it('uses the configured timezone in line tooltips while preserving the input timestamp', () => {
    const line = document.createElement('mc-line-chart') as MCLineChart;
    const timestamp = '2026-01-05T00:00:00Z';
    line.config = {
      data: [{ id: 'S', data: [{ x: timestamp, y: 12.34567 }] }],
      width: 600, height: 360, animate: false,
      xScale: { type: 'time' },
      i18n: { locale: 'en-US', timeZone: 'America/Los_Angeles' }
    };
    document.body.append(line);
    const show = () => line.shadowRoot!.querySelector('.mc-line-point')!
      .dispatchEvent(new MouseEvent('mouseenter', { clientX: 120, clientY: 120 }));
    show();
    expect(line.getTooltipElement()!.lastPayload!.label).toBe('Jan 04');
    expect(line.getTooltipElement()!.lastPayload!.datum!.x).toBe(timestamp);
    expect(line.getTooltipElement()!.lastPayload!.formattedValue).toBe('12.34567');
    line.config = { ...line.config, i18n: { locale: 'en-US', timeZone: 'UTC' } };
    show();
    expect(line.getTooltipElement()!.lastPayload!.label).toBe('Jan 05');
  });

  it('dismisses visible tooltips when localization changes so they cannot show stale text', () => {
    const chart = bar();
    const show = () => chart.shadowRoot!.querySelector('.mc-bar-rect')!
      .dispatchEvent(new MouseEvent('mouseenter', { clientX: 120, clientY: 120 }));
    show();
    const tooltip = chart.getTooltipElement()!;
    expect(tooltip.hidden).toBe(false);
    configureI18n({ locale: 'de-DE' });
    expect(tooltip.hidden).toBe(true);
    show();
    expect(tooltip.shadowRoot!.textContent).toContain('1234,5');
    chart.config = { ...chart.config, i18n: { direction: 'rtl' } };
    expect(tooltip.hidden).toBe(true);
    show();
    expect(tooltip.dir).toBe('rtl');
  });
});
