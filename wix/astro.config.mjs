// @ts-check
import { defineConfig } from 'astro/config'
import wix from '@wix/astro'
import react from '@astrojs/react'
import wixHostingAdapter from '@wix/astro-wix-hosting-adapter'

// Same configuration as the Wix CLI app template (npm create @wix/new).
export default defineConfig({
  output: 'server',
  adapter: wixHostingAdapter(),
  integrations: [wix(), react()],
  image: { domains: ['static.wixstatic.com'] },
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
})
