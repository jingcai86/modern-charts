import { parseExpressionAt, type Expression, type Pattern } from 'acorn';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../utils/code-sync';
import {
  getGuideCallbackBindings,
  getGuideCallbackSource,
  rememberGuideCallbackSource
} from './callback-source';

interface GuideCallbackOptions {
  layerRegistry?: Record<string, any>;
  runCallbacks?: boolean;
}

class CallbackExpression {
  constructor(readonly source: string) {}
}

function readCallbacks(source: string, start: number) {
  const callbacks = new Map<number, { value: CallbackExpression; end: number }>();
  const expression = parseExpressionAt(source, start, { ecmaVersion: 'latest', preserveParens: true });

  const collect = (node: Expression | Pattern) => {
    let callback = node;
    while (callback.type === 'ParenthesizedExpression') callback = callback.expression;

    if (callback.type === 'FunctionExpression' || callback.type === 'ArrowFunctionExpression') {
      callbacks.set(node.start, {
        value: new CallbackExpression(source.slice(node.start, node.end)),
        end: node.end
      });
    } else if (node.type === 'ObjectExpression') {
      for (const property of node.properties) {
        if (property.type === 'Property' && !property.method) collect(property.value);
      }
    } else if (node.type === 'ArrayExpression') {
      for (const item of node.elements) {
        if (item && item.type !== 'SpreadElement') collect(item);
      }
    }
  };

  collect(expression);
  return callbacks;
}

export function findGuideConfigBlock(source: string): { literal: string; end: number } | null {
  const assignment = /\bchart\.config\s*=\s*(?=\{)/.exec(source);
  if (!assignment) return null;

  const start = assignment.index + assignment[0].length;
  const expression = parseExpressionAt(source, start, { ecmaVersion: 'latest' });
  if (expression.type !== 'ObjectExpression') return null;
  return { literal: source.slice(start, expression.end), end: expression.end };
}

export function formatGuideConfigAssignment(config: Record<string, any>, prefix?: string): string {
  return formatConfigAssignment(config, prefix, getGuideCallbackSource);
}

function compileCallback(source: string, previous?: Function): Function {
  const bindings = previous && getGuideCallbackBindings(previous);
  const names = Object.keys(bindings?.() ?? {});
  // The guide editor invokes this only when the reader runs their own callback edits.
  // Parsing restricts the input here to a function expression, so creating it runs no body code.
  const create = new Function(...names, `"use strict"; return (${source});`);

  const callback = bindings
    ? function (this: unknown, ...args: unknown[]) {
        const values = bindings();
        return Reflect.apply(create(...names.map(name => values[name])), this, args);
      }
    : create();

  rememberGuideCallbackSource(callback, source, bindings);
  return callback;
}

export function parseGuideConfig(
  source: string,
  previousConfig: Record<string, any>,
  options: GuideCallbackOptions = {}
): { config: Record<string, any>; hasPendingCallbacks: boolean } {
  const { layerRegistry, runCallbacks } = options;
  const parsed = parseConfigObjectLiteral(source, readCallbacks);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed instanceof CallbackExpression) {
    throw new SyntaxError('Config must be a JavaScript object ({ ... }).');
  }

  let hasPendingCallbacks = false;

  const registeredLayer = (name: unknown) =>
    typeof name === 'string' && layerRegistry && Object.hasOwn(layerRegistry, name)
      ? layerRegistry[name]
      : undefined;

  const restore = (value: any, prior: any): any => {
    if (value instanceof CallbackExpression) {
      if (typeof prior === 'function' && getGuideCallbackSource(prior) === value.source) return prior;
      if (runCallbacks) return compileCallback(value.source, typeof prior === 'function' ? prior : undefined);
      hasPendingCallbacks = true;
      return prior;
    }
    if (value === '[Function]' && typeof prior === 'function') return prior;
    if (Array.isArray(value)) {
      const priorItems: any[] = Array.isArray(prior) ? prior : [];
      const namedItems = new Map(priorItems
        .filter(item => item && typeof item.name === 'string')
        .map(item => [item.name, item]));
      return value.map((item, i) => {
        const priorItem = namedItems.get(item?.name) ?? registeredLayer(item?.name) ?? priorItems[i];
        return registeredLayer(item) ?? restore(item, priorItem);
      });
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        restore(item, prior && Object.hasOwn(prior, key) ? prior[key] : undefined)
      ]));
    }
    return value;
  };

  const config = restore(parsed, previousConfig);
  return { config, hasPendingCallbacks };
}
