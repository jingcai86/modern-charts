import variant from '@jitl/quickjs-singlefile-browser-release-sync';
import { parseExpressionAt } from 'acorn';
import { newQuickJSWASMModuleFromVariant, type QuickJSWASMModule } from 'quickjs-emscripten-core';
import { applyCallbackOutput, prepareCallbackInvocation } from './callback-capabilities';
import type { GuideCallbackCompiler } from './callback-config';
import { GUEST_SOURCE } from './callback-guest';

const MAX_SOURCE_LENGTH = 24_000;
const MAX_MESSAGE_LENGTH = 200_000;
const MAX_HOST_CALLS = 300;
const MAX_INTERRUPT_CHECKS = 2_000;
const TIME_LIMIT_MS = 100;
const MEMORY_LIMIT_BYTES = 8 * 1024 * 1024;
const STACK_LIMIT_BYTES = 512 * 1024;

type PreparedInvocation = ReturnType<typeof prepareCallbackInvocation>;
type ReplayEvent = { index: number; data: Record<string, unknown> };

function encodeMessage(value: unknown): string {
  const json = JSON.stringify(value) ?? 'null';
  if (json.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Guide callback data exceeded the preview size limit.');
  }
  return json;
}

function readMessage(json: string): unknown {
  if (json.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Guide callback data exceeded the preview size limit.');
  }
  return JSON.parse(json);
}

function createFactory(source: string, bindings: Record<string, unknown>): string {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new SyntaxError('Guide callback source exceeded the preview size limit.');
  }
  const expression = `(${source}\n)`;
  const parsed = parseExpressionAt(expression, 0, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    preserveParens: true
  });
  let callback = parsed;
  while (callback.type === 'ParenthesizedExpression') callback = callback.expression;
  if (
    parsed.end !== expression.length ||
    (callback.type !== 'FunctionExpression' && callback.type !== 'ArrowFunctionExpression') ||
    callback.async || (callback.type === 'FunctionExpression' && callback.generator)
  ) {
    throw new SyntaxError('Use one synchronous function or arrow callback.');
  }

  const names = Object.keys(bindings);
  if (names.some(name => !/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name))) {
    throw new SyntaxError('Guide callback binding names must be JavaScript identifiers.');
  }
  const declaration = names.length ? `const { ${names.join(', ')} } = bindings;` : '';
  return `(document, bindings) => { ${declaration} return ${expression}; }`;
}

function execute(
  module: QuickJSWASMModule,
  factory: string,
  prepared: PreparedInvocation,
  event?: ReplayEvent
): unknown {
  const input = encodeMessage(event ? { ...prepared.input, event } : prepared.input);
  const runtime = module.newRuntime();
  try {
    runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
    runtime.setMaxStackSize(STACK_LIMIT_BYTES);
    const deadline = performance.now() + TIME_LIMIT_MS;
    let interruptChecks = 0;
    let hostCalls = 0;
    runtime.setInterruptHandler(() =>
      ++interruptChecks > MAX_INTERRUPT_CHECKS || performance.now() > deadline
    );

    const context = runtime.newContext();
    try {
      const bridge = context.newFunction('__host', (operation, argumentsJson) => {
        if (++hostCalls > MAX_HOST_CALLS || performance.now() > deadline) {
          throw new Error('Guide callback exceeded the preview work limit.');
        }
        if (
          !operation || !argumentsJson ||
          context.typeof(operation) !== 'string' || context.typeof(argumentsJson) !== 'string'
        ) {
          throw new TypeError('Guide callback operations require JSON arguments.');
        }
        const name = context.getString(operation);
        const args = readMessage(context.getString(argumentsJson));
        if (!Array.isArray(args)) {
          throw new TypeError('Guide callback operations require an arguments array.');
        }
        return context.newString(encodeMessage(prepared.invoke(name, args)));
      });
      try {
        context.setProp(context.global, '__host', bridge);
      } finally {
        bridge.dispose();
      }

      const result = context.unwrapResult(context.evalCode(
        `${GUEST_SOURCE}\nrunPreviewCallback(${JSON.stringify(input)}, ${factory});`,
        'studio-guide-callback.js'
      ));
      try {
        if (context.typeof(result) !== 'string') {
          throw new Error('Guide callback did not return a serializable preview.');
        }
        return readMessage(context.getString(result));
      } finally {
        result.dispose();
      }
    } finally {
      context.dispose();
    }
  } finally {
    runtime.dispose();
  }
}

function createCompiler(module: QuickJSWASMModule): GuideCallbackCompiler {
  return (source, bindings, path = [], onError) => {
    const factory = createFactory(source, bindings?.() ?? {});
    return (...args) => {
      const prepared = prepareCallbackInvocation(args, bindings?.() ?? {}, path);
      let replayFailed = false;
      const replay = (event: ReplayEvent) => {
        if (replayFailed) return;
        try {
          const output = execute(module, factory, prepared, event);
          if (!output || typeof output !== 'object' || !('actions' in output)) {
            throw new Error('Guide callback did not return preview actions.');
          }
          applyCallbackOutput(prepared, { actions: output.actions }, path, replay);
        } catch (error) {
          replayFailed = true;
          onError?.(error);
        }
      };
      return applyCallbackOutput(prepared, execute(module, factory, prepared), path, replay);
    };
  };
}

let compiler: Promise<GuideCallbackCompiler> | undefined;

export function loadGuideCallbackCompiler(): Promise<GuideCallbackCompiler> {
  compiler ??= newQuickJSWASMModuleFromVariant(variant).then(createCompiler).catch(error => {
    compiler = undefined;
    throw error;
  });
  return compiler;
}
