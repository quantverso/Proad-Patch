import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { userscriptHeader } from './src/userscript-header';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['iife'],
      name: 'TRT14Proad',
      fileName: () => 'trt14-proad.patch.js',
    },

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        banner: userscriptHeader,
      },
    },

    minify: false,
  },
});
