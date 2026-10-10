import { defineConfig } from 'vite'

export default defineConfig({
  // Webflow serves the uploaded bundle from its own path, so asset links must be relative.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Webflow does not accept a bundle that contains source maps.
    sourcemap: false,
  },
})
