import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://blondeplace.netlify.app',
  output: 'static',
  adapter: netlify(),
  build: {
    format: 'directory'
  }
});