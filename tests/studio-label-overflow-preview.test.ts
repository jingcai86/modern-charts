import { afterEach, beforeAll, expect, it } from 'vitest';
import { renderGuidePage } from '../apps/studio/guides';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';
import { registerModernCharts } from '../src/index';

beforeAll(async () => {
  await registerModernCharts();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('shares all overflow modes between the axis and centered labels on one bar chart', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const charts = renderGuidePage(root, 'custom-labels', 'dark');
  expect(charts).toHaveLength(2);
  const [, bar] = charts;
  const editor = root.querySelector<HTMLTextAreaElement>('#guide-label-code-2 textarea')!;
  const readConfig = () => parseConfigObjectLiteral(editor.value);
  const axisLabel = () => bar.shadowRoot!.querySelector('[data-label-id="x-tick-0"]')!;
  const centerLabel = () => bar.shadowRoot!.querySelector('[data-label-id="bar-label-0"]')!;

  const initial = readConfig();
  expect(axisLabel().getAttribute('data-label-type')).toBe('axis-tick');
  expect(centerLabel().getAttribute('data-label-type')).toBe('data');
  expect(axisLabel().getAttribute('data-truncated')).toBe('true');
  expect(centerLabel().getAttribute('data-truncated')).toBe('true');
  expect(centerLabel().getAttribute('data-full-text')).toBe(initial.data[0].centerLabel);
  const firstBar = bar.shadowRoot!.querySelector<SVGRectElement>('[data-layer-name="bars"] rect')!;
  const x = Number(firstBar.getAttribute('x')) + Number(firstBar.getAttribute('width')) / 2;
  const y = Number(firstBar.getAttribute('y')) + Number(firstBar.getAttribute('height')) / 2;
  expect(centerLabel().getAttribute('transform')).toBe(`translate(${x}, ${y})`);

  const axisText = 'Onboarding workflow improvements for distributed platform teams';
  const centerText = 'Yearly cloud infrastructure and engineering team investment summary';
  const edited = readConfig();
  edited.data[0].dept = axisText;
  edited.data[0].centerLabel = centerText;
  editor.value = formatConfigAssignment(edited);
  editor.dispatchEvent(new Event('input'));
  expect(editor.getAttribute('aria-invalid')).toBe('false');
  expect(axisLabel().getAttribute('data-full-text')).toBe(axisText);
  expect(centerLabel().getAttribute('data-full-text')).toBe(centerText);

  const strategies = [
    ['none', false, null, 1],
    ['truncate', true, null, 1],
    ['rotate', false, '-45', 1],
    ['both', true, '-45', 1],
    ['wrap', false, null, null],
    ['wrap-truncate', true, null, 2],
    ['rotate-wrap-truncate', true, '-45', 2]
  ] as const;

  for (const [strategy, truncated, rotation, lines] of strategies) {
    root.querySelector<HTMLButtonElement>(`[data-ov-strat="${strategy}"]`)!.click();
    expect(readConfig().data[0].dept).toBe(axisText);
    expect(readConfig().data[0].centerLabel).toBe(centerText);

    for (const [label, fullText] of [[axisLabel(), axisText], [centerLabel(), centerText]] as const) {
      expect(label.getAttribute('data-overflow-strategy')).toBe(strategy);
      expect(label.getAttribute('data-truncated')).toBe(String(truncated));
      expect(label.getAttribute('data-applied-rotation')).toBe(rotation);
      const text = label.querySelector('text')!;
      const lineCount = text.querySelectorAll('tspan').length || 1;
      if (lines === null) expect(lineCount).toBeGreaterThan(2);
      else expect(lineCount).toBe(lines);
      if (!truncated && lines === 1) expect(text.textContent).toBe(fullText);
      if (truncated || rotation) expect(label.getAttribute('data-full-text')).toBe(fullText);
    }
  }

  const rotationSlider = root.querySelector<HTMLInputElement>('#lbl-maxrot-slider')!;
  rotationSlider.value = '30';
  rotationSlider.dispatchEvent(new Event('input'));
  for (const label of [axisLabel(), centerLabel()]) {
    expect(label.getAttribute('data-applied-rotation')).toBe('30');
    expect(label.classList.contains('mc-label--interactive')).toBe(true);
  }

  root.querySelector<HTMLInputElement>('#lbl-tooltip-toggle')!.click();
  for (const label of [axisLabel(), centerLabel()]) {
    expect(label.classList.contains('mc-label--interactive')).toBe(false);
  }

  editor.closest('.guide-code-wrap')!.querySelector<HTMLButtonElement>('.guide-reset-btn')!.click();
  expect(readConfig().data[0].dept).toBe(initial.data[0].dept);
  expect(readConfig().data[0].centerLabel).toBe(initial.data[0].centerLabel);
  for (const label of [axisLabel(), centerLabel()]) {
    expect(label.getAttribute('data-overflow-strategy')).toBe('truncate');
    expect(label.classList.contains('mc-label--interactive')).toBe(true);
  }
  expect(centerLabel().getAttribute('data-full-text')).toBe(initial.data[0].centerLabel);
});
