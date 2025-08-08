import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

// СТЬ СЫ  - Т статической сборки контента!
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "server", // Ь !
  adapter: netlify(),
  
  //  Т -  Т
  integrations: [],
  
  // Т CONTENT COLLECTIONS
  experimental: {
    contentCollectionCache: false,
    contentCollectionJsonSchema: false
  },
  
  build: {
    inlineStylesheets: "never",
    assets: "_astro",
    concurrency: 1
  },
  
  trailingSlash: "ignore",
  
  vite: {
    build: {
      sourcemap: false,
      minify: false,
      rollupOptions: {
        output: {
          manualChunks: () => "main" // дин чанк - минимум обработки
        }
      }
    },
    optimizeDeps: {
      noDiscovery: true,
      include: []
    }
  }
});