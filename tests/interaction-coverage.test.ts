import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import type { MCBarChart } from '../src/charts/mc-bar-chart';
import type { MCAriaLayer } from '../src/components/mc-aria';
import { AriaEngine } from '../src/core/aria-engine';
import { EventEngine } from '../src/core/event-engine';
import { createChartI18n } from '../src/core/i18n';
import type { AriaItemDescriptor, ChartEventPayload } from '../src/core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

afterEach(() => document.body.replaceChildren());

describe('Chart accessibility', () => {
  it('moves keyboard focus only across visible items and activates Enter and Space once each', () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const aria = document.createElement('mc-aria-layer') as MCAriaLayer;
    aria.itemRole = () => 'button';
    aria.itemLabel = '{{seriesId}} in {{category}}';
    aria.itemDescription = (item) => `Value ${item.value}`;
    aria.itemHidden = (item) => item.category === 'Hidden';
    aria.itemAttributes = (item) => ({
      'aria-pressed': item.category === 'Current',
      'aria-details': item.category === 'Current' ? 'chart-details' : undefined
    });
    chart.append(aria);
    chart.config = {
      width: 480, height: 300, indexBy: 'place', keys: ['Sales'], animate: false,
      data: [
        { place: 'Current', Sales: 10 },
        { place: 'Hidden', Sales: 20 },
        { place: 'Previous', Sales: 30 }
      ]
    };
    document.body.append(chart);

    const root = chart.shadowRoot!;
    const [current, hidden, previous] = Array.from(root.querySelectorAll<SVGElement>('.mc-bar-rect.mc-aria-item'));
    expect(current.getAttribute('role')).toBe('button');
    expect(current.getAttribute('aria-pressed')).toBe('true');
    expect(current.getAttribute('aria-details')).toBe('chart-details');
    expect(current.getAttribute('aria-label')).toBe('Sales in Current');
    expect(current.getAttribute('aria-description')).toBe('Value 10');
    expect(previous.getAttribute('aria-pressed')).toBe('false');
    expect(previous.hasAttribute('aria-details')).toBe(false);
    expect(hidden.getAttribute('aria-hidden')).toBe('true');
    expect(hidden.hasAttribute('tabindex')).toBe(false);

    current.focus();
    expect(root.activeElement).toBe(current);
    const key = (element: SVGElement, name: string, type = 'keydown') =>
      element.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true }));
    expect(key(current, 'ArrowRight')).toBe(false);
    expect(root.activeElement).toBe(previous);
    expect(key(previous, 'ArrowLeft')).toBe(false);
    expect(root.activeElement).toBe(current);
    key(current, 'ArrowUp');
    expect(root.activeElement).toBe(previous);
    key(previous, 'Home');
    expect(root.activeElement).toBe(current);
    key(current, 'End');
    expect(root.activeElement).toBe(previous);

    const activate = vi.fn();
    chart.addEventListener('mc-item-activate', activate);
    expect(key(previous, 'Enter')).toBe(false);
    expect(activate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      detail: expect.objectContaining({ label: 'Sales in Previous', chartType: 'bar' })
    }));
    expect(key(previous, ' ')).toBe(false);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(key(previous, ' ', 'keyup')).toBe(false);
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('associates items with external labels and describes localized links using datum fields', () => {
    const engine = new AriaEngine();
    const i18n = createChartI18n({ locale: 'de-DE' });
    const item: AriaItemDescriptor = {
      id: 'flow-1', type: 'sankey-link', index: 0, total: 1,
      source: 'West', target: 'East', value: 1.25,
      datum: { unit: 'L/min' }
    };
    const symbol = document.createElementNS(SVG_NS, 'g');
    engine.decorateItem(symbol, item, {
      enabled: true, role: 'figure', isFocusable: false,
      announceOnFocus: false, includeDataTable: true,
      itemRoleDescription: ({ type }) => `Custom ${type}`,
      itemLabelledBy: ({ id }) => `label-${id}`,
      itemDescribedBy: 'units-description',
      itemDescription: '{{source}} → {{target}} ({{unit}})'
    }, {
      linkAriaLabel: 'Link {{id}}: {{formattedValue}}', i18n: { locale: 'de-DE' }
    }, {}, i18n);

    expect(symbol.getAttribute('role')).toBe('graphics-symbol');
    expect(symbol.getAttribute('aria-roledescription')).toBe('Custom sankey-link');
    expect(symbol.getAttribute('aria-labelledby')).toBe('label-flow-1');
    expect(symbol.getAttribute('aria-describedby')).toBe('units-description');
    expect(symbol.getAttribute('aria-description')).toBe('West → East (L/min)');
    expect(symbol.getAttribute('aria-label')).toBe('Link flow-1: 1,25');
    expect(symbol.hasAttribute('tabindex')).toBe(false);
  });

  it('bounds the table fallback and escapes the chart title, category, and item labels', () => {
    const engine = new AriaEngine();
    const i18n = createChartI18n({ locale: 'de-DE' });
    expect(engine.buildAccessibleDataTableHtml('Empty', [], i18n)).toBe('');
    const items = Array.from({ length: 101 }, (_, index) => ({
      item: {
        id: `row-${index}`, type: 'bar' as const, index, total: 101,
        label: `Revenue <${index}>`, category: 'Q1 & Q2', value: 1.25, datum: {}
      },
      label: `Revenue "row ${index}"`
    }));
    const container = document.createElement('div');
    container.innerHTML = engine.buildAccessibleDataTableHtml('Budget <2026>', items, i18n);
    expect(container.querySelector('caption')?.textContent).toBe('Budget <2026>');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(100);
    expect(Array.from(container.querySelectorAll('tbody tr:first-child > *'), (cell) => cell.textContent)).toEqual([
      'Revenue <0>', 'Q1 & Q2', '1,25', 'Revenue "row 0"'
    ]);
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(4);
    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(100);
    expect(container.textContent).not.toContain('row 100');
  });
});

