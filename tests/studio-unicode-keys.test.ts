import { describe, expect, it } from 'vitest';
import {
  extractTagAttributes,
  formatConfigAsJsObject,
  formatConfigAssignment,
  parseConfigObjectLiteral
} from '../apps/studio/utils/code-sync';

describe('Studio Unicode JavaScript object keys', () => {
  it('parses unquoted identifiers from different scripts and preserves their exact spelling', () => {
    const parsed = parseConfigObjectLiteral(
      "chart.config = { 数据: [{ 城市: '上海', القيمة٢: 12, Δείκτης: true }], 𐐀metric: 3, 𝐀value: 4, café: 5, café: 6, $value: 7, _value: 8, a‌b: 9, a‍b: 10 };"
    );
    expect(parsed).toEqual({
      数据: [{ 城市: '上海', القيمة٢: 12, Δείκτης: true }],
      '𐐀metric': 3,
      '𝐀value': 4,
      'café': 5,
      'café': 6,
      $value: 7,
      _value: 8,
      'a‌b': 9,
      'a‍b': 10
    });
    expect(Object.keys(parsed)).toContain('café');
    expect(Object.keys(parsed)).toContain('café');
  });

  it.each([
    "const 配置 = { Δείκτης: 1 };",
    "let 𐐀config = { Δείκτης: 1 };",
    "图表.配置 = { Δείκτης: 1 };",
    "export default { Δείκτης: 1 };"
  ])('accepts Unicode names in the supported assignment prefix: %s', (source) => {
    expect(parseConfigObjectLiteral(source)).toEqual({ Δείκτης: 1 });
  });

  it('serializes Unicode identifiers unquoted and round trips keys requiring quotes', () => {
    const config = {
      数据: [{ القيمة: 12, '𐐀metric': '🧑🏽‍💻' }],
      'café': true,
      'a‌b': 1,
      'a‍b': 2,
      'bad-key': 3,
      '1leading': 4,
      '👨‍👩‍👧‍👦': 5,
      '\u0301leading': 6,
      'with space': 7
    };
    const serialized = formatConfigAsJsObject(config);
    expect(serialized).toContain('数据:');
    expect(serialized).toContain('القيمة:');
    expect(serialized).toContain('𐐀metric:');
    expect(serialized).toContain('café:');
    expect(serialized).toContain("'bad-key':");
    expect(serialized).toContain("'1leading':");
    expect(serialized).toContain("'👨‍👩‍👧‍👦':");
    expect(parseConfigObjectLiteral(serialized)).toEqual(config);
    expect(parseConfigObjectLiteral(formatConfigAssignment(config))).toEqual(config);
  });

  it.each([
    '{ 1leading: 1 }',
    '{ bad-key: 1 }',
    '{ \u0301leading: 1 }',
    '{ \u200cleading: 1 }',
    '{ \u200dleading: 1 }',
    '{ 😀: 1 }',
    '{ a\u202eb: 1 }',
    '{ 数据: (() => 1)() }',
    '{ 数据: globalThis }',
    '{ [数据]: 1 }',
    '{ ...数据 }',
    '{ 数据() {} }',
    '{ get 数据() {} }'
  ])('rejects invalid identifiers and executable syntax: %s', (source) => {
    expect(() => parseConfigObjectLiteral(source)).toThrow(SyntaxError);
  });

  it('retains prototype-pollution guards for Unicode objects and quoted escaped keys', () => {
    const parsed = parseConfigObjectLiteral(
      "{ 数据: { __proto__: { polluted: true }, constructor: 1, prototype: 2, 正常: 3 }, '\\u005f\\u005fproto__': { polluted: true }, constructor: 4, prototype: 5 }"
    );
    expect(parsed).toEqual({ 数据: { 正常: 3 } });
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(parsed.数据)).toBe(Object.prototype);
    expect(Object.prototype).not.toHaveProperty('polluted');
    const unsafeInput = JSON.parse(
      '{"数据":{"__proto__":{"polluted":true},"constructor":1,"prototype":2,"正常":3},"__proto__":{"polluted":true}}'
    );
    expect(parseConfigObjectLiteral(formatConfigAsJsObject(unsafeInput))).toEqual({
      数据: { 正常: 3 }
    });
  });

  it('preserves source offsets when non-ASCII uppercase text precedes a chart tag', () => {
    const attributes = extractTagAttributes(
      'İİİİİİİİİİ<MC-BAR-CHART chart-title="İstanbul 数据" aria-label="القيمة" auto-size="false"></MC-BAR-CHART>',
      'mc-bar-chart'
    );
    expect(attributes).toEqual({
      'chart-title': 'İstanbul 数据',
      'aria-label': 'القيمة',
      'auto-size': 'false'
    });
  });
});
