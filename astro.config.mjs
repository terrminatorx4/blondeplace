import { defineConfig } from "astro/config";

// ЬЯ Я - ТЬ СТТС СТЫ  SITEMAP
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static",
  
  // Т Т - СЬЯ Я ЯТ
  integrations: [],
  
  // ТС СТ Т MEMORY OVERFLOW
  build: {
    inlineStylesheets: "never", // икогда не инлайнить CSS
    assets: "_astro",
    concurrency: 1 // ТЬ 1 Т
  },
  
  trailingSlash: "ignore",
  
  // СТЬЯ ТЯ VITE -  Т
  vite: {
    build: {
      sourcemap: false,
      minify: false, // Т минификации
      cssMinify: false, // Т CSS минификации
      rollupOptions: {
        output: {
          // аксимальное разбиение на мелкие чанки
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            if (id.includes("src/content/posts")) {
              // азбиваем на 100 мелких чанков вместо 50
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
      chunkSizeWarningLimit: 500 // чень маленькие чанки
    },
    // инимальная оптимизация
    optimizeDeps: {
      noDiscovery: true,
      include: []
    },
    server: {
      hmr: false
    }
  }
});