describe('Delegated chart events', () => {
  it('emits one enter per item, supplies a leave on following items, and detaches cleanly', () => {
    const host = document.createElement('div');
    const svg = document.createElementNS(SVG_NS, 'svg');
    const first = document.createElementNS(SVG_NS, 'g');
    const child = document.createElementNS(SVG_NS, 'rect');
    const second = document.createElementNS(SVG_NS, 'g');
    first.append(child);
    svg.append(first, second);
    host.append(svg);
    document.body.append(host);

    const engine = new EventEngine();
    const events: Array<[string, string | undefined]> = [];
    const record = (event: ChartEventPayload) => events.push([event.type, event.targetId]);
    engine.attach({
      host, svg, getChartType: () => 'bar', getConfig: () => ({}),
      getMargin: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
    });
    engine.registerTarget(first, { target: 'barItem', category: 'item', id: 'first' });
    engine.registerTarget(second, { target: 'barItem', category: 'item', id: 'second' });
    const stopEnter = engine.on('item:mouseEnter', record);
    const stopLeave = engine.on('item:mouseLeave', record);

    first.dispatchEvent(new MouseEvent('mouseenter'));
    child.dispatchEvent(new MouseEvent('mouseenter'));
    second.dispatchEvent(new MouseEvent('mouseenter'));
    first.dispatchEvent(new MouseEvent('mouseleave'));
    svg.dispatchEvent(new MouseEvent('mouseleave'));
    expect(events).toEqual([
      ['mouseenter', 'first'], ['mouseleave', 'first'],
      ['mouseenter', 'second'], ['mouseleave', 'second']
    ]);

    stopEnter();
    stopEnter();
    stopLeave();
    first.dispatchEvent(new MouseEvent('mouseenter'));
    expect(events).toHaveLength(4);
    engine.detach();
    const click = vi.fn();
    engine.on('click', click);
    first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(click).not.toHaveBeenCalled();
  });
});
