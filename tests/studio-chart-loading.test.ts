import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MCBaseChart } from '../src/core/base-chart';
import { disposeOverviewPage } from '../apps/studio/pages/overview';

const delayedImports = vi.hoisted(() => {
  const delay = () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    return { pending, release, started: vi.fn() };
  };
  return { heatmap: delay(), gauge: delay() };
});

vi.mock('../src/entries/heatmap', async (importOriginal) => {
  delayedImports.heatmap.started();
  await delayedImports.heatmap.pending;
  return importOriginal();
});

vi.mock('../src/entries/gauge', async (importOriginal) => {
  delayedImports.gauge.started();
  await delayedImports.gauge.pending;
  return importOriginal();
});

vi.mock('../src/entries/radar', () => { throw new Error('Chart module unavailable'); });

let root: HTMLElement;
let deliverIntersections: IntersectionObserverCallback;

function reportPreviewVisibility(chartId: string, isIntersecting = true) {
  const stage = document.getElementById(`preview-stage-${chartId}`)!;
  deliverIntersections(
    [{ target: stage.closest('.overview-card')!, isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver
  );
  return stage;
}

function select(id: string, value: string) {
  const control = document.querySelector<HTMLSelectElement>(`#${id}`)!;
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeAll(async () => {
  const fsModule = 'node:fs';
  const { readFileSync } = await import(/* @vite-ignore */ fsModule);
  const html = readFileSync('apps/studio/index.html', 'utf8');
  const template = document.createElement('template');
  template.innerHTML = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  template.content.querySelectorAll('script').forEach((script) => script.remove());
  document.body.replaceChildren(template.content.cloneNode(true));
  root = document.querySelector('#app-root')!;
  localStorage.clear();
  history.replaceState(null, '', '#/chart/pie');

  vi.stubGlobal('IntersectionObserver', class PreviewObserver {
    constructor(callback: IntersectionObserverCallback) { deliverIntersections = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  await import('../apps/studio/main');
}, 15_000);

afterAll(() => {
  delayedImports.heatmap.release();
  delayedImports.gauge.release();
  disposeOverviewPage(root);
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Studio chart modules', () => {
  it('provides D3 helpers to custom layers on a direct playground visit', async () => {
    const chart = await vi.waitFor(() => {
      const pie = root.querySelector<MCBaseChart>('#detail-chart-stage mc-pie-chart');
      expect(pie).not.toBeNull();
      return pie!;
    });
    chart.appendLayer(({ d3, layerGroup }) => {
      d3.select(layerGroup)
        .append('text')
        .attr('class', 'studio-d3-check')
        .text(String(d3.mean([2, 4, 6])));
    });
    expect(chart.shadowRoot?.querySelector('.studio-d3-check')?.textContent).toBe('4');
    expect(customElements.get('mc-line-chart')).toBeUndefined();
  }, 15_000);

  it('loads near-viewport previews and uses the latest theme when imports finish', async () => {
    window.location.hash = '#/';
    await vi.waitFor(() => expect(root.querySelector('#preview-stage-line')).not.toBeNull());
    expect(customElements.get('mc-line-chart')).toBeUndefined();
    expect(customElements.get('mc-heatmap-chart')).toBeUndefined();

    const line = reportPreviewVisibility('line');
    await vi.waitFor(() => expect(line.firstElementChild?.shadowRoot?.querySelector('.mc-line-path')).toBeTruthy());
    expect(customElements.get('mc-bar-chart')).toBeUndefined();
    expect(delayedImports.heatmap.started).not.toHaveBeenCalled();

    const heatmap = reportPreviewVisibility('heatmap');
    await vi.waitFor(() => expect(delayedImports.heatmap.started).toHaveBeenCalledOnce());
    expect(heatmap.firstElementChild).toBeNull();
    select('global-palette-select', 'neutral');
    select('global-appearance-select', 'dark');
    reportPreviewVisibility('heatmap', false);
    delayedImports.heatmap.release();
    await customElements.whenDefined('mc-heatmap-chart');
    await vi.dynamicImportSettled();
    expect(heatmap.firstElementChild).toBeNull();

    reportPreviewVisibility('heatmap');
    await vi.waitFor(() => {
      const chart = heatmap.querySelector<MCBaseChart>('mc-heatmap-chart');
      expect(chart?.config.palette).toBe('neutral');
      expect(chart?.resolveTheme().mode).toBe('dark');
      expect(chart?.shadowRoot?.querySelector('.mc-heatmap-cell')?.getAttribute('fill'))
        .toMatch(/^rgb\((\d+), \1, \1\)$/);
    });
    expect(customElements.get('mc-bar-chart')).toBeUndefined();
  }, 15_000);

  it('keeps the newest playground when an older route finishes loading', async () => {
    window.location.hash = '#/chart/gauge';
    await vi.waitFor(() => expect(delayedImports.gauge.started).toHaveBeenCalledOnce());
    expect(root.querySelector('[role="status"]')?.textContent).toMatch(/loading chart/i);

    window.location.hash = '#/chart/scatter';
    await vi.waitFor(() => expect(root.querySelector('#detail-chart-stage mc-scatter-chart')).not.toBeNull());
    delayedImports.gauge.release();
    await customElements.whenDefined('mc-gauge-chart');
    // The registration completes inside the import, before its route continuation runs.
    await vi.dynamicImportSettled();

    expect(root.querySelector('#detail-chart-stage mc-scatter-chart')).not.toBeNull();
    expect(root.querySelector('#detail-chart-stage mc-gauge-chart')).toBeNull();
  }, 15_000);

  it('shows a loading error and lets users leave the route', async () => {
    window.location.hash = '#/chart/radar';
    await vi.waitFor(() => expect(root.textContent).toMatch(/could not load this chart/i));
    expect(root.querySelector('mc-radar-chart')).toBeNull();

    window.location.hash = '#/';
    await vi.waitFor(() => expect(root.querySelectorAll('.overview-card')).toHaveLength(10));
  }, 15_000);
});
