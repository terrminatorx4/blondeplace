import { defineConfig } from 'astro/config';

// ЭКСТРЕМАЛЬНО МИНИМАЛИСТИЧНАЯ КОНФИГУРАЦИЯ
// ТОЛЬКО САМЫЕ БАЗОВЫЕ НАСТРОЙКИ ДЛЯ ЭКОНОМИИ ПАМЯТИ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  
  // ЭКСТРЕМАЛЬНО КОНСЕРВАТИВНЫЕ НАСТРОЙКИ
  build: {
    concurrency: 1, // СТРОГО ПОСЛЕДОВАТЕЛЬНО
    inlineStylesheets: 'never',
    assets: '_astro',
    // ОТКЛЮЧАЕМ ФОРМАТИРОВАНИЕ
    format: 'file'
  },
  
  trailingSlash: 'ignore',
  
  // МИНИМУМ VITE - ОТКЛЮЧАЕМ ВСЁ
  vite: {
    // ОТКЛЮЧАЕМ ОПТИМИЗАЦИЮ ЗАВИСИМОСТЕЙ ПОЛНОСТЬЮ
    optimizeDeps: {
      disabled: 'build' // Отключаем только для билда
    },
    
    build: {
      sourcemap: false,
      minify: false, // БЕЗ МИНИФИКАЦИИ
      cssMinify: false,
      
      // ОТКЛЮЧАЕМ ВСЕ ОПТИМИЗАЦИИ
      target: 'es2015', // Старый стандарт
      reportCompressedSize: false,
      cssCodeSplit: false,
      
      rollupOptions: {
        // ОТКЛЮЧАЕМ ВСЕ ОПТИМИЗАЦИИ ROLLUP
        treeshake: false,
        
        output: {
          // НИКАКОГО ЧАНКИНГА - ОДИН ФАЙЛ
          manualChunks: undefined,
          inlineDynamicImports: true,
          
          // ПРОСТЫЕ ИМЕНА
          entryFileNames: 'main.js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]'
        }
      },
      
      chunkSizeWarningLimit: 50000, // Огромный лимит
      assetsInlineLimit: 0 // НИЧЕГО НЕ ИНЛАЙНИМ
    },
    
    // ОТКЛЮЧАЕМ СЕРВЕР НАСТРОЙКИ
    server: {
      fs: { strict: false }
    }
  }
});
