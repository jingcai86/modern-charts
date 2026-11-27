import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import { area, curveLinear, curveMonotoneX, format, line, mean, quantile } from 'd3';
import { expect, it, vi } from 'vitest';
import {
  applyCallbackOutput,
  prepareCallbackInvocation
} from '../apps/studio/guides/callback-capabilities';

const svg = 'http://www.w3.org/2000/svg';

function chartContext() {
  return {
    layerGroup: document.createElementNS(svg, 'g'),
    renderLabel: vi.fn(),
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
    xScale: vi.fn((value: number) => value * 10),
    d3: { area, curveLinear, curveMonotoneX, format, line, mean, quantile },
    data: [{ value: 4 }],
    state: { hidden: true }
  };
}

it('copies only JSON data and exposes explicitly approved host operations', () => {
  const chart = chartContext();
  const getter = vi.fn(() => 'hidden');
  const payload = { text: 'Sample', node: document.body, callback: vi.fn() };
  Object.defineProperty(payload, 'layerGroup', { enumerable: true, get: getter });
  Object.defineProperty(payload, '__proto__', { enumerable: true, value: { polluted: true } });
  const fakeLayout = vi.fn();
  const prepared = prepareCallbackInvocation([chart, payload], { layoutWithLines: fakeLayout, format: vi.fn() });

  expect(prepared.input.chart).toEqual({ index: 0, xScale: true, yScale: false });
  expect(prepared.input.args).toEqual([{ data: [{ value: 4 }], thresholds: {} }, { text: 'Sample' }]);
  expect(prepared.input.bindings).toEqual({});
  expect(getter).not.toHaveBeenCalled();
  expect(prepared.invoke('constructor', [])).toBeUndefined();
  expect(prepared.invoke('layoutWithLines', [{ text: 'Sample', font: '12px sans-serif' }, 90, 14])).toBeUndefined();
  expect(fakeLayout).not.toHaveBeenCalled();
  expect(prepared.invoke('xScale', [{}])).toBeUndefined();
  expect(prepared.invoke('xScale', [2])).toBe(20);
  expect(prepared.invoke('mean', [[1, 2, 3]])).toBe(2);

  const text = prepareCallbackInvocation([], { layoutWithLines, prepareWithSegments });
  expect(text.input.bindings).toEqual({
    layoutWithLines: { $mcBinding: 'layoutWithLines' },
    prepareWithSegments: { $mcBinding: 'prepareWithSegments' }
  });
  expect(text.invoke('layoutWithLines', [{ text: 'Sample', font: '12px sans-serif' }, null, 14]))
    .toMatchObject({ lines: [{ text: 'Sample' }] });
});

it('projects only finite D3 coordinates and bounds formatting requests', () => {
  const chart = chartContext();
  const prepared = prepareCallbackInvocation([chart], {});
  expect(prepared.invoke('quantile', [[2, 7, null, 9], 0.5])).toBe(7);
  expect(prepared.invoke('quantile', [[2, 9], 2])).toBeUndefined();
  expect(prepared.invoke('format', ['.1f', 3.25])).toBe('3.3');
  expect(prepared.invoke('format', ['100000.1f', 3.25])).toBeUndefined();
  expect(prepared.invoke('yScale', [1])).toBeUndefined();
  expect(prepared.invoke('linePath', [[[1, 2], [2, null], [3, 4]], 'curveLinear'])).toBe('M1,2L3,4');
  expect(prepared.invoke('areaPath', [[[1, 2, 5], [3, 4, 6]], 'curveMonotoneX'])).toBe('M1,5L3,6L3,4L1,2Z');
});

