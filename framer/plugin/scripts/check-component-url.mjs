// Stops `pnpm run pack` while COMPONENT_URL is still the placeholder. A plugin
// packed with it cannot add the component, so every "Add to page" would fail.
import { readFileSync } from 'node:fs'

const controls = readFileSync(new URL('../src/controls.ts', import.meta.url), 'utf8')

if (controls.includes('REPLACE-WITH-PUBLISHED')) {
  console.error(
    'COMPONENT_URL in src/controls.ts is still the placeholder. Publish the component and paste its URL first (see framer/README.md).'
  )
  process.exit(1)
}
