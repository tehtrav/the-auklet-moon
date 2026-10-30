import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // so the built game works from any folder or GitHub Pages
  build: { chunkSizeWarningLimit: 1500 },
});
