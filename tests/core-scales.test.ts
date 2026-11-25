import { describe, expect, it } from 'vitest';
import {
  buildAxisScale,
  getScalePosition,
  getScaleTicks
} from '../src/core/scale-manager';
import {
  extent,
  scaleBand,
  scaleLinear,
  scaleLog,
  scaleOrdinal,
  scalePoint,
  scaleSqrt,
  scaleSymlog
} from '../src/core/scales';

describe('axis scale behavior', () => {
  it('ignores invalid values when summarizing numeric or date domains', () => {
    const first = new Date('2026-01-01T00:00:00Z');
    const last = new Date('2026-01-03T00:00:00Z');
    expect(extent([null, last, new Date(NaN), first, undefined])).toEqual([first, last]);
    expect(extent([NaN, 2, -3, 12])).toEqual([-3, 12]);
    expect(extent([null, undefined, NaN])).toEqual([undefined, undefined]);
  });

  it.each([
    { domain: [0, 10, 20], range: [0, 80, 100] },
    { domain: [20, 10, 0], range: [100, 80, 0] }
  ])('maps piecewise domains $domain and clamps independent copies', ({ domain, range }) => {
    const scale = scaleLinear().domain(domain).range(range);
    expect(scale(5)).toBe(40);
    expect(scale(15)).toBe(90);
    expect(scale(25)).toBe(110);

    const bounded = scale.copy().clamp(true);
    expect(bounded(25)).toBe(100);
    expect(bounded(-5)).toBe(0);
    expect(bounded.invert(120)).toBe(20);
    expect(bounded.invert(-10)).toBe(0);
    expect(bounded.clamp()).toBe(true);
    expect(scale.clamp()).toBe(false);
    expect(scale.domain()).toEqual(domain);
  });

  it('makes descending domains nice and generates ticks in their visual order', () => {
    const scale = scaleLinear().domain([9.7, 1.3]).nice(4);
    expect(scale.domain()).toEqual([10, 0]);
    expect(scale.ticks(5)).toEqual([10, 8, 6, 4, 2, 0]);
    expect(scale.ticks(0)).toEqual([]);
    expect(scaleLinear().domain([0, 0.6]).ticks(3)).toEqual([0, 0.2, 0.4, 0.6]);
  });

  it('handles degenerate domains and ranges without returning nonfinite coordinates', () => {
    const single = scaleLinear().domain([4]).range([10, 30]).nice();
    expect(single(4)).toBe(10);
    expect(single.ticks()).toEqual([]);
    expect(single.domain()).toEqual([4]);

    const flat = scaleLinear().domain([5, 5]).range([10, 30]).nice();
    expect(flat.ticks()).toEqual([5]);
    expect(flat(5)).toBe(20);
    expect(scaleLinear().domain([10, 30]).range([5, 5]).invert(5)).toBe(20);
    expect(scaleLinear().domain([1, Infinity]).nice().ticks()).toEqual([]);
  });

  it('produces ordered logarithmic ticks and preserves base and clamping in a copy', () => {
    const scale = scaleLog().base(2).domain([50, 3]).range([0, 60]).nice().clamp(true);
    expect(scale.domain()).toEqual([64, 2]);
    expect(scale.ticks(12)).toEqual([64, 32, 16, 8, 4, 2]);
    expect(scale.ticks(2)).toEqual([64, 16, 4]);
    expect(scale(64)).toBe(0);
    expect(scale(2)).toBe(60);
    expect(scale.invert(scale(16))).toBeCloseTo(16);

    const clone = scale.copy();
    expect(clone.base()).toBe(2);
    expect(clone.clamp()).toBe(true);
    expect(clone.range()).toEqual([0, 60]);
    clone.base(10);
    expect(scale.base()).toBe(2);
  });

  it('uses a positive fallback domain for a logarithmic axis with nonpositive data', () => {
    const scale = buildAxisScale({ type: 'log', nice: false }, [-9, -4], [0, 100]);
    expect(scale.domain()).toEqual([1, 10]);
    expect(scale(1)).toBe(0);
    expect(scale(10)).toBe(100);
  });

  it('round trips signed square-root and symmetric log coordinates', () => {
    const sqrt = scaleSqrt().domain([-100, 100]).range([0, 200]);
    expect(sqrt(-25)).toBe(50);
    expect(sqrt.invert(50)).toBe(-25);
    expect(sqrt.invert(150)).toBe(25);

    const symlog = buildAxisScale(
      { type: 'symlog', constant: 3, min: -99, max: 99, nice: false, clamp: true },
      [0],
      [100, 300]
    );
    expect(symlog(0)).toBe(200);
    expect(symlog.invert(symlog(-24))).toBeCloseTo(-24);
    const clone = symlog.copy();
    expect(clone.constant()).toBe(3);
    expect(clone(150)).toBe(300);
    clone.constant(12);
    expect(symlog(-24)).not.toBeCloseTo(clone(-24));
  });

  it('retains date values across range changes, rounding, and independent copies', () => {
    const day = 86_400_000;
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date(start.getTime() + day);
    const axis = buildAxisScale(
      { type: 'time', reverse: true, nice: false, clamp: true },
      [start, 'invalid date'],
      [0, 100]
    );
    expect(axis.domain()).toEqual([start, end]);
    expect(axis(start.toISOString())).toBe(100);
    expect(axis(end.getTime())).toBe(0);
    expect(axis(new Date(start.getTime() - day))).toBe(100);
    expect(axis.invert(50)).toEqual(new Date(start.getTime() + day / 2));
    expect(getScaleTicks(axis, 4).every((tick) => tick instanceof Date)).toBe(true);

    const copy = axis.copy().range([10, 70]).domain([start.getTime(), end.toISOString()]);
    expect(copy.range()).toEqual([10, 70]);
    expect(copy.domain()).toEqual([start, end]);
    expect(copy.clamp()).toBe(true);
    expect(copy.clamp(false).nice(4).range()).toEqual([10, 70]);
    expect(axis.range()).toEqual([100, 0]);
    expect(axis.clamp()).toBe(true);
  });

  it('sizes rounded, reversed bands independently from copies and centered point axes', () => {
    const band = scaleBand().domain(['A', 'A', 'B', 'C']).range([301, 0]);
    band.padding(0.1).paddingInner(0.2).paddingOuter(0.25).align(1).round(true);
    expect(band.domain()).toEqual(['A', 'B', 'C']);
    expect(band.range()).toEqual([301, 0]);
    expect(band.round()).toBe(true);
    expect(band.align()).toBe(1);
    expect(band.paddingInner()).toBe(0.2);
    expect(band.paddingOuter()).toBe(0.25);
    expect(band('missing')).toBeUndefined();
    expect(getScalePosition(band, 'missing')).toBe(0);
    expect(band('A')!).toBeGreaterThan(band('B')!);
    expect(getScalePosition(band, 'A')).toBe(band('A')! + band.bandwidth() / 2);
    expect(Number.isInteger(band.step())).toBe(true);
    expect(band.copy().range([0, 301])('A')!).toBeLessThan(band('A')!);

    const point = scalePoint().domain(['A', 'B']).range([0, 100]).padding(0.5);
    expect(point.bandwidth()).toBe(0);
    expect(point.padding()).toBe(0.5);
    expect(point('A')).toBe(25);
    expect(point('B')).toBe(75);
    expect(point.copy().padding(0)('A')).toBe(0);
    expect(point('A')).toBe(25);
  });

  it('repeats ordinal colors and keeps explicit unknown values out of the domain', () => {
    const color = scaleOrdinal<string, string>(['red', 'green']).domain(['A', 'A', 'B']);
    expect(color('C')).toBe('red');
    expect(color.domain()).toEqual(['A', 'B', 'C']);

    const copy = color.copy().range(['navy']).unknown('gray');
    expect(copy('B')).toBe('navy');
    expect(copy('unknown')).toBe('gray');
    expect(copy.domain()).toEqual(['A', 'B', 'C']);
    expect(copy.copy()('unknown')).toBe('gray');
    expect(color.range()).toEqual(['red', 'green']);
  });
});
