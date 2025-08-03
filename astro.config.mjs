import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// МИНИМАЛЬНОЕ ИСПРАВЛЕНИЕ - ТОЛЬКО ДЛЯ МЕТАТЕГОВ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // Integrations
  integrations: [
    sitemap()
  ],
  
  // ДОБАВЛЯЕМ КРИТИЧЕСКИЕ НАСТРОЙКИ ДЛЯ HTML HEAD
  build: {
    inlineStylesheets: 'never' // Предотвращаем проблемы с CSS в head
  },
  
  // Настройки для корректной обработки путей и метатегов
  trailingSlash: 'ignore',
  
  // Базовые vite настройки БЕЗ rollupOptions (которые вызывали проблемы)
  vite: {
    build: {
      sourcemap: false
    }
  }
}); 