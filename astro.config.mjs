import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  // adapter убран - для static output не нужен!
  
  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ для hoisted scripts
  build: {
    inlineStylesheets: 'never', // Исправляет проблему с hoisted scripts
    assets: 'assets'
  },
  
  integrations: [
    sitemap({
      // Фильтруем страницы для sitemap (только beauty контент)
      filter: (page) => !page.includes('/admin') && !page.includes('/private'),
      customPages: [
        'https://blondeplace.netlify.app/blog/hair-care',
        'https://blondeplace.netlify.app/blog/hair-coloring',
        'https://blondeplace.netlify.app/blog/nail-care',
        'https://blondeplace.netlify.app/blog/beauty-tips'
      ]
    })
  ],

  // Experimental features для больших beauty блогов
  experimental: {
    // Кеширование контент-коллекций для быстрой пересборки
    contentCollectionCache: true,
  },

  // Упрощенная конфигурация Vite (убираем конфликты с hoisted scripts)
  vite: {
    build: {
      // Отключаем sourcemaps в продакшене для экономии памяти
      sourcemap: false,
      // Увеличиваем лимит для больших чанков (beauty блоги объемные)
      chunkSizeWarningLimit: 2000,
      // Минификация только в продакшене
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      // Оптимизация ассетов для beauty блога
      assetsInlineLimit: 0, // Отключаем инлайн ассетов для экономии памяти
    },
    // Настройки для SSG режима
    ssr: {
      // Оптимизация для статической генерации beauty контента
      noExternal: ['@astrojs/*']
    },
    // Увеличиваем лимиты для обработки большого количества beauty статей
    server: {
      fs: {
        // Позволяем читать файлы из проекта
        allow: ['..']
      }
    }
  },

  // Markdown настройки для beauty контента
  markdown: {
    shikiConfig: {
      // Темы для подсветки кода (если в beauty статьях будет код)
      theme: 'github-light',
      wrap: true
    },
    remarkPlugins: [],
    rehypePlugins: []
  },

  // Настройки изображений для beauty контента
  image: {
    // Для beauty блога важны качественные изображения
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});
