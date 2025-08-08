import { defineConfig } from "astro/config";

// СТТС  - самый простой и надежный
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "static", // СТТС !
  
  integrations: [],
  
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
          manualChunks: () => "main"
        }
      }
    },
    optimizeDeps: {
      noDiscovery: true,
      include: []
    }
  }
});