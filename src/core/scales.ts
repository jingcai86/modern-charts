/**
 * Lightweight numeric & categorical scale primitives for standalone chart bundles.
 * Avoids pulling `d3-color`, `d3-interpolate`, and `d3-format` into charts that
 * only perform numeric/categorical axis and layout mapping.
 */

export interface ContinuousNumericScale {
  (value: number): number;
  domain(): number[];
  domain(values: Iterable<number>): this;
  range(): number[];
  range(values: Iterable<number>): this;
  clamp(): boolean;
  clamp(enabled: boolean): this;
  invert(value: number): number;
  nice(count?: number): this;
  ticks(count?: number): number[];
  copy(): ContinuousNumericScale;
}

export interface LogNumericScale extends ContinuousNumericScale {
  base(): number;
  base(value: number): this;
  copy(): LogNumericScale;
}

export interface SymlogNumericScale extends ContinuousNumericScale {
  constant(): number;
  constant(value: number): this;
  copy(): SymlogNumericScale;
}

export interface BandScale<D extends string | number = string> {
  (value: D): number | undefined;
  domain(): D[];
  domain(values: Iterable<D>): this;
  range(): [number, number];
  range(values: [number, number]): this;
  padding(value: number): this;
  paddingInner(): number;
  paddingInner(value: number): this;
  paddingOuter(): number;
  paddingOuter(value: number): this;
  align(): number;
  align(value: number): this;
  round(): boolean;
  round(enabled: boolean): this;
  bandwidth(): number;
  step(): number;
  copy(): BandScale<D>;
}

export interface PointScale<D extends string | number = string> {
  (value: D): number | undefined;
  domain(): D[];
  domain(values: Iterable<D>): this;
  range(): [number, number];
  range(values: [number, number]): this;
  padding(): number;
  padding(value: number): this;
  align(): number;
  align(value: number): this;
  round(): boolean;
  round(enabled: boolean): this;
  bandwidth(): number;
  step(): number;
  copy(): PointScale<D>;
}

export interface OrdinalScale<D = string, R = string> {
  (value: D): R;
  domain(): D[];
  domain(values: Iterable<D>): this;
  range(): R[];
  range(values: Iterable<R>): this;
  unknown(): unknown;
  unknown(value: R): this;
  copy(): OrdinalScale<D, R>;
}

/**
 * Returns the `[min, max]` extent of an iterable, ignoring nullish and NaN entries.
 */
export function extent<T extends number | Date>(
  values: Iterable<T | null | undefined>
): [T, T] | [undefined, undefined] {
  let min: T | undefined;
  let max: T | undefined;
  let minNum = Infinity;
  let maxNum = -Infinity;
  for (const val of values) {
    if (val === null || val === undefined) continue;
    const numeric: number = val instanceof Date ? val.getTime() : Number(val);
    if (Number.isNaN(numeric)) continue;
    if (min === undefined) {
      min = val;
      max = val;
      minNum = numeric;
      maxNum = numeric;
    } else {
      if (numeric < minNum) {
        min = val;
        minNum = numeric;
      }
      if (numeric > maxNum) {
        max = val;
        maxNum = numeric;
      }
    }
  }
  if (min === undefined || max === undefined) {
    return [undefined, undefined];
  }
  return [min, max];
}

function niceStepSize(span: number, targetCount: number): number {
  const safeCount = Math.max(1, targetCount);
  const rawStep = Math.abs(span) / safeCount;
  if (!Number.isFinite(rawStep) || rawStep === 0) return 0;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const ratio = rawStep / magnitude;

  let factor = 1;
  if (ratio >= 7.071) factor = 10;
  else if (ratio >= 3.162) factor = 5;
  else if (ratio >= 1.414) factor = 2;

  return factor * magnitude;
}

function cleanFloat(value: number): number {
  if (value === 0) return 0;
  const cleaned = Number(value.toPrecision(12));
  return cleaned === 0 ? 0 : cleaned;
}

function buildNumericTicks(start: number, stop: number, count: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(stop) || count <= 0) return [];
  if (start === stop) return [cleanFloat(start)];

  const reversed = stop < start;
  const lo = reversed ? stop : start;
  const hi = reversed ? start : stop;
  const step = niceStepSize(hi - lo, count);
  if (step === 0) return [cleanFloat(lo)];

  const firstIndex = Math.ceil(lo / step - 1e-10);
  const lastIndex = Math.floor(hi / step + 1e-10);
  const result: number[] = [];
  for (let i = firstIndex; i <= lastIndex; i++) {
    const tick = cleanFloat(i * step);
    if (tick >= lo - step * 1e-9 && tick <= hi + step * 1e-9) {
      result.push(tick);
    }
  }
  return reversed ? result.reverse() : result;
}

