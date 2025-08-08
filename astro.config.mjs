import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// СТЬЯ ТЯ Я 5000+ СТТ - Т MEMORY KILL
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static",
  
  integrations: [
    sitemap()
  ],
  
  // ТС СТ Т MEMORY OVERFLOW
  build: {
    inlineStylesheets: "never", // икогда не инлайнить CSS
    assets: "_astro",
    concurrency: 1 // ТЬ 1 Т - экономия памяти
  },
  
  // СТЬЯ Я ЯТ
  trailingSlash: "ignore",
  
  // СЬЯ ТЯ VITE Т KILL (VITE 5.1 compatible)
  vite: {
    build: {
      sourcemap: false,
      minify: false, // тключаем минификацию - экономия памяти
      rollupOptions: {
        output: {
          // аксимальное разбиение на чанки
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            if (id.includes("src/content/posts")) {
              // азбиваем посты на группы по 100
              const match = id.match(/posts\/(.+)\.md/);
              if (match) {
                const postName = match[1];
                const hash = postName.split("").reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                return `posts-${Math.abs(hash) % 50}`; // 50 чанков
              }
            }
            return "main";
          }
        }
      },
      chunkSizeWarningLimit: 2000 // величиваем лимит чанков
    },
    // VITE 5.1+ compatible настройки
    optimizeDeps: {
      noDiscovery: true, // тключаем автообнаружение зависимостей
      include: [] // устой список для минимизации предбандлинга
    },
    // граничиваем память для процессов
    server: {
      hmr: false
    }
  }
});