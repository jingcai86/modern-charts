import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createChartI18n,
  createDefaultTheme,
  registerModernCharts,
  type MCBarChart,
  type MCLabelElement,
  type MCTooltipElement,
  type MCTruncateElement,
  type TooltipPayload
} from '../src/index';

registerModernCharts();

const theme = createDefaultTheme('light');
const container = new DOMRect(0, 0, 320, 240);

function mountTooltip() {
  const element = document.createElement('mc-tooltip') as MCTooltipElement;
  document.body.append(element);
  return element;
}

function tooltipBody(tooltip: MCTooltipElement) {
  return tooltip.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!;
}

function tooltipPayload(): TooltipPayload {
  return { chartType: 'bar', title: 'Monthly sales', label: 'Sales', value: 12, clientX: 40, clientY: 50 };
}

afterEach(() => document.body.replaceChildren());

describe('tooltip customization', () => {
  it('gives declarative position and gap priority until they are cleared', () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const tooltip = document.createElement('mc-tooltip') as MCTooltipElement;
    tooltip.config = { position: 'follow', anchorGap: 7, offsetX: 3 };
    tooltip.position = 'item';
    tooltip.anchorGap = 18;
    tooltip.setAttribute('offset-x', 'invalid');
    chart.append(tooltip);
    document.body.append(chart);

    expect(tooltip.hasAttribute('data-config-only')).toBe(true);
    expect(tooltip.position).toBe('item');
    expect(tooltip.anchorGap).toBe(18);
    expect(chart.resolveTooltipConfig()).toMatchObject({ position: 'item', anchorGap: 18, offsetX: 3 });

    tooltip.position = undefined;
    tooltip.anchorGap = undefined;
    expect(tooltip.position).toBe('follow');
    expect(tooltip.anchorGap).toBe(7);
    expect(chart.resolveTooltipConfig()).toMatchObject({ position: 'follow', anchorGap: 7, offsetX: 3 });
  });

  it('can defer to the default content, replace it, or suppress it through rendering hooks', () => {
    const tooltip = mountTooltip();
    tooltip.renderer = (payload, defaultRender) => {
      const content = defaultRender();
      content.dataset.chart = payload.chartType;
      return content;
    };
    expect(tooltip.show(tooltipPayload(), theme, container, { className: 'monthly active' })).toBe(true);
    expect(tooltipBody(tooltip).querySelector('[data-chart="bar"]')?.textContent).toContain('Monthly sales');
    expect(tooltip.classList.contains('monthly')).toBe(true);

    expect(tooltip.show(tooltipPayload(), theme, container, {
      className: 'single',
      renderer: () => undefined
    })).toBe(true);
    expect(tooltipBody(tooltip).querySelector('[part="value"]')?.textContent).toBe('12');
    expect(tooltip.classList.contains('monthly')).toBe(false);
    expect(tooltip.classList.contains('single')).toBe(true);

    tooltip.renderer = undefined;
    tooltip.formatter = () => '<strong>One dozen</strong>';
    expect(tooltip.show(tooltipPayload(), theme, container)).toBe(true);
    expect(tooltipBody(tooltip).textContent).toBe('One dozen');
    tooltip.formatter = () => undefined;
    expect(tooltip.show(tooltipPayload(), theme, container)).toBe(true);
    expect(tooltipBody(tooltip).querySelector('[part="value"]')?.textContent).toBe('12');
    expect(tooltip.show(tooltipPayload(), theme, container, { renderer: () => null })).toBe(false);
    expect(tooltip.hidden).toBe(true);
    expect(tooltip.show(tooltipPayload(), theme, container, { enabled: false })).toBe(false);
  });

  it('keeps interpolated tooltip fields as text and localizes formatted fields', () => {
    const tooltip = mountTooltip();
    const templateHtml = `
      <span data-title>{{ title }}</span>
      <span data-series>{{ seriesId }} / {{ category }}</span>
      <span data-value>{{value}} | {{formattedValue}} | {{percentage}}</span>
      <span data-note>{{datum.note}} | {{datum.missing}}</span>
    `;
    tooltip.show({
      ...tooltipPayload(),
      title: '<North & South>',
      seriesId: 'Wholesale',
      category: 'January',
      value: 12.5,
      percentage: 25.5,
      datum: { note: '<b>Forecast</b>' }
    }, theme, container, { templateHtml }, createChartI18n({ locale: 'de-DE' }));

    const body = tooltipBody(tooltip);
    expect(body.querySelector('[data-title]')?.textContent).toBe('<North & South>');
    expect(body.querySelector('[data-series]')?.textContent).toBe('Wholesale / January');
    expect(body.querySelector('[data-value]')?.textContent).toMatch(/^12\.5 \| 12,5 \| 25,5\s%$/);
    expect(body.querySelector('[data-note]')?.textContent).toBe('<b>Forecast</b> | ');
    expect(body.querySelector('b')).toBeNull();
  });

  it.each([[20, 'bottom'], [53, 'top']] as const)(
    'clamps a keyboard tooltip at anchor top %i when neither side fits', (top, placement) => {
      const tooltip = mountTooltip();
      vi.spyOn(tooltip, 'offsetWidth', 'get').mockReturnValue(100);
      vi.spyOn(tooltip, 'offsetHeight', 'get').mockReturnValue(70);
      const chartBounds = new DOMRect(0, 0, 160, 90);
      tooltip.show({
        ...tooltipPayload(),
        source: 'keyboard',
        anchor: { left: 0, top, width: 18, height: 20, relative: true }
      }, theme, chartBounds, { position: 'follow' });

      expect(tooltip.activePositionMode).toBe('item');
      expect(tooltip.getAttribute('data-placement')).toBe(placement);
      const transform = tooltip.style.transform;
      expect(transform).toBe(`translate(8px, ${placement === 'top' ? 8 : 12}px)`);
      tooltip.moveToPointer(150, 80, chartBounds);
      expect(tooltip.style.transform).toBe(transform);
    }
  );
});

