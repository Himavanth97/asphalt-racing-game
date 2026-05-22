import { defineConfig } from 'vite';

export default defineConfig({
  // Relocatable relative base path for deployments in subdirectories like GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800
  }
});
