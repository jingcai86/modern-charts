import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  computeLineTransitionFrame,
  interpolateLineFrame,
  registerModernCharts,
  type LinePointCoord,
  type MCLineChart
} from '../src/index';
import { renderDynamicUpdatesGuide } from '../apps/studio/guides/dynamic-updates';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

function mountDynamicUpdatesGuide() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return { root, charts: renderDynamicUpdatesGuide(root, 'dark') };
}

describe('Smooth Streaming & Data-Update Line Transitions (Issue #68)', () => {
  beforeAll(() => {
    registerModernCharts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('computes seamless sliding-window, growing-window, and in-place Y transition frames', () => {
    // 1. Sliding window [t1..t4] -> [t2..t5]
    const prevWindow: LinePointCoord[] = [
      { xKey: 't1', px: 0, py: 80, py0: 200 },
      { xKey: 't2', px: 100, py: 60, py0: 200 },
      { xKey: 't3', px: 200, py: 90, py0: 200 },
      { xKey: 't4', px: 300, py: 50, py0: 200 }
    ];
    const nextWindow: LinePointCoord[] = [
      { xKey: 't2', px: 0, py: 60, py0: 200 },
      { xKey: 't3', px: 100, py: 90, py0: 200 },
      { xKey: 't4', px: 200, py: 50, py0: 200 },
      { xKey: 't5', px: 300, py: 40, py0: 200 }
    ];

    const slideFrame = computeLineTransitionFrame('CPU', prevWindow, nextWindow)!;
    expect(slideFrame).not.toBeNull();
    expect(slideFrame.hasMotion).toBe(true);
    expect(slideFrame.exitingLeftPoint).toBeDefined();
    expect(slideFrame.exitingLeftPoint!.from.px).toBe(0);
    expect(slideFrame.exitingLeftPoint!.to.px).toBe(-100);
    expect(slideFrame.fromPoints[0].px).toBe(100);
    expect(slideFrame.toPoints[0].px).toBe(0);
    expect(slideFrame.fromPoints[3].px).toBe(400);
    expect(slideFrame.toPoints[3].px).toBe(300);
    expect(slideFrame.enteringIndices.has(3)).toBe(true);

    // Midpoint interpolation (e = 0.5)
    const mid = interpolateLineFrame(slideFrame, 0.5, 'monotoneX', true);
    expect(mid.points[0].px).toBe(50);
    expect(mid.points[3].px).toBe(350);
    expect(mid.linePathD).toContain('M');
    expect(mid.areaPathD).toContain('M');

    // Final interpolation (e = 1)
    const end = interpolateLineFrame(slideFrame, 1, 'monotoneX', true);
    expect(end.points[0].px).toBe(0);
    expect(end.points[3].px).toBe(300);

    // 2. Growing window append [t1..t3] -> [t1..t4]
    const growFrame = computeLineTransitionFrame(
      'CPU',
      prevWindow.slice(0, 3),
      prevWindow
    )!;
    expect(growFrame.exitingLeftPoint).toBeUndefined();
    expect(growFrame.enteringIndices.has(3)).toBe(true);
    expect(growFrame.fromPoints[3].px).toBe(200);
    expect(growFrame.fromPoints[3].py).toBe(90);

    // 3. In-place Y value update
    const updatedY: LinePointCoord[] = prevWindow.map((p) => ({
      ...p,
      py: p.py - 20
    }));
    const morphFrame = computeLineTransitionFrame('CPU', prevWindow, updatedY)!;
    expect(morphFrame.hasMotion).toBe(true);
    expect(morphFrame.exitingLeftPoint).toBeUndefined();
    expect(morphFrame.enteringIndices.size).toBe(0);
    expect(morphFrame.fromPoints[0].py).toBe(80);
    expect(morphFrame.toPoints[0].py).toBe(60);
  });

  it('morphs <mc-line-chart> paths and points via rAF on live data updates and cleans up clip paths on completion', () => {
    const rafQueue: FrameRequestCallback[] = [];
    let nowMs = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});

    const chart = document.createElement('mc-line-chart') as MCLineChart;
    document.body.appendChild(chart);

    // Initial render -> standard enter animation (no morph transition)
    chart.config = {
      width: 500,
      height: 280,
      animate: true,
      enableArea: true,
      yScale: { type: 'linear', min: 0, max: 100 },
      data: [
        {
          id: 'CPU',
          data: [
            { x: 't1', y: 40 },
            { x: 't2', y: 55 },
            { x: 't3', y: 70 },
            { x: 't4', y: 50 }
          ]
        }
      ]
    };

    const initialLine = chart.shadowRoot!.querySelector('.mc-line-path')!;
    const initialCircles = Array.from(
      chart.shadowRoot!.querySelectorAll<SVGCircleElement>('.mc-line-point')
    );
    const initialFirstCx = Number(initialCircles[0].getAttribute('cx'));
    const initialSecondCx = Number(initialCircles[1].getAttribute('cx'));
    expect(initialLine.getAttribute('data-transition-mode')).toBeNull();
    expect(rafQueue.length).toBe(0);

    // Sliding-window update -> triggers smooth morph transition
    chart.data = [
      {
        id: 'CPU',
        data: [
          { x: 't2', y: 55 },
          { x: 't3', y: 70 },
          { x: 't4', y: 50 },
          { x: 't5', y: 85 }
        ]
      }
    ];

    const morphLine = chart.shadowRoot!.querySelector<SVGPathElement>('.mc-line-path')!;
    const morphArea = chart.shadowRoot!.querySelector<SVGPathElement>('.mc-line-area')!;
    const morphCircles = Array.from(
      chart.shadowRoot!.querySelectorAll<SVGCircleElement>('.mc-line-point')
    );
    const linesLayer = chart.shadowRoot!.querySelector('.mc-layer--lines')!;

    expect(morphLine.getAttribute('data-transition-mode')).toBe('morph');
    expect(morphArea.getAttribute('data-transition-mode')).toBe('morph');
    expect(morphCircles[0].getAttribute('data-transition-mode')).toBe('morph');
    expect(linesLayer.getAttribute('clip-path')).toMatch(/^url\(#mc-line-morph-clip-/);
    expect(rafQueue.length).toBe(1);

    // At t = 0 (before rAF finishes), new first circle (t2) starts at old t2 position
    const cxAtStart = Number(morphCircles[0].getAttribute('cx'));
    expect(cxAtStart).toBeCloseTo(initialSecondCx, 2);

    // Mid-flight step
    nowMs = 1260;
    rafQueue.shift()!(nowMs);
    const cxAtMid = Number(morphCircles[0].getAttribute('cx'));
    expect(cxAtMid).toBeLessThan(cxAtStart);
    expect(cxAtMid).toBeGreaterThan(initialFirstCx);
    expect(rafQueue.length).toBe(1);

    // Final step -> snaps to exact final coordinates (initialFirstCx) and cleans up temporary clip-path
    nowMs = 1700;
    rafQueue.shift()!(nowMs);
    expect(Number(morphCircles[0].getAttribute('cx'))).toBeCloseTo(initialFirstCx, 2);
    expect(linesLayer.hasAttribute('clip-path')).toBe(false);
    expect(rafQueue.length).toBe(0);
  });

  it('starts an interrupted threshold-split transition from the last displayed point', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let now = 1000;
    let frameId = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
    const advanceFrame = (time: number) => {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(time);
    };

    const chart = document.createElement('mc-line-chart') as MCLineChart;
    const load = (value: number) => [
      { id: 'CPU', data: [{ x: 'AM', y: 20 }, { x: 'PM', y: value }] },
      { id: 'Reference', data: [{ x: 'AM', y: 10 }, { x: 'PM', y: 10 }] }
    ];
    chart.config = {
      width: 480,
      height: 300,
      animate: true,
      enableArea: true,
      yScale: { type: 'linear', min: 0, max: 100 },
      markers: [{ id: 'limit', axis: 'y', value: 50, condition: 'above', matchStyle: { color: '#c00' } }],
      data: load(60)
    };
    document.body.append(chart);
    const root = chart.shadowRoot!;
    const point = () => root.querySelector('.mc-line-point[data-series-id="CPU"][data-point-index="1"]')!;
    const initialY = point().getAttribute('cy');

    chart.data = load(95);
    advanceFrame(1250);
    const midTransitionY = point().getAttribute('cy');
    expect(midTransitionY).not.toBe(initialY);
    expect(root.querySelector('.mc-line-point[data-series-id="Reference"]')?.getAttribute('data-transition-mode')).toBeNull();
    expect(root.querySelector('.mc-line-area--partial-threshold')?.getAttribute('data-transition-mode')).toBe('morph');

    chart.data = load(75);
    expect(point().getAttribute('cy')).toBe(midTransitionY);
    expect(frames.size).toBe(1);
    advanceFrame(2100);
    expect(point().getAttribute('cy')).not.toBe(midTransitionY);
    const segments = [...root.querySelectorAll('.mc-line-segment')];
    expect(segments).toHaveLength(2);
    expect(segments[0].getAttribute('d')).toBe(segments[1].getAttribute('d'));
    expect(root.querySelector('.mc-layer--lines')?.getAttribute('clip-path')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('interpolates a replaced single sample and skips animation when both coordinates stay fixed', () => {
    const point = { xKey: 'old', px: 0, py: 20, py0: 80 };
    expect(computeLineTransitionFrame('CPU', [], [point])).toBeNull();
    expect(computeLineTransitionFrame('CPU', [point], [])).toBeNull();
    expect(computeLineTransitionFrame('CPU', [point], [point])?.hasMotion).toBe(false);

    const replacement = { ...point, xKey: 'new', py0: 100 };
    const frame = computeLineTransitionFrame('CPU', [point], [replacement])!;
    expect(frame.hasMotion).toBe(true);
    expect(frame.exitingLeftPoint).toBeUndefined();
    expect(frame.enteringIndices.size).toBe(0);

    const middle = interpolateLineFrame(frame, 0.5, 'linear', false);
    expect(middle.points).toEqual([{ ...replacement, py0: 90 }]);
    expect(middle.linePathD).toContain('M0,20');
    expect(middle.areaPathD).toBe('');
  });

  it('defaults animate to true in Dynamic Updates guide Example 1 and triggers morph transition on stream step', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const charts = renderDynamicUpdatesGuide(root, 'dark');
    const streamChart = charts[0];
    const chkAnim = root.querySelector<HTMLInputElement>('#chk-stream-animate')!;
    const btnStep = root.querySelector<HTMLButtonElement>('#btn-stream-step')!;

    expect(chkAnim.checked).toBe(true);
    expect(streamChart.config.animate).toBe(true);

    btnStep.click();

    const linePath = streamChart.shadowRoot!.querySelector('.mc-line-path');
    expect(linePath).not.toBeNull();
    expect(linePath!.getAttribute('data-transition-mode')).toBe('morph');
  });

  it('renders only the changed chart without animation when reduced motion is enabled', () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const result = matchMedia(query);
      if (query === '(prefers-reduced-motion: reduce)') {
        Object.defineProperty(result, 'matches', { value: true });
      }
      return result;
    });
    const animate = vi.spyOn(Element.prototype, 'animate');
    const { root, charts: [, bar, pie] } = mountDynamicUpdatesGuide();
    expect(bar.config.itemTransitions).toBe(true);
    expect(pie.config.itemTransitions).toBe(true);
    const barRender = vi.spyOn(bar, 'render');
    const pieRender = vi.spyOn(pie, 'render');
    const barConfig = vi.spyOn(bar, 'setConfig');
    const pieConfig = vi.spyOn(pie, 'setConfig');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-dyn-ex2-code textarea')!;
    const click = (id: string) => root.querySelector<HTMLButtonElement>(`#${id}`)!.click();

    click('btn-dyn-add');
    expect(bar.data).toHaveLength(5);
    expect(pie.data).toHaveLength(4);
    expect(barRender).toHaveBeenCalledTimes(1);
    expect(pieRender).not.toHaveBeenCalled();
    click('btn-dyn-remove');
    expect(bar.data).toHaveLength(4);
    expect(barRender).toHaveBeenCalledTimes(2);
    expect(pieRender).not.toHaveBeenCalled();

    click('btn-dyn-pie-add');
    expect(pie.data).toHaveLength(5);
    expect(barRender).toHaveBeenCalledTimes(2);
    expect(pieRender).toHaveBeenCalledTimes(1);
    click('btn-dyn-pie-remove');
    expect(pie.data).toHaveLength(4);
    expect(barRender).toHaveBeenCalledTimes(2);
    expect(pieRender).toHaveBeenCalledTimes(2);

    expect(barConfig).not.toHaveBeenCalled();
    expect(pieConfig).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    expect(parseConfigObjectLiteral(editor.value)).toEqual({ barData: bar.data, pieData: pie.data });

    click('btn-dyn-empty');
    expect(bar.data).toBeNull();
    expect(pie.data).toBeNull();
    pieRender.mockClear();
    click('btn-dyn-add');
    expect(bar.data).toHaveLength(5);
    expect(pie.data).toBeNull();
    expect(pieRender).not.toHaveBeenCalled();
    expect(parseConfigObjectLiteral(editor.value).pieData).toBeNull();
  });

  it('skips unchanged datasets and does no render when the last item cannot be removed', () => {
    const { root, charts: [, bar, pie] } = mountDynamicUpdatesGuide();
    const barRender = vi.spyOn(bar, 'render');
    const pieRender = vi.spyOn(pie, 'render');
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-dyn-ex2-code textarea')!;
    const pieData = pie.data;
    const barData = bar.data.slice(0, 2);
    editor.value = formatConfigAssignment({ barData, pieData }, 'const datasets =');
    editor.dispatchEvent(new Event('input'));

    expect(bar.data).toEqual(barData);
    expect(barRender).toHaveBeenCalledTimes(1);
    expect(pie.data).toBe(pieData);
    expect(pieRender).not.toHaveBeenCalled();

    root.querySelector<HTMLButtonElement>('#btn-dyn-remove')!.click();
    expect(bar.data).toHaveLength(2);
    expect(barRender).toHaveBeenCalledTimes(1);
    expect(pieRender).not.toHaveBeenCalled();
  });
});
