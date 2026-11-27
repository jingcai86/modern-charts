import { parseExpressionAt } from 'acorn';
import { expect, it } from 'vitest';
import { getGuideCallbackSource, guideCallback } from '../apps/studio/guides/callback-source';

it('keeps ordinary functions and async arrows as written', () => {
  const format = function (value: number) {
    return value + 1;
  };
  const asynchronous = async (value: number) => value + 2;

  expect(getGuideCallbackSource(format)).toBe(format.toString());
  expect(getGuideCallbackSource(asynchronous)).toBe(asynchronous.toString());
});

it('formats shorthand methods as valid function expressions', () => {
  const name = Symbol('format');
  const methods = {
    async(value: number) {
      return value + 1;
    },
    *default(value: number) {
      yield value;
    },
    async *[name](value: number) {
      yield value;
    }
  };

  for (const [callback, asynchronous, generator] of [
    [guideCallback(methods.async), false, false],
    [methods.default, false, true],
    [methods[name], true, true]
  ] as const) {
    const source = getGuideCallbackSource(callback);
    expect(parseExpressionAt(source, 0, { ecmaVersion: 'latest' })).toMatchObject({
      type: 'FunctionExpression',
      async: asynchronous,
      generator,
      end: source.length
    });
  }
});
