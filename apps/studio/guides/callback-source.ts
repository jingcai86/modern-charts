import { parseExpressionAt } from 'acorn';

type CallbackBindings = () => Record<string, unknown>;

const callbacks = new WeakMap<Function, { source: string; bindings?: CallbackBindings }>();

export function rememberGuideCallbackSource(
  callback: Function,
  source: string,
  bindings?: CallbackBindings
): void {
  callbacks.set(callback, { source, bindings });
}

function readExpression(source: string) {
  try {
    return parseExpressionAt(source, 0, { ecmaVersion: 'latest' });
  } catch {
    return undefined;
  }
}

export function getGuideCallbackSource(callback: Function): string {
  const known = callbacks.get(callback);
  if (known) return known.source;

  const source = Function.prototype.toString.call(callback);
  const expression = readExpression(source);
  if (expression?.type === 'FunctionExpression' || expression?.type === 'ArrowFunctionExpression') {
    return source;
  }

  // Shorthand methods need a function expression after the config property name.
  const memberSource = `{${source}}`;
  const object = readExpression(memberSource);
  if (object?.type !== 'ObjectExpression') return source;
  const [member] = object.properties;
  if (member?.type !== 'Property' || member.value.type !== 'FunctionExpression') return source;

  const method = member.value;
  const prefix = `${method.async ? 'async ' : ''}function${method.generator ? '*' : ''}`;
  return prefix + memberSource.slice(method.start, method.end);
}

export function getGuideCallbackBindings(callback: Function): CallbackBindings | undefined {
  return callbacks.get(callback)?.bindings;
}

/** Keep an inline guide callback's readable source and optional preview bindings. */
export function guideCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  bindings?: CallbackBindings,
  source = getGuideCallbackSource(callback)
): T {
  rememberGuideCallbackSource(callback, source, bindings);
  return callback;
}