function makeContinuousScale(
  forward: (x: number) => number,
  backward: (y: number) => number,
  customTicks?: (d0: number, d1: number, count: number) => number[],
  customNice?: (d0: number, d1: number, count: number) => [number, number]
): ContinuousNumericScale {
  let domainValues: number[] = [0, 1];
  let rangeValues: number[] = [0, 1];
  let isClamped = false;

  const mapNumber = (input: number): number => {
    const n = Math.min(domainValues.length, rangeValues.length);
    if (n < 2) return rangeValues[0] ?? 0;

    let d0 = domainValues[0];
    let d1 = domainValues[n - 1];
    let r0 = rangeValues[0];
    let r1 = rangeValues[n - 1];

    if (n > 2) {
      const ascending = domainValues[n - 1] >= domainValues[0];
      let seg = n - 2;
      for (let i = 0; i < n - 1; i++) {
        const a = domainValues[i];
        const b = domainValues[i + 1];
        if (ascending ? input <= b : input >= b) {
          seg = i;
          break;
        }
      }
      d0 = domainValues[seg];
      d1 = domainValues[seg + 1];
      r0 = rangeValues[seg];
      r1 = rangeValues[seg + 1];
    }

    const t0 = forward(d0);
    const t1 = forward(d1);
    const tv = forward(input);
    const span = t1 - t0;
    let t = span === 0 ? 0.5 : (tv - t0) / span;
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }
    return r0 + (r1 - r0) * t;
  };

  const scale = ((value: number): number => mapNumber(Number(value))) as ContinuousNumericScale;

  scale.domain = ((values?: Iterable<number>) => {
    if (!values) return domainValues.slice();
    domainValues = Array.from(values, Number);
    return scale;
  }) as ContinuousNumericScale['domain'];

  scale.range = ((values?: Iterable<number>) => {
    if (!values) return rangeValues.slice();
    rangeValues = Array.from(values, Number);
    return scale;
  }) as ContinuousNumericScale['range'];

  scale.clamp = ((enabled?: boolean) => {
    if (enabled === undefined) return isClamped;
    isClamped = Boolean(enabled);
    return scale;
  }) as ContinuousNumericScale['clamp'];

  scale.invert = (output: number): number => {
    const d0 = domainValues[0];
    const d1 = domainValues[domainValues.length - 1];
    const r0 = rangeValues[0];
    const r1 = rangeValues[rangeValues.length - 1];
    const rSpan = r1 - r0;
    let t = rSpan === 0 ? 0.5 : (output - r0) / rSpan;
    if (isClamped) {
      t = Math.max(0, Math.min(1, t));
    }
    const t0 = forward(d0);
    const t1 = forward(d1);
    return backward(t0 + (t1 - t0) * t);
  };

  scale.nice = (count = 10) => {
    if (domainValues.length < 2) return scale;
    const lastIdx = domainValues.length - 1;
    const start = domainValues[0];
    const stop = domainValues[lastIdx];
    if (!Number.isFinite(start) || !Number.isFinite(stop) || start === stop) {
      return scale;
    }

    if (customNice) {
      const [n0, n1] = customNice(start, stop, count);
      domainValues[0] = n0;
      domainValues[lastIdx] = n1;
      return scale;
    }

    const reversed = stop < start;
    const lo = reversed ? stop : start;
    const hi = reversed ? start : stop;
    let step = niceStepSize(hi - lo, count);
    if (step > 0) {
      let niceLo = cleanFloat(Math.floor(lo / step) * step);
      let niceHi = cleanFloat(Math.ceil(hi / step) * step);
      const refined = niceStepSize(niceHi - niceLo, count);
      if (refined > 0 && refined !== step) {
        step = refined;
        niceLo = cleanFloat(Math.floor(lo / step) * step);
        niceHi = cleanFloat(Math.ceil(hi / step) * step);
      }
      domainValues[0] = reversed ? niceHi : niceLo;
      domainValues[lastIdx] = reversed ? niceLo : niceHi;
    }
    return scale;
  };

  scale.ticks = (count = 10): number[] => {
    if (domainValues.length < 2) return [];
    const d0 = domainValues[0];
    const d1 = domainValues[domainValues.length - 1];
    if (customTicks) return customTicks(d0, d1, count);
    return buildNumericTicks(d0, d1, count);
  };

  scale.copy = () =>
    makeContinuousScale(forward, backward, customTicks, customNice)
      .domain(domainValues)
      .range(rangeValues)
      .clamp(isClamped);

  return scale;
}

export function scaleLinear(): ContinuousNumericScale {
  return makeContinuousScale(
    (x) => x,
    (y) => y
  );
}

