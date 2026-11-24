import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  computeLineTransitionFrame,
  interpolateLineFrame,
  registerModernCharts,
  type LinePointCoord,
  type MCLineChart
} from '../src/index';
import { renderDynamicUpdatesGuide } from '../apps/studio/guides/dynamic-updates';

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
});
