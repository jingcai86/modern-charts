type CallbackBindings = () => Record<string, unknown>;

const callbacks = new WeakMap<Function, { source: string; bindings?: CallbackBindings }>();

export function rememberGuideCallbackSource(
  callback: Function,
  source: string,
  bindings?: CallbackBindings
): void {
  callbacks.set(callback, { source, bindings });
}

export function getGuideCallbackSource(callback: Function): string {
  const known = callbacks.get(callback);
  if (known) return known.source;
  const source = Function.prototype.toString.call(callback);
  const method = /^(async\s+)?(\*?)\s*[$_\p{ID_Start}][$_\p{ID_Continue}]*\s*\(/u.exec(source);
  if (method && !/^(?:(?:async\s+)?function\b|async\s*\()/.test(source)) {
    const modifier = method[1] ?? '';
    return `${modifier}function${method[2]} ${source.slice(modifier.length + method[2].length).trimStart()}`;
  }
  return source;
}

export function getGuideCallbackBindings(callback: Function): CallbackBindings | undefined {
  return callbacks.get(callback)?.bindings;
}

/** Keep an inline guide callback's readable source and optional preview bindings. */
export function guideCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  bindings?: CallbackBindings,
  source = Function.prototype.toString.call(callback)
): T {
  rememberGuideCallbackSource(callback, source, bindings);
  return callback;
}