export function scaleSqrt(): ContinuousNumericScale {
  return makeContinuousScale(
    (x) => (x < 0 ? -Math.sqrt(-x) : Math.sqrt(x)),
    (y) => (y < 0 ? -y * y : y * y)
  );
}

export function scaleLog(): LogNumericScale {
  let logBase = 10;

  const logFn = (x: number): number =>
    x > 0 ? Math.log(x) / Math.log(logBase) : -Math.log(-x) / Math.log(logBase);
  const powFn = (y: number): number => Math.pow(logBase, y);

  const logNice = (d0: number, d1: number): [number, number] => {
    const reversed = d1 < d0;
    const lo = Math.max(1e-12, reversed ? d1 : d0);
    const hi = Math.max(lo, reversed ? d0 : d1);
    const nLo = powFn(Math.floor(logFn(lo)));
    const nHi = powFn(Math.ceil(logFn(hi)));
    return reversed ? [nHi, nLo] : [nLo, nHi];
  };

  const logTicks = (d0: number, d1: number, count: number): number[] => {
    const reversed = d1 < d0;
    const lo = Math.max(1e-12, reversed ? d1 : d0);
    const hi = Math.max(lo, reversed ? d0 : d1);
    const pMin = Math.floor(logFn(lo));
    const pMax = Math.ceil(logFn(hi));
    const ticks: number[] = [];

    if (Number.isInteger(logBase) && pMax - pMin < count) {
      for (let p = pMin; p <= pMax; p++) {
        const basePow = powFn(p);
        for (let k = 1; k < logBase; k++) {
          const val = cleanFloat(k * basePow);
          if (val >= lo && val <= hi) ticks.push(val);
        }
      }
    } else {
      const powers = buildNumericTicks(pMin, pMax, Math.min(pMax - pMin, count));
      for (const p of powers) {
        const val = cleanFloat(powFn(p));
        if (val >= lo && val <= hi) ticks.push(val);
      }
    }
    return reversed ? ticks.reverse() : ticks;
  };

  const scale = makeContinuousScale(
    logFn,
    powFn,
    logTicks,
    logNice
  ) as LogNumericScale;

  scale.domain([1, 10]);

  scale.base = ((value?: number) => {
    if (value === undefined) return logBase;
    logBase = Number(value);
    return scale;
  }) as LogNumericScale['base'];

  const baseCopy = scale.copy;
  scale.copy = () => {
    const cloned = scaleLog()
      .base(logBase)
      .domain(scale.domain())
      .range(scale.range())
      .clamp(scale.clamp());
    void baseCopy;
    return cloned;
  };

  return scale;
}

export function scaleSymlog(): SymlogNumericScale {
  let c = 1;

  const forward = (x: number): number => Math.sign(x) * Math.log1p(Math.abs(x / c));
  const backward = (y: number): number => Math.sign(y) * Math.expm1(Math.abs(y)) * c;

  const scale = makeContinuousScale(forward, backward) as SymlogNumericScale;

  scale.constant = ((value?: number) => {
    if (value === undefined) return c;
    c = Number(value);
    return scale;
  }) as SymlogNumericScale['constant'];

  scale.copy = () =>
    scaleSymlog()
      .constant(c)
      .domain(scale.domain())
      .range(scale.range())
      .clamp(scale.clamp());

  return scale;
}

