import {
  interpolateBlues,
  interpolateCividis,
  interpolateCool,
  interpolateGreens,
  interpolateInferno,
  interpolateMagma,
  interpolateOranges,
  interpolatePlasma,
  interpolatePurples,
  interpolateRdYlBu,
  interpolateSpectral,
  interpolateTurbo,
  interpolateViridis,
  interpolateWarm,
  interpolateYlGnBu,
  scaleSequential,
  type ScaleSequential
} from 'd3';

export function createSequentialColorScale(
  scheme: string = 'viridis',
  domain: [number, number] = [0, 100]
): ScaleSequential<string, never> {
  const interpolatorMap: Record<string, (t: number) => string> = {
    viridis: interpolateViridis,
    plasma: interpolatePlasma,
    inferno: interpolateInferno,
    magma: interpolateMagma,
    cividis: interpolateCividis,
    turbo: interpolateTurbo,
    warm: interpolateWarm,
    cool: interpolateCool,
    blues: interpolateBlues,
    greens: interpolateGreens,
    oranges: interpolateOranges,
    purples: interpolatePurples,
    ylGnBu: interpolateYlGnBu,
    rdYlBu: interpolateRdYlBu,
    spectral: interpolateSpectral
  };
  const interpolator = interpolatorMap[scheme] ?? interpolateViridis;
  return scaleSequential(interpolator).domain(domain);
}
