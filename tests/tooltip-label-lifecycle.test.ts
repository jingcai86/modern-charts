import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureChartFeatures,
  createChartI18n,
  createDefaultTheme,
  defineCustomElement,
  isChartFeatureEnabled,
  registerModernCharts,
  type MCBarChart,
  type MCLabelElement,
  type MCLineChart,
  type MCTooltipElement,
  type MCTruncateElement,
  type TooltipHideDetail,
  type TooltipPayload,
  type TooltipTarget
} from '../src/index';
import { registerBarChart } from '../src/entries/bar';

const viewImport = vi.hoisted(() => ({
  started: vi.fn(),
  pending: undefined as Promise<void> | undefined
}));

vi.mock('../src/components/tooltip-view', async (importOriginal) => {
  viewImport.started();
  await viewImport.pending;
  return importOriginal();
});

class TestSlotTooltipElement extends HTMLElement {
  public received: TooltipPayload[] = [];
  public hides: Array<TooltipTarget | undefined> = [];
  public moves: Array<{ x: number; y: number }> = [];

  public show(payload: TooltipPayload): boolean {
    if (payload.badge === 'suppress') {
      this.hidden = true;
      return false;
    }
    this.received.push(payload);
    this.dataset.target = payload.target ?? 'item';
    this.textContent = `${payload.target}:${payload.title ?? payload.label}:${payload.formattedValue ?? payload.value ?? ''}`;
    this.hidden = false;
    return true;
  }

  public moveToPointer(clientX: number, clientY: number): void {
    this.moves.push({ x: clientX, y: clientY });
  }

  public hide(target?: TooltipTarget): void {
    this.hides.push(target);
    if (!target || this.dataset.target === target) {
      this.hidden = true;
    }
  }
}

defineCustomElement('test-slot-tooltip', TestSlotTooltipElement);

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
  return {
    chartType: 'bar',
    title: 'Monthly sales',
    label: 'Sales',
    value: 12,
    clientX: 40,
    clientY: 50
  };
}

afterEach(async () => {
  document.body.replaceChildren();
  await configureChartFeatures({
    features: {
      zoom: false,
      csvExport: false,
      selection: false,
      chartState: true,
      tooltip: true
    }
  });
});

