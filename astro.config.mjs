import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// МИНИМАЛЬНАЯ КОНФИГУРАЦИЯ - БЕЗ КОНФЛИКТОВ С HOISTED SCRIPTS
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // Только базовые integrations
  integrations: [
    sitemap()
  ]
});
