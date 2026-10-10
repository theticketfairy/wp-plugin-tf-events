import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import framer from 'vite-plugin-framer'
import mkcert from 'vite-plugin-mkcert'

// The same plugins as Framer's official starter. Framer opens a development
// plugin over HTTPS, and mkcert supplies the local certificate.
export default defineConfig({
  plugins: [react(), mkcert(), framer()],
})
