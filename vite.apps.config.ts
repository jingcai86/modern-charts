import { parse, type CallExpression, type Node } from 'acorn';
import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';

function collectGuideCallbackCalls(node: Node, calls: CallExpression[]): void {
  if (node.type === 'CallExpression') {
    const call = node as CallExpression;
    if (call.callee.type === 'Identifier' && call.callee.name === 'guideCallback') {
      calls.push(call);
    }
  }
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof child.type === 'string') {
        collectGuideCallbackCalls(child, calls);
      }
    }
  }
}

function captureGuideCallbackSource(): Plugin {
  return {
    name: 'studio-guide-callback-source',
    enforce: 'post',
    transform(code, id) {
      if (!/\/apps\/studio\/guides\/[^/?]+\.ts$/.test(id) || !code.includes('guideCallback(')) return;
      // Capture the JavaScript after Vite strips the types, before production minification.
      const calls: CallExpression[] = [];
      collectGuideCallbackCalls(parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        preserveParens: true
      }), calls);
      const inserts = [];
      for (const call of calls) {
        const [firstArgument, lastArgument = firstArgument] = call.arguments;
        if (call.arguments.length > 2) continue;
        let callback = firstArgument;
        while (callback?.type === 'ParenthesizedExpression') callback = callback.expression;
        if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression') continue;
        inserts.push({
          position: lastArgument.end,
          source: JSON.stringify(code.slice(callback.start, callback.end)),
          hasBindings: call.arguments.length === 2
        });
      }
      if (inserts.length === 0) return;
      let output = code;
      for (const { position, source, hasBindings } of inserts.sort((a, b) => b.position - a.position)) {
        const metadata = hasBindings ? `, ${source}` : `, undefined, ${source}`;
        output = output.slice(0, position) + metadata + output.slice(position);
      }
      return { code: output, map: null };
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [captureGuideCallbackSource()],
  root: resolve(import.meta.dirname, 'apps/studio'),
  publicDir: resolve(import.meta.dirname, 'apps/context'),
  resolve: {
    alias: {
      'modern-charts': resolve(import.meta.dirname, 'src/index.ts')
    }
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-examples'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
