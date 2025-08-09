import { defineConfig } from 'astro/config';

// УЛЬТРА-МИНИМАЛИСТИЧНАЯ КОНФИГУРАЦИЯ ДЛЯ 5000+ СТАТЕЙ
// МАКСИМАЛЬНАЯ ЭКОНОМИЯ CPU И ПАМЯТИ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // КРИТИЧЕСКИЕ НАСТРОЙКИ ДЛЯ БОЛЬШИХ ПРОЕКТОВ
  build: {
    concurrency: 1, // СТРОГО ПОСЛЕДОВАТЕЛЬНАЯ СБОРКА
    inlineStylesheets: 'never', // НИКОГДА НЕ ИНЛАЙНИМ
    assets: '_astro'
  },
  
  trailingSlash: 'ignore',
  
  // МИНИМАЛЬНЫЕ НАСТРОЙКИ VITE - БЕЗ ОПТИМИЗАЦИЙ
  vite: {
    build: {
      // ОТКЛЮЧАЕМ ВСЕ ОПТИМИЗАЦИИ
      sourcemap: false,
      minify: false, // НЕТ МИНИФИКАЦИИ
      cssMinify: false, // НЕТ CSS МИНИФИКАЦИИ
      
      // БАЗОВЫЕ НАСТРОЙКИ ROLLUP
      rollupOptions: {
        // ОТКЛЮЧАЕМ TREE-SHAKING ДЛЯ ЭКОНОМИИ CPU
        treeshake: false,
        
        output: {
          // ОДИН БОЛЬШОЙ ЧАНК ДЛЯ ВСЕГО - ЭКОНОМИЯ ПАМЯТИ
          manualChunks: undefined,
          
          // ПРОСТЫЕ ИМЕНА ФАЙЛОВ
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      
      // БОЛЬШИЕ ЛИМИТЫ ЧТОБЫ НЕ БЕСПОКОИТЬСЯ
      chunkSizeWarningLimit: 10000,
      assetsInlineLimit: 0, // НИКОГДА НЕ ИНЛАЙНИМ АССЕТЫ
      
      // ОТКЛЮЧАЕМ ВСЕ ОПТИМИЗАЦИИ
      reportCompressedSize: false,
      cssCodeSplit: false
    },
    
    // ОТКЛЮЧАЕМ ОПТИМИЗАЦИЮ ЗАВИСИМОСТЕЙ (НОВЫЙ СИНТАКСИС)
    optimizeDeps: {
      noDiscovery: true,
      include: []
    },
    
    // ОТКЛЮЧАЕМ ПРЕПРОЦЕССИНГ
    esbuild: false,
    
    // МИНИМАЛЬНАЯ КОНФИГУРАЦИЯ СЕРВЕРА
    server: {
      fs: {
        strict: false
      }
    }
  }
});
