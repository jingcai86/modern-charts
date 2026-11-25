import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  root: resolve(import.meta.dirname, 'apps/studio'),
  publicDir: resolve(import.meta.dirname, 'apps/context'),
  resolve: {
    alias: {
      'modern-charts': resolve(import.meta.dirname, 'src/index.ts')
    }
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-examples'),
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/')) return 'modern-charts';
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
