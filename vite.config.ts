import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        core: resolve(import.meta.dirname, 'src/entries/core.ts'),
        bar: resolve(import.meta.dirname, 'src/entries/bar.ts'),
        line: resolve(import.meta.dirname, 'src/entries/line.ts'),
        pie: resolve(import.meta.dirname, 'src/entries/pie.ts'),
        heatmap: resolve(import.meta.dirname, 'src/entries/heatmap.ts'),
        radar: resolve(import.meta.dirname, 'src/entries/radar.ts'),
        sunburst: resolve(import.meta.dirname, 'src/entries/sunburst.ts'),
        sankey: resolve(import.meta.dirname, 'src/entries/sankey.ts'),
        scatter: resolve(import.meta.dirname, 'src/entries/scatter.ts'),
        treemap: resolve(import.meta.dirname, 'src/entries/treemap.ts'),
        gauge: resolve(import.meta.dirname, 'src/entries/gauge.ts')
      },
      formats: ['es']
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['d3', '@chenglou/pretext'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      }
    }
  }
});