it('creates only allowed elements, attributes, styles, events and label properties', () => {
  const chart = chartContext();
  const prepared = prepareCallbackInvocation([chart], {}, ['layers', '0', 'render']);
  const replay = vi.fn();
  applyCallbackOutput(prepared, {
    layer: { children: [
      { kind: 'node', tag: 'script', namespace: 'html', text: 'alert(1)' },
      { kind: 'node', tag: 'foreignObject', namespace: 'svg' },
      { kind: 'node', tag: 'image', namespace: 'svg' },
      {
        kind: 'node',
        tag: 'rect',
        namespace: 'svg',
        attributes: { width: '30', fill: 'url(https://example.test/fill.svg)', href: 'https://example.test', onclick: 'alert(1)' },
        style: {
          color: '#123456', cssText: 'font-size:11px;background:u\\72l(https://example.test/img.png);position:fixed',
          background: 'url(https://example.test/img.png)'
        },
        events: [{ type: 'pointermove', index: 2 }, { type: 'keydown', index: 5 }]
      },
      {
        kind: 'label',
        descriptor: {
          text: 'Mean', x: 3, y: 4, type: 'title', templateHtml: '<img src=x>',
          icon: '<svg onload="alert(1)">', color: '#123456', background: 'url(https://example.test)',
          padding: { top: 1, right: 2, bottom: 3, left: 4 }
        }
      }
    ] }
  }, ['layers', '0', 'render'], replay);

  expect(chart.layerGroup.children).toHaveLength(1);
  const mark = chart.layerGroup.querySelector('rect')!;
  expect(mark.getAttribute('width')).toBe('30');
  expect(mark.hasAttribute('fill')).toBe(false);
  expect(mark.hasAttribute('href')).toBe(false);
  expect(mark.hasAttribute('onclick')).toBe(false);
  expect(mark.style.fontSize).toBe('11px');
  expect(mark.style.background).toBe('');
  expect(mark.style.position).toBe('');
  mark.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 20 }));
  mark.dispatchEvent(new KeyboardEvent('keydown'));
  expect(replay.mock.calls).toEqual([[{ index: 2, data: { clientX: 10, clientY: 20 } }]]);
  expect(chart.renderLabel).toHaveBeenCalledWith(chart.layerGroup, {
    text: 'Mean', x: 3, y: 4, type: 'custom', color: '#123456',
    padding: { top: 1, right: 2, bottom: 3, left: 4 }
  });
});

it('sanitizes tooltip markup and only calls default render through the declared renderer', () => {
  const chart = chartContext();
  const prepared = prepareCallbackInvocation([chart], {}, ['layers', '0', 'render']);
  const unsafe = '<strong onclick="alert(1)">A &amp; B</strong><br/><img src="https://example.test/i">';
  const actions = [{ kind: 'show', html: unsafe, x: 10, y: 20 }, { kind: 'hide' }];
  applyCallbackOutput(prepared, { actions }, ['layers', '0', 'render'], vi.fn());
  expect(chart.showTooltip).toHaveBeenCalledWith('<strong>A &amp; B</strong><br>', 10, 20);
  expect(chart.hideTooltip).toHaveBeenCalledOnce();
  expect(applyCallbackOutput(prepared, { value: unsafe }, ['tooltip', 'formatter'], vi.fn()))
    .toBe('<strong>A &amp; B</strong><br>');
  expect(applyCallbackOutput(prepared, { value: '<g onclick="x">' }, ['layers', '0', 'render'], vi.fn()))
    .toBe('&lt;g onclick="x"&gt;');

  const defaultRender = vi.fn(() => document.createElement('strong'));
  const tooltipArgs = [{ text: 'plain' }, defaultRender];
  const renderer = prepareCallbackInvocation(tooltipArgs, {}, ['tooltip', 'renderer']);
  expect(renderer.input.defaultRenderIndex).toBe(1);
  expect(renderer.input.args).toEqual([{ text: 'plain' }, null]);
  const rendered = applyCallbackOutput(renderer, { value: {
    kind: 'node', tag: 'div', namespace: 'html', children: [{ kind: 'default' }]
  } }, ['tooltip', 'renderer'], vi.fn()) as HTMLElement;
  expect(rendered.firstElementChild?.localName).toBe('strong');
  expect(defaultRender).toHaveBeenCalledOnce();

  const formatter = prepareCallbackInvocation(tooltipArgs, {}, ['tooltip', 'formatter']);
  expect(applyCallbackOutput(formatter, { value: { kind: 'default' } }, ['tooltip', 'formatter'], vi.fn())).toBeUndefined();
  expect(defaultRender).toHaveBeenCalledOnce();
});
