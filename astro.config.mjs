import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// МАКСИМАЛЬНО ПРОСТАЯ КОНФИГУРАЦИЯ ДЛЯ ЭКОНОМИИ ПАМЯТИ
// ПУСТЬ МЕДЛЕННО, НО СТАБИЛЬНО
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // Используем встроенный sitemap вместо postbuild.js
  integrations: [
    sitemap()
  ],
  
  // КРИТИЧЕСКИЕ НАСТРОЙКИ ДЛЯ ПАМЯТИ
  build: {
    concurrency: 1, // ТОЛЬКО ПОСЛЕДОВАТЕЛЬНАЯ СБОРКА
    inlineStylesheets: 'never', // НЕ ИНЛАЙНИМ СТИЛИ
    assets: '_astro'
  },
  
  trailingSlash: 'ignore',
  
  // МИНИМАЛЬНЫЕ НАСТРОЙКИ VITE
  vite: {
    build: {
      sourcemap: false, // ОТКЛЮЧАЕМ SOURCEMAPS
      minify: false, // ОТКЛЮЧАЕМ МИНИФИКАЦИЮ (экономия CPU)
      cssMinify: false, // ОТКЛЮЧАЕМ CSS МИНИФИКАЦИЮ
      
      rollupOptions: {
        output: {
          // ПРОСТЕЙШЕЕ РАЗБИЕНИЕ НА ЧАНКИ - БЕЗ ФУНКЦИЙ!
          manualChunks: {
            'vendor': ['astro'],
            'sitemap': ['@astrojs/sitemap']
          }
        }
      },
      
      chunkSizeWarningLimit: 5000, // БОЛЬШИЕ ЧАНКИ ДОПУСТИМЫ
      assetsInlineLimit: 0 // НЕ ИНЛАЙНИМ АССЕТЫ СОВСЕМ
    },
    
    // ОТКЛЮЧАЕМ ОПТИМИЗАЦИЮ ЗАВИСИМОСТЕЙ
    optimizeDeps: {
      disabled: true
    }
  }
});
