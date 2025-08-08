import { defineConfig } from "astro/config";

// ЬТ-ЬЯ Я -  CONTENT COLLECTIONS
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static",
  
  // Т Т
  integrations: [],
  
  // Т CONTENT COLLECTIONS - Ы ТЬ ЯТ
  experimental: {
    contentCollectionCache: false
  },
  
  // ТС СТ
  build: {
    inlineStylesheets: "never",
    assets: "_astro",
    concurrency: 1 // ТЬ 1 Т
  },
  
  trailingSlash: "ignore",
  
  // ЬЯ Т VITE
  vite: {
    build: {
      sourcemap: false,
      minify: false,
      cssMinify: false,
      rollupOptions: {
        output: {
          // чень мелкие чанки
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            //  ТЫ СТЫ - они будут статическими файлами
            return "main";
          }
        }
      },
      chunkSizeWarningLimit: 100 // чень маленькие чанки
    },
    optimizeDeps: {
      noDiscovery: true,
      include: []
    },
    server: {
      hmr: false
    }
  }
});