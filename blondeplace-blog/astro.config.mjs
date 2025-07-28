import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// Butler-style Astro config - ПРОСТОЙ И НАДЕЖНЫЙ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  adapter: netlify(),
  
  // БЕЗ СЛОЖНЫХ ИНТЕГРАЦИЙ - как в Butler
  integrations: [],

  // Простые настройки как в Butler
  build: {
    format: 'directory'
  }
});
