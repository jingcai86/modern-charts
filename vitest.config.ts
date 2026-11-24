import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const rootDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      'modern-charts': resolve(rootDir, 'src/index.ts')
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      include: ['src/**/*.ts']
    }
  }
});
