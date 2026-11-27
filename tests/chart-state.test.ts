import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CORE_COMPONENT_REGISTRY,
  MCChartStateElement,
  configureChartFeatures,
  isChartFeatureEnabled,
  registerModernCharts,
  type ChartStateChangeDetail,
  type MCBarChart,
  type MCGaugeChart,
  type MCLineChart
} from '../src/index';
import {
  SAMPLE_BAR_DATA,
  SAMPLE_GAUGE_DATA,
  SAMPLE_HEATMAP_DATA,
  SAMPLE_LINE_DATA,
  SAMPLE_PIE_DATA,
  SAMPLE_RADAR_DATA,
  SAMPLE_SANKEY_DATA,
  SAMPLE_SCATTER_DATA,
  SAMPLE_SUNBURST_DATA
} from '../apps/studio/sample-data';

const viewImport = vi.hoisted(() => ({
  started: vi.fn(),
  pending: undefined as Promise<void> | undefined
}));

vi.mock('../src/components/chart-state-view', async (importOriginal) => {
  viewImport.started();
  await viewImport.pending;
  return importOriginal();
});

const ALL_TEN_CHARTS: Array<{
  tag: string;
  validConfig: Record<string, any>;
  emptyDataVariants: any[];
}> = [
  {
    tag: 'mc-bar-chart',
    validConfig: {
      data: SAMPLE_BAR_DATA,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      width: 480,
      height: 300
    },
    emptyDataVariants: [
      null,
      [],
      [{ quarter: 'Q1', Cloud: null, Edge: Number.NaN }]
    ]
  },
  {
    tag: 'mc-line-chart',
    validConfig: { data: SAMPLE_LINE_DATA, width: 480, height: 300 },
    emptyDataVariants: [
      null,
      [],
      [{ id: 'Series A', data: [] }],
      [{ id: 'Series A', data: [{ x: 'Q1', y: Number.NaN }] }]
    ]
  },
  {
    tag: 'mc-pie-chart',
    validConfig: { data: SAMPLE_PIE_DATA, width: 480, height: 300 },
    emptyDataVariants: [
      null,
      [],
      [
        { id: 'A', value: 0 },
        { id: 'B', value: 0 }
      ]
    ]
  },
  {
    tag: 'mc-heatmap-chart',
    validConfig: { data: SAMPLE_HEATMAP_DATA, width: 480, height: 300 },
    emptyDataVariants: [null, [], [{ id: 'Row 1', data: [] }]]
  },
  {
    tag: 'mc-radar-chart',
    validConfig: {
      data: SAMPLE_RADAR_DATA,
      indexBy: 'metric',
      keys: ['ModernCharts', 'TraditionalChart'],
      width: 480,
      height: 300
    },
    emptyDataVariants: [
      null,
      [],
      [{ metric: 'Speed', ModernCharts: null, TraditionalChart: Number.NaN }]
    ]
  },
  {
    tag: 'mc-sunburst-chart',
    validConfig: { data: SAMPLE_SUNBURST_DATA, width: 480, height: 300 },
    emptyDataVariants: [
      null,
      { name: 'Root', children: [] },
      { name: 'Root', children: [{ name: 'Leaf', value: 0 }] }
    ]
  },
  {
    tag: 'mc-sankey-chart',
    validConfig: { data: SAMPLE_SANKEY_DATA, width: 480, height: 300 },
    emptyDataVariants: [null, { nodes: [], links: [] }]
  },
  {
    tag: 'mc-scatter-chart',
    validConfig: { data: SAMPLE_SCATTER_DATA, width: 480, height: 300 },
    emptyDataVariants: [
      null,
      [],
      [{ id: 'Group A', data: [] }],
      [{ id: 'Group A', data: [{ x: Number.NaN, y: 10 }] }]
    ]
  },
  {
    tag: 'mc-treemap-chart',
    validConfig: { data: SAMPLE_SUNBURST_DATA, width: 480, height: 300 },
    emptyDataVariants: [
      null,
      { name: 'Root', children: [] },
      { name: 'Root', children: [{ name: 'Leaf', value: 0 }] }
    ]
  },
  {
    tag: 'mc-gauge-chart',
    validConfig: { data: SAMPLE_GAUGE_DATA, width: 480, height: 300 },
    emptyDataVariants: [null, { value: Number.NaN }, {}]
  }
];