function createDiscreteBandScale<D extends string | number>(
  fixedInnerPadding: number | null
): BandScale<D> {
  let domainValues: D[] = [];
  let indexMap = new Map<D, number>();
  let rangeValues: [number, number] = [0, 1];
  let innerPad = fixedInnerPadding ?? 0;
  let outerPad = 0;
  let alignVal = 0.5;
  let roundOutput = false;
  let computedStep = 1;
  let computedBandwidth = 0;
  let positions: number[] = [];

  const rescale = (): void => {
    const n = domainValues.length;
    const reversed = rangeValues[1] < rangeValues[0];
    let start = reversed ? rangeValues[1] : rangeValues[0];
    const stop = reversed ? rangeValues[0] : rangeValues[1];
    const span = stop - start;

    computedStep = span / Math.max(1, n - innerPad + outerPad * 2);
    if (roundOutput) computedStep = Math.floor(computedStep);

    start += (span - computedStep * (n - innerPad)) * alignVal;
    computedBandwidth = computedStep * (1 - innerPad);
    if (roundOutput) {
      start = Math.round(start);
      computedBandwidth = Math.round(computedBandwidth);
    }

    positions = new Array(n);
    for (let i = 0; i < n; i++) {
      positions[i] = start + computedStep * i;
    }
    if (reversed) positions.reverse();
  };

  rescale();

  const scale = ((value: D): number | undefined => {
    const idx = indexMap.get(value);
    return idx === undefined ? undefined : positions[idx];
  }) as BandScale<D>;

  scale.domain = ((values?: Iterable<D>) => {
    if (!values) return domainValues.slice();
    domainValues = [];
    indexMap = new Map();
    for (const v of values) {
      if (!indexMap.has(v)) {
        indexMap.set(v, domainValues.length);
        domainValues.push(v);
      }
    }
    rescale();
    return scale;
  }) as BandScale<D>['domain'];

  scale.range = ((values?: [number, number]) => {
    if (!values) return [rangeValues[0], rangeValues[1]];
    rangeValues = [Number(values[0]), Number(values[1])];
    rescale();
    return scale;
  }) as BandScale<D>['range'];

  scale.padding = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    if (fixedInnerPadding === null) innerPad = clamped;
    outerPad = clamped;
    rescale();
    return scale;
  };

  scale.paddingInner = ((value?: number) => {
    if (value === undefined) return innerPad;
    if (fixedInnerPadding === null) {
      innerPad = Math.max(0, Math.min(1, value));
      rescale();
    }
    return scale;
  }) as BandScale<D>['paddingInner'];

  scale.paddingOuter = ((value?: number) => {
    if (value === undefined) return outerPad;
    outerPad = Math.max(0, value);
    rescale();
    return scale;
  }) as BandScale<D>['paddingOuter'];

  scale.align = ((value?: number) => {
    if (value === undefined) return alignVal;
    alignVal = Math.max(0, Math.min(1, value));
    rescale();
    return scale;
  }) as BandScale<D>['align'];

  scale.round = ((enabled?: boolean) => {
    if (enabled === undefined) return roundOutput;
    roundOutput = Boolean(enabled);
    rescale();
    return scale;
  }) as BandScale<D>['round'];

  scale.bandwidth = () => computedBandwidth;
  scale.step = () => computedStep;

  scale.copy = () =>
    createDiscreteBandScale<D>(fixedInnerPadding)
      .domain(domainValues)
      .range(rangeValues)
      .paddingInner(innerPad)
      .paddingOuter(outerPad)
      .align(alignVal)
      .round(roundOutput);

  return scale;
}

export function scaleBand<D extends string | number = string>(): BandScale<D> {
  return createDiscreteBandScale<D>(null);
}

export function scalePoint<D extends string | number = string>(): PointScale<D> {
  const base = createDiscreteBandScale<D>(1);
  const pointScale = base as unknown as PointScale<D>;
  pointScale.padding = ((value?: number) => {
    if (value === undefined) return base.paddingOuter();
    base.paddingOuter(value);
    return pointScale;
  }) as PointScale<D>['padding'];
  pointScale.copy = () =>
    scalePoint<D>()
      .domain(base.domain())
      .range(base.range())
      .padding(base.paddingOuter())
      .align(base.align())
      .round(base.round());
  return pointScale;
}

const IMPLICIT_UNKNOWN = Symbol('implicit');

export function scaleOrdinal<D = string, R = string>(
  initialRange: Iterable<R> = []
): OrdinalScale<D, R> {
  let domainValues: D[] = [];
  let indexMap = new Map<D, number>();
  let rangeValues: R[] = Array.from(initialRange);
  let unknownValue: R | typeof IMPLICIT_UNKNOWN = IMPLICIT_UNKNOWN;

  const scale = ((value: D): R => {
    let idx = indexMap.get(value);
    if (idx === undefined) {
      if (unknownValue !== IMPLICIT_UNKNOWN) return unknownValue;
      idx = domainValues.length;
      domainValues.push(value);
      indexMap.set(value, idx);
    }
    return rangeValues[idx % rangeValues.length];
  }) as OrdinalScale<D, R>;

  scale.domain = ((values?: Iterable<D>) => {
    if (!values) return domainValues.slice();
    domainValues = [];
    indexMap = new Map();
    for (const v of values) {
      if (!indexMap.has(v)) {
        indexMap.set(v, domainValues.length);
        domainValues.push(v);
      }
    }
    return scale;
  }) as OrdinalScale<D, R>['domain'];

  scale.range = ((values?: Iterable<R>) => {
    if (!values) return rangeValues.slice();
    rangeValues = Array.from(values);
    return scale;
  }) as OrdinalScale<D, R>['range'];

  scale.unknown = ((value?: R) => {
    if (arguments.length === 0) {
      return unknownValue === IMPLICIT_UNKNOWN ? undefined : unknownValue;
    }
    unknownValue = value as R;
    return scale;
  }) as OrdinalScale<D, R>['unknown'];

  scale.copy = () => {
    const cloned = scaleOrdinal<D, R>(rangeValues).domain(domainValues);
    if (unknownValue !== IMPLICIT_UNKNOWN) {
      cloned.unknown(unknownValue);
    }
    return cloned;
  };

  return scale;
}
