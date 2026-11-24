// Deployment build: produces ONE self-contained, distributable HTML file.
//   npm run build   ->   dist/hungry_hopper-v<version>.html
// All JavaScript, CSS and sprite images are inlined, so the file can be
// opened from disk, emailed, or dropped on any static host.
import { build } from 'vite'
import { readFileSync, renameSync, rmSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const dist = join(root, 'dist')

rmSync(dist, { recursive: true, force: true })
await build({ root, logLevel: 'warn', build: { outDir: dist, emptyOutDir: true } })

const out = join(dist, `hungry_hopper-v${version}.html`)
renameSync(join(dist, 'index.html'), out)

// Anything left in dist besides the single file would defeat the purpose.
for (const f of readdirSync(dist)) {
  if (join(dist, f) !== out) rmSync(join(dist, f), { recursive: true, force: true })
}
console.log(`\nBuilt ${out} (${(statSync(out).size / 1024 / 1024).toFixed(2)} MB)`)
