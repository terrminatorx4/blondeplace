import { defineConfig } from "astro/config";

// 🎯 ОПТИМИЗИРОВАННАЯ КОНФИГУРАЦИЯ ДЛЯ 4457 СТАТЕЙ
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static",

  // ⚡ КРИТИЧНО: Настройки для memory optimization
  build: {
    concurrency: 4, // Параллельная обработка для ускорения
    assets: "_astro",
    inlineStylesheets: "auto" // Автоматическое встраивание стилей
  },

  trailingSlash: "ignore",

  // 🚀 ОПТИМИЗАЦИЯ VITE ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ И ПАМЯТИ
  vite: {
    build: {
      sourcemap: false, // Отключаем sourcemaps для экономии памяти
      minify: 'esbuild', // ✅ ПРИНУДИТЕЛЬНАЯ МИНИФИКАЦИЯ JS
      cssMinify: 'esbuild', // ✅ ОБЯЗАТЕЛЬНАЯ МИНИФИКАЦИЯ CSS
      
      rollupOptions: {
        output: {
          // 🎯 ОПТИМАЛЬНОЕ РАЗБИЕНИЕ НА ЧАНКИ
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            if (id.includes("src/content/posts")) {
              // Разбиваем на 20 оптимальных чанков вместо 100
              const match = id.match(/posts\/(.+)\.md/);
              if (match) {
                const postName = match[1];
                const hash = postName.split("").reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `posts-${Math.abs(hash) % 20}`; // 20 оптимальных чанков
              }
            }
            return "main";
          }
        }
      },
      
      chunkSizeWarningLimit: 2000, // Увеличенный лимит для больших чанков
      assetsInlineLimit: 0, // Отключаем инлайн ассетов для экономии памяти
    },

    // 🔧 МИНИМАЛЬНАЯ ОПТИМИЗАЦИЯ DEPS
    optimizeDeps: {
      include: ['astro/runtime/server/index.js']
    }
  }
});
