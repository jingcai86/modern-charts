import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import {
  registerGaugeChart,
  renderGaugeNeedleItem,
  renderGaugeValueArcItem,
  type GaugeChartModel,
  type GaugeDatum,
  type GaugePointerType,
  type MCGaugeChart
} from '../src/entries/gauge';

function mountGauge(pointerType: GaugePointerType = 'needle', data: GaugeDatum | GaugeDatum[] = { value: 18 }) {
  const gauge = document.createElement('mc-gauge-chart') as MCGaugeChart;
  gauge.config = {
    data,
    pointerType,
    width: 460,
    height: 360,
    cornerRadius: 0,
    animation: { duration: 210, easing: 'linear' }
  };
  document.body.append(gauge);
  return gauge;
}

function valueArc(gauge: MCGaugeChart, index = 0): SVGPathElement {
  return gauge.shadowRoot!.querySelector<SVGPathElement>(`.mc-gauge-value-arc[data-series-index="${index}"]`)!;
}

function needle(gauge: MCGaugeChart, index = 0): SVGElement {
  return gauge.shadowRoot!.querySelectorAll<SVGElement>('.mc-gauge-needle')[index];
}

function needleAngle(mark: SVGElement) {
  if (mark.localName === 'polygon') {
    const [x, y] = mark.getAttribute('points')!.split(' ')[0].split(',').map(Number);
    return Math.atan2(y, x);
  }
  const [x, y] = mark.localName === 'circle' ? ['cx', 'cy'] : ['x2', 'y2'];
  return Math.atan2(Number(mark.getAttribute(y)), Number(mark.getAttribute(x)));
}

function arcAngle(path: SVGPathElement) {
  const match = /^M[^A]+A(?:[^,]+,){5}([^,]+),([^ALZ]+)/.exec(path.getAttribute('d')!);
  return Math.atan2(Number(match![2]), Number(match![1]));
}

beforeAll(() => registerGaugeChart());

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

it.each(['needle', 'pin', 'triangle'] as const)('sweeps the value arc and %s from their displayed angle together', async (type) => {
  const gauge = mountGauge(type);
  const pathAtRest = valueArc(gauge).getAttribute('d');
  const angleAtRest = needleAngle(needle(gauge));
  gauge.data = { value: 46 };
  expect(valueArc(gauge).getAttribute('d')).toBe(pathAtRest);
  expect(needleAngle(needle(gauge))).toBeCloseTo(angleAtRest, 4);

  await vi.waitFor(() => {
    expect(valueArc(gauge).getAttribute('d')).not.toBe(pathAtRest);
    expect(needleAngle(needle(gauge))).toBeCloseTo(arcAngle(valueArc(gauge)), 3);
  }, { interval: 10 });

  const renderedArc = valueArc(gauge).getAttribute('d');
  const renderedNeedle = needleAngle(needle(gauge));
  gauge.setConfig({ ...gauge.config, data: { value: 31 } });
  expect(valueArc(gauge).getAttribute('d')).toBe(renderedArc);
  expect(needleAngle(needle(gauge))).toBeCloseTo(renderedNeedle, 4);
  const finalAngle = (-135 + 0.31 * 270) * Math.PI / 180 - Math.PI / 2;
  await vi.waitFor(() => {
    expect(needleAngle(needle(gauge))).toBeCloseTo(finalAngle, 3);
    expect(arcAngle(valueArc(gauge))).toBeCloseTo(finalAngle, 3);
  });
});

it('keeps named series keyed across insertions and retracts retiring arcs and needles', async () => {
  const a = { value: 15, label: 'East' };
  const b = { value: 37, label: 'West' };
  const gauge = mountGauge('pin', [a, b]);
  const arcGroup = valueArc(gauge, 0).parentElement;
  const needleGroup = needle(gauge, 0).parentElement;
  const retiringArc = valueArc(gauge, 1);
  const retiringNeedle = needle(gauge, 1);
  const d = retiringArc.getAttribute('d');
  const startAngle = needleAngle(retiringNeedle);
  gauge.data = [{ label: 'North', value: 25 }, a];
  expect(valueArc(gauge, 1).parentElement).toBe(arcGroup);
  expect(needle(gauge, 1).parentElement).toBe(needleGroup);
  expect(valueArc(gauge).getAttribute('d')).not.toContain('A');
  expect(needle(gauge).getAttribute('r')).toBe('0');
  expect(retiringArc.parentElement?.getAttribute('aria-hidden')).toBe('true');
  expect(retiringNeedle.parentElement?.getAttribute('aria-hidden')).toBe('true');
  expect(retiringArc.hasAttribute('tabindex')).toBe(false);
  expect(retiringArc.getAttribute('d')).toBe(d);
  expect(needleAngle(retiringNeedle)).toBeCloseTo(startAngle, 4);

  await vi.waitFor(() => {
    expect(retiringArc.getAttribute('d')).not.toBe(d);
    expect(needleAngle(retiringNeedle)).not.toBeCloseTo(startAngle, 4);
  }, { interval: 10 });
  await vi.waitFor(() => {
    expect(retiringArc.isConnected).toBe(false);
    expect(retiringNeedle.isConnected).toBe(false);
  });
});

it('updates gauge arcs and pointers immediately when reduced motion is requested', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const gauge = mountGauge();
  const before = valueArc(gauge).getAttribute('d');
  const angleBefore = needleAngle(needle(gauge));
  gauge.data = { value: 55 };
  expect(gauge.shadowRoot!.querySelector('[data-item-transition]')).toBeNull();
  expect(valueArc(gauge).getAttribute('d')).not.toBe(before);
  expect(needleAngle(needle(gauge))).not.toBeCloseTo(angleBefore, 4);
});

it('still renders the primary value and pointer for a manually supplied model with empty series', () => {
  const gauge = mountGauge('pin');
  const checkFallback = vi.fn();
  gauge.layers = [{
    name: 'legacy-item',
    render: (ctx) => {
      const model = { ...(ctx.state.model as GaugeChartModel), series: [] };
      const arc = renderGaugeValueArcItem(model, ctx);
      const needle = renderGaugeNeedleItem(model, ctx).querySelector('.mc-gauge-needle--pin');
      checkFallback(arc.getAttribute('d'), needle?.getAttribute('cx'));
      expect(arc.getAttribute('d')).toBe(model.valueArcPathD);
      expect(needle?.getAttribute('cx')).toBe(String(model.needleX2));
    }
  }];
  expect(checkFallback).toHaveBeenCalled();
});
