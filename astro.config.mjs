import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  
  // 🔥 BUILT-IN MINIFICATION (instead of plugin)
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  
  // ⚡ VITE OPTIMIZATION FOR PRODUCTION
  vite: {
    build: {
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
  
  // 🎯 COMPRESSION & OPTIMIZATION
  compressHTML: true,
});