describe('Shared minimal <mc-chart-state> for loading & empty states (Issue #50)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the shared renderer at bootstrap when enabled and discards stale overlay requests', async () => {
    expect(isChartFeatureEnabled('chartState')).toBe(true);

    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    chart.config = ALL_TEN_CHARTS[0].validConfig;
    document.body.appendChild(chart);
    const readyHost = chart.getStateElement()!;
    expect(readyHost.hidden).toBe(true);
    expect(readyHost.shadowRoot!.children).toHaveLength(0);

    const stateChange = vi.fn();
    chart.addEventListener('mc-state-change', stateChange);
    const emptyChart = document.createElement('mc-bar-chart') as MCBarChart;
    emptyChart.emptyText = 'Nothing in range';
    const emptyHost = emptyChart.getStateElement()!;
    document.body.appendChild(emptyChart);
    await registerModernCharts({ features: { chartState: false } });
    chart.loading = true;
    expect(chart.chartState).toBe('loading');
    expect(chart.getAttribute('aria-busy')).toBe('true');
    expect(readyHost.hidden).toBe(true);
    expect(stateChange).toHaveBeenCalledOnce();
    expect(stateChange.mock.calls[0][0].detail).toMatchObject({ state: 'loading', previousState: 'ready' });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await vi.dynamicImportSettled();
    expect(viewImport.started).not.toHaveBeenCalled();

    chart.loading = false;
    emptyChart.remove();
    let releaseView!: () => void;
    viewImport.pending = new Promise<void>((resolve) => { releaseView = resolve; });
    const enabled = registerModernCharts({ features: { chartState: true } });

    const detached = document.createElement('mc-chart-state') as MCChartStateElement;
    detached.state = 'loading';

    try {
      await vi.waitFor(() => expect(viewImport.started).toHaveBeenCalledOnce());
      chart.loading = true;
      document.body.append(emptyChart, detached);
      expect(readyHost.shadowRoot!.children).toHaveLength(0);
      expect(emptyHost.shadowRoot!.children).toHaveLength(0);

      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      chart.loading = false;
      detached.remove();
      await configureChartFeatures({ features: { chartState: false } });
    } finally {
      releaseView();
      await enabled;
    }

    expect(chart.chartState).toBe('ready');
    expect(readyHost.shadowRoot!.children).toHaveLength(0);
    expect(detached.shadowRoot!.children).toHaveLength(0);
    expect(emptyChart.chartState).toBe('empty');
    expect(emptyHost.hidden).toBe(true);
    expect(emptyHost.shadowRoot!.children).toHaveLength(0);

    await registerModernCharts({ features: { chartState: true } });
    expect(readyHost.shadowRoot!.children).toHaveLength(0);
    expect(emptyHost.hidden).toBe(false);
    expect(emptyHost.shadowRoot!.querySelector('[part="state-message"]')?.textContent).toBe('Nothing in range');
    expect(viewImport.started).toHaveBeenCalledOnce();
  });

  it('registers <mc-chart-state> in CORE_COMPONENT_REGISTRY and mounts strictly one instance per chart across all 10 charts', () => {
    expect(CORE_COMPONENT_REGISTRY['mc-chart-state']).toBe(MCChartStateElement);
    expect(customElements.get('mc-chart-state')).toBe(MCChartStateElement);

    for (const c of ALL_TEN_CHARTS) {
      const chart = document.createElement(c.tag) as any;
      document.body.appendChild(chart);

      const stateEls = chart.shadowRoot?.querySelectorAll('mc-chart-state') ?? [];
      expect(stateEls.length).toBe(1);

      const stateEl = stateEls[0] as MCChartStateElement;
      const exportparts = stateEl.getAttribute('exportparts') ?? '';
      expect(exportparts).toContain('state');
      expect(exportparts).toContain('state-indicator');
      expect(exportparts).toContain('state-message');

      // Initially empty (no data yet)
      expect(stateEl.hidden).toBe(false);
      expect(stateEl.getAttribute('state')).toBe('empty');

      // Supply valid data -> transitions to ready, hides <mc-chart-state> WITHOUT removing it
      chart.config = c.validConfig;
      expect(chart.shadowRoot?.querySelectorAll('mc-chart-state').length).toBe(1);
      expect(stateEl.hidden).toBe(true);
      expect(chart.chartState).toBe('ready');
    }
  });

  it('automatically detects empty states (null, [], and non-plottable data) across all 10 charts while keeping valid zero values ready', async () => {
    for (const c of ALL_TEN_CHARTS) {
      const chart = document.createElement(c.tag) as any;
      document.body.appendChild(chart);
      chart.config = c.validConfig;
      expect(chart.chartState).toBe('ready');

      const stateEl = chart.getStateElement() as MCChartStateElement;
      for (const emptyData of c.emptyDataVariants) {
        chart.data = emptyData;
        expect(chart.chartState, `${c.tag} empty variant`).toBe('empty');
        expect(stateEl.hidden).toBe(false);
        expect(stateEl.getAttribute('state')).toBe('empty');
        await vi.waitFor(() => expect(
          stateEl.shadowRoot?.querySelector('[part="state-message"]')?.textContent
        ).toBe('No data'));
      }
    }

    // Valid numeric 0 is plottable for bar & gauge charts
    const bar = document.createElement('mc-bar-chart') as MCBarChart;
    document.body.appendChild(bar);
    bar.config = {
      data: [{ quarter: 'Q1', Cloud: 0 }],
      indexBy: 'quarter',
      keys: ['Cloud'],
      width: 400,
      height: 260
    };
    expect(bar.chartState).toBe('ready');
    expect(bar.getStateElement()?.hidden).toBe(true);

    const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
    document.body.appendChild(gauge);
    gauge.config = { data: { value: 0, min: 0, max: 100 }, width: 400, height: 260 };
    expect(gauge.chartState).toBe('ready');
    expect(gauge.getStateElement()?.hidden).toBe(true);
  });

  it('handles loading attribute/property, text overrides, aria-busy, role="status", and mc-state-change transitions', async () => {
    const chart = document.createElement('mc-bar-chart') as MCBarChart;
    const events: ChartStateChangeDetail[] = [];
    chart.addEventListener('mc-state-change', (e: Event) => {
      events.push((e as CustomEvent<ChartStateChangeDetail>).detail);
    });

    // Mount initially with HTML `loading` attribute
    chart.setAttribute('loading', '');
    document.body.appendChild(chart);

    const stateEl = chart.getStateElement()!;
    await vi.waitFor(() => expect(stateEl.shadowRoot?.querySelector('[part="state"]')).not.toBeNull());
    const overlay = stateEl.shadowRoot?.querySelector('[part="state"]');
    const indicator = stateEl.shadowRoot?.querySelector('[part="state-indicator"]');
    const message = stateEl.shadowRoot?.querySelector('[part="state-message"]');

    expect(chart.loading).toBe(true);
    expect(chart.chartState).toBe('loading');
    expect(chart.getAttribute('aria-busy')).toBe('true');
    expect(overlay?.getAttribute('role')).toBe('status');
    expect(overlay?.getAttribute('aria-live')).toBe('polite');
    expect(stateEl.hidden).toBe(false);
    expect(stateEl.getAttribute('state')).toBe('loading');
    expect(indicator?.classList.contains('mc-state-indicator--loading')).toBe(true);
    expect(message?.textContent).toBe('Loading…');
    expect(events).toEqual([
      { state: 'loading', previousState: null, chartType: 'bar' }
    ]);

    // Custom loadingText & emptyText via config
    chart.setConfig({
      loading: true,
      loadingText: 'Fetching quarterly metrics…',
      emptyText: 'Nothing in range',
      width: 480,
      height: 300
    });
    expect(message?.textContent).toBe('Fetching quarterly metrics…');
    // Same state re-render must NOT fire duplicate mc-state-change
    expect(events.length).toBe(1);

    // Clear loading with no data -> transitions loading -> empty
    chart.loading = false;
    expect(chart.hasAttribute('loading')).toBe(false);
    expect(chart.getAttribute('aria-busy')).toBeNull();
    expect(chart.chartState).toBe('empty');
    expect(stateEl.getAttribute('state')).toBe('empty');
    expect(indicator?.classList.contains('mc-state-indicator--empty')).toBe(true);
    expect(message?.textContent).toBe('Nothing in range');
    expect(events[1]).toEqual({
      state: 'empty',
      previousState: 'loading',
      chartType: 'bar'
    });

    // Supply data -> transitions empty -> ready
    chart.setConfig({
      data: SAMPLE_BAR_DATA,
      indexBy: 'quarter',
      keys: ['Cloud', 'Edge'],
      width: 480,
      height: 300
    });
    expect(chart.chartState).toBe('ready');
    expect(stateEl.hidden).toBe(true);
    expect(chart.getAttribute('aria-busy')).toBeNull();
    expect(events[2]).toEqual({
      state: 'ready',
      previousState: 'empty',
      chartType: 'bar'
    });

    // Re-setting loading while data is present takes precedence over ready
    chart.loading = true;
    expect(chart.chartState).toBe('loading');
    expect(chart.getAttribute('aria-busy')).toBe('true');
    expect(stateEl.hidden).toBe(false);
    expect(stateEl.getAttribute('state')).toBe('loading');
    expect(events[3]).toEqual({
      state: 'loading',
      previousState: 'ready',
      chartType: 'bar'
    });

    // loading="false" attribute disables loading
    chart.setAttribute('loading', 'false');
    expect(chart.loading).toBe(false);
    expect(chart.chartState).toBe('ready');
    expect(stateEl.hidden).toBe(true);
    expect(events[4]).toEqual({
      state: 'ready',
      previousState: 'loading',
      chartType: 'bar'
    });
  });

  it('forwards slot="loading" and slot="empty" from chart into <mc-chart-state> to override defaults', async () => {
    const chart = document.createElement('mc-line-chart') as MCLineChart;
    chart.setAttribute('loading', '');

    const customLoading = document.createElement('div');
    customLoading.setAttribute('slot', 'loading');
    customLoading.textContent = 'Custom Spinner Loading';

    const customEmpty = document.createElement('div');
    customEmpty.setAttribute('slot', 'empty');
    customEmpty.textContent = 'Nothing to show for this range';

    chart.appendChild(customLoading);
    chart.appendChild(customEmpty);
    document.body.appendChild(chart);

    const stateEl = chart.getStateElement()!;
    await vi.waitFor(() => expect(stateEl.shadowRoot?.querySelector('slot[name="loading"]')).not.toBeNull());
    const loadingSlot = stateEl.shadowRoot?.querySelector(
      'slot[name="loading"]'
    ) as HTMLSlotElement;
    const emptySlot = stateEl.shadowRoot?.querySelector(
      'slot[name="empty"]'
    ) as HTMLSlotElement;
    const defaultWrap = stateEl.shadowRoot?.querySelector(
      '.mc-state-default'
    ) as HTMLDivElement;

    // While loading: loading slot visible, empty slot hidden, default content hidden
    expect(stateEl.hidden).toBe(false);
    expect(loadingSlot.hidden).toBe(false);
    expect(emptySlot.hidden).toBe(true);
    expect(defaultWrap.hidden).toBe(true);

    // Switch to empty: empty slot visible, loading slot hidden, default content hidden
    chart.loading = false;
    expect(chart.chartState).toBe('empty');
    expect(loadingSlot.hidden).toBe(true);
    expect(emptySlot.hidden).toBe(false);
    expect(defaultWrap.hidden).toBe(true);

    // Removing custom empty slot restores default empty content cleanly
    customEmpty.remove();
    chart.render();
    expect(emptySlot.hidden).toBe(true);
    expect(defaultWrap.hidden).toBe(false);
    expect(
      stateEl.shadowRoot?.querySelector('[part="state-message"]')?.textContent
    ).toBe('No data');
  });

  it('defines CSS parts, --mc-state-* custom properties, and prefers-reduced-motion rules in <mc-chart-state> stylesheet', async () => {
    const stateEl = document.createElement('mc-chart-state') as MCChartStateElement;
    stateEl.state = 'empty';
    document.body.appendChild(stateEl);

    const shadow = stateEl.shadowRoot!;
    await vi.waitFor(() => expect(shadow.querySelector('[part="state"]')).not.toBeNull());
    expect(shadow.querySelector('[part="state-indicator"]')).not.toBeNull();
    expect(shadow.querySelector('[part="state-message"]')).not.toBeNull();

    const sheet = shadow.adoptedStyleSheets?.[0];
    expect(sheet).toBeDefined();
    const cssText = Array.from(sheet?.cssRules ?? [])
      .map((r) => r.cssText)
      .join('\n');

    expect(cssText).toContain('--mc-state-bg');
    expect(cssText).toContain('--mc-state-color');
    expect(cssText).toContain('--mc-state-font');
    expect(cssText).toContain('--mc-state-spinner-color');
    expect(cssText).toContain('--mc-state-spinner-size');
    expect(cssText).toContain('transition-behavior: allow-discrete');
    expect(cssText).toContain('mc-state-enter');
    expect(cssText).toContain('prefers-reduced-motion');
    expect(cssText).toContain('animation: none');
  });

  it('mounts a standalone state view when shown and supports clearing its state and text overrides', async () => {
    const stateEl = document.createElement('mc-chart-state') as MCChartStateElement;
    stateEl.hidden = true;
    stateEl.setAttribute('state', ' LOADING ');
    stateEl.loadingText = 'Fetching data';
    stateEl.emptyText = 'Nothing found';
    document.body.appendChild(stateEl);
    expect(stateEl.shadowRoot!.children).toHaveLength(0);

    stateEl.hidden = false;
    const message = () => stateEl.shadowRoot!.querySelector('[part="state-message"]')?.textContent;
    await vi.waitFor(() => expect(message()).toBe('Fetching data'));

    stateEl.loadingText = undefined;
    expect(message()).toBe('Loading…');
    stateEl.state = 'empty';
    expect(message()).toBe('Nothing found');
    stateEl.emptyText = undefined;
    expect(message()).toBe('No data');

    stateEl.state = null;
    expect(stateEl.state).toBeNull();
    expect(stateEl.shadowRoot!.querySelector('.mc-state-default')?.hasAttribute('hidden')).toBe(true);
  });
});
