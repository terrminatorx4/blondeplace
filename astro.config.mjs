import { defineConfig } from 'astro/config';

// ОТКАТ К СТАРОЙ РАБОЧЕЙ КОНФИГУРАЦИИ ДЛЯ 4457 СТАТЕЙ
export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',

  build: {
    concurrency: 1, // МЕДЛЕННО но стабильно для больших проектов
    assets: "_astro",
    inlineStylesheets: "never" // Для экономии памяти
  },

  trailingSlash: "ignore",

  vite: {
    build: {
      sourcemap: false, // Отключаем sourcemaps для экономии памяти
      minify: false, // ОТКЛЮЧЕНА минификация для экономии CPU/памяти
      cssMinify: false, // ОТКЛЮЧЕНА CSS минификация
      
      rollupOptions: {
        output: {
          // МНОГО МЕЛКИХ ЧАНКОВ для экономии памяти
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            if (id.includes("src/content/posts")) {
              const match = id.match(/posts\/(.+)\.md/);
              if (match) {
                const postName = match[1];
                const hash = postName.split("").reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `posts-${Math.abs(hash) % 100}`; // 100 мелких чанков
              }
            }
            return "main";
          }
        }
      },
      
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 1024
    }
  }
});