describe('standalone label and truncation updates', () => {
  it('restores the full standalone label when property limits are cleared', () => {
    const label = document.createElement('mc-label') as MCLabelElement;
    label.textContent = 'September sales';
    document.body.append(label);
    label.text = 'November sales';
    label.fontSize = 16;
    label.maxChars = 7;
    label.ellipsis = '~';
    const svg = label.shadowRoot!.querySelector('.mc-label-standalone-svg')!;
    expect(svg.textContent).toContain('Novemb~');
    expect(label.lastMeasured?.truncated).toBe(true);

    label.maxChars = undefined;
    label.ellipsis = undefined;
    label.fontSize = undefined;
    expect(svg.textContent).toContain('November sales');
    expect(label.lastMeasured?.truncated).toBe(false);
    label.text = '';
    expect(svg.textContent).toContain('September sales');
  });

  it('merges label overrides with nested truncation and controls tab access to full text', () => {
    const truncate = document.createElement('mc-truncate') as MCTruncateElement;
    truncate.textContent = 'October revenue';
    truncate.maxChars = 7;
    truncate.ellipsis = '~';
    document.body.append(truncate);
    const text = truncate.shadowRoot!.querySelector('.mc-truncate-text')!;
    expect(text.textContent).toBe('Octobe~');
    expect(text.getAttribute('aria-label')).toBe('October revenue');
    expect(text.getAttribute('tabindex')).toBe('0');

    truncate.tooltip = { enabled: false };
    expect(truncate.enableTooltip).toBe(false);
    expect(text.hasAttribute('tabindex')).toBe(false);
    truncate.tooltip = undefined;
    expect(text.getAttribute('tabindex')).toBe('0');

    const label = document.createElement('mc-label') as MCLabelElement;
    label.target = 'axis-tick';
    label.maxChars = 10;
    label.tooltip = { anchorGap: 12 };
    const tooltip = document.createElement('mc-tooltip');
    tooltip.setAttribute('offset-x', '6');
    label.append(truncate, tooltip);
    expect(label.toStyleOverride()).toMatchObject({
      target: 'axis-tick', maxChars: 10, ellipsis: '~', tooltip: { anchorGap: 12, offsetX: 6 }
    });

    label.maxChars = undefined;
    expect(label.toStyleOverride().maxChars).toBe(7);
    truncate.maxChars = undefined;
    expect(label.toStyleOverride().maxChars).toBeUndefined();
  });
});
