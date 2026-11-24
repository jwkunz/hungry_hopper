import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// The single-file plugin inlines all JS, CSS and imported assets (sprites)
// into index.html. It is harmless in `vite dev`.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
