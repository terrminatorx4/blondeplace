import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static",

  build: {
    concurrency: 4,
    assets: "_astro",
    inlineStylesheets: "never" // ✅ ФИКСИРОВАННОЕ для экономии памяти
  },

  trailingSlash: "ignore",

  vite: {
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      
      rollupOptions: {
        output: {
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
                return `posts-${Math.abs(hash) % 20}`;
              }
            }
            return "main";
          }
        }
      },
      
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 1024 // ✅ УЛУЧШЕНО: 1KB для мелких файлов
    }
    // ✅ УБРАН лишний optimizeDeps блок
  }
});
