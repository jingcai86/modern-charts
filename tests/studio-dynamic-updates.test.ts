import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerModernCharts } from '../src/index';
import { renderDynamicUpdatesGuide } from '../apps/studio/guides/dynamic-updates';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

function mountDynamicUpdatesGuide() {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const root = document.createElement('div');
  document.body.appendChild(root);
  return { root, charts: renderDynamicUpdatesGuide(root, 'dark') };
}

describe('Dynamic Updates guide', () => {
  beforeAll(async () => {
    await registerModernCharts();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts the guide stream on mount and grows the sliding window on each tick', () => {
    const { root, charts: [streamChart] } = mountDynamicUpdatesGuide();
    const toggle = root.querySelector<HTMLButtonElement>('#btn-stream-toggle')!;
    const badge = root.querySelector('#stream-window-badge')!;
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-dyn-stream-code textarea')!;
    const pointKeys = () => streamChart.data[0].data.map((point: { x: string }) => point.x);

    expect(toggle.textContent).toContain('Pause Stream');
    const config = parseConfigObjectLiteral(editor.value);
    editor.value = formatConfigAssignment({ ...config, curve: 'linear' });
    editor.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(999);
    expect(pointKeys()).toHaveLength(8);
    vi.advanceTimersByTime(1);
    expect(pointKeys().at(-1)).toBe('t9');
    expect(parseConfigObjectLiteral(editor.value)).toMatchObject({
      curve: 'linear',
      data: streamChart.data
    });
    vi.advanceTimersByTime(5_000);
    expect(pointKeys()).toHaveLength(12);
    expect(pointKeys()[0]).toBe('t3');
    expect(badge.textContent).toContain('Latest: t14');

    toggle.click();
    expect(toggle.textContent).toContain('Start 1s Stream');
    const pausedPoints = pointKeys();
    vi.advanceTimersByTime(2_000);
    expect(pointKeys()).toEqual(pausedPoints);

    toggle.click();
    expect(toggle.textContent).toContain('Pause Stream');
    const resumedPoints = pointKeys();
    vi.advanceTimersByTime(1_000);
    expect(pointKeys()).not.toEqual(resumedPoints);
  });

  it('cancels the running stream when navigating away from the guide', async () => {
    const { root, charts: [streamChart] } = mountDynamicUpdatesGuide();
    const lastData = streamChart.data;
    expect(vi.getTimerCount()).toBe(1);

    root.replaceChildren();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(2_000);
    expect(streamChart.data).toBe(lastData);
  });

  it('animates retained bars and slices when Randomize Data changes both datasets', async () => {
    const { root, charts: [, bar, pie] } = mountDynamicUpdatesGuide();
    const readBar = () => bar.shadowRoot!.querySelector<SVGRectElement>(
      '.mc-bar-rect[data-index="Q1"][data-key="Cloud"]'
    )!;
    const readSlice = () => pie.shadowRoot!.querySelector<SVGPathElement>(
      '.mc-pie-arc[data-id="Compute"]'
    )!;
    const barHeight = readBar().getAttribute('height');
    const slicePath = readSlice().getAttribute('d');
    const quarterKeys = bar.data.map((row: { quarter: string }) => row.quarter);
    const sliceKeys = pie.data.map((row: { id: string }) => row.id);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    root.querySelector<HTMLButtonElement>('#btn-dyn-randomize')!.click();

    expect(bar.data.map((row: { quarter: string }) => row.quarter)).toEqual(quarterKeys);
    expect(pie.data.map((row: { id: string }) => row.id)).toEqual(sliceKeys);
    expect(bar.data[0].Cloud).toBe(123);
    expect(pie.data[0].value).toBe(195);
    const editor = root.querySelector<HTMLTextAreaElement>('#guide-dyn-ex2-code textarea')!;
    expect(parseConfigObjectLiteral(editor.value)).toEqual({ barData: bar.data, pieData: pie.data });

    const movingBar = readBar().parentElement!;
    expect(readBar().getAttribute('height')).not.toBe(barHeight);
    expect(movingBar.getAttribute('transform')).toBeTruthy();
    expect(readSlice().getAttribute('d')).toBe(slicePath);
    await vi.waitFor(() => {
      expect(movingBar.hasAttribute('transform')).toBe(false);
      expect(readSlice().getAttribute('d')).not.toBe(slicePath);
    });
  });
});
