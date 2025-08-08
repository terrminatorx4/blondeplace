import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

// Ы  С NETLIFY - статические + серверные страницы
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "hybrid",
  adapter: netlify(),
  
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
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
            return "main";
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      noDiscovery: true,
      include: []
    }
  }
});