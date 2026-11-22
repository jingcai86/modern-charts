export interface SequentialColorScale {
  (value: number): string;
  domain(): [number, number];
  domain(values: [number, number]): this;
  clamp(): boolean;
  clamp(enabled: boolean): this;
  copy(): SequentialColorScale;
}

const COLOR_RAMPS: Record<string, readonly string[]> = {
  viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#fde725'],
  plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#f0f921'],
  inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#fcffa4'],
  magma: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#fcfdbf'],
  cividis: ['#002051', '#0a326a', '#2b446e', '#4d566d', '#696970', '#847e74', '#a19573', '#c2ae69', '#fdea45'],
  turbo: ['#23171b', '#4a58dd', '#2f9df5', '#27d7c4', '#4df884', '#95fb51', '#dedd32', '#ffa423', '#900c00'],
  warm: ['#6e40aa', '#963db3', '#bf3caf', '#e4419d', '#fe4b83', '#ff5e63', '#ff7847', '#fb9633', '#e2b72f'],
  cool: ['#6e40aa', '#5c58c4', '#4575d4', '#2e95d8', '#1fb4ce', '#1dd0b8', '#30e598', '#60f374', '#aff05b'],
  blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
  greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
  oranges: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'],
  purples: ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'],
  ylGnBu: ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58'],
  rdYlBu: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#313695'],
  spectral: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#5e4fa2']
};

function parseHexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sampleRamp(ramp: readonly string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (ramp.length - 1);
  const idx = Math.min(ramp.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const [r0, g0, b0] = parseHexRgb(ramp[idx]);
  const [r1, g1, b1] = parseHexRgb(ramp[idx + 1]);
  const r = Math.round(r0 + (r1 - r0) * frac);
  const g = Math.round(g0 + (g1 - g0) * frac);
  const b = Math.round(b0 + (b1 - b0) * frac);
  return `rgb(${r}, ${g}, ${b})`;
}

export function createSequentialColorScale(
  scheme: string = 'viridis',
  domain: [number, number] = [0, 100]
): SequentialColorScale {
  const ramp = COLOR_RAMPS[scheme] ?? COLOR_RAMPS.viridis;
  let dom: [number, number] = [domain[0], domain[1]];
  let clamped = false;

  const scale = ((value: number): string => {
    const span = dom[1] - dom[0];
    const rawT = span === 0 ? 0.5 : (Number(value) - dom[0]) / span;
    const t = clamped ? Math.max(0, Math.min(1, rawT)) : rawT;
    return sampleRamp(ramp, t);
  }) as SequentialColorScale;

  scale.domain = ((values?: [number, number]) => {
    if (!values) return [dom[0], dom[1]];
    dom = [Number(values[0]), Number(values[1])];
    return scale;
  }) as SequentialColorScale['domain'];

  scale.clamp = ((enabled?: boolean) => {
    if (enabled === undefined) return clamped;
    clamped = Boolean(enabled);
    return scale;
  }) as SequentialColorScale['clamp'];

  scale.copy = () =>
    createSequentialColorScale(scheme, [dom[0], dom[1]]).clamp(clamped);

  return scale;
}
