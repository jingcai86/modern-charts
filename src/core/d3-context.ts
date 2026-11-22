import {
  extent,
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scalePoint,
  scaleSqrt
} from './scales';
import type * as d3Types from 'd3';

/**
 * Lightweight tree-shakeable subset of D3 exposed on `ctx.d3` for standalone
 * per-chart entry points (`modern-charts/bar`, `modern-charts/line`, etc.).
 * Only includes core scale/array primitives already used by chart internals so
 * standalone bundles stay minimal without pulling in `d3-selection`, `d3-zoom`,
 * `d3-transition`, `d3-format`, or `d3-time-format`.
 * When the full `modern-charts` entry point is imported, it registers the
 * complete `d3` namespace via `registerChartD3(d3)`.
 */
const LITE_D3 = {
  extent,
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scalePoint,
  scaleSqrt
};

let activeD3: typeof d3Types = LITE_D3 as unknown as typeof d3Types;

/**
 * Registers a custom or full `d3` namespace to be supplied on `ctx.d3`.
 */
export function registerChartD3(d3Namespace: typeof d3Types): void {
  activeD3 = d3Namespace;
}

/**
 * Returns the active `d3` namespace for `ChartRenderContext.d3`.
 */
export function getChartD3(): typeof d3Types {
  return activeD3;
}
