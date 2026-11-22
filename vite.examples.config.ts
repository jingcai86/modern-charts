import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  root: resolve(__dirname, 'examples'),
  resolve: {
    alias: {
      'modern-charts': resolve(__dirname, 'src/index.ts')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist-examples'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
