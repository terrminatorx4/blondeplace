import { defineConfig } from 'astro/config';

// УПРОЩЕННАЯ КОНФИГУРАЦИЯ КАК В БАТЛЕРЕ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  
  // Производительность сервера
  output: 'static',

  vite: {
    ssr: {
      // Оптимизация для статической генерации
      noExternal: ['@astrojs/*']
    },

    // НАСТРОЙКИ ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ ПАМЯТИ (КАК В БАТЛЕРЕ)
    build: {
      // Отключаем sourcemaps в продакшене для экономии памяти
      sourcemap: false,
      // Оптимизация чанков
      rollupOptions: {
        output: {
          manualChunks: undefined,
          inlineDynamicImports: false,
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Увеличиваем лимит для больших чанков
      chunkSizeWarningLimit: 2000,
      // Минификация только в продакшене
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      // Оптимизация ассетов
      assetsInlineLimit: 0, // Отключаем инлайн ассетов для экономии памяти
    },

    // Увеличиваем лимиты для обработки файлов
    server: {
      fs: {
        // Позволяем читать файлы из проекта
        allow: ['..']
      }
    }
  }
}); 