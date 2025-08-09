import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// УЛЬТРА-МИНИМАЛЬНАЯ КОНФИГУРАЦИЯ ДЛЯ МАКСИМАЛЬНОЙ СТАБИЛЬНОСТИ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // Включаем только sitemap
  integrations: [
    sitemap()
  ],
  
  // МИНИМАЛЬНЫЕ НАСТРОЙКИ BUILD
  build: {
    // НЕ ИСПОЛЬЗУЕМ concurrency - пусть Astro сам решает
    assets: '_astro',
    inlineStylesheets: 'never' // Всегда внешние CSS для экономии памяти
  },
  
  trailingSlash: 'ignore',
  
  // УЛЬТРА-ПРОСТЫЕ НАСТРОЙКИ VITE
  vite: {
    build: {
      // ОТКЛЮЧАЕМ ВСЁ ЛИШНЕЕ
      sourcemap: false,           // Никаких sourcemaps
      minify: false,              // Никакой минификации
      cssMinify: false,           // Никакой CSS минификации
      
      rollupOptions: {
        output: {
          // ПРОСТЕЙШАЯ СХЕМА ЧАНКОВ - НИКАКИХ ФУНКЦИЙ!
          manualChunks: {
            'vendor': ['astro'],
            'sitemap': ['@astrojs/sitemap']
          }
        }
      },
      
      chunkSizeWarningLimit: 5000,    // Большие чанки разрешены
      assetsInlineLimit: 0,           // НИКАКИХ inline ассетов
      
      // ОТКЛЮЧАЕМ ОПТИМИЗАЦИИ
      target: 'es2018',               // Простой target
      cssCodeSplit: false,            // Один CSS файл
      emptyOutDir: true,              // Очищаем перед сборкой
      
      // МИНИМАЛЬНЫЕ НАСТРОЙКИ ROLLUP
      rollupOptions: {
        output: {
          manualChunks: undefined,    // Пусть Rollup сам решает
          compact: false,             // Не сжимаем код
          generatedCode: 'es5'        // Простой код
        }
      }
    },
    
    // ОТКЛЮЧАЕМ ОПТИМИЗАЦИЮ DEPS
    optimizeDeps: {
      disabled: true                  // Никакой pre-bundling
    },
    
    // ПРОСТЫЕ НАСТРОЙКИ СЕРВЕРА
    server: {
      fs: {
        strict: false                 // Менее строгие проверки
      }
    }
  }
});
