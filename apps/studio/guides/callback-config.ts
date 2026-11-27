import { parseExpressionAt, type Expression, type Pattern } from 'acorn';
import { formatConfigAssignment, parseConfigObjectLiteral } from '../utils/code-sync';
import {
  getGuideCallbackBindings,
  getGuideCallbackSource,
  rememberGuideCallbackSource
} from './callback-source';

interface GuideCallbackOptions {
  layerRegistry?: Record<string, any>;
  compileCallback?: GuideCallbackCompiler;
  onCallbackError?: (error: unknown) => void;
}

export type GuideCallbackCompiler = (
  source: string,
  bindings?: () => Record<string, unknown>,
  path?: readonly string[],
  onError?: (error: unknown) => void
) => (...args: unknown[]) => unknown;

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

export function parseGuideConfig(
  source: string,
  previousConfig: Record<string, any>,
  options: GuideCallbackOptions = {}
): { config: Record<string, any>; hasPendingCallbacks: boolean } {
  const { layerRegistry, compileCallback, onCallbackError } = options;
  const parsed = parseConfigObjectLiteral(source, readCallbacks);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed instanceof CallbackExpression) {
    throw new SyntaxError('Config must be a JavaScript object ({ ... }).');
  }

  let hasPendingCallbacks = false;

  const registeredLayer = (name: unknown) =>
    typeof name === 'string' && layerRegistry && Object.hasOwn(layerRegistry, name)
      ? layerRegistry[name]
      : undefined;

  const restore = (value: any, prior: any, path: string[]): any => {
    if (value instanceof CallbackExpression) {
      const previous = typeof prior === 'function' ? prior : undefined;
      if (previous && getGuideCallbackSource(previous) === value.source) return previous;
      if (!compileCallback) {
        hasPendingCallbacks = true;
        return previous;
      }
      const bindings = previous && getGuideCallbackBindings(previous);
      const run = compileCallback(value.source, bindings, path, onCallbackError);
      const callback = function (this: unknown, ...args: unknown[]): unknown {
        try {
          return run(...args);
        } catch (error) {
          if (!onCallbackError) throw error;
          onCallbackError(error);
          return previous?.apply(this, args);
        }
      };
      rememberGuideCallbackSource(callback, value.source, bindings);
      return callback;
    }
    if (value === '[Function]' && typeof prior === 'function') return prior;
    if (Array.isArray(value)) {
      const priorItems: any[] = Array.isArray(prior) ? prior : [];
      const namedItems = new Map(priorItems
        .filter(item => item && typeof item.name === 'string')
        .map(item => [item.name, item]));
      return value.map((item, i) => {
        const priorItem = namedItems.get(item?.name) ?? registeredLayer(item?.name) ?? priorItems[i];
        return registeredLayer(item) ?? restore(item, priorItem, [...path, String(i)]);
      });
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        restore(item, prior && Object.hasOwn(prior, key) ? prior[key] : undefined, [...path, key])
      ]));
    }
    return value;
  };

  const config = restore(parsed, previousConfig, []);
  return { config, hasPendingCallbacks };
}
