/**
 * Builds the one-file code component that is pasted into Framer.
 *
 * Framer loads a code component as a single module by URL, so the shared
 * core is bundled in. `framer` and `react` stay as imports because Framer
 * supplies them.
 *
 * Framer reads the sizing annotations only from the comment directly above
 * the component declaration. esbuild drops comments and rewrites
 * `export default function`, so this script puts both back.
 */

import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SOURCE = 'src/TicketFairyTickets.tsx'
const OUTPUT = 'dist/TicketFairyTickets.tsx'
const COMPONENT = 'TicketFairyTickets'

const source = await readFile(SOURCE, 'utf8')
// The last /** ... */ comment before the component declaration.
const annotationPattern = `/\\*\\*(?:(?!\\*/)[\\s\\S])*\\*/(?=\\s*export default function ${COMPONENT}\\()`
const annotation = source.match(new RegExp(annotationPattern))

if (!annotation) {
  throw new Error(`No sizing annotation found above "export default function ${COMPONENT}" in ${SOURCE}`)
}

const result = await build({
  entryPoints: [SOURCE],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  legalComments: 'none',
  external: ['framer', 'react', 'react/jsx-runtime'],
})

let code = result.outputFiles[0].text
const declaration = `function ${COMPONENT}(`
const defaultExport = new RegExp(`export\\s*\\{\\s*${COMPONENT} as default\\s*\\};?\\n?`)

if (!code.includes(declaration) || !defaultExport.test(code)) {
  throw new Error(`The bundle no longer declares ${COMPONENT} the expected way. Update build.mjs.`)
}

code = code
  .replace(defaultExport, '')
  .replace(declaration, `${annotation[0]}\nexport default ${declaration}`)

// The bundled code has no type annotations, so Framer's editor must not type-check it.
const header = [
  '// @ts-nocheck',
  '// Ticket Fairy Tickets: code component for Framer.',
  '// Built from framer/component/src by `pnpm build`. Edit the source, not this file.',
  '',
].join('\n')

await mkdir('dist', { recursive: true })
await writeFile(OUTPUT, header + code)
console.log(`Wrote ${OUTPUT}`)
