import { beforeAll, describe, expect, it } from 'vitest';
import {
  findGuideConfigBlock,
  formatGuideConfigAssignment,
  parseGuideConfig,
  type GuideCallbackCompiler
} from '../apps/studio/guides/callback-config';
import { loadGuideCallbackCompiler } from '../apps/studio/guides/callback-runtime';
import { guideCallback } from '../apps/studio/guides/callback-source';
import { parseConfigObjectLiteral } from '../apps/studio/utils/code-sync';

describe('Studio guide callback configuration', () => {
  let compileCallback: GuideCallbackCompiler;
  beforeAll(async () => {
    compileCallback = await loadGuideCallbackCompiler();
  });

  it('keeps the original callback and scope when the displayed source is unchanged', () => {
    let unit = 'ms';
    const format = guideCallback((value: number) => `${value} ${unit}`, () => ({ unit }));
    const defaults = { formatter: format, data: [5] };
    const source = formatGuideConfigAssignment(defaults);

    expect(source).not.toContain('[Function]');
    const parsed = parseGuideConfig(source.replace('[5]', '[10]'), defaults);
    expect(parsed.hasPendingCallbacks).toBe(false);
    expect(parsed.config.formatter).toBe(format);
    expect(parsed.config.data).toEqual([10]);

    const edit = source.replace('${value}', '${value * 2}');
    expect(parseGuideConfig(edit, defaults).hasPendingCallbacks).toBe(true);
    const applied = parseGuideConfig(edit, defaults, { compileCallback });
    expect(applied.hasPendingCallbacks).toBe(false);
    unit = 's';
    expect(applied.config.formatter(10)).toBe('20 s');
    expect(formatGuideConfigAssignment(applied.config)).toBe(edit);
    expect(parseGuideConfig(edit, applied.config).config.formatter).toBe(applied.config.formatter);
  });

  it('reads callback expressions beside other properties and inside arrays', () => {
    const source = `chart.config = {
      formatter: ((value) => /[},]/.test(value) ? \`[\${value}]\` : value),
      layers: [function render() { return 'custom'; }, 'legends'],
      enabled: true,
    };

    const rows = chart.toCsv();`;
    const block = findGuideConfigBlock(source)!;
    expect(findGuideConfigBlock('const chart = document.createElement("mc-bar-chart");')).toBeNull();
    expect(source.slice(block.end)).toBe(';\n\n    const rows = chart.toCsv();');
    const { config } = parseGuideConfig(block.literal, {}, { compileCallback });

    expect(config.formatter('a,b')).toBe('[a,b]');
    expect(config.formatter('a')).toBe('a');
    expect(config.layers[0]()).toBe('custom');
    expect(config.enabled).toBe(true);
  });

  it('continues to parse ordinary config values without evaluating expressions', () => {
    const initial = { formatter: (value: number) => value, enabled: true };
    expect(parseGuideConfig("{ formatter: '[Function]' }", initial).config.formatter)
      .toBe(initial.formatter);
    expect(() => parseGuideConfig('{ value: Math.random() }', initial, { compileCallback }))
      .toThrow(SyntaxError);
    expect(() => parseGuideConfig('[]', initial)).toThrow('Config must be a JavaScript object');
    expect(() => parseConfigObjectLiteral('{ formatter: value => value }')).toThrow(SyntaxError);
  });

  it('restores layer shortcuts and keeps named renderers across reordering', () => {
    const top = { name: 'top', render: () => 'Top' };
    const bottom = { name: 'bottom', render: () => 'Bottom' };
    const defaults = { layers: [top, bottom] };
    const source = formatGuideConfigAssignment({ layers: [bottom, top, 'bottom'] });
    const { config, hasPendingCallbacks } = parseGuideConfig(source, defaults, {
      layerRegistry: { top, bottom }
    });

    expect(hasPendingCallbacks).toBe(false);
    expect(config.layers[0].render).toBe(bottom.render);
    expect(config.layers[1].render).toBe(top.render);
    expect(config.layers[2]).toBe(bottom);
  });
});
