import { afterEach, beforeAll, expect, it } from 'vitest';
import { renderGuidePage } from '../apps/studio/guides';
import { registerModernCharts } from '../src/index';

beforeAll(async () => {
  await registerModernCharts();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('fits custom pills around the displayed text and restores preset label modes', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const [chart] = renderGuidePage(root, 'custom-labels', 'dark');
  const barLabel = () => chart.shadowRoot!.querySelector('[data-label-id="bar-label-0"]')!;

  root.querySelector<HTMLButtonElement>('#btn-lbl-custom')!.click();

  const labels = chart.shadowRoot!.querySelectorAll('[data-label-id^="bar-label-"]');
  expect(Array.from(labels, label => label.querySelector('text')?.getAttribute('aria-label'))).toEqual([
    '$142K (19%)',
    '$168K (22%)',
    '$196K (26%)',
    '★ $248K (33%)'
  ]);
  expect(barLabel().getAttribute('transform')).toMatch(/^translate\(/);
  const context = document.createElement('canvas').getContext('2d')!;
  for (const label of labels) {
    const pill = label.querySelector('rect')!;
    const width = Number(pill.getAttribute('width'));
    const height = Number(pill.getAttribute('height'));
    const lines = Array.from(label.querySelectorAll('tspan'));
    expect(lines.length).toBeGreaterThan(0);
    expect(width).toBeGreaterThanOrEqual(Math.max(...lines.map(line =>
      context.measureText(line.textContent ?? '').width
    )) + 12);
    expect(Number(pill.getAttribute('x'))).toBe(-width / 2);
    expect(Number(pill.getAttribute('y'))).toBe(-height / 2);
    expect(lines.every(line => line.getAttribute('x') === '0')).toBe(true);
  }
  expect(chart.shadowRoot!.querySelectorAll('[data-label-id="y-tick-0"]')).toHaveLength(1);

  root.querySelector<HTMLButtonElement>('#btn-lbl-fo')!.click();
  expect(barLabel().querySelector('foreignObject')).not.toBeNull();
  expect(barLabel().textContent).toBe('$142K');

  root.querySelector<HTMLButtonElement>('#btn-lbl-svg')!.click();
  expect(barLabel().querySelector('foreignObject')).toBeNull();
  expect(barLabel().textContent).toBe('$142K');
});