describe('tooltip lazy bootstrapping and custom slot="tooltip" lifecycle (Issue #138)', () => {
  it('skips downloading and mounting built-in tooltips when features.tooltip is false, loads asynchronously when enabled, and discards stale requests', async () => {
    expect(isChartFeatureEnabled('tooltip')).toBe(true);

    // Pre-existing chart before bootstrap opt-out
    const preChart = document.createElement('mc-bar-chart') as MCBarChart;
    preChart.config = {
      width: 480,
      height: 280,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud'],
      data: [{ quarter: 'Q1', Cloud: 142 }]
    };
    document.body.appendChild(preChart);
    const initialTip = preChart.getTooltipElement()!;
    expect(initialTip.hidden).toBe(true);
    expect(initialTip.shadowRoot!.children).toHaveLength(0);

    // Trigger show before registerBarChart({ features: { tooltip: false } }) in same turn
    preChart.showTooltip({ title: 'Q1', label: 'Cloud', value: 142 }, 80, 100);
    await registerBarChart({ features: { tooltip: false } });
    expect(isChartFeatureEnabled('tooltip')).toBe(false);
    expect(preChart.isFeatureEnabled('tooltip')).toBe(false);
    expect(preChart.getTooltipElement()).toBeNull();
    expect(preChart.getLegendTooltipElement()).toBeNull();
    expect(preChart.shadowRoot!.querySelectorAll('mc-tooltip')).toHaveLength(0);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await vi.dynamicImportSettled();
    expect(viewImport.started).not.toHaveBeenCalled();

    // New chart mounted while features.tooltip is false never mounts <mc-tooltip> hosts
    const optOutChart = document.createElement('mc-bar-chart') as MCBarChart;
    optOutChart.config = {
      width: 480,
      height: 280,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      data: [{ quarter: 'Q1', Cloud: 142, Edge: 88 }]
    };
    document.body.appendChild(optOutChart);
    expect(optOutChart.getTooltipElement()).toBeNull();
    expect(optOutChart.getLegendTooltipElement()).toBeNull();
    expect(optOutChart.shadowRoot!.querySelectorAll('mc-tooltip')).toHaveLength(0);

    // Enable tooltip with a controlled pending dynamic import to verify stale request disposal
    let releaseView!: () => void;
    viewImport.pending = new Promise<void>((resolve) => {
      releaseView = resolve;
    });
    const enabled = registerModernCharts({ features: { tooltip: true } });

    const detached = document.createElement('mc-tooltip') as MCTooltipElement;
    try {
      await vi.waitFor(() => expect(viewImport.started).toHaveBeenCalledOnce());
      document.body.appendChild(detached);
      detached.show(tooltipPayload(), theme, container);
      expect(detached.shadowRoot!.children).toHaveLength(0);

      const pendingHost = preChart.getTooltipElement()!;
      preChart.showTooltip({ title: 'Q1', label: 'Cloud', value: 142 }, 80, 100);
      expect(pendingHost.shadowRoot!.children).toHaveLength(0);

      // Hide detached and disable feature before dynamic import resolves
      detached.hide();
      await configureChartFeatures({ features: { tooltip: false } });
    } finally {
      viewImport.pending = undefined;
      releaseView();
      await enabled;
    }

    expect(detached.shadowRoot!.children).toHaveLength(0);
    expect(preChart.getTooltipElement()).toBeNull();

    // Re-enabling tooltip mounts hosts and renders immediately using the cached view factory
    await registerModernCharts({ features: { tooltip: true } });
    expect(isChartFeatureEnabled('tooltip')).toBe(true);
    const activeHost = preChart.getTooltipElement()!;
    expect(activeHost).not.toBeNull();
    preChart.showTooltip({ title: 'Q1', label: 'Cloud', value: 142 }, 80, 100);
    expect(activeHost.hidden).toBe(false);
    expect(
      activeHost.shadowRoot!.querySelector('[part="header"]')?.textContent
    ).toBe('Q1');
    expect(viewImport.started).toHaveBeenCalledOnce();
  });

  it('projects a custom tooltip in slot="tooltip", delivers item and legend lifecycle with built-in tooltip disabled, and distinguishes target="item" vs "legend"', async () => {
    await registerBarChart({ features: { tooltip: false } });
    expect(isChartFeatureEnabled('tooltip')).toBe(false);

    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const customTip = document.createElement(
      'test-slot-tooltip'
    ) as TestSlotTooltipElement;
    customTip.slot = 'tooltip';
    chart.appendChild(customTip);
    chart.config = {
      width: 520,
      height: 320,
      animate: false,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      tooltip: { position: 'follow' },
      data: [
        { quarter: 'Q1', Cloud: 142, Edge: 88 },
        { quarter: 'Q2', Cloud: 176, Edge: 112 }
      ]
    };
    document.body.appendChild(chart);

    // Built-in tooltip hosts are NOT mounted
    expect(chart.getTooltipElement()).toBeNull();
    expect(chart.getLegendTooltipElement()).toBeNull();
    expect(chart.shadowRoot!.querySelectorAll('mc-tooltip')).toHaveLength(0);

    // Public slot="tooltip" projects the custom element inside .mc-chart-container
    const slot = chart.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name="tooltip"]'
    )!;
    expect(slot).not.toBeNull();
    expect(slot.assignedElements()).toEqual([customTip]);

    const itemShows: TooltipPayload[] = [];
    const itemHides: TooltipHideDetail[] = [];
    const legendShows: TooltipPayload[] = [];
    const legendHides: TooltipHideDetail[] = [];

    chart.addEventListener('mc-tooltip-show', (e) => {
      itemShows.push((e as CustomEvent<TooltipPayload>).detail);
    });
    chart.addEventListener('mc-tooltip-hide', (e) => {
      itemHides.push((e as CustomEvent<TooltipHideDetail>).detail);
    });
    chart.addEventListener('mc-legend-tooltip-show', (e) => {
      legendShows.push((e as CustomEvent<TooltipPayload>).detail);
    });
    chart.addEventListener('mc-legend-tooltip-hide', (e) => {
      legendHides.push((e as CustomEvent<TooltipHideDetail>).detail);
    });

    const firstBar = chart.shadowRoot!.querySelector<SVGRectElement>('.mc-bar-rect')!;
    const svg = chart.shadowRoot!.querySelector<SVGSVGElement>('.mc-chart-svg')!;
    const legendItem = chart.shadowRoot!.querySelector<SVGGElement>('.mc-legend-item')!;

    // 1. Hover bar item -> target is 'item', custom tooltip updates without re-rendering SVG bars
    firstBar.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 120, clientY: 140 })
    );
    expect(customTip.hidden).toBe(false);
    expect(customTip.dataset.target).toBe('item');
    expect(customTip.textContent).toBe('item:Q1:142');
    expect(itemShows).toHaveLength(1);
    expect(itemShows[0]).toMatchObject({
      chartType: 'bar',
      target: 'item',
      category: 'Q1',
      seriesId: 'Cloud',
      value: 142,
      positionMode: 'follow',
      source: 'pointer'
    });
    // Mutating customTip DOM inside slot="tooltip" must NOT destroy/replace the hovered SVG bar
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(chart.shadowRoot!.querySelector('.mc-bar-rect')).toBe(firstBar);

    // Pointer move in follow mode forwards moveToPointer to slotted custom tooltip
    svg.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 160, clientY: 180 })
    );
    expect(customTip.moves).toEqual([{ x: 160, y: 180 }]);

    // Leave bar item -> hide('item') and mc-tooltip-hide with target: 'item'
    firstBar.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(customTip.hidden).toBe(true);
    expect(customTip.hides.at(-1)).toBe('item');
    expect(itemHides).toEqual([{ target: 'item', chartType: 'bar' }]);

    // 2. Keyboard focus on bar item -> positionMode resolves to 'item', source is 'keyboard', blur hides it
    firstBar.dispatchEvent(new FocusEvent('focus'));
    expect(customTip.hidden).toBe(false);
    expect(customTip.received.at(-1)).toMatchObject({
      target: 'item',
      source: 'keyboard',
      positionMode: 'item'
    });
    firstBar.dispatchEvent(new FocusEvent('blur'));
    expect(customTip.hidden).toBe(true);
    expect(itemHides).toHaveLength(2);

    // 3. Hover legend item -> target is 'legend', mc-legend-tooltip-show fires
    legendItem.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, clientX: 200, clientY: 290 })
    );
    expect(customTip.hidden).toBe(false);
    expect(customTip.dataset.target).toBe('legend');
    expect(customTip.textContent).toContain('legend:Cloud:');
    expect(legendShows).toHaveLength(1);
    expect(legendShows[0]).toMatchObject({
      chartType: 'bar',
      target: 'legend',
      title: 'Cloud',
      source: 'pointer'
    });

    // Leave legend item -> hide('legend') and mc-legend-tooltip-hide with target: 'legend'
    legendItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(customTip.hidden).toBe(true);
    expect(customTip.hides.at(-1)).toBe('legend');
    expect(legendHides).toEqual([{ target: 'legend', chartType: 'bar' }]);

    // 4. Returning false from custom show() suppresses mc-tooltip-show
    const beforeCount = itemShows.length;
    chart.showTooltip({ title: 'Hidden', badge: 'suppress', value: 0 }, 50, 50);
    expect(customTip.hidden).toBe(true);
    expect(itemShows).toHaveLength(beforeCount);

    // 5. Plain HTML markup in slot="tooltip" works via mc-tooltip-show / mc-legend-tooltip-show events
    const line = document.createElement('mc-line-chart') as MCLineChart;
    const htmlTip = document.createElement('div');
    htmlTip.slot = 'tooltip';
    htmlTip.hidden = true;
    line.appendChild(htmlTip);
    line.addEventListener('mc-tooltip-show', (e) => {
      const p = (e as CustomEvent<TooltipPayload>).detail;
      htmlTip.dataset.target = p.target;
      htmlTip.textContent = `${p.seriesId}: ${p.formattedValue}`;
      htmlTip.hidden = false;
    });
    line.addEventListener('mc-tooltip-hide', () => {
      htmlTip.hidden = true;
    });
    line.config = {
      width: 480,
      height: 280,
      animate: false,
      enableSlices: false,
      data: [{ id: 'Latency', data: [{ x: 'Mon', y: 42 }] }]
    };
    document.body.appendChild(line);

    const point = line.shadowRoot!.querySelector<SVGElement>('.mc-line-point')!;
    point.dispatchEvent(new MouseEvent('mouseenter', { clientX: 90, clientY: 90 }));
    expect(htmlTip.hidden).toBe(false);
    expect(htmlTip.dataset.target).toBe('item');
    expect(htmlTip.textContent).toBe('Latency: 42');
    point.dispatchEvent(new MouseEvent('mouseleave'));
    expect(htmlTip.hidden).toBe(true);
  });
});

