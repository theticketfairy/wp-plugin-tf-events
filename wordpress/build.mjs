// Bundles the block editor script into the plugin folder and writes the
// asset file WordPress reads to load the editor packages it depends on.
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const outdir = 'ticket-fairy-events/block'

await build({
  entryPoints: ['src/editor.tsx'],
  outfile: `${outdir}/index.js`,
  bundle: true,
  format: 'iife',
  target: 'es2019',
  jsxFactory: 'wp.element.createElement',
  jsxFragment: 'wp.element.Fragment',
  // WordPress.org reviewers ask for readable code, so the bundle is not minified.
  minify: false,
  legalComments: 'none',
})

const dependencies = ['wp-block-editor', 'wp-blocks', 'wp-components', 'wp-element', 'wp-i18n']
// A content hash, so browsers reload the script only when it changes.
const version = createHash('sha256').update(readFileSync(`${outdir}/index.js`)).digest('hex').slice(0, 12)

writeFileSync(
  `${outdir}/index.asset.php`,
  `<?php return array('dependencies' => array(${dependencies.map((name) => `'${name}'`).join(', ')}), 'version' => '${version}');\n`
)
