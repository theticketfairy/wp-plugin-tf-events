import { defineConfig } from 'vitest/config'

// The tests cover plain logic only. Without this file, vitest would load
// vite.config.ts, and mkcert would download and install a local certificate.
export default defineConfig({})