describe('tooltip customization', () => {
  it('shows full-text tooltips on overflow-rotated chart labels while leaving short labels alone', () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const longCategory = 'Global Cloud Platform Infrastructure';
    chart.config = {
      width: 550, height: 420, indexBy: 'dept', keys: ['Spend'], animate: false,
      data: [{ dept: longCategory, Spend: 45 }, { dept: 'Ops', Spend: 35 }],
      label: { target: 'axis-tick', overflow: { strategy: 'rotate', maxWidth: 106, maxChars: 14, maxRotation: -45 } }
    };
    document.body.append(chart);
    const tick = (index: number) => chart.shadowRoot!.querySelector<SVGGElement>(`[data-label-id="x-tick-${index}"]`)!;
    const tooltip = chart.getTooltipElement()!;
    const rotated = tick(0);
    expect(rotated.textContent).toBe(longCategory);
    expect(rotated.getAttribute('data-applied-rotation')).toBe('-45');
    expect(rotated.getAttribute('data-truncated')).toBe('false');
    expect(rotated.getAttribute('tabindex')).toBe('0');
    expect(tick(1).classList.contains('mc-label--interactive')).toBe(false);

    rotated.dispatchEvent(new MouseEvent('mouseenter', { clientX: 104, clientY: 292 }));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.shadowRoot?.querySelector('[part="header"]')?.textContent).toBe(longCategory);
    rotated.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);

    rotated.dispatchEvent(new FocusEvent('focus'));
    expect(tooltip.hidden).toBe(false);
    rotated.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tooltip.hidden).toBe(true);

    chart.config = {
      ...chart.config,
      label: { target: 'axis-tick', overflow: { strategy: 'rotate', maxWidth: 106, enableTooltip: false } }
    };
    tick(0).dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.hidden).toBe(true);
  });

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
  it('reserves space for rotated lines and exposes the original text with a tooltip when truncated', () => {
    const truncate = document.createElement('mc-truncate') as MCTruncateElement;
    const fullText = 'Global Cloud Platform Infrastructure';
    truncate.text = fullText;
    truncate.strategy = 'rotate-wrap-truncate';
    truncate.maxWidth = 80;
    truncate.maxLines = 2;
    truncate.maxRotation = -45;
    document.body.append(truncate);

    const text = truncate.shadowRoot!.querySelector('.mc-truncate-text')!;
    const host = truncate.shadowRoot!.querySelector<HTMLElement>('.mc-truncate-host')!;
    const tooltip = truncate.getTooltipElement()!;
    expect(truncate.lastResult).toMatchObject({ truncated: true, appliedRotation: -45 });
    expect(text.textContent?.split('\n')).toHaveLength(2);
    expect(text.textContent).toMatch(/…$/);
    expect(text.getAttribute('aria-label')).toBe(fullText);
    expect(host.style.minHeight).toBe(`${Math.ceil((truncate.lastResult!.width + 32) / Math.SQRT2)}px`);
    text.dispatchEvent(new FocusEvent('focus'));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.shadowRoot?.querySelector('[part="header"]')?.textContent).toBe(fullText);

    truncate.strategy = 'wrap';
    expect(truncate.lastResult?.truncated).toBe(false);
    expect(text.hasAttribute('tabindex')).toBe(false);
    expect(tooltip.hidden).toBe(true);
  });

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
