import { beforeAll, expect, it, vi } from 'vitest';
import type { GuideCallbackCompiler } from '../apps/studio/guides/callback-config';
import { loadGuideCallbackCompiler } from '../apps/studio/guides/callback-runtime';

let compile: GuideCallbackCompiler;

beforeAll(async () => {
  compile = await loadGuideCallbackCompiler();
});

it('runs callbacks in fresh contexts with only serialized data and preview capabilities', () => {
  let unit = 's';
  const run = compile(`value => {
    globalThis.count = (globalThis.count ?? 0) + 1;
    return { result: value + ' ' + unit, count, window: typeof window, bridge: typeof __host };
  }`, () => ({ unit }));

  expect(run(3)).toEqual({ result: '3 s', count: 1, window: 'undefined', bridge: 'undefined' });
  unit = 'ms';
  expect(run(20)).toEqual({ result: '20 ms', count: 1, window: 'undefined', bridge: 'undefined' });
});

it('rejects expressions that are not a single synchronous callback', () => {
  expect(() => compile('1 + 2')).toThrow(SyntaxError);
  expect(() => compile('(() => 1), (() => 2)')).toThrow(SyntaxError);
  expect(() => compile('async () => 1')).toThrow(SyntaxError);
});

it('interrupts a long-running callback without blocking subsequent previews', () => {
  const longRunning = compile('() => { while (true) {} }');
  expect(() => longRunning()).toThrow(/interrupt/i);
  expect(compile('() => "ready"')()).toBe('ready');
});

it('bounds callback source and data crossing the preview boundary', () => {
  expect(() => compile(`() => "${'a'.repeat(24_001)}"`)).toThrow(/source exceeded/);
  expect(() => compile('() => true', () => ({ 'invalid binding': true }))).toThrow(/identifiers/);

  const read = compile('data => data.length');
  expect(() => read(Array(20).fill('a'.repeat(16_000)))).toThrow(/data exceeded/);
  expect(() => compile('() => "a".repeat(200001)')()).toThrow(/data exceeded/);
  expect(read([1, 2, 3])).toBe(3);
});

it('replays preview pointer actions with coordinates without remounting the layer', () => {
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const showTooltip = vi.fn();
  const onError = vi.fn();
  const render = compile(`ctx => {
    ctx.d3.select(ctx.layerGroup)
      .append('rect')
      .attr('width', 20)
      .on('pointermove', event => ctx.showTooltip('<strong>Preview</strong>', event.clientX, event.clientY))
      .on('pointerleave', () => { throw new Error('Preview listener failed'); });
  }`, undefined, ['layers', '0', 'render'], onError);
  render({ layerGroup: layer, renderLabel: () => null, showTooltip });

  const mark = layer.querySelector('rect')!;
  mark.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 30 }));
  expect(showTooltip).toHaveBeenCalledWith('<strong>Preview</strong>', 20, 30);
  expect(layer.children).toHaveLength(1);
  expect(layer.firstElementChild).toBe(mark);

  mark.dispatchEvent(new MouseEvent('pointerleave'));
  mark.dispatchEvent(new MouseEvent('pointerleave'));
  expect(onError).toHaveBeenCalledTimes(1);
});
