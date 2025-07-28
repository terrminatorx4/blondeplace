import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  adapter: netlify(),
  
  integrations: [
    sitemap({
      // Включаем все beauty страницы
      filter: (page) => !page.includes('/admin') && !page.includes('/private'),
      customPages: [
        'https://blondeplace.netlify.app/',
        'https://blondeplace.netlify.app/blog/',
      ],
      // Генерируем sitemap для всех статей блога
      serialize(item) {
        // Приоритет для beauty контента
        if (item.url.includes('/blog/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else {
          item.priority = 0.9;
          item.changefreq = 'monthly';
        }
        return item;
      }
    })
  ],

  // Experimental features для больших beauty блогов
  experimental: {
    // Кеширование контент-коллекций для быстрой пересборки
    contentCollectionCache: true,
  },

  // Оптимизация для beauty контента
  vite: {
    build: {
      // Увеличиваем лимит для больших beauty блогов
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Группируем beauty ресурсы
          manualChunks: {
            'beauty-vendor': ['astro', '@astrojs/netlify'],
            'beauty-content': ['astro:content']
          }
        }
      }
    },
    ssr: {
      // Внешние зависимости для SSR (beauty специфичные)
      external: ['gray-matter', 'markdown-it']
    }
  },

  // Markdown настройки для beauty контента
  markdown: {
    // Подсветка синтаксиса для beauty гайдов
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    },
    // Обработка beauty-специфичной разметки
    remarkPlugins: [],
    rehypePlugins: []
  },

  // Beauty-специфичные настройки
  compilerOptions: {
    // Улучшенная обработка JSX для beauty компонентов
    jsx: 'automatic'
  }
});
