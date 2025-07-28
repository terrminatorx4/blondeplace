import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  
  // 🚀 СТАБИЛЬНАЯ ПРОИЗВОДИТЕЛЬНОСТЬ
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
    splitting: true,
    assets: '_astro'
  },
  
  // ⚡ VITE СТАБИЛЬНАЯ КОНФИГУРАЦИЯ
  vite: {
    build: {
      minify: 'esbuild',  // Возвращаемся на esbuild - стабильнее
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'chunks/[name].[hash].js'
        },
      }
    }
  },
  
  // 📱 PWA БАЗОВАЯ
  compressHTML: true,
  
  // 🎯 SEO SITEMAP
  site: 'https://blondeplace.netlify.app'
});