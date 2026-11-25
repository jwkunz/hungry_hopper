// Lets node import game modules that `import img from './x.png'` (Vite style)
// and that construct `new Image()`. Used via: node --import ./test/setup.mjs
import { register } from 'node:module'

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (/\\.(png|mp3|wav)$/.test(specifier)) {
    return { url: 'data:text/javascript,export default ""', shortCircuit: true }
  }
  return next(specifier, context)
}
`))

globalThis.Image = class { set src(_) {} get complete() { return true } }
