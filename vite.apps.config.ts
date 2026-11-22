import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  root: resolve(import.meta.dirname, 'apps'),
  publicDir: resolve(import.meta.dirname, 'context'),
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
