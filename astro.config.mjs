import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

// СЫ  Я NETLIFY - правильная конфигурация
export default defineConfig({
  site: "https://blondeplace.netlify.app",
  output: "server",
  adapter: netlify({
    dist: new URL("./dist/", import.meta.url),
    functionPerRoute: false, // кономия ресурсов
  }),
  
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