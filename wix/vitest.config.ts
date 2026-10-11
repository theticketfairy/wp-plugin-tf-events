import { defineConfig } from 'vitest/config'

// Tests never download the real embed loader: treat the skipped download as
// done, not as an error. Vitest 2's types predate this happy-dom setting.
const happyDomSettings: object = { handleDisabledFileLoadingAsSuccess: true }

// The widget is a browser custom element, so the tests run with a DOM.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { settings: happyDomSettings } },
  },
})
