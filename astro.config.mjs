import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  
  // 🚀 МАКСИМАЛЬНАЯ ПРОИЗВОДИТЕЛЬНОСТЬ
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
    splitting: true,
    assets: '_astro'
  },
  
  // ⚡ VITE TURBO OPTIMIZATION 
  vite: {
    build: {
      minify: 'terser',
      cssMinify: 'lightningcss',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Разделяем vendor код для кеширования
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'chunks/[name].[hash].js'
        },
      },
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    ssr: {
      noExternal: ['@astrojs/netlify']
    }
  },
  
  // 📱 PWA OPTIMIZATION
  compressHTML: true,
  
  // 🎯 SEO SITEMAP
  site: 'https://blondeplace.netlify.app',
  
  // ⚡ EXPERIMENTAL PERFORMANCE
  experimental: {
    assets: true
  }
});