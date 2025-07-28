import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  
  // 🔥 PRODUCTION OPTIMIZATIONS
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  
  // ⚡ VITE OPTIMIZATION 
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
    ssr: {
      noExternal: ['@astrojs/netlify']
    }
  },
  
  // 📱 PWA OPTIMIZATION
  compressHTML: true,
  
  // 🎯 SEO SITEMAP
  site: 'https://blondeplace.netlify.app',
});