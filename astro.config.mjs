import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ОПТИМИЗАЦИЯ ДЛЯ БОЛЬШОГО КОЛИЧЕСТВА СТАТЕЙ (2500+)
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // Integrations
  integrations: [
    sitemap()
  ],
  
  // КРИТИЧЕСКИЕ НАСТРОЙКИ ДЛЯ ПАМЯТИ И ПРОИЗВОДИТЕЛЬНОСТИ
  build: {
    inlineStylesheets: 'never', // Предотвращаем проблемы с CSS в head
    assets: '_astro' // Оптимизация путей к ассетам
  },
  
  // Настройки для корректной обработки путей и метатегов
  trailingSlash: 'ignore',
  
  // КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ VITE ДЛЯ ПАМЯТИ
  vite: {
    build: {
      sourcemap: false,
      minify: 'esbuild', // Быстрая минификация
      rollupOptions: {
        output: {
          // Разбиваем на чанки для экономии памяти
          manualChunks: {
            'vendor': ['astro']
          }
        }
      }
    },
    // Оптимизация для больших проектов
    optimizeDeps: {
      force: true
    }
  }
}